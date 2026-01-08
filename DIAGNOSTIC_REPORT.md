# 🔍 Audit Program Creation Error - Diagnostic Report

## ✅ Issue Identified

The error "Failed to create audit program" is caused by **incorrect Row Level Security (RLS) policies** in the database.

---

## 📊 Summary of Findings

### ✅ What's Working:
1. **Database Tables**: All 4 tables exist and are properly structured
   - `audit_programs_new`
   - `audit_program_sections`
   - `audit_program_boxes`
   - `audit_program_attachments`

2. **Application Code**: No errors found
   - React components properly set up
   - Hooks correctly implemented
   - Types and interfaces defined
   - Routing configured

3. **Electron App**: Running successfully
   - Vite dev server running on http://localhost:8080
   - Frontend loads without errors

### ❌ What's Broken:
**RLS Policies Have Incorrect Structure**

The migration file (`20260107000000_create_audit_program_new_tables.sql`) contains RLS policies with a **nested subquery pattern** that doesn't work correctly:

```sql
-- ❌ INCORRECT (in migration file)
CREATE POLICY "Users can create audit programs" ON audit_programs_new
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      WHERE e.id = engagement_id
    )
  );
```

The correct pattern should be:

```sql
-- ✅ CORRECT (in FIX_AUDIT_PROGRAM_RLS.sql)
CREATE POLICY "Users can create audit programs" ON audit_programs_new
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM engagements e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = engagement_id
      AND e.firm_id = p.firm_id
    )
  );
```

---

## 🔧 Root Cause Analysis

**Problem**: The RLS policy uses:
- `JOIN profiles p ON p.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())`

This creates a **Cartesian product** because it joins profiles without properly filtering by `auth.uid()` first.

**Solution**: The fix uses:
- `JOIN profiles p ON p.id = auth.uid()`
- Then adds the condition: `AND e.firm_id = p.firm_id`

This ensures:
1. Only the current user's profile is joined
2. The firm_id check is done as a WHERE condition
3. No ambiguous joins or nested subqueries

---

## 🎯 Impact

This affects **ALL** audit program operations:
- ❌ Cannot create new programs
- ❌ Cannot create sections
- ❌ Cannot create boxes
- ❌ Cannot add attachments

All operations fail at the INSERT stage due to RLS policy violations.

---

## 💡 Solution

### Option 1: Run the Fix SQL (RECOMMENDED)
Run the prepared fix file in Supabase SQL Editor:

**File**: `FIX_AUDIT_PROGRAM_RLS.sql`

This will:
1. Drop all incorrect policies
2. Recreate them with the correct structure
3. Verify the policies were created

### Option 2: Manual Fix
Go to Supabase Dashboard → SQL Editor and run:

```sql
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

-- Then copy the rest from FIX_AUDIT_PROGRAM_RLS.sql
```

---

## 📝 Action Items

1. **Immediate**: Run `FIX_AUDIT_PROGRAM_RLS.sql` in Supabase SQL Editor
2. **Verify**: Try creating an audit program again
3. **Update**: Consider updating the migration file for future deployments

---

## 🔗 Related Files

- **Fix File**: `FIX_AUDIT_PROGRAM_RLS.sql` ✅
- **Original Migration**: `supabase/migrations/20260107000000_create_audit_program_new_tables.sql` ❌
- **Hook Code**: `src/hooks/useAuditProgramNew.ts` ✅
- **Page Component**: `src/pages/AuditProgramNew.tsx` ✅

---

## ⚡ Quick Fix Command

Open Supabase SQL Editor:
https://supabase.com/dashboard/project/jrwfgfdxhlvwhzwqvwkl/sql

Then:
1. Click "New Query"
2. Copy entire content of `FIX_AUDIT_PROGRAM_RLS.sql`
3. Paste and click "Run"
4. Wait for success message
5. Refresh your Electron app
6. Try creating an audit program again

---

**Status**: Ready to fix! All diagnostic work complete. ✅
