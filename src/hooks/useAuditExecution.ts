import { useEffect, useState } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();
import {
  AuditExecutionAttachment,
  AuditExecutionBox,
  AuditExecutionProgram,
  AuditExecutionSection,
  BoxStatus,
  DEFAULT_BOX_HEADERS,
  DEFAULT_SECTION_NAMES,
} from '@/types/auditExecution';

export function useAuditExecution(engagementId?: string | null) {
  const [programs, setPrograms] = useState<AuditExecutionProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPrograms = async () => {
    if (!engagementId) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await db
        .from('audit_programs_new')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false })
        .execute();

      if (error) throw error;
      setPrograms((data || []) as AuditExecutionProgram[]);
    } catch (error) {
      console.error('Error fetching audit executions:', error);
      toast.error('Failed to load audit executions');
    } finally {
      setLoading(false);
    }
  };

  const resolveFinancialYearId = async (financialYear: string) => {
    const { data, error } = await db
      .from('financial_years')
      .select('id, year_code, display_name')
      .eq('is_active', 1)
      .execute();

    if (error) throw error;

    const match = (data || []).find(
      (year) =>
        year.year_code === financialYear || year.display_name === financialYear
    );

    return match?.id || null;
  };

  const createProgram = async (
    name: string,
    description?: string,
    workpaperReference?: string
  ) => {
    if (!user || !engagementId) {
      toast.error('Please select an engagement first');
      return null;
    }

    try {
      const { data: engagement, error: engagementError } = await db
        .from('engagements')
        .select('client_id, financial_year')
        .eq('id', engagementId)
        .single();

      if (engagementError) throw engagementError;
      if (!engagement?.client_id) {
        toast.error('Engagement is missing a client. Please update the engagement.');
        return null;
      }

      const yearId = await resolveFinancialYearId(engagement.financial_year);
      if (!yearId) {
        toast.error('Financial year not found. Please add it in Settings.');
        return null;
      }

      const { data, error } = await db
        .from('audit_programs_new')
        .insert({
          engagement_id: engagementId,
          client_id: engagement.client_id,
          financial_year_id: yearId,
          name,
          description: description || null,
          workpaper_reference: workpaperReference || null,
          created_by: user.id,
        })
        .execute();
      
      if (error) throw error;
      const program = Array.isArray(data) ? data[0] : data;
      if (!program) throw new Error('Failed to create program');

      if (error) throw error;

      const sectionsToInsert = DEFAULT_SECTION_NAMES.map((sectionName, index) => ({
        audit_program_id: program.id,
        name: sectionName,
        order: index,
        is_expanded: false,
        is_applicable: true,
        locked: false,
        status: 'not-commenced',
      }));

      const { data: sectionsData, error: sectionsError } = await db
        .from('audit_program_sections')
        .insert(sectionsToInsert)
        .execute();

      if (sectionsError) throw sectionsError;
      const sections = sectionsData || [];

      const boxesToInsert = (sections || []).flatMap((section, sectionIndex) =>
        DEFAULT_BOX_HEADERS.map((header, orderIndex) => ({
          section_id: section.id,
          header,
          content: '',
          order: orderIndex,
          status: 'not-commenced',
          locked: false,
          created_by: user.id,
        }))
      );

      const { error: boxesError } = await db
        .from('audit_program_boxes')
        .insert(boxesToInsert)
        .execute();

      if (boxesError) throw boxesError;

      toast.success('Audit execution created');
      await fetchPrograms();
      return program.id;
    } catch (error: any) {
      console.error('Error creating audit execution:', error);
      toast.error(error.message || 'Failed to create audit execution');
      return null;
    }
  };

  const updateProgram = async (id: string, updates: Partial<AuditExecutionProgram>) => {
    try {
      const { error } = await db
        .from('audit_programs_new')
        .update(updates)
        .eq('id', id)
        .execute();

      if (error) throw error;

      toast.success('Audit execution updated');
      await fetchPrograms();
    } catch (error: any) {
      console.error('Error updating audit execution:', error);
      toast.error(error.message || 'Failed to update audit execution');
    }
  };

  const deleteProgram = async (id: string) => {
    try {
      const { error } = await db
        .from('audit_programs_new')
        .delete()
        .eq('id', id)
        .execute();

      if (error) throw error;

      toast.success('Audit execution deleted');
      await fetchPrograms();
    } catch (error: any) {
      console.error('Error deleting audit execution:', error);
      toast.error(error.message || 'Failed to delete audit execution');
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [engagementId]);

  return {
    programs,
    loading,
    createProgram,
    updateProgram,
    deleteProgram,
    refetch: fetchPrograms,
  };
}

