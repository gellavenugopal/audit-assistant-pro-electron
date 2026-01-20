import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ExcelJS from 'exceljs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  Eye,
  Building2,
  Calendar,
  User,
  Loader2,
  MessageSquare,
  Search,
  Filter,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getSQLiteClient } from '@/integrations/sqlite/client';

const db = getSQLiteClient();
import { useNavigate } from 'react-router-dom';
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
import { AuditExecutionBox, BoxStatus, DEFAULT_BOX_HEADERS, DEFAULT_SECTION_NAMES, LEGACY_BOX_HEADER_MAP, LEGACY_SECTION_NAME_MAP } from '@/types/auditExecution';
import { cn } from '@/lib/utils';

const normalizeHeader = (value: string) =>
  LEGACY_BOX_HEADER_MAP[value.trim()] ?? value.trim();
const normalizeSectionName = (value: string) =>
  LEGACY_SECTION_NAME_MAP[value.trim()] ?? value.trim();
const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

type SectionBoxMetrics = {
  total: number;
  complete: number;
  statusCounts: Record<BoxStatus, number>;
  filteredCount: number;
};

const EMPTY_STATUS_COUNTS: Record<BoxStatus, number> = {
  'not-commenced': 0,
  'in-progress': 0,
  review: 0,
  complete: 0,
};

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
  const [evidenceAttachmentSectionId, setEvidenceAttachmentSectionId] = useState<string | null>(null);
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
  const [programView, setProgramView] = useState<'list' | 'cards'>('list');
  const [showExecutionList, setShowExecutionList] = useState(true);
  const [showProgramDetails, setShowProgramDetails] = useState(false);
  const [importing, setImporting] = useState(false);
  const [evidenceUploadType, setEvidenceUploadType] = useState('document');
  const [evidenceUploadRef, setEvidenceUploadRef] = useState('');
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<File[]>([]);
  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const assignmentStorageKey = currentEngagement?.id
    ? `audit_execution_assignments_${currentEngagement.id}`
    : null;
  const syncInProgressRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const {
    sections,
    loading: sectionsLoading,
    updateSectionName,
    toggleSectionApplicability,
    swapSectionOrder,
    createSection,
    deleteSection,
    refetch: refetchSections,
  } = useAuditExecutionSections(selectedProgramId);
  const { notes: reviewNotes, createNote, updateNote, deleteNote } = useReviewNotes(currentEngagement?.id || undefined);
  const {
    files: evidenceFiles,
    loading: evidenceLoading,
    uploadFile,
    deleteFile,
    refetch: refetchEvidence,
  } = useEvidenceFiles(currentEngagement?.id);
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

  useEffect(() => {
    setShowProgramDetails(false);
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedProgramId || sectionsLoading) return;
    if (syncInProgressRef.current) return;

    const templateNames = DEFAULT_SECTION_NAMES.map((name) => name.trim());
    const templateLookup = new Map(
      templateNames.map((name) => [name.toLowerCase(), name])
    );
    const groupedTemplates = new Map<string, (typeof sections)[number][]>();
    const extraSections: (typeof sections)[number][] = [];

    const syncKey = `audit_execution_template_synced_${selectedProgramId}`;
    const syncVersion = 'v3';
    const isCleaned = localStorage.getItem(syncKey) === syncVersion;

    sections.forEach((section) => {
      const normalizedName = normalizeSectionName(section.name).trim();
      const templateName = templateLookup.get(normalizedName.toLowerCase());
      if (templateName) {
        const group = groupedTemplates.get(templateName) || [];
        group.push(section);
        groupedTemplates.set(templateName, group);
      } else {
        extraSections.push(section);
      }
    });

    const duplicateGroups = Array.from(groupedTemplates.entries()).filter(
      ([, list]) => list.length > 1
    );
    const missingTemplates = templateNames.filter(
      (name) => !groupedTemplates.has(name)
    );

    const shouldRun =
      duplicateGroups.length > 0 ||
      (!isCleaned && (missingTemplates.length > 0 || extraSections.length > 0));

    if (!shouldRun) {
      if (!isCleaned) {
        localStorage.setItem(syncKey, syncVersion);
      }
      return;
    }

    const syncTemplateSections = async () => {
      syncInProgressRef.current = true;
      try {
        if (!user) {
          toast.error('Please sign in to sync audit execution sections.');
          return;
        }

        const primaryByTemplate = new Map<string, (typeof sections)[number]>();
        const sectionsToDelete: string[] = [];

        const deleteSectionDirect = async (sectionId: string) => {
          const { data: boxes, error: boxFetchError } = await supabase
            .from('audit_program_boxes')
            .select('id')
            .eq('section_id', sectionId);

          if (boxFetchError) throw boxFetchError;

          const boxIds = (boxes || []).map((box) => box.id);

          if (boxIds.length > 0) {
            const { error: boxAttachmentError } = await supabase
              .from('audit_program_attachments')
              .delete()
              .in('box_id', boxIds);
            if (boxAttachmentError) throw boxAttachmentError;
          }

          const { error: sectionAttachmentError } = await supabase
            .from('audit_program_attachments')
            .delete()
            .eq('section_id', sectionId);
          if (sectionAttachmentError) throw sectionAttachmentError;

          const { error: boxDeleteError } = await supabase
            .from('audit_program_boxes')
            .delete()
            .eq('section_id', sectionId);
          if (boxDeleteError) throw boxDeleteError;

          const { error: sectionDeleteError } = await supabase
            .from('audit_program_sections')
            .delete()
            .eq('id', sectionId);
          if (sectionDeleteError) throw sectionDeleteError;
        };

        if (duplicateGroups.length > 0) {
          const duplicateIds = duplicateGroups.flatMap(([, list]) =>
            list.map((section) => section.id)
          );
          const { data: boxes, error } = await supabase
            .from('audit_program_boxes')
            .select('*')
            .in('section_id', duplicateIds);

          if (error) throw error;

          const boxesBySection = new Map<string, any[]>();
          (boxes || []).forEach((box) => {
            const list = boxesBySection.get(box.section_id) || [];
            list.push(box);
            boxesBySection.set(box.section_id, list);
          });

          for (const [templateName, list] of duplicateGroups) {
            const scored = list.map((section) => {
              const sectionBoxes = boxesBySection.get(section.id) || [];
              const score = sectionBoxes.filter(
                (box) => String(box.content || '').trim() !== ''
              ).length;
              return { section, score };
            });

            scored.sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              return a.section.order - b.section.order;
            });

            const primary = scored[0].section;
            primaryByTemplate.set(templateName, primary);

            const primaryBoxes = boxesBySection.get(primary.id) || [];
            const primaryByHeader = new Map<string, any>();
            primaryBoxes.forEach((box) => {
              primaryByHeader.set(normalizeHeader(box.header), box);
            });

            const duplicates = scored.slice(1).map((item) => item.section);
            for (const duplicate of duplicates) {
              const duplicateBoxes = boxesBySection.get(duplicate.id) || [];
              for (const box of duplicateBoxes) {
                const normalizedHeader = normalizeHeader(box.header);
                const targetBox = primaryByHeader.get(normalizedHeader);
                const targetContent = String(targetBox?.content || '').trim();
                const sourceContent = String(box.content || '').trim();
                if (targetBox && !targetContent && sourceContent) {
                  const { error: updateError } = await supabase
                    .from('audit_program_boxes')
                    .update({ content: box.content })
                    .eq('id', targetBox.id);
                  if (updateError) throw updateError;
                }
              }
              sectionsToDelete.push(duplicate.id);
            }
          }
        }

        groupedTemplates.forEach((list, templateName) => {
          if (!primaryByTemplate.has(templateName)) {
            primaryByTemplate.set(templateName, list[0]);
          }
        });

        if (!isCleaned) {
          for (const section of extraSections) {
            await deleteSectionDirect(section.id);
          }
        }

        for (const sectionId of sectionsToDelete) {
          await deleteSectionDirect(sectionId);
        }

        if (!isCleaned) {
          let nextOrder =
            sections.length > 0
              ? Math.max(...sections.map((section) => section.order)) + 1
              : 0;

          for (const templateName of missingTemplates) {
            const order = isCleaned
              ? nextOrder++
              : DEFAULT_SECTION_NAMES.indexOf(templateName);

            const { data: newSection, error: sectionError } = await supabase
              .from('audit_program_sections')
              .insert({
                audit_program_id: selectedProgramId,
                name: templateName,
                order,
                is_expanded: false,
                is_applicable: true,
                locked: false,
                status: 'not-commenced',
              })
              .select('id')
              .single();

            if (sectionError) throw sectionError;

            const boxesToInsert = DEFAULT_BOX_HEADERS.map((header, orderIndex) => ({
              section_id: newSection.id,
              header,
              content: '',
              order: orderIndex,
              status: 'not-commenced',
              locked: false,
              created_by: user.id,
            }));

            const { error: boxesError } = await supabase
              .from('audit_program_boxes')
              .insert(boxesToInsert);
            if (boxesError) throw boxesError;
          }
        }

        for (let index = 0; index < DEFAULT_SECTION_NAMES.length; index += 1) {
          const templateName = DEFAULT_SECTION_NAMES[index];
          const existingSection = primaryByTemplate.get(templateName);
          if (!existingSection) continue;

          const updates: { name?: string; order?: number } = {};
          if (existingSection.name !== templateName) {
            updates.name = templateName;
          }
          if (!isCleaned && existingSection.order !== index) {
            updates.order = index;
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('audit_program_sections')
              .update(updates)
              .eq('id', existingSection.id);
            if (updateError) throw updateError;
          }
        }

        await refetchSections();
        localStorage.setItem(syncKey, syncVersion);
      } catch (error) {
        console.error('Error syncing audit execution sections:', error);
        toast.error('Failed to sync section list to ICAI template.');
      } finally {
        syncInProgressRef.current = false;
      }
    };

    syncTemplateSections();
  }, [selectedProgramId, sections, sectionsLoading, user, refetchSections]);

  const refreshSectionMetrics = useCallback(async () => {
    if (!selectedProgramId || sections.length === 0) {
      setBoxStatusMap({});
      return;
    }

    const sectionIds = sections.map((section) => section.id);
    const normalizedSearch = searchQuery.trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from('audit_program_boxes')
        .select('section_id,status,header,content')
        .in('section_id', sectionIds);

      if (error) throw error;

      const nextMap: Record<string, SectionBoxMetrics> = {};
      sectionIds.forEach((sectionId) => {
        nextMap[sectionId] = {
          total: 0,
          complete: 0,
          statusCounts: { ...EMPTY_STATUS_COUNTS },
          filteredCount: 0,
        };
      });

      (data || []).forEach((box) => {
        const sectionId = box.section_id as string;
        const metrics = nextMap[sectionId];
        if (!metrics) return;

        const rawStatus = (box.status as BoxStatus) || 'not-commenced';
        const status = Object.prototype.hasOwnProperty.call(EMPTY_STATUS_COUNTS, rawStatus)
          ? rawStatus
          : 'not-commenced';
        metrics.total += 1;
        metrics.statusCounts[status] = (metrics.statusCounts[status] || 0) + 1;
        if (status === 'complete') {
          metrics.complete += 1;
        }

        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        if (!matchesStatus) return;

        if (!normalizedSearch) {
          metrics.filteredCount += 1;
          return;
        }

        const headerMatch = normalizeHeader(String(box.header || ''))
          .toLowerCase()
          .includes(normalizedSearch);
        const contentMatch = stripHtml(String(box.content || ''))
          .toLowerCase()
          .includes(normalizedSearch);
        if (headerMatch || contentMatch) {
          metrics.filteredCount += 1;
        }
      });

      setBoxStatusMap(nextMap);
    } catch (error) {
      console.error('Error refreshing section metrics:', error);
    }
  }, [selectedProgramId, sections, searchQuery, statusFilter]);

  useEffect(() => {
    if (!selectedProgramId) return;
    const delay = searchQuery.trim() ? 250 : 0;
    const timer = setTimeout(() => {
      refreshSectionMetrics();
    }, delay);
    return () => clearTimeout(timer);
  }, [selectedProgramId, sections.length, searchQuery, statusFilter, refreshSectionMetrics]);

  useEffect(() => {
    const handler = () => refreshSectionMetrics();
    window.addEventListener('refresh-audit-execution-metrics', handler);
    return () => window.removeEventListener('refresh-audit-execution-metrics', handler);
  }, [refreshSectionMetrics]);

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
  const openEvidenceDialog = (level: 'program' | 'section' | 'box', id: string, sectionId?: string) => {
    setEvidenceAttachmentLevel(level);
    setEvidenceAttachmentId(id);
    setEvidenceAttachmentSectionId(
      level === 'box' ? sectionId ?? null : level === 'section' ? id : null
    );
    setSelectedEvidenceIds([]);
    setEvidenceUploadType('document');
    setEvidenceUploadRef(selectedProgram?.workpaper_reference || '');
    setPendingEvidenceFiles([]);
    setEvidenceDialogOpen(true);
  };
  const handleAttachEvidence = async () => {
    if (!user || !selectedProgramId) {
      toast.error('Please sign in and select a program first.');
      return;
    }
    if (!evidenceAttachmentId || !evidenceAttachmentLevel) return;
    if (selectedEvidenceIds.length === 0 && pendingEvidenceFiles.length === 0) return;

    if (evidenceAttachmentLevel === 'box' && !evidenceAttachmentSectionId) {
      toast.error('Unable to attach evidence: missing box context.');
      return;
    }

    const attachmentTarget =
      evidenceAttachmentLevel === 'section'
        ? { section_id: evidenceAttachmentId, box_id: null }
        : evidenceAttachmentLevel === 'box'
          ? { section_id: evidenceAttachmentSectionId, box_id: evidenceAttachmentId }
          : { section_id: null, box_id: null };

    setEvidenceUploading(true);
    try {
      const uploadedEvidence: typeof evidenceFiles = [];
      for (const file of pendingEvidenceFiles) {
        const uploaded = await uploadFile(file, {
          name: file.name,
          file_type: evidenceUploadType,
          workpaper_ref: evidenceUploadRef || undefined,
        });
        if (uploaded?.id) {
          uploadedEvidence.push(uploaded);
        }
      }

      if (uploadedEvidence.length > 0) {
        await refetchEvidence();
      }

      const allEvidenceIds = Array.from(
        new Set([...selectedEvidenceIds, ...uploadedEvidence.map((item) => item.id)])
      );
      const evidenceLookup = new Map(
        [...evidenceFiles, ...uploadedEvidence].map((file) => [file.id, file])
      );
      const created = await Promise.all(
        allEvidenceIds.map((evidenceId) => {
          const evidence = evidenceLookup.get(evidenceId);
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
      setPendingEvidenceFiles([]);
    } finally {
      setEvidenceUploading(false);
    }
  };

  const handleDeleteEvidence = async (attachment: { id: string; file_path: string }) => {
    if (!confirm('Delete this attachment? The file will be removed from the vault if it is not used elsewhere.')) {
      return;
    }

    await deleteAttachment(attachment.id);

    try {
      const { data: remainingAttachments, error } = await supabase
        .from('audit_program_attachments')
        .select('id')
        .eq('file_path', attachment.file_path)
        .limit(1);

      if (error) throw error;

      if (!remainingAttachments || remainingAttachments.length === 0) {
        const evidence = evidenceFiles.find((file) => file.file_path === attachment.file_path);
        if (evidence) {
          await deleteFile(evidence);
        }
      }
    } catch (error) {
      console.error('Error checking evidence usage:', error);
    }
  };

  const handleOpenAttachment = async (attachment: { file_path: string; file_name: string }) => {
    try {
      // Storage signed URLs not available in SQLite
      // Files are stored locally, use direct file path
      toast.warning('File access needs to be implemented for SQLite storage');
      // const { data, error } = await storage
      //   .from('evidence')
      //   .createSignedUrl(attachment.file_path, 3600);
      const data = null;
      const error = new Error('Storage signed URLs not available in SQLite');
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening evidence file:', error);
      toast.error('Failed to open evidence file.');
    }
  };

  const handleQueueEvidence = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingEvidenceFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleQuickAttachBoxEvidence = async (
    boxId: string,
    sectionId: string,
    files: FileList | null
  ) => {
    if (!user || !selectedProgramId) {
      toast.error('Please sign in and select a program first.');
      return;
    }
    if (!files || files.length === 0) return;
    if (!sectionId) {
      toast.error('Unable to attach evidence: missing box context.');
      return;
    }

    const uploadFiles = Array.from(files);
    setEvidenceUploading(true);
    try {
      const uploadedEvidence = [];
      for (const file of uploadFiles) {
        const uploaded = await uploadFile(file, {
          name: file.name,
          file_type: 'document',
          workpaper_ref: selectedProgram?.workpaper_reference || undefined,
        });
        if (uploaded?.id) {
          uploadedEvidence.push(uploaded);
        }
      }

      if (uploadedEvidence.length === 0) {
        toast.error('No files were uploaded. Please try again.');
        return;
      }

      const created = await Promise.all(
        uploadedEvidence.map((evidence) =>
          createAttachment({
            audit_program_id: selectedProgramId,
            section_id: sectionId,
            box_id: boxId,
            file_name: evidence.name,
            file_type: evidence.file_type,
            file_size: evidence.file_size,
            file_path: evidence.file_path,
            uploaded_by: user.id,
            is_evidence: true,
          })
        )
      );

      const attachedCount = created.filter(Boolean).length;
      if (attachedCount > 0) {
        toast.success(`Attached ${attachedCount} file(s) to the box.`);
      } else {
        toast.error('Failed to attach uploaded files. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading evidence from box:', error);
      toast.error('Failed to upload evidence. Please try again.');
    } finally {
      setEvidenceUploading(false);
    }
  };

  const handleAddSection = async () => {
    const name = newSectionName.trim();
    if (!name) {
      toast.error('Please enter a line item name.');
      return;
    }

    const normalizedName = normalizeSectionName(name).trim().toLowerCase();
    const hasDuplicate = sections.some((section) => {
      const existing = normalizeSectionName(section.name).trim().toLowerCase();
      return existing === normalizedName;
    });

    if (hasDuplicate) {
      toast.error('A line item with this name already exists.');
      return;
    }

    const createdId = await createSection(name);
    if (createdId) {
      setAddSectionDialogOpen(false);
      setNewSectionName('');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection(sectionId);
  };

  const bulkDeleteSections = useCallback(
    async (sectionIds: string[]) => {
      if (sectionIds.length === 0) return;

      try {
        const { data: boxes, error: boxFetchError } = await supabase
          .from('audit_program_boxes')
          .select('id')
          .in('section_id', sectionIds);

        if (boxFetchError) throw boxFetchError;

        const boxIds = (boxes || []).map((box) => box.id);

        const attachmentDeletes = [];
        if (boxIds.length > 0) {
          attachmentDeletes.push(
            supabase
              .from('audit_program_attachments')
              .delete()
              .in('box_id', boxIds)
          );
        }
        attachmentDeletes.push(
          supabase
            .from('audit_program_attachments')
            .delete()
            .in('section_id', sectionIds)
        );

        const attachmentResults = await Promise.all(attachmentDeletes);
        attachmentResults.forEach(({ error }) => {
          if (error) throw error;
        });

        const { error: boxDeleteError } = await supabase
          .from('audit_program_boxes')
          .delete()
          .in('section_id', sectionIds);
        if (boxDeleteError) throw boxDeleteError;

        const { error: sectionDeleteError } = await supabase
          .from('audit_program_sections')
          .delete()
          .in('id', sectionIds);
        if (sectionDeleteError) throw sectionDeleteError;

        await refetchSections();
        toast.success(`Deleted ${sectionIds.length} line item(s).`);
      } catch (error) {
        console.error('Error deleting selected line items:', error);
        toast.error('Failed to delete selected line items.');
      }
    },
    [refetchSections]
  );

  const statusFilterLabels: Record<string, string> = {
    all: 'All Status',
    'not-commenced': 'Not Commenced',
    'in-progress': 'In Progress',
    review: 'Under Review',
    complete: 'Complete',
  };

  const handleExportBox = async (
    box: AuditExecutionBox,
    sectionName: string,
    format: 'excel' | 'word'
  ) => {
    if (!selectedProgramId || !selectedProgram) {
      toast.error('Select an audit execution to export.');
      return;
    }

    const clientName = selectedClient?.name || 'Client';
    const financialYear = selectedYear?.display_name || financialYearDisplay;
    const engagementType = currentEngagement?.engagement_type || 'Audit';
    const programName = selectedProgram.name;
    const workpaperRef = selectedProgram.workpaper_reference || '';
    const boxHeader = normalizeHeader(box.header);
    const contentText = stripHtml(String(box.content || '')).trim();
    const contentValue = contentText || 'No content provided.';
    const statusLabel = statusFilterLabels[box.status] || box.status;
    const fileSafeName = `${programName}_${sectionName}_${boxHeader}`
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_');

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Box Export');
      const totalColumns = 4;
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } } as const;

      worksheet.columns = [
        { width: 28 },
        { width: 28 },
        { width: 28 },
        { width: 28 },
      ];

      const addMergedRow = (rowIndex: number, text: string, font?: ExcelJS.Font) => {
        worksheet.mergeCells(rowIndex, 1, rowIndex, totalColumns);
        const cell = worksheet.getCell(rowIndex, 1);
        cell.value = text;
        cell.font = font;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      };

      addMergedRow(1, clientName, { bold: true, color: { argb: 'C00000' }, size: 12 });
      addMergedRow(2, `${engagementType} for FY ${financialYear}`, { bold: true, size: 11 });
      addMergedRow(3, `Execution: ${programName}`, { size: 10 });
      addMergedRow(4, `Line Item: ${sectionName}`, { size: 10 });
      if (workpaperRef) {
        addMergedRow(5, `Workpaper Ref: ${workpaperRef}`, { size: 10 });
      }
      addMergedRow(6, `Box Status: ${statusLabel}`, { size: 10 });

      const startRow = workpaperRef ? 8 : 7;
      worksheet.mergeCells(startRow, 1, startRow, totalColumns);
      const headerCell = worksheet.getCell(startRow, 1);
      headerCell.value = boxHeader;
      headerCell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      headerCell.fill = headerFill;
      headerCell.alignment = { vertical: 'middle', horizontal: 'left' };
      headerCell.border = {
        top: { style: 'thin', color: { argb: '4B5563' } },
        left: { style: 'thin', color: { argb: '4B5563' } },
        bottom: { style: 'thin', color: { argb: '4B5563' } },
        right: { style: 'thin', color: { argb: '4B5563' } },
      };

      const contentRow = startRow + 1;
      worksheet.mergeCells(contentRow, 1, contentRow + 4, totalColumns);
      const contentCell = worksheet.getCell(contentRow, 1);
      contentCell.value = contentValue;
      contentCell.alignment = { vertical: 'top', wrapText: true };
      contentCell.border = {
        top: { style: 'thin', color: { argb: '4B5563' } },
        left: { style: 'thin', color: { argb: '4B5563' } },
        bottom: { style: 'thin', color: { argb: '4B5563' } },
        right: { style: 'thin', color: { argb: '4B5563' } },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileSafeName}_box_export.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      return;
    }

    const tableBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '4B5563' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '4B5563' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '4B5563' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '4B5563' },
    };

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: clientName,
                  bold: true,
                  color: 'C00000',
                  size: 24,
                }),
              ],
            }),
            new Paragraph(`${engagementType} for FY ${financialYear}`),
            new Paragraph(`Execution: ${programName}`),
            new Paragraph(`Line Item: ${sectionName}`),
            ...(workpaperRef ? [new Paragraph(`Workpaper Ref: ${workpaperRef}`)] : []),
            new Paragraph(`Box Status: ${statusLabel}`),
            new Paragraph(''),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      borders: tableBorders,
                      shading: { type: ShadingType.SOLID, color: '1F4E79' },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: boxHeader,
                              color: 'FFFFFF',
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      borders: tableBorders,
                      children: [new Paragraph(contentValue)],
                    }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileSafeName}_box_export.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!selectedProgramId) {
      toast.error('Select an audit execution to export.');
      return;
    }
    if (orderedSections.length === 0) {
      toast.error('No sections available to export.');
      return;
    }

    try {
      const sectionIds = orderedSections.map((section) => section.id);
      const { data: boxes, error } = await supabase
        .from('audit_program_boxes')
        .select('*')
        .in('section_id', sectionIds)
        .order('order', { ascending: true });

      if (error) throw error;

      const normalizedSearch = searchQuery.trim().toLowerCase();
      const sectionsMatchingSearch = new Set<string>();
      if (normalizedSearch) {
        orderedSections.forEach((section) => {
          const displayName = DEFAULT_SECTION_NAMES.includes(
            normalizeSectionName(section.name)
          )
            ? normalizeSectionName(section.name)
            : section.name;
          if (displayName.toLowerCase().includes(normalizedSearch)) {
            sectionsMatchingSearch.add(section.id);
          }
        });
      }

      const boxLookup = new Map<string, Record<string, string>>();
      const filteredCountBySection = new Map<string, number>();
      (boxes || []).forEach((box) => {
        if (statusFilter !== 'all' && box.status !== statusFilter) return;

        if (normalizedSearch && !sectionsMatchingSearch.has(box.section_id)) {
          const matchesHeader = normalizeHeader(box.header)
            .toLowerCase()
            .includes(normalizedSearch);
          const matchesContent = stripHtml(String(box.content || ''))
            .toLowerCase()
            .includes(normalizedSearch);
          if (!matchesHeader && !matchesContent) return;
        }

        const normalizedHeader = normalizeHeader(box.header);
        if (!DEFAULT_BOX_HEADERS.includes(normalizedHeader)) return;

        const sectionEntry = boxLookup.get(box.section_id) || {};
        sectionEntry[normalizedHeader] = stripHtml(String(box.content || ''));
        boxLookup.set(box.section_id, sectionEntry);
        filteredCountBySection.set(
          box.section_id,
          (filteredCountBySection.get(box.section_id) || 0) + 1
        );
      });

      const sectionsToExport = orderedSections.filter((section) => {
        if (!normalizedSearch && statusFilter === 'all') return true;
        const count = filteredCountBySection.get(section.id) || 0;
        return count > 0;
      });

      if (sectionsToExport.length === 0) {
        toast.error('No line items match the current filters.');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Audit Execution');
      const columnCount = DEFAULT_BOX_HEADERS.length + 1;

      worksheet.mergeCells(1, 1, 1, columnCount);
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = 'Audit Execution Export';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const detailsRows: Array<[string, string]> = [
        ['Execution Name', selectedProgram?.name || 'N/A'],
        ['Client', selectedClient?.name || 'N/A'],
        ['Financial Year', selectedYear?.display_name || financialYearDisplay],
        ['Engagement', currentEngagement?.name || 'N/A'],
        ['Engagement Type', currentEngagement?.engagement_type || 'N/A'],
        ['Workpaper Reference', selectedProgram?.workpaper_reference || 'N/A'],
        ['Status Filter', statusFilterLabels[statusFilter] || statusFilter],
        ['Search Query', searchQuery || ''],
      ];

      detailsRows.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value]);
        row.getCell(1).font = { bold: true };
      });

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Section', ...DEFAULT_BOX_HEADERS]);
      headerRow.font = { bold: true, color: { argb: 'FF1D4ED8' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F0FF' },
      };

      sectionsToExport.forEach((section) => {
        const sectionBoxes = boxLookup.get(section.id) || {};
        const exportSectionName = DEFAULT_SECTION_NAMES.includes(
          normalizeSectionName(section.name)
        )
          ? normalizeSectionName(section.name)
          : section.name;
        worksheet.addRow([
          exportSectionName,
          ...DEFAULT_BOX_HEADERS.map((header) => sectionBoxes[header] || ''),
        ]);
      });

      const tableStart = headerRow.number;
      const tableEnd = worksheet.rowCount;
      for (let rowIndex = tableStart; rowIndex <= tableEnd; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });
      }

      worksheet.columns.forEach((column) => {
        let maxLength = 10;
        column.eachCell?.({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value ? String(cell.value) : '';
          maxLength = Math.max(maxLength, cellValue.length);
          cell.alignment = { wrapText: true, vertical: 'top' };
        });
        column.width = Math.min(maxLength + 2, 60);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (selectedProgram?.name || 'Audit_Execution')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '');
      link.href = url;
      link.download = `${safeName || 'Audit_Execution'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Audit execution exported.');
    } catch (error) {
      console.error('Error exporting audit execution:', error);
      toast.error('Failed to export audit execution.');
    }
  };

  const handleDownloadImportTemplate = async () => {
    if (!selectedProgramId) {
      toast.error('Select an audit execution to download a template.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Audit Execution');
      const columnCount = DEFAULT_BOX_HEADERS.length + 1;

      worksheet.mergeCells(1, 1, 1, columnCount);
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = 'Audit Execution Import Template';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const detailsRows: Array<[string, string]> = [
        ['Execution Name', selectedProgram?.name || 'N/A'],
        ['Client', selectedClient?.name || 'N/A'],
        ['Financial Year', selectedYear?.display_name || financialYearDisplay],
        ['Engagement', currentEngagement?.name || 'N/A'],
        ['Engagement Type', currentEngagement?.engagement_type || 'N/A'],
        ['Workpaper Reference', selectedProgram?.workpaper_reference || 'N/A'],
      ];

      detailsRows.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value]);
        row.getCell(1).font = { bold: true };
      });

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Section', ...DEFAULT_BOX_HEADERS]);
      headerRow.font = { bold: true, color: { argb: 'FF1D4ED8' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F0FF' },
      };

      orderedSections.forEach((section) => {
        const exportSectionName = DEFAULT_SECTION_NAMES.includes(
          normalizeSectionName(section.name)
        )
          ? normalizeSectionName(section.name)
          : section.name;
        worksheet.addRow([exportSectionName, ...DEFAULT_BOX_HEADERS.map(() => '')]);
      });

      const templateTableStart = headerRow.number;
      const templateTableEnd = worksheet.rowCount;
      for (let rowIndex = templateTableStart; rowIndex <= templateTableEnd; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });
      }

      worksheet.columns.forEach((column) => {
        column.width = 32;
        column.alignment = { wrapText: true, vertical: 'top' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (selectedProgram?.name || 'Audit_Execution_Template')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '');
      link.href = url;
      link.download = `${safeName || 'Audit_Execution_Template'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Import template downloaded.');
    } catch (error) {
      console.error('Error creating import template:', error);
      toast.error('Failed to generate import template.');
    }
  };

  const handleImportFile = async (file: File) => {
    if (!selectedProgramId) {
      toast.error('Select an audit execution to import.');
      return;
    }
    const userId = user?.id;
    if (!userId) {
      toast.error('Please sign in to import audit execution data.');
      return;
    }

    setImporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast.error('No worksheet found in the file.');
        return;
      }

      let headerRowIndex = 0;
      worksheet.eachRow((row, rowNumber) => {
        const firstCell = String(row.getCell(1).value || '').trim().toLowerCase();
        if (firstCell === 'section') {
          headerRowIndex = rowNumber;
        }
      });

      if (!headerRowIndex) {
        toast.error('Template header not found. Download the template and try again.');
        return;
      }

      const headerRow = worksheet.getRow(headerRowIndex);
      const headerMap = new Map<string, number>();
      headerRow.eachCell((cell, colNumber) => {
        const label = String(cell.value || '').trim().toLowerCase();
        if (label) headerMap.set(label, colNumber);
      });

      const missingHeaders = DEFAULT_BOX_HEADERS.filter(
        (header) => !headerMap.has(header.toLowerCase())
      );
      if (!headerMap.has('section') || missingHeaders.length > 0) {
        toast.error('The import file does not match the template format.');
        return;
      }

      const sectionMap = new Map<string, string>();
      orderedSections.forEach((section) => {
        sectionMap.set(
          normalizeSectionName(section.name).trim().toLowerCase(),
          section.id
        );
      });

      const rowsToImport: Array<{
        sectionId: string;
        values: Record<string, string>;
      }> = [];

      for (let rowIndex = headerRowIndex + 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        const rawSectionName = String(
          row.getCell(headerMap.get('section') || 1).value || ''
        ).trim();
        if (!rawSectionName) continue;

        const normalizedName = normalizeSectionName(rawSectionName).trim().toLowerCase();
        let sectionId = sectionMap.get(normalizedName);
        if (!sectionId) {
          const createdId = await createSection(rawSectionName);
          if (!createdId) continue;
          sectionId = createdId;
          sectionMap.set(normalizedName, createdId);
        }

        const values: Record<string, string> = {};
        DEFAULT_BOX_HEADERS.forEach((header) => {
          const colIndex = headerMap.get(header.toLowerCase());
          const cellValue = colIndex ? row.getCell(colIndex).value : '';
          values[header] = cellValue ? String(cellValue).trim() : '';
        });

        rowsToImport.push({ sectionId, values });
      }

      if (rowsToImport.length === 0) {
        toast.error('No line items found to import.');
        return;
      }

      const targetSectionIds = Array.from(new Set(rowsToImport.map((row) => row.sectionId)));
      const { data: existingBoxes, error: boxError } = await supabase
        .from('audit_program_boxes')
        .select('*')
        .in('section_id', targetSectionIds);

      if (boxError) throw boxError;

      const boxMap = new Map<string, { id: string; order: number }>();
      const sectionBoxCounts = new Map<string, number>();
      (existingBoxes || []).forEach((box) => {
        const key = `${box.section_id}:${normalizeHeader(box.header)}`;
        boxMap.set(key, { id: box.id, order: box.order });
        sectionBoxCounts.set(
          box.section_id,
          Math.max(sectionBoxCounts.get(box.section_id) || 0, box.order + 1)
        );
      });

      const updatePromises: Promise<any>[] = [];
      const createPayload: any[] = [];

      rowsToImport.forEach((row) => {
        DEFAULT_BOX_HEADERS.forEach((header) => {
          const content = row.values[header] || '';
          const key = `${row.sectionId}:${header}`;
          const existing = boxMap.get(key);
          if (existing) {
            updatePromises.push(
              supabase
                .from('audit_program_boxes')
                .update({ content })
                .eq('id', existing.id)
            );
          } else {
            const nextOrder = sectionBoxCounts.get(row.sectionId) || 0;
            sectionBoxCounts.set(row.sectionId, nextOrder + 1);
            createPayload.push({
              section_id: row.sectionId,
              header,
              content,
              order: nextOrder,
              status: 'not-commenced',
              locked: false,
              created_by: userId,
            });
          }
        });
      });

      await Promise.all(updatePromises);
      if (createPayload.length > 0) {
        const { error: createError } = await supabase
          .from('audit_program_boxes')
          .insert(createPayload);
        if (createError) throw createError;
      }

      await refetchSections();
      window.dispatchEvent(new CustomEvent('refresh-audit-execution-boxes'));
      toast.success('Import completed successfully.');
    } catch (error) {
      console.error('Error importing audit execution:', error);
      toast.error('Failed to import audit execution.');
    } finally {
      setImporting(false);
    }
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

  const handleDeleteComment = async (noteId: string) => {
    if (!confirm('Delete this review note?')) return;
    await deleteNote(noteId);
  };

  // Box status tracking for overall completion
  const [boxStatusMap, setBoxStatusMap] = useState<Record<string, SectionBoxMetrics>>({});

  // Update box status map when sections change
  const updateBoxStatusForSection = (sectionId: string, metrics: SectionBoxMetrics) => {
    setBoxStatusMap(prev => ({
      ...prev,
      [sectionId]: metrics,
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
  const attachmentPathsForTarget = useMemo(() => {
    if (!evidenceAttachmentLevel) {
      return new Set<string>();
    }
    if (evidenceAttachmentLevel !== 'program' && !evidenceAttachmentId) {
      return new Set<string>();
    }

    const scoped = attachments.filter((attachment) => {
      if (evidenceAttachmentLevel === 'program') {
        return !attachment.section_id && !attachment.box_id;
      }
      if (evidenceAttachmentLevel === 'section') {
        return attachment.section_id === evidenceAttachmentId && !attachment.box_id;
      }
      return attachment.box_id === evidenceAttachmentId;
    });

    return new Set(scoped.map((attachment) => attachment.file_path));
  }, [attachments, evidenceAttachmentId, evidenceAttachmentLevel]);
  const orderedSections = useMemo(() => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const templateLookup = new Map(
      DEFAULT_SECTION_NAMES.map((name) => [name.toLowerCase(), name])
    );
    const seenTemplate = new Set<string>();
    const seenExtra = new Set<string>();
    const result: typeof sections = [];

    sorted.forEach((section) => {
      const normalizedName = normalizeSectionName(section.name).trim();
      const templateName = templateLookup.get(normalizedName.toLowerCase());
      if (templateName) {
        if (seenTemplate.has(templateName)) return;
        seenTemplate.add(templateName);
        result.push(section);
        return;
      }

      const extraKey = normalizedName.toLowerCase();
      if (seenExtra.has(extraKey)) return;
      seenExtra.add(extraKey);
      result.push(section);
    });

    return result;
  }, [sections]);

  const summaryStats = useMemo(() => {
    const totalSections = orderedSections.length;
    const totalBoxes = overallCompletion.total;
    const completeBoxes = overallCompletion.complete;
    const remainingBoxes = Math.max(totalBoxes - completeBoxes, 0);

    return {
      totalSections,
      totalBoxes,
      completeBoxes,
      remainingBoxes,
      completion: overallCompletion.percentage,
    };
  }, [orderedSections.length, overallCompletion.complete, overallCompletion.total, overallCompletion.percentage]);

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
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Audit Execution</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive working paper sections for financial statement areas
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Execution
        </Button>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <Card className="p-3 relative z-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Executions</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowExecutionList((prev) => !prev)}
                aria-label={showExecutionList ? 'Collapse execution list' : 'Expand execution list'}
              >
                {showExecutionList ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={programView}
                onValueChange={(value) => {
                  if (value) setProgramView(value as 'list' | 'cards');
                }}
              >
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="cards" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {showExecutionList && (
            <div className="mt-3 max-h-[220px] overflow-y-auto pr-1">
            {programsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </div>
                ))}
              </div>
            ) : programs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No audit executions yet. Create your first execution to get started.
                  </p>
                </CardContent>
              </Card>
              ) : programView === 'list' ? (
                <div className="space-y-1">
                  {programs.map((program) => {
                    const client = selectedClient;
                    const year = selectedYear;
                  const isSelected = selectedProgramId === program.id;

                  return (
                    <div
                      key={program.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition hover:bg-muted/40',
                        isSelected && 'border-primary/60 bg-primary/5 shadow-sm'
                      )}
                      onClick={() => setSelectedProgramId(program.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedProgramId(program.id);
                        }
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{program.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {program.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {client?.name || 'N/A'} - {year?.display_name || 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(program.id);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this program?')) {
                              deleteProgram(program.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {programs.map((program) => {
                  const client = selectedClient;
                  const year = selectedYear;
                  const isSelected = selectedProgramId === program.id;

                  return (
                    <div
                      key={program.id}
                      className={cn(
                        'cursor-pointer rounded-lg border bg-card p-3 transition hover:shadow-sm',
                        isSelected && 'border-2 border-primary/60 shadow-sm'
                      )}
                      onClick={() => setSelectedProgramId(program.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold truncate">{program.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {client?.name || 'N/A'} - {year?.display_name || 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {program.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-2">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </Card>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {selectedProgramId && selectedProgram ? (
            <div className="rounded-lg border bg-card relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="sticky top-0 z-50 border-b bg-card shadow-sm isolate">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">{selectedProgram.name}</h2>
                        <Badge variant="outline" className="text-xs">
                          {selectedProgram.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedClient?.name || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {selectedYear?.display_name || financialYearDisplay}
                        </span>
                        {currentEngagement?.engagement_type && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {currentEngagement.engagement_type}
                          </span>
                        )}
                        {selectedProgram.workpaper_reference && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            WP Ref: {selectedProgram.workpaper_reference}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadImportTemplate}>
                        <FileText className="h-4 w-4 mr-2" />
                        Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => importInputRef.current?.click()}
                        disabled={importing}
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Import
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowProgramDetails((prev) => !prev)}
                      >
                        {showProgramDetails ? (
                          <ChevronUp className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        {showProgramDetails ? 'Hide Details' : 'Details'}
                      </Button>
                      <input
                        ref={importInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            handleImportFile(file);
                          }
                          event.target.value = '';
                        }}
                      />
                    </div>
                  </div>

                  {showProgramDetails && (
                    <div className="border-t px-4 py-3 space-y-2">
                      {selectedProgram.description && (
                        <p className="text-xs text-muted-foreground">{selectedProgram.description}</p>
                      )}
                      {programAssignments[selectedProgram.id]?.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">Team:</span>
                          {programAssignments[selectedProgram.id].map((memberId) => {
                            const member = teamMembers.find((m) => m.user_id === memberId);
                            return member ? (
                              <Badge key={member.user_id} variant="secondary" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                {member.full_name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      {programAttachments.length > 0 && (
                        <div>
                          <span className="text-xs font-medium mb-1 block">Attached Evidence:</span>
                          <div className="flex flex-wrap gap-2">
                            {programAttachments.map((attachment) => (
                              <Badge key={attachment.id} variant="outline" className="text-xs flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {attachment.file_name}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAttachment(attachment);
                                  }}
                                  className="ml-1 hover:text-primary"
                                  title="Open evidence"
                                >
                                  <Eye className="h-3 w-3" />
                                </button>
                                <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvidence(attachment);
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
                    </div>
                  )}

                  <div className="border-t px-4 py-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[220px]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search sections and boxes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9"
                          />
                        </div>
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-[170px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="not-commenced">Not Commenced</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="review">Under Review</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allSectionIds = orderedSections.map((section) => section.id);
                            window.dispatchEvent(
                              new CustomEvent('expand-all-sections', { detail: { sectionIds: allSectionIds } })
                            );
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
                        <Button variant="outline" size="sm" onClick={() => setAddSectionDialogOpen(true)}>
                          Add Line Item
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        Sections: {summaryStats.totalSections}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Boxes: {summaryStats.totalBoxes}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Completed: {summaryStats.completeBoxes}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Remaining: {summaryStats.remainingBoxes}
                      </Badge>
                      <div className="flex items-center gap-2 ml-auto">
                        <span>
                          {overallCompletion.complete}/{overallCompletion.total} boxes
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${overallCompletion.percentage}%` }}
                          />
                        </div>
                        <span>{summaryStats.completion}%</span>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <div className="p-4">
                  <ProgramSections
                    programId={selectedProgramId}
                    sections={orderedSections}
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
                    onUploadBoxEvidence={handleQuickAttachBoxEvidence}
                    attachments={attachments}
                    onDeleteEvidence={handleDeleteEvidence}
                    onOpenEvidence={handleOpenAttachment}
                    onBoxStatusUpdate={updateBoxStatusForSection}
                    onExportBox={handleExportBox}
                    updateSectionName={updateSectionName}
                    toggleSectionApplicability={toggleSectionApplicability}
                    onSwapSectionOrder={swapSectionOrder}
                    onDeleteSection={(sectionId) => handleDeleteSection(sectionId)}
                    onBulkDeleteSections={bulkDeleteSections}
                    reviewNotes={reviewNotes}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Card className="flex-1">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select an audit execution to view and manage its working papers.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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

      {/* Add Line Item Dialog */}
      <Dialog open={addSectionDialogOpen} onOpenChange={setAddSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>
              Add an additional line item after the standard 24 sections.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Line Item Name</Label>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., Grants or Other Items"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSection}>Add Line Item</Button>
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
      <Dialog
        open={evidenceDialogOpen}
        onOpenChange={(open) => {
          setEvidenceDialogOpen(open);
          if (!open) {
            setSelectedEvidenceIds([]);
            setPendingEvidenceFiles([]);
            setEvidenceAttachmentSectionId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attach Evidence from Vault</DialogTitle>
          <DialogDescription>
              Select evidence files to attach to this {evidenceAttachmentLevel} or queue new files to upload on attach
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Upload New Evidence */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Add New Evidence Files</Label>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    multiple
                    onChange={(e) => {
                      handleQueueEvidence(e.target.files);
                      e.currentTarget.value = '';
                    }}
                    className="flex-1"
                    disabled={evidenceUploading}
                  />
                  <Button
                    variant="outline"
                    onClick={() => navigate('/evidence')}
                    disabled={evidenceUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Go to Vault
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Evidence Type</Label>
                    <Select value={evidenceUploadType} onValueChange={setEvidenceUploadType}>
                      <SelectTrigger className="h-8">
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
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Workpaper Reference</Label>
                    <Input
                      value={evidenceUploadRef}
                      onChange={(e) => setEvidenceUploadRef(e.target.value)}
                      placeholder="e.g., WP-001"
                      className="h-8"
                    />
                  </div>
                </div>
                {pendingEvidenceFiles.length > 0 && (
                  <div className="rounded-md border bg-background/70 p-2 text-xs">
                    <div className="mb-1 text-muted-foreground">
                      {pendingEvidenceFiles.length} file(s) queued for upload on attach
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {pendingEvidenceFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setPendingEvidenceFiles((prev) =>
                                prev.filter((_, idx) => idx !== index)
                              );
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {evidenceUploading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading and attaching evidence...
                  </div>
                )}
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
                  const alreadyAttached = attachmentPathsForTarget.has(file.file_path);
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
                      <div className="flex items-center gap-2">
                        {alreadyAttached && (
                          <Badge variant="secondary" className="text-[10px]">
                            Attached
                          </Badge>
                        )}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                {selectedEvidenceIds.length + pendingEvidenceFiles.length} file(s) ready to attach
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAttachEvidence}
                  disabled={(selectedEvidenceIds.length === 0 && pendingEvidenceFiles.length === 0) || evidenceUploading}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach {(selectedEvidenceIds.length + pendingEvidenceFiles.length) > 0 && `(${selectedEvidenceIds.length + pendingEvidenceFiles.length})`}
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
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleResolveComment(note.id)}
                            >
                              {note.status === 'cleared' ? 'Reopen' : 'Clear'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteComment(note.id)}
                            >
                              Delete
                            </Button>
                          </div>
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
  boxStatusMap: Record<string, SectionBoxMetrics>;
  onAddBox: (sectionId: string, createBoxFn: (header: string) => Promise<void>) => void;
  onAttachEvidence: (level: 'program' | 'section' | 'box', id: string, sectionId?: string) => void;
  onUploadBoxEvidence?: (boxId: string, sectionId: string, files: FileList | null) => void;
  attachments: any[];
  onDeleteEvidence: (attachment: { id: string; file_path: string }) => void;
  onOpenEvidence: (attachment: { file_path: string; file_name: string }) => void;
  onBoxStatusUpdate: (sectionId: string, metrics: SectionBoxMetrics) => void;
  onExportBox?: (box: AuditExecutionBox, sectionName: string, format: 'excel' | 'word') => void;
  updateSectionName: (sectionId: string, newName: string) => void;
  toggleSectionApplicability: (sectionId: string) => void;
  onSwapSectionOrder: (firstSectionId: string, secondSectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onBulkDeleteSections?: (sectionIds: string[]) => Promise<void>;
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
  onUploadBoxEvidence,
  attachments,
  onDeleteEvidence,
  onOpenEvidence,
  onBoxStatusUpdate,
  onExportBox,
  updateSectionName,
  toggleSectionApplicability,
  onSwapSectionOrder,
  onDeleteSection,
  onBulkDeleteSections,
  reviewNotes,
}: ProgramSectionsProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editedSectionName, setEditedSectionName] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [pendingDeletionIds, setPendingDeletionIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedSectionIds([]);
    setExpandedSections([]);
    setPendingDeletionIds([]);
  }, [programId]);

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
    setEditedSectionName(normalizeSectionName(section.name));
  };

  const handleSaveEdit = (sectionId: string) => {
    const nextName = editedSectionName.trim();
    if (!nextName) {
      toast.error('Please enter a line item name.');
      return;
    }

    const normalizedNext = normalizeSectionName(nextName).trim().toLowerCase();
    const hasDuplicate = sections.some((section) => {
      if (section.id === sectionId) return false;
      return normalizeSectionName(section.name).trim().toLowerCase() === normalizedNext;
    });

    if (hasDuplicate) {
      toast.error('A line item with this name already exists.');
      return;
    }

    updateSectionName(sectionId, nextName);
    setEditingSectionId(null);
  };

  const handleCancelEdit = () => {
    setEditingSectionId(null);
    setEditedSectionName('');
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const pendingDeletionSet = useMemo(
    () => new Set(pendingDeletionIds),
    [pendingDeletionIds]
  );

  // Filter sections based on search query and box status
  const filteredSections = sections.filter((section) => {
    if (pendingDeletionSet.has(section.id)) {
      return false;
    }
    const displayName = DEFAULT_SECTION_NAMES.includes(
      normalizeSectionName(section.name)
    )
      ? normalizeSectionName(section.name)
      : section.name;
    const sectionMatchesSearch =
      normalizedSearch && displayName.toLowerCase().includes(normalizedSearch);

    if (!normalizedSearch && statusFilter === 'all') {
      return true;
    }

    const metrics = boxStatusMap[section.id];
    if (!metrics) {
      if (!normalizedSearch && statusFilter === 'all') {
        return true;
      }
      return false;
    }

    if (statusFilter !== 'all') {
      const count = metrics.statusCounts[statusFilter as BoxStatus] || 0;
      if (count === 0) return false;
    }

    if (normalizedSearch) {
      return sectionMatchesSearch || metrics.filteredCount > 0;
    }

    return metrics.filteredCount > 0;
  });

  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  const visibleSectionIds = filteredSections.map((section) => section.id);
  const allVisibleSelected =
    visibleSectionIds.length > 0 &&
    visibleSectionIds.every((id) => selectedSectionIds.includes(id));

  const toggleSectionSelection = (sectionId: string, checked: boolean | string) => {
    const isChecked = checked === true || checked === 'indeterminate';
    setSelectedSectionIds((prev) => {
      if (isChecked) {
        return prev.includes(sectionId) ? prev : [...prev, sectionId];
      }
      return prev.filter((id) => id !== sectionId);
    });
  };

  const handleToggleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true || checked === 'indeterminate';
    setSelectedSectionIds((prev) => {
      if (isChecked) {
        const merged = new Set([...prev, ...visibleSectionIds]);
        return Array.from(merged);
      }
      return prev.filter((id) => !visibleSectionIds.includes(id));
    });
  };

  const handleBulkDelete = async () => {
    if (selectedSectionIds.length === 0) return;
    if (!confirm(`Delete ${selectedSectionIds.length} selected line item(s)? This will remove their boxes and evidence.`)) {
      return;
    }

    const idsToDelete = [...selectedSectionIds];
    setSelectedSectionIds([]);
    setExpandedSections((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    setPendingDeletionIds((prev) => Array.from(new Set([...prev, ...idsToDelete])));

    try {
      if (onBulkDeleteSections) {
        await onBulkDeleteSections(idsToDelete);
      } else {
        for (const sectionId of idsToDelete) {
          await onDeleteSection(sectionId);
        }
      }
    } finally {
      setPendingDeletionIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    }
  };

  return (
    <div className="space-y-2">
      {filteredSections.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={handleToggleSelectAll}
              aria-label="Select all visible line items"
            />
            <span className="text-muted-foreground">
              {selectedSectionIds.length > 0
                ? `${selectedSectionIds.length} selected`
                : 'Select multiple line items to delete'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedSectionIds.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setSelectedSectionIds([])}>
                Clear
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedSectionIds.length === 0}
            >
              Delete Selected{selectedSectionIds.length > 0 ? ` (${selectedSectionIds.length})` : ''}
            </Button>
          </div>
        </div>
      )}
      <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections}>
        {filteredSections.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No line items match your current filters
          </div>
        ) : (
          filteredSections.map((section, index) => {
          // Check if section name matches search (if so, show all boxes)
          const isTemplateSection = DEFAULT_SECTION_NAMES.includes(
            normalizeSectionName(section.name)
          );
          const displayName = isTemplateSection ? normalizeSectionName(section.name) : section.name;
          const sectionMatchesSearch =
            !normalizedSearch || displayName.toLowerCase().includes(normalizedSearch);
          const isFirst = index === 0;
          const isLast = index === filteredSections.length - 1;
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
                  "text-sm font-semibold hover:no-underline py-1.5",
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
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedSectionIds.includes(section.id)}
                          onCheckedChange={(checked) => toggleSectionSelection(section.id, checked)}
                          aria-label={`Select ${displayName}`}
                        />
                      </div>
                      {/* Reorder Controls */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const above = filteredSections[index - 1];
                            if (above) {
                              onSwapSectionOrder(section.id, above.id);
                            }
                          }}
                          disabled={isFirst}
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const below = filteredSections[index + 1];
                            if (below) {
                              onSwapSectionOrder(section.id, below.id);
                            }
                          }}
                          disabled={isLast}
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {/* Numbering */}
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex-shrink-0">
                        {index + 1}
                      </span>
                      
                      {/* Applicability Toggle - More prominent */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-7 w-24 p-0 flex-shrink-0 text-[11px] font-semibold transition-all",
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
                          {displayName}
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
                            className="h-6 w-6 p-0"
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
                            className="h-6 w-6 p-0"
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
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStartEdit(section);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm('Delete this line item? This will remove all its boxes and evidence.')) {
                            setSelectedSectionIds((prev) => prev.filter((id) => id !== section.id));
                            onDeleteSection(section.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      
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
                sectionName={displayName}
                onAddBox={onAddBox} 
                onAttachEvidence={onAttachEvidence}
                onUploadBoxEvidence={onUploadBoxEvidence}
                attachments={attachments}
                onDeleteEvidence={onDeleteEvidence}
                onOpenEvidence={onOpenEvidence}
                onBoxStatusUpdate={onBoxStatusUpdate}
                onExportBox={onExportBox}
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
    </div>
  );
}

interface SectionContentProps {
  sectionId: string;
  sectionName: string;
  onAddBox: (sectionId: string, createBoxFn: (header: string) => Promise<void>) => void;
  onAttachEvidence: (level: 'program' | 'section' | 'box', id: string, sectionId?: string) => void;
  onUploadBoxEvidence?: (boxId: string, sectionId: string, files: FileList | null) => void;
  attachments: any[];
  onDeleteEvidence: (attachment: { id: string; file_path: string }) => void;
  onOpenEvidence: (attachment: { file_path: string; file_name: string }) => void;
  onBoxStatusUpdate: (sectionId: string, metrics: SectionBoxMetrics) => void;
  onExportBox?: (box: AuditExecutionBox, sectionName: string, format: 'excel' | 'word') => void;
  searchQuery: string;
  statusFilter: string;
  sectionMatchesSearch: boolean;
  reviewNotes: any[];
}

function SectionContent({ sectionId, sectionName, onAddBox, onAttachEvidence, onUploadBoxEvidence, attachments, onDeleteEvidence, onOpenEvidence, onBoxStatusUpdate, onExportBox, searchQuery, statusFilter, sectionMatchesSearch, reviewNotes }: SectionContentProps) {
  const { boxes, loading, updateBox, deleteBox, createBox, updateBoxStatus, toggleBoxLock, reorderBoxes, moveBoxUp, moveBoxDown, refetch } = useWorkingSectionBoxes(sectionId);
  const [addingBox, setAddingBox] = useState(false);
  const [newHeader, setNewHeader] = useState('');
  const [draggingBoxId, setDraggingBoxId] = useState<string | null>(null);
  const normalizedSearch = searchQuery.trim().toLowerCase();

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

  const filteredBoxes = useMemo(() => (
    boxes.filter((box) => {
      const normalizedStatus = Object.prototype.hasOwnProperty.call(EMPTY_STATUS_COUNTS, box.status)
        ? box.status
        : 'not-commenced';
      // Status filter (always apply)
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) {
        return false;
      }
      
      // Search filter - if section name matched, show ALL boxes (skip box-level search)
      if (normalizedSearch && !sectionMatchesSearch) {
        const matchesHeader = normalizeHeader(box.header).toLowerCase().includes(normalizedSearch);
        const matchesContent = stripHtml(String(box.content || '')).toLowerCase().includes(normalizedSearch);
        if (!matchesHeader && !matchesContent) {
          return false;
        }
      }
      
      return true;
    })
  ), [boxes, statusFilter, normalizedSearch, sectionMatchesSearch]);

  // Update parent component whenever box statuses change
  useEffect(() => {
    if (loading) return;
    const statusCounts = { ...EMPTY_STATUS_COUNTS };
    boxes.forEach((box) => {
      const rawStatus = box.status || 'not-commenced';
      const normalizedStatus = Object.prototype.hasOwnProperty.call(EMPTY_STATUS_COUNTS, rawStatus)
        ? rawStatus
        : 'not-commenced';
      statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
    });
    onBoxStatusUpdate(sectionId, {
      total: boxes.length,
      complete: statusCounts.complete || 0,
      statusCounts,
      filteredCount: filteredBoxes.length,
    });
  }, [boxes, loading, sectionId, onBoxStatusUpdate, filteredBoxes.length]);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('refresh-audit-execution-boxes', handler);
    return () => window.removeEventListener('refresh-audit-execution-boxes', handler);
  }, [refetch]);

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
    <div className="space-y-1.5 pt-1">
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
                  onClick={() => onOpenEvidence(attachment)}
                  className="ml-1 hover:text-primary"
                  title="Open evidence"
                >
                  <Eye className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onDeleteEvidence(attachment)}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {filteredBoxes.length === 0 && (statusFilter !== 'all' || normalizedSearch) && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No boxes match the current filters in this line item
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
              onAttach={() => onAttachEvidence('box', box.id, sectionId)}
              onUploadFiles={(files) => onUploadBoxEvidence?.(box.id, sectionId, files)}
              onStatusChange={updateBoxStatus}
              onToggleLock={toggleBoxLock}
              onCommentClick={handleCommentClick}
              attachmentCount={getBoxAttachmentCount(box.id)}
              onExport={
                onExportBox
                  ? (format) => onExportBox(box, sectionName, format)
                  : undefined
              }
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
                      onClick={() => onOpenEvidence(attachment)}
                      className="ml-1 hover:text-primary"
                      title="Open evidence"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDeleteEvidence(attachment)}
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

