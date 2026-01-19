-- Create Key Audit Matters table for storing KAMs per engagement
CREATE TABLE public.key_audit_matters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  audit_response text NOT NULL,
  sort_order integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.key_audit_matters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users with engagement access can view KAMs"
  ON public.key_audit_matters FOR SELECT
  USING (public.has_engagement_access(engagement_id, auth.uid()));

CREATE POLICY "Users with engagement access can create KAMs"
  ON public.key_audit_matters FOR INSERT
  WITH CHECK (public.has_engagement_access(engagement_id, auth.uid()));

CREATE POLICY "Users with engagement access can update KAMs"
  ON public.key_audit_matters FOR UPDATE
  USING (public.has_engagement_access(engagement_id, auth.uid()));

CREATE POLICY "Users with engagement access can delete KAMs"
  ON public.key_audit_matters FOR DELETE
  USING (public.has_engagement_access(engagement_id, auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_key_audit_matters_updated_at
  BEFORE UPDATE ON public.key_audit_matters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();