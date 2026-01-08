import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Engagement {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string;
  engagement_type: string;
  status: string;
  financial_year: string;
  start_date: string | null;
  end_date: string | null;
  partner_id: string | null;
  manager_id: string | null;
  materiality_amount: number | null;
  performance_materiality: number | null;
  trivial_threshold: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  partner?: { full_name: string } | null;
  manager?: { full_name: string } | null;
}

export function useEngagements() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

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

  const fetchEngagements = async () => {
    try {
      const { data, error } = await supabase
        .from('engagements')
        .select(`
          *,
          partner:profiles!engagements_partner_id_fkey(full_name),
          manager:profiles!engagements_manager_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEngagements(data || []);
    } catch (error) {
      console.error('Error fetching engagements:', error);
      toast.error('Failed to load engagements');
    } finally {
      setLoading(false);
    }
  };

  const createEngagement = async (engagement: Omit<Engagement, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'partner' | 'manager'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('engagements')
        .insert({ ...engagement, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
      await logActivity('Created', 'Engagement', `Created engagement: ${engagement.name}`, data.id, data.id);
      
      toast.success('Engagement created successfully');
      await fetchEngagements();
      return data;
    } catch (error: any) {
      console.error('Error creating engagement:', error);
      toast.error(error.message || 'Failed to create engagement');
      return null;
    }
  };

  const updateEngagement = async (id: string, updates: Partial<Engagement>) => {
    try {
      const { error } = await supabase
        .from('engagements')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Log activity
      await logActivity('Updated', 'Engagement', `Updated engagement`, id, id);
      
      toast.success('Engagement updated');
      await fetchEngagements();
    } catch (error: any) {
      console.error('Error updating engagement:', error);
      toast.error(error.message || 'Failed to update engagement');
    }
  };

  const deleteEngagement = async (id: string) => {
    const engagement = engagements.find(e => e.id === id);
    try {
      const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Log activity
      await logActivity('Deleted', 'Engagement', `Deleted engagement: ${engagement?.name || 'Unknown'}`, id, id);
      
      toast.success('Engagement deleted');
      await fetchEngagements();
    } catch (error: any) {
      console.error('Error deleting engagement:', error);
      toast.error(error.message || 'Failed to delete engagement');
    }
  };

  useEffect(() => {
    fetchEngagements();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('engagements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagements' }, () => {
        fetchEngagements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    engagements,
    loading,
    createEngagement,
    updateEngagement,
    deleteEngagement,
    refetch: fetchEngagements,
  };
}
