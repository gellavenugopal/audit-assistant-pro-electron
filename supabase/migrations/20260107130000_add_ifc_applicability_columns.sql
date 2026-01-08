-- Add IFC applicability criteria and exemption columns to audit_report_setup table
ALTER TABLE audit_report_setup
  ADD COLUMN IF NOT EXISTS is_public_unlisted_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS private_turnover_above_50cr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS private_borrowing_above_25cr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_small_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_opc BOOLEAN DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN audit_report_setup.is_public_unlisted_company IS 'IFC Applicability Criterion: Company is a public limited company that is unlisted';
COMMENT ON COLUMN audit_report_setup.private_turnover_above_50cr IS 'IFC Applicability Criterion: Private company with previous year turnover >= 50 crores';
COMMENT ON COLUMN audit_report_setup.private_borrowing_above_25cr IS 'IFC Applicability Criterion: Private company with current year borrowings >= 25 crores';
COMMENT ON COLUMN audit_report_setup.is_small_company IS 'IFC Exemption: Company qualifies as a small company';
COMMENT ON COLUMN audit_report_setup.is_opc IS 'IFC Exemption: Company is a One Person Company (OPC)';
