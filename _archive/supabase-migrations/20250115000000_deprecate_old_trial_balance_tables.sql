-- ============================================================================
-- DEPRECATION NOTICE: Old Trial Balance Module Tables
-- ============================================================================
-- 
-- This migration documents database tables related to the OLD Trial Balance
-- module that should be deleted in the future. These tables are NO LONGER
-- used by the new "Trial Balance New" module.
--
-- IMPORTANT: DO NOT EXECUTE THIS MIGRATION YET
-- This file is for documentation purposes only. The actual deletion should
-- be performed after:
-- 1. Confirming no other modules depend on these tables
-- 2. Backing up any existing data
-- 3. Migrating any critical data to the new module if needed
-- 4. Getting approval from stakeholders
--
-- Date Created: 2025-01-15
-- Reason: Trial Balance module replaced by "Trial Balance New" module
-- ============================================================================

-- ============================================================================
-- TABLES TO DELETE (in order of dependencies)
-- ============================================================================

-- 1. Rule Engine Tables (depend on aile_rule_sets)
-- These tables store rule engine configurations for the old Trial Balance
DROP TABLE IF EXISTS public.rule_engine_validation_rules CASCADE;
DROP TABLE IF EXISTS public.rule_engine_group_rules CASCADE;
DROP TABLE IF EXISTS public.rule_engine_keyword_rules CASCADE;
DROP TABLE IF EXISTS public.rule_engine_override_rules CASCADE;

-- 2. Schedule III Configuration
-- Per-engagement configuration for Schedule III reporting
DROP TABLE IF EXISTS public.schedule_iii_config CASCADE;

-- 3. AILE Mapping Rules (depend on aile_rule_sets)
-- Mapping rules for AILE/FS Area classification
DROP TABLE IF EXISTS public.aile_mapping_rules CASCADE;

-- 4. AILE Rule Sets
-- Rule sets container for mapping rules
DROP TABLE IF EXISTS public.aile_rule_sets CASCADE;

-- 5. Trial Balance Lines (MAIN TABLE)
-- The core table storing trial balance line items
-- WARNING: This contains actual trial balance data. Ensure backup before deletion.
DROP TABLE IF EXISTS public.trial_balance_lines CASCADE;

-- ============================================================================
-- RELATED INDEXES (will be dropped automatically with tables)
-- ============================================================================
-- The following indexes will be automatically dropped:
-- - idx_trial_balance_engagement
-- - idx_trial_balance_version
-- - idx_trial_balance_branch_name
-- - idx_trial_balance_period_type
-- - idx_aile_mapping_rules_rule_set
-- - idx_aile_mapping_rules_priority

-- ============================================================================
-- RELATED TRIGGERS (will be dropped automatically with tables)
-- ============================================================================
-- The following triggers will be automatically dropped:
-- - update_trial_balance_lines_updated_at
-- - update_aile_rule_sets_updated_at
-- - update_aile_mapping_rules_updated_at
-- - update_schedule_iii_config_updated_at
-- - update_override_rules_updated_at
-- - update_keyword_rules_updated_at
-- - update_group_rules_updated_at

-- ============================================================================
-- RELATED RLS POLICIES (will be dropped automatically with tables)
-- ============================================================================
-- All RLS policies on the above tables will be automatically dropped

-- ============================================================================
-- VERIFICATION QUERIES (run before deletion to check dependencies)
-- ============================================================================

-- Check if any other tables reference trial_balance_lines
-- SELECT 
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE constraint_type = 'FOREIGN KEY' 
--   AND ccu.table_name = 'trial_balance_lines';

-- Check row counts before deletion (for backup reference)
-- SELECT 'trial_balance_lines' as table_name, COUNT(*) as row_count FROM public.trial_balance_lines
-- UNION ALL
-- SELECT 'aile_rule_sets', COUNT(*) FROM public.aile_rule_sets
-- UNION ALL
-- SELECT 'aile_mapping_rules', COUNT(*) FROM public.aile_mapping_rules
-- UNION ALL
-- SELECT 'schedule_iii_config', COUNT(*) FROM public.schedule_iii_config
-- UNION ALL
-- SELECT 'rule_engine_override_rules', COUNT(*) FROM public.rule_engine_override_rules
-- UNION ALL
-- SELECT 'rule_engine_keyword_rules', COUNT(*) FROM public.rule_engine_keyword_rules
-- UNION ALL
-- SELECT 'rule_engine_group_rules', COUNT(*) FROM public.rule_engine_group_rules
-- UNION ALL
-- SELECT 'rule_engine_validation_rules', COUNT(*) FROM public.rule_engine_validation_rules;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The new "Trial Balance New" module uses in-memory state and does NOT
--    persist to these database tables. It uses its own data structure.
--
-- 2. If you need to migrate data from old to new module, create a separate
--    migration script for that purpose.
--
-- 3. Consider archiving the data before deletion if it contains historical
--    audit information that may be needed for compliance.
--
-- 4. The route /trial-balance is still accessible but hidden from navigation.
--    The page component TrialBalance.tsx still exists but is deprecated.
--
-- ============================================================================

