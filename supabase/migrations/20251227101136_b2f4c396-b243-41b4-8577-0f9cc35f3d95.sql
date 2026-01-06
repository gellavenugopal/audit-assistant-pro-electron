-- Create engagements table
CREATE TABLE public.engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  engagement_type TEXT NOT NULL DEFAULT 'statutory',
  status TEXT NOT NULL DEFAULT 'planning',
  financial_year TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  partner_id UUID REFERENCES public.profiles(user_id),
  manager_id UUID REFERENCES public.profiles(user_id),
  materiality_amount DECIMAL(15,2),
  performance_materiality DECIMAL(15,2),
  trivial_threshold DECIMAL(15,2),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_procedures table
CREATE TABLE public.audit_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  description TEXT,
  assertion TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  assigned_to UUID REFERENCES public.profiles(user_id),
  due_date DATE,
  completed_date DATE,
  workpaper_ref TEXT,
  conclusion TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create risks table
CREATE TABLE public.risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  risk_area TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_type TEXT NOT NULL DEFAULT 'significant',
  inherent_risk TEXT NOT NULL DEFAULT 'medium',
  control_risk TEXT NOT NULL DEFAULT 'medium',
  combined_risk TEXT NOT NULL DEFAULT 'medium',
  key_controls TEXT,
  audit_response TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

-- Engagements policies - all authenticated users can view and collaborate
CREATE POLICY "Authenticated users can view engagements"
ON public.engagements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create engagements"
ON public.engagements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update engagements"
ON public.engagements FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Partners and managers can delete engagements"
ON public.engagements FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

-- Audit procedures policies
CREATE POLICY "Authenticated users can view procedures"
ON public.audit_procedures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create procedures"
ON public.audit_procedures FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update procedures"
ON public.audit_procedures FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Partners and managers can delete procedures"
ON public.audit_procedures FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

-- Risks policies
CREATE POLICY "Authenticated users can view risks"
ON public.risks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create risks"
ON public.risks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update risks"
ON public.risks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Partners and managers can delete risks"
ON public.risks FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

-- Add updated_at triggers
CREATE TRIGGER update_engagements_updated_at
BEFORE UPDATE ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audit_procedures_updated_at
BEFORE UPDATE ON public.audit_procedures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_risks_updated_at
BEFORE UPDATE ON public.risks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.engagements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_procedures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.risks;