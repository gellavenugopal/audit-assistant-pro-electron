# Audit Program New - Setup Instructions

## Current Status
The page has been created but needs database setup to function properly.

- Canonical schema: `supabase/migrations/20260107000000_create_audit_program_new_tables.sql` (use this for supabase db push or copy/paste in SQL Editor). All other helper SQL files were removed to avoid duplication.

## Setup Steps

### 1. Run the Database Migration

You need to apply the migration to create the necessary database tables. Run this command in your terminal:

```bash
supabase db push
```

Or if you're using a remote Supabase project, apply the migration via the Supabase dashboard:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20260107000000_create_audit_program_new_tables.sql`
4. Paste and execute it

### 2. Create Storage Bucket for Attachments

Run this SQL in your Supabase SQL Editor:

```sql
-- Create storage bucket for audit program attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-attachments', 'audit-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Users can upload audit attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audit-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their firm's attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audit-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their firm's attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audit-attachments' AND
  auth.uid() IS NOT NULL
);
```

### 3. Regenerate Supabase Types (Optional but Recommended)

If you have Supabase CLI set up, regenerate the TypeScript types:

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Or for remote:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### 4. Remove Temporary Code

Once the migration is complete, in `src/pages/AuditProgramNew.tsx`, uncomment the real hook calls and remove the temporary placeholders:

Around line 64-72, **remove these lines**:
```typescript
  // Temporarily disable until database migration is run
  const programs: any[] = [];
  const programsLoading = false;
  const createProgram = async () => null;
  const updateProgram = async () => {};
  const deleteProgram = async () => {};
  
  // const { programs, loading: programsLoading, createProgram, updateProgram, deleteProgram } = useAuditProgramNew(currentEngagement?.id || null);
```

And **uncomment this line**:
```typescript
const { programs, loading: programsLoading, createProgram, updateProgram, deleteProgram } = useAuditProgramNew(currentEngagement?.id || null);
```

Similarly around line 80-84, **remove these lines**:
```typescript
  // Temporarily disable until database migration is run
  const sections: any[] = [];
  const sectionsLoading = false;
  
  // const { sections, loading: sectionsLoading, refetch: refetchSections } = useAuditProgramSections(selectedProgramId);
```

And **uncomment this line**:
```typescript
const { sections, loading: sectionsLoading, refetch: refetchSections } = useAuditProgramSections(selectedProgramId);
```

### 5. Restart Your Development Server

After completing the above steps, restart your development server:

```bash
npm run electron:dev
```

## Testing the Feature

1. Navigate to "Audit Program New" from the sidebar
2. Click "New Program" button
3. Fill in the details and create a program
4. Click on the program card to view sections
5. Expand any section (e.g., "Property, Plant and Equipment")
6. Edit the default boxes or add new ones
7. Test the save, edit, and delete functionality

## Troubleshooting

### "Failed to load audit programs" Error
- **Cause**: Database tables don't exist yet
- **Solution**: Run the migration (Step 1 above)

### TypeScript Errors in useAuditProgramNew.ts
- **Cause**: Supabase types haven't been regenerated
- **Solution**: Run Step 3 to regenerate types, or temporarily add `// @ts-ignore` comments

### "Storage bucket not found" Error
- **Cause**: Storage bucket not created
- **Solution**: Run the SQL from Step 2

### Page Shows "No Engagement Selected"
- **Cause**: No engagement is currently selected
- **Solution**: Go to Engagements page and select or create an engagement first

## What's Working Now

Even without the database migration, the following is working:
- Page routing and navigation
- UI layout and design
- Component structure
- All the TypeScript types and interfaces
- The migration file is ready to be applied

## Next Steps After Setup

Once the feature is working, you can enhance it with:
- Add more validation rules
- Implement the export/import functionality
- Add real-time collaboration features
- Integrate with the trial balance for cross-referencing
- Add approval workflow notifications
- Create custom report templates

See `AUDIT_PROGRAM_NEW_FEATURES.md` for a comprehensive list of feature suggestions.
