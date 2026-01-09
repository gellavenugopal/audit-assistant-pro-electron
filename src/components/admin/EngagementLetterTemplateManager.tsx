import { useState } from 'react';
import mammoth from 'mammoth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEngagementLetterTemplates } from '@/hooks/useEngagementLetterTemplates';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function EngagementLetterTemplateManager() {
  const { templates, loading, uploadTemplate, deleteTemplate, refetch } = useEngagementLetterTemplates();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const templateTypes = [
    { value: 'statutory_audit_company_without_ifc', label: 'Statutory Audit - Company (Unlisted)' },
    { value: 'statutory_audit_company_with_ifc', label: 'Statutory Audit - Company (with IFC)' },
    { value: 'tax_audit_partnership_3ca', label: 'Tax Audit - Partnership (3CA - Audited)' },
    { value: 'tax_audit_partnership_3cb', label: 'Tax Audit - Partnership (3CB - Non-Audited)' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.docx')) {
        toast.error('Please select a Word document (.docx)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedType || !selectedFile) {
      toast.error('Please select template type and file');
      return;
    }

    setUploading(true);
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();

      // Extract text from Word document
      const result = await mammoth.extractRawText({ arrayBuffer });
      const textContent = result.value;

      if (!textContent.trim()) {
        toast.error('No text content found in the document');
        return;
      }

      // Upload to database
      const success = await uploadTemplate(
        selectedType as any,
        templateTypes.find(t => t.value === selectedType)?.label || selectedType,
        textContent,
        selectedFile.name
      );

      if (success) {
        setSelectedFile(null);
        setSelectedType('');
        // Reset file input
        const fileInput = document.getElementById('template-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process Word document');
    } finally {
      setUploading(false);
    }
  };

  const getUploadedTemplate = (type: string) => {
    return templates.find(t => t.template_type === type);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Letter Templates</CardTitle>
        <CardDescription>
          Upload Word document templates for engagement letters. Use merge tags like {'{'}{'{'} entity_name {'}'}{'}'},
          {'{'}{'{'} partner_name {'}'}{'}'},  etc. in your templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            <strong>Merge Tags Available:</strong> entity_name, entity_type, registration_no, pan, gstin, address,
            email, phone, financial_year, firm_name, partner_name, place, letter_date, professional_fees,
            payment_terms, and more.
          </AlertDescription>
        </Alert>

        {/* Upload Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h4 className="font-semibold text-sm">Upload New Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Type *</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template type" />
                </SelectTrigger>
                <SelectContent>
                  {templateTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Word Document (.docx) *</Label>
              <Input
                id="template-file-input"
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Selected: {selectedFile.name}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedType || !selectedFile || uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload Template'}
          </Button>
        </div>

        {/* Templates List */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Uploaded Templates</h4>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {templateTypes.map((type) => {
                const uploaded = getUploadedTemplate(type.value);
                return (
                  <div
                    key={type.value}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      uploaded ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {uploaded ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{type.label}</p>
                        {uploaded && (
                          <p className="text-xs text-muted-foreground">
                            {uploaded.file_name} • Uploaded {new Date(uploaded.uploaded_at).toLocaleDateString()}
                          </p>
                        )}
                        {!uploaded && (
                          <p className="text-xs text-amber-600">Not uploaded yet</p>
                        )}
                      </div>
                    </div>
                    {uploaded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(uploaded.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
