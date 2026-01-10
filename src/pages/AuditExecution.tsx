import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  Upload,
  Download,
  Paperclip,
  Edit2,
  Trash2,
  Save,
  Building2,
  Calendar,
  User,
  Loader2,
  MessageSquare,
  Search,
  Filter,
  GripVertical,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/contexts/EngagementContext';
import { useClients } from '@/hooks/useClients';
import { useFinancialYears } from '@/hooks/useFinancialYears';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useReviewNotes } from '@/hooks/useReviewNotes';
import { 
  useAuditExecution, 
  useAuditExecutionSections, 
  useWorkingSectionBoxes,
  useAuditExecutionAttachments 
} from '@/hooks/useAuditExecution';
import { WorkingSectionBoxComponent } from '@/components/audit/WorkingSectionBox';
import { useEvidenceFiles } from '@/hooks/useEvidenceFiles';
import { cn } from '@/lib/utils';

export default function AuditExecution() {
  const { user } = useAuth();
  const { currentEngagement } = useEngagement();
  const { clients } = useClients();
  const { financialYears } = useFinancialYears();
  const { members: teamMembers, loading: teamMembersLoading } = useTeamMembers(currentEngagement?.id);
  
  const { programs, loading: programsLoading, createProgram, updateProgram, deleteProgram } = useAuditExecution(currentEngagement?.id || null);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDescription, setNewProgramDescription] = useState('');
  const [newWorkpaperRef, setNewWorkpaperRef] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [addBoxDialogOpen, setAddBoxDialogOpen] = useState(false);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [evidenceAttachmentLevel, setEvidenceAttachmentLevel] = useState<'program' | 'section' | 'box' | null>(null);
  const [evidenceAttachmentId, setEvidenceAttachmentId] = useState<string | null>(null);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [newBoxHeader, setNewBoxHeader] = useState('');
  const [createBoxCallback, setCreateBoxCallback] = useState<((header: string) => Promise<void>) | null>(null);
  const [editProgramDialogOpen, setEditProgramDialogOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editProgramName, setEditProgramName] = useState('');
  const [editWorkpaperRef, setEditWorkpaperRef] = useState('');
  const [editProgramDescription, setEditProgramDescription] = useState('');
  const [editSelectedMemberIds, setEditSelectedMemberIds] = useState<string[]>([]);
  const [programAssignments, setProgramAssignments] = useState<Record<string, string[]>>({});
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedCommentBoxId, setSelectedCommentBoxId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const assignmentStorageKey = currentEngagement?.id
    ? `audit_execution_assignments_${currentEngagement.id}`
    : null;

  const { sections, loading: sectionsLoading, updateSectionName, toggleSectionApplicability } = useAuditExecutionSections(selectedProgramId);
  const { notes: reviewNotes, createNote, updateNote } = useReviewNotes(currentEngagement?.id || undefined);
  const { files: evidenceFiles, loading: evidenceLoading } = useEvidenceFiles(currentEngagement?.id);
  const { attachments, loading: attachmentsLoading, createAttachment, deleteAttachment } = useAuditExecutionAttachments(selectedProgramId);

  useEffect(() => {
    if (!assignmentStorageKey) return;
    const raw = localStorage.getItem(assignmentStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      setProgramAssignments(parsed || {});
    } catch {
      localStorage.removeItem(assignmentStorageKey);
    }
  }, [assignmentStorageKey]);

  useEffect(() => {
    if (!assignmentStorageKey) return;
    localStorage.setItem(assignmentStorageKey, JSON.stringify(programAssignments));
  }, [assignmentStorageKey, programAssignments]);

  useEffect(() => {
    if (programs.length === 0) {
      setSelectedProgramId(null);
      return;
    }
    if (!selectedProgramId || !programs.some((program) => program.id === selectedProgramId)) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  const handleCreateProgram = async () => {
    if (!newProgramName) {
      toast.error('Please enter an execution name');
      return;
    }

    const programId = await createProgram(
      newProgramName,
      newProgramDescription,
      newWorkpaperRef
    );

    if (programId) {
      // Save member assignments for this program
      if (selectedMemberIds.length > 0) {
        setProgramAssignments(prev => ({
          ...prev,
          [programId]: selectedMemberIds,
        }));
      }
      
      setCreateDialogOpen(false);
      setNewProgramName('');
      setNewProgramDescription('');
      setNewWorkpaperRef('');
      setSelectedMemberIds([]);
      setSelectedProgramId(programId);
    }
  };

  const handleUpdateProgram = async () => {
    if (!editingProgramId) return;

    await updateProgram(editingProgramId, {
      name: editProgramName,
      workpaper_reference: editWorkpaperRef,
      description: editProgramDescription,
    });

    setProgramAssignments(prev => ({
      ...prev,
      [editingProgramId]: editSelectedMemberIds,
    }));

    setEditProgramDialogOpen(false);
    setEditingProgramId(null);
    setEditProgramDescription('');
    setEditSelectedMemberIds([]);
  };

  const openEditDialog = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (program) {
      setEditingProgramId(programId);
      setEditProgramName(program.name);
      setEditWorkpaperRef(program.workpaper_reference || '');
      setEditProgramDescription(program.description || '');
      setEditSelectedMemberIds(programAssignments[programId] || []);
      setEditProgramDialogOpen(true);
    }
  };
  const openEvidenceDialog = (level: 'program' | 'section' | 'box', id: string) => {
    setEvidenceAttachmentLevel(level);
    setEvidenceAttachmentId(id);
    setSelectedEvidenceIds([]);
    setEvidenceDialogOpen(true);
  };
  const handleAttachEvidence = async () => {
    if (!user || !selectedProgramId) {
      toast.error('Please sign in and select a program first.');
      return;
    }
    if (!evidenceAttachmentId || selectedEvidenceIds.length === 0) return;

    const attachmentTarget =
      evidenceAttachmentLevel === 'section'
        ? { section_id: evidenceAttachmentId, box_id: null }
        : evidenceAttachmentLevel === 'box'
          ? { section_id: null, box_id: evidenceAttachmentId }
          : { section_id: null, box_id: null };

    const created = await Promise.all(
      selectedEvidenceIds.map((evidenceId) => {
        const evidence = evidenceFiles.find((file) => file.id === evidenceId);
        if (!evidence) return null;
        return createAttachment({
          audit_program_id: selectedProgramId,
          file_name: evidence.name,
          file_type: evidence.file_type,
          file_size: evidence.file_size,
          file_path: evidence.file_path,
          uploaded_by: user.id,
          is_evidence: true,
          ...attachmentTarget,
        });
      })
    );

    const attachedCount = created.filter(Boolean).length;
    if (attachedCount > 0) {
      toast.success(`Attached ${attachedCount} evidence file(s) to ${evidenceAttachmentLevel}.`);
    }
    setEvidenceDialogOpen(false);
    setSelectedEvidenceIds([]);
  };

  const handleDeleteEvidence = async (attachmentId: string) => {
    await deleteAttachment(attachmentId);
  };

  // Comment handling
  const handleOpenCommentDialog = (boxId: string) => {
    setSelectedCommentBoxId(boxId);
    setNewCommentText('');
    setCommentDialogOpen(true);
  };

  const handleAddComment = async () => {
    if (!selectedCommentBoxId || !newCommentText.trim() || !currentEngagement?.id) return;
    
    // Create review note linked to this box via title reference
    await createNote({
      engagement_id: currentEngagement.id,
      title: `Box: ${selectedCommentBoxId}`,
      content: newCommentText,
      priority: 'medium',
      assigned_to: null,
    });
    
    toast.success('Review note added successfully!');
    setNewCommentText('');
    setCommentDialogOpen(false);
  };

  const handleToggleResolveComment = async (noteId: string) => {
    const note = reviewNotes.find(n => n.id === noteId);
    if (!note) return;
    
    const isCleared = note.status === 'cleared';
    await updateNote(noteId, {
      status: isCleared ? 'open' : 'cleared',
      resolved_at: isCleared ? null : new Date().toISOString(),
      resolved_by: isCleared ? null : user?.id,
    });
    
    toast.success('Review note status updated!');
  };

  // Box status tracking for overall completion
  const [boxStatusMap, setBoxStatusMap] = useState<Record<string, { total: number; complete: number }>>({});

  // Update box status map when sections change
  const updateBoxStatusForSection = (sectionId: string, total: number, complete: number) => {
    setBoxStatusMap(prev => ({
      ...prev,
      [sectionId]: { total, complete }
    }));
  };

  // Calculate overall completion from all sections
  const calculateOverallCompletion = () => {
    const totals = Object.values(boxStatusMap);
    if (totals.length === 0) return { total: 0, complete: 0, percentage: 0 };
    
    const total = totals.reduce((sum, s) => sum + s.total, 0);
    const complete = totals.reduce((sum, s) => sum + s.complete, 0);
    const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;
    
    return { total, complete, percentage };
  };

  const overallCompletion = calculateOverallCompletion();

  // Listen for comment dialog events
  useEffect(() => {
    const handler = (e: any) => {
      handleOpenCommentDialog(e.detail.boxId);
    };
    window.addEventListener('open-comment-dialog', handler);
    return () => window.removeEventListener('open-comment-dialog', handler);
  }, []);

  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const selectedClient = clients.find(c => c.id === currentEngagement?.client_id);
  const selectedYear = financialYears.find(
    (year) =>
      year.year_code === currentEngagement?.financial_year ||
      year.display_name === currentEngagement?.financial_year
  );
  const financialYearDisplay = selectedYear?.display_name || currentEngagement?.financial_year || 'N/A';
  const programAttachments = attachments.filter(
    (attachment) => !attachment.section_id && !attachment.box_id
  );

  if (!currentEngagement) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No Engagement Selected</h3>
          <p className="text-sm text-muted-foreground">
            Please select an engagement to view audit executions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Execution</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive working paper sections for financial statement areas
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Execution
        </Button>
      </div>

      {/* Program List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {programsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardHeader>
            </Card>
          ))
        ) : programs.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No audit executions yet. Create your first execution to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          programs.map((program) => {
            // Programs are now linked via engagement only
            const client = selectedClient;
            const year = selectedYear;
            
            return (
              <Card 
                key={program.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedProgramId === program.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedProgramId(program.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base">{program.name}</CardTitle>
                      {program.workpaper_reference && (
                        <p className="text-xs text-muted-foreground">
                          WP Ref: {program.workpaper_reference}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{program.status}</Badge>
                  </div>
                  <div className="space-y-2 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      <span>{client?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{year?.display_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>Created {format(new Date(program.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(program.id);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this program?')) {
                          deleteProgram(program.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Program Details */}
      {selectedProgramId && selectedProgram && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedProgram.name}</CardTitle>
                <CardDescription className="mt-2 space-y-1">
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <strong>Client:</strong> {selectedClient?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <strong>FY:</strong> {selectedYear?.display_name}
                    </span>
                    {selectedProgram.workpaper_reference && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <strong>WP Ref:</strong> {selectedProgram.workpaper_reference}
                      </span>
                    )}
                    {currentEngagement?.engagement_type && (
                      <span><strong>Type:</strong> {currentEngagement.engagement_type}</span>
                    )}
                  </div>
                  {selectedProgram.description && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedProgram.description}</p>
                  )}
                  {/* Show assigned members */}
                  {programAssignments[selectedProgram.id]?.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">Team:</span>
                      {programAssignments[selectedProgram.id].map(memberId => {
                        const member = teamMembers.find(m => m.user_id === memberId);
                        return member ? (
                          <Badge key={member.user_id} variant="secondary" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {member.full_name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  {/* Show attached evidence */}
                  {programAttachments.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium mb-1 block">Attached Evidence:</span>
                      <div className="flex flex-wrap gap-2">
                        {programAttachments.map((attachment) => (
                          <Badge key={attachment.id} variant="outline" className="text-xs flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {attachment.file_name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvidence(attachment.id);
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEvidenceDialog('program', selectedProgramId)}
                  className="relative"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach Evidence
                  {programAttachments.length > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1" variant="secondary">
                      {programAttachments.length}
                    </Badge>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Bar */}
            <div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex gap-3 flex-wrap items-center">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sections and boxes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not-commenced">Not Commenced</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Expand/Collapse All */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const allSectionIds = sections?.map(s => s.id) || [];
                      window.dispatchEvent(new CustomEvent('expand-all-sections', { detail: { sectionIds: allSectionIds } }));
                    }}
                  >
                    Expand All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('collapse-all-sections'));
                    }}
                  >
                    Collapse All
                  </Button>
                </div>
              </div>
              
              
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Completion</span>
                  <span className="text-muted-foreground">
                    {overallCompletion.complete} / {overallCompletion.total} boxes ({overallCompletion.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${overallCompletion.percentage}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            
            <ProgramSections
              programId={selectedProgramId}
              sections={sections}
              loading={sectionsLoading}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              boxStatusMap={boxStatusMap}
              onAddBox={(sectionId, createBoxFn) => {
                setSelectedSectionId(sectionId);
                setCreateBoxCallback(() => createBoxFn);
                setAddBoxDialogOpen(true);
              }}
              onAttachEvidence={openEvidenceDialog}
              attachments={attachments}
              onDeleteEvidence={handleDeleteEvidence}
              onBoxStatusUpdate={updateBoxStatusForSection}
              updateSectionName={updateSectionName}
              toggleSectionApplicability={toggleSectionApplicability}
              reviewNotes={reviewNotes}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Program Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Audit Execution</DialogTitle>
            <DialogDescription>
              Create a comprehensive working paper execution for your engagement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Show Engagement Info */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Engagement Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <p className="font-medium">{selectedClient?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Financial Year:</span>
                  <p className="font-medium">{financialYearDisplay}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Engagement:</span>
                  <p className="font-medium">{currentEngagement?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Area:</span>
                  <p className="font-medium">{currentEngagement?.engagement_type || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div>
              <Label>Execution Name *</Label>
              <Input
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                placeholder="e.g., FY 2024-25 Audit Program"
              />
            </div>
            <div>
              <Label>Workpaper Reference</Label>
              <Input
                value={newWorkpaperRef}
                onChange={(e) => setNewWorkpaperRef(e.target.value)}
                placeholder="e.g., WP-001, AP-2024-01"
              />
            </div>

            {/* Assign Team Members */}
            <div>
              <Label>Assign Team Members</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select team members who will work on this audit program
              </p>
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-3">
                {teamMembersLoading ? (
                  <div className="text-xs text-muted-foreground">Loading team members...</div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No team members assigned to this engagement yet.
                  </div>
                ) : (
                  teamMembers.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.user_id);

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => {
                          setSelectedMemberIds(prev =>
                            isSelected
                              ? prev.filter(id => id !== member.user_id)
                              : [...prev, member.user_id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="h-4 w-4"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newProgramDescription}
                onChange={(e) => setNewProgramDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProgram}>
              Create Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={editProgramDialogOpen} onOpenChange={setEditProgramDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Execution Name</Label>
              <Input
                value={editProgramName}
                onChange={(e) => setEditProgramName(e.target.value)}
              />
            </div>
            <div>
              <Label>Workpaper Reference</Label>
              <Input
                value={editWorkpaperRef}
                onChange={(e) => setEditWorkpaperRef(e.target.value)}
                placeholder="e.g., WP-001"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editProgramDescription}
                onChange={(e) => setEditProgramDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div>
              <Label>Assign Team Members</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select team members who will work on this audit program
              </p>
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-3">
                {teamMembersLoading ? (
                  <div className="text-xs text-muted-foreground">Loading team members...</div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No team members assigned to this engagement yet.
                  </div>
                ) : (
                  teamMembers.map((member) => {
                    const isSelected = editSelectedMemberIds.includes(member.user_id);

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => {
                          setEditSelectedMemberIds(prev =>
                            isSelected
                              ? prev.filter(id => id !== member.user_id)
                              : [...prev, member.user_id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="h-4 w-4"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProgramDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProgram}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Box Dialog */}
      <Dialog open={addBoxDialogOpen} onOpenChange={setAddBoxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Box</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Box Header</Label>
            <Input
              value={newBoxHeader}
              onChange={(e) => setNewBoxHeader(e.target.value)}
              placeholder="e.g., Additional Procedures"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBoxDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedSectionId || !newBoxHeader.trim()) {
                  toast.error('Please enter a box header');
                  return;
                }
                if (createBoxCallback) {
                  await createBoxCallback(newBoxHeader);
                  toast.success('Box added successfully.');
                }
                setAddBoxDialogOpen(false);
                setNewBoxHeader('');
                setCreateBoxCallback(null);
              }}
            >
              Add Box
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Attachment Dialog */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attach Evidence from Vault</DialogTitle>
            <DialogDescription>
              Select evidence files to attach to this {evidenceAttachmentLevel} or upload new files
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Upload New Evidence */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Upload New Evidence</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // In demo mode, just show a message
                      toast.success(`File "${file.name}" queued for upload to Evidence Vault.`);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info('In real mode, this would open the Evidence Vault upload dialog');
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Go to Vault
                </Button>
              </div>
            </div>
            {evidenceLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : evidenceFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No evidence files in vault</p>
                <p className="text-sm mt-1">Upload files in Evidence Vault first</p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {evidenceFiles.map((file) => {
                  const isSelected = selectedEvidenceIds.includes(file.id);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedEvidenceIds(prev =>
                          isSelected
                            ? prev.filter(id => id !== file.id)
                            : [...prev, file.id]
                        );
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{file.file_type}</span>
                            <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                            {file.workpaper_ref && <span>WP: {file.workpaper_ref}</span>}
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-4 w-4"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                {selectedEvidenceIds.length} file(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAttachEvidence}
                  disabled={selectedEvidenceIds.length === 0}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach {selectedEvidenceIds.length > 0 && `(${selectedEvidenceIds.length})`}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Notes & Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing Comments */}
            {selectedCommentBoxId && reviewNotes.filter(note => note.title.includes(selectedCommentBoxId)).length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {reviewNotes
                  .filter(note => note.title.includes(selectedCommentBoxId))
                  .map(note => {
                    const authorName = teamMembers.find((member) => member.user_id === note.created_by)?.full_name || 'Unknown';
                    return (
                      <div key={note.id} className={cn("p-3 border rounded-lg", note.status === 'cleared' && "opacity-60 bg-muted")}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{authorName}</span>
                              <span className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString()}</span>
                              {note.status === 'cleared' && (
                                <Badge variant="outline" className="text-xs">Cleared</Badge>
                              )}
                              <Badge variant="outline" className="text-xs capitalize">{note.priority}</Badge>
                            </div>
                            <p className="text-sm">{note.content}</p>
                            {note.response && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <span className="font-medium">Response: </span>
                                {note.response}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleResolveComment(note.id)}
                          >
                            {note.status === 'cleared' ? 'Reopen' : 'Clear'}
                          </Button>
                        </div>
                      </div>
                    );
                })}
              </div>
            )}
            
            {/* New Comment Input */}
            <div className="space-y-2">
              <Label>Add Comment</Label>
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Type your review comment here..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddComment} disabled={!newCommentText.trim()}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Program Sections Component
interface ProgramSectionsProps {
  programId: string;
  sections: any[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  boxStatusMap: Record<string, { total: number; complete: number }>;
  onAddBox: (sectionId: string, createBoxFn: (header: string) => Promise<void>) => void;
  onAttachEvidence: (level: 'program' | 'section' | 'box', id: string) => void;
  attachments: any[];
  onDeleteEvidence: (attachmentId: string) => void;
  onBoxStatusUpdate: (sectionId: string, total: number, complete: number) => void;
  updateSectionName: (sectionId: string, newName: string) => void;
  toggleSectionApplicability: (sectionId: string) => void;
  reviewNotes: any[];
}

function ProgramSections({ 
  programId, 
  sections, 
  loading,
  searchQuery,
  statusFilter,
  boxStatusMap,
  onAddBox,
  onAttachEvidence,
  attachments,
  onDeleteEvidence,
  onBoxStatusUpdate,
  updateSectionName,
  toggleSectionApplicability,
  reviewNotes,
}: ProgramSectionsProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editedSectionName, setEditedSectionName] = useState('');

  // Listen for expand/collapse all events
  useEffect(() => {
    const handleExpandAll = (e: any) => {
      setExpandedSections(e.detail.sectionIds);
    };
    const handleCollapseAll = () => {
      setExpandedSections([]);
    };
    
    window.addEventListener('expand-all-sections', handleExpandAll);
    window.addEventListener('collapse-all-sections', handleCollapseAll);
    
    return () => {
      window.removeEventListener('expand-all-sections', handleExpandAll);
      window.removeEventListener('collapse-all-sections', handleCollapseAll);
    };
  }, []);

  const handleStartEdit = (section: any) => {
    setEditingSectionId(section.id);
    setEditedSectionName(section.name);
  };

  const handleSaveEdit = (sectionId: string) => {
    if (editedSectionName.trim()) {
      updateSectionName(sectionId, editedSectionName.trim());
      setEditingSectionId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingSectionId(null);
    setEditedSectionName('');
  };

  // Filter sections based on search query and status
  const filteredSections = sections.filter(section => {
    // Status filter
    if (statusFilter !== 'all' && section.status !== statusFilter) {
      return false;
    }
    
    // Search filter - match section name
    if (searchQuery && !section.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card className="p-4">
      <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections}>
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sections match your search criteria
          </div>
        ) : (
          filteredSections.map((section, index) => {
          // Check if section name matches search (if so, show all boxes)
          const sectionMatchesSearch = !searchQuery || section.name.toLowerCase().includes(searchQuery.toLowerCase());
          const sectionAttachments = attachments.filter(
            (attachment) => attachment.section_id === section.id && !attachment.box_id
          );
          
          return (
            <AccordionItem 
              key={section.id} 
              value={section.id} 
              className="border-b"
            >
              <AccordionTrigger 
                className={cn(
                  "text-sm font-semibold hover:no-underline py-2",
                  !section.is_applicable && "opacity-50 cursor-not-allowed"
                )}
                onClick={(e) => {
                  if (!section.is_applicable) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <div className="flex flex-col gap-1 w-full pr-4">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Numbering */}
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      
                      {/* Applicability Toggle - More prominent */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 w-28 p-0 flex-shrink-0 text-xs font-semibold transition-all",
                          section.is_applicable 
                            ? "border-green-600 bg-green-500 text-white hover:bg-green-600 shadow-sm" 
                            : "border-red-600 bg-red-500 text-white hover:bg-red-600 shadow-sm"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSectionApplicability(section.id);
                        }}
                        title={section.is_applicable ? "Applicable - Click to mark N/A" : "Not Applicable - Click to mark Applicable"}
                      >
                        {section.is_applicable ? (
                          <><Check className="h-4 w-4 mr-1.5 stroke-[3]" /> Applicable</>
                        ) : (
                          <><X className="h-4 w-4 mr-1.5 stroke-[3]" /> N/A</>
                        )}
                      </Button>
                      
                      {/* Section Name - Editable and left-aligned */}
                      {editingSectionId === section.id ? (
                        <Input
                          value={editedSectionName}
                          onChange={(e) => setEditedSectionName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(section.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                      ) : (
                        <span className={cn(
                          "flex-1 text-left truncate",
                          !section.is_applicable && "opacity-50 line-through"
                        )}>
                          {section.name}
                          {!section.is_applicable && (
                            <span className="ml-2 text-xs text-muted-foreground italic">(Not accessible - marked N/A)</span>
                          )}
                        </span>
                      )}
                      {/* Edit/Save Buttons */}
                      {editingSectionId === section.id ? (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSaveEdit(section.id);
                            }}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStartEdit(section);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      
                      {section.locked && (
                        <Badge variant="outline" className="text-xs text-gray-600">
                          Locked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {sectionAttachments.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {sectionAttachments.length}
                        </Badge>
                      )}
                    </div>
                  </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {/* Section Progress Bar - Only show when expanded */}
              {boxStatusMap[section.id] && expandedSections.includes(section.id) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-4">
                  <span>{boxStatusMap[section.id].complete}/{boxStatusMap[section.id].total} boxes</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[200px]">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${boxStatusMap[section.id].total > 0 ? (boxStatusMap[section.id].complete / boxStatusMap[section.id].total * 100) : 0}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              <SectionContent 
                sectionId={section.id} 
                onAddBox={onAddBox} 
                onAttachEvidence={onAttachEvidence}
                attachments={attachments}
                onDeleteEvidence={onDeleteEvidence}
                onBoxStatusUpdate={onBoxStatusUpdate}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                sectionMatchesSearch={sectionMatchesSearch}
                reviewNotes={reviewNotes}
              />
            </AccordionContent>
          </AccordionItem>
        );
        })
      )}
    </Accordion>
    </Card>
  );
}

interface SectionContentProps {
  sectionId: string;
  onAddBox: (sectionId: string, createBoxFn: (header: string) => Promise<void>) => void;
  onAttachEvidence: (level: 'program' | 'section' | 'box', id: string) => void;
  attachments: any[];
  onDeleteEvidence: (attachmentId: string) => void;
  onBoxStatusUpdate: (sectionId: string, total: number, complete: number) => void;
  searchQuery: string;
  statusFilter: string;
  sectionMatchesSearch: boolean;
  reviewNotes: any[];
}

function SectionContent({ sectionId, onAddBox, onAttachEvidence, attachments, onDeleteEvidence, onBoxStatusUpdate, searchQuery, statusFilter, sectionMatchesSearch, reviewNotes }: SectionContentProps) {
  const { boxes, loading, updateBox, deleteBox, createBox, updateBoxStatus, toggleBoxLock, reorderBoxes, moveBoxUp, moveBoxDown } = useWorkingSectionBoxes(sectionId);
  const [addingBox, setAddingBox] = useState(false);
  const [newHeader, setNewHeader] = useState('');
  const [draggingBoxId, setDraggingBoxId] = useState<string | null>(null);

  // Memoize box props to avoid recreating objects on every render
  const getMemoizedBox = useMemo(() => {
    const boxMap = new Map();
    boxes.forEach(box => {
      boxMap.set(box.id, { 
        ...box, 
        comment_count: reviewNotes.filter(note => note.title.includes(box.id)).length 
      });
    });
    return (boxId: string) => boxMap.get(boxId);
  }, [boxes, reviewNotes]);

  // Update parent component whenever box statuses change
  useEffect(() => {
    const total = boxes.length;
    const complete = boxes.filter(b => b.status === 'complete').length;
    onBoxStatusUpdate(sectionId, total, complete);
  }, [boxes, sectionId, onBoxStatusUpdate]);

  // Filter boxes based on search and status
  const filteredBoxes = boxes.filter(box => {
    // Status filter (always apply)
    if (statusFilter !== 'all' && box.status !== statusFilter) {
      return false;
    }
    
    // Search filter - if section name matched, show ALL boxes (skip box-level search)
    if (searchQuery && !sectionMatchesSearch) {
      const query = searchQuery.toLowerCase();
      const matchesHeader = box.header.toLowerCase().includes(query);
      const matchesContent = box.content.toLowerCase().includes(query);
      if (!matchesHeader && !matchesContent) {
        return false;
      }
    }
    
    return true;
  });

  const handleCommentClick = (boxId: string) => {
    // This will be handled by parent component
    window.dispatchEvent(new CustomEvent('open-comment-dialog', { detail: { boxId } }));
  };

  const handleAddBox = async () => {
    if (!newHeader.trim()) {
      toast.error('Please enter a header name');
      return;
    }
    await createBox(newHeader);
    setNewHeader('');
    setAddingBox(false);
  };

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const getBoxAttachmentCount = (boxId: string) => {
    return attachments.filter((attachment) => attachment.box_id === boxId).length;
  };

  const sectionAttachments = attachments.filter(
    (attachment) => attachment.section_id === sectionId && !attachment.box_id
  );

  return (
    <div className="space-y-2 pt-2">
      {/* Section Evidence */}
      {sectionAttachments.length > 0 && (
        <div className="mb-4 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Section Evidence:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAttachEvidence('section', sectionId)}
              className="h-7 text-xs"
            >
              <Paperclip className="h-3 w-3 mr-1" />
              Add More
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sectionAttachments.map((attachment) => (
              <Badge key={attachment.id} variant="outline" className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {attachment.file_name}
                <button
                  onClick={() => onDeleteEvidence(attachment.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {filteredBoxes.length === 0 && searchQuery && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No boxes match your search in this section
        </div>
      )}

      {filteredBoxes.map((box, index) => {
        const boxAttachments = attachments.filter((attachment) => attachment.box_id === box.id);
        return (
          <div
            key={box.id}
            onDragOver={(e) => {
              if (draggingBoxId && draggingBoxId !== box.id) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromId = draggingBoxId || e.dataTransfer.getData('text/plain');
              if (fromId && fromId !== box.id) {
                reorderBoxes(fromId, box.id);
              }
              setDraggingBoxId(null);
            }}
            className="group relative"
          >
            {!box.locked && (
              <div
                className="absolute -left-6 top-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                draggable
                onDragStart={(e) => {
                  setDraggingBoxId(box.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', box.id);
                }}
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <WorkingSectionBoxComponent
              box={getMemoizedBox(box.id)}
              onUpdate={updateBox}
              onDelete={deleteBox}
              onAttach={() => onAttachEvidence('box', box.id)}
              onStatusChange={updateBoxStatus}
              onToggleLock={toggleBoxLock}
              onCommentClick={handleCommentClick}
              attachmentCount={getBoxAttachmentCount(box.id)}
              onMoveUp={moveBoxUp}
              onMoveDown={moveBoxDown}
              isFirst={index === 0}
              isLast={index === filteredBoxes.length - 1}
            />
            {/* Show attached evidence for this box */}
            {boxAttachments.length > 0 && (
              <div className="ml-4 mb-4 p-2 border-l-2 border-primary/30 bg-muted/20">
                <span className="text-xs font-medium">Box Evidence:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {boxAttachments.map((attachment) => (
                    <Badge key={attachment.id} variant="outline" className="text-xs flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {attachment.file_name}
                      <button
                        onClick={() => onDeleteEvidence(attachment.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {addingBox ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>New Box Header</Label>
              <Input
                value={newHeader}
                onChange={(e) => setNewHeader(e.target.value)}
                placeholder="Enter header name"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddBox} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Button onClick={() => setAddingBox(false)} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingBox(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Box
        </Button>
      )}
    </div>
  );
}

