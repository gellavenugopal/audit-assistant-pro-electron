import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, FileSignature, ShieldCheck, UploadCloud, FileDown, Eye } from 'lucide-react';
import { useEngagement } from '@/contexts/EngagementContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { LettersPage } from '@/components/appointment/Letters';
import { useEvidenceFiles, EvidenceFile } from '@/hooks/useEvidenceFiles';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export default function Appointment() {
  const { currentEngagement } = useEngagement();
  const navigate = useNavigate();
  const [showLettersPage, setShowLettersPage] = useState(false);
  const appointmentLetterInputRef = useRef<HTMLInputElement>(null);
  const adt1InputRef = useRef<HTMLInputElement>(null);
  const challanInputRef = useRef<HTMLInputElement>(null);
  const independenceInputRef = useRef<HTMLInputElement>(null);
  const confidentialityInputRef = useRef<HTMLInputElement>(null);
  const { files, uploadFile, downloadFile, getFileUrl } = useEvidenceFiles(currentEngagement?.id);

  const handleFileUpload = (label: string, fileType: string) => {
    return async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        // Validate file type
        const validExtensions = ['pdf', 'jpg', 'jpeg', 'doc', 'docx'];
        if (!fileExtension || !validExtensions.includes(fileExtension)) {
          toast.error('Invalid file format. Only PDF, JPEG, or DOC/DOCX files are allowed.');
          return;
        }

        if (!currentEngagement) {
          toast.error('Please select an engagement before uploading.');
          return;
        }

        const uploaded = await uploadFile(file, {
          name: file.name,
          file_type: fileType,
        });

        if (uploaded) {
          toast.success(`${label} uploaded successfully.`);
        }
        
        // Reset input
        event.target.value = '';
      }
    };
  };

  const handleDownloadTemplate = async () => {
    const clientName = currentEngagement?.client_name || 'Client';
    const financialYear = currentEngagement?.financial_year || 'FY';
    const title = `Appointment Letter Template`;

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 28 })],
            }),
            new Paragraph(''),
            new Paragraph(`Client: ${clientName}`),
            new Paragraph(`Financial Year: ${financialYear}`),
            new Paragraph(''),
            new Paragraph('To,'),
            new Paragraph('[Client Name]'),
            new Paragraph('[Client Address]'),
            new Paragraph(''),
            new Paragraph('Subject: Appointment of Statutory Auditor'),
            new Paragraph(''),
            new Paragraph(
              'This letter confirms your appointment as the statutory auditor for the financial year stated above. Please update the details and add applicable terms.'
            ),
            new Paragraph(''),
            new Paragraph('Sincerely,'),
            new Paragraph('[Audit Firm Name]'),
            new Paragraph('[Partner Name]'),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Appointment_Letter_Template_${clientName.replace(/\s+/g, '_')}_${financialYear}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateEngagementLetter = () => {
    navigate('/appointment/engagement-letter');
  };

  const handleCollectSubmissions = (type: string) => {
    toast.info(`${type} collection workflow will be implemented soon.`);
  };

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
      return (
        <p className="text-xs text-muted-foreground">
          No uploads yet.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openFilePreview(item)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile(item)}>
                <FileDown className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const appointmentFiles = files.filter((file) => file.file_type === 'appointment_letter');
  const adt1Files = files.filter((file) => file.file_type === 'adt1');
  const challanFiles = files.filter((file) => file.file_type === 'challan');
  const independenceFiles = files.filter((file) => file.file_type === 'independence_confirmation');
  const confidentialityFiles = files.filter((file) => file.file_type === 'confidentiality_undertaking');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
<div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointment</h1>
          <p className="text-sm text-muted-foreground">
            Manage appointment and independence artifacts for this engagement.
          </p>
          {currentEngagement && (
            <p className="text-xs text-muted-foreground mt-2">
              Engagement: {currentEngagement.client_name} ({currentEngagement.financial_year})
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Appointment Letter
            </CardTitle>
            <CardDescription>Upload or generate the signed appointment letter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={appointmentLetterInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileUpload('Appointment Letter', 'appointment_letter')}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => appointmentLetterInputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload appointment letter
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Supported formats: PDF (.pdf), JPEG (.jpg, .jpeg), DOC/DOCX
            </p>
            {renderFileList(appointmentFiles)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              ADT-1 & Challan
            </CardTitle>
            <CardDescription>Capture ADT-1 filing and challan proof.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={adt1InputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileUpload('ADT-1', 'adt1')}
              className="hidden"
            />
            <input
              ref={challanInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileUpload('Challan', 'challan')}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => adt1InputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload ADT-1
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => challanInputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload Challan
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">ADT-1 uploads</p>
                {renderFileList(adt1Files)}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Challan uploads</p>
                {renderFileList(challanFiles)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Engagement Letter - Now with full generator */}
        {!showLettersPage ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Engagement Letter Generator
              </CardTitle>
              <CardDescription>
                Generate professional engagement letters for different audit types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowLettersPage(true)}
                variant="outline"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Generate Engagement Letter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <Button 
              variant="outline" 
              onClick={() => setShowLettersPage(false)}
              className="mb-4"
            >
              Back to Appointment
            </Button>
            <LettersPage engagementId={currentEngagement?.id || ''} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Independence Confirmation
            </CardTitle>
            <CardDescription>Engagement-specific confirmations by team members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={independenceInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileUpload('Independence Confirmation', 'independence_confirmation')}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => independenceInputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload submission
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCollectSubmissions('Independence confirmations')}
              >
                View submissions
              </Button>
            </div>
            <Separator />
            {renderFileList(independenceFiles)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Confidentiality Undertakings
            </CardTitle>
            <CardDescription>Capture signed undertakings for the engagement team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={confidentialityInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileUpload('Confidentiality Undertaking', 'confidentiality_undertaking')}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => confidentialityInputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload undertaking
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCollectSubmissions('Confidentiality undertakings')}
              >
                View undertakings
              </Button>
            </div>
            <Separator />
            {renderFileList(confidentialityFiles)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
