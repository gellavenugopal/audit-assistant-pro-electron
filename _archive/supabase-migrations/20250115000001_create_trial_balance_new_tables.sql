-- ============================================================================
-- Trial Balance New Module - Database Tables
-- ============================================================================
-- 
-- This migration creates all database tables required for the "Trial Balance New"
-- module. These tables are completely independent from the old trial_balance_lines
-- table and use a different data structure optimized for the new module.
--
-- Date Created: 2025-01-15
-- Module: Trial Balance New
-- ============================================================================

-- ============================================================================
-- 1. TB NEW ENTITY INFO
-- ============================================================================
-- Stores entity type, business type, and company information per engagement
CREATE TABLE public.tb_new_entity_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  business_type TEXT,
  company_name TEXT,
  company_address TEXT,
  company_state TEXT,
  company_pincode TEXT,
  company_gst TEXT,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  odbc_port TEXT DEFAULT '9000',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, version)
);

-- Enable RLS
ALTER TABLE public.tb_new_entity_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view entity info for their engagements"
  ON public.tb_new_entity_info FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create entity info for their engagements"
  ON public.tb_new_entity_info FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update entity info for their engagements"
  ON public.tb_new_entity_info FOR UPDATE
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete entity info"
  ON public.tb_new_entity_info FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Indexes
CREATE INDEX idx_tb_new_entity_info_engagement ON public.tb_new_entity_info(engagement_id);
CREATE INDEX idx_tb_new_entity_info_version ON public.tb_new_entity_info(engagement_id, version);

-- Trigger for updated_at
CREATE TRIGGER update_tb_new_entity_info_updated_at
  BEFORE UPDATE ON public.tb_new_entity_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. TB NEW LEDGERS
-- ============================================================================
-- Main table storing trial balance ledger entries (LedgerRow structure)
CREATE TABLE public.tb_new_ledgers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  entity_info_id UUID NOT NULL REFERENCES public.tb_new_entity_info(id) ON DELETE CASCADE,
  ledger_name TEXT NOT NULL,
  primary_group TEXT NOT NULL,
  parent_group TEXT,
  composite_key TEXT NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  is_revenue TEXT DEFAULT 'No',
  -- Classification Hierarchy (H1-H5)
  h1 TEXT, -- Statement: Balance Sheet / P&L Account
  h2 TEXT, -- Category: Assets, Liabilities, Equity, Income, Expenses
  h3 TEXT, -- Sub-Category: e.g., PPE & IA (Net), Trade Receivables
  h4 TEXT, -- Line Item: e.g., Cash on Hand, Unsecured Considered Good
  h5 TEXT, -- Detail: Additional detail if required
  -- Status and Validation
  status TEXT DEFAULT 'Unmapped', -- Mapped, Unmapped, Error
  errors TEXT,
  verified TEXT,
  notes TEXT,
  sheet_name TEXT DEFAULT 'TB CY',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tb_new_ledgers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view ledgers for their engagements"
  ON public.tb_new_ledgers FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create ledgers for their engagements"
  ON public.tb_new_ledgers FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update ledgers for their engagements"
  ON public.tb_new_ledgers FOR UPDATE
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete ledgers"
  ON public.tb_new_ledgers FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Indexes
CREATE INDEX idx_tb_new_ledgers_engagement ON public.tb_new_ledgers(engagement_id);
CREATE INDEX idx_tb_new_ledgers_entity_info ON public.tb_new_ledgers(entity_info_id);
CREATE INDEX idx_tb_new_ledgers_composite_key ON public.tb_new_ledgers(composite_key);
CREATE INDEX idx_tb_new_ledgers_status ON public.tb_new_ledgers(status);
CREATE INDEX idx_tb_new_ledgers_h1_h2 ON public.tb_new_ledgers(h1, h2);
CREATE INDEX idx_tb_new_ledgers_version ON public.tb_new_ledgers(engagement_id, version);

-- Trigger for updated_at
CREATE TRIGGER update_tb_new_ledgers_updated_at
  BEFORE UPDATE ON public.tb_new_ledgers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. TB NEW STOCK ITEMS
