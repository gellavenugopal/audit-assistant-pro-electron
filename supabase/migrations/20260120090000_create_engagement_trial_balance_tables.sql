-- ============================================================================
-- Engagement-scoped Trial Balance + Classification Tables
-- ============================================================================

-- 1) TB Header (one record per engagement + period type + financial year)
CREATE TABLE public.engagement_trial_balance_header (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('CY', 'PY')),
  financial_year TEXT NOT NULL,
  source_type TEXT,
  imported_at TIMESTAMP WITH TIME ZONE,
  imported_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, financial_year, period_type)
);

ALTER TABLE public.engagement_trial_balance_header ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view TB headers for their engagements"
  ON public.engagement_trial_balance_header FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create TB headers for their engagements"
  ON public.engagement_trial_balance_header FOR INSERT
  WITH CHECK (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update TB headers for their engagements"
  ON public.engagement_trial_balance_header FOR UPDATE
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete TB headers"
  ON public.engagement_trial_balance_header FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX idx_engagement_tb_header_engagement ON public.engagement_trial_balance_header(engagement_id);
CREATE INDEX idx_engagement_tb_header_period ON public.engagement_trial_balance_header(engagement_id, financial_year, period_type);

CREATE TRIGGER update_engagement_tb_header_updated_at
  BEFORE UPDATE ON public.engagement_trial_balance_header
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) TB Lines (ledger-wise)
CREATE TABLE public.engagement_trial_balance_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tb_header_id UUID NOT NULL REFERENCES public.engagement_trial_balance_header(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  ledger_name TEXT NOT NULL,
  ledger_guid TEXT,
  primary_group TEXT,
  parent_group TEXT,
  composite_key TEXT NOT NULL,
  opening NUMERIC NOT NULL DEFAULT 0,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  closing NUMERIC NOT NULL DEFAULT 0,
  dr_cr TEXT,
  is_revenue BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tb_header_id, composite_key)
);

ALTER TABLE public.engagement_trial_balance_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view TB lines for their engagements"
  ON public.engagement_trial_balance_lines FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create TB lines for their engagements"
  ON public.engagement_trial_balance_lines FOR INSERT
  WITH CHECK (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update TB lines for their engagements"
  ON public.engagement_trial_balance_lines FOR UPDATE
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete TB lines"
  ON public.engagement_trial_balance_lines FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX idx_engagement_tb_lines_header ON public.engagement_trial_balance_lines(tb_header_id);
CREATE INDEX idx_engagement_tb_lines_header_ledger ON public.engagement_trial_balance_lines(tb_header_id, ledger_name);
CREATE INDEX idx_engagement_tb_lines_header_key ON public.engagement_trial_balance_lines(tb_header_id, composite_key);
CREATE INDEX idx_engagement_tb_lines_engagement ON public.engagement_trial_balance_lines(engagement_id);

CREATE TRIGGER update_engagement_tb_lines_updated_at
  BEFORE UPDATE ON public.engagement_trial_balance_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Classification mapping (per TB line)
CREATE TABLE public.engagement_tb_classification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tb_line_id UUID NOT NULL REFERENCES public.engagement_trial_balance_lines(id) ON DELETE CASCADE,
  statement_type TEXT NOT NULL CHECK (statement_type IN ('BS', 'PL', 'NOTES')),
  h1 TEXT,
  h2 TEXT,
  h3 TEXT,
  h4 TEXT,
  h5 TEXT,
  note_ref TEXT,
  status TEXT,
  category_code TEXT,
  category_name TEXT,
  confidence NUMERIC,
  classification_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tb_line_id, statement_type)
);

ALTER TABLE public.engagement_tb_classification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view TB classifications for their engagements"
  ON public.engagement_tb_classification FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagement_trial_balance_lines lines
      WHERE lines.id = engagement_tb_classification.tb_line_id
      AND has_engagement_access(auth.uid(), lines.engagement_id)
    )
  );

CREATE POLICY "Users can create TB classifications for their engagements"
  ON public.engagement_tb_classification FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.engagement_trial_balance_lines lines
      WHERE lines.id = engagement_tb_classification.tb_line_id
      AND has_engagement_access(auth.uid(), lines.engagement_id)
    )
  );

CREATE POLICY "Users can update TB classifications for their engagements"
  ON public.engagement_tb_classification FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagement_trial_balance_lines lines
      WHERE lines.id = engagement_tb_classification.tb_line_id
      AND has_engagement_access(auth.uid(), lines.engagement_id)
    )
  );

CREATE POLICY "Partners and managers can delete TB classifications"
  ON public.engagement_tb_classification FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX idx_engagement_tb_classification_line ON public.engagement_tb_classification(tb_line_id);

CREATE TRIGGER update_engagement_tb_classification_updated_at
  BEFORE UPDATE ON public.engagement_tb_classification
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
