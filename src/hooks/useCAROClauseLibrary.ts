import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';

const db = getSQLiteClient();

export interface CAROClause {
  id: string;
  clause_id: string;
  clause_title: string;
  clause_description: string | null;
  parent_clause_id: string | null;
  sort_order: number;
  applicability_conditions: any;
  applies_to_cfs: boolean;
  questions: any;
  follow_up_questions: any;
  required_tables: any;
  positive_wording: string | null;
  negative_wording: string | null;
  qualified_wording: string | null;
  na_wording: string | null;
  evidence_checklist: any;
  red_flags: any;
  reviewer_prompts: any;
  is_active: boolean;
}

export function useCAROClauseLibrary() {
  const [clauses, setClauses] = useState<CAROClause[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClauses = async () => {
    try {
      const { data, error } = await db
        .from('caro_clause_library')
        .select('*')
        .eq('is_active', 1)
        .order('sort_order', { ascending: true })
        .execute();

      if (error) throw error;
      setClauses(data || []);
    } catch (error) {
      console.error('Error fetching CARO clauses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClauses();
  }, []);

  return {
    clauses,
    loading,
    refetch: fetchClauses,
  };
}
