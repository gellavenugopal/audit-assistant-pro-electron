-- ============================================================
-- VERIFICATION QUERIES - Run these in Supabase SQL Editor
-- ============================================================

-- 1. Check all audit program table names
SELECT tablename, schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'audit_program%'
ORDER BY tablename;

-- Expected results:
-- audit_program_attachments
-- audit_program_boxes
-- audit_program_sections
-- audit_programs_new

-- ============================================================

-- 2. Check RLS is enabled on these tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'audit_program%'
ORDER BY tablename;

-- Expected: rowsecurity = true for all tables

-- ============================================================

-- 3. Check all RLS policies
SELECT 
  tablename, 
  policyname, 
  cmd as command,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('audit_programs_new', 'audit_program_sections', 'audit_program_boxes', 'audit_program_attachments')
ORDER BY tablename, policyname;

-- Expected: Should see policies for SELECT, INSERT, UPDATE, DELETE

-- ============================================================

-- 4. Check the ACTUAL policy definitions (this shows the SQL)
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'audit_programs_new'
AND policyname = 'Users can create audit programs';

-- This will show you the EXACT SQL in the INSERT policy
-- Look for the JOIN clause - it should be:
--   JOIN profiles p ON p.id = auth.uid()
-- NOT:
--   JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())

-- ============================================================

-- 5. Test if you can see the table structure
\d audit_programs_new

-- OR use this SQL version:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'audit_programs_new'
ORDER BY ordinal_position;

-- ============================================================
-- If the table names don't match what the code expects,
-- that's your issue!
-- ============================================================
