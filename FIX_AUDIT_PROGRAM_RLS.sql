-- Fix RLS Policies for Audit Program Tables
-- Run this in Supabase SQL Editor to fix the "Failed to create audit program" error

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view audit programs for their firm" ON audit_programs_new;
DROP POLICY IF EXISTS "Users can create audit programs" ON audit_programs_new;
DROP POLICY IF EXISTS "Users can update audit programs for their firm" ON audit_programs_new;
DROP POLICY IF EXISTS "Users can delete audit programs for their firm" ON audit_programs_new;

DROP POLICY IF EXISTS "Users can view sections for their firm's programs" ON audit_program_sections;
DROP POLICY IF EXISTS "Users can manage sections" ON audit_program_sections;

DROP POLICY IF EXISTS "Users can view boxes for their firm's programs" ON audit_program_boxes;
DROP POLICY IF EXISTS "Users can manage boxes" ON audit_program_boxes;

DROP POLICY IF EXISTS "Users can view attachments for their firm's programs" ON audit_program_attachments;
DROP POLICY IF EXISTS "Users can manage attachments" ON audit_program_attachments;

-- Create corrected policies for audit_programs_new
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

-- Create corrected policies for audit_program_sections
CREATE POLICY "Users can view sections for their firm's programs" ON audit_program_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE ap.id = audit_program_sections.audit_program_id
      AND e.firm_id = p.firm_id
    )
  );

CREATE POLICY "Users can manage sections" ON audit_program_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE ap.id = audit_program_sections.audit_program_id
      AND e.firm_id = p.firm_id
    )
  );

-- Create corrected policies for audit_program_boxes
CREATE POLICY "Users can view boxes for their firm's programs" ON audit_program_boxes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audit_program_sections aps
      JOIN audit_programs_new ap ON ap.id = aps.audit_program_id
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE aps.id = audit_program_boxes.section_id
      AND e.firm_id = p.firm_id
    )
  );

CREATE POLICY "Users can manage boxes" ON audit_program_boxes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM audit_program_sections aps
      JOIN audit_programs_new ap ON ap.id = aps.audit_program_id
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE aps.id = audit_program_boxes.section_id
      AND e.firm_id = p.firm_id
    )
  );

-- Create corrected policies for audit_program_attachments
CREATE POLICY "Users can view attachments for their firm's programs" ON audit_program_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE ap.id = audit_program_attachments.audit_program_id
      AND e.firm_id = p.firm_id
    )
  );

CREATE POLICY "Users can manage attachments" ON audit_program_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM audit_programs_new ap
      JOIN engagements e ON e.id = ap.engagement_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE ap.id = audit_program_attachments.audit_program_id
      AND e.firm_id = p.firm_id
    )
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('audit_programs_new', 'audit_program_sections', 'audit_program_boxes', 'audit_program_attachments')
ORDER BY tablename, policyname;
