import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CAROClause } from './useCAROClauseLibrary';

const db = getSQLiteClient();

export interface CAROStandardAnswer {
  id: string;
  clause_id: string;
  positive_wording: string | null;
  negative_wording: string | null;
  na_wording: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useCAROStandardAnswers() {
  const [standardAnswers, setStandardAnswers] = useState<CAROStandardAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStandardAnswers = async () => {
    try {
      const { data, error } = await db
        .from('caro_standard_answers')
        .select('*')
        .execute();

      if (error) throw error;
      setStandardAnswers(data || []);
    } catch (error) {
      console.error('Error fetching CARO standard answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWording = (
    clauseId: string, 
    type: 'positive' | 'negative' | 'na',
    clauses: CAROClause[]
  ): string | null => {
    // First check custom answers
    const customAnswer = standardAnswers.find(a => a.clause_id === clauseId);
    if (customAnswer) {
      const wording = type === 'positive' 
        ? customAnswer.positive_wording
        : type === 'negative'
        ? customAnswer.negative_wording
        : customAnswer.na_wording;
      if (wording) return wording;
    }

    // Fallback to library default
    const clause = clauses.find(c => c.clause_id === clauseId);
    if (clause) {
      return type === 'positive' 
        ? clause.positive_wording
        : type === 'negative'
        ? clause.negative_wording
        : clause.na_wording;
    }

    return null;
  };

  const saveStandardAnswer = async (
    clauseId: string,
    positiveWording: string | null,
    negativeWording: string | null,
    naWording: string | null
  ) => {
    if (!user) return null;

    const existingAnswer = standardAnswers.find(a => a.clause_id === clauseId);

    try {
      if (existingAnswer) {
        const { data, error } = await supabase
          .from('caro_standard_answers')
          .update({
            positive_wording: positiveWording,
            negative_wording: negativeWording,
            na_wording: naWording,
          })
          .eq('id', existingAnswer.id)
          .select()
          .single();

        if (error) throw error;
        setStandardAnswers(prev => prev.map(a => a.id === data.id ? data : a));
        toast.success('Standard answer updated');
        return data;
      } else {
        const { data, error } = await supabase
          .from('caro_standard_answers')
          .insert({
            clause_id: clauseId,
            positive_wording: positiveWording,
            negative_wording: negativeWording,
            na_wording: naWording,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        setStandardAnswers(prev => [...prev, data]);
        toast.success('Standard answer saved');
        return data;
      }
    } catch (error: any) {
      console.error('Error saving standard answer:', error);
      toast.error(error.message || 'Failed to save standard answer');
      return null;
    }
  };

  const resetToDefault = async (clauseId: string) => {
    const existingAnswer = standardAnswers.find(a => a.clause_id === clauseId);
    if (!existingAnswer) return;

    try {
      const { error } = await supabase
        .from('caro_standard_answers')
        .delete()
        .eq('id', existingAnswer.id);

      if (error) throw error;
      setStandardAnswers(prev => prev.filter(a => a.id !== existingAnswer.id));
      toast.success('Reset to default wording');
    } catch (error: any) {
      console.error('Error resetting standard answer:', error);
      toast.error(error.message || 'Failed to reset');
    }
  };

  const getCustomAnswer = (clauseId: string) => {
    return standardAnswers.find(a => a.clause_id === clauseId);
  };

  useEffect(() => {
    fetchStandardAnswers();
  }, []);

  return {
    standardAnswers,
    loading,
    getWording,
    saveStandardAnswer,
    resetToDefault,
    getCustomAnswer,
    refetch: fetchStandardAnswers,
  };
}
