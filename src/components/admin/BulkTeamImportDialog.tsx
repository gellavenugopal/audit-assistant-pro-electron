import { useState, useRef } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';

const db = getSQLiteClient();
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
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { downloadTeamTemplate, parseTeamExcel, ParsedTeamMember } from '@/utils/excelTemplates';
import { Badge } from '@/components/ui/badge';

interface BulkTeamImportDialogProps {
  onSuccess: () => void;
}

export function BulkTeamImportDialog({ onSuccess }: BulkTeamImportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [parsedMembers, setParsedMembers] = useState<ParsedTeamMember[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const members = await parseTeamExcel(file);
      setParsedMembers(members);
      if (members.length === 0) {
        toast.error('No valid team members found in the file');
      }
    } catch (error) {
      toast.error('Failed to parse Excel file');
      setParsedMembers([]);
    }
  };

  const handleImport = async () => {
    if (parsedMembers.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    // Get current user's name for inviter
    let inviterName = 'Admin';
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single()
        .execute();
      if (profile?.full_name) {
        inviterName = profile.full_name;
      }
    } catch (e) {
      // Use default inviterName
    }

    const appUrl = window.location.origin;

    for (const member of parsedMembers) {
      try {
        // Edge functions not available in SQLite
        toast.warning('Email invitation feature not yet implemented in SQLite.');
        const error = new Error('Email invitations require edge functions');
        // const { error } = await supabase.functions.invoke('send-invite', {
        //   body: {
        //     email: member.email,
        //     role: member.role,
        //     full_name: member.full_name,
        //     phone: member.phone,
        //     inviterName,
        //     appUrl,
        //   },
        // });

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
      toast.success(`Successfully sent ${successCount} invitation(s)`);
      onSuccess();
    }
    if (errorCount > 0) {
      toast.error(`Failed to send ${errorCount} invitation(s)`);
    }

    setOpen(false);
    setParsedMembers([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setOpen(false);
    setParsedMembers([]);
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
          <DialogTitle>Bulk Import Team Members</DialogTitle>
          <DialogDescription>
            Upload an Excel file to invite multiple team members at once. Invitations will be sent to their email addresses.
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
            <Button variant="outline" size="sm" onClick={downloadTeamTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Valid roles: <span className="font-medium">partner, manager, senior, staff, viewer</span>.
              Invalid roles will default to "staff".
            </p>
          </div>

          {/* Upload file */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="team-file-upload"
            />
            <label
              htmlFor="team-file-upload"
              className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {fileName || 'Click to upload Excel file'}
              </span>
            </label>
          </div>

          {/* Preview */}
          {parsedMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview ({parsedMembers.length} members)</p>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border p-2">
                {parsedMembers.slice(0, 10).map((member, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-1 rounded bg-muted/30">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="flex-1">{member.full_name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                    <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                  </div>
                ))}
                {parsedMembers.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    ...and {parsedMembers.length - 10} more
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
          <Button onClick={handleImport} disabled={parsedMembers.length === 0 || importing}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending Invites...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Invite {parsedMembers.length} Member(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
