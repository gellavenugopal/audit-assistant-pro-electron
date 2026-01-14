import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  Search, 
  FileText, 
  Image, 
  File, 
  Download, 
  Eye,
  Trash2,
  FolderOpen,
  Loader2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEvidenceFiles, EvidenceFile } from '@/hooks/useEvidenceFiles';
import { useEngagement } from '@/contexts/EngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApprovalBadge } from '@/components/audit/ApprovalBadge';
import { ApprovalActions } from '@/components/audit/ApprovalActions';
import { UnlockDialog } from '@/components/audit/UnlockDialog';
import { supabase } from '@/integrations/supabase/client';

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return File;
  if (mimeType.includes('image')) return Image;
  if (mimeType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const typeLabels: Record<string, string> = {
  document: 'Document',
  screenshot: 'Screenshot',
  confirmation: 'Confirmation',
  analysis: 'Analysis',
  other: 'Other',
};

export default function EvidenceVault() {
  const { currentEngagement } = useEngagement();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('document');
  const [workpaperRef, setWorkpaperRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [moduleTags, setModuleTags] = useState<Record<string, string[]>>({});

  const { 
    files, 
    loading, 
    uploadFile, 
    deleteFile, 
    downloadFile, 
    getFileUrl,
    markPrepared,
    markReviewed,
    approveFile,
    unlockFile,
    canReview,
    canApprove,
    canUnlock,
    refetch: refetchFiles,
  } = useEvidenceFiles();
  const [unlockDialogFile, setUnlockDialogFile] = useState<EvidenceFile | null>(null);

  useEffect(() => {
    const loadModuleTags = async () => {
      if (!currentEngagement) {
        setModuleTags({});
        return;
      }

      try {
        const { data: programs, error: programError } = await supabase
          .from('audit_programs_new')
          .select('id')
          .eq('engagement_id', currentEngagement.id);

        if (programError) throw programError;

        const programIds = (programs || []).map((program) => program.id);
        if (programIds.length === 0) {
          setModuleTags({});
          return;
        }

        const { data: attachments, error: attachmentError } = await supabase
          .from('audit_program_attachments')
          .select('file_path,audit_program_id')
          .in('audit_program_id', programIds);

        if (attachmentError) throw attachmentError;

        const nextTags: Record<string, string[]> = {};
        (attachments || []).forEach((attachment) => {
          if (!attachment.file_path) return;
          const tags = nextTags[attachment.file_path] || [];
          if (!tags.includes('Audit Execution')) {
            tags.push('Audit Execution');
          }
          nextTags[attachment.file_path] = tags;
        });

        setModuleTags(nextTags);
      } catch (error) {
        console.error('Error loading evidence module tags:', error);
        setModuleTags({});
      }
    };

    loadModuleTags();
  }, [currentEngagement?.id, files.length]);

  const filteredEvidence = files.filter((ev) => {
    const matchesSearch =
      ev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.workpaper_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    return matchesSearch;
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const uploadedFile = await uploadFile(selectedFile, {
        name: selectedFile.name,
        file_type: evidenceType,
        workpaper_ref: workpaperRef || undefined,
      });

      // Reset form
      setSelectedFile(null);
      setEvidenceType('document');
      setWorkpaperRef('');
      setIsUploadDialogOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (file: EvidenceFile) => {
    const url = await getFileUrl(file);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (file: EvidenceFile) => {
    if (file.locked) {
      return;
    }
    if (confirm('Are you sure you want to delete this file?')) {
      await deleteFile(file);
    }
  };

  const handleUnlock = async (reason: string) => {
    if (!unlockDialogFile) return;
    await unlockFile(unlockDialogFile.id, reason);
    setUnlockDialogFile(null);
  };

  if (!currentEngagement) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evidence Vault</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage audit evidence and workpapers
          </p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an engagement from the sidebar to view and manage evidence files.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evidence Vault</h1>
          <p className="text-muted-foreground mt-1">
            {currentEngagement.client_name} - {currentEngagement.name}
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Evidence
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Evidence</DialogTitle>
              <DialogDescription>
                Upload documents, screenshots, or other evidence files.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Drop Zone */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  selectedFile && 'border-primary bg-primary/5'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />
                {selectedFile ? (
                  <>
                    <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
                    <p className="text-sm text-foreground font-medium mb-1">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • Click to change
                    </p>
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-foreground font-medium mb-1">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Excel, Word, Images (Max 50MB)
                    </p>
                  </>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Evidence Type</Label>
                  <Select value={evidenceType} onValueChange={setEvidenceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="screenshot">Screenshot</SelectItem>
                      <SelectItem value="confirmation">Confirmation</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Workpaper Reference</Label>
                  <Input 
                    placeholder="e.g., A.1.1" 
                    value={workpaperRef}
                    onChange={(e) => setWorkpaperRef(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Files
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {loading ? <Skeleton className="h-8 w-12" /> : files.length}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Documents
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {loading ? <Skeleton className="h-8 w-12" /> : files.filter((e) => e.file_type === 'document').length}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Confirmations
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {loading ? <Skeleton className="h-8 w-12" /> : files.filter((e) => e.file_type === 'confirmation').length}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Size
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {loading ? <Skeleton className="h-8 w-12" /> : formatFileSize(files.reduce((sum, e) => sum + e.file_size, 0))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search evidence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Evidence Table */}
      <div className="audit-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-24">Workpaper Ref</TableHead>
                <TableHead className="w-32">Module</TableHead>
                <TableHead className="w-28">Uploaded</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredEvidence.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FolderOpen className="h-8 w-8" />
                      <p>No evidence files found</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsUploadDialogOpen(true)}
                      >
                        Upload your first file
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvidence.map((evidence) => {
                  const FileIcon = getFileIcon(evidence.mime_type);
                  const tags = moduleTags[evidence.file_path] || [];
                  
                  return (
                    <TableRow key={evidence.id}>
                      <TableCell>
                        <div className="p-2 rounded bg-muted relative">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          {evidence.locked && (
                            <Lock className="h-3 w-3 text-warning absolute -top-1 -right-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{evidence.name}</p>
                          <p className="text-xs text-muted-foreground">{evidence.file_path.split('/').pop()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs capitalize">
                          {typeLabels[evidence.file_type] || evidence.file_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ApprovalBadge 
                          stage={evidence.approval_stage || 'draft'} 
                          locked={evidence.locked} 
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatFileSize(evidence.file_size)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {evidence.workpaper_ref || '—'}
                      </TableCell>
                      <TableCell>
                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Vault</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          <p>{format(new Date(evidence.created_at), 'dd MMM yyyy')}</p>
                          <p>{evidence.uploader_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleView(evidence)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => downloadFile(evidence)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <ApprovalActions
                            stage={evidence.approval_stage || 'draft'}
                            locked={evidence.locked}
                            canPrepare={!evidence.locked}
                            canReview={canReview}
                            canApprove={canApprove}
                            canUnlock={canUnlock}
                            canDelete={!evidence.locked}
                            onMarkPrepared={() => markPrepared(evidence.id)}
                            onMarkReviewed={() => markReviewed(evidence.id)}
                            onApprove={() => approveFile(evidence.id)}
                            onUnlock={() => setUnlockDialogFile(evidence)}
                            onDelete={() => handleDelete(evidence)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Unlock Dialog */}
      <UnlockDialog
        open={!!unlockDialogFile}
        onOpenChange={(open) => !open && setUnlockDialogFile(null)}
        onConfirm={handleUnlock}
        itemName={unlockDialogFile?.name || 'file'}
      />
    </div>
  );
}

