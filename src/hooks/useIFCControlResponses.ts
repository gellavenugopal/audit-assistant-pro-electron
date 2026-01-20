import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { toast } from 'sonner';

const db = getSQLiteClient();

export interface IFCControlResponse {
  id: string;
  engagement_id: string;
  clause_id: string;
  is_applicable: boolean;
  na_reason: string | null;
  design_effectiveness: string | null;
  operating_effectiveness: string | null;
  control_deficiencies: any[];
  compensating_controls: string | null;
  testing_results: string | null;
  conclusion_text: string | null;
  exceptions_text: string | null;
  working_paper_refs: any[];
  management_response_captured: boolean;
  management_response: string | null;
  status: string;
  prepared_by: string | null;
  prepared_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  version_number: number;
  created_at: string;
  updated_at: string;
}

export function useIFCControlResponses(engagementId: string | undefined) {
  const [responses, setResponses] = useState<IFCControlResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (engagementId) {
      fetchResponses();
    }
  }, [engagementId]);

  const fetchResponses = async () => {
    if (!engagementId) return;
    
    try {
      setLoading(true);
      const { data, error } = await db
        .from('ifc_control_responses')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('clause_id', { ascending: true })
        .execute();

      if (error) throw error;
      setResponses(data || []);
    } catch (err: any) {
      console.error('Error fetching IFC responses:', err);
      setError(err.message);
      toast.error('Failed to load IFC control responses');
    } finally {
      setLoading(false);
    }
  };

  const saveResponse = async (
    clauseId: string,
    responseData: Partial<IFCControlResponse>
  ) => {
    if (!engagementId) return false;

    try {
      const existing = responses.find(r => r.clause_id === clauseId);
      
      if (existing) {
        const { error } = await db
          .from('ifc_control_responses')
          .eq('id', existing.id)
          .update({
            ...responseData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ifc_control_responses')
          .insert({
            engagement_id: engagementId,
            clause_id: clauseId,
            ...responseData,
          });

        if (error) throw error;
      }

      await fetchResponses();
      toast.success('IFC control response saved');
      return true;
    } catch (err: any) {
      console.error('Error saving IFC response:', err);
      toast.error('Failed to save IFC control response');
      return false;
    }
  };

  const getResponseForClause = (clauseId: string): IFCControlResponse | undefined => {
    return responses.find(r => r.clause_id === clauseId);
  };

  const getCompletionStats = () => {
    const total = responses.length;
    const completed = responses.filter(r => r.status === 'completed').length;
    const inProgress = responses.filter(r => r.status === 'in_progress').length;
    const notStarted = responses.filter(r => r.status === 'not_started').length;
    
    return {
      total,
      completed,
      inProgress,
      notStarted,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  return {
    responses,
    loading,
    error,
    saveResponse,
    getResponseForClause,
    getCompletionStats,
    refetch: fetchResponses,
  };
}
