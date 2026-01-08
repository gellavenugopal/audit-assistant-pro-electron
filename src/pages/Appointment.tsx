import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, FileSignature, ShieldCheck, UploadCloud, FileDown } from 'lucide-react';
import { useEngagement } from '@/contexts/EngagementContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRef } from 'react';

export default function Appointment() {
  const { currentEngagement } = useEngagement();
  const navigate = useNavigate();
  const appointmentLetterInputRef = useRef<HTMLInputElement>(null);
  const adt1InputRef = useRef<HTMLInputElement>(null);
  const challanInputRef = useRef<HTMLInputElement>(null);
  const independenceInputRef = useRef<HTMLInputElement>(null);
  const confidentialityInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (type: string) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        // Validate file type
        const validExtensions = ['pdf', 'jpg', 'jpeg'];
        if (!fileExtension || !validExtensions.includes(fileExtension)) {
          toast.error('Invalid file format. Only PDF and JPEG files are allowed.');
          return;
        }
        
        // Demo mode - show success message
        toast.success(`${type} uploaded successfully! (Demo mode - backend integration pending)`);
        console.log(`File uploaded: ${file.name}`, file);
        
        // Reset input
        event.target.value = '';
      }
    };
  };

  const handleDownloadTemplate = () => {
    toast.info('Template download will be implemented soon. (Demo mode)');
  };

  const handleGenerateEngagementLetter = () => {
    navigate('/appointment/engagement-letter');
  };

  const handleCollectSubmissions = (type: string) => {
    toast.info(`${type} collection workflow will be implemented soon. (Demo mode)`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">New</Badge>
          <span>Appointment module • positioned before Materiality</span>
        </div>
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
              accept=".pdf,.jpg,.jpeg"
              onChange={handleFileUpload('Appointment Letter')}
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
                variant="ghost" 
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Supported formats: PDF (.pdf), JPEG (.jpg, .jpeg)
            </p>
            <p className="text-xs text-muted-foreground">
              Demo mode active - files will not be permanently stored yet.
            </p>
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
              accept=".pdf,.jpg,.jpeg"
              onChange={handleFileUpload('ADT-1')}
              className="hidden"
            />
            <input
              ref={challanInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg"
              onChange={handleFileUpload('Challan')}
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
            <p className="text-xs text-muted-foreground">
              Demo mode active - acknowledgements will be stored once backend is ready.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Engagement Letter
            </CardTitle>
            <CardDescription>
              Mail-merge driven; will link to Word template once rules are finalized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGenerateEngagementLetter}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Generate Engagement Letter
            </Button>
            <p className="text-xs text-muted-foreground">
              Demo mode - mail-merge logic and template will be added later.
            </p>
          </CardContent>
        </Card>

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
              accept=".pdf,.jpg,.jpeg"
              onChange={handleFileUpload('Independence Confirmation')}
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
                variant="ghost" 
                size="sm"
                onClick={() => handleCollectSubmissions('Independence confirmations')}
              >
                View submissions
              </Button>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Demo mode - team directory and workflow integration pending.
            </p>
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
              accept=".pdf,.jpg,.jpeg"
              onChange={handleFileUpload('Confidentiality Undertaking')}
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
                variant="ghost" 
                size="sm"
                onClick={() => handleCollectSubmissions('Confidentiality undertakings')}
              >
                View undertakings
              </Button>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Demo mode - storage and approval workflow will be implemented soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
