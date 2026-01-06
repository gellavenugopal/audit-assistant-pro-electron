import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProcedureAssignee {
  id: string;
  procedure_id: string;
  user_id: string;
  assigned_by: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export function useProcedureAssignees(procedureId?: string) {
  const { user } = useAuth();
  const [assignees, setAssignees] = useState<ProcedureAssignee[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignees = useCallback(async () => {
    if (!procedureId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedure_assignees')
        .select('*')
        .eq('procedure_id', procedureId);

      if (error) throw error;
      setAssignees(data || []);
    } catch (error) {
      console.error('Error fetching assignees:', error);
    } finally {
      setLoading(false);
    }
  }, [procedureId]);

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  const setAssigneesForProcedure = async (procedureId: string, userIds: string[]) => {
    if (!user?.id) return false;

    try {
      // Get current assignees
      const { data: current } = await supabase
        .from('procedure_assignees')
        .select('user_id')
        .eq('procedure_id', procedureId);

      const currentIds = (current || []).map(a => a.user_id);
      
      // Find additions and removals
      const toAdd = userIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !userIds.includes(id));

      // Remove old assignees
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('procedure_assignees')
          .delete()
          .eq('procedure_id', procedureId)
          .in('user_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add new assignees
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('procedure_assignees')
          .insert(
            toAdd.map(userId => ({
              procedure_id: procedureId,
              user_id: userId,
              assigned_by: user.id,
            }))
          );

        if (addError) throw addError;
      }

      await fetchAssignees();
      return true;
    } catch (error: any) {
      console.error('Error updating assignees:', error);
      toast.error('Failed to update assignees');
      return false;
    }
  };

  const getAssigneeIds = useCallback(() => {
    return assignees.map(a => a.user_id);
  }, [assignees]);

  return {
    assignees,
    loading,
    setAssigneesForProcedure,
    getAssigneeIds,
    refetch: fetchAssignees,
  };
}

// Bulk fetch assignees for multiple procedures
export function useBulkProcedureAssignees() {
  const [assigneesMap, setAssigneesMap] = useState<Record<string, ProcedureAssignee[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchAllAssignees = useCallback(async (procedureIds: string[]) => {
    if (procedureIds.length === 0) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedure_assignees')
        .select('*')
        .in('procedure_id', procedureIds);

      if (error) throw error;

      // Group by procedure_id
      const map: Record<string, ProcedureAssignee[]> = {};
      (data || []).forEach(assignee => {
        if (!map[assignee.procedure_id]) {
          map[assignee.procedure_id] = [];
        }
        map[assignee.procedure_id].push(assignee);
      });
      
      setAssigneesMap(map);
    } catch (error) {
      console.error('Error fetching bulk assignees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAssigneesForProcedure = useCallback((procedureId: string) => {
    return assigneesMap[procedureId] || [];
  }, [assigneesMap]);

  return {
    assigneesMap,
    loading,
    fetchAllAssignees,
    getAssigneesForProcedure,
  };
}
