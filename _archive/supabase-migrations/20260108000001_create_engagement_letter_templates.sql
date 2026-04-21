-- Create engagement letter templates table
CREATE TABLE IF NOT EXISTS engagement_letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE CHECK (template_type IN (
    'statutory_audit_company_without_ifc',
    'statutory_audit_company_with_ifc',
    'tax_audit_partnership_3ca',
    'tax_audit_partnership_3cb'
  )),
  template_name TEXT NOT NULL,
  file_content TEXT NOT NULL, -- Extracted text from Word file
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on template_type for fast lookups
CREATE INDEX IF NOT EXISTS idx_engagement_letter_templates_type ON engagement_letter_templates(template_type);

-- Enable RLS
ALTER TABLE engagement_letter_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read templates
CREATE POLICY "Anyone can read templates"
  ON engagement_letter_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert/update templates
CREATE POLICY "Only admins can manage templates"
  ON engagement_letter_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_engagement_letter_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_letter_templates_updated_at
  BEFORE UPDATE ON engagement_letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_letter_templates_updated_at();
