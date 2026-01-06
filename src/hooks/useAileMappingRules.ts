import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { COMPREHENSIVE_LEDGER_RULES } from '@/data/financialStatementFormats';

export interface AileRuleSet {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AileMappingRule {
  id: string;
  rule_set_id: string;
  priority: number;
  match_field: 'ledger_primary_group' | 'ledger_parent' | 'account_name' | 'account_code';
  match_pattern: string;
  match_type: 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';
  target_aile: 'Asset' | 'Income' | 'Liability' | 'Expense';
  target_fs_area: string;
  is_active: boolean;
  // 5-Level FS Hierarchy
  target_face_group: string | null;
  target_note_group: string | null;
  target_sub_note: string | null;
  // Balance Logic
  has_balance_logic: boolean;
  negative_face_group: string | null;
  negative_note_group: string | null;
  negative_sub_note: string | null;
  positive_face_group: string | null;
  positive_note_group: string | null;
  positive_sub_note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AileMappingRuleInput {
  rule_set_id: string;
  priority: number;
  match_field: string;
  match_pattern: string;
  match_type: string;
  target_aile: string;
  target_fs_area: string;
  is_active?: boolean;
  // 5-Level FS Hierarchy
  target_face_group?: string | null;
  target_note_group?: string | null;
  target_sub_note?: string | null;
  // Balance Logic
  has_balance_logic?: boolean;
  negative_face_group?: string | null;
  negative_note_group?: string | null;
  negative_sub_note?: string | null;
  positive_face_group?: string | null;
  positive_note_group?: string | null;
  positive_sub_note?: string | null;
}

// Default rules - combines original rules with comprehensive ledger rules
export const DEFAULT_MAPPING_RULES: Omit<AileMappingRuleInput, 'rule_set_id'>[] = [
  // Original Tally ledger group rules
  { priority: 100, match_field: 'ledger_primary_group', match_pattern: 'Fixed Assets', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 99, match_field: 'ledger_primary_group', match_pattern: 'Investments', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Investments' },
  { priority: 98, match_field: 'ledger_primary_group', match_pattern: 'Stock-in-Hand', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Inventory' },
  { priority: 97, match_field: 'ledger_primary_group', match_pattern: 'Inventory', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Inventory' },
  { priority: 96, match_field: 'ledger_primary_group', match_pattern: 'Sundry Debtors', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Receivables' },
  { priority: 95, match_field: 'ledger_primary_group', match_pattern: 'Trade Receivables', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Receivables' },
  { priority: 94, match_field: 'ledger_primary_group', match_pattern: 'Cash-in-Hand', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 93, match_field: 'ledger_primary_group', match_pattern: 'Bank Accounts', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 92, match_field: 'ledger_primary_group', match_pattern: 'Bank OD', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Short Term Borrowings' },
  { priority: 91, match_field: 'ledger_primary_group', match_pattern: 'Deposits', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },
  { priority: 90, match_field: 'ledger_primary_group', match_pattern: 'Loans & Advances', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },
  { priority: 89, match_field: 'ledger_primary_group', match_pattern: 'Current Assets', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },

  // Liabilities
  { priority: 85, match_field: 'ledger_primary_group', match_pattern: 'Capital Account', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 84, match_field: 'ledger_primary_group', match_pattern: 'Share Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 83, match_field: 'ledger_primary_group', match_pattern: 'Reserves', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 82, match_field: 'ledger_primary_group', match_pattern: 'Surplus', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 81, match_field: 'ledger_primary_group', match_pattern: 'Secured Loans', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 80, match_field: 'ledger_primary_group', match_pattern: 'Unsecured Loans', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 79, match_field: 'ledger_primary_group', match_pattern: 'Loans (Liability)', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 78, match_field: 'ledger_primary_group', match_pattern: 'Sundry Creditors', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Payables' },
  { priority: 77, match_field: 'ledger_primary_group', match_pattern: 'Trade Payables', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Payables' },
  { priority: 76, match_field: 'ledger_primary_group', match_pattern: 'Duties & Taxes', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 75, match_field: 'ledger_primary_group', match_pattern: 'Provisions', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Provisions' },
  { priority: 74, match_field: 'ledger_primary_group', match_pattern: 'Current Liabilities', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },

  // Income
  { priority: 70, match_field: 'ledger_primary_group', match_pattern: 'Sales Accounts', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 69, match_field: 'ledger_primary_group', match_pattern: 'Revenue', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 68, match_field: 'ledger_primary_group', match_pattern: 'Direct Incomes', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 67, match_field: 'ledger_primary_group', match_pattern: 'Indirect Incomes', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },

  // Expenses
  { priority: 60, match_field: 'ledger_primary_group', match_pattern: 'Purchase Accounts', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Cost of Materials' },
  { priority: 59, match_field: 'ledger_primary_group', match_pattern: 'Direct Expenses', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Cost of Materials' },
  { priority: 58, match_field: 'ledger_primary_group', match_pattern: 'Indirect Expenses', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  
  // Add comprehensive ledger rules from uploaded Excel
  ...COMPREHENSIVE_LEDGER_RULES,
];

export function useAileMappingRules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ruleSets, setRuleSets] = useState<AileRuleSet[]>([]);
  const [rules, setRules] = useState<AileMappingRule[]>([]);
  const [activeRuleSetId, setActiveRuleSetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRuleSets = useCallback(async () => {
    const { data, error } = await supabase
      .from('aile_rule_sets')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching rule sets:', error);
      return [];
    }
    return data as AileRuleSet[];
  }, []);

  const fetchRules = useCallback(async (ruleSetId: string) => {
    const { data, error } = await supabase
      .from('aile_mapping_rules')
      .select('*')
      .eq('rule_set_id', ruleSetId)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching rules:', error);
      return [];
    }
    return data as AileMappingRule[];
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const sets = await fetchRuleSets();
    setRuleSets(sets);
    
    // Select active rule set or first available
    const activeSet = sets.find(s => s.is_active && s.is_default) || sets.find(s => s.is_active) || sets[0];
    if (activeSet) {
      setActiveRuleSetId(activeSet.id);
      const rulesData = await fetchRules(activeSet.id);
      setRules(rulesData);
    }
    setLoading(false);
  }, [fetchRuleSets, fetchRules]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectRuleSet = useCallback(async (ruleSetId: string) => {
    setActiveRuleSetId(ruleSetId);
    const rulesData = await fetchRules(ruleSetId);
    setRules(rulesData);
  }, [fetchRules]);

  const createRuleSet = async (name: string, description?: string, isDefault: boolean = false) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('aile_rule_sets')
      .insert({
        name,
        description,
        is_default: isDefault,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating rule set',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    await loadData();
    toast({
      title: 'Rule set created',
      description: `"${name}" has been created.`,
    });
    return data as AileRuleSet;
  };

  const createDefaultRuleSet = async (name: string = 'Schedule III Rules', description: string = 'Standard AILE mapping rules for Companies (Schedule III)') => {
    if (!user) return null;

    // Create rule set
    const ruleSet = await createRuleSet(name, description, true);
    if (!ruleSet) return null;

    // Add all default rules
    const rulesToInsert = DEFAULT_MAPPING_RULES.map(rule => ({
      ...rule,
      rule_set_id: ruleSet.id,
      created_by: user.id,
    }));

    const { error } = await supabase
      .from('aile_mapping_rules')
      .insert(rulesToInsert);

    if (error) {
      toast({
        title: 'Error creating default rules',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    await loadData();
    return ruleSet;
  };

  const duplicateRuleSet = async (sourceRuleSetId: string, newName: string) => {
    if (!user) return null;

    // Fetch source rules
    const sourceRules = await fetchRules(sourceRuleSetId);

    // Create new rule set
    const newRuleSet = await createRuleSet(newName, `Duplicated from existing rule set`);
    if (!newRuleSet) return null;

    // Copy rules
    const rulesToInsert = sourceRules.map(rule => ({
      rule_set_id: newRuleSet.id,
      priority: rule.priority,
      match_field: rule.match_field,
      match_pattern: rule.match_pattern,
      match_type: rule.match_type,
      target_aile: rule.target_aile,
      target_fs_area: rule.target_fs_area,
      is_active: rule.is_active,
      created_by: user.id,
    }));

    if (rulesToInsert.length > 0) {
      const { error } = await supabase
        .from('aile_mapping_rules')
        .insert(rulesToInsert);

      if (error) {
        console.error('Error duplicating rules:', error);
      }
    }

    await loadData();
    return newRuleSet;
  };

  const deleteRuleSet = async (ruleSetId: string) => {
    const { error } = await supabase
      .from('aile_rule_sets')
      .delete()
      .eq('id', ruleSetId);

    if (error) {
      toast({
        title: 'Error deleting rule set',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Rule set deleted',
    });
    await loadData();
    return true;
  };

  const addRule = async (input: AileMappingRuleInput) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('aile_mapping_rules')
      .insert({
        ...input,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error adding rule',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    // Refresh rules if we're adding to active set
    if (input.rule_set_id === activeRuleSetId) {
      const rulesData = await fetchRules(activeRuleSetId);
      setRules(rulesData);
    }

    toast({
      title: 'Rule added',
    });
    return data as AileMappingRule;
  };

  const updateRule = async (ruleId: string, updates: Partial<AileMappingRuleInput>) => {
    const { error } = await supabase
      .from('aile_mapping_rules')
      .update(updates)
      .eq('id', ruleId);

    if (error) {
      toast({
        title: 'Error updating rule',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    if (activeRuleSetId) {
      const rulesData = await fetchRules(activeRuleSetId);
      setRules(rulesData);
    }
    return true;
  };

  const deleteRule = async (ruleId: string) => {
    const { error } = await supabase
      .from('aile_mapping_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      toast({
        title: 'Error deleting rule',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    if (activeRuleSetId) {
      const rulesData = await fetchRules(activeRuleSetId);
      setRules(rulesData);
    }
    return true;
  };

  const importRulesFromData = async (ruleSetId: string, rulesData: Omit<AileMappingRuleInput, 'rule_set_id'>[]) => {
    if (!user) return false;

    const rulesToInsert = rulesData.map(rule => ({
      ...rule,
      rule_set_id: ruleSetId,
      created_by: user.id,
    }));

    const { error } = await supabase
      .from('aile_mapping_rules')
      .insert(rulesToInsert);

    if (error) {
      toast({
        title: 'Error importing rules',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    if (ruleSetId === activeRuleSetId) {
      const rulesDataFetched = await fetchRules(activeRuleSetId);
      setRules(rulesDataFetched);
    }

    toast({
      title: 'Rules imported',
      description: `${rulesData.length} rules imported successfully.`,
    });
    return true;
  };

  const resetToDefault = async (ruleSetId: string) => {
    if (!user) return false;

    // Delete existing rules
    const { error: deleteError } = await supabase
      .from('aile_mapping_rules')
      .delete()
      .eq('rule_set_id', ruleSetId);

    if (deleteError) {
      toast({
        title: 'Error resetting rules',
        description: deleteError.message,
        variant: 'destructive',
      });
      return false;
    }

    // Re-add default rules
    const rulesToInsert = DEFAULT_MAPPING_RULES.map(rule => ({
      ...rule,
      rule_set_id: ruleSetId,
      created_by: user.id,
    }));

    const { error: insertError } = await supabase
      .from('aile_mapping_rules')
      .insert(rulesToInsert);

    if (insertError) {
      toast({
        title: 'Error resetting rules',
        description: insertError.message,
        variant: 'destructive',
      });
      return false;
    }

    if (ruleSetId === activeRuleSetId) {
      const rulesData = await fetchRules(activeRuleSetId);
      setRules(rulesData);
    }

    toast({
      title: 'Reset to default',
      description: 'Rules have been reset to default values.',
    });
    return true;
  };

  return {
    ruleSets,
    rules,
    activeRuleSetId,
    loading,
    selectRuleSet,
    createRuleSet,
    createDefaultRuleSet,
    duplicateRuleSet,
    deleteRuleSet,
    addRule,
    updateRule,
    deleteRule,
    importRulesFromData,
    resetToDefault,
    refetch: loadData,
  };
}
