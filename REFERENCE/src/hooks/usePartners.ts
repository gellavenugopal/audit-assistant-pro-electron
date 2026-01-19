import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Partner {
  id: string;
  name: string;
  membership_number: string;
  email: string | null;
  phone: string | null;
  pan: string | null;
  date_of_joining: string;
  date_of_exit: string | null;
  is_active: boolean;
  user_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPartnerById = (id: string) => {
    return partners.find(p => p.id === id) || null;
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  return {
    partners,
    loading,
    getPartnerById,
    refetch: fetchPartners,
  };
}
