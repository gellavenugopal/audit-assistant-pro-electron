-- Add signing partner and report details to audit_report_setup
ALTER TABLE public.audit_report_setup 
ADD COLUMN signing_partner_id uuid REFERENCES public.partners(id),
ADD COLUMN report_date date,
ADD COLUMN report_city text,
ADD COLUMN udin text;

-- Add comment for clarity
COMMENT ON COLUMN public.audit_report_setup.signing_partner_id IS 'Partner signing the audit report';
COMMENT ON COLUMN public.audit_report_setup.report_date IS 'Date of the audit report';
COMMENT ON COLUMN public.audit_report_setup.report_city IS 'City where report is signed';
COMMENT ON COLUMN public.audit_report_setup.udin IS 'Unique Document Identification Number';