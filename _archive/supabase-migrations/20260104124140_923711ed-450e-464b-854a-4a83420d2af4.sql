-- =====================================================
-- AUDIT REPORT MODULE - Complete Database Schema
-- =====================================================

-- 1) Audit Report Engagements (extends engagement with report-specific data)
CREATE TABLE public.audit_report_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  
  -- Client Profile (Step 1)
  company_cin TEXT,
  registered_office TEXT,
  nature_of_business TEXT,
  is_standalone BOOLEAN DEFAULT true,
  accounting_framework TEXT DEFAULT 'AS',
  company_type TEXT,
  
  -- CARO Applicability (Step 2)
  caro_applicable_status TEXT DEFAULT 'pending',
  caro_exclusion_reason TEXT,
  is_private_company BOOLEAN DEFAULT false,
  paid_up_capital NUMERIC,
  reserves_surplus NUMERIC,
  borrowings_amount NUMERIC,
  
  -- Workflow Status
  setup_completed BOOLEAN DEFAULT false,
  report_status TEXT DEFAULT 'draft',
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by uuid,
  unlock_reason TEXT,
  unlocked_at TIMESTAMPTZ,
  unlocked_by uuid,
  
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(engagement_id)
);

ALTER TABLE public.audit_report_setup ENABLE ROW LEVEL SECURITY;

-- 2) CARO Clause Library (master data)
CREATE TABLE public.caro_clause_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id TEXT NOT NULL UNIQUE,
  clause_title TEXT NOT NULL,
  clause_description TEXT,
  parent_clause_id TEXT,
  sort_order INTEGER DEFAULT 0,
  applicability_conditions JSONB DEFAULT '{}',
  applies_to_cfs BOOLEAN DEFAULT false,
  questions JSONB DEFAULT '[]',
  follow_up_questions JSONB DEFAULT '[]',
  required_tables JSONB DEFAULT '[]',
  positive_wording TEXT,
  negative_wording TEXT,
  qualified_wording TEXT,
  na_wording TEXT,
  evidence_checklist JSONB DEFAULT '[]',
  red_flags JSONB DEFAULT '[]',
  reviewer_prompts JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.caro_clause_library ENABLE ROW LEVEL SECURITY;

-- 3) CARO Clause Responses (engagement-specific answers)
CREATE TABLE public.caro_clause_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  clause_id TEXT NOT NULL,
  is_applicable BOOLEAN DEFAULT true,
  na_reason TEXT,
  answers JSONB DEFAULT '{}',
  conclusion_text TEXT,
  exceptions_text TEXT,
  working_paper_refs JSONB DEFAULT '[]',
  table_data JSONB DEFAULT '[]',
  impacts_main_report BOOLEAN DEFAULT false,
  impact_description TEXT,
  management_response_captured BOOLEAN DEFAULT false,
  management_response TEXT,
  status TEXT DEFAULT 'not_started',
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

ALTER TABLE public.caro_clause_responses ENABLE ROW LEVEL SECURITY;

-- 4) Evidence Items for Audit Report
CREATE TABLE public.audit_report_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  clause_id TEXT,
  evidence_file_id uuid REFERENCES public.evidence_files(id) ON DELETE SET NULL,
  working_paper_ref TEXT,
  description TEXT,
  notes TEXT,
  uploaded_by uuid NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_report_evidence ENABLE ROW LEVEL SECURITY;

-- 5) Report Documents (for rich text editor)
CREATE TABLE public.audit_report_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_title TEXT,
  content_json JSONB DEFAULT '{}',
  content_html TEXT,
  version_number INTEGER DEFAULT 1,
  is_locked BOOLEAN DEFAULT false,
  changed_by uuid,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, section_name)
);

ALTER TABLE public.audit_report_documents ENABLE ROW LEVEL SECURITY;

-- 6) Report Document Versions
CREATE TABLE public.audit_report_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.audit_report_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_json JSONB,
  content_html TEXT,
  changed_by uuid NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_report_document_versions ENABLE ROW LEVEL SECURITY;

-- 7) Report Export Pack
CREATE TABLE public.audit_report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  export_version INTEGER NOT NULL,
  export_type TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  is_final BOOLEAN DEFAULT false,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_report_exports ENABLE ROW LEVEL SECURITY;

-- 8) Report Comments/Review Notes
CREATE TABLE public.audit_report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  clause_id TEXT,
  document_id uuid REFERENCES public.audit_report_documents(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note',
  assigned_to uuid,
  status TEXT DEFAULT 'open',
  response_text TEXT,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.audit_report_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

CREATE POLICY "Users can view audit report setup for accessible engagements"
ON public.audit_report_setup FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create audit report setup for accessible engagements"
ON public.audit_report_setup FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update audit report setup for accessible engagements"
ON public.audit_report_setup FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "All authenticated users can view CARO clause library"
ON public.caro_clause_library FOR SELECT TO authenticated USING (true);

CREATE POLICY "Partners and managers can manage CARO clause library"
ON public.caro_clause_library FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view clause responses for accessible engagements"
ON public.caro_clause_responses FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create clause responses for accessible engagements"
ON public.caro_clause_responses FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update clause responses for accessible engagements"
ON public.caro_clause_responses FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can delete clause responses for accessible engagements"
ON public.caro_clause_responses FOR DELETE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can view evidence for accessible engagements"
ON public.audit_report_evidence FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage evidence for accessible engagements"
ON public.audit_report_evidence FOR ALL TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can view documents for accessible engagements"
ON public.audit_report_documents FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage documents for accessible engagements"
ON public.audit_report_documents FOR ALL TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can view document versions"
ON public.audit_report_document_versions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.audit_report_documents d
  WHERE d.id = audit_report_document_versions.document_id
  AND public.has_engagement_access(auth.uid(), d.engagement_id)
));

CREATE POLICY "Users can create document versions"
ON public.audit_report_document_versions FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.audit_report_documents d
  WHERE d.id = audit_report_document_versions.document_id
  AND public.has_engagement_access(auth.uid(), d.engagement_id)
));

CREATE POLICY "Users can view exports for accessible engagements"
ON public.audit_report_exports FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create exports for accessible engagements"
ON public.audit_report_exports FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can view comments for accessible engagements"
ON public.audit_report_comments FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage comments for accessible engagements"
ON public.audit_report_comments FOR ALL TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_audit_report_setup_updated_at
  BEFORE UPDATE ON public.audit_report_setup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caro_clause_library_updated_at
  BEFORE UPDATE ON public.caro_clause_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caro_clause_responses_updated_at
  BEFORE UPDATE ON public.caro_clause_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audit_report_documents_updated_at
  BEFORE UPDATE ON public.audit_report_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();