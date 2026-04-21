-- Create procedure_template_checklist_items table
CREATE TABLE public.procedure_template_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_template_id UUID NOT NULL REFERENCES public.standard_procedures(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procedure_template_evidence_requirements table
CREATE TABLE public.procedure_template_evidence_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_template_id UUID NOT NULL REFERENCES public.standard_procedures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wp_ref TEXT,
  allowed_file_types TEXT[] DEFAULT '{}',
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procedure_checklist_items table (instance level)
CREATE TABLE public.procedure_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.audit_procedures(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES public.procedure_template_checklist_items(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'na')),
  remarks TEXT,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procedure_evidence_requirements table (instance level)
CREATE TABLE public.procedure_evidence_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.audit_procedures(id) ON DELETE CASCADE,
  template_requirement_id UUID REFERENCES public.procedure_template_evidence_requirements(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  wp_ref TEXT,
  allowed_file_types TEXT[] DEFAULT '{}',
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evidence_links table (join table)
CREATE TABLE public.evidence_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_id UUID NOT NULL REFERENCES public.evidence_files(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.audit_procedures(id) ON DELETE CASCADE,
  evidence_requirement_id UUID REFERENCES public.procedure_evidence_requirements(id) ON DELETE SET NULL,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  linked_by UUID NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_template_checklist_template_id ON public.procedure_template_checklist_items(procedure_template_id);
CREATE INDEX idx_template_evidence_template_id ON public.procedure_template_evidence_requirements(procedure_template_id);
CREATE INDEX idx_procedure_checklist_procedure_id ON public.procedure_checklist_items(procedure_id);
CREATE INDEX idx_procedure_evidence_procedure_id ON public.procedure_evidence_requirements(procedure_id);
CREATE INDEX idx_evidence_links_evidence_id ON public.evidence_links(evidence_id);
CREATE INDEX idx_evidence_links_procedure_id ON public.evidence_links(procedure_id);
CREATE INDEX idx_evidence_links_requirement_id ON public.evidence_links(evidence_requirement_id);

-- Enable RLS on all tables
ALTER TABLE public.procedure_template_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_template_evidence_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_evidence_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_links ENABLE ROW LEVEL SECURITY;

-- RLS for procedure_template_checklist_items
CREATE POLICY "Authenticated users can view template checklist items"
  ON public.procedure_template_checklist_items FOR SELECT
  USING (true);

CREATE POLICY "Partners and managers can manage template checklist items"
  ON public.procedure_template_checklist_items FOR ALL
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS for procedure_template_evidence_requirements
CREATE POLICY "Authenticated users can view template evidence requirements"
  ON public.procedure_template_evidence_requirements FOR SELECT
  USING (true);

CREATE POLICY "Partners and managers can manage template evidence requirements"
  ON public.procedure_template_evidence_requirements FOR ALL
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS for procedure_checklist_items (instance level)
CREATE POLICY "Users can view checklist items for accessible procedures"
  ON public.procedure_checklist_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_checklist_items.procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  ));

CREATE POLICY "Users can insert checklist items for accessible procedures"
  ON public.procedure_checklist_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_checklist_items.procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  ));

CREATE POLICY "Users can update checklist items for accessible procedures"
  ON public.procedure_checklist_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_checklist_items.procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  ));

CREATE POLICY "Partners and managers can delete checklist items"
  ON public.procedure_checklist_items FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS for procedure_evidence_requirements (instance level)
CREATE POLICY "Users can view evidence requirements for accessible procedures"
  ON public.procedure_evidence_requirements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_evidence_requirements.procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  ));

CREATE POLICY "Users can insert evidence requirements for accessible procedures"
  ON public.procedure_evidence_requirements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_evidence_requirements.procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  ));

CREATE POLICY "Users can update evidence requirements for accessible procedures"
  ON public.procedure_evidence_requirements FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = procedure_evidence_requirements.procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  ));

CREATE POLICY "Partners and managers can delete evidence requirements"
  ON public.procedure_evidence_requirements FOR DELETE
  USING (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS for evidence_links
CREATE POLICY "Users can view evidence links for accessible procedures"
  ON public.evidence_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.audit_procedures ap
    WHERE ap.id = evidence_links.procedure_id
    AND has_engagement_access(auth.uid(), ap.engagement_id)
  ));

CREATE POLICY "Users can insert evidence links for accessible procedures"
  ON public.evidence_links FOR INSERT
  WITH CHECK (
    auth.uid() = linked_by AND
    EXISTS (
      SELECT 1 FROM public.audit_procedures ap
      WHERE ap.id = evidence_links.procedure_id
      AND has_engagement_access(auth.uid(), ap.engagement_id)
    )
  );

CREATE POLICY "Users can delete their own evidence links"
  ON public.evidence_links FOR DELETE
  USING (
    auth.uid() = linked_by OR
    has_role(auth.uid(), 'partner'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );