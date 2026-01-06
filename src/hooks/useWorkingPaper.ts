import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Template-level checklist/evidence items
export interface TemplateChecklistItem {
  id: string;
  procedure_template_id: string;
  text: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface TemplateEvidenceRequirement {
  id: string;
  procedure_template_id: string;
  title: string;
  wp_ref: string | null;
  allowed_file_types: string[];
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

// Instance-level checklist/evidence items
export interface ProcedureChecklistItem {
  id: string;
  procedure_id: string;
  template_item_id: string | null;
  text: string;
  is_required: boolean;
  status: 'pending' | 'done' | 'na';
  remarks: string | null;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProcedureEvidenceRequirement {
  id: string;
  procedure_id: string;
  template_requirement_id: string | null;
  title: string;
  wp_ref: string | null;
  allowed_file_types: string[];
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface EvidenceLink {
  id: string;
  evidence_id: string;
  procedure_id: string;
  evidence_requirement_id: string | null;
  linked_at: string;
  linked_by: string;
  // Joined fields
  evidence_name?: string;
  evidence_file_type?: string;
}

export interface ProcedureProgress {
  checklist_done: number;
  checklist_total: number;
  checklist_required_done: number;
  checklist_required_total: number;
  evidence_done: number;
  evidence_total: number;
  evidence_required_done: number;
  evidence_required_total: number;
  is_prepared: boolean; // all required done
}

// Hook for template-level items (for Admin Settings)
export function useTemplateWorkpaper(templateId: string | null) {
  const { user } = useAuth();
  const [checklistItems, setChecklistItems] = useState<TemplateChecklistItem[]>([]);
  const [evidenceRequirements, setEvidenceRequirements] = useState<TemplateEvidenceRequirement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!templateId) {
      setChecklistItems([]);
      setEvidenceRequirements([]);
      return;
    }

    setLoading(true);
    try {
      const [checklistRes, evidenceRes] = await Promise.all([
        supabase
          .from('procedure_template_checklist_items')
          .select('*')
          .eq('procedure_template_id', templateId)
          .order('sort_order'),
        supabase
          .from('procedure_template_evidence_requirements')
          .select('*')
          .eq('procedure_template_id', templateId)
          .order('sort_order'),
      ]);

      if (checklistRes.error) throw checklistRes.error;
      if (evidenceRes.error) throw evidenceRes.error;

      setChecklistItems(checklistRes.data || []);
      setEvidenceRequirements((evidenceRes.data || []).map(r => ({
        ...r,
        allowed_file_types: r.allowed_file_types || [],
      })));
    } catch (error) {
      console.error('Error fetching template workpaper items:', error);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // CRUD for checklist items
  const addChecklistItem = async (text: string, isRequired: boolean = false) => {
    if (!templateId || !user?.id) return null;

    try {
      const sortOrder = checklistItems.length;
      const { data, error } = await supabase
        .from('procedure_template_checklist_items')
        .insert({
          procedure_template_id: templateId,
          text,
          is_required: isRequired,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchItems();
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add checklist item');
      return null;
    }
  };

  const updateChecklistItem = async (id: string, updates: Partial<Pick<TemplateChecklistItem, 'text' | 'is_required' | 'sort_order'>>) => {
    try {
      const { error } = await supabase
        .from('procedure_template_checklist_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update checklist item');
      return false;
    }
  };

  const deleteChecklistItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('procedure_template_checklist_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete checklist item');
      return false;
    }
  };

  // CRUD for evidence requirements
  const addEvidenceRequirement = async (title: string, wpRef?: string, allowedTypes?: string[], isRequired: boolean = false) => {
    if (!templateId || !user?.id) return null;

    try {
      const sortOrder = evidenceRequirements.length;
      const { data, error } = await supabase
        .from('procedure_template_evidence_requirements')
        .insert({
          procedure_template_id: templateId,
          title,
          wp_ref: wpRef || null,
          allowed_file_types: allowedTypes || [],
          is_required: isRequired,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchItems();
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add evidence requirement');
      return null;
    }
  };

  const updateEvidenceRequirement = async (id: string, updates: Partial<Pick<TemplateEvidenceRequirement, 'title' | 'wp_ref' | 'allowed_file_types' | 'is_required' | 'sort_order'>>) => {
    try {
      const { error } = await supabase
        .from('procedure_template_evidence_requirements')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update evidence requirement');
      return false;
    }
  };

  const deleteEvidenceRequirement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('procedure_template_evidence_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete evidence requirement');
      return false;
    }
  };

  return {
    checklistItems,
    evidenceRequirements,
    loading,
    refetch: fetchItems,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    addEvidenceRequirement,
    updateEvidenceRequirement,
    deleteEvidenceRequirement,
  };
}

// Template sync status
export interface TemplateSyncStatus {
  hasPendingUpdates: boolean;
  newChecklistItems: number;
  newEvidenceReqs: number;
  templateUpdatedAt: string | null;
}

// Hook for procedure instance items (for Working Paper page)
export function useProcedureWorkpaper(procedureId: string | null, templateId?: string | null) {
  const { user } = useAuth();
  const [checklistItems, setChecklistItems] = useState<ProcedureChecklistItem[]>([]);
  const [evidenceRequirements, setEvidenceRequirements] = useState<ProcedureEvidenceRequirement[]>([]);
  const [evidenceLinks, setEvidenceLinks] = useState<EvidenceLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [syncStatus, setSyncStatus] = useState<TemplateSyncStatus>({
    hasPendingUpdates: false,
    newChecklistItems: 0,
    newEvidenceReqs: 0,
    templateUpdatedAt: null,
  });

  const fetchItems = useCallback(async () => {
    if (!procedureId) {
      setChecklistItems([]);
      setEvidenceRequirements([]);
      setEvidenceLinks([]);
      return;
    }

    setLoading(true);
    try {
      const [checklistRes, evidenceReqRes, linksRes] = await Promise.all([
        supabase
          .from('procedure_checklist_items')
          .select('*')
          .eq('procedure_id', procedureId)
          .order('sort_order'),
        supabase
          .from('procedure_evidence_requirements')
          .select('*')
          .eq('procedure_id', procedureId)
          .order('sort_order'),
        supabase
          .from('evidence_links')
          .select(`
            *,
            evidence_files (
              name,
              file_type
            )
          `)
          .eq('procedure_id', procedureId),
      ]);

      if (checklistRes.error) throw checklistRes.error;
      if (evidenceReqRes.error) throw evidenceReqRes.error;
      if (linksRes.error) throw linksRes.error;

      setChecklistItems((checklistRes.data || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'done' | 'na',
      })));
      
      setEvidenceRequirements((evidenceReqRes.data || []).map(r => ({
        ...r,
        allowed_file_types: r.allowed_file_types || [],
      })));
      
      setEvidenceLinks((linksRes.data || []).map(link => ({
        ...link,
        evidence_name: (link.evidence_files as any)?.name,
        evidence_file_type: (link.evidence_files as any)?.file_type,
      })));
    } catch (error) {
      console.error('Error fetching procedure workpaper items:', error);
    } finally {
      setLoading(false);
    }
  }, [procedureId]);

  // Check template sync status
  const checkTemplateSync = useCallback(async () => {
    if (!templateId || !procedureId) {
      setSyncStatus({
        hasPendingUpdates: false,
        newChecklistItems: 0,
        newEvidenceReqs: 0,
        templateUpdatedAt: null,
      });
      return;
    }

    try {
      // Get template items
      const [templateChecklistRes, templateEvidenceRes, templateRes] = await Promise.all([
        supabase
          .from('procedure_template_checklist_items')
          .select('id')
          .eq('procedure_template_id', templateId),
        supabase
          .from('procedure_template_evidence_requirements')
          .select('id')
          .eq('procedure_template_id', templateId),
        supabase
          .from('standard_procedures')
          .select('updated_at')
          .eq('id', templateId)
          .single(),
      ]);

      const templateChecklistIds = new Set((templateChecklistRes.data || []).map(i => i.id));
      const templateEvidenceIds = new Set((templateEvidenceRes.data || []).map(i => i.id));

      // Check which template items are NOT in procedure instances
      const instanceChecklistTemplateIds = new Set(
        checklistItems.filter(i => i.template_item_id).map(i => i.template_item_id)
      );
      const instanceEvidenceTemplateIds = new Set(
        evidenceRequirements.filter(r => r.template_requirement_id).map(r => r.template_requirement_id)
      );

      let newChecklist = 0;
      let newEvidence = 0;

      templateChecklistIds.forEach(id => {
        if (!instanceChecklistTemplateIds.has(id)) newChecklist++;
      });

      templateEvidenceIds.forEach(id => {
        if (!instanceEvidenceTemplateIds.has(id)) newEvidence++;
      });

      setSyncStatus({
        hasPendingUpdates: newChecklist > 0 || newEvidence > 0,
        newChecklistItems: newChecklist,
        newEvidenceReqs: newEvidence,
        templateUpdatedAt: templateRes.data?.updated_at || null,
      });
    } catch (error) {
      console.error('Error checking template sync:', error);
    }
  }, [templateId, procedureId, checklistItems, evidenceRequirements]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (checklistItems.length > 0 || evidenceRequirements.length > 0) {
      checkTemplateSync();
    }
  }, [checklistItems, evidenceRequirements, checkTemplateSync]);

  // Update checklist item status
  const updateChecklistStatus = async (itemId: string, status: 'pending' | 'done' | 'na', remarks?: string) => {
    if (!user?.id) return false;

    try {
      const updates: Record<string, any> = { status };
      
      if (status === 'done' || status === 'na') {
        updates.completed_by = user.id;
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_by = null;
        updates.completed_at = null;
      }
      
      if (remarks !== undefined) {
        updates.remarks = remarks;
      }

      const { error } = await supabase
        .from('procedure_checklist_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update checklist item');
      return false;
    }
  };

  const updateChecklistRemarks = async (itemId: string, remarks: string) => {
    try {
      const { error } = await supabase
        .from('procedure_checklist_items')
        .update({ remarks })
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update remarks');
      return false;
    }
  };

  // Link evidence to procedure (and optionally to a requirement)
  const linkEvidence = async (evidenceId: string, requirementId?: string) => {
    if (!procedureId || !user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('evidence_links')
        .insert({
          evidence_id: evidenceId,
          procedure_id: procedureId,
          evidence_requirement_id: requirementId || null,
          linked_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Evidence linked');
      await fetchItems();
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to link evidence');
      return null;
    }
  };

  const unlinkEvidence = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('evidence_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      toast.success('Evidence unlinked');
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink evidence');
      return false;
    }
  };

  // Reorder checklist item (move up/down)
  const reorderChecklistItem = async (itemId: string, direction: 'up' | 'down') => {
    const currentIndex = checklistItems.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return false;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= checklistItems.length) return false;

    setReordering(true);
    try {
      const currentItem = checklistItems[currentIndex];
      const targetItem = checklistItems[targetIndex];

      // Swap sort_order values
      const [res1, res2] = await Promise.all([
        supabase
          .from('procedure_checklist_items')
          .update({ sort_order: targetItem.sort_order })
          .eq('id', currentItem.id),
        supabase
          .from('procedure_checklist_items')
          .update({ sort_order: currentItem.sort_order })
          .eq('id', targetItem.id),
      ]);

      if (res1.error) throw res1.error;
      if (res2.error) throw res2.error;

      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder item');
      return false;
    } finally {
      setReordering(false);
    }
  };

  // Export checklist to Excel
  const exportChecklist = () => {
    const exportData = checklistItems.map((item, index) => ({
      'S.No': index + 1,
      'Checklist Item': item.text,
      'Required': item.is_required ? 'Yes' : 'No',
      'Status': item.status === 'done' ? 'Done' : item.status === 'na' ? 'N/A' : 'Pending',
      'Remarks': item.remarks || '',
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 50 },  // Checklist Item
      { wch: 10 },  // Required
      { wch: 10 },  // Status
      { wch: 40 },  // Remarks
    ];
    
    XLSX.writeFile(wb, `checklist-${procedureId}.xlsx`);
    toast.success('Checklist exported to Excel');
  };

  // Download checklist template
  const downloadChecklistTemplate = () => {
    const templateData = [
      {
        'Checklist Item': 'Verify opening balances match prior year closing',
        'Required': 'Yes',
      },
      {
        'Checklist Item': 'Review supporting documentation',
        'Required': 'No',
      },
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist Template');
    
    // Add notes sheet
    const notesData = [
      { 'Notes': 'Instructions for importing checklist items:' },
      { 'Notes': '' },
      { 'Notes': 'Required Columns:' },
      { 'Notes': '- Checklist Item: The text of the checklist item (required)' },
      { 'Notes': '' },
      { 'Notes': 'Optional Columns:' },
      { 'Notes': '- Required: Enter "Yes" or "No" (defaults to No)' },
      { 'Notes': '' },
      { 'Notes': 'Tips:' },
      { 'Notes': '- Each row will be imported as a separate checklist item' },
      { 'Notes': '- Empty rows will be skipped' },
      { 'Notes': '- Items will be added to the end of the existing checklist' },
    ];
    const notesWs = XLSX.utils.json_to_sheet(notesData);
    XLSX.utils.book_append_sheet(wb, notesWs, 'Instructions');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 50 },  // Checklist Item
      { wch: 10 },  // Required
    ];
    
    XLSX.writeFile(wb, 'checklist_import_template.xlsx');
    toast.success('Template downloaded');
  };

  // Import checklist from Excel
  const importChecklist = async (file: File): Promise<boolean> => {
    if (!procedureId || !user?.id) return false;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error('No data found in Excel file');
          }

          // Parse and validate items
          const validItems = jsonData
            .map((row: any) => {
              const text = row['Checklist Item']?.toString().trim();
              if (!text) return null;
              
              const requiredVal = row['Required']?.toString().toLowerCase().trim();
              const isRequired = requiredVal === 'yes' || requiredVal === 'true' || requiredVal === '1';
              
              return { text, is_required: isRequired };
            })
            .filter(Boolean);

          if (validItems.length === 0) {
            throw new Error('No valid checklist items found. Ensure "Checklist Item" column has data.');
          }

          // Insert imported items
          const inserts = validItems.map((item: any, index: number) => ({
            procedure_id: procedureId,
            text: item.text,
            is_required: item.is_required,
            status: 'pending',
            sort_order: checklistItems.length + index,
          }));

          const { error } = await supabase
            .from('procedure_checklist_items')
            .insert(inserts);

          if (error) throw error;
          
          toast.success(`Imported ${inserts.length} checklist items`);
          await fetchItems();
          resolve(true);
        } catch (error: any) {
          toast.error(error.message || 'Failed to import checklist');
          resolve(false);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        resolve(false);
      };
      reader.readAsBinaryString(file);
    });
  };

  // Calculate progress
  const getProgress = useCallback((): ProcedureProgress => {
    const checklistDone = checklistItems.filter(i => i.status === 'done' || i.status === 'na').length;
    const checklistTotal = checklistItems.length;
    const checklistRequiredDone = checklistItems.filter(i => i.is_required && (i.status === 'done' || i.status === 'na')).length;
    const checklistRequiredTotal = checklistItems.filter(i => i.is_required).length;

    // For evidence, count how many requirements have at least one linked file
    const reqsWithEvidence = new Set(evidenceLinks.filter(l => l.evidence_requirement_id).map(l => l.evidence_requirement_id));
    const evidenceDone = evidenceRequirements.filter(r => reqsWithEvidence.has(r.id)).length;
    const evidenceTotal = evidenceRequirements.length;
    const evidenceRequiredDone = evidenceRequirements.filter(r => r.is_required && reqsWithEvidence.has(r.id)).length;
    const evidenceRequiredTotal = evidenceRequirements.filter(r => r.is_required).length;

    const isPrepared = 
      checklistRequiredTotal === checklistRequiredDone &&
      evidenceRequiredTotal === evidenceRequiredDone;

    return {
      checklist_done: checklistDone,
      checklist_total: checklistTotal,
      checklist_required_done: checklistRequiredDone,
      checklist_required_total: checklistRequiredTotal,
      evidence_done: evidenceDone,
      evidence_total: evidenceTotal,
      evidence_required_done: evidenceRequiredDone,
      evidence_required_total: evidenceRequiredTotal,
      is_prepared: isPrepared,
    };
  }, [checklistItems, evidenceRequirements, evidenceLinks]);

  // Add a new checklist item
  const addChecklistItem = async (text: string, isRequired: boolean = false) => {
    if (!procedureId || !user?.id) return null;

    try {
      const sortOrder = checklistItems.length;
      const { data, error } = await supabase
        .from('procedure_checklist_items')
        .insert({
          procedure_id: procedureId,
          text,
          is_required: isRequired,
          sort_order: sortOrder,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Checklist item added');
      await fetchItems();
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add checklist item');
      return null;
    }
  };

  // Delete a checklist item
  const deleteChecklistItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('procedure_checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Checklist item removed');
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove checklist item');
      return false;
    }
  };

  // Sync new items from template
  const syncFromTemplate = async () => {
    if (!procedureId || !templateId) return false;

    try {
      // Get template items
      const [templateChecklistRes, templateEvidenceRes] = await Promise.all([
        supabase
          .from('procedure_template_checklist_items')
          .select('*')
          .eq('procedure_template_id', templateId)
          .order('sort_order'),
        supabase
          .from('procedure_template_evidence_requirements')
          .select('*')
          .eq('procedure_template_id', templateId)
          .order('sort_order'),
      ]);

      if (templateChecklistRes.error) throw templateChecklistRes.error;
      if (templateEvidenceRes.error) throw templateEvidenceRes.error;

      const instanceChecklistTemplateIds = new Set(
        checklistItems.filter(i => i.template_item_id).map(i => i.template_item_id)
      );
      const instanceEvidenceTemplateIds = new Set(
        evidenceRequirements.filter(r => r.template_requirement_id).map(r => r.template_requirement_id)
      );

      // Insert new checklist items
      const newChecklistItems = (templateChecklistRes.data || []).filter(
        item => !instanceChecklistTemplateIds.has(item.id)
      );

      if (newChecklistItems.length > 0) {
        const maxSort = Math.max(0, ...checklistItems.map(i => i.sort_order));
        const inserts = newChecklistItems.map((item, idx) => ({
          procedure_id: procedureId,
          template_item_id: item.id,
          text: item.text,
          is_required: item.is_required,
          sort_order: maxSort + idx + 1,
          status: 'pending',
        }));

        const { error } = await supabase
          .from('procedure_checklist_items')
          .insert(inserts);

        if (error) throw error;
      }

      // Insert new evidence requirements
      const newEvidenceReqs = (templateEvidenceRes.data || []).filter(
        req => !instanceEvidenceTemplateIds.has(req.id)
      );

      if (newEvidenceReqs.length > 0) {
        const maxSort = Math.max(0, ...evidenceRequirements.map(r => r.sort_order));
        const inserts = newEvidenceReqs.map((req, idx) => ({
          procedure_id: procedureId,
          template_requirement_id: req.id,
          title: req.title,
          wp_ref: req.wp_ref,
          allowed_file_types: req.allowed_file_types || [],
          is_required: req.is_required,
          sort_order: maxSort + idx + 1,
        }));

        const { error } = await supabase
          .from('procedure_evidence_requirements')
          .insert(inserts);

        if (error) throw error;
      }

      toast.success(`Synced ${newChecklistItems.length} checklist items and ${newEvidenceReqs.length} evidence requirements`);
      await fetchItems();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync from template');
      return false;
    }
  };

  return {
    checklistItems,
    evidenceRequirements,
    evidenceLinks,
    loading,
    reordering,
    syncStatus,
    refetch: fetchItems,
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
  };
}

// Service function to instantiate checklist/evidence from template when creating a procedure
export async function instantiateProcedureFromTemplate(
  procedureId: string,
  templateId: string
): Promise<boolean> {
  try {
    // Fetch template items
    const [checklistRes, evidenceRes] = await Promise.all([
      supabase
        .from('procedure_template_checklist_items')
        .select('*')
        .eq('procedure_template_id', templateId)
        .order('sort_order'),
      supabase
        .from('procedure_template_evidence_requirements')
        .select('*')
        .eq('procedure_template_id', templateId)
        .order('sort_order'),
    ]);

    if (checklistRes.error) throw checklistRes.error;
    if (evidenceRes.error) throw evidenceRes.error;

    const templateChecklist = checklistRes.data || [];
    const templateEvidence = evidenceRes.data || [];

    // Create instance checklist items
    if (templateChecklist.length > 0) {
      const checklistInserts = templateChecklist.map(item => ({
        procedure_id: procedureId,
        template_item_id: item.id,
        text: item.text,
        is_required: item.is_required,
        sort_order: item.sort_order,
        status: 'pending',
      }));

      const { error: checklistError } = await supabase
        .from('procedure_checklist_items')
        .insert(checklistInserts);

      if (checklistError) throw checklistError;
    }

    // Create instance evidence requirements
    if (templateEvidence.length > 0) {
      const evidenceInserts = templateEvidence.map(req => ({
        procedure_id: procedureId,
        template_requirement_id: req.id,
        title: req.title,
        wp_ref: req.wp_ref,
        allowed_file_types: req.allowed_file_types || [],
        is_required: req.is_required,
        sort_order: req.sort_order,
      }));

      const { error: evidenceError } = await supabase
        .from('procedure_evidence_requirements')
        .insert(evidenceInserts);

      if (evidenceError) throw evidenceError;
    }

    return true;
  } catch (error) {
    console.error('Error instantiating procedure from template:', error);
    return false;
  }
}

