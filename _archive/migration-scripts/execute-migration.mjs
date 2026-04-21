import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://vqkwxpxzpvfngulhfrgf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeMigration() {
  console.log('🚀 Starting database migration...\n');

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260107000000_create_audit_program_new_tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded');
  console.log('📊 Creating tables: audit_programs_new, audit_program_sections, audit_program_boxes, audit_program_attachments\n');

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set.');
    console.log('\n📋 MANUAL MIGRATION REQUIRED:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/vqkwxpxzpvfngulhfrgf/sql');
    console.log('2. Click "New Query"');
    console.log('3. Copy the SQL below and paste it:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n4. Click "Run" button\n');
    
    // Also show storage bucket SQL
    const storagePath = path.join(process.cwd(), 'supabase', 'migrations', '20260107000001_create_storage_bucket.sql');
    if (fs.existsSync(storagePath)) {
      const storageSQL = fs.readFileSync(storagePath, 'utf8');
      console.log('5. Then run this storage bucket SQL:\n');
      console.log('─'.repeat(80));
      console.log(storageSQL);
      console.log('─'.repeat(80));
    }
    
    console.log('\n✅ After running the SQL, your database will be ready!\n');
    return;
  }

  try {
    // Try to execute via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });

    if (response.ok) {
      console.log('✅ Migration completed successfully!');
    } else {
      const error = await response.text();
      console.log('⚠️  Could not execute via API:', error);
      console.log('\n📋 Please run the migration manually in Supabase dashboard.');
    }
  } catch (error) {
    console.log('⚠️  Could not execute automatically:', error.message);
    console.log('\n📋 Please run the migration manually in Supabase dashboard.');
  }
}

executeMigration();
