-- Create procedure_assignees join table for multi-assignee support
CREATE TABLE public.procedure_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.audit_procedures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(procedure_id, user_id)
);

-- Enable RLS
ALTER TABLE public.procedure_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view assignees for procedures they can access"
ON public.procedure_assignees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  )
);

CREATE POLICY "Users can create assignees for procedures they can access"
ON public.procedure_assignees
FOR INSERT
WITH CHECK (
  auth.uid() = assigned_by
  AND EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  )
);

CREATE POLICY "Partners and managers can update assignees"
ON public.procedure_assignees
FOR UPDATE
USING (
  has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')
);

CREATE POLICY "Partners and managers can delete assignees"
ON public.procedure_assignees
FOR DELETE
USING (
  has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')
);

-- Create index for performance
CREATE INDEX idx_procedure_assignees_procedure ON public.procedure_assignees(procedure_id);
CREATE INDEX idx_procedure_assignees_user ON public.procedure_assignees(user_id);