-- ============================================================================
-- Stores stock/inventory items with their classification
CREATE TABLE public.tb_new_stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  entity_info_id UUID NOT NULL REFERENCES public.tb_new_entity_info(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  stock_group TEXT NOT NULL,
  primary_group TEXT NOT NULL,
  opening_value NUMERIC NOT NULL DEFAULT 0,
  closing_value NUMERIC NOT NULL DEFAULT 0,
  stock_category TEXT, -- Raw Material, Finished Goods, etc.
  composite_key TEXT NOT NULL,
  sheet_name TEXT DEFAULT 'Stock Items',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tb_new_stock_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view stock items for their engagements"
  ON public.tb_new_stock_items FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create stock items for their engagements"
  ON public.tb_new_stock_items FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update stock items for their engagements"
  ON public.tb_new_stock_items FOR UPDATE
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete stock items"
  ON public.tb_new_stock_items FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Indexes
CREATE INDEX idx_tb_new_stock_items_engagement ON public.tb_new_stock_items(engagement_id);
CREATE INDEX idx_tb_new_stock_items_entity_info ON public.tb_new_stock_items(entity_info_id);
CREATE INDEX idx_tb_new_stock_items_composite_key ON public.tb_new_stock_items(composite_key);
CREATE INDEX idx_tb_new_stock_items_category ON public.tb_new_stock_items(stock_category);
CREATE INDEX idx_tb_new_stock_items_version ON public.tb_new_stock_items(engagement_id, version);

-- Trigger for updated_at
CREATE TRIGGER update_tb_new_stock_items_updated_at
  BEFORE UPDATE ON public.tb_new_stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. TB NEW CLASSIFICATION MAPPINGS
-- ============================================================================
-- Stores user-saved classification mappings (overrides default rules)
-- This is the persisted version of savedMappings from the component
CREATE TABLE public.tb_new_classification_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  composite_key TEXT NOT NULL, -- Format: "LedgerName|PrimaryGroup"
  ledger_name TEXT NOT NULL,
  primary_group TEXT NOT NULL,
  -- Classification Hierarchy
  h1 TEXT NOT NULL, -- Statement
  h2 TEXT NOT NULL, -- Category
  h3 TEXT, -- Sub-Category
  h4 TEXT, -- Line Item
  h5 TEXT, -- Detail
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, composite_key)
);

-- Enable RLS
ALTER TABLE public.tb_new_classification_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view mappings for their engagements"
  ON public.tb_new_classification_mappings FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create mappings for their engagements"
  ON public.tb_new_classification_mappings FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update mappings for their engagements"
  ON public.tb_new_classification_mappings FOR UPDATE
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can delete their own mappings"
  ON public.tb_new_classification_mappings FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Indexes
CREATE INDEX idx_tb_new_mappings_engagement ON public.tb_new_classification_mappings(engagement_id);
CREATE INDEX idx_tb_new_mappings_composite_key ON public.tb_new_classification_mappings(composite_key);
CREATE INDEX idx_tb_new_mappings_active ON public.tb_new_classification_mappings(engagement_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_tb_new_classification_mappings_updated_at
  BEFORE UPDATE ON public.tb_new_classification_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. TB NEW SESSIONS
-- ============================================================================
-- Stores saved sessions/workspaces for Trial Balance New
-- Allows users to save and load their work
CREATE TABLE public.tb_new_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  description TEXT,
  entity_info_id UUID REFERENCES public.tb_new_entity_info(id) ON DELETE SET NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, session_name)
);

-- Enable RLS
ALTER TABLE public.tb_new_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sessions for their engagements"
  ON public.tb_new_sessions FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create sessions for their engagements"
  ON public.tb_new_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update their own sessions"
  ON public.tb_new_sessions FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can delete their own sessions"
  ON public.tb_new_sessions FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Indexes
CREATE INDEX idx_tb_new_sessions_engagement ON public.tb_new_sessions(engagement_id);
CREATE INDEX idx_tb_new_sessions_default ON public.tb_new_sessions(engagement_id, is_default) WHERE is_default = true;
CREATE INDEX idx_tb_new_sessions_active ON public.tb_new_sessions(engagement_id, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_tb_new_sessions_updated_at
  BEFORE UPDATE ON public.tb_new_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.tb_new_entity_info IS 'Stores entity type, business type, and company information for Trial Balance New module';
COMMENT ON TABLE public.tb_new_ledgers IS 'Main ledger entries table for Trial Balance New module with H1-H5 classification hierarchy';
COMMENT ON TABLE public.tb_new_stock_items IS 'Stock/inventory items for Trial Balance New module';
COMMENT ON TABLE public.tb_new_classification_mappings IS 'User-saved classification mappings that override default rules';
COMMENT ON TABLE public.tb_new_sessions IS 'Saved sessions/workspaces for Trial Balance New module';

COMMENT ON COLUMN public.tb_new_ledgers.h1 IS 'Level 1: Statement (Balance Sheet / P&L Account)';
COMMENT ON COLUMN public.tb_new_ledgers.h2 IS 'Level 2: Category (Assets, Liabilities, Equity, Income, Expenses)';
COMMENT ON COLUMN public.tb_new_ledgers.h3 IS 'Level 3: Sub-Category (e.g., PPE & IA (Net), Trade Receivables)';
COMMENT ON COLUMN public.tb_new_ledgers.h4 IS 'Level 4: Line Item (e.g., Cash on Hand, Unsecured Considered Good)';
COMMENT ON COLUMN public.tb_new_ledgers.h5 IS 'Level 5: Detail (Additional detail if required)';
COMMENT ON COLUMN public.tb_new_ledgers.composite_key IS 'Unique key: Format "LedgerName|PrimaryGroup"';
COMMENT ON COLUMN public.tb_new_ledgers.status IS 'Classification status: Mapped, Unmapped, or Error';

COMMENT ON COLUMN public.tb_new_classification_mappings.composite_key IS 'Unique key: Format "LedgerName|PrimaryGroup" - matches ledger composite_key';
COMMENT ON COLUMN public.tb_new_stock_items.stock_category IS 'Category: Raw Material, Finished Goods, Work-in-Progress, etc.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

