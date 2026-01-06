import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Risk {
  id: string;
  engagement_id: string;
  risk_area: string;
  description: string;
  risk_type: string;
  inherent_risk: string;
  control_risk: string;
  combined_risk: string;
  key_controls: string | null;
  audit_response: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useRisks(engagementId?: string) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const logActivity = async (action: string, entity: string, details: string, entityId?: string) => {
    if (!user || !profile) return;
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      user_name: profile.full_name,
      action,
      entity,
      entity_id: entityId || null,
      details,
    }]);
  };

  const fetchRisks = async () => {
    try {
      let query = supabase
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (engagementId) {
        query = query.eq('engagement_id', engagementId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRisks(data || []);
    } catch (error) {
      console.error('Error fetching risks:', error);
      toast.error('Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  const createRisk = async (risk: Omit<Risk, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('risks')
        .insert({ ...risk, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
      await logActivity('Created', 'Risk', `Created risk: ${risk.risk_area}`, data.id);
      
      toast.success('Risk created successfully');
      await fetchRisks();
      return data;
    } catch (error: any) {
      console.error('Error creating risk:', error);
      toast.error(error.message || 'Failed to create risk');
      return null;
    }
  };

  const updateRisk = async (id: string, updates: Partial<Risk>) => {
    try {
      const { error } = await supabase
        .from('risks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Log activity
      await logActivity('Updated', 'Risk', `Updated risk`, id);
      
      toast.success('Risk updated');
      await fetchRisks();
    } catch (error: any) {
      console.error('Error updating risk:', error);
      toast.error(error.message || 'Failed to update risk');
    }
  };

  const deleteRisk = async (id: string) => {
    const risk = risks.find(r => r.id === id);
    try {
      const { error } = await supabase
        .from('risks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Log activity
      await logActivity('Deleted', 'Risk', `Deleted risk: ${risk?.risk_area || 'Unknown'}`, id);
      
      toast.success('Risk deleted');
      await fetchRisks();
    } catch (error: any) {
      console.error('Error deleting risk:', error);
      toast.error(error.message || 'Failed to delete risk');
    }
  };

  useEffect(() => {
    fetchRisks();

    const channel = supabase
      .channel('risks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risks' }, () => {
        fetchRisks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagementId]);

  return {
    risks,
    loading,
    createRisk,
    updateRisk,
    deleteRisk,
    refetch: fetchRisks,
  };
}
