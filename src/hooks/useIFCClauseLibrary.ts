import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IFCClause {
  id: string;
  clause_id: string;
  clause_title: string;
  clause_description: string | null;
  parent_clause_id: string | null;
  sort_order: number;
  category: string | null;
  control_objective: string | null;
  key_controls: any[];
  testing_procedures: any[];
  positive_wording: string | null;
  negative_wording: string | null;
  qualified_wording: string | null;
  limitation_wording: string | null;
  evidence_checklist: any[];
  red_flags: any[];
  reviewer_prompts: any[];
  is_active: boolean;
}

export function useIFCClauseLibrary() {
  const [clauses, setClauses] = useState<IFCClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClauses();
  }, []);

  const fetchClauses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ifc_clause_library')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setClauses(data || []);
    } catch (err: any) {
      console.error('Error fetching IFC clauses:', err);
      setError(err.message);
      toast.error('Failed to load IFC clause library');
    } finally {
      setLoading(false);
    }
  };

  return { clauses, loading, error, refetch: fetchClauses };
}
