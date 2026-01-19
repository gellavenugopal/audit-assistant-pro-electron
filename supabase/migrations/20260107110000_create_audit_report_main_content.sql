-- =====================================================
-- AUDIT REPORT MAIN CONTENT
-- =====================================================

CREATE TABLE public.audit_report_main_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  opinion_type TEXT NOT NULL DEFAULT 'unqualified',
  basis_for_opinion TEXT,
  qualification_details TEXT,

  has_emphasis_of_matter BOOLEAN DEFAULT false,
  emphasis_of_matter_items JSONB DEFAULT '[]',
  has_other_matter BOOLEAN DEFAULT false,
  other_matter_items JSONB DEFAULT '[]',
  has_going_concern_uncertainty BOOLEAN DEFAULT false,
  going_concern_details TEXT,
  going_concern_note_ref TEXT,

  include_kam BOOLEAN DEFAULT false,

  board_report_status TEXT,
  board_report_misstatement_details TEXT,

  clause_143_3_a_status TEXT,
  clause_143_3_a_details TEXT,
  clause_143_3_b_audit_trail_status TEXT,
  clause_143_3_b_audit_trail_details TEXT,
  clause_143_3_b_server_outside_india BOOLEAN,
  clause_143_3_c_branch_returns TEXT,
  clause_143_3_e_going_concern_impact TEXT,
  clause_143_3_f_directors_disqualified BOOLEAN,
  clause_143_3_f_disqualified_details TEXT,
  clause_143_3_g_qualification_impact TEXT,
  clause_143_3_h_remuneration_status TEXT,
  clause_143_3_h_details TEXT,
  clause_143_3_i_ifc_qualification TEXT,

  rule_11_a_pending_litigations TEXT,
  rule_11_a_note_ref TEXT,
  rule_11_b_long_term_contracts TEXT,
  rule_11_b_note_ref TEXT,
  rule_11_c_iepf_status TEXT,
  rule_11_c_delay_amount NUMERIC,
  rule_11_c_delay_details TEXT,
  rule_11_d_audit_procedures_status TEXT,
  rule_11_d_loan_fund_representations BOOLEAN,
  rule_11_d_modification_details TEXT,
  rule_11_d_receiving_fund_representations BOOLEAN,
  rule_11_e_dividend_status TEXT,
  rule_11_e_dividend_note_ref TEXT,
  rule_11_e_dividend_details TEXT,
  rule_11_e_interim_dividend_paid BOOLEAN,
  rule_11_e_interim_dividend_declared_not_paid BOOLEAN,
  rule_11_e_final_dividend_previous_year BOOLEAN,
  rule_11_e_final_dividend_proposed BOOLEAN,
  rule_11_e_final_dividend_amount NUMERIC,
  rule_11_e_interim_dividend_amount NUMERIC,
  rule_11_f_audit_trail_status TEXT,
  rule_11_f_audit_trail_details TEXT,
  rule_11_g_funds_advanced_status TEXT,
  rule_11_g_funds_advanced_details TEXT,

  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by uuid,
  version_number INTEGER DEFAULT 1,

  firm_name TEXT,
  firm_registration_no TEXT,
  partner_name TEXT,
  membership_no TEXT,

  UNIQUE(engagement_id)
);

ALTER TABLE public.audit_report_main_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit report main content for accessible engagements"
ON public.audit_report_main_content FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create audit report main content for accessible engagements"
ON public.audit_report_main_content FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update audit report main content for accessible engagements"
ON public.audit_report_main_content FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can delete audit report main content for accessible engagements"
ON public.audit_report_main_content FOR DELETE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE TRIGGER update_audit_report_main_content_updated_at
  BEFORE UPDATE ON public.audit_report_main_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
