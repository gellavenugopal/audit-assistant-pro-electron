-- Add company type classification columns to audit_report_setup table

ALTER TABLE audit_report_setup
  ADD COLUMN IF NOT EXISTS is_public_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private_exceeding_threshold BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private_non_exceeding_threshold BOOLEAN DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN audit_report_setup.is_public_company IS 'Company is a Public Company';
COMMENT ON COLUMN audit_report_setup.is_private_exceeding_threshold IS 'Private Limited company exceeding the threshold';
COMMENT ON COLUMN audit_report_setup.is_private_non_exceeding_threshold IS 'Private Limited company non exceeding the threshold';