// Get progress for multiple procedures (for Audit Programs list)
export async function getProceduresProgress(procedureIds: string[]): Promise<Map<string, ProcedureProgress>> {
  const progressMap = new Map<string, ProcedureProgress>();
  
  if (procedureIds.length === 0) return progressMap;

  try {
    const [checklistRes, evidenceReqRes, linksRes] = await Promise.all([
      supabase
        .from('procedure_checklist_items')
        .select('id, procedure_id, is_required, status')
        .in('procedure_id', procedureIds),
      supabase
        .from('procedure_evidence_requirements')
        .select('id, procedure_id, is_required')
        .in('procedure_id', procedureIds),
      supabase
        .from('evidence_links')
        .select('procedure_id, evidence_requirement_id')
        .in('procedure_id', procedureIds),
    ]);

    if (checklistRes.error) throw checklistRes.error;
    if (evidenceReqRes.error) throw evidenceReqRes.error;
    if (linksRes.error) throw linksRes.error;

    // Group by procedure_id
    const checklistByProc: Record<string, any[]> = {};
    const evidenceReqByProc: Record<string, any[]> = {};
    const linksByProc: Record<string, any[]> = {};

    (checklistRes.data || []).forEach(item => {
      if (!checklistByProc[item.procedure_id]) checklistByProc[item.procedure_id] = [];
      checklistByProc[item.procedure_id].push(item);
    });

    (evidenceReqRes.data || []).forEach(req => {
      if (!evidenceReqByProc[req.procedure_id]) evidenceReqByProc[req.procedure_id] = [];
      evidenceReqByProc[req.procedure_id].push(req);
    });

    (linksRes.data || []).forEach(link => {
      if (!linksByProc[link.procedure_id]) linksByProc[link.procedure_id] = [];
      linksByProc[link.procedure_id].push(link);
    });

    // Calculate progress for each procedure
    for (const procId of procedureIds) {
      const checklist = checklistByProc[procId] || [];
      const evidenceReqs = evidenceReqByProc[procId] || [];
      const links = linksByProc[procId] || [];

      const checklistDone = checklist.filter((i: any) => i.status === 'done' || i.status === 'na').length;
      const checklistTotal = checklist.length;
      const checklistRequiredDone = checklist.filter((i: any) => i.is_required && (i.status === 'done' || i.status === 'na')).length;
      const checklistRequiredTotal = checklist.filter((i: any) => i.is_required).length;

      const reqsWithEvidence = new Set(links.filter((l: any) => l.evidence_requirement_id).map((l: any) => l.evidence_requirement_id));
      const evidenceDone = evidenceReqs.filter((r: any) => reqsWithEvidence.has(r.id)).length;
      const evidenceTotal = evidenceReqs.length;
      const evidenceRequiredDone = evidenceReqs.filter((r: any) => r.is_required && reqsWithEvidence.has(r.id)).length;
      const evidenceRequiredTotal = evidenceReqs.filter((r: any) => r.is_required).length;

      const isPrepared = 
        checklistRequiredTotal === checklistRequiredDone &&
        evidenceRequiredTotal === evidenceRequiredDone;

      progressMap.set(procId, {
        checklist_done: checklistDone,
        checklist_total: checklistTotal,
        checklist_required_done: checklistRequiredDone,
        checklist_required_total: checklistRequiredTotal,
        evidence_done: evidenceDone,
        evidence_total: evidenceTotal,
        evidence_required_done: evidenceRequiredDone,
        evidence_required_total: evidenceRequiredTotal,
        is_prepared: isPrepared,
      });
    }

    return progressMap;
  } catch (error) {
    console.error('Error fetching procedures progress:', error);
    return progressMap;
  }
}
