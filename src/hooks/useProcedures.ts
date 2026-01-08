import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ChecklistItemInstance, 
  EvidenceRequirementInstance,
  parseChecklistItems,
  parseEvidenceRequirements 
} from '@/types/procedureTemplate';

export interface AuditProcedure {
  id: string;
  engagement_id: string;
  area: string;
  procedure_name: string;
  description: string | null;
  assertion: string | null;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_date: string | null;
  workpaper_ref: string | null;
  conclusion: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string } | null;
  // Approval workflow fields
  approval_stage: 'draft' | 'prepared' | 'reviewed' | 'approved';
  prepared_by: string | null;
  prepared_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  unlock_reason: string | null;
  // Workpaper fields from template
  template_id: string | null;
  checklist_items: ChecklistItemInstance[];
  evidence_requirements: EvidenceRequirementInstance[];
  conclusion_prompt: string | null;
}

export function useProcedures(engagementId?: string) {
  const [procedures, setProcedures] = useState<AuditProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, role } = useAuth();

  const logActivity = async (action: string, entity: string, details: string, entityId?: string, logEngagementId?: string) => {
    if (!user || !profile) return;
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      user_name: profile.full_name,
      action,
      entity,
      entity_id: entityId || null,
      engagement_id: logEngagementId || null,
      details,
    }]);
  };

  const logAuditTrail = async (
    entityType: string,
    entityId: string,
    action: string,
    oldValue?: string,
    newValue?: string,
    reason?: string
  ) => {
    if (!user) return;
    await supabase.from('audit_trail').insert([{
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_value: oldValue || null,
      new_value: newValue || null,
      reason: reason || null,
      performed_by: user.id,
    }]);
  };

  const fetchProcedures = async () => {
    try {
      let query = supabase
        .from('audit_procedures')
        .select(`
          *,
          assignee:profiles!audit_procedures_assigned_to_fkey(full_name)
        `)
        .order('area', { ascending: true })
        .order('created_at', { ascending: false });

      if (engagementId) {
        query = query.eq('engagement_id', engagementId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Parse JSONB fields safely and cast approval_stage
      const parsedData = (data || []).map(row => ({
        ...row,
        approval_stage: (row.approval_stage || 'draft') as 'draft' | 'prepared' | 'reviewed' | 'approved',
        checklist_items: parseChecklistItems(row.checklist_items) as ChecklistItemInstance[],
        evidence_requirements: parseEvidenceRequirements(row.evidence_requirements) as EvidenceRequirementInstance[],
        conclusion_prompt: row.conclusion_prompt || null,
        template_id: row.template_id || null,
      })) as AuditProcedure[];
      
      setProcedures(parsedData);
    } catch (error) {
      console.error('Error fetching procedures:', error);
      toast.error('Failed to load procedures');
    } finally {
      setLoading(false);
    }
  };

  interface CreateProcedureInput {
    engagement_id: string;
    area: string;
    procedure_name: string;
    description: string | null;
    assertion: string | null;
    assigned_to: string | null;
    due_date: string | null;
    status: string;
    workpaper_ref: string | null;
    completed_date: string | null;
    conclusion: string | null;
    template_id?: string | null;
    checklist_items?: ChecklistItemInstance[];
    evidence_requirements?: EvidenceRequirementInstance[];
    conclusion_prompt?: string | null;
  }

  const createProcedure = async (procedure: CreateProcedureInput) => {
    if (!user) return null;

    try {
      const insertPayload: Record<string, unknown> = {
        ...procedure,
        created_by: user.id,
        checklist_items: procedure.checklist_items || [],
        evidence_requirements: procedure.evidence_requirements || [],
        template_id: procedure.template_id || null,
        conclusion_prompt: procedure.conclusion_prompt || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('audit_procedures') as any)
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      
      await logActivity('Created', 'Procedure', `Created procedure: ${procedure.procedure_name}`, data.id, procedure.engagement_id);
      
      toast.success('Procedure created successfully');
      await fetchProcedures();
      return data;
    } catch (error: any) {
      console.error('Error creating procedure:', error);
      toast.error(error.message || 'Failed to create procedure');
      return null;
    }
  };

  const updateProcedure = async (id: string, updates: Partial<CreateProcedureInput>) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('audit_procedures') as any)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      const action = updates.status === 'completed' || updates.status === 'done' 
        ? 'Completed' 
        : updates.status === 'reviewed' 
          ? 'Reviewed' 
          : 'Updated';
      const procedure = procedures.find(p => p.id === id);
      await logActivity(action, 'Procedure', `${action} procedure`, id, procedure?.engagement_id);
      
      toast.success('Procedure updated');
      await fetchProcedures();
    } catch (error: any) {
      console.error('Error updating procedure:', error);
      toast.error(error.message || 'Failed to update procedure');
    }
  };

  const deleteProcedure = async (id: string) => {
    const procedure = procedures.find(p => p.id === id);
    try {
      const { error } = await supabase
        .from('audit_procedures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await logActivity('Deleted', 'Procedure', `Deleted procedure: ${procedure?.procedure_name || 'Unknown'}`, id, procedure?.engagement_id);
      
      toast.success('Procedure deleted');
      await fetchProcedures();
    } catch (error: any) {
      console.error('Error deleting procedure:', error);
      toast.error(error.message || 'Failed to delete procedure');
    }
  };

  // Approval workflow actions
  const markPrepared = async (id: string) => {
    const procedure = procedures.find(p => p.id === id);
    if (!procedure) return;

    try {
      const { error } = await supabase
        .from('audit_procedures')
        .update({ approval_stage: 'prepared' })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('audit_procedure', id, 'marked_prepared', procedure.approval_stage, 'prepared');
      await logActivity('Prepared', 'Procedure', `Marked procedure as prepared: ${procedure.procedure_name}`, id, procedure.engagement_id);
      
      toast.success('Procedure marked as prepared');
      await fetchProcedures();
    } catch (error: any) {
      console.error('Error marking prepared:', error);
      toast.error(error.message || 'Failed to mark as prepared');
    }
  };

  const markReviewed = async (id: string) => {
    const procedure = procedures.find(p => p.id === id);
    if (!procedure) return;

    if (role !== 'partner' && role !== 'manager') {
      toast.error('Only Partner/Manager can mark as reviewed');
      return;
    }

    try {
      const { error } = await supabase
        .from('audit_procedures')
        .update({ approval_stage: 'reviewed' })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('audit_procedure', id, 'marked_reviewed', procedure.approval_stage, 'reviewed');
      await logActivity('Reviewed', 'Procedure', `Marked procedure as reviewed: ${procedure.procedure_name}`, id, procedure.engagement_id);
      
      toast.success('Procedure marked as reviewed');
      await fetchProcedures();
    } catch (error: any) {
      console.error('Error marking reviewed:', error);
      toast.error(error.message || 'Failed to mark as reviewed');
    }
  };

  const approveProcedure = async (id: string) => {
    const procedure = procedures.find(p => p.id === id);
    if (!procedure) return;

    if (role !== 'partner' && role !== 'manager') {
      toast.error('Only Partner/Manager can approve');
      return;
    }

    try {
      const { error } = await supabase
        .from('audit_procedures')
        .update({ approval_stage: 'approved' })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('audit_procedure', id, 'approved', procedure.approval_stage, 'approved');
      await logActivity('Approved', 'Procedure', `Approved procedure: ${procedure.procedure_name}`, id, procedure.engagement_id);
      
      toast.success('Procedure approved and locked');
      await fetchProcedures();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error(error.message || 'Failed to approve');
    }
  };

  const unlockProcedure = async (id: string, reason: string) => {
    const procedure = procedures.find(p => p.id === id);
    if (!procedure) return;

    if (role !== 'partner' && role !== 'manager') {
      toast.error('Only Partner/Manager can unlock');
      return;
    }

    if (!reason.trim()) {
      toast.error('Unlock reason is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('audit_procedures')
        .update({ 
          locked: false, 
          unlock_reason: reason,
          approval_stage: 'reviewed' // Reset to reviewed after unlock
        })
        .eq('id', id);

      if (error) throw error;

      await logAuditTrail('audit_procedure', id, 'unlocked', 'locked', 'unlocked', reason);
      await logActivity('Unlocked', 'Procedure', `Unlocked procedure: ${procedure.procedure_name}. Reason: ${reason}`, id, procedure.engagement_id);
      
      toast.success('Procedure unlocked');
      await fetchProcedures();
    } catch (error: any) {
      console.error('Error unlocking:', error);
      toast.error(error.message || 'Failed to unlock');
    }
  };

  useEffect(() => {
    fetchProcedures();

    const channel = supabase
      .channel('procedures-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_procedures' }, () => {
        fetchProcedures();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagementId]);

  return {
    procedures,
    loading,
    createProcedure,
    updateProcedure,
    deleteProcedure,
    markPrepared,
    markReviewed,
    approveProcedure,
    unlockProcedure,
    refetch: fetchProcedures,
    canReview: role === 'partner' || role === 'manager',
    canApprove: role === 'partner' || role === 'manager',
    canUnlock: role === 'partner' || role === 'manager',
  };
}
