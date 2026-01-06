-- Create table for firm-level customized CARO standard answers
CREATE TABLE public.caro_standard_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id TEXT NOT NULL UNIQUE,
  positive_wording TEXT,
  negative_wording TEXT,
  na_wording TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caro_standard_answers ENABLE ROW LEVEL SECURITY;

-- Partners and managers can manage standard answers
CREATE POLICY "Partners and managers can view standard answers"
ON public.caro_standard_answers FOR SELECT
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Partners and managers can insert standard answers"
ON public.caro_standard_answers FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Partners and managers can update standard answers"
ON public.caro_standard_answers FOR UPDATE
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Partners and managers can delete standard answers"
ON public.caro_standard_answers FOR DELETE
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

-- Add trigger for updated_at
CREATE TRIGGER update_caro_standard_answers_updated_at
BEFORE UPDATE ON public.caro_standard_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();