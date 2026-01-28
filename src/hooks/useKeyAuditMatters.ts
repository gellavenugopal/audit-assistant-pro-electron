import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();

export interface KeyAuditMatter {
  id: string;
  engagement_id: string;
  title: string;
  description: string;
  audit_response: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useKeyAuditMatters(engagementId: string | undefined) {
  const [kams, setKams] = useState<KeyAuditMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchKams = async () => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await db
        .from('key_audit_matters')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('sort_order', { ascending: true })
        .execute();

      if (error) throw error;
      setKams(data || []);
    } catch (error) {
      console.error('Error fetching KAMs:', error);
    } finally {
      setLoading(false);
    }
  };

  const createKam = async (data: Partial<KeyAuditMatter>) => {
    if (!engagementId || !user) return null;

    try {
      const { data: kamData, error } = await db
        .from('key_audit_matters')
        .insert({
          engagement_id: engagementId,
          title: data.title || 'New Key Audit Matter',
          description: data.description || '',
          audit_response: data.audit_response || '',
          sort_order: kams.length,
          created_by: user.id,
        })
        .execute();

      if (error) throw error;
      const newKam = Array.isArray(kamData) ? kamData[0] : kamData;
      if (!newKam) throw new Error('Failed to create KAM');
      
      setKams(prev => [...prev, newKam]);
      toast.success('Key Audit Matter added');
      return newKam;
    } catch (error: any) {
      console.error('Error creating KAM:', error);
      toast.error(error.message || 'Failed to create KAM');
      return null;
    }
  };

  const updateKam = async (id: string, data: Partial<KeyAuditMatter>) => {
    try {
      const { error } = await db
        .from('key_audit_matters')
        .update(data)
        .eq('id', id)
        .execute();

      if (error) throw error;
      
      // Fetch updated record
      const { data: updated } = await db
        .from('key_audit_matters')
        .select('*')
        .eq('id', id)
        .single();
      
      if (updated) {
        setKams(prev => prev.map(k => k.id === id ? updated : k));
      }
      toast.success('Key Audit Matter updated');
      return updated;
    } catch (error: any) {
      console.error('Error updating KAM:', error);
      toast.error(error.message || 'Failed to update KAM');
      return null;
    }
  };

  const deleteKam = async (id: string) => {
    try {
      const { error } = await db
        .from('key_audit_matters')
        .delete()
        .eq('id', id)
        .execute();

      if (error) throw error;
      setKams(prev => prev.filter(k => k.id !== id));
      toast.success('Key Audit Matter deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting KAM:', error);
      toast.error(error.message || 'Failed to delete KAM');
      return false;
    }
  };

  useEffect(() => {
    fetchKams();
  }, [engagementId]);

  return {
    kams,
    loading,
    createKam,
    updateKam,
    deleteKam,
    refetch: fetchKams,
  };
}
