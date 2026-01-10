// ============================================================================
// DOCX GENERATION SERVICE
// ============================================================================
// Converts rendered engagement letter text to professionally formatted DOCX

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  UnderlineType,
  convertInchesToTwip,
  PageBreak,
} from 'docx';
import type { EngagementLetterMasterData, GeneratedLetterResult } from '@/types/engagementLetter';

/**
 * Generate professionally formatted DOCX from rendered text
 */
export class EngagementLetterDocxGenerator {
  /**
   * Generate DOCX document from rendered letter text
   * @param renderedText The final rendered text from template engine
   * @param masterData Original master data (for metadata)
   * @returns Promise<GeneratedLetterResult>
   */
  static async generateDocx(
    renderedText: string,
    masterData: EngagementLetterMasterData
  ): Promise<GeneratedLetterResult> {
    try {
      const paragraphs = this.parseTextToParagraphs(renderedText, masterData);

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(1),
                  right: convertInchesToTwip(0.75),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(0.75),
                },
              },
            },
            children: paragraphs,
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);

      return {
        success: true,
        document_buffer: buffer,
        document_base64: buffer.toString('base64'),
        letter_type: masterData.engagement_type,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: `DOCX generation failed: ${error instanceof Error ? error.message : String(error)}`,
        letter_type: masterData.engagement_type,
        generated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Parse rendered text into DOCX paragraphs with proper formatting
   * Handles:
   *   - Headings (prefixed with # or bold markers)
   *   - Lists (prefixed with -, ✓, •)
   *   - Line breaks
   *   - Bold and italic formatting
   */
  private static parseTextToParagraphs(
    renderedText: string,
    masterData: EngagementLetterMasterData
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Split by double line breaks (paragraph breaks)
    const textBlocks = renderedText.split(/\n\s*\n+/);

    for (const block of textBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const lines = trimmed.split('\n');

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) {
          // Empty line → spacer paragraph
          paragraphs.push(new Paragraph({ text: '' }));
          continue;
        }

        paragraphs.push(this.formatLine(cleanLine));
      }
    }

    // Add footer with date and place
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun(`Date: ${masterData.period.appointment_date}`)],
        alignment: AlignmentType.LEFT,
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [new TextRun(`Place: ${masterData.auditor.place}`)],
        alignment: AlignmentType.LEFT,
      })
    );

    return paragraphs;
  }

  /**
   * Format a single line into a Paragraph with appropriate styling
   */
  private static formatLine(line: string): Paragraph {
    // Detect heading levels (# notation)
    if (line.startsWith('### ')) {
      return new Paragraph({
        text: line.substring(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      });
    }

    if (line.startsWith('## ')) {
      return new Paragraph({
        text: line.substring(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      });
    }

    if (line.startsWith('# ')) {
      return new Paragraph({
        text: line.substring(2),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      });
    }

    // Detect list items
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('✓ ')) {
      const cleanText = line.substring(2).trim();
      return new Paragraph({
        text: cleanText,
        bullet: { level: 0 },
        spacing: { after: 100 },
      });
    }

    // Detect numbered items (e.g., "1. Item")
    if (/^\d+\.\s/.test(line)) {
      return new Paragraph({
        text: line,
        spacing: { after: 100, before: 50 },
      });
    }

    // Detect section headers (e.g., "1 OBJECTIVES AND RESPONSIBILITIES")
    if (/^\d+\s+[A-Z]/.test(line)) {
      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 150 },
      });
    }

    // Detect subsections (e.g., "1.1 Our Audit Objectives")
    if (/^\d+\.\d+\s+/.test(line)) {
      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            size: 22,
          }),
        ],
        spacing: { before: 150, after: 100 },
      });
    }

    // Regular paragraph
    return new Paragraph({
      children: this.parseInlineFormatting(line),
      spacing: { after: 100, line: 360 }, // 1.5 line spacing
      alignment: AlignmentType.JUSTIFIED,
    });
  }

  /**
   * Parse inline formatting (bold, italic)
   * Supports:
   *   - **bold text**
   *   - *italic text*
   *   - ***bold italic***
   */
  private static parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let remaining = text;
    let pos = 0;

    // Simple regex-based approach
    const formatRegex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match;

    while ((match = formatRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        runs.push(new TextRun(text.substring(lastIndex, match.index)));
      }

      // Add formatted text
      if (match[1]) {
        // Bold italic
        runs.push(new TextRun({ text: match[1], bold: true, italics: true }));
      } else if (match[2]) {
        // Bold
        runs.push(new TextRun({ text: match[2], bold: true }));
      } else if (match[3]) {
        // Italic
        runs.push(new TextRun({ text: match[3], italics: true }));
      }

      lastIndex = formatRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      runs.push(new TextRun(text.substring(lastIndex)));
    }

    if (runs.length === 0) {
      return [new TextRun('')];
    }
    return runs;
  }

  /**
   * Generate filename for download
   */
  static generateFilename(masterData: EngagementLetterMasterData): string {
    const entityName = masterData.entity.entity_name.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    const year = masterData.period.financial_year;
    const type = masterData.engagement_type.replace(/_/g, '-');
    const timestamp = new Date().toISOString().substring(0, 10);

    return `EngagementLetter_${entityName}_${year}_${type}_${timestamp}.docx`;
  }
}
