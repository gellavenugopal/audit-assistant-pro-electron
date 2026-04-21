-- Create financial_years table for dropdown options
CREATE TABLE public.financial_years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view financial years"
ON public.financial_years FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage financial years"
ON public.financial_years FOR ALL
USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Insert default financial years
INSERT INTO public.financial_years (year_code, display_name, created_by) VALUES
  ('2023-24', 'FY 2023-24', '00000000-0000-0000-0000-000000000000'),
  ('2024-25', 'FY 2024-25', '00000000-0000-0000-0000-000000000000'),
  ('2025-26', 'FY 2025-26', '00000000-0000-0000-0000-000000000000'),
  ('2026-27', 'FY 2026-27', '00000000-0000-0000-0000-000000000000');