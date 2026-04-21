-- Create table for partners
CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  membership_number text NOT NULL,
  date_of_joining date NOT NULL,
  date_of_exit date,
  pan text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view partners"
  ON public.partners
  FOR SELECT
  USING (true);

CREATE POLICY "Partners and managers can insert partners"
  ON public.partners
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Partners and managers can update partners"
  ON public.partners
  FOR UPDATE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Partners can delete partners"
  ON public.partners
  FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();