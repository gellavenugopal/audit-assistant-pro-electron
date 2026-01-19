import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { Eye, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Paragraph,
  Packer,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx';
import { useEngagement } from '@/contexts/EngagementContext';
import { useClient } from '@/hooks/useClient';
import { useFirmSettings } from '@/hooks/useFirmSettings';
import { usePartners } from '@/hooks/usePartners';
import { EvidenceFile, useEvidenceFiles } from '@/hooks/useEvidenceFiles';
import { useEligibilityCertificate } from '@/hooks/useEligibilityCertificate';
import {
  ELIGIBILITY_CERT_TEMPLATE_VERSION,
  eligibilityCertificateTemplate,
} from '@/data/eligibilityCertificateTemplate';

const FIELD_PLACEHOLDERS = {
  date: '___________________',
  entity_name: '(Name of the company)',
  entity_address: '(Reg. address of the company)',
  firm_name: '___________________________(Name of the firm)',
  firm_reg_no: '__________________',
  partner_name: '__________________',
  partner_mem_no: '___________',
};

const CERTIFICATE_FILE_TYPE = 'eligibility_certificate';

const formatFieldForTemplate = (value: string, fallback: string) => {
  const text = value.trim();
  if (!text) {
    return `<span class="missing">${fallback}</span>`;
  }
  return text.replace(/\n/g, '<br />');
};

const formatDateForTemplate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB').format(date);
};

const populateTemplate = (values: Record<string, string>) => {
  return Object.entries(values).reduce((content, [key, value]) => {
    return content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }, eligibilityCertificateTemplate);
};

const editorStyles = `
.eligibility-editor [contenteditable] {
  font-family: "Times New Roman", Times, serif;
  font-size: 12pt;
  line-height: 1.15;
  color: #1b1c21;
  height: 520px;
  overflow: auto;
  background: #fff;
  padding: 72px 88px;
  white-space: normal;
  overflow-wrap: break-word;
  box-sizing: border-box;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
}

.eligibility-editor.prefill-collapsed [contenteditable] {
  height: 70vh;
  max-height: 720px;
}

.eligibility-editor .preview-letter {
  width: 100%;
  font-size: 12pt;
  line-height: 1.15;
}

.eligibility-editor .preview-letter,
.eligibility-editor .preview-letter * {
  font-family: "Times New Roman", Times, serif;
  font-size: 12pt;
  line-height: 1.15;
}

.eligibility-editor .preview-letter p {
  margin: 0 0 6pt 0;
  text-align: justify;
}

.eligibility-editor .preview-letter .header-title {
  font-size: 12pt;
  font-weight: 600;
  text-align: center;
  margin-bottom: 10pt;
  color: #444;
}

.eligibility-editor .preview-letter .note {
  background: #fff3a3;
  padding: 0 4px;
}

.eligibility-editor .preview-letter .subject {
  font-weight: 600;
  margin: 6pt 0;
  text-align: left;
}

.eligibility-editor .preview-letter .to-block {
  margin: 8pt 0;
  text-align: left;
}

.eligibility-editor .preview-letter .bullet {
  margin-left: 0;
  padding-left: 1.5em;
  text-indent: -0.75em;
  text-align: justify;
}

.eligibility-editor .preview-letter .signature {
  margin-top: 10pt;
  text-align: left;
}

.eligibility-editor .preview-letter .signature p {
  margin: 0;
  text-align: left;
}

.eligibility-editor .preview-letter .signature-space {
  height: 12pt;
  margin: 6pt 0;
}

.eligibility-editor .preview-letter .spacer {
  min-height: 12pt;
}

.eligibility-editor .preview-letter .missing {
  background: #fff3a3;
  border-bottom: 1px solid #333;
  padding: 0 4px;
}
`;

