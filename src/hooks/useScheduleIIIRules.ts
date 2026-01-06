import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DEFAULT_GROUP_RULES, 
  DEFAULT_KEYWORD_RULES, 
  DEFAULT_OVERRIDE_RULES,
  GroupRule as DefaultGroupRule,
  KeywordRule as DefaultKeywordRule,
  OverrideRule as DefaultOverrideRule
} from '@/data/scheduleIIIDefaultRules';

// ==========================================
// TYPES
// ==========================================

export interface OverrideRule {
  id: string;
  ruleSetId: string;
  ruleId: string;
  exactLedgerName: string;
  currentTallyGroup: string | null;
  overrideToCode: string;
  overrideToDescription: string | null;
  reasonForOverride: string | null;
  effectiveDate: string | null;
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: string;
}

export interface KeywordRule {
  id: string;
  ruleSetId: string;
  ruleId: string;
  keywordPattern: string;
  matchType: 'Contains' | 'Starts With' | 'Ends With';
  mapsToCode: string;
  mapsToDescription: string | null;
  priority: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface GroupRule {
  id: string;
  ruleSetId: string;
  ruleId: string;
  tallyGroupName: string;
  tallyParentGroup: string | null;
  mapsToCode: string;
  mapsToDescription: string | null;
  notes: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ValidationRule {
  id: string;
  ruleId: string;
  validationType: string;
  conditionDescription: string;
  action: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  messageTemplate: string;
  isActive: boolean;
}

// ==========================================
// HOOK
// ==========================================

export function useScheduleIIIRules(ruleSetId: string | null) {
  const [overrideRules, setOverrideRules] = useState<OverrideRule[]>([]);
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([]);
  const [groupRules, setGroupRules] = useState<GroupRule[]>([]);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // ==========================================
  // FETCH FUNCTIONS
  // ==========================================

  const fetchOverrideRules = useCallback(async () => {
    if (!ruleSetId) return [];

    const { data, error } = await supabase
      .from('rule_engine_override_rules')
      .select('*')
      .eq('rule_set_id', ruleSetId)
      .order('priority', { ascending: false });

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      ruleSetId: r.rule_set_id,
      ruleId: r.rule_id,
      exactLedgerName: r.exact_ledger_name,
      currentTallyGroup: r.current_tally_group,
      overrideToCode: r.override_to_code,
      overrideToDescription: r.override_to_description,
      reasonForOverride: r.reason_for_override,
      effectiveDate: r.effective_date,
      isActive: r.is_active,
      priority: r.priority,
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  }, [ruleSetId]);

  const fetchKeywordRules = useCallback(async () => {
    if (!ruleSetId) return [];

    const { data, error } = await supabase
      .from('rule_engine_keyword_rules')
      .select('*')
      .eq('rule_set_id', ruleSetId)
      .order('priority', { ascending: false });

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      ruleSetId: r.rule_set_id,
      ruleId: r.rule_id,
      keywordPattern: r.keyword_pattern,
      matchType: r.match_type as 'Contains' | 'Starts With' | 'Ends With',
      mapsToCode: r.maps_to_code,
      mapsToDescription: r.maps_to_description,
      priority: r.priority,
      isActive: r.is_active,
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  }, [ruleSetId]);

  const fetchGroupRules = useCallback(async () => {
    if (!ruleSetId) return [];

    const { data, error } = await supabase
      .from('rule_engine_group_rules')
      .select('*')
      .eq('rule_set_id', ruleSetId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      ruleSetId: r.rule_set_id,
      ruleId: r.rule_id,
      tallyGroupName: r.tally_group_name,
      tallyParentGroup: r.tally_parent_group,
      mapsToCode: r.maps_to_code,
      mapsToDescription: r.maps_to_description,
      notes: r.notes,
      isActive: r.is_active,
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  }, [ruleSetId]);

  const fetchValidationRules = useCallback(async () => {
    const { data, error } = await supabase
      .from('rule_engine_validation_rules')
      .select('*')
      .order('rule_id', { ascending: true });

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      ruleId: r.rule_id,
      validationType: r.validation_type,
      conditionDescription: r.condition_description,
      action: r.action,
      severity: r.severity as 'Critical' | 'High' | 'Medium' | 'Low',
      messageTemplate: r.message_template,
      isActive: r.is_active
    }));
  }, []);

