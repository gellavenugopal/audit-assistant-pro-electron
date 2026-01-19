import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialYear {
  id: string;
  year_code: string;
  display_name: string;
  is_active: boolean;
}

export function useFinancialYears() {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinancialYears = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_years')
        .select('id, year_code, display_name, is_active')
        .eq('is_active', true)
        .order('year_code', { ascending: false });

      if (error) throw error;
      setFinancialYears(data || []);
    } catch (error) {
      console.error('Error fetching financial years:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  return { financialYears, loading, refetch: fetchFinancialYears };
}