export function useAuditExecutionSections(programId?: string | null) {
  const [sections, setSections] = useState<AuditExecutionSection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSections = async () => {
    if (!programId) {
      setSections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await db
        .from('audit_program_sections')
        .select('*')
        .eq('audit_program_id', programId)
        .order('order', { ascending: true });

      if (error) throw error;
      setSections((data || []) as AuditExecutionSection[]);
    } catch (error) {
      console.error('Error fetching audit execution sections:', error);
      toast.error('Failed to load audit execution sections');
    } finally {
      setLoading(false);
    }
  };

  const updateSectionStatus = async (sectionId: string, status: BoxStatus) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, status } : section
      )
    );

    try {
      const { error } = await db
        .from('audit_program_sections')
        .update({ status })
        .eq('id', sectionId)
        .execute();

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating section status:', error);
      toast.error(error.message || 'Failed to update section status');
      await fetchSections();
    }
  };

  const toggleSectionLock = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const nextLocked = !section.locked;

    setSections((prev) =>
      prev.map((item) =>
        item.id === sectionId ? { ...item, locked: nextLocked } : item
      )
    );

    try {
      const { error } = await db
        .from('audit_program_sections')
        .update({ locked: nextLocked })
        .eq('id', sectionId)
        .execute();

      if (error) throw error;
    } catch (error: any) {
      console.error('Error toggling section lock:', error);
      toast.error(error.message || 'Failed to update section lock');
      await fetchSections();
    }
  };

  const updateSectionName = async (sectionId: string, newName: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, name: newName } : section
      )
    );

    try {
      const { error } = await db
        .from('audit_program_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .execute();

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating section name:', error);
      toast.error(error.message || 'Failed to update section name');
      await fetchSections();
    }
  };

  const toggleSectionApplicability = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const nextApplicable = !section.is_applicable;

    setSections((prev) =>
      prev.map((item) =>
        item.id === sectionId ? { ...item, is_applicable: nextApplicable } : item
      )
    );

    try {
      const { error } = await db
        .from('audit_program_sections')
        .update({ is_applicable: nextApplicable })
        .eq('id', sectionId)
        .execute();

      if (error) throw error;
    } catch (error: any) {
      console.error('Error toggling section applicability:', error);
      toast.error(error.message || 'Failed to update section applicability');
      await fetchSections();
    }
  };

  const swapSectionOrder = async (firstId: string, secondId: string) => {
    if (firstId === secondId) return;
    const first = sections.find((section) => section.id === firstId);
    const second = sections.find((section) => section.id === secondId);
    if (!first || !second) return;

    setSections((prev) => {
      const next = prev.map((section) => {
        if (section.id === firstId) return { ...section, order: second.order };
        if (section.id === secondId) return { ...section, order: first.order };
        return section;
      });
      return [...next].sort((a, b) => a.order - b.order);
    });

    try {
      const { error: firstError } = await db
        .from('audit_program_sections')
        .update({ order: second.order })
        .eq('id', firstId);
      if (firstError) throw firstError;

      const { error: secondError } = await db
        .from('audit_program_sections')
        .update({ order: first.order })
        .eq('id', secondId);
      if (secondError) throw secondError;
    } catch (error: any) {
      console.error('Error swapping section order:', error);
      toast.error(error.message || 'Failed to reorder line item');
      await fetchSections();
    }
  };

  const moveSectionUp = async (sectionId: string) => {
    const ordered = [...sections].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((section) => section.id === sectionId);
    if (index <= 0) return;
    await swapSectionOrder(sectionId, ordered[index - 1].id);
  };

  const moveSectionDown = async (sectionId: string) => {
    const ordered = [...sections].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((section) => section.id === sectionId);
    if (index < 0 || index >= ordered.length - 1) return;
    await swapSectionOrder(sectionId, ordered[index + 1].id);
  };

  const createSection = async (name: string) => {
    if (!programId || !user) {
      toast.error('Please sign in and select an audit execution.');
      return null;
    }

    const nextOrder =
      sections.length > 0 ? Math.max(...sections.map((section) => section.order)) + 1 : 0;

    try {
      const { data: newSection, error } = await db
        .from('audit_program_sections')
        .insert({
          audit_program_id: programId,
          name,
          order: nextOrder,
          is_expanded: false,
          is_applicable: true,
          locked: false,
          status: 'not-commenced',
        })
        .select('id')
        .single();

      if (error) throw error;

      const boxesToInsert = DEFAULT_BOX_HEADERS.map((header, orderIndex) => ({
        section_id: newSection.id,
        header,
        content: '',
        order: orderIndex,
        status: 'not-commenced',
        locked: false,
        created_by: user.id,
      }));

      const { error: boxesError } = await db
        .from('audit_program_boxes')
        .insert(boxesToInsert)
        .execute();

      if (boxesError) throw boxesError;

      await fetchSections();
      return newSection.id;
    } catch (error: any) {
      console.error('Error creating section:', error);
      toast.error(error.message || 'Failed to add line item');
      return null;
    }
  };

  const deleteSection = async (sectionId: string) => {
    try {
      const { data: boxes, error: boxFetchError } = await db
        .from('audit_program_boxes')
        .select('id')
        .eq('section_id', sectionId);

      if (boxFetchError) throw boxFetchError;

      const boxIds = (boxes || []).map((box) => box.id);

      if (boxIds.length > 0) {
        const { error: boxAttachmentError } = await db
          .from('audit_program_attachments')
          .delete()
          .in('box_id', boxIds);
        if (boxAttachmentError) throw boxAttachmentError;
      }

      const { error: sectionAttachmentError } = await db
        .from('audit_program_attachments')
        .delete()
        .eq('section_id', sectionId);
      if (sectionAttachmentError) throw sectionAttachmentError;

      const { error: boxDeleteError } = await db
        .from('audit_program_boxes')
        .delete()
        .eq('section_id', sectionId);
      if (boxDeleteError) throw boxDeleteError;

      const { error: sectionDeleteError } = await db
        .from('audit_program_sections')
        .delete()
        .eq('id', sectionId);
      if (sectionDeleteError) throw sectionDeleteError;

      await fetchSections();
    } catch (error: any) {
      console.error('Error deleting section:', error);
      toast.error(error.message || 'Failed to delete line item');
    }
  };

  useEffect(() => {
    fetchSections();
  }, [programId]);

  return {
    sections,
    loading,
    updateSectionStatus,
    toggleSectionLock,
    updateSectionName,
    toggleSectionApplicability,
    swapSectionOrder,
    moveSectionUp,
    moveSectionDown,
    createSection,
    deleteSection,
    refetch: fetchSections,
  };
}