const convertHtmlToDocxElements = (html: string) => {
  if (typeof document === 'undefined') {
    return [new Paragraph('')];
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  const elements: Array<Paragraph | Table> = [];

  const parseColor = (value?: string | null) => {
    if (!value) return undefined;
    const hexMatch = value.match(/#([0-9a-f]{3,6})/i);
    if (hexMatch) {
      const raw = hexMatch[1];
      const hex = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
      return hex.toUpperCase();
    }
    const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
      const toHex = (num: string) => Number(num).toString(16).padStart(2, '0');
      return `${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`.toUpperCase();
    }
    return undefined;
  };

  const baseRunProps = {
    font: 'Times New Roman',
    size: 24,
  };

  type TrimState = { trimLeading: boolean };

  const buildRuns = (
    node: ChildNode,
    styles: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      missing?: boolean;
      highlight?: boolean;
      color?: string;
    } = {},
    state: TrimState
  ): TextRun[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent || '';
      if (state.trimLeading) {
        text = text.replace(/^\s+/, '');
      }
      text = text.replace(/\s+/g, ' ');
      if (!text.trim()) return [];
      state.trimLeading = false;
      return [
        new TextRun({
          ...baseRunProps,
          text,
          bold: styles.bold,
          italics: styles.italic,
          underline: styles.underline || styles.missing ? { type: UnderlineType.SINGLE } : undefined,
          highlight: styles.missing || styles.highlight ? 'yellow' : undefined,
          color: styles.color,
        }),
      ];
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === 'BR') {
        state.trimLeading = true;
        return [new TextRun({ ...baseRunProps, text: '', break: 1 })];
      }
      if (element.tagName === 'STYLE') {
        return [];
      }

      const nextStyles = { ...styles };
      if (element.tagName === 'B' || element.tagName === 'STRONG') nextStyles.bold = true;
      if (element.tagName === 'I' || element.tagName === 'EM') nextStyles.italic = true;
      if (element.tagName === 'U') nextStyles.underline = true;
      if (element.classList.contains('missing')) nextStyles.missing = true;
      if (element.classList.contains('note')) nextStyles.highlight = true;
      const styleColor = parseColor(element.style?.color || element.getAttribute('color'));
      if (styleColor) nextStyles.color = styleColor;

      let runs: TextRun[] = [];
      element.childNodes.forEach((child) => {
        runs = runs.concat(buildRuns(child, nextStyles, state));
      });
      return runs;
    }

    return [];
  };

  const buildRunsFromNodes = (
    nodes: NodeListOf<ChildNode> | ChildNode[],
    baseStyles: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      missing?: boolean;
      highlight?: boolean;
      color?: string;
    } = {}
  ) => {
    const state: TrimState = { trimLeading: true };
    let runs: TextRun[] = [];
    nodes.forEach((child) => {
      runs = runs.concat(buildRuns(child, baseStyles, state));
    });
    return runs;
  };

  const buildParagraphFromElement = (element: HTMLElement) => {
    const baseSpacing = { after: 120, line: 276 };
    const isHeader = element.classList.contains('header-title');
    const isSubject = element.classList.contains('subject');
    const isRight = element.classList.contains('right');
    const isSignatureSpace = element.classList.contains('signature-space');
    const isSignatureBlock = element.parentElement?.classList.contains('signature');
    const isFirstSignature =
      isSignatureBlock && element.parentElement?.firstElementChild === element;
    const isBullet = element.classList.contains('bullet');
    const isSpacer = element.classList.contains('spacer');
    const isNote = element.classList.contains('note');
    const isToBlock = element.classList.contains('to-block');
    const alignment = isHeader
      ? AlignmentType.CENTER
      : isRight
        ? AlignmentType.RIGHT
        : isSubject || isSignatureBlock || isToBlock
          ? AlignmentType.LEFT
          : AlignmentType.JUSTIFIED;
    const spacing = {
      ...baseSpacing,
      ...(isHeader ? { after: 200 } : {}),
      ...(isSubject ? { before: 120, after: 120 } : {}),
      ...(isSignatureSpace ? { line: 240, after: 240 } : {}),
      ...(isSignatureBlock ? { after: 0 } : {}),
      ...(isFirstSignature ? { before: 200 } : {}),
      ...(isSpacer ? { line: 240, after: 240 } : {}),
    };
    const runs = buildRunsFromNodes(element.childNodes, {
      bold: isHeader || isSubject,
      highlight: isNote,
    });
    return new Paragraph({
      children: runs.length ? runs : [new TextRun('')],
      alignment,
      spacing,
      indent: isBullet
        ? {
            left: 360,
            right: 0,
            firstLine: 0,
            hanging: 180,
          }
        : {
            left: 0,
            right: 0,
            firstLine: 0,
            hanging: 0,
          },
    });
  };

  const buildTableFromElement = (table: HTMLTableElement) => {
    const rows = Array.from(table.rows).map((row) => {
      const cells = Array.from(row.cells).map((cell) => {
        const cellElement = cell as HTMLTableCellElement;
        const isDate = cellElement.classList.contains('date-block');
        const runs = buildRunsFromNodes(cellElement.childNodes);
        const paragraph = new Paragraph({
          children: runs.length ? runs : [new TextRun('')],
          alignment: isDate ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { line: 276 },
          indent: {
            left: 0,
            right: 0,
            firstLine: 0,
            hanging: 0,
          },
        });
        return new TableCell({
          children: [paragraph],
          width: {
            size: isDate ? 35 : 65,
            type: WidthType.PERCENTAGE,
          },
        });
      });
      return new TableRow({ children: cells });
    });
    return new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
    });
  };

  const root = (container.querySelector('.preview-letter') as HTMLElement | null) || container;
  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.tagName === 'TABLE') {
      elements.push(buildTableFromElement(child as HTMLTableElement));
      elements.push(
        new Paragraph({
          children: [new TextRun({ ...baseRunProps, text: '' })],
          spacing: { after: 120 },
          indent: {
            left: 0,
            right: 0,
            firstLine: 0,
            hanging: 0,
          },
        })
      );
      return;
    }
    if (child.tagName === 'DIV') {
      Array.from(child.children).forEach((nested) => {
        if (!(nested instanceof HTMLElement)) return;
        if (nested.tagName === 'TABLE') {
          elements.push(buildTableFromElement(nested as HTMLTableElement));
          return;
        }
        if (nested.tagName === 'P') {
          elements.push(buildParagraphFromElement(nested));
          return;
        }
        elements.push(buildParagraphFromElement(nested));
      });
      if (!child.children.length) {
        elements.push(buildParagraphFromElement(child));
      }
      return;
    }
    if (child.tagName === 'P') {
      elements.push(buildParagraphFromElement(child));
      return;
    }
    elements.push(buildParagraphFromElement(child));
  });

  if (elements.length === 0) {
    elements.push(new Paragraph(''));
  }
  return elements;
};

export function EligibilityCertificate() {
  const { currentEngagement } = useEngagement();
  const { client } = useClient(currentEngagement?.client_id || null);
  const { firmSettings } = useFirmSettings();
  const { partners } = usePartners();
  const { document: savedDocument, loading, saving, saveDocument } =
    useEligibilityCertificate(currentEngagement?.id);
  const {
    files: evidenceFiles,
    uploadFile: uploadEvidenceFile,
    deleteFile: deleteEvidenceFile,
    getFileUrl: getEvidenceFileUrl,
  } = useEvidenceFiles(currentEngagement?.id || undefined);

  const [editorHtml, setEditorHtml] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entityName, setEntityName] = useState('');
  const [entityAddress, setEntityAddress] = useState('');
  const [firmName, setFirmName] = useState('');
  const [firmRegNo, setFirmRegNo] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerMemNo, setPartnerMemNo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [prefillOpen, setPrefillOpen] = useState(true);
  const initializedRef = useRef<string | null>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (client) {
      setEntityName(client.name || '');
      setEntityAddress(client.address || '');
    }
  }, [client?.id]);

  useEffect(() => {
    if (firmSettings) {
      setFirmName((prev) => prev || firmSettings.firm_name || '');
      setFirmRegNo((prev) => prev || firmSettings.firm_registration_no || '');
    }
  }, [firmSettings]);

  useEffect(() => {
    if (currentEngagement?.partner_id) {
      const matched = partners.find((partner) => partner.id === currentEngagement.partner_id);
      if (matched) {
        setPartnerName(matched.name);
        setPartnerMemNo(matched.membership_number);
        return;
      }
    }
    if (partners.length && !partnerName) {
      setPartnerName(partners[0].name);
      setPartnerMemNo(partners[0].membership_number);
    }
  }, [currentEngagement?.partner_id, partners, partnerName]);

  const templateValues = useMemo(() => {
    return {
      date: formatFieldForTemplate(formatDateForTemplate(date), FIELD_PLACEHOLDERS.date),
      entity_name: formatFieldForTemplate(entityName, FIELD_PLACEHOLDERS.entity_name),
      entity_address: formatFieldForTemplate(entityAddress, FIELD_PLACEHOLDERS.entity_address),
      firm_name: formatFieldForTemplate(firmName, FIELD_PLACEHOLDERS.firm_name),
      firm_reg_no: formatFieldForTemplate(firmRegNo, FIELD_PLACEHOLDERS.firm_reg_no),
      partner_name: formatFieldForTemplate(partnerName, FIELD_PLACEHOLDERS.partner_name),
      partner_mem_no: formatFieldForTemplate(partnerMemNo, FIELD_PLACEHOLDERS.partner_mem_no),
    };
  }, [date, entityName, entityAddress, firmName, firmRegNo, partnerName, partnerMemNo]);

  const templateHtml = useMemo(() => populateTemplate(templateValues), [templateValues]);
  const certificateFiles = useMemo(
    () => evidenceFiles.filter((file) => file.file_type === CERTIFICATE_FILE_TYPE),
    [evidenceFiles]
  );

  const handleEditorChange = (value: string) => {
    setEditorHtml(value);
    setIsDirty(true);
  };

  const normalizeMissingHighlights = useCallback((root: HTMLDivElement) => {
    const nodes = root.querySelectorAll('span.missing');
    nodes.forEach((node) => {
      const text = node.textContent || '';
      if (text.replace(/[\s_]+/g, '') !== '') {
        node.classList.remove('missing');
        if (!node.className) {
          node.removeAttribute('class');
        }
      }
    });
  }, []);

  const isCurrentTemplate = useCallback(
    (content: string) => content.includes(`data-template-version="${ELIGIBILITY_CERT_TEMPLATE_VERSION}"`),
    []
  );

  const normalizeHtml = (value: string) => value.replace(/\s+/g, ' ').trim();

  useEffect(() => {
    if (!currentEngagement) return;
    initializedRef.current = null;
    setShowEditor(false);
    setIsDirty(false);
    setEditorHtml('');
    setPrefillOpen(true);
    setDate(new Date().toISOString().split('T')[0]);
  }, [currentEngagement?.id]);

  useEffect(() => {
    if (!showEditor || !currentEngagement) return;
    if (initializedRef.current === currentEngagement.id) return;
    initializedRef.current = currentEngagement.id;

    if (savedDocument?.content_html && isCurrentTemplate(savedDocument.content_html)) {
      const savedHtml = savedDocument.content_html;
      const isSameAsTemplate = normalizeHtml(savedHtml) === normalizeHtml(templateHtml);
      setEditorHtml(savedHtml);
      setIsDirty(!isSameAsTemplate);
      return;
    }

    setEditorHtml(templateHtml);
    setIsDirty(false);
  }, [showEditor, currentEngagement?.id, savedDocument?.content_html, templateHtml, isCurrentTemplate]);

  useEffect(() => {
    if (!showEditor) return;
    if (!isDirty) {
      setEditorHtml(templateHtml);
    }
  }, [templateHtml, showEditor, isDirty]);

  const handleSaveDraft = async () => {
    if (!currentEngagement) {
      toast.error('Select an engagement before saving');
      return;
    }
    const draftHtml = editorHtml.trim() ? editorHtml : templateHtml;
    if (!draftHtml.trim()) {
      toast.error('Add content before saving');
      return;
    }
    const saved = await saveDocument(draftHtml, 'Auditor Eligibility Certificate');
    if (saved) {
      toast.success('Draft saved');
    }
  };

  const handleExportWord = async () => {
    const exportHtml = editorHtml.trim() ? editorHtml : templateHtml;
    if (!exportHtml.trim()) {
      toast.error('Add content before exporting');
      return;
    }
    setExporting(true);
    try {
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: {
                font: 'Times New Roman',
                size: 24,
              },
              paragraph: {
                spacing: { line: 276, after: 120 },
                indent: {
                  left: 0,
                  right: 0,
                  firstLine: 0,
                  hanging: 0,
                },
              },
            },
          },
        },
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 11906,
                  height: 16838,
                },
                margin: {
                  top: 1440,
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children: convertHtmlToDocxElements(exportHtml),
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeName = currentEngagement?.client_name
        ? `Eligibility_Certificate_${currentEngagement.client_name}`
        : 'Eligibility_Certificate';
      link.download = `${safeName.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Word document generated');
    } catch (err: any) {
      console.error('Failed to export Word document', err);
      toast.error(err?.message || 'Failed to export Word document');
    } finally {
      setExporting(false);
    }
  };

  const handleCertificateUpload = () => {
    return async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        return;
      }

      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
      const invalidFiles = files.filter((item) => {
        const fileExtension = item.name.split('.').pop()?.toLowerCase();
        return !fileExtension || !validExtensions.includes(fileExtension);
      });

      if (invalidFiles.length) {
        toast.error('Invalid file format. Only PDF, JPG, JPEG, or PNG files are allowed.');
        event.target.value = '';
      }

      if (!currentEngagement) {
        toast.error('Please select an engagement before uploading.');
        event.target.value = '';
        return;
      }

      for (const file of files) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !validExtensions.includes(fileExtension)) {
          continue;
        }

        await uploadEvidenceFile(file, {
          name: file.name,
          file_type: CERTIFICATE_FILE_TYPE,
        });
      }

      event.target.value = '';
    };
  };

  const openCertificatePreview = async (file: EvidenceFile) => {
    const url = await getEvidenceFileUrl(file);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Unable to preview this file.');
    }
  };

  const renderCertificateFiles = () => {
    if (certificateFiles.length === 0) {
      return <p className="text-xs text-muted-foreground">No uploads yet.</p>;
    }

    return (
      <div className="space-y-2">
        {certificateFiles.map((file) => (
          <div
            key={file.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openCertificatePreview(file)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deleteEvidenceFile(file)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!currentEngagement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Auditor Eligibility Certificate
          </CardTitle>
          <CardDescription>Select an engagement to edit this certificate.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        className={showEditor ? 'gap-3 sm:flex-row sm:items-start sm:justify-between' : undefined}
      >
        <div className="space-y-1.5">
          <CardTitle>Auditor Eligibility Certificate</CardTitle>
          <CardDescription>Prefill the certificate from engagement and client masters, then edit and export.</CardDescription>
        </div>
        {showEditor && (
          <Button variant="outline" size="sm" onClick={() => setShowEditor(false)}>
            Back to Eligibility
          </Button>
        )}
      </CardHeader>
      {!showEditor ? (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate the eligibility certificate and store a signed copy for this engagement.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowEditor(true)}>Generate Eligibility Certificate</Button>
            <Button variant="outline" onClick={() => certificateInputRef.current?.click()}>
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload Eligibility Certificate
            </Button>
          </div>
          <input
            ref={certificateInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleCertificateUpload()}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF (.pdf), JPG/JPEG (.jpg, .jpeg), PNG (.png)
          </p>
          {renderCertificateFiles()}
        </CardContent>
      ) : (
        <CardContent className="space-y-6">
          {loading && <p className="text-xs text-muted-foreground">Loading saved draft...</p>}
          <Collapsible open={prefillOpen} onOpenChange={setPrefillOpen}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Prefill details</p>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {prefillOpen ? 'Collapse' : 'Expand'}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </div>
                <div>
                  <Label>Entity name</Label>
                  <Input
                    placeholder="M/s Entity Name"
                    value={entityName}
                    onChange={(event) => setEntityName(event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Entity address</Label>
                  <Textarea
                    rows={2}
                    placeholder="Registered address"
                    value={entityAddress}
                    onChange={(event) => setEntityAddress(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Firm name</Label>
                  <Input
                    placeholder="Firm Name"
                    value={firmName}
                    onChange={(event) => setFirmName(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Firm registration number</Label>
                  <Input
                    placeholder="Firm Regn No"
                    value={firmRegNo}
                    onChange={(event) => setFirmRegNo(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Partner / signatory</Label>
                  <Input
                    placeholder="Partner Name"
                    value={partnerName}
                    onChange={(event) => setPartnerName(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Partner membership number</Label>
                  <Input
                    placeholder="M. No."
                    value={partnerMemNo}
                    onChange={(event) => setPartnerMemNo(event.target.value)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <div className="space-y-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Editable preview</p>
              <span className="text-xs text-muted-foreground">Word layout</span>
            </div>
            <style>{editorStyles}</style>
            <RichTextEditor
              value={editorHtml}
              onChange={handleEditorChange}
              normalizeDom={normalizeMissingHighlights}
              placeholder="Edit the certificate here. All fields are editable."
              className={prefillOpen ? 'eligibility-editor' : 'eligibility-editor prefill-collapsed'}
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveDraft} disabled={saving}>
                Save draft
              </Button>
              <Button onClick={handleExportWord} disabled={exporting}>
                Export Word
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
