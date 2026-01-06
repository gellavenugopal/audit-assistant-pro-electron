import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Paperclip,
  Upload,
  Link2,
  Unlink,
  FileText,
  AlertCircle,
  Save,
  User,
  Calendar,
  CheckSquare,
  ClipboardList,
  File,
  ChevronUp,
  ChevronDown,
  Download,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/contexts/EngagementContext';
import { useProcedureWorkpaper, ProcedureChecklistItem, ProcedureEvidenceRequirement } from '@/hooks/useWorkingPaper';
import { useEvidenceFiles } from '@/hooks/useEvidenceFiles';
import { useProcedures } from '@/hooks/useProcedures';
import { StatusBadge, getStatusVariant } from '@/components/ui/status-badge';
import { ApprovalBadge } from '@/components/audit/ApprovalBadge';
import { ApprovalActions } from '@/components/audit/ApprovalActions';
import { toast } from 'sonner';

interface ProcedureDetails {
  id: string;
  procedure_name: string;
  description: string | null;
  area: string;
  assertion: string | null;
  status: string;
  approval_stage: string;
  locked: boolean;
  workpaper_ref: string | null;
  conclusion: string | null;
  conclusion_prompt: string | null;
  prepared_by: string | null;
  prepared_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  engagement_id: string;
  template_id: string | null;
}

const statusIcons = {
  pending: Clock,
  done: CheckCircle,
  na: XCircle,
};

const statusLabels = {
  pending: 'Pending',
  done: 'Done',
  na: 'N/A',
};

export default function ProcedureWorkpaper() {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { currentEngagement } = useEngagement();
  
  const [procedure, setProcedure] = useState<ProcedureDetails | null>(null);
  const [loadingProcedure, setLoadingProcedure] = useState(true);
  const [conclusion, setConclusion] = useState('');
  const [savingConclusion, setSavingConclusion] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<ProcedureEvidenceRequirement | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<ProcedureChecklistItem | null>(null);
  const [remarksText, setRemarksText] = useState('');
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [newItemText, setNewItemText] = useState('');
  const [newItemRequired, setNewItemRequired] = useState(false);
  const [editingWpRef, setEditingWpRef] = useState(false);
  const [wpRefValue, setWpRefValue] = useState('');
  const [savingWpRef, setSavingWpRef] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  
  const { 
    checklistItems, 
    evidenceRequirements, 
    evidenceLinks, 
    loading,
    reordering,
    syncStatus,
    updateChecklistStatus,
    updateChecklistRemarks,
    reorderChecklistItem,
    exportChecklist,
    importChecklist,
    downloadChecklistTemplate,
    addChecklistItem,
    deleteChecklistItem,
    syncFromTemplate,
    linkEvidence,
    unlinkEvidence,
    getProgress,
    refetch: refetchWorkpaper,
  } = useProcedureWorkpaper(procedureId || null, procedure?.template_id);

  const importInputRef = useState<HTMLInputElement | null>(null)[1];
  
  const { files } = useEvidenceFiles();
  const { 
    markPrepared, 
    markReviewed, 
    approveProcedure, 
    unlockProcedure,
    canReview,
    canApprove,
    canUnlock,
  } = useProcedures();

  // Fetch procedure details
  useEffect(() => {
    const fetchProcedure = async () => {
      if (!procedureId) return;
      
      setLoadingProcedure(true);
      try {
        const { data, error } = await supabase
          .from('audit_procedures')
          .select('*')
          .eq('id', procedureId)
          .single();

        if (error) throw error;
        setProcedure(data);
        setConclusion(data.conclusion || '');
        setWpRefValue(data.workpaper_ref || '');
      } catch (error) {
        console.error('Error fetching procedure:', error);
        toast.error('Failed to load procedure');
      } finally {
        setLoadingProcedure(false);
      }
    };

    fetchProcedure();
  }, [procedureId]);

  // Fetch profile names for display
  useEffect(() => {
    const fetchProfiles = async () => {
      const userIds = new Set<string>();
      checklistItems.forEach(item => {
        if (item.completed_by) userIds.add(item.completed_by);
      });
      if (procedure?.prepared_by) userIds.add(procedure.prepared_by);
      if (procedure?.reviewed_by) userIds.add(procedure.reviewed_by);
      if (procedure?.approved_by) userIds.add(procedure.approved_by);

      if (userIds.size === 0) return;

      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(userIds));

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => { map[p.user_id] = p.full_name; });
        setProfiles(map);
      }
    };

    fetchProfiles();
  }, [checklistItems, procedure]);

  const handleSaveWpRef = async () => {
    if (!procedureId) return;
    
    setSavingWpRef(true);
    try {
      const { error } = await supabase
        .from('audit_procedures')
        .update({ workpaper_ref: wpRefValue || null })
        .eq('id', procedureId);

      if (error) throw error;
      
      // Update local state
      if (procedure) {
        setProcedure({ ...procedure, workpaper_ref: wpRefValue || null });
      }
      setEditingWpRef(false);
      toast.success('Workpaper reference saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save workpaper reference');
    } finally {
      setSavingWpRef(false);
    }
  };

  const handleStatusChange = async (item: ProcedureChecklistItem, newStatus: 'pending' | 'done' | 'na') => {
    if (procedure?.locked) return;
    await updateChecklistStatus(item.id, newStatus);
  };

  const handleRemarksClick = (item: ProcedureChecklistItem) => {
    setSelectedChecklistItem(item);
    setRemarksText(item.remarks || '');
    setRemarksDialogOpen(true);
  };

  const handleSaveRemarks = async () => {
    if (!selectedChecklistItem) return;
    await updateChecklistRemarks(selectedChecklistItem.id, remarksText);
    setRemarksDialogOpen(false);
  };

  const handleLinkEvidence = async () => {
    if (!selectedEvidenceId) return;
    await linkEvidence(selectedEvidenceId, selectedRequirement?.id);
    setLinkDialogOpen(false);
    setSelectedEvidenceId('');
    setSelectedRequirement(null);
  };

  const handleSaveConclusion = async () => {
    if (!procedureId) return;
    
    setSavingConclusion(true);
    try {
      const { error } = await supabase
        .from('audit_procedures')
        .update({ conclusion })
        .eq('id', procedureId);

      if (error) throw error;
      toast.success('Conclusion saved');
      // Refresh procedure
      const { data } = await supabase
        .from('audit_procedures')
        .select('*')
        .eq('id', procedureId)
        .single();
      if (data) setProcedure(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save conclusion');
    } finally {
      setSavingConclusion(false);
    }
  };

  const getLinksForRequirement = (requirementId: string) => {
    return evidenceLinks.filter(l => l.evidence_requirement_id === requirementId);
  };

  const getUnlinkedEvidence = () => {
    const linkedIds = new Set(evidenceLinks.map(l => l.evidence_id));
    return files.filter(f => !linkedIds.has(f.id));
  };

  const progress = getProgress();
  const checklistProgress = progress.checklist_total > 0 
    ? Math.round((progress.checklist_done / progress.checklist_total) * 100)
    : 0;
  const evidenceProgress = progress.evidence_total > 0
    ? Math.round((progress.evidence_done / progress.evidence_total) * 100)
    : 0;

  if (loadingProcedure) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Procedure not found</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/programs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audit Programs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/programs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{procedure.procedure_name}</h1>
              <StatusBadge variant={getStatusVariant(procedure.status)} dot={false}>
                {procedure.status.replace('_', ' ')}
              </StatusBadge>
              <ApprovalBadge stage={procedure.approval_stage as 'draft' | 'prepared' | 'reviewed' | 'approved'} locked={procedure.locked} />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-muted-foreground">
                {procedure.area} {procedure.assertion && `• ${procedure.assertion}`}
              </span>
              {/* Editable Workpaper Reference */}
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Workpaper Ref:</span>
                {editingWpRef ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={wpRefValue}
                      onChange={(e) => setWpRefValue(e.target.value)}
                      className="h-6 w-24 text-xs px-2"
                      placeholder="e.g., A.1.1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveWpRef();
                        if (e.key === 'Escape') {
                          setEditingWpRef(false);
                          setWpRefValue(procedure.workpaper_ref || '');
                        }
                      }}
                      autoFocus
                      disabled={procedure.locked}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveWpRef} disabled={savingWpRef}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                      setEditingWpRef(false);
                      setWpRefValue(procedure.workpaper_ref || '');
                    }}>
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs font-mono hover:bg-muted"
                    onClick={() => !procedure.locked && setEditingWpRef(true)}
                    disabled={procedure.locked}
                  >
                    {procedure.workpaper_ref || 'Not set'}
                  </Button>
                )}
              </div>
            </div>
            {procedure.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{procedure.description}</p>
            )}
          </div>
        </div>
      <ApprovalActions
        stage={procedure.approval_stage as 'draft' | 'prepared' | 'reviewed' | 'approved'}
        locked={procedure.locked}
        canPrepare={!procedure.locked && progress.is_prepared}
        canReview={canReview}
        canApprove={canApprove}
        canUnlock={canUnlock}
        onMarkPrepared={() => markPrepared(procedure.id)}
        onMarkReviewed={() => markReviewed(procedure.id)}
        onApprove={() => approveProcedure(procedure.id)}
        onUnlock={() => {
          const reason = prompt('Enter reason for unlocking:');
          if (reason) unlockProcedure(procedure.id, reason);
        }}
      />
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="audit-card">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Checklist</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{progress.checklist_done}/{progress.checklist_total}</p>
              <p className="text-xs text-muted-foreground">items complete</p>
            </div>
            <div className="w-16">
              <Progress value={checklistProgress} className="h-2" />
            </div>
          </div>
        </div>
        <div className="audit-card">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Evidence</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{progress.evidence_done}/{progress.evidence_total}</p>
              <p className="text-xs text-muted-foreground">requirements met</p>
            </div>
            <div className="w-16">
              <Progress value={evidenceProgress} className="h-2" />
            </div>
          </div>
        </div>
        <div className="audit-card">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Required</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {progress.checklist_required_done + progress.evidence_required_done}/
            {progress.checklist_required_total + progress.evidence_required_total}
          </p>
          <p className="text-xs text-muted-foreground">mandatory items done</p>
        </div>
        <div className="audit-card">
          <div className="flex items-center gap-2 mb-2">
            <File className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Files Linked</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{evidenceLinks.length}</p>
          <p className="text-xs text-muted-foreground">evidence files</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checklist" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Checklist
            {progress.checklist_total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {progress.checklist_done}/{progress.checklist_total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Evidence
            {progress.evidence_total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {progress.evidence_done}/{progress.evidence_total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conclusion" className="gap-2">
            <FileText className="h-4 w-4" />
            Conclusion
          </TabsTrigger>
        </TabsList>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          {/* Sync Indicator */}
          {syncStatus.hasPendingUpdates && procedure.template_id && (
            <Alert className="border-warning bg-warning/10">
              <RefreshCw className="h-4 w-4 text-warning" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Template has been updated: {syncStatus.newChecklistItems > 0 && `${syncStatus.newChecklistItems} new checklist item(s)`}
                  {syncStatus.newChecklistItems > 0 && syncStatus.newEvidenceReqs > 0 && ', '}
                  {syncStatus.newEvidenceReqs > 0 && `${syncStatus.newEvidenceReqs} new evidence requirement(s)`}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncFromTemplate}
                  disabled={procedure.locked}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2">
            {/* Add Item Form */}
            {!procedure.locked && (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Input
                  placeholder="Add new checklist item..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItemText.trim()) {
                      setAddingItem(true);
                      addChecklistItem(newItemText.trim(), newItemRequired).finally(() => {
                        setNewItemText('');
                        setNewItemRequired(false);
                        setAddingItem(false);
                      });
                    }
                  }}
                  disabled={addingItem}
                />
                <div className="flex items-center gap-1">
                  <Checkbox
                    id="new-item-required"
                    checked={newItemRequired}
                    onCheckedChange={(checked) => setNewItemRequired(!!checked)}
                  />
                  <Label htmlFor="new-item-required" className="text-xs whitespace-nowrap">Required</Label>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (newItemText.trim()) {
                      setAddingItem(true);
                      addChecklistItem(newItemText.trim(), newItemRequired).finally(() => {
                        setNewItemText('');
                        setNewItemRequired(false);
                        setAddingItem(false);
                      });
                    }
                  }}
                  disabled={!newItemText.trim() || addingItem}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id="checklist-import"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    importChecklist(file);
                    e.target.value = '';
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={downloadChecklistTemplate}
              >
                <FileText className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('checklist-import')?.click()}
                disabled={procedure.locked}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportChecklist}
                disabled={checklistItems.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : checklistItems.length === 0 ? (
            <div className="audit-card text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground mb-1">No checklist items</h3>
              <p className="text-sm text-muted-foreground">
                Add your first checklist item using the form above.
              </p>
            </div>
          ) : (
            <div className="audit-card p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Order</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24">Required</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-48">Completed</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklistItems.map((item, index) => {
                    const StatusIcon = statusIcons[item.status];
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-muted-foreground w-6">{index + 1}</span>
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => reorderChecklistItem(item.id, 'up')}
                                disabled={index === 0 || procedure.locked || reordering}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => reorderChecklistItem(item.id, 'down')}
                                disabled={index === checklistItems.length - 1 || procedure.locked || reordering}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className={cn(
                              "font-medium",
                              item.status === 'done' && "line-through text-muted-foreground"
                            )}>
                              {item.text}
                            </p>
                            {item.remarks && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {item.remarks}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.is_required ? (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Optional</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.status}
                            onValueChange={(val) => handleStatusChange(item, val as 'pending' | 'done' | 'na')}
                            disabled={procedure.locked}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon className={cn(
                                  "h-3.5 w-3.5",
                                  item.status === 'done' && "text-success",
                                  item.status === 'na' && "text-muted-foreground",
                                  item.status === 'pending' && "text-warning"
                                )} />
                                <span className="text-xs">{statusLabels[item.status]}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-warning" />
                                  Pending
                                </div>
                              </SelectItem>
                              <SelectItem value="done">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                                  Done
                                </div>
                              </SelectItem>
                              <SelectItem value="na">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                  N/A
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {item.completed_by && (
                            <div className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {profiles[item.completed_by] || 'Unknown'}
                              </div>
                              {item.completed_at && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(item.completed_at), 'dd MMM yyyy')}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemarksClick(item)}
                              disabled={procedure.locked}
                            >
                              {item.remarks ? 'Edit Remarks' : 'Add Remarks'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm('Delete this checklist item?')) {
                                  deleteChecklistItem(item.id);
                                }
                              }}
                              disabled={procedure.locked}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : evidenceRequirements.length === 0 ? (
            <div className="audit-card text-center py-12">
              <Paperclip className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground mb-1">No evidence requirements</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This procedure has no specific evidence requirements defined.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequirement(null);
                  setLinkDialogOpen(true);
                }}
                disabled={procedure.locked}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Link Evidence Anyway
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {evidenceRequirements.map((req, index) => {
                const links = getLinksForRequirement(req.id);
                const isSatisfied = links.length > 0;
                
                return (
                  <div
                    key={req.id}
                    className={cn(
                      "audit-card border-l-4",
                      isSatisfied ? "border-l-success" : req.is_required ? "border-l-destructive" : "border-l-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                          <h4 className="font-medium text-foreground">{req.title}</h4>
                          {req.is_required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {isSatisfied && (
                            <Badge variant="default" className="text-xs bg-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Satisfied
                            </Badge>
                          )}
                        </div>
                        {req.wp_ref && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-muted-foreground/70">Suggested Workpaper Ref:</span> {req.wp_ref}
                          </p>
                        )}
                        {req.allowed_file_types && req.allowed_file_types.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Accepted: {req.allowed_file_types.join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequirement(req);
                          setLinkDialogOpen(true);
                        }}
                        disabled={procedure.locked}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Link Evidence
                      </Button>
                    </div>
                    
                    {links.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {links.map(link => (
                          <div
                            key={link.id}
                            className="flex items-center gap-3 p-2 rounded bg-muted/30"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{link.evidence_name || 'Unknown file'}</p>
                              <p className="text-xs text-muted-foreground">
                                Linked {format(new Date(link.linked_at), 'dd MMM yyyy')}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => unlinkEvidence(link.id)}
                              disabled={procedure.locked}
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Unlinked evidence linked to this procedure */}
              {evidenceLinks.filter(l => !l.evidence_requirement_id).length > 0 && (
                <div className="audit-card">
                  <h4 className="font-medium text-foreground mb-3">Other Linked Evidence</h4>
                  <div className="space-y-2">
                    {evidenceLinks.filter(l => !l.evidence_requirement_id).map(link => (
                      <div
                        key={link.id}
                        className="flex items-center gap-3 p-2 rounded bg-muted/30"
                      >
                        <FileText className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{link.evidence_name || 'Unknown file'}</p>
                          <p className="text-xs text-muted-foreground">
                            Linked {format(new Date(link.linked_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => unlinkEvidence(link.id)}
                          disabled={procedure.locked}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Conclusion Tab */}
        <TabsContent value="conclusion" className="space-y-4">
          <div className="audit-card space-y-4">
            {procedure.conclusion_prompt && (
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
                <p className="text-xs font-medium text-muted-foreground mb-1">Guidance</p>
                <p className="text-sm text-foreground">{procedure.conclusion_prompt}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Conclusion</Label>
              <Textarea
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="Document your audit conclusion here..."
                rows={6}
                disabled={procedure.locked}
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleSaveConclusion}
                disabled={procedure.locked || savingConclusion}
              >
                <Save className="h-4 w-4 mr-2" />
                {savingConclusion ? 'Saving...' : 'Save Conclusion'}
              </Button>
            </div>
          </div>
          
          {/* Sign-off section */}
          <div className="audit-card">
            <h4 className="font-medium text-foreground mb-4">Sign-off</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Prepared By</p>
                {procedure.prepared_by ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{profiles[procedure.prepared_by] || 'Unknown'}</p>
                      {procedure.prepared_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(procedure.prepared_at), 'dd MMM yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet prepared</p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Reviewed By</p>
                {procedure.reviewed_by ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-400" />
                    <div>
                      <p className="text-sm font-medium">{profiles[procedure.reviewed_by] || 'Unknown'}</p>
                      {procedure.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(procedure.reviewed_at), 'dd MMM yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet reviewed</p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Approved By</p>
                {procedure.approved_by ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-sm font-medium">{profiles[procedure.approved_by] || 'Unknown'}</p>
                      {procedure.approved_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(procedure.approved_at), 'dd MMM yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet approved</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Link Evidence Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Link Evidence
              {selectedRequirement && (
                <span className="font-normal text-muted-foreground ml-2">
                  to "{selectedRequirement.title}"
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Evidence File</Label>
              <Select value={selectedEvidenceId} onValueChange={setSelectedEvidenceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a file..." />
                </SelectTrigger>
                <SelectContent>
                  {files.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No evidence files available
                    </div>
                  ) : (
                    files.map(file => (
                      <SelectItem key={file.id} value={file.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{file.name}</span>
                          {file.workpaper_ref && (
                            <span className="text-xs text-muted-foreground">(Ref: {file.workpaper_ref})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Can't find your file? <Button variant="link" className="h-auto p-0" onClick={() => {
                setLinkDialogOpen(false);
                navigate('/evidence');
              }}>Upload it in Evidence Vault</Button>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkEvidence} disabled={!selectedEvidenceId}>
              <Link2 className="h-4 w-4 mr-2" />
              Link Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remarks Dialog */}
      <Dialog open={remarksDialogOpen} onOpenChange={setRemarksDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checklist Item Remarks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedChecklistItem && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm font-medium">{selectedChecklistItem.text}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="Add remarks or notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarksDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRemarks}>
              <Save className="h-4 w-4 mr-2" />
              Save Remarks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
