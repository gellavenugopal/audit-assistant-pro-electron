import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vqkwxpxzpvfngulhfrgf.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxa3d4cHh6cHZmbmd1bGhmcmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NTA3MDYsImV4cCI6MjA1MDUyNjcwNn0.Pu1uLwEwOd_hMQqQYdqmCWn06qxWR9VhGdWtR-LAvmo';

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260107000000_create_audit_program_new_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    console.log('This will create the following tables:');
    console.log('- audit_programs_new');
    console.log('- audit_program_sections');
    console.log('- audit_program_boxes');
    console.log('- audit_program_attachments');
    console.log('');

    // Split the SQL into individual statements
    // Remove comments and split by semicolon
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute...`);
    console.log('');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_').select('*').limit(0);
          console.log(`  ⚠ Note: Cannot execute via client. Please run manually in Supabase dashboard.`);
          console.log(`  Statement preview: ${statement.substring(0, 100)}...`);
        } else {
          console.log(`  ✓ Success`);
        }
      } catch (err) {
        console.log(`  ⚠ Note: ${err.message}`);
      }
    }

    console.log('');
    console.log('============================================');
    console.log('Migration file prepared!');
    console.log('============================================');
    console.log('');
    console.log('⚠️  IMPORTANT: Supabase client cannot directly execute DDL statements.');
    console.log('');
    console.log('Please complete the migration manually:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/vqkwxpxzpvfngulhfrgf/sql');
    console.log('2. Click "New Query"');
    console.log('3. Copy the entire contents of:');
    console.log('   supabase/migrations/20260107000000_create_audit_program_new_tables.sql');
    console.log('4. Paste into the SQL editor');
    console.log('5. Click "Run" button');
    console.log('');
    console.log('Alternatively, you can install Supabase CLI:');
    console.log('  npm install -g supabase');
    console.log('  supabase link --project-ref vqkwxpxzpvfngulhfrgf');
    console.log('  supabase db push');
    console.log('');

    // Also create the storage bucket setup SQL
    const storageSql = `
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
`;

    const storageFilePath = path.join(process.cwd(), 'supabase', 'migrations', '20260107000001_create_storage_bucket.sql');
    fs.writeFileSync(storageFilePath, storageSql);
    console.log('✓ Storage bucket SQL created at: supabase/migrations/20260107000001_create_storage_bucket.sql');
    console.log('  Run this after the main migration.');
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('');
    console.error('Please run the migration manually in Supabase dashboard.');
  }
}

runMigration();
