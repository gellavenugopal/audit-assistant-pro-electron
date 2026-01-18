import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, FileSignature, UploadCloud, FileDown, Eye, Trash2 } from 'lucide-react';
import { useEngagement } from '@/contexts/EngagementContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { LettersPage } from '@/components/appointment/Letters';
import { EngagementAcceptanceChecklist } from '@/components/appointment/EngagementAcceptanceChecklist';
import { ConfidentialityDeclaration } from '@/components/appointment/ConfidentialityDeclaration';
import { IndependenceDeclaration } from '@/components/appointment/IndependenceDeclaration';
import { useEvidenceFiles, EvidenceFile } from '@/hooks/useEvidenceFiles';
import { PreviousAuditorCommunication } from '@/components/appointment/PreviousAuditorCommunication';
import { EligibilityCertificate } from '@/components/appointment/EligibilityCertificate';

export default function Appointment() {
  const { currentEngagement } = useEngagement();
  const navigate = useNavigate();
  const [showLettersPage, setShowLettersPage] = useState(false);
  const [showPrevAuditorCommunication, setShowPrevAuditorCommunication] = useState(false);
  const appointmentLetterInputRef = useRef<HTMLInputElement>(null);
  const adt1InputRef = useRef<HTMLInputElement>(null);
  const challanInputRef = useRef<HTMLInputElement>(null);
  const { files, uploadFile, downloadFile, getFileUrl, deleteFile } = useEvidenceFiles(currentEngagement?.id);

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

  const handleGenerateEngagementLetter = () => {
    navigate('/appointment/engagement-letter');
  };

  const handleAppointmentLetterUpload = () => {
    return async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files;
      if (!selected || selected.length === 0) {
        return;
      }

      const file = selected[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        toast.error('Invalid file format. Only PDF, JPG, JPEG, or PNG files are allowed.');
        event.target.value = '';
        return;
      }

      if (!currentEngagement) {
        toast.error('Please select an engagement before uploading.');
        event.target.value = '';
        return;
      }

      await uploadFile(file, {
        name: file.name,
        file_type: 'appointment_letter',
      });

      event.target.value = '';
    };
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

  const renderAppointmentLetterList = (items: EvidenceFile[]) => {
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
              <Button size="sm" variant="outline" onClick={() => openFilePreview(item)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deleteFile(item)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
<div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointment &amp; Engagement Letter</h1>
          <p className="text-sm text-muted-foreground">
            Manage appointment and independence aspects for this engagement.
          </p>
          {currentEngagement && (
            <p className="text-xs text-muted-foreground mt-2">
              Engagement: {currentEngagement.client_name} ({currentEngagement.financial_year})
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="appointment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="eligibility" className="text-[11px] px-1">Eligibility Cert</TabsTrigger>
          <TabsTrigger value="decision" className="text-[10px] px-1">Acceptance / Continuation Checklist</TabsTrigger>
          <TabsTrigger value="appointment" className="text-[11px] px-1">Appointment</TabsTrigger>
          <TabsTrigger value="engagement-letter" className="text-[11px] px-1">Engagement Letter</TabsTrigger>
          <TabsTrigger value="declaration" className="text-[11px] px-1">Other Declarations</TabsTrigger>
        </TabsList>

        <TabsContent value="eligibility" className="space-y-4">
          <div className="grid gap-4">
            <EligibilityCertificate />
          </div>
        </TabsContent>

        <TabsContent value="decision" className="space-y-4">
          <EngagementAcceptanceChecklist />
        </TabsContent>

        <TabsContent value="appointment" className="space-y-4">
          <div
            className={
              showPrevAuditorCommunication
                ? 'grid gap-4'
                : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
            }
          >
            <PreviousAuditorCommunication onOpenChange={setShowPrevAuditorCommunication} />

            {!showPrevAuditorCommunication && (
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
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleAppointmentLetterUpload()}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => appointmentLetterInputRef.current?.click()}>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Upload appointment letter
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Supported formats: PDF (.pdf), JPG/JPEG (.jpg, .jpeg), PNG (.png)
                </p>
                {renderAppointmentLetterList(appointmentFiles)}
              </CardContent>
            </Card>
            )}

            {!showPrevAuditorCommunication && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    ADT-1 & Challan
                  </CardTitle>
                  <CardDescription>Capture ADT-1 filing and challan proof.</CardDescription>
                  <p className="text-xs text-muted-foreground">Applicable for Companies only.</p>
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
                    <Button size="sm" onClick={() => adt1InputRef.current?.click()}>
                      <UploadCloud className="h-4 w-4 mr-2" />
                      Upload ADT-1
                    </Button>
                    <Button size="sm" onClick={() => challanInputRef.current?.click()}>
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
            )}
          </div>
        </TabsContent>

        <TabsContent value="engagement-letter" className="space-y-4">
          {/* Engagement Letter - Now with full generator */}
          {!showLettersPage ? (
            <Card>
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
                <Button onClick={() => setShowLettersPage(true)} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Generate Engagement Letter
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div>
              <Button onClick={() => setShowLettersPage(false)} className="mb-4">
                Back to Appointment
              </Button>
              <LettersPage engagementId={currentEngagement?.id || ''} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="declaration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <IndependenceDeclaration />

            <ConfidentialityDeclaration />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}



