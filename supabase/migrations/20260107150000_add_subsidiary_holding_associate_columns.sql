-- Add subsidiary, holding company, and associate columns to audit_report_setup table
ALTER TABLE audit_report_setup
  ADD COLUMN IF NOT EXISTS is_subsidiary BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_holding_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_associates BOOLEAN DEFAULT false;

COMMENT ON COLUMN audit_report_setup.is_subsidiary IS 'Company is a subsidiary';
COMMENT ON COLUMN audit_report_setup.is_holding_company IS 'Company is a holding company';
COMMENT ON COLUMN audit_report_setup.has_associates IS 'Company has associates';
