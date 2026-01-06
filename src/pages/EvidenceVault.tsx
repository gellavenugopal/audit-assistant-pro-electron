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
  Filter,
  FolderOpen,
  Link2,
  Loader2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEvidenceFiles, EvidenceFile } from '@/hooks/useEvidenceFiles';
import { useProcedures } from '@/hooks/useProcedures';
import { useProcedureWorkpaper, ProcedureEvidenceRequirement } from '@/hooks/useWorkingPaper';
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
  const [linkedProcedureId, setLinkedProcedureId] = useState('');
  const [linkedRequirementId, setLinkedRequirementId] = useState('');
  const [workpaperRef, setWorkpaperRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filterProcedure, setFilterProcedure] = useState('all');
  const [procedureRequirements, setProcedureRequirements] = useState<ProcedureEvidenceRequirement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const { procedures } = useProcedures(currentEngagement?.id);
  const [unlockDialogFile, setUnlockDialogFile] = useState<EvidenceFile | null>(null);

  // Fetch evidence requirements when procedure is selected
  useEffect(() => {
    const fetchRequirements = async () => {
      if (!linkedProcedureId) {
        setProcedureRequirements([]);
        setLinkedRequirementId('');
        return;
      }
      
      const { data } = await supabase
        .from('procedure_evidence_requirements')
        .select('*')
        .eq('procedure_id', linkedProcedureId)
        .order('sort_order');
      
      setProcedureRequirements((data || []).map(r => ({
        ...r,
        allowed_file_types: r.allowed_file_types || [],
      })));
    };
    
    fetchRequirements();
  }, [linkedProcedureId]);

  // Get procedure name by ID
  const getProcedureName = (procedureId: string | null) => {
    if (!procedureId) return null;
    const procedure = procedures.find(p => p.id === procedureId);
    return procedure?.procedure_name || procedureId;
  };

  const filteredEvidence = files.filter((ev) => {
    const matchesSearch = 
      ev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.linked_procedure && getProcedureName(ev.linked_procedure)?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ev.workpaper_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesProcedure = filterProcedure === 'all' || 
      (filterProcedure === 'unlinked' && !ev.linked_procedure) ||
      ev.linked_procedure === filterProcedure;
    
    return matchesSearch && matchesProcedure;
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
        linked_procedure: linkedProcedureId || undefined,
        workpaper_ref: workpaperRef || undefined,
      });
      
      // If we have a procedure and/or requirement, create the evidence_link
      if (uploadedFile && linkedProcedureId) {
        await supabase
          .from('evidence_links')
          .insert({
            evidence_id: uploadedFile.id,
            procedure_id: linkedProcedureId,
            evidence_requirement_id: linkedRequirementId || null,
            linked_by: user.id,
          });
      }
      
      // Reset form
      setSelectedFile(null);
      setEvidenceType('document');
      setLinkedProcedureId('');
      setLinkedRequirementId('');
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
                  <Label>Link to Procedure</Label>
                  <Select value={linkedProcedureId || "none"} onValueChange={(val) => setLinkedProcedureId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select procedure (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No procedure</SelectItem>
                      {procedures.map((proc) => (
                        <SelectItem key={proc.id} value={proc.id}>
                          {proc.area} - {proc.procedure_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {linkedProcedureId && procedureRequirements.length > 0 && (
                  <div className="space-y-2">
                    <Label>Link to Evidence Requirement</Label>
                    <Select value={linkedRequirementId || "none"} onValueChange={(val) => setLinkedRequirementId(val === "none" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select requirement (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific requirement</SelectItem>
                        {procedureRequirements.map((req) => (
                          <SelectItem key={req.id} value={req.id}>
                            {req.title} {req.is_required && '(Required)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

      {/* Search and Filters */}
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
        <Select value={filterProcedure} onValueChange={setFilterProcedure}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by procedure" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="unlinked">Unlinked Files</SelectItem>
            {procedures.map((proc) => (
              <SelectItem key={proc.id} value={proc.id}>
                {proc.procedure_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <TableHead>Linked To</TableHead>
                <TableHead className="w-24">Workpaper Ref</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
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
                      <TableCell>
                        {evidence.linked_procedure ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Link2 className="h-3 w-3 text-primary" />
                            <span className="text-foreground truncate max-w-[200px]">
                              {getProcedureName(evidence.linked_procedure)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {evidence.workpaper_ref || '—'}
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
