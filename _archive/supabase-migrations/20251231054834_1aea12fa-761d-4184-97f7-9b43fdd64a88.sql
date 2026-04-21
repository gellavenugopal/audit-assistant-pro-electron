-- Add new columns to trial_balance_lines table
ALTER TABLE public.trial_balance_lines
ADD COLUMN branch_name text DEFAULT NULL,
ADD COLUMN balance_type text DEFAULT NULL,
ADD COLUMN period_type text DEFAULT 'current',
ADD COLUMN period_ending date DEFAULT NULL;

-- Add check constraint for balance_type
ALTER TABLE public.trial_balance_lines
ADD CONSTRAINT valid_balance_type CHECK (balance_type IS NULL OR balance_type IN ('Dr', 'Cr', 'Debit', 'Credit'));

-- Add check constraint for period_type
ALTER TABLE public.trial_balance_lines
ADD CONSTRAINT valid_period_type CHECK (period_type IN ('current', 'previous'));

-- Create index on branch_name for filtering
CREATE INDEX idx_trial_balance_branch_name ON public.trial_balance_lines(branch_name);

-- Create index on period_type for filtering
CREATE INDEX idx_trial_balance_period_type ON public.trial_balance_lines(period_type);