export function useWorkingSectionBoxes(sectionId?: string | null) {
  const [boxes, setBoxes] = useState<AuditExecutionBox[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBoxes = async () => {
    if (!sectionId) {
      setBoxes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await db
        .from('audit_program_boxes')
        .select('*')
        .eq('section_id', sectionId)
        .order('order', { ascending: true });

      if (error) throw error;
      setBoxes((data || []) as AuditExecutionBox[]);
    } catch (error) {
      console.error('Error fetching section boxes:', error);
      toast.error('Failed to load working boxes');
    } finally {
      setLoading(false);
    }
  };

  const createBox = async (header: string) => {
    if (!user || !sectionId) return;

    const nextOrder = boxes.length;

    try {
      const { error } = await db
        .from('audit_program_boxes')
        .insert({
          section_id: sectionId,
          header,
          content: '',
          order: nextOrder,
          status: 'not-commenced',
          locked: false,
          created_by: user.id,
        });

      if (error) throw error;
      await fetchBoxes();
    } catch (error: any) {
      console.error('Error creating box:', error);
      toast.error(error.message || 'Failed to create box');
    }
  };

  const updateBox = async (boxId: string, updates: Partial<AuditExecutionBox>) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === boxId ? { ...box, ...updates } : box))
    );

    try {
      const { error } = await db
        .from('audit_program_boxes')
        .update(updates)
        .eq('id', boxId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating box:', error);
      toast.error(error.message || 'Failed to update box');
      await fetchBoxes();
    }
  };

  const updateBoxStatus = async (boxId: string, status: BoxStatus) => {
    await updateBox(boxId, { status });
  };

  const toggleBoxLock = async (boxId: string) => {
    const box = boxes.find((b) => b.id === boxId);
    if (!box) return;
    const isLocked = box.locked === true || String(box.locked) === 'true';
    await updateBox(boxId, { locked: !isLocked });
  };

  const deleteBox = async (boxId: string) => {
    try {
      const { error } = await db
        .from('audit_program_boxes')
        .delete()
        .eq('id', boxId);

      if (error) throw error;
      await fetchBoxes();
    } catch (error: any) {
      console.error('Error deleting box:', error);
      toast.error(error.message || 'Failed to delete box');
    }
  };

  const persistOrder = async (orderedBoxes: AuditExecutionBox[]) => {
    setBoxes(orderedBoxes);
    await Promise.all(
      orderedBoxes.map((box, index) =>
        db
          .from('audit_program_boxes')
          .update({ order: index })
          .eq('id', box.id)
          .execute()
      )
    );
  };

  const reorderBoxes = async (fromId: string, toId: string) => {
    const fromIndex = boxes.findIndex((b) => b.id === fromId);
    const toIndex = boxes.findIndex((b) => b.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...boxes];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await persistOrder(reordered);
  };

  const moveBoxUp = async (boxId: string) => {
    const index = boxes.findIndex((b) => b.id === boxId);
    if (index <= 0) return;
    const reordered = [...boxes];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    await persistOrder(reordered);
  };

  const moveBoxDown = async (boxId: string) => {
    const index = boxes.findIndex((b) => b.id === boxId);
    if (index < 0 || index >= boxes.length - 1) return;
    const reordered = [...boxes];
    [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]];
    await persistOrder(reordered);
  };

  useEffect(() => {
    fetchBoxes();
  }, [sectionId]);

  return {
    boxes,
    loading,
    createBox,
    updateBox,
    deleteBox,
    updateBoxStatus,
    toggleBoxLock,
    reorderBoxes,
    moveBoxUp,
    moveBoxDown,
    refetch: fetchBoxes,
  };
}

export function useAuditExecutionAttachments(programId?: string | null) {
  const [attachments, setAttachments] = useState<AuditExecutionAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = async () => {
    if (!programId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await db
        .from('audit_program_attachments')
        .select('*')
        .eq('audit_program_id', programId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAttachments((data || []) as AuditExecutionAttachment[]);
    } catch (error) {
      console.error('Error fetching audit execution attachments:', error);
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const createAttachment = async (
    attachment: Omit<AuditExecutionAttachment, 'id' | 'uploaded_at'>
  ) => {
    try {
      const { data, error } = await db
        .from('audit_program_attachments')
        .insert(attachment)
        .select()
        .single();

      if (error) throw error;
      await fetchAttachments();
      return data;
    } catch (error: any) {
      console.error('Error creating attachment:', error);
      toast.error(error.message || 'Failed to attach evidence');
      return null;
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await db
        .from('audit_program_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
      await fetchAttachments();
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast.error(error.message || 'Failed to delete attachment');
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [programId]);

  return {
    attachments,
    loading,
    createAttachment,
    deleteAttachment,
    refetch: fetchAttachments,
  };
}
