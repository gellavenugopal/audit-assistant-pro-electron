import { useState, useEffect } from 'react';
import { StatusBadge, getStatusVariant } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Plus, 
  Search, 
  ClipboardList, 
  User, 
  Calendar, 
  CheckCircle, 
  Edit2, 
  Trash2, 
  AlertCircle,
  Paperclip,
  FileText,
  ExternalLink,
  Upload,
  Lock,
  ChevronDown,
  Info,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { useProcedures, AuditProcedure } from '@/hooks/useProcedures';
import { useEngagements } from '@/hooks/useEngagements';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useEvidenceFiles } from '@/hooks/useEvidenceFiles';
import { useProcedureTemplates, ProcedureTemplate } from '@/hooks/useProcedureTemplates';
import { toChecklistInstance, toEvidenceInstance } from '@/types/procedureTemplate';
import { useBulkProcedureAssignees, useProcedureAssignees } from '@/hooks/useProcedureAssignees';
import { getProceduresProgress, instantiateProcedureFromTemplate, ProcedureProgress } from '@/hooks/useWorkingPaper';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BulkImportDialog } from '@/components/BulkImportDialog';
import { ApprovalBadge } from '@/components/audit/ApprovalBadge';
import { ApprovalActions } from '@/components/audit/ApprovalActions';
import { UnlockDialog } from '@/components/audit/UnlockDialog';
import { TemplateSelector } from '@/components/procedures/TemplateSelector';
import { MultiAssigneeSelect } from '@/components/procedures/MultiAssigneeSelect';

const AUDIT_AREAS = [
  'Revenue',
  'Purchases',
  'Inventory',
  'Fixed Assets',
  'Cash & Bank',
  'Receivables',
  'Payables',
  'Payroll',
  'Investments',
  'Loans & Borrowings',
  'Related Parties',
  'Provisions',
  'Tax',
  'General',
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'reviewed', label: 'Reviewed' },
];

