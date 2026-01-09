-- Create audit_programs_new table
CREATE TABLE IF NOT EXISTS audit_programs_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workpaper_reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'reviewed', 'approved')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  prepared_by UUID REFERENCES auth.users(id),
  prepared_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- Create audit_program_sections table
CREATE TABLE IF NOT EXISTS audit_program_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_program_id UUID NOT NULL REFERENCES audit_programs_new(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_expanded BOOLEAN DEFAULT FALSE,
  is_applicable BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'not-commenced' CHECK (status IN ('not-commenced', 'in-progress', 'review', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_program_boxes table
CREATE TABLE IF NOT EXISTS audit_program_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES audit_program_sections(id) ON DELETE CASCADE,
  header TEXT NOT NULL,
  content TEXT DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'not-commenced' CHECK (status IN ('not-commenced', 'in-progress', 'review', 'complete')),
  locked BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_program_attachments table
CREATE TABLE IF NOT EXISTS audit_program_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_program_id UUID NOT NULL REFERENCES audit_programs_new(id) ON DELETE CASCADE,
  section_id UUID REFERENCES audit_program_sections(id) ON DELETE CASCADE,
  box_id UUID REFERENCES audit_program_boxes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  is_evidence BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_programs_new_engagement ON audit_programs_new(engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_programs_new_client ON audit_programs_new(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_programs_new_year ON audit_programs_new(financial_year_id);
CREATE INDEX IF NOT EXISTS idx_audit_program_sections_program ON audit_program_sections(audit_program_id);
CREATE INDEX IF NOT EXISTS idx_audit_program_boxes_section ON audit_program_boxes(section_id);
CREATE INDEX IF NOT EXISTS idx_audit_program_attachments_program ON audit_program_attachments(audit_program_id);
CREATE INDEX IF NOT EXISTS idx_audit_program_attachments_section ON audit_program_attachments(section_id);
CREATE INDEX IF NOT EXISTS idx_audit_program_attachments_box ON audit_program_attachments(box_id);

-- Enable Row Level Security
ALTER TABLE audit_programs_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_program_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_program_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_program_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_programs_new
CREATE POLICY "Users can view audit programs for their firm" ON audit_programs_new
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE e.id = audit_programs_new.engagement_id
    )
  );

CREATE POLICY "Users can create audit programs" ON audit_programs_new
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE e.id = engagement_id
    )
  );

CREATE POLICY "Users can update audit programs for their firm" ON audit_programs_new
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE e.id = audit_programs_new.engagement_id
    )
  );

CREATE POLICY "Users can delete audit programs for their firm" ON audit_programs_new
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE e.id = audit_programs_new.engagement_id
    )
  );

-- RLS Policies for audit_program_sections
CREATE POLICY "Users can view sections for their firm's programs" ON audit_program_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE ap.id = audit_program_sections.audit_program_id
    )
  );

CREATE POLICY "Users can manage sections" ON audit_program_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE ap.id = audit_program_sections.audit_program_id
    )
  );

-- RLS Policies for audit_program_boxes
CREATE POLICY "Users can view boxes for their firm's programs" ON audit_program_boxes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audit_program_sections aps
      JOIN audit_programs_new ap ON ap.id = aps.audit_program_id
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE aps.id = audit_program_boxes.section_id
    )
  );

CREATE POLICY "Users can manage boxes" ON audit_program_boxes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM audit_program_sections aps
      JOIN audit_programs_new ap ON ap.id = aps.audit_program_id
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE aps.id = audit_program_boxes.section_id
    )
  );

-- RLS Policies for audit_program_attachments
CREATE POLICY "Users can view attachments for their firm's programs" ON audit_program_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE ap.id = audit_program_attachments.audit_program_id
    )
  );

CREATE POLICY "Users can manage attachments" ON audit_program_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE ap.id = audit_program_attachments.audit_program_id
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_audit_programs_new_updated_at
  BEFORE UPDATE ON audit_programs_new
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_program_sections_updated_at
  BEFORE UPDATE ON audit_program_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_program_boxes_updated_at
  BEFORE UPDATE ON audit_program_boxes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
