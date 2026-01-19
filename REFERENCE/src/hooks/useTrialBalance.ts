import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TrialBalanceLine {
  id: string;
  engagement_id: string;
  branch_name: string | null;
  account_code: string;
  account_name: string;
  ledger_parent: string | null;
  ledger_primary_group: string | null;
  opening_balance: number;
  debit: number;
  credit: number;
  closing_balance: number;
  balance_type: string | null;
  aile: string | null;
  fs_area: string | null;
  note: string | null;
  period_type: string;
  period_ending: string | null;
  // 5-Level FS Hierarchy
  face_group: string | null;
  note_group: string | null;
  sub_note: string | null;
  level4_group: string | null;
  level5_detail: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrialBalanceLineInput {
  branch_name?: string | null;
  account_code: string;
  account_name: string;
  ledger_parent?: string | null;
  ledger_primary_group?: string | null;
  opening_balance: number;
  debit: number;
  credit: number;
  closing_balance: number;
  balance_type?: string | null;
  aile?: string | null;
  fs_area?: string | null;
  note?: string | null;
  period_type?: string;
  period_ending?: string | null;
  // 5-Level FS Hierarchy
  face_group?: string | null;
  note_group?: string | null;
  sub_note?: string | null;
  level4_group?: string | null;
  level5_detail?: string | null;
}

export function useTrialBalance(engagementId: string | undefined) {
  const [lines, setLines] = useState<TrialBalanceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVersion, setCurrentVersion] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLines = async () => {
    if (!engagementId) {
      setLines([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trial_balance_lines')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('branch_name', { ascending: true, nullsFirst: true })
        .order('account_code', { ascending: true });

      if (error) throw error;
      
      setLines(data || []);
      
      // Get max version
      if (data && data.length > 0) {
        const maxVersion = Math.max(...data.map(l => l.version));
        setCurrentVersion(maxVersion);
      }
    } catch (error: any) {
      console.error('Error fetching trial balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trial balance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLines();
  }, [engagementId]);

  const addLine = async (input: TrialBalanceLineInput) => {
    if (!engagementId || !user) return null;

    try {
      const { data, error } = await supabase
        .from('trial_balance_lines')
        .insert({
          engagement_id: engagementId,
          ...input,
          version: currentVersion,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setLines(prev => [...prev, data]);
      toast({
        title: 'Success',
        description: 'Trial balance line added',
      });
      return data;
    } catch (error: any) {
      console.error('Error adding line:', error);
      toast({
        title: 'Error',
        description: 'Failed to add trial balance line',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateLine = async (id: string, input: Partial<TrialBalanceLineInput>) => {
    try {
      const { data, error } = await supabase
        .from('trial_balance_lines')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLines(prev => prev.map(line => line.id === id ? data : line));
      toast({
        title: 'Success',
        description: 'Trial balance line updated',
      });
      return data;
    } catch (error: any) {
      console.error('Error updating line:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trial balance line',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteLine = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trial_balance_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLines(prev => prev.filter(line => line.id !== id));
      toast({
        title: 'Success',
        description: 'Trial balance line deleted',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting line:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trial balance line',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteLines = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('trial_balance_lines')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setLines(prev => prev.filter(line => !ids.includes(line.id)));
      toast({
        title: 'Success',
        description: `Deleted ${ids.length} trial balance line(s)`,
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting lines:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trial balance lines',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateLines = async (ids: string[], input: Partial<TrialBalanceLineInput>) => {
    try {
      const { error } = await supabase
        .from('trial_balance_lines')
        .update(input)
        .in('id', ids);

      if (error) throw error;

      setLines(prev => prev.map(line => 
        ids.includes(line.id) ? { ...line, ...input } : line
      ));
      toast({
        title: 'Success',
        description: `Updated ${ids.length} trial balance line(s)`,
      });
      return true;
    } catch (error: any) {
      console.error('Error updating lines:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trial balance lines',
        variant: 'destructive',
      });
      return false;
    }
  };

  const importLines = async (data: TrialBalanceLineInput[], upsertMode: boolean = true, showToast: boolean = true) => {
    if (!engagementId || !user) return false;

    try {
      const newVersion = currentVersion + 1;
      
      if (upsertMode) {
        // Get existing lines for matching
        const existingLines = lines;
        
        const linesToUpsert = data.map(line => ({
          engagement_id: engagementId,
          ...line,
          version: newVersion,
          created_by: user.id,
        }));

        // Find duplicates based on branch_name + account_code combination
        const duplicateKeys = new Set<string>();
        for (const line of linesToUpsert) {
          const key = `${line.branch_name || ''}_${line.account_code}`;
          for (const existing of existingLines) {
            const existingKey = `${existing.branch_name || ''}_${existing.account_code}`;
            if (key === existingKey) {
              duplicateKeys.add(existing.id);
            }
          }
        }

        // Delete duplicates
        if (duplicateKeys.size > 0) {
          const { error: deleteError } = await supabase
            .from('trial_balance_lines')
            .delete()
            .in('id', Array.from(duplicateKeys));

          if (deleteError) throw deleteError;
        }

        // Insert new/updated lines
        const { error: insertError } = await supabase
          .from('trial_balance_lines')
          .insert(linesToUpsert);

        if (insertError) throw insertError;
      } else {
        // Delete all existing lines and insert fresh (original behavior)
        const { error: deleteError } = await supabase
          .from('trial_balance_lines')
          .delete()
          .eq('engagement_id', engagementId);

        if (deleteError) throw deleteError;

        const linesToInsert = data.map(line => ({
          engagement_id: engagementId,
          ...line,
          version: newVersion,
          created_by: user.id,
        }));

        const { error: insertError } = await supabase
          .from('trial_balance_lines')
          .insert(linesToInsert);

        if (insertError) throw insertError;
      }

      setCurrentVersion(newVersion);
      await fetchLines();
      
      if (showToast) {
        toast({
          title: 'Success',
          description: `Imported ${data.length} lines as Version ${newVersion}${upsertMode ? ' (duplicates updated)' : ''}`,
        });
      }
      return true;
    } catch (error: any) {
      console.error('Error importing lines:', error);
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to import trial balance',
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  return {
    lines,
    loading,
    currentVersion,
    addLine,
    updateLine,
    deleteLine,
    deleteLines,
    updateLines,
    importLines,
    refetch: fetchLines,
  };
}
