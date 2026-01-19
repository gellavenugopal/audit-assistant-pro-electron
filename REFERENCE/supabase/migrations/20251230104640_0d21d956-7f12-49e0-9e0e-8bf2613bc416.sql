-- Create trial balance table
CREATE TABLE public.trial_balance_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  ledger_parent TEXT,
  ledger_primary_group TEXT,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  aile TEXT CHECK (aile IN ('Asset', 'Income', 'Liability', 'Expense')),
  fs_area TEXT,
  note TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_balance_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view trial balance lines"
ON public.trial_balance_lines FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create trial balance lines"
ON public.trial_balance_lines FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update trial balance lines"
ON public.trial_balance_lines FOR UPDATE
USING (true);

CREATE POLICY "Partners and managers can delete trial balance lines"
ON public.trial_balance_lines FOR DELETE
USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_trial_balance_lines_updated_at
BEFORE UPDATE ON public.trial_balance_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_trial_balance_engagement ON public.trial_balance_lines(engagement_id);
CREATE INDEX idx_trial_balance_version ON public.trial_balance_lines(engagement_id, version);