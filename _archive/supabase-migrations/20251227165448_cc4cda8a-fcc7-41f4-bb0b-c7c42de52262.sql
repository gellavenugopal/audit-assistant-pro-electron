-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can create clients"
ON public.clients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Partners and managers can update clients"
ON public.clients FOR UPDATE
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Partners can delete clients"
ON public.clients FOR DELETE
USING (has_role(auth.uid(), 'partner'));

-- Add client_id to engagements
ALTER TABLE public.engagements ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Create standard_programs table (program bundles)
CREATE TABLE public.standard_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  audit_area TEXT NOT NULL,
  engagement_type TEXT NOT NULL DEFAULT 'statutory',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on standard_programs
ALTER TABLE public.standard_programs ENABLE ROW LEVEL SECURITY;

-- RLS policies for standard_programs
CREATE POLICY "Authenticated users can view standard programs"
ON public.standard_programs FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage standard programs"
ON public.standard_programs FOR ALL
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

-- Create standard_procedures table (procedure templates)
CREATE TABLE public.standard_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.standard_programs(id) ON DELETE CASCADE,
  procedure_name TEXT NOT NULL,
  description TEXT,
  area TEXT NOT NULL,
  assertion TEXT,
  is_standalone BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on standard_procedures
ALTER TABLE public.standard_procedures ENABLE ROW LEVEL SECURITY;

-- RLS policies for standard_procedures
CREATE POLICY "Authenticated users can view standard procedures"
ON public.standard_procedures FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage standard procedures"
ON public.standard_procedures FOR ALL
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

-- Create engagement_assignments table for role assignments
CREATE TABLE public.engagement_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, user_id)
);

-- Enable RLS on engagement_assignments
ALTER TABLE public.engagement_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for engagement_assignments
CREATE POLICY "Authenticated users can view assignments"
ON public.engagement_assignments FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can manage assignments"
ON public.engagement_assignments FOR ALL
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

-- Add triggers for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_standard_programs_updated_at
BEFORE UPDATE ON public.standard_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_standard_procedures_updated_at
BEFORE UPDATE ON public.standard_procedures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();