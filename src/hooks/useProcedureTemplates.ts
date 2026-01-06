import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ChecklistItem,
  EvidenceRequirement,
} from '@/types/procedureTemplate';

export interface ProcedureTemplate {
  id: string;
  program_id: string | null;
  procedure_name: string;
  description: string | null;
  area: string;
  assertion: string | null;
  is_standalone: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Workpaper fields
  checklist_items: ChecklistItem[];
  evidence_requirements: EvidenceRequirement[];
  conclusion_prompt: string | null;
  default_status: string | null;
}

export interface ProcedureTemplateFormData {
  procedure_name: string;
  description: string | null;
  area: string;
  assertion: string | null;
  program_id: string | null;
  checklist_items?: ChecklistItem[];
  evidence_requirements?: EvidenceRequirement[];
  conclusion_prompt?: string | null;
  default_status?: string | null;
}

export function useProcedureTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      // Fetch base template data
      const { data, error } = await supabase
        .from('standard_procedures')
        .select('*')
        .order('area')
        .order('sort_order');

      if (error) throw error;
      
      // Fetch relational checklist/evidence counts for each template
      const templateIds = (data || []).map(t => t.id);
      
      let checklistCounts: Record<string, number> = {};
      let evidenceCounts: Record<string, number> = {};
      
      if (templateIds.length > 0) {
        // Get checklist counts
        const { data: checklistData } = await supabase
          .from('procedure_template_checklist_items')
          .select('procedure_template_id')
          .in('procedure_template_id', templateIds);
        
        if (checklistData) {
          checklistData.forEach(item => {
            checklistCounts[item.procedure_template_id] = (checklistCounts[item.procedure_template_id] || 0) + 1;
          });
        }
        
        // Get evidence counts
        const { data: evidenceData } = await supabase
          .from('procedure_template_evidence_requirements')
          .select('procedure_template_id')
          .in('procedure_template_id', templateIds);
        
        if (evidenceData) {
          evidenceData.forEach(item => {
            evidenceCounts[item.procedure_template_id] = (evidenceCounts[item.procedure_template_id] || 0) + 1;
          });
        }
      }
      
      // Parse and combine data - use relational counts for display
      const parsedData: ProcedureTemplate[] = (data || []).map(row => ({
        id: row.id,
        program_id: row.program_id,
        procedure_name: row.procedure_name,
        description: row.description,
        area: row.area,
        assertion: row.assertion,
        is_standalone: row.is_standalone,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        // Use relational counts - create placeholder arrays for count display
        checklist_items: Array(checklistCounts[row.id] || 0).fill({ id: '', text: '', required: false, order: 0 }),
        evidence_requirements: Array(evidenceCounts[row.id] || 0).fill({ id: '', label: '', required: false, order: 0 }),
        conclusion_prompt: row.conclusion_prompt || null,
        default_status: row.default_status || null,
      }));
      
      setTemplates(parsedData);
    } catch (error) {
      console.error('Error fetching procedure templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: ProcedureTemplateFormData): Promise<string | null> => {
    if (!user?.id) {
      toast.error('You must be logged in to create templates');
      return null;
    }

    try {
      const insertPayload: Record<string, unknown> = {
        procedure_name: data.procedure_name,
        description: data.description || null,
        area: data.area,
        assertion: data.assertion || null,
        program_id: data.program_id || null,
        is_standalone: !data.program_id,
        created_by: user.id,
        checklist_items: [], // Keep empty, use relational tables
        evidence_requirements: [], // Keep empty, use relational tables
        conclusion_prompt: data.conclusion_prompt || null,
        default_status: data.default_status || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newTemplate, error } = await (supabase
        .from('standard_procedures') as any)
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      toast.success('Procedure template created');
      await fetchTemplates();
      return newTemplate?.id || null;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create template');
      return null;
    }
  };

  const updateTemplate = async (id: string, data: Partial<ProcedureTemplateFormData>) => {
    try {
      const updateData: Record<string, unknown> = { ...data };
      if ('program_id' in data) {
        updateData.is_standalone = !data.program_id;
      }

      const { error } = await supabase
        .from('standard_procedures')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Procedure template updated');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update template');
      return false;
    }
  };

  // Check if template is in use by any audit_procedures
  const getTemplateUsage = async (templateId: string): Promise<{ count: number; canDelete: boolean }> => {
    try {
      const { count, error } = await supabase
        .from('audit_procedures')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', templateId);

      if (error) throw error;
      return { count: count || 0, canDelete: (count || 0) === 0 };
    } catch (error) {
      console.error('Error checking template usage:', error);
      return { count: 0, canDelete: true };
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      // Check if template is referenced in any audit_procedures
      const usage = await getTemplateUsage(id);
      
      if (!usage.canDelete) {
        toast.error(`Cannot delete template: it is used by ${usage.count} procedure(s). Remove references first.`);
        return false;
      }

      // Check if template is linked to a program (soft warning, allow delete)
      const template = templates.find(t => t.id === id);
      if (template?.program_id) {
        // Template is part of a program - allow delete but the program still exists
      }

      const { error } = await supabase
        .from('standard_procedures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Procedure template deleted');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
      return false;
    }
  };

  const getTemplatesByArea = useCallback((area: string) => {
    return templates.filter(t => t.area === area);
  }, [templates]);

  const getTemplatesByProgram = useCallback((programId: string) => {
    return templates.filter(t => t.program_id === programId);
  }, [templates]);

  const getStandaloneTemplates = useCallback(() => {
    return templates.filter(t => t.is_standalone);
  }, [templates]);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateUsage,
    refetch: fetchTemplates,
    getTemplatesByArea,
    getTemplatesByProgram,
    getStandaloneTemplates,
  };
}
