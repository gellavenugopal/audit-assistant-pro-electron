-- Create table for AILE mapping rule sets
CREATE TABLE public.aile_rule_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual mapping rules
CREATE TABLE public.aile_mapping_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_set_id UUID NOT NULL REFERENCES public.aile_rule_sets(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  match_field TEXT NOT NULL DEFAULT 'ledger_primary_group',
  match_pattern TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains',
  target_aile TEXT NOT NULL,
  target_fs_area TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aile_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aile_mapping_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for rule sets
CREATE POLICY "Authenticated users can view rule sets"
  ON public.aile_rule_sets FOR SELECT
  USING (true);

CREATE POLICY "Partners and managers can manage rule sets"
  ON public.aile_rule_sets FOR ALL
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for mapping rules
CREATE POLICY "Authenticated users can view mapping rules"
  ON public.aile_mapping_rules FOR SELECT
  USING (true);

CREATE POLICY "Partners and managers can manage mapping rules"
  ON public.aile_mapping_rules FOR ALL
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add indexes
CREATE INDEX idx_aile_mapping_rules_rule_set ON public.aile_mapping_rules(rule_set_id);
CREATE INDEX idx_aile_mapping_rules_priority ON public.aile_mapping_rules(priority DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_aile_rule_sets_updated_at
  BEFORE UPDATE ON public.aile_rule_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aile_mapping_rules_updated_at
  BEFORE UPDATE ON public.aile_mapping_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();