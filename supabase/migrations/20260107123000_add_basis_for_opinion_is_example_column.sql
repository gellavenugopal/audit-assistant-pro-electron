-- Add basis_for_opinion_is_example column to audit_report_main_content
-- This column tracks whether the Basis for Opinion content is an illustrative example (true) or user-entered (false/null)

ALTER TABLE public.audit_report_main_content
ADD COLUMN basis_for_opinion_is_example BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.audit_report_main_content.basis_for_opinion_is_example IS 'True when the basis_for_opinion field was auto-populated with an illustrative example; cleared when user edits.';