  const fetchAllRules = useCallback(async () => {
    if (!ruleSetId) {
      setOverrideRules([]);
      setKeywordRules([]);
      setGroupRules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [override, keyword, group, validation] = await Promise.all([
        fetchOverrideRules(),
        fetchKeywordRules(),
        fetchGroupRules(),
        fetchValidationRules()
      ]);

      setOverrideRules(override);
      setKeywordRules(keyword);
      setGroupRules(group);
      setValidationRules(validation);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  }, [ruleSetId, fetchOverrideRules, fetchKeywordRules, fetchGroupRules, fetchValidationRules]);

  useEffect(() => {
    fetchAllRules();
  }, [fetchAllRules]);

  // ==========================================
  // OVERRIDE RULE OPERATIONS
  // ==========================================

  const addOverrideRule = async (rule: Omit<OverrideRule, 'id' | 'ruleSetId' | 'createdBy' | 'createdAt'>) => {
    if (!ruleSetId || !user?.id) {
      toast.error('Missing rule set or user');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('rule_engine_override_rules')
        .insert({
          rule_set_id: ruleSetId,
          rule_id: rule.ruleId,
          exact_ledger_name: rule.exactLedgerName,
          current_tally_group: rule.currentTallyGroup,
          override_to_code: rule.overrideToCode,
          override_to_description: rule.overrideToDescription,
          reason_for_override: rule.reasonForOverride,
          effective_date: rule.effectiveDate,
          is_active: rule.isActive,
          priority: rule.priority,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAllRules();
      toast.success('Override rule added');
      return data;
    } catch (error) {
      console.error('Error adding override rule:', error);
      toast.error('Failed to add override rule');
      return null;
    }
  };

  const updateOverrideRule = async (id: string, updates: Partial<OverrideRule>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.ruleId !== undefined) updateData.rule_id = updates.ruleId;
      if (updates.exactLedgerName !== undefined) updateData.exact_ledger_name = updates.exactLedgerName;
      if (updates.currentTallyGroup !== undefined) updateData.current_tally_group = updates.currentTallyGroup;
      if (updates.overrideToCode !== undefined) updateData.override_to_code = updates.overrideToCode;
      if (updates.overrideToDescription !== undefined) updateData.override_to_description = updates.overrideToDescription;
      if (updates.reasonForOverride !== undefined) updateData.reason_for_override = updates.reasonForOverride;
      if (updates.effectiveDate !== undefined) updateData.effective_date = updates.effectiveDate;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const { error } = await supabase
        .from('rule_engine_override_rules')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchAllRules();
      toast.success('Override rule updated');
      return true;
    } catch (error) {
      console.error('Error updating override rule:', error);
      toast.error('Failed to update override rule');
      return false;
    }
  };

  const deleteOverrideRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rule_engine_override_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAllRules();
      toast.success('Override rule deleted');
      return true;
    } catch (error) {
      console.error('Error deleting override rule:', error);
      toast.error('Failed to delete override rule');
      return false;
    }
  };

  // ==========================================
  // KEYWORD RULE OPERATIONS
  // ==========================================

  const addKeywordRule = async (rule: Omit<KeywordRule, 'id' | 'ruleSetId' | 'createdBy' | 'createdAt'>) => {
    if (!ruleSetId || !user?.id) {
      toast.error('Missing rule set or user');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('rule_engine_keyword_rules')
        .insert({
          rule_set_id: ruleSetId,
          rule_id: rule.ruleId,
          keyword_pattern: rule.keywordPattern,
          match_type: rule.matchType,
          maps_to_code: rule.mapsToCode,
          maps_to_description: rule.mapsToDescription,
          priority: rule.priority,
          is_active: rule.isActive,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAllRules();
      toast.success('Keyword rule added');
      return data;
    } catch (error) {
      console.error('Error adding keyword rule:', error);
      toast.error('Failed to add keyword rule');
      return null;
    }
  };

  const updateKeywordRule = async (id: string, updates: Partial<KeywordRule>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.ruleId !== undefined) updateData.rule_id = updates.ruleId;
      if (updates.keywordPattern !== undefined) updateData.keyword_pattern = updates.keywordPattern;
      if (updates.matchType !== undefined) updateData.match_type = updates.matchType;
      if (updates.mapsToCode !== undefined) updateData.maps_to_code = updates.mapsToCode;
      if (updates.mapsToDescription !== undefined) updateData.maps_to_description = updates.mapsToDescription;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('rule_engine_keyword_rules')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchAllRules();
      toast.success('Keyword rule updated');
      return true;
    } catch (error) {
      console.error('Error updating keyword rule:', error);
      toast.error('Failed to update keyword rule');
      return false;
    }
  };

  const deleteKeywordRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rule_engine_keyword_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAllRules();
      toast.success('Keyword rule deleted');
      return true;
    } catch (error) {
      console.error('Error deleting keyword rule:', error);
      toast.error('Failed to delete keyword rule');
      return false;
    }
  };

  // ==========================================
  // GROUP RULE OPERATIONS
  // ==========================================

  const addGroupRule = async (rule: Omit<GroupRule, 'id' | 'ruleSetId' | 'createdBy' | 'createdAt'>) => {
    if (!ruleSetId || !user?.id) {
      toast.error('Missing rule set or user');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('rule_engine_group_rules')
        .insert({
          rule_set_id: ruleSetId,
          rule_id: rule.ruleId,
          tally_group_name: rule.tallyGroupName,
          tally_parent_group: rule.tallyParentGroup,
          maps_to_code: rule.mapsToCode,
          maps_to_description: rule.mapsToDescription,
          notes: rule.notes,
          is_active: rule.isActive,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAllRules();
      toast.success('Group rule added');
      return data;
    } catch (error) {
      console.error('Error adding group rule:', error);
      toast.error('Failed to add group rule');
      return null;
    }
  };

  const updateGroupRule = async (id: string, updates: Partial<GroupRule>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.ruleId !== undefined) updateData.rule_id = updates.ruleId;
      if (updates.tallyGroupName !== undefined) updateData.tally_group_name = updates.tallyGroupName;
      if (updates.tallyParentGroup !== undefined) updateData.tally_parent_group = updates.tallyParentGroup;
      if (updates.mapsToCode !== undefined) updateData.maps_to_code = updates.mapsToCode;
      if (updates.mapsToDescription !== undefined) updateData.maps_to_description = updates.mapsToDescription;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('rule_engine_group_rules')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchAllRules();
      toast.success('Group rule updated');
      return true;
    } catch (error) {
      console.error('Error updating group rule:', error);
      toast.error('Failed to update group rule');
      return false;
    }
  };

  const deleteGroupRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rule_engine_group_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAllRules();
      toast.success('Group rule deleted');
      return true;
    } catch (error) {
      console.error('Error deleting group rule:', error);
      toast.error('Failed to delete group rule');
      return false;
    }
  };

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  const importDefaultRules = async () => {
    if (!ruleSetId || !user?.id) {
      toast.error('Missing rule set or user');
      return false;
    }

    try {
      // Import group rules
      const groupInserts = DEFAULT_GROUP_RULES.map((r: DefaultGroupRule) => ({
        rule_set_id: ruleSetId,
        rule_id: r.ruleId,
        tally_group_name: r.tallyGroupName,
        tally_parent_group: r.tallyParentGroup,
        maps_to_code: r.mapsToCode,
        maps_to_description: r.mapsToDescription,
        notes: r.notes,
        is_active: true,
        created_by: user.id
      }));

      const { error: groupError } = await supabase
        .from('rule_engine_group_rules')
        .insert(groupInserts);

      if (groupError) throw groupError;

      // Import keyword rules
      const keywordInserts = DEFAULT_KEYWORD_RULES.map((r: DefaultKeywordRule) => ({
        rule_set_id: ruleSetId,
        rule_id: r.ruleId,
        keyword_pattern: r.keywordPattern,
        match_type: r.matchType,
        maps_to_code: r.mapsToCode,
        maps_to_description: r.mapsToDescription,
        priority: r.priority,
        is_active: true,
        created_by: user.id
      }));

      const { error: keywordError } = await supabase
        .from('rule_engine_keyword_rules')
        .insert(keywordInserts);

      if (keywordError) throw keywordError;

      // Import override rules
      const overrideInserts = DEFAULT_OVERRIDE_RULES.map((r: DefaultOverrideRule) => ({
        rule_set_id: ruleSetId,
        rule_id: r.ruleId,
        exact_ledger_name: r.exactLedgerName,
        current_tally_group: r.currentTallyGroup,
        override_to_code: r.overrideToCode,
        override_to_description: r.overrideToDescription,
        reason_for_override: r.reasonForOverride,
        effective_date: r.effectiveDate,
        is_active: true,
        priority: 100,
        created_by: user.id
      }));

      const { error: overrideError } = await supabase
        .from('rule_engine_override_rules')
        .insert(overrideInserts);

      if (overrideError) throw overrideError;

      await fetchAllRules();
      toast.success('Default rules imported');
      return true;
    } catch (error) {
      console.error('Error importing default rules:', error);
      toast.error('Failed to import default rules');
      return false;
    }
  };

  const clearAllRules = async () => {
    if (!ruleSetId) {
      toast.error('No rule set selected');
      return false;
    }

    try {
      await Promise.all([
        supabase.from('rule_engine_override_rules').delete().eq('rule_set_id', ruleSetId),
        supabase.from('rule_engine_keyword_rules').delete().eq('rule_set_id', ruleSetId),
        supabase.from('rule_engine_group_rules').delete().eq('rule_set_id', ruleSetId)
      ]);

      await fetchAllRules();
      toast.success('All rules cleared');
      return true;
    } catch (error) {
      console.error('Error clearing rules:', error);
      toast.error('Failed to clear rules');
      return false;
    }
  };

  return {
    overrideRules,
    keywordRules,
    groupRules,
    validationRules,
    loading,
    // Override operations
    addOverrideRule,
    updateOverrideRule,
    deleteOverrideRule,
    // Keyword operations
    addKeywordRule,
    updateKeywordRule,
    deleteKeywordRule,
    // Group operations
    addGroupRule,
    updateGroupRule,
    deleteGroupRule,
    // Bulk operations
    importDefaultRules,
    clearAllRules,
    refetch: fetchAllRules
  };
}
