import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { downloadClientTemplate, parseClientExcel, ParsedClient } from '@/utils/excelTemplates';

interface BulkClientImportDialogProps {
  onSuccess: () => void;
}

export function BulkClientImportDialog({ onSuccess }: BulkClientImportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const clients = await parseClientExcel(file);
      setParsedClients(clients);
      if (clients.length === 0) {
        toast.error('No valid clients found in the file');
      }
    } catch (error) {
      toast.error('Failed to parse Excel file');
      setParsedClients([]);
    }
  };

  const handleImport = async () => {
    if (parsedClients.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const client of parsedClients) {
      try {
        const { error } = await supabase.from('clients').insert({
          name: client.name,
          industry: client.industry,
          contact_person: client.contact_person,
          contact_email: client.contact_email,
          contact_phone: client.contact_phone,
          address: client.address,
          pan: client.pan,
          cin: client.cin,
          state: client.state,
          pin: client.pin,
          created_by: user?.id,
        });

        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setImporting(false);
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} client(s)`);
      onSuccess();
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} client(s)`);
    }

    setOpen(false);
    setParsedClients([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setOpen(false);
    setParsedClients([]);
    setFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Clients</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple clients at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download template */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Download Template</p>
                <p className="text-xs text-muted-foreground">Use this template format for import</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadClientTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* Upload file */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="client-file-upload"
            />
            <label
              htmlFor="client-file-upload"
              className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {fileName || 'Click to upload Excel file'}
              </span>
            </label>
          </div>

          {/* Preview */}
          {parsedClients.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview ({parsedClients.length} clients)</p>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border p-2">
                {parsedClients.slice(0, 10).map((client, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-1 rounded bg-muted/30">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{client.name}</span>
                    {client.industry && (
                      <span className="text-xs text-muted-foreground">({client.industry})</span>
                    )}
                  </div>
                ))}
                {parsedClients.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    ...and {parsedClients.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={parsedClients.length === 0 || importing}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedClients.length} Client(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
