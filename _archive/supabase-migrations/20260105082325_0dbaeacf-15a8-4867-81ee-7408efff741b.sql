-- Create schedule_iii_config table for per-engagement configuration
CREATE TABLE public.schedule_iii_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  start_note_number INTEGER NOT NULL DEFAULT 1,
  include_contingent_liabilities BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(engagement_id)
);

-- Enable RLS
ALTER TABLE public.schedule_iii_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view config for accessible engagements"
ON public.schedule_iii_config FOR SELECT
USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create config for accessible engagements"
ON public.schedule_iii_config FOR INSERT
WITH CHECK (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update config for accessible engagements"
ON public.schedule_iii_config FOR UPDATE
USING (has_engagement_access(auth.uid(), engagement_id));

-- Create rule_engine_override_rules table (Priority 1)
CREATE TABLE public.rule_engine_override_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES public.aile_rule_sets(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  exact_ledger_name TEXT NOT NULL,
  current_tally_group TEXT,
  override_to_code TEXT NOT NULL,
  override_to_description TEXT,
  reason_for_override TEXT,
  effective_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rule_engine_override_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view override rules"
ON public.rule_engine_override_rules FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage override rules"
ON public.rule_engine_override_rules FOR ALL
USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create rule_engine_keyword_rules table (Priority 2)
CREATE TABLE public.rule_engine_keyword_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES public.aile_rule_sets(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  keyword_pattern TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'Contains',
  maps_to_code TEXT NOT NULL,
  maps_to_description TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rule_engine_keyword_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view keyword rules"
ON public.rule_engine_keyword_rules FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage keyword rules"
ON public.rule_engine_keyword_rules FOR ALL
USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create rule_engine_group_rules table (Priority 3)
CREATE TABLE public.rule_engine_group_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES public.aile_rule_sets(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  tally_group_name TEXT NOT NULL,
  tally_parent_group TEXT,
  maps_to_code TEXT NOT NULL,
  maps_to_description TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rule_engine_group_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view group rules"
ON public.rule_engine_group_rules FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage group rules"
ON public.rule_engine_group_rules FOR ALL
USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create rule_engine_validation_rules table
CREATE TABLE public.rule_engine_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT UNIQUE NOT NULL,
  validation_type TEXT NOT NULL,
  condition_description TEXT NOT NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium',
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rule_engine_validation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view validation rules"
ON public.rule_engine_validation_rules FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage validation rules"
ON public.rule_engine_validation_rules FOR ALL
USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add new columns to trial_balance_lines
ALTER TABLE public.trial_balance_lines 
ADD COLUMN IF NOT EXISTS schedule_iii_code TEXT,
ADD COLUMN IF NOT EXISTS applied_rule_id TEXT,
ADD COLUMN IF NOT EXISTS applied_rule_type TEXT,
ADD COLUMN IF NOT EXISTS validation_flags TEXT[] DEFAULT '{}';

-- Insert default validation rules
INSERT INTO public.rule_engine_validation_rules (rule_id, validation_type, condition_description, action, severity, message_template) VALUES
('VL001', 'Unmapped Ledger', 'Ledger not mapped to any Schedule III code', 'Flag for Review', 'Critical', 'Ledger "{ledger_name}" is not mapped to any Schedule III line item'),
('VL002', 'Balance Anomaly - Liability', 'Debit balance in Liability account', 'Flag for Review', 'High', 'Liability account "{ledger_name}" has a debit balance of {amount}'),
('VL003', 'Balance Anomaly - Asset', 'Credit balance in Asset account', 'Flag for Review', 'High', 'Asset account "{ledger_name}" has a credit balance of {amount}'),
('VL004', 'Zero Balance', 'Ledger with zero closing balance', 'Flag for Review', 'Low', 'Ledger "{ledger_name}" has zero balance - confirm if correct'),
('VL005', 'Current/Non-Current', 'Needs maturity classification', 'Request Info', 'Medium', 'Ledger "{ledger_name}" requires current/non-current classification'),
('VL006', 'Related Party', 'Potential related party transaction', 'Request Info', 'High', 'Ledger "{ledger_name}" may involve related party - verify disclosure'),
('VL007', 'MSME Creditor', 'Trade payable may be MSME', 'Request Info', 'High', 'Trade payable "{ledger_name}" - verify if MSME creditor'),
('VL008', 'Statutory Dues', 'Verify statutory compliance', 'Request Info', 'Medium', 'Statutory due "{ledger_name}" - verify payment status'),
('VL009', 'Large Balance', 'Unusually large balance', 'Flag for Review', 'Medium', 'Ledger "{ledger_name}" has unusually large balance of {amount}'),
('VL010', 'Negative Balance', 'Unexpected negative balance', 'Flag for Review', 'High', 'Ledger "{ledger_name}" has unexpected negative balance'),
('VL011', 'Dormant Account', 'No movement during period', 'Flag for Review', 'Low', 'Ledger "{ledger_name}" shows no movement - verify if dormant');

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_schedule_iii_config_updated_at
BEFORE UPDATE ON public.schedule_iii_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_override_rules_updated_at
BEFORE UPDATE ON public.rule_engine_override_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_keyword_rules_updated_at
BEFORE UPDATE ON public.rule_engine_keyword_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_rules_updated_at
BEFORE UPDATE ON public.rule_engine_group_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();