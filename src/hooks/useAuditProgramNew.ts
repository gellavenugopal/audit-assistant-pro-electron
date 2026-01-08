import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AuditProgramNew, 
  AuditProgramSection, 
  WorkingSectionBox, 
  DEFAULT_SECTION_NAMES,
  DEFAULT_BOX_HEADERS,
  BoxStatus
} from '@/types/auditProgramNew';

// 🎨 DEMO MODE - All features work without database!
// Set to false and run SQL migrations to enable database persistence
// NOTE: Run the migration file first: supabase/migrations/20260107000000_create_audit_program_new_tables.sql
const DEMO_MODE = false;

export function useAuditProgramNew(engagementId: string | null) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<AuditProgramNew[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrograms = useCallback(async () => {
    if (!engagementId || DEMO_MODE) return;
    
    setLoading(true);
    try {
      // @ts-ignore - Table will exist after migration
      const { data, error } = await (supabase as any)
        .from('audit_programs_new')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPrograms(data as any || []);
    } catch (error: any) {
      console.error('Error fetching audit programs:', error);
      toast.error('Failed to load audit programs');
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    if (!DEMO_MODE) {
      fetchPrograms();
    }
  }, [fetchPrograms]);

  const createProgram = async (
    name: string, 
    description?: string,
    workpaperRef?: string
  ): Promise<string | null> => {
    if (!engagementId) {
      toast.error('No engagement selected');
      return null;
    }

    if (DEMO_MODE) {
      const newProgramId = `demo-${Date.now()}`;
      const newProgram: AuditProgramNew = {
        id: newProgramId,
        engagement_id: engagementId,
        name,
        description,
        workpaper_reference: workpaperRef,
        status: 'draft',
        created_by: 'demo-user',
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      setPrograms(prev => [newProgram, ...prev]);
      toast.success('✨ Demo: Program created! (Using local state - not saved to database)');
      return newProgramId;
    }

    try {
      // Get engagement details for client_id
      const { data: engagement, error: engagementError } = await supabase
        .from('engagements')
        .select('client_id')
        .eq('id', engagementId)
        .single();

      if (engagementError) throw engagementError;

      // @ts-ignore - Table will exist after migration
      const { data, error } = await (supabase as any)
        .from('audit_programs_new')
        .insert({
          engagement_id: engagementId,
          client_id: engagement.client_id,
          financial_year_id: engagement.client_id, // Using client_id temporarily
          name,
          description,
          workpaper_reference: workpaperRef,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create default sections
      const sections = DEFAULT_SECTION_NAMES.map((sectionName, index) => ({
        audit_program_id: data.id,
        name: sectionName,
        order: index,
        is_expanded: false,
      }));

      // @ts-ignore - Table will exist after migration
      const { error: sectionsError } = await (supabase as any)
        .from('audit_program_sections')
        .insert(sections);

      if (sectionsError) throw sectionsError;

      await fetchPrograms();
      toast.success('Program created successfully!');
      return data.id;
    } catch (error: any) {
      console.error('Error creating program:', error);
      toast.error('Failed to create program');
      return null;
    }
  };

  const updateProgram = async (
    programId: string,
    updates: Partial<AuditProgramNew>
  ) => {
    if (DEMO_MODE) {
      setPrograms(prev => prev.map(p => 
        p.id === programId ? { ...p, ...updates, updated_at: new Date() } : p
      ));
      toast.success('✨ Demo: Program updated!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_programs_new')
        .update(updates)
        .eq('id', programId);
      
      if (error) throw error;
      
      await fetchPrograms();
      toast.success('Program updated successfully!');
    } catch (error: any) {
      console.error('Error updating program:', error);
      toast.error('Failed to update program');
    }
  };

  const deleteProgram = async (programId: string) => {
    if (DEMO_MODE) {
      setPrograms(prev => prev.filter(p => p.id !== programId));
      toast.success('✨ Demo: Program deleted!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_programs_new')
        .delete()
        .eq('id', programId);
      
      if (error) throw error;
      
      await fetchPrograms();
      toast.success('Program deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting program:', error);
      toast.error('Failed to delete program');
    }
  };

  return {
    programs,
    loading,
    createProgram,
    updateProgram,
    deleteProgram,
    refetch: fetchPrograms,
  };
}

export function useAuditProgramSections(programId: string | null) {
  const [sections, setSections] = useState<AuditProgramSection[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSections = useCallback(async () => {
    if (!programId) {
      setSections([]);
      return;
    }

    if (DEMO_MODE) {
      // Create demo sections
      const demoSections = DEFAULT_SECTION_NAMES.map((name, index) => ({
        id: `demo-section-${programId}-${index}`,
        audit_program_id: programId,
        name,
        order: index,
        is_expanded: true,
        status: 'not-commenced' as const,
        locked: false,
        is_applicable: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      setSections(demoSections);
      return;
    }
    
    setLoading(true);
    try {
      // @ts-ignore - Table will exist after migration
      const { data, error } = await (supabase as any)
        .from('audit_program_sections')
        .select('*')
        .eq('audit_program_id', programId)
        .order('order', { ascending: true });
      
      if (error) throw error;
      
      // Add default fields that might be missing from database
      const sectionsWithDefaults = (data || []).map((s: any) => ({
        ...s,
        status: (s as any).status || 'not-commenced',
        locked: (s as any).locked || false,
        is_applicable: s.is_applicable !== undefined ? s.is_applicable : true,
      }));
      
      setSections(sectionsWithDefaults as any);
    } catch (error: any) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const updateSectionStatus = async (sectionId: string, status: BoxStatus) => {
    if (DEMO_MODE) {
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, status, updated_at: new Date() } : s
      ));
      toast.success('✨ Demo: Section status updated!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_sections')
        .update({ status })
        .eq('id', sectionId);
      
      if (error) throw error;
      await fetchSections();
      toast.success('Section status updated!');
    } catch (error: any) {
      console.error('Error updating section status:', error);
      toast.error('Failed to update section status');
    }
  };

  const toggleSectionLock = async (sectionId: string) => {
    if (DEMO_MODE) {
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, locked: !s.locked, updated_at: new Date() } : s
      ));
      toast.success('✨ Demo: Section lock toggled!');
      return;
    }

    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_sections')
        .update({ locked: !section.locked })
        .eq('id', sectionId);
      
      if (error) throw error;
      await fetchSections();
      toast.success('Section lock toggled!');
    } catch (error: any) {
      console.error('Error toggling section lock:', error);
      toast.error('Failed to toggle section lock');
    }
  };

  const updateSectionName = async (sectionId: string, newName: string) => {
    if (DEMO_MODE) {
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, name: newName, updated_at: new Date() } : s
      ));
      toast.success('✨ Demo: Section name updated!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_sections')
        .update({ name: newName })
        .eq('id', sectionId);
      
      if (error) throw error;
      await fetchSections();
      toast.success('Section name updated!');
    } catch (error: any) {
      console.error('Error updating section name:', error);
      toast.error('Failed to update section name');
    }
  };

  const toggleSectionApplicability = async (sectionId: string) => {
    if (DEMO_MODE) {
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, is_applicable: !s.is_applicable, updated_at: new Date() } : s
      ));
      toast.success('✨ Demo: Applicability updated!');
      return;
    }

    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_sections')
        .update({ is_applicable: !section.is_applicable })
        .eq('id', sectionId);
      
      if (error) throw error;
      await fetchSections();
      toast.success('Applicability updated!');
    } catch (error: any) {
      console.error('Error toggling applicability:', error);
      toast.error('Failed to update applicability');
    }
  };

  return {
    sections,
    loading,
    updateSectionStatus,
    toggleSectionLock,
    updateSectionName,
    toggleSectionApplicability,
    refetch: fetchSections,
  };
}

