import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface ScheduleIIIConfig {
  id: string;
  engagementId: string;
  startNoteNumber: number;
  includeContingentLiabilities: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useScheduleIIIConfig(engagementId: string | null) {
  const [config, setConfig] = useState<ScheduleIIIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchConfig = useCallback(async () => {
    if (!engagementId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedule_iii_config')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          engagementId: data.engagement_id,
          startNoteNumber: data.start_note_number,
          includeContingentLiabilities: data.include_contingent_liabilities,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      } else {
        setConfig(null);
      }
    } catch (error) {
      console.error('Error fetching Schedule III config:', error);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const createConfig = async (startNoteNumber: number = 1, includeContingentLiabilities: boolean = true) => {
    if (!engagementId || !user?.id) {
      toast.error('Missing engagement or user');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('schedule_iii_config')
        .insert({
          engagement_id: engagementId,
          start_note_number: startNoteNumber,
          include_contingent_liabilities: includeContingentLiabilities,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const newConfig: ScheduleIIIConfig = {
        id: data.id,
        engagementId: data.engagement_id,
        startNoteNumber: data.start_note_number,
        includeContingentLiabilities: data.include_contingent_liabilities,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setConfig(newConfig);
      toast.success('Configuration created');
      return newConfig;
    } catch (error) {
      console.error('Error creating config:', error);
      toast.error('Failed to create configuration');
      return null;
    }
  };

  const updateConfig = async (updates: Partial<Pick<ScheduleIIIConfig, 'startNoteNumber' | 'includeContingentLiabilities'>>) => {
    if (!config?.id) {
      toast.error('No configuration to update');
      return false;
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.startNoteNumber !== undefined) {
        updateData.start_note_number = updates.startNoteNumber;
      }
      if (updates.includeContingentLiabilities !== undefined) {
        updateData.include_contingent_liabilities = updates.includeContingentLiabilities;
      }

      const { error } = await supabase
        .from('schedule_iii_config')
        .update(updateData)
        .eq('id', config.id);

      if (error) throw error;

      setConfig(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Configuration updated');
      return true;
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
      return false;
    }
  };

  const getOrCreateConfig = async () => {
    if (config) return config;
    return createConfig();
  };

  return {
    config,
    loading,
    createConfig,
    updateConfig,
    getOrCreateConfig,
    refetch: fetchConfig
  };
}
