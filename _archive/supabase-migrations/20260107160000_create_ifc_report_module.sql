-- =====================================================
-- IFC REPORT MODULE - Database Schema
-- =====================================================

-- 1) IFC Clause Library (master data for IFC reporting requirements)
CREATE TABLE public.ifc_clause_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id TEXT NOT NULL UNIQUE,
  clause_title TEXT NOT NULL,
  clause_description TEXT,
  parent_clause_id TEXT,
  sort_order INTEGER DEFAULT 0,
  category TEXT, -- 'design', 'operating_effectiveness', 'entity_level', 'process_level'
  control_objective TEXT,
  key_controls JSONB DEFAULT '[]',
  testing_procedures JSONB DEFAULT '[]',
  positive_wording TEXT,
  negative_wording TEXT,
  qualified_wording TEXT,
  limitation_wording TEXT,
  evidence_checklist JSONB DEFAULT '[]',
  red_flags JSONB DEFAULT '[]',
  reviewer_prompts JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ifc_clause_library ENABLE ROW LEVEL SECURITY;

-- 2) IFC Control Responses (engagement-specific IFC assessments)
CREATE TABLE public.ifc_control_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  clause_id TEXT NOT NULL,
  is_applicable BOOLEAN DEFAULT true,
  na_reason TEXT,
  design_effectiveness TEXT, -- 'effective', 'ineffective', 'not_tested'
  operating_effectiveness TEXT, -- 'effective', 'ineffective', 'not_tested'
  control_deficiencies JSONB DEFAULT '[]',
  compensating_controls TEXT,
  testing_results TEXT,
  conclusion_text TEXT,
  exceptions_text TEXT,
  working_paper_refs JSONB DEFAULT '[]',
  management_response_captured BOOLEAN DEFAULT false,
  management_response TEXT,
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'reviewed'
  prepared_by uuid,
  prepared_at TIMESTAMPTZ,
  reviewed_by uuid,
  reviewed_at TIMESTAMPTZ,
  approved_by uuid,
  approved_at TIMESTAMPTZ,
  version_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, clause_id)
);

ALTER TABLE public.ifc_control_responses ENABLE ROW LEVEL SECURITY;

-- 3) IFC Report Content (main IFC report text and opinion)
CREATE TABLE public.ifc_report_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  
  -- Report Opinion
  opinion_type TEXT DEFAULT 'unmodified', -- 'unmodified', 'qualified', 'adverse', 'disclaimer'
  opinion_paragraph TEXT,
  basis_for_opinion TEXT,
  
  -- Management Responsibility
  management_responsibility_section TEXT,
  
  -- Auditor's Responsibility  
  auditor_responsibility_section TEXT,
  
  -- Meaning of IFC
  ifc_meaning_section TEXT,
  
  -- Inherent Limitations
  inherent_limitations_section TEXT,
  
  -- Material Weaknesses (if any)
  has_material_weaknesses BOOLEAN DEFAULT false,
  material_weaknesses JSONB DEFAULT '[]',
  
  -- Significant Deficiencies (if any)
  has_significant_deficiencies BOOLEAN DEFAULT false,
  significant_deficiencies JSONB DEFAULT '[]',
  
  -- Custom sections
  additional_sections JSONB DEFAULT '[]',
  
  -- Status
  report_status TEXT DEFAULT 'draft',
  version_number INTEGER DEFAULT 1,
  
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(engagement_id)
);

ALTER TABLE public.ifc_report_content ENABLE ROW LEVEL SECURITY;

-- 4) IFC Evidence Items
CREATE TABLE public.ifc_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  clause_id TEXT,
  control_id TEXT,
  evidence_file_id uuid REFERENCES public.evidence_files(id) ON DELETE SET NULL,
  working_paper_ref TEXT,
  description TEXT,
  notes TEXT,
  uploaded_by uuid NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ifc_evidence ENABLE ROW LEVEL SECURITY;

-- 5) IFC Report Versions
CREATE TABLE public.ifc_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_content_id uuid NOT NULL REFERENCES public.ifc_report_content(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_snapshot JSONB NOT NULL,
  changed_by uuid NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ifc_report_versions ENABLE ROW LEVEL SECURITY;

-- 6) IFC Comments/Review Notes
CREATE TABLE public.ifc_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  clause_id TEXT,
  control_id TEXT,
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note', -- 'note', 'query', 'deficiency', 'recommendation'
  assigned_to uuid,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  response_text TEXT,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.ifc_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- IFC Clause Library (readable by all authenticated users)
CREATE POLICY "All authenticated users can view IFC clause library"
ON public.ifc_clause_library FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Only admins can manage IFC clause library"
ON public.ifc_clause_library FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- IFC Control Responses
CREATE POLICY "Users can view IFC responses for accessible engagements"
ON public.ifc_control_responses FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create IFC responses for accessible engagements"
ON public.ifc_control_responses FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update IFC responses for accessible engagements"
ON public.ifc_control_responses FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

-- IFC Report Content
CREATE POLICY "Users can view IFC report content for accessible engagements"
ON public.ifc_report_content FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create IFC report content for accessible engagements"
ON public.ifc_report_content FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update IFC report content for accessible engagements"
ON public.ifc_report_content FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

-- IFC Evidence
CREATE POLICY "Users can view IFC evidence for accessible engagements"
ON public.ifc_evidence FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage IFC evidence for accessible engagements"
ON public.ifc_evidence FOR ALL TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id))
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

-- IFC Report Versions
CREATE POLICY "Users can view IFC report versions for accessible engagements"
ON public.ifc_report_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ifc_report_content 
    WHERE id = ifc_report_versions.report_content_id 
    AND public.has_engagement_access(auth.uid(), engagement_id)
  )
);

-- IFC Comments
CREATE POLICY "Users can view IFC comments for accessible engagements"
ON public.ifc_comments FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage IFC comments for accessible engagements"
ON public.ifc_comments FOR ALL TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id))
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_ifc_clause_library_clause_id ON public.ifc_clause_library(clause_id);
CREATE INDEX idx_ifc_clause_library_parent ON public.ifc_clause_library(parent_clause_id);
CREATE INDEX idx_ifc_control_responses_engagement ON public.ifc_control_responses(engagement_id);
CREATE INDEX idx_ifc_control_responses_clause ON public.ifc_control_responses(clause_id);
CREATE INDEX idx_ifc_control_responses_status ON public.ifc_control_responses(status);
CREATE INDEX idx_ifc_report_content_engagement ON public.ifc_report_content(engagement_id);
CREATE INDEX idx_ifc_evidence_engagement ON public.ifc_evidence(engagement_id);
CREATE INDEX idx_ifc_comments_engagement ON public.ifc_comments(engagement_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.ifc_clause_library IS 'Master library of IFC control requirements and testing procedures';
COMMENT ON TABLE public.ifc_control_responses IS 'Engagement-specific IFC control assessments and test results';
COMMENT ON TABLE public.ifc_report_content IS 'Main IFC report content including opinion and findings';
COMMENT ON TABLE public.ifc_evidence IS 'Evidence files supporting IFC control testing';
COMMENT ON TABLE public.ifc_report_versions IS 'Version history of IFC report content';
COMMENT ON TABLE public.ifc_comments IS 'Review notes and comments on IFC controls and report';