export default function AuditPrograms() {
  const { 
    procedures, 
    loading, 
    createProcedure, 
    updateProcedure, 
    deleteProcedure,
    markPrepared,
    markReviewed,
    approveProcedure,
    unlockProcedure,
    canReview,
    canApprove,
    canUnlock
  } = useProcedures();
  const { engagements } = useEngagements();
  const { members } = useTeamMembers();
  const { files } = useEvidenceFiles();
  const { templates } = useProcedureTemplates();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<AuditProcedure | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedProcedureForEvidence, setSelectedProcedureForEvidence] = useState<AuditProcedure | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [procedureToUnlock, setProcedureToUnlock] = useState<AuditProcedure | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [proceduresProgress, setProceduresProgress] = useState<Map<string, ProcedureProgress>>(new Map());

  // Fetch progress for all procedures
  useEffect(() => {
    const fetchProgress = async () => {
      if (procedures.length === 0) return;
      const progress = await getProceduresProgress(procedures.map(p => p.id));
      setProceduresProgress(progress);
    };
    fetchProgress();
  }, [procedures]);

  // Get evidence files linked to a procedure
  const getLinkedEvidence = (procedureId: string) => {
    return files.filter(f => f.linked_procedure === procedureId);
  };

  const procedureImportFields = [
    { key: 'area', label: 'Area', required: true },
    { key: 'procedure_name', label: 'Procedure Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'assertion', label: 'Assertion' },
    { key: 'workpaper_ref', label: 'Workpaper Ref' },
    { key: 'status', label: 'Status' },
  ];

  const handleBulkImport = async (data: Record<string, string>[]) => {
    const defaultEngagementId = engagements[0]?.id;
    if (!defaultEngagementId) {
      throw new Error('Please create an engagement first');
    }

    for (const row of data) {
      await createProcedure({
        engagement_id: defaultEngagementId,
        area: row.area || 'General',
        procedure_name: row.procedure_name,
        description: row.description || null,
        assertion: row.assertion || null,
        assigned_to: null,
        due_date: null,
        status: row.status || 'not_started',
        workpaper_ref: row.workpaper_ref || null,
        completed_date: null,
        conclusion: null,
        template_id: null,
        checklist_items: [],
        evidence_requirements: [],
        conclusion_prompt: null,
      });
    }
  };
  const [formData, setFormData] = useState({
    engagement_id: '',
    area: '',
    procedure_name: '',
    description: '',
    assertion: '',
    assigned_to: '', // Keep for backward compatibility
    due_date: '',
    status: 'not_started',
    workpaper_ref: '',
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Group procedures by area
  const proceduresByArea = AUDIT_AREAS.map((area) => ({
    area,
    procedures: procedures.filter((p) => p.area === area),
  })).filter((group) => group.procedures.length > 0 || searchTerm === '');

  const filteredAreas = proceduresByArea.filter(
    (group) =>
      group.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.procedures.some(
        (p) =>
          p.procedure_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const getProgressPercentage = (procs: AuditProcedure[]) => {
    if (procs.length === 0) return 0;
    const completed = procs.filter(
      (p) => p.status === 'completed' || p.status === 'done' || p.status === 'reviewed'
    ).length;
    return Math.round((completed / procs.length) * 100);
  };

  const handleOpenDialog = (area?: string, procedure?: AuditProcedure) => {
    setSelectedTemplateId(undefined);
    setSelectedAssignees([]);
    if (procedure) {
      setEditingProcedure(procedure);
      setFormData({
        engagement_id: procedure.engagement_id,
        area: procedure.area,
        procedure_name: procedure.procedure_name,
        description: procedure.description || '',
        assertion: procedure.assertion || '',
        assigned_to: procedure.assigned_to || '',
        due_date: procedure.due_date || '',
        status: procedure.status,
        workpaper_ref: procedure.workpaper_ref || '',
      });
      // Set initial assignees from the legacy field if present
      if (procedure.assigned_to) {
        setSelectedAssignees([procedure.assigned_to]);
      }
    } else {
      setEditingProcedure(null);
      setFormData({
        engagement_id: engagements[0]?.id || '',
        area: area || '',
        procedure_name: '',
        description: '',
        assertion: '',
        assigned_to: '',
        due_date: '',
        status: 'not_started',
        workpaper_ref: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleTemplateSelect = (template: ProcedureTemplate | null) => {
    if (template) {
      setSelectedTemplateId(template.id);
      setFormData(prev => ({
        ...prev,
        area: template.area,
        procedure_name: template.procedure_name,
        description: template.description || '',
        assertion: template.assertion || '',
        // If template has default_status, apply it (but don't override if user has already set)
        status: template.default_status || prev.status || 'not_started',
      }));
    } else {
      setSelectedTemplateId(undefined);
    }
  };

  const handleSubmit = async () => {
    if (!formData.procedure_name.trim() || !formData.area || !formData.engagement_id) {
      return;
    }

    // Find selected template to copy workpaper fields
    const selectedTemplate = selectedTemplateId ? templates.find(t => t.id === selectedTemplateId) : null;

    if (editingProcedure) {
      await updateProcedure(editingProcedure.id, {
        area: formData.area,
        procedure_name: formData.procedure_name.trim(),
        description: formData.description.trim() || null,
        assertion: formData.assertion || null,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
        status: formData.status,
        workpaper_ref: formData.workpaper_ref || null,
        completed_date: formData.status === 'completed' || formData.status === 'reviewed' 
          ? new Date().toISOString().split('T')[0] 
          : null,
      });
    } else {
      // When creating, copy workpaper fields from template if selected
      const newProcedure = await createProcedure({
        engagement_id: formData.engagement_id,
        area: formData.area,
        procedure_name: formData.procedure_name.trim(),
        description: formData.description.trim() || null,
        assertion: formData.assertion || null,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
        status: formData.status,
        workpaper_ref: formData.workpaper_ref || null,
        completed_date: null,
        conclusion: null,
        // Workpaper fields from template (for legacy JSONB support)
        template_id: selectedTemplate?.id || null,
        checklist_items: selectedTemplate ? toChecklistInstance(selectedTemplate.checklist_items || []) : [],
        evidence_requirements: selectedTemplate ? toEvidenceInstance(selectedTemplate.evidence_requirements || []) : [],
        conclusion_prompt: selectedTemplate?.conclusion_prompt || null,
      });
      
      // Also instantiate into the new relational tables
      if (newProcedure && selectedTemplate?.id) {
        await instantiateProcedureFromTemplate(newProcedure.id, selectedTemplate.id);
      }
    }
    setIsDialogOpen(false);
  };

  const handleMarkComplete = async (procedure: AuditProcedure) => {
    await updateProcedure(procedure.id, {
      status: 'completed',
      completed_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this procedure?')) {
      await deleteProcedure(id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Programs</h1>
          <p className="text-muted-foreground mt-1">
            Manage audit procedures by financial statement area
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            New Procedure
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{procedures.length}</p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-warning mt-1">
            {procedures.filter((p) => p.status === 'in_progress').length}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Draft</p>
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            {procedures.filter((p) => p.approval_stage === 'draft' || !p.approval_stage).length}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prepared</p>
          <p className="text-2xl font-bold text-info mt-1">
            {procedures.filter((p) => p.approval_stage === 'prepared').length}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reviewed</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">
            {procedures.filter((p) => p.approval_stage === 'reviewed').length}
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            Approved <Lock className="h-3 w-3" />
          </p>
          <p className="text-2xl font-bold text-success mt-1">
            {procedures.filter((p) => p.approval_stage === 'approved').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search procedures..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Procedures by Area */}
      {procedures.length === 0 ? (
        <div className="audit-card text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-medium text-foreground mb-1">No procedures yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first audit procedure to get started
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Procedure
          </Button>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={filteredAreas.filter(a => a.procedures.length > 0).map(a => a.area)} className="space-y-4">
          {filteredAreas.filter(a => a.procedures.length > 0).map((group) => {
            const progress = getProgressPercentage(group.procedures);
            
            return (
              <AccordionItem
                key={group.area}
                value={group.area}
                className="audit-card border-none"
              >
                <AccordionTrigger className="hover:no-underline py-4 px-0">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-foreground">{group.area}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.procedures.length} procedure{group.procedures.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="w-32 mr-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 border-t border-border mt-4 space-y-3">
                    {group.procedures.map((procedure) => {
                      const progress = proceduresProgress.get(procedure.id);
                      const hasProgress = progress && (progress.checklist_total > 0 || progress.evidence_total > 0);
                      
                      return (
                        <div
                          key={procedure.id}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                            procedure.locked 
                              ? 'bg-muted/50 border border-border/50' 
                              : 'bg-muted/30 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground truncate">
                                {procedure.procedure_name}
                              </p>
                              <StatusBadge
                                variant={getStatusVariant(procedure.status)}
                                dot={false}
                              >
                                {procedure.status.replace('_', ' ')}
                              </StatusBadge>
                              <ApprovalBadge 
                                stage={(procedure.approval_stage || 'draft') as 'draft' | 'prepared' | 'reviewed' | 'approved'} 
                                locked={procedure.locked}
                              />
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {procedure.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {procedure.description}
                                </p>
                              )}
                              {/* Progress badges */}
                              {hasProgress && (
                                <div className="flex items-center gap-2">
                                  {progress.checklist_total > 0 && (
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        progress.checklist_done === progress.checklist_total 
                                          ? 'bg-success/15 text-success border-success/20' 
                                          : ''
                                      }`}
                                    >
                                      <ClipboardList className="h-3 w-3 mr-1" />
                                      {progress.checklist_done}/{progress.checklist_total}
                                    </Badge>
                                  )}
                                  {progress.evidence_total > 0 && (
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        progress.evidence_done === progress.evidence_total 
                                          ? 'bg-success/15 text-success border-success/20' 
                                          : ''
                                      }`}
                                    >
                                      <Paperclip className="h-3 w-3 mr-1" />
                                      {progress.evidence_done}/{progress.evidence_total}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                            {procedure.assignee && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="hidden sm:inline">{procedure.assignee.full_name}</span>
                              </div>
                            )}
                            {procedure.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(procedure.due_date), 'dd MMM')}</span>
                              </div>
                            )}
                            
                            {/* Open Working Paper button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 gap-1"
                              onClick={() => navigate(`/procedures/${procedure.id}/workpaper`)}
                              title="Open Working Paper"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span className="hidden sm:inline">Working Paper</span>
                            </Button>
                            
                            {/* Evidence count */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 gap-1"
                              onClick={() => {
                                setSelectedProcedureForEvidence(procedure);
                                setEvidenceDialogOpen(true);
                              }}
                              title="View Evidence"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span>{getLinkedEvidence(procedure.id).length}</span>
                            </Button>
                          
                          {/* Approval Actions Menu */}
                          <ApprovalActions
                            stage={procedure.approval_stage || 'draft'}
                            locked={procedure.locked || false}
                            canPrepare={!procedure.locked}
                            canReview={canReview}
                            canApprove={canApprove}
                            canUnlock={canUnlock}
                            canEdit={!procedure.locked}
                            canDelete={role === 'partner' || role === 'manager'}
                            onMarkPrepared={() => markPrepared(procedure.id)}
                            onMarkReviewed={() => markReviewed(procedure.id)}
                            onApprove={() => approveProcedure(procedure.id)}
                            onUnlock={() => {
                              setProcedureToUnlock(procedure);
                              setUnlockDialogOpen(true);
                            }}
                            onEdit={() => handleOpenDialog(undefined, procedure)}
                            onDelete={() => handleDelete(procedure.id)}
                          />
                          
                          {/* Quick complete button (only if not locked) */}
                          {!procedure.locked && procedure.status !== 'completed' && procedure.status !== 'reviewed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMarkComplete(procedure)}
                              title="Mark Complete"
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 gap-2"
                      onClick={() => handleOpenDialog(group.area)}
                    >
                      <Plus className="h-4 w-4" />
                      Add Procedure
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProcedure ? 'Edit Procedure' : 'New Audit Procedure'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Template Selector - only show when creating new */}
            {!editingProcedure && (
              <TemplateSelector
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onSelect={handleTemplateSelect}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Engagement *</Label>
                <Select
                  value={formData.engagement_id}
                  onValueChange={(value) => setFormData({ ...formData, engagement_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements.map((eng) => (
                      <SelectItem key={eng.id} value={eng.id}>
                        {eng.client_name} - {eng.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => setFormData({ ...formData, area: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Procedure Name *</Label>
              <Input
                value={formData.procedure_name}
                onChange={(e) => setFormData({ ...formData, procedure_name: e.target.value })}
                placeholder="e.g., Test revenue cutoff"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the audit procedure..."
                rows={3}
                maxLength={1000}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assertion</Label>
                <Select
                  value={formData.assertion}
                  onValueChange={(value) => setFormData({ ...formData, assertion: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assertion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existence">Existence</SelectItem>
                    <SelectItem value="completeness">Completeness</SelectItem>
                    <SelectItem value="accuracy">Accuracy</SelectItem>
                    <SelectItem value="valuation">Valuation</SelectItem>
                    <SelectItem value="rights">Rights & Obligations</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="cutoff">Cut-off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MultiAssigneeSelect
                members={members}
                selectedIds={selectedAssignees}
                onChange={(ids) => {
                  setSelectedAssignees(ids);
                  // Also update the legacy field with first assignee for backward compat
                  setFormData(prev => ({ ...prev, assigned_to: ids[0] || '' }));
                }}
              />
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Workpaper Reference</Label>
              <Input
                value={formData.workpaper_ref}
                onChange={(e) => setFormData({ ...formData, workpaper_ref: e.target.value })}
                placeholder="e.g., WP-REV-001"
                maxLength={50}
              />
            </div>
            
            {/* Template Workpaper Info - only show when creating from template */}
            {!editingProcedure && selectedTemplateId && (() => {
              const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
              if (!selectedTemplate) return null;
              
              const hasChecklist = (selectedTemplate.checklist_items?.length || 0) > 0;
              const hasEvidence = (selectedTemplate.evidence_requirements?.length || 0) > 0;
              const hasConclusion = !!selectedTemplate.conclusion_prompt;
              
              if (!hasChecklist && !hasEvidence && !hasConclusion) return null;
              
              return (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                    <ChevronDown className="h-4 w-4" />
                    <span>Template includes workpaper fields:</span>
                    {hasChecklist && (
                      <Badge variant="secondary" className="text-xs">
                        Checklist: {selectedTemplate.checklist_items.length}
                      </Badge>
                    )}
                    {hasEvidence && (
                      <Badge variant="secondary" className="text-xs">
                        Evidence: {selectedTemplate.evidence_requirements.length}
                      </Badge>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-dashed space-y-3">
                      {hasChecklist && (
                        <div>
                          <p className="text-xs font-medium mb-1">Checklist ({selectedTemplate.checklist_items.length} items)</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {selectedTemplate.checklist_items.slice(0, 3).map((item, idx) => (
                              <li key={item.id} className="truncate">• {item.text}</li>
                            ))}
                            {selectedTemplate.checklist_items.length > 3 && (
                              <li className="text-xs italic">+ {selectedTemplate.checklist_items.length - 3} more...</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {hasEvidence && (
                        <div>
                          <p className="text-xs font-medium mb-1">Evidence Required ({selectedTemplate.evidence_requirements.length} items)</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {selectedTemplate.evidence_requirements.slice(0, 3).map((item, idx) => (
                              <li key={item.id} className="truncate">• {item.label}</li>
                            ))}
                            {selectedTemplate.evidence_requirements.length > 3 && (
                              <li className="text-xs italic">+ {selectedTemplate.evidence_requirements.length - 3} more...</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {hasConclusion && (
                        <div>
                          <p className="text-xs font-medium mb-1">Conclusion Prompt</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{selectedTemplate.conclusion_prompt}</p>
                        </div>
                      )}
                      <div className="flex items-start gap-1 pt-2 border-t">
                        <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground italic">
                          Templates are illustrative; tailor per engagement using professional judgement.
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.procedure_name.trim() || !formData.area || !formData.engagement_id}
            >
              {editingProcedure ? 'Save Changes' : 'Create Procedure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Dialog */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Procedure Summary
            </DialogTitle>
          </DialogHeader>
          {selectedProcedureForEvidence && (() => {
            const progress = proceduresProgress.get(selectedProcedureForEvidence.id);
            const linkedFiles = getLinkedEvidence(selectedProcedureForEvidence.id);
            
            return (
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="font-medium text-foreground">{selectedProcedureForEvidence.procedure_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedProcedureForEvidence.area}</p>
                </div>
                
                {/* Progress Summary */}
                {progress && (progress.checklist_total > 0 || progress.evidence_total > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium">Checklist</span>
                      </div>
                      <p className="text-xl font-bold">
                        {progress.checklist_done}/{progress.checklist_total}
                      </p>
                      {progress.checklist_required_total > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {progress.checklist_required_done}/{progress.checklist_required_total} required
                        </p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium">Evidence</span>
                      </div>
                      <p className="text-xl font-bold">
                        {progress.evidence_done}/{progress.evidence_total}
                      </p>
                      {progress.evidence_required_total > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {progress.evidence_required_done}/{progress.evidence_required_total} required
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setEvidenceDialogOpen(false);
                      navigate(`/procedures/${selectedProcedureForEvidence.id}/workpaper`);
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                    Open Working Paper
                  </Button>
                </div>
                
                {/* Linked Files Preview */}
                {linkedFiles.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Linked Files ({linkedFiles.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {linkedFiles.slice(0, 5).map((file) => (
                        <div 
                          key={file.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                        >
                          <div className="p-1.5 rounded bg-primary/10">
                            <FileText className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          </div>
                        </div>
                      ))}
                      {linkedFiles.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          + {linkedFiles.length - 5} more files
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEvidenceDialogOpen(false);
                navigate('/evidence');
              }}
            >
              Upload New Evidence
            </Button>
            <Button onClick={() => setEvidenceDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Procedures"
        description="Upload an Excel or CSV file with procedure data. Download the template for the correct format."
        fields={procedureImportFields}
        onImport={handleBulkImport}
        templateData={[
          { area: 'Revenue', procedure_name: 'Test revenue cut-off', description: 'Verify revenue recognition at year end', assertion: 'Cut-off', workpaper_ref: 'A1.1', status: 'not_started' },
          { area: 'Inventory', procedure_name: 'Attend stock count', description: 'Physical verification of inventory', assertion: 'Existence', workpaper_ref: 'B1.1', status: 'not_started' },
        ]}
      />

      {/* Unlock Dialog */}
      <UnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        itemName={procedureToUnlock?.procedure_name || ''}
        onConfirm={async (reason) => {
          if (procedureToUnlock) {
            await unlockProcedure(procedureToUnlock.id, reason);
            setProcedureToUnlock(null);
          }
        }}
      />
    </div>
  );
}
