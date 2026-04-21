-- Create table for CA Firm settings
CREATE TABLE public.firm_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_name text NOT NULL,
  icai_unique_sl_no text,
  constitution text,
  no_of_partners integer,
  firm_registration_no text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.firm_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only one firm settings record needed, viewable by all authenticated users
CREATE POLICY "Authenticated users can view firm settings"
  ON public.firm_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Partners and managers can insert firm settings"
  ON public.firm_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Partners and managers can update firm settings"
  ON public.firm_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_firm_settings_updated_at
  BEFORE UPDATE ON public.firm_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();