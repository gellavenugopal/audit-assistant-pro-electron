import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useEngagement } from '@/contexts/EngagementContext';
import { EvidenceFile, useEvidenceFiles } from '@/hooks/useEvidenceFiles';
import { Eye, FileDown, ShieldCheck, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';

type DeclarationType = 'audit' | 'assurance';

type IndependenceFormState = {
  declarationType: DeclarationType;
  firmName: string;
  declarantName: string;
  membershipNo: string;
  designation: string;
  clientName: string;
  financialYear: string;
  engagementPeriod: string;
  engagementId: string;
  declarationDate: string;
  place: string;
};

const AUDIT_POINTS = [
  'No securities or interest in the audit client or related entities.',
  'No immediate family holding prohibited interests.',
  'No relatives exceeding prescribed limits.',
  'No prohibited loans or guarantees.',
  'No excess guarantees or securities.',
  'No relatives in significant influence positions.',
  'No trustee/executor role in prohibited trusts.',
  'No beneficiary interest in prohibited trusts.',
  'No non-commercial banking or insurance relationships.',
  'No close personal relationships impairing independence.',
  'No non-token gifts or favours accepted.',
  'No prohibited prior employment.',
  'Undertake to report any independence issue immediately.',
];

const ASSURANCE_POINTS = [
  'No direct or material indirect financial interest in the client.',
  'No trustee/executor role in prohibited trusts.',
  'No beneficiary interest in prohibited trusts.',
  'No prohibited loans with the client.',
  'No prohibited banking or brokerage relationships.',
  'No close personal relationships impairing independence.',
  'No immediate family in significant influence positions.',
  'No close family member in significant influence.',
  'No prior employment during prohibited period.',
  'No non-token gifts or favours accepted.',
  'Undertake to report any independence issue immediately.',
];

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

export function IndependenceDeclaration() {
  const { currentEngagement } = useEngagement();
  const { files, uploadFile, downloadFile, getFileUrl } = useEvidenceFiles(currentEngagement?.id);
  const signedInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const defaultState = useMemo<IndependenceFormState>(() => ({
    declarationType: 'audit',
    firmName: '',
    declarantName: '',
    membershipNo: '',
    designation: '',
    clientName: currentEngagement?.client_name || '',
    financialYear: currentEngagement?.financial_year || '',
    engagementPeriod: buildEngagementPeriod(currentEngagement?.financial_year),
    engagementId: currentEngagement?.id || '',
    declarationDate: '',
    place: '',
  }), [currentEngagement?.client_name, currentEngagement?.financial_year, currentEngagement?.id]);

  const [formState, setFormState] = useState<IndependenceFormState>(defaultState);

  const storageKey = currentEngagement?.id
    ? `independence_declaration_${currentEngagement.id}`
    : null;

  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as IndependenceFormState;
        setFormState({ ...defaultState, ...parsed });
        return;
      } catch (error) {
        console.warn('Unable to parse saved independence data', error);
      }
    }
    setFormState(defaultState);
  }, [defaultState, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(formState));
  }, [formState, storageKey]);

  const signedFiles = files.filter(
    (file) => file.file_type === 'independence_confirmation'
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
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'doc', 'docx'];
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast.error('Invalid file format. Only PDF, JPEG, or DOC/DOCX files are allowed.');
      return;
    }

    const uploaded = await uploadFile(file, {
      name: file.name,
      file_type: 'independence_confirmation',
    });

    if (uploaded) {
      toast.success('Signed independence declaration uploaded successfully.');
    }

    event.target.value = '';
  };

  const getPoints = () => (
    formState.declarationType === 'audit' ? AUDIT_POINTS : ASSURANCE_POINTS
  );

  const buildIntroText = () => {
    const firmName = formState.firmName || '_____________________';
    const declarantName = formState.declarantName || '_____________________';
    const membershipNo = formState.membershipNo || '_____________________';
    const designation = formState.designation || '_____________________';
    const clientName = formState.clientName || '_____________________';

    if (formState.declarationType === 'audit') {
      const financialYear = formState.financialYear || '_____________________';
      return `I, ${declarantName}, holding Membership No. ${membershipNo}, designated as ${designation} in ${firmName}, confirm that I am part of the audit engagement team for the audit of ${clientName} for the financial year ${financialYear}.`;
    }

    const engagementPeriod = formState.engagementPeriod || '_____________________';
    return `I, ${declarantName}, holding Membership No. ${membershipNo}, designated as ${designation} in ${firmName}, confirm that I am part of the assurance engagement team for ${clientName} for the period ${engagementPeriod}.`;
  };

  const getComplianceText = () => (
    formState.declarationType === 'audit'
      ? 'I hereby confirm compliance with the applicable independence requirements under the Code of Ethics issued by ICAI and the Companies Act, 2013.'
      : 'I hereby confirm compliance with the applicable independence requirements under the Code of Ethics issued by ICAI.'
  );

  const handleExportWord = async () => {
    const title =
      formState.declarationType === 'audit'
        ? 'Engagement-wise Independence Declaration - Audit Engagement'
        : 'Engagement-wise Independence Declaration - Assurance Engagement';

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: title, bold: true })],
            }),
            new Paragraph(''),
            new Paragraph({ children: [new TextRun({ text: 'To', bold: true })] }),
            new Paragraph(formState.firmName || '_____________________'),
            new Paragraph(''),
            new Paragraph(buildIntroText()),
            new Paragraph(''),
            new Paragraph(getComplianceText()),
            new Paragraph(''),
            ...getPoints().map(
              (point, index) => new Paragraph({ text: `${index + 1}. ${point}` })
            ),
            new Paragraph(''),
            new Paragraph({ children: [new TextRun({ text: 'Declaration', bold: true })] }),
            new Paragraph(''),
            new Paragraph(
              'I confirm that the above declaration is true and correct to the best of my knowledge and belief.'
            ),
            new Paragraph(''),
            new Paragraph(`Name: ${formState.declarantName || '____________________'}`),
            new Paragraph(`Membership No.: ${formState.membershipNo || '____________________'}`),
            new Paragraph(`Designation: ${formState.designation || '____________________'}`),
            new Paragraph(`Engagement ID: ${formState.engagementId || '____________________'}`),
            new Paragraph(''),
            new Paragraph(`Signature: ${formState.declarantName || '____________________'}`),
            new Paragraph(`Date: ${formState.declarationDate || '____________________'}`),
            new Paragraph(`Place: ${formState.place || '____________________'}`),
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
    link.download = `Independence_Declaration_${clientName.replace(/\s+/g, '_')}_${financialYear}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    const title =
      formState.declarationType === 'audit'
        ? 'Engagement-wise Independence Declaration - Audit Engagement'
        : 'Engagement-wise Independence Declaration - Assurance Engagement';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 40, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const writeWrappedText = (text: string, startY: number) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, startY);
      return startY + lines.length * 14;
    };

    let currentY = 64;
    currentY = writeWrappedText('To', currentY);
    currentY = writeWrappedText(formState.firmName || '_____________________', currentY);
    currentY += 6;
    currentY = writeWrappedText(buildIntroText(), currentY);
    currentY += 6;
    currentY = writeWrappedText(getComplianceText(), currentY);
    currentY += 6;

    getPoints().forEach((point, index) => {
      currentY = writeWrappedText(`${index + 1}. ${point}`, currentY + 2);
    });

    currentY += 6;
    currentY = writeWrappedText('Declaration', currentY);
    currentY += 2;
    currentY = writeWrappedText(
      'I confirm that the above declaration is true and correct to the best of my knowledge and belief.',
      currentY
    );
    currentY += 6;
    currentY = writeWrappedText(`Name: ${formState.declarantName || '____________________'}`, currentY);
    currentY = writeWrappedText(`Membership No.: ${formState.membershipNo || '____________________'}`, currentY);
    currentY = writeWrappedText(`Designation: ${formState.designation || '____________________'}`, currentY);
    currentY = writeWrappedText(`Engagement ID: ${formState.engagementId || '____________________'}`, currentY);
    currentY += 6;
    currentY = writeWrappedText(`Signature: ${formState.declarantName || '____________________'}`, currentY);
    currentY = writeWrappedText(`Date: ${formState.declarationDate || '____________________'}`, currentY);
    writeWrappedText(`Place: ${formState.place || '____________________'}`, currentY);

    const clientName = formState.clientName || currentEngagement?.client_name || 'Client';
    const financialYear = currentEngagement?.financial_year || 'FY';
    doc.save(`Independence_Declaration_${clientName.replace(/\s+/g, '_')}_${financialYear}.pdf`);
  };

  const PreviewContent = () => (
    <div className="space-y-4 text-sm">
      <p className="text-center font-semibold">
        {formState.declarationType === 'audit'
          ? 'Engagement-wise Independence Declaration - Audit Engagement'
          : 'Engagement-wise Independence Declaration - Assurance Engagement'}
      </p>
      <div>
        <p className="font-semibold">To</p>
        <p>{formState.firmName || '____________________'}</p>
      </div>
      <p>{buildIntroText()}</p>
      <p>{getComplianceText()}</p>
      <ol className="list-decimal pl-5 space-y-1">
        {getPoints().map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ol>
      <p className="font-semibold">Declaration</p>
      <p>I confirm that the above declaration is true and correct to the best of my knowledge and belief.</p>
      <div className="space-y-1">
        <p>Name: {formState.declarantName || '____________________'}</p>
        <p>Membership No.: {formState.membershipNo || '____________________'}</p>
        <p>Designation: {formState.designation || '____________________'}</p>
        <p>Engagement ID: {formState.engagementId || '____________________'}</p>
        <p>Signature: {formState.declarantName || '____________________'}</p>
        <p>Date: {formState.declarationDate || '____________________'}</p>
        <p>Place: {formState.place || '____________________'}</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Independence Declaration
            </CardTitle>
            <CardDescription>Generate engagement-wise independence declarations for team members.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={signedInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
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
                  <DialogTitle>Independence Declaration Preview</DialogTitle>
                </DialogHeader>
                <div className="max-h-[65vh] overflow-y-auto pr-2">
                  <PreviewContent />
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
          <Label className="text-sm font-semibold">Signed independence declaration uploads</Label>
          <div className="mt-2">
            {renderFileList(signedFiles)}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Declaration Type</Label>
            <Select
              value={formState.declarationType}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, declarationType: value as DeclarationType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audit">Audit Engagement</SelectItem>
                <SelectItem value="assurance">Assurance Engagement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Firm Name</Label>
            <Input
              value={formState.firmName}
              onChange={(e) => setFormState((prev) => ({ ...prev, firmName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input
              value={formState.clientName}
              onChange={(e) => setFormState((prev) => ({ ...prev, clientName: e.target.value }))}
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Declarant Name</Label>
            <Input
              value={formState.declarantName}
              onChange={(e) => setFormState((prev) => ({ ...prev, declarantName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Membership No.</Label>
            <Input
              value={formState.membershipNo}
              onChange={(e) => setFormState((prev) => ({ ...prev, membershipNo: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <Input
              value={formState.designation}
              onChange={(e) => setFormState((prev) => ({ ...prev, designation: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Engagement ID</Label>
            <Input
              value={formState.engagementId}
              onChange={(e) => setFormState((prev) => ({ ...prev, engagementId: e.target.value }))}
            />
          </div>
          {formState.declarationType === 'audit' ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Financial Year</Label>
              <Input
                value={formState.financialYear}
                onChange={(e) => setFormState((prev) => ({ ...prev, financialYear: e.target.value }))}
              />
            </div>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <Label>Engagement Period</Label>
              <Input
                value={formState.engagementPeriod}
                onChange={(e) => setFormState((prev) => ({ ...prev, engagementPeriod: e.target.value }))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formState.declarationDate}
              onChange={(e) => setFormState((prev) => ({ ...prev, declarationDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Place</Label>
            <Input
              value={formState.place}
              onChange={(e) => setFormState((prev) => ({ ...prev, place: e.target.value }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
