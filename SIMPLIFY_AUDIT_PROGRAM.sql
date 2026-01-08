-- Simplify Audit Program - Remove client_id and financial_year_id dependencies
-- Run this in Supabase SQL Editor

-- Make client_id and financial_year_id optional (nullable)
ALTER TABLE audit_programs_new 
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN financial_year_id DROP NOT NULL;

-- Update RLS policies to only check engagement
DROP POLICY IF EXISTS "Users can view audit programs for their firm" ON audit_programs_new;
DROP POLICY IF EXISTS "Users can create audit programs" ON audit_programs_new;
DROP POLICY IF EXISTS "Users can update audit programs for their firm" ON audit_programs_new;
DROP POLICY IF EXISTS "Users can delete audit programs for their firm" ON audit_programs_new;

-- Simplified RLS policies - only check engagement
CREATE POLICY "Users can view audit programs for their firm" ON audit_programs_new
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = audit_programs_new.engagement_id
      AND e.firm_id = p.firm_id
    )
  );

CREATE POLICY "Users can create audit programs" ON audit_programs_new
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = engagement_id
      AND e.firm_id = p.firm_id
    )
  );

CREATE POLICY "Users can update audit programs for their firm" ON audit_programs_new
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = audit_programs_new.engagement_id
      AND e.firm_id = p.firm_id
    )
  );

CREATE POLICY "Users can delete audit programs for their firm" ON audit_programs_new
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = audit_programs_new.engagement_id
      AND e.firm_id = p.firm_id
    )
  );

-- Verify
SELECT 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'audit_programs_new'
ORDER BY policyname;
