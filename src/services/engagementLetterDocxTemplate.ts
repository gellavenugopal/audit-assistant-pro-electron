import JSZip from 'jszip';
import type { EngagementLetterMasterData, GeneratedLetterResult } from '@/types/engagementLetter';
import { EngagementLetterTemplateEngine } from './engagementLetterEngine';
import type { EngagementLetterTemplatePayload } from './engagementLetterTemplatePayload';
import { base64ToUint8Array, uint8ArrayToBase64 } from '@/utils/base64';

const TEMPLATE_XML_PATTERN = /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i;
const LETTERHEAD_NOTICE = 'TO BE PRINTED ON THE LETTER HEAD OF THE AUDITORS';

export class EngagementLetterDocxTemplate {
  static async generateFromTemplate(
    payload: EngagementLetterTemplatePayload,
    masterData: EngagementLetterMasterData
  ): Promise<GeneratedLetterResult> {
    try {
      if (!payload.base64) {
        throw new Error('Template payload is missing base64 content');
      }

      const context = EngagementLetterTemplateEngine.buildContext(masterData);
      const zip = await JSZip.loadAsync(base64ToUint8Array(payload.base64));
      const xmlFiles = Object.keys(zip.files).filter((name) => TEMPLATE_XML_PATTERN.test(name));

      if (xmlFiles.length === 0) {
        throw new Error('No document XML found in template');
      }

      await Promise.all(
        xmlFiles.map(async (name) => {
          const file = zip.file(name);
          if (!file) return;
          let xml = await file.async('string');
          if (name.toLowerCase() === 'word/document.xml') {
            xml = this.prependLetterheadNotice(xml);
          }
          const normalizedXml = this.normalizeTemplateXml(xml);
          const renderedXml = EngagementLetterTemplateEngine.render(normalizedXml, context, { escapeXml: true });
          zip.file(name, renderedXml);
        })
      );

      const output = await zip.generateAsync({ type: 'uint8array' });
      const document_base64 = await uint8ArrayToBase64(output);

      return {
        success: true,
        document_base64,
        letter_type: masterData.engagement_type,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Template merge failed: ${error instanceof Error ? error.message : String(error)}`,
        letter_type: masterData.engagement_type,
        generated_at: new Date().toISOString(),
      };
    }
  }

  private static containsLetterheadNotice(xml: string): boolean {
    const lower = xml.toLowerCase();
    return (
      lower.includes(LETTERHEAD_NOTICE.toLowerCase()) ||
      lower.includes('letterhead_note') ||
      lower.includes('letterhead notice')
    );
  }

  private static prependLetterheadNotice(xml: string): string {
    if (this.containsLetterheadNotice(xml)) {
      return xml;
    }

    const bodyIndex = xml.indexOf('<w:body');
    if (bodyIndex === -1) return xml;
    const bodyTagEnd = xml.indexOf('>', bodyIndex);
    if (bodyTagEnd === -1) return xml;

    const noticeXml = `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${this.escapeXml(
      LETTERHEAD_NOTICE
    )}</w:t></w:r></w:p>`;

    return `${xml.slice(0, bodyTagEnd + 1)}${noticeXml}${xml.slice(bodyTagEnd + 1)}`;
  }

  private static escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static normalizeTemplateXml(xml: string): string {
    if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
      return xml;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const textNodes = this.getTextNodes(doc);

      if (textNodes.length === 0) {
        return xml;
      }

      this.mergeTokenAcrossRuns(textNodes, '{{', '}}');
      this.mergeTokenAcrossRuns(textNodes, '[', ']');

      return new XMLSerializer().serializeToString(doc);
    } catch {
      return xml;
    }
  }

  private static getTextNodes(doc: Document): Element[] {
    const direct = Array.from(doc.getElementsByTagName('w:t'));
    if (direct.length > 0) return direct;
    return Array.from(doc.getElementsByTagName('t'));
  }

  private static getParagraphNode(node: Node | null): Node | null {
    let current = node;
    while (current) {
      if ((current as Element).localName === 'p') {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  private static mergeTokenAcrossRuns(nodes: Element[], startToken: string, endToken: string): void {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      let text = node.textContent || '';
      let searchIndex = text.indexOf(startToken);

      while (searchIndex !== -1) {
        const endInSame = text.indexOf(endToken, searchIndex + startToken.length);
        if (endInSame !== -1) {
          searchIndex = text.indexOf(startToken, endInSame + endToken.length);
          continue;
        }

        const paragraph = this.getParagraphNode(node);
        let endNodeIndex = -1;
        let endOffset = -1;
        let combined = text.substring(searchIndex);

        for (let j = i + 1; j < nodes.length; j += 1) {
          const nextNode = nodes[j];
          if (paragraph && this.getParagraphNode(nextNode) !== paragraph) {
            break;
          }
          const nextText = nextNode.textContent || '';
          const endPos = nextText.indexOf(endToken);
          if (endPos !== -1) {
            combined += nextText.substring(0, endPos + endToken.length);
            endNodeIndex = j;
            endOffset = endPos + endToken.length;
            break;
          }
          combined += nextText;
        }

        if (endNodeIndex === -1) {
          break;
        }

        const before = text.substring(0, searchIndex);
        node.textContent = `${before}${combined}`;

        for (let k = i + 1; k < endNodeIndex; k += 1) {
          nodes[k].textContent = '';
        }

        const endNode = nodes[endNodeIndex];
        const endText = endNode.textContent || '';
        endNode.textContent = endText.substring(endOffset);

        text = node.textContent || '';
        searchIndex = text.indexOf(startToken, before.length + combined.length);
      }
    }
  }
}
