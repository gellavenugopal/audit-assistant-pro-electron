import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();

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

  const logActivity = async (action: string, entity: string, details: string, entityId?: string, logEngagementId?: string) => {
    if (!user || !profile) return;
    await db.from('activity_logs').insert({
      user_id: user.id,
      user_name: profile.full_name,
      action,
      entity,
      entity_id: entityId || null,
      engagement_id: logEngagementId || null,
      details,
    }).execute();
  };

  const fetchRisks = async () => {
    try {
      let query = db
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (engagementId) {
        query = query.eq('engagement_id', engagementId);
      }

      const { data, error } = await query.execute();
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
      const { data, error } = await db
        .from('risks')
        .insert({ ...risk, created_by: user.id })
        .execute();

      if (error) throw error;
      
      const newRisk = Array.isArray(data) ? data[0] : data;
      if (!newRisk) {
        throw new Error('Failed to create risk (no data returned)');
      }
      
      // Log activity
      await logActivity('Created', 'Risk', `Created risk: ${risk.risk_area}`, newRisk.id, risk.engagement_id);
      
      toast.success('Risk created successfully');
      await fetchRisks();
      return newRisk;
    } catch (error: any) {
      console.error('Error creating risk:', error);
      toast.error(error.message || 'Failed to create risk');
      return null;
    }
  };

  const updateRisk = async (id: string, updates: Partial<Risk>) => {
    try {
      const { error } = await db
        .from('risks')
        .update(updates)
        .eq('id', id)
        .execute();

      if (error) throw error;
      
      // Log activity
      const risk = risks.find(r => r.id === id);
      await logActivity('Updated', 'Risk', `Updated risk`, id, risk?.engagement_id);
      
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
      const { error } = await db
        .from('risks')
        .delete()
        .eq('id', id)
        .execute();

      if (error) throw error;
      
      // Log activity
      await logActivity('Deleted', 'Risk', `Deleted risk: ${risk?.risk_area || 'Unknown'}`, id, risk?.engagement_id);
      
      toast.success('Risk deleted');
      await fetchRisks();
    } catch (error: any) {
      console.error('Error deleting risk:', error);
      toast.error(error.message || 'Failed to delete risk');
    }
  };

  useEffect(() => {
    fetchRisks();

    // Real-time subscriptions not available in SQLite
    // Use polling if real-time updates are needed
    // const interval = setInterval(fetchRisks, 30000);
    // return () => clearInterval(interval);
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