export function useWorkingSectionBoxes(sectionId: string | null) {
  const { user } = useAuth();
  const [boxes, setBoxes] = useState<WorkingSectionBox[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBoxes = useCallback(async () => {
    if (!sectionId) {
      setBoxes([]);
      return;
    }

    if (DEMO_MODE) {
      // Create demo boxes
      const demoBoxes = DEFAULT_BOX_HEADERS.map((header, index) => ({
        id: `demo-box-${sectionId}-${index}`,
        section_id: sectionId,
        header,
        content: '',
        order: index,
        status: 'not-commenced' as const,
        locked: false,
        comment_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'demo-user',
      }));
      setBoxes(demoBoxes);
      return;
    }
    
    setLoading(true);
    try {
      // @ts-ignore - Table will exist after migration
      const { data, error } = await (supabase as any)
        .from('audit_program_boxes')
        .select('*')
        .eq('section_id', sectionId)
        .order('order', { ascending: true });
      
      if (error) throw error;
      
      // Add default fields that might be missing from database
      const boxesWithDefaults = (data || []).map((b: any) => ({
        ...b,
        status: b.status || 'not-commenced',
        locked: b.locked || false,
        comment_count: b.comment_count || 0,
      }));
      
      setBoxes(boxesWithDefaults as any);
    } catch (error: any) {
      console.error('Error fetching boxes:', error);
      toast.error('Failed to load boxes');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchBoxes();
  }, [fetchBoxes]);

  const updateBoxContent = async (boxId: string, headerOrContent: string, content?: string) => {
    if (DEMO_MODE) {
      // Support both (boxId, content) and (boxId, header, content) signatures
      if (content !== undefined) {
        setBoxes(prev => prev.map(b => 
          b.id === boxId ? { ...b, header: headerOrContent, content, updated_at: new Date() } : b
        ));
      } else {
        setBoxes(prev => prev.map(b => 
          b.id === boxId ? { ...b, content: headerOrContent, updated_at: new Date() } : b
        ));
      }
      toast.success('✨ Demo: Content saved!');
      return;
    }

    try {
      const updates: any = {};
      if (content !== undefined) {
        updates.header = headerOrContent;
        updates.content = content;
      } else {
        updates.content = headerOrContent;
      }

      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_boxes')
        .update(updates)
        .eq('id', boxId);
      
      if (error) throw error;
      await fetchBoxes();
      toast.success('Content saved!');
    } catch (error: any) {
      console.error('Error updating box content:', error);
      toast.error('Failed to save content');
    }
  };

  const addBox = async (header: string) => {
    if (!sectionId) return;
    
    if (DEMO_MODE) {
      const newBox: WorkingSectionBox = {
        id: `demo-box-${Date.now()}`,
        section_id: sectionId,
        header,
        content: '',
        order: boxes.length,
        status: 'not-commenced',
        locked: false,
        comment_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'demo-user',
      };
      setBoxes(prev => [...prev, newBox]);
      toast.success('✨ Demo: Box added!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_boxes')
        .insert({
          section_id: sectionId,
          header,
          content: '',
          order: boxes.length,
          created_by: user?.id,
        });
      
      if (error) throw error;
      await fetchBoxes();
      toast.success('Box added!');
    } catch (error: any) {
      console.error('Error adding box:', error);
      toast.error('Failed to add box');
    }
  };

  const deleteBox = async (boxId: string) => {
    if (DEMO_MODE) {
      setBoxes(prev => prev.filter(b => b.id !== boxId));
      toast.success('✨ Demo: Box deleted!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_boxes')
        .delete()
        .eq('id', boxId);
      
      if (error) throw error;
      await fetchBoxes();
      toast.success('Box deleted!');
    } catch (error: any) {
      console.error('Error deleting box:', error);
      toast.error('Failed to delete box');
    }
  };

  const updateBoxStatus = async (boxId: string, status: BoxStatus) => {
    if (DEMO_MODE) {
      setBoxes(prev => prev.map(b => 
        b.id === boxId ? { ...b, status, updated_at: new Date() } : b
      ));
      toast.success('✨ Demo: Status updated!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_boxes')
        .update({ status })
        .eq('id', boxId);
      
      if (error) throw error;
      await fetchBoxes();
      toast.success('Status updated!');
    } catch (error: any) {
      console.error('Error updating box status:', error);
      toast.error('Failed to update status');
    }
  };

  const toggleBoxLock = async (boxId: string) => {
    if (DEMO_MODE) {
      setBoxes(prev => prev.map(b => 
        b.id === boxId ? { ...b, locked: !b.locked, updated_at: new Date() } : b
      ));
      toast.success('✨ Demo: Lock toggled!');
      return;
    }

    try {
      const box = boxes.find(b => b.id === boxId);
      if (!box) return;

      // @ts-ignore - Table will exist after migration
      const { error } = await (supabase as any)
        .from('audit_program_boxes')
        .update({ locked: !box.locked })
        .eq('id', boxId);
      
      if (error) throw error;
      await fetchBoxes();
      toast.success('Lock toggled!');
    } catch (error: any) {
      console.error('Error toggling box lock:', error);
      toast.error('Failed to toggle lock');
    }
  };

  const updateCommentCount = (boxId: string, count: number) => {
    setBoxes(prev => prev.map(b => 
      b.id === boxId ? { ...b, comment_count: count } : b
    ));
  };

  const reorderBoxes = async (fromBoxId: string, toBoxId: string) => {
    const current = [...boxes];
    const fromIndex = current.findIndex(b => b.id === fromBoxId);
    const toIndex = current.findIndex(b => b.id === toBoxId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    const updated = current.map((b, idx) => ({ ...b, order: idx }));
    
    if (DEMO_MODE) {
      setBoxes(updated);
      toast.success('✨ Demo: Boxes reordered!');
      return;
    }

    try {
      // Update all box orders in database
      const updates = updated.map(b => ({
        id: b.id,
        order: b.order,
      }));

      for (const update of updates) {
        // @ts-ignore - Table will exist after migration
        await (supabase as any)
          .from('audit_program_boxes')
          .update({ order: update.order })
          .eq('id', update.id);
      }

      await fetchBoxes();
      toast.success('Boxes reordered!');
    } catch (error: any) {
      console.error('Error reordering boxes:', error);
      toast.error('Failed to reorder boxes');
    }
  };

  const moveBoxUp = async (boxId: string) => {
    const current = [...boxes];
    const currentIndex = current.findIndex(b => b.id === boxId);
    if (currentIndex <= 0) return;
    
    [current[currentIndex - 1], current[currentIndex]] = [current[currentIndex], current[currentIndex - 1]];
    const updated = current.map((b, idx) => ({ ...b, order: idx }));
    
    if (DEMO_MODE) {
      setBoxes(updated);
      toast.success('✨ Demo: Box moved up!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      await (supabase as any).from('audit_program_boxes').update({ order: updated[currentIndex - 1].order }).eq('id', updated[currentIndex - 1].id);
      // @ts-ignore - Table will exist after migration
      await (supabase as any).from('audit_program_boxes').update({ order: updated[currentIndex].order }).eq('id', updated[currentIndex].id);
      await fetchBoxes();
      toast.success('Box moved up!');
    } catch (error: any) {
      console.error('Error moving box up:', error);
      toast.error('Failed to move box');
    }
  };

  const moveBoxDown = async (boxId: string) => {
    const current = [...boxes];
    const currentIndex = current.findIndex(b => b.id === boxId);
    if (currentIndex === -1 || currentIndex >= current.length - 1) return;
    
    [current[currentIndex], current[currentIndex + 1]] = [current[currentIndex + 1], current[currentIndex]];
    const updated = current.map((b, idx) => ({ ...b, order: idx }));
    
    if (DEMO_MODE) {
      setBoxes(updated);
      toast.success('✨ Demo: Box moved down!');
      return;
    }

    try {
      // @ts-ignore - Table will exist after migration
      await (supabase as any).from('audit_program_boxes').update({ order: updated[currentIndex].order }).eq('id', updated[currentIndex].id);
      // @ts-ignore - Table will exist after migration
      await (supabase as any).from('audit_program_boxes').update({ order: updated[currentIndex + 1].order }).eq('id', updated[currentIndex + 1].id);
      await fetchBoxes();
      toast.success('Box moved down!');
    } catch (error: any) {
      console.error('Error moving box down:', error);
      toast.error('Failed to move box');
    }
  };

  return {
    boxes,
    loading,
    updateBox: updateBoxContent,
    createBox: addBox,
    deleteBox,
    updateBoxStatus,
    toggleBoxLock,
    updateCommentCount,
    reorderBoxes,
    moveBoxUp,
    moveBoxDown,
    refetch: fetchBoxes,
  };
}

export function useAuditProgramAttachments(programId: string | null) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading] = useState(false);

  const uploadAttachment = async (file: File, sectionId?: string, boxId?: string) => {
    const newAttachment = {
      id: `demo-attachment-${Date.now()}`,
      audit_program_id: programId,
      section_id: sectionId,
      box_id: boxId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_path: URL.createObjectURL(file),
      uploaded_by: 'demo-user',
      uploaded_at: new Date(),
    };
    
    setAttachments(prev => [...prev, newAttachment]);
    toast.success('✨ Demo: File uploaded! (File URL is temporary)');
    return newAttachment;
  };

  const deleteAttachment = async (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    toast.success('✨ Demo: Attachment deleted!');
  };

  return {
    attachments,
    loading,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment: async (attachment: any) => {
      toast.info('✨ Demo: In real mode, this would download the file');
    },
    refetch: () => {},
  };
}
