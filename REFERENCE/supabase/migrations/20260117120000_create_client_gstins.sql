-- Create client_gstins table to store GST numbers per client
CREATE TABLE public.client_gstins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gstin TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure per-client GSTIN uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS ux_client_gstins_client_id_gstin
  ON public.client_gstins (client_id, gstin);

-- Speed up client lookups
CREATE INDEX IF NOT EXISTS idx_client_gstins_client_id
  ON public.client_gstins (client_id);

-- Enable RLS
ALTER TABLE public.client_gstins ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view client gstins"
ON public.client_gstins FOR SELECT
USING (true);

CREATE POLICY "Partners and managers can create client gstins"
ON public.client_gstins FOR INSERT
WITH CHECK (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Partners and managers can update client gstins"
ON public.client_gstins FOR UPDATE
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Partners and managers can delete client gstins"
ON public.client_gstins FOR DELETE
USING (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'));
