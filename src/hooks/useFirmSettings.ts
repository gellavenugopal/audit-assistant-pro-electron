import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();

export interface FirmSettings {
  id: string;
  firm_name: string;
  firm_registration_no: string | null;
  constitution: string | null;
  no_of_partners: number | null;
  icai_unique_sl_no: string | null;
  address: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useFirmSettings() {
  const [firmSettings, setFirmSettings] = useState<FirmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFirmSettings = async () => {
    try {
      const { data, error } = await db
        .from('firm_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setFirmSettings(data);
    } catch (error) {
      console.error('Error fetching firm settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFirmSettings = async (data: Partial<FirmSettings>) => {
    if (!user) return null;

    try {
      if (firmSettings) {
        // Update existing
        const { data: updated, error } = await db
          .from('firm_settings')
          .eq('id', firmSettings.id)
          .update(data);

        if (error) throw error;
        setFirmSettings(updated);
        toast.success('Firm settings saved');
        return updated;
      } else {
        // Create new
        const { data: created, error } = await db
          .from('firm_settings')
          .insert({
            ...data,
            firm_name: data.firm_name || 'My Firm',
            created_by: user.id,
          });

        if (error) throw error;
        setFirmSettings(created);
        toast.success('Firm settings created');
        return created;
      }
    } catch (error: any) {
      console.error('Error saving firm settings:', error);
      toast.error(error.message || 'Failed to save firm settings');
      return null;
    }
  };

  useEffect(() => {
    fetchFirmSettings();
  }, []);

  return {
    firmSettings,
    loading,
    saveFirmSettings,
    refetch: fetchFirmSettings,
  };
}
