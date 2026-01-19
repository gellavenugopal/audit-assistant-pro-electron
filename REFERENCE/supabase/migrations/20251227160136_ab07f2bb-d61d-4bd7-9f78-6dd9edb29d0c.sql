-- Create review_notes table
CREATE TABLE public.review_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID REFERENCES public.audit_procedures(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  response TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view review notes"
ON public.review_notes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create review notes"
ON public.review_notes
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update review notes"
ON public.review_notes
FOR UPDATE
USING (true);

CREATE POLICY "Partners and managers can delete review notes"
ON public.review_notes
FOR DELETE
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

-- Trigger for updated_at
CREATE TRIGGER update_review_notes_updated_at
BEFORE UPDATE ON public.review_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();