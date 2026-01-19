import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useEngagement } from '@/contexts/EngagementContext';
import { EvidenceFile, useEvidenceFiles } from '@/hooks/useEvidenceFiles';
import { Eye, FileDown, ShieldCheck, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

type ConfidentialityFormState = {
  clientName: string;
  engagementType: string;
  period: string;
  memberName: string;
  auditEntityName: string;
  designation: string;
  declarationDate: string;
};

const CONFIDENTIALITY_POINTS = [
  'I will keep absolutely secret and confidential all confidential information and will not directly or indirectly disclose the same to anyone within or outside the firm.',
  'I will use the confidential information only for audit purposes.',
  'These obligations shall continue even after closure of the audit assignment.',
];

const getEngagementTypeLabel = (type?: string) => {
  switch (type) {
    case 'statutory':
      return 'Statutory Audit';
    case 'internal':
      return 'Internal Audit';
    case 'tax':
      return 'Tax Audit';
    case 'limited_review':
      return 'Limited Review';
    default:
      return type || 'Statutory Audit';
  }
};

const buildEngagementPeriod = (financialYear?: string) => {
  if (!financialYear) return 'For the year ended March 31, XXXX';
  const match = financialYear.match(/(\d{4})\D+(\d{2,4})/);
  if (!match) return `For the year ended March 31, ${financialYear}`;
  const startYear = Number(match[1]);
  const endPart = match[2];
  let endYear = Number(endPart);
  if (endPart.length === 2) {
    endYear = Math.floor(startYear / 100) * 100 + endYear;
  }
  if (!Number.isFinite(endYear) || endYear < 1900) {
    return `For the year ended March 31, ${financialYear}`;
  }
  return `For the year ended March 31, ${endYear}`;
};

export function ConfidentialityDeclaration() {
  const { currentEngagement } = useEngagement();
  const { files, uploadFile, downloadFile, getFileUrl } = useEvidenceFiles(currentEngagement?.id);
  const signedInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const defaultState = useMemo<ConfidentialityFormState>(() => ({
    clientName: currentEngagement?.client_name || '',
    engagementType: getEngagementTypeLabel(currentEngagement?.engagement_type),
    period: buildEngagementPeriod(currentEngagement?.financial_year),
    memberName: '',
    auditEntityName: currentEngagement?.client_name || '',
    designation: '',
    declarationDate: '',
  }), [currentEngagement?.client_name, currentEngagement?.engagement_type, currentEngagement?.financial_year]);

  const [formState, setFormState] = useState<ConfidentialityFormState>(defaultState);

  const storageKey = currentEngagement?.id
    ? `confidentiality_declaration_${currentEngagement.id}`
    : null;

  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ConfidentialityFormState;
        setFormState({ ...defaultState, ...parsed });
        return;
      } catch (error) {
        console.warn('Unable to parse saved confidentiality data', error);
      }
    }
    setFormState(defaultState);
  }, [defaultState, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(formState));
  }, [formState, storageKey]);

  const signedFiles = files.filter(
    (file) => file.file_type === 'confidentiality_undertaking'
  );

  const openFilePreview = async (file: EvidenceFile) => {
    const url = await getFileUrl(file);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Unable to preview this file.');
    }
  };

  const renderFileList = (items: EvidenceFile[]) => {
    if (items.length === 0) {
      return <p className="text-xs text-muted-foreground">No uploads yet.</p>;
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => openFilePreview(item)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button size="sm" onClick={() => downloadFile(item)}>
                <FileDown className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleSignedUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const invalidFiles = selected.filter((item) => {
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

    for (const file of selected) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        continue;
      }

      await uploadFile(file, {
        name: file.name,
        file_type: 'confidentiality_undertaking',
      });
    }

    event.target.value = '';
  };

  const handleExportWord = async () => {
    const topRows = [
      ['Client Name', formState.clientName],
      ['Engagement', formState.engagementType],
      ['Period', formState.period],
    ];

    const makeCell = (text: string, bold = false) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: text || '', bold })],
          }),
        ],
      });

    const topTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: topRows.map((row) =>
        new TableRow({
          children: row.map((cell, cellIdx) => makeCell(cell, cellIdx === 0)),
        })
      ),
    });

    const memberName = formState.memberName || '_____________________';
    const auditEntityName = formState.auditEntityName || '_____________________';

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Confidentiality Undertaking', bold: true })],
            }),
            new Paragraph(''),
            topTable,
            new Paragraph(''),
            new Paragraph(
              `I, ${memberName}, acknowledge, agree, and undertake that in consideration of my engagement as an audit team member on the audit of ${auditEntityName} for ${formState.period}:`
            ),
            ...CONFIDENTIALITY_POINTS.map(
              (point) => new Paragraph({ text: point, bullet: { level: 0 } })
            ),
            new Paragraph(''),
            new Paragraph(
              'Confidential information includes, but is not limited to, any document or information provided by the client during the audit assignment.'
            ),
            new Paragraph(''),
            new Paragraph(`Signature: ${formState.memberName || '____________________'}`),
            new Paragraph(`Designation: ${formState.designation || '____________________'}`),
            new Paragraph(`Date: ${formState.declarationDate || '____________________'}`),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const clientName = formState.clientName || currentEngagement?.client_name || 'Client';
    const financialYear = currentEngagement?.financial_year || 'FY';
    link.href = url;
    link.download = `Confidentiality_Declaration_${clientName.replace(/\\s+/g, '_')}_${financialYear}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Confidentiality Undertaking', pageWidth / 2, 40, { align: 'center' });

    const topRows = [
      ['Client Name', formState.clientName],
      ['Engagement', formState.engagementType],
      ['Period', formState.period],
    ];

    autoTable(doc, {
      startY: 60,
      body: topRows,
      theme: 'grid',
      styles: { fontSize: 9 },
    });

    let currentY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 60;
    currentY += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const memberName = formState.memberName || '_____________________';
    const auditEntityName = formState.auditEntityName || '_____________________';

    const writeWrappedText = (text: string, startY: number) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, startY);
      return startY + lines.length * 14;
    };

    currentY = writeWrappedText(
      `I, ${memberName}, acknowledge, agree, and undertake that in consideration of my engagement as an audit team member on the audit of ${auditEntityName} for ${formState.period}:`,
      currentY
    );

    CONFIDENTIALITY_POINTS.forEach((point) => {
      currentY = writeWrappedText(`- ${point}`, currentY + 4);
    });

    currentY = writeWrappedText(
      'Confidential information includes, but is not limited to, any document or information provided by the client during the audit assignment.',
      currentY + 6
    );

    currentY += 10;
    currentY = writeWrappedText(`Signature: ${formState.memberName || '____________________'}`, currentY);
    currentY = writeWrappedText(`Designation: ${formState.designation || '____________________'}`, currentY + 2);
    writeWrappedText(`Date: ${formState.declarationDate || '____________________'}`, currentY + 2);

    const clientName = formState.clientName || currentEngagement?.client_name || 'Client';
    const financialYear = currentEngagement?.financial_year || 'FY';
    doc.save(`Confidentiality_Declaration_${clientName.replace(/\\s+/g, '_')}_${financialYear}.pdf`);
  };

  const PreviewTable = () => {
    const memberName = formState.memberName || '_____________________';
    const auditEntityName = formState.auditEntityName || '_____________________';

    return (
      <div className="space-y-4 text-sm">
        <p className="text-center font-semibold">Confidentiality Undertaking</p>
        <table className="w-full border-collapse table-fixed">
          <tbody>
            <tr>
              <td className="border px-2 py-1 font-semibold">Client Name</td>
              <td className="border px-2 py-1">{formState.clientName}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-semibold">Engagement</td>
              <td className="border px-2 py-1">{formState.engagementType}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-semibold">Period</td>
              <td className="border px-2 py-1">{formState.period}</td>
            </tr>
          </tbody>
        </table>

        <p>
          I, <strong>{memberName}</strong>, acknowledge, agree, and undertake that in consideration of my engagement as
          an audit team member on the audit of <strong>{auditEntityName}</strong> for {formState.period}:
        </p>

        <ul className="list-disc pl-5 space-y-2">
          {CONFIDENTIALITY_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <p>
          Confidential information includes, but is not limited to, any document or information provided by the client
          during the audit assignment.
        </p>

        <div className="space-y-1">
          <p>Signature: {formState.memberName || '____________________'}</p>
          <p>Designation: {formState.designation || '____________________'}</p>
          <p>Date: {formState.declarationDate || '____________________'}</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Confidentiality Declaration
            </CardTitle>
            <CardDescription>Generate engagement-specific confidentiality undertakings for team members.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
              <input
                ref={signedInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleSignedUpload}
                className="hidden"
              />
            <Button size="sm" onClick={() => signedInputRef.current?.click()}>
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload signed declaration
            </Button>
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Confidentiality Declaration Preview</DialogTitle>
                </DialogHeader>
                <div className="max-h-[65vh] overflow-y-auto pr-2">
                  <PreviewTable />
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={handleExportWord}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Word
            </Button>
            <Button size="sm" onClick={handleExportPdf}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-semibold">Signed confidentiality declaration uploads</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Supported formats: PDF (.pdf), JPG/JPEG (.jpg, .jpeg), PNG (.png)
          </p>
          <div className="mt-2">
            {renderFileList(signedFiles)}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input
              value={formState.clientName}
              onChange={(e) => setFormState((prev) => ({ ...prev, clientName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Engagement</Label>
            <Input
              value={formState.engagementType}
              onChange={(e) => setFormState((prev) => ({ ...prev, engagementType: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Period</Label>
            <Input
              value={formState.period}
              onChange={(e) => setFormState((prev) => ({ ...prev, period: e.target.value }))}
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Team Member Name</Label>
            <Input
              value={formState.memberName}
              onChange={(e) => setFormState((prev) => ({ ...prev, memberName: e.target.value }))}
              placeholder="e.g., Priya Sharma"
            />
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <Input
              value={formState.designation}
              onChange={(e) => setFormState((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="e.g., Audit Associate"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Audit of</Label>
            <Input
              value={formState.auditEntityName}
              onChange={(e) => setFormState((prev) => ({ ...prev, auditEntityName: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formState.declarationDate}
              onChange={(e) => setFormState((prev) => ({ ...prev, declarationDate: e.target.value }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
