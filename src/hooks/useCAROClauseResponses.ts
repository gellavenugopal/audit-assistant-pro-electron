import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();

export interface CAROClauseResponse {
  id: string;
  engagement_id: string;
  clause_id: string;
  is_applicable: boolean;
  na_reason: string | null;
  answers: any;
  conclusion_text: string | null;
  exceptions_text: string | null;
  working_paper_refs: any;
  table_data: any;
  impacts_main_report: boolean;
  impact_description: string | null;
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

export function useCAROClauseResponses(engagementId: string | undefined) {
  const [responses, setResponses] = useState<CAROClauseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchResponses = async () => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await db
        .from('caro_clause_responses')
        .select('*')
        .eq('engagement_id', engagementId)
        .execute();

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching CARO responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveResponse = async (clauseId: string, data: Partial<CAROClauseResponse>) => {
    if (!engagementId || !user) return null;

    const existingResponse = responses.find(r => r.clause_id === clauseId);

    try {
      if (existingResponse) {
        const { error } = await db
          .from('caro_clause_responses')
          .update({
            ...data,
            version_number: existingResponse.version_number + 1,
          })
          .eq('id', existingResponse.id)
          .execute();

        if (error) throw error;
        
        // Fetch updated record
        const { data: updated } = await db
          .from('caro_clause_responses')
          .select('*')
          .eq('id', existingResponse.id)
          .single();
        
        if (updated) {
          setResponses(prev => prev.map(r => r.id === updated.id ? updated : r));
        }
        return updated;
      } else {
        const { data: insertedData, error } = await db
          .from('caro_clause_responses')
          .insert({
            engagement_id: engagementId,
            clause_id: clauseId,
            ...data,
          })
          .execute();

        if (error) throw error;
        const created = Array.isArray(insertedData) ? insertedData[0] : insertedData;
        if (created) {
          setResponses(prev => [...prev, created]);
        }
        return created;
      }
    } catch (error: any) {
      console.error('Error saving CARO response:', error);
      toast.error(error.message || 'Failed to save response');
      return null;
    }
  };

  const getResponseForClause = (clauseId: string) => {
    return responses.find(r => r.clause_id === clauseId);
  };

  const markAsPrepared = async (clauseId: string) => {
    if (!user) return null;
    return saveResponse(clauseId, {
      status: 'ready_for_review',
      prepared_by: user.id,
      prepared_at: new Date().toISOString(),
    });
  };

  const markAsReviewed = async (clauseId: string) => {
    if (!user) return null;
    return saveResponse(clauseId, {
      status: 'final',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });
  };

  useEffect(() => {
    fetchResponses();
  }, [engagementId]);

  return {
    responses,
    loading,
    saveResponse,
    getResponseForClause,
    markAsPrepared,
    markAsReviewed,
    refetch: fetchResponses,
  };
}
