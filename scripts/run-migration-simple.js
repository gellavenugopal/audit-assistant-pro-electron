/**
 * Simple Migration Runner for Trial Balance New
 * This script executes the migration using Supabase client
 * 
 * Prerequisites:
 * 1. Add SUPABASE_SERVICE_ROLE_KEY to .env file
 * 2. Run setup-migration-helper.sql once in Supabase Dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('   - VITE_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  console.error('   Get it from: Supabase Dashboard > Project Settings > API > service_role key\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  try {
    console.log('📦 Loading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250115000001_create_trial_balance_new_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Executing migration...\n');

    // Check if exec_sql function exists
    const { data: funcExists, error: checkError } = await supabase
      .rpc('exec_sql', { sql_text: 'SELECT 1' })
      .then(() => ({ data: true, error: null }))
      .catch(err => ({ data: false, error: err }));

    if (checkError && checkError.message.includes('function exec_sql')) {
      console.error('❌ Helper function not found!');
      console.error('\n📋 First-time setup required:');
      console.error('   1. Go to Supabase Dashboard SQL Editor');
      console.error('   2. Run: scripts/setup-migration-helper.sql');
      console.error('   3. Then run this script again\n');
      process.exit(1);
    }

    // Split SQL into executable statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 0 
          && !trimmed.startsWith('--') 
          && !trimmed.match(/^COMMENT\s+ON/i)
          && !trimmed.match(/^=\s*$/);
      });

    console.log(`   Found ${statements.length} SQL statements to execute\n`);

    let success = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const statementNum = i + 1;

      try {
        // Execute via RPC
        const { error } = await supabase.rpc('exec_sql', { sql_text: stmt + ';' });

        if (error) {
          // Some errors are acceptable (already exists, etc.)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('does not exist') && stmt.toUpperCase().includes('DROP')) {
            skipped++;
            continue;
          }
          throw error;
        }

        success++;
        if (statementNum % 5 === 0) {
          process.stdout.write(`   ✓ ${statementNum}/${statements.length}\r`);
        }
      } catch (err) {
        errors.push({ statement: statementNum, error: err.message });
        console.error(`\n   ❌ Statement ${statementNum} failed: ${err.message.substring(0, 80)}`);
      }
    }

    console.log(`\n\n✅ Migration Summary:`);
    console.log(`   ✓ Successful: ${success}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Some statements had errors (may be normal if objects already exist)');
    }

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'tb_new_%')
      .order('table_name');

    if (!verifyError && tables && tables.length > 0) {
      console.log(`\n✨ Found ${tables.length} tables:`);
      tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
    } else {
      console.log('   ⚠️  Could not verify tables (this is okay if migration had errors)');
    }

    console.log('\n✨ Done!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure SUPABASE_SERVICE_ROLE_KEY is in .env');
    console.error('   2. Run setup-migration-helper.sql in Supabase Dashboard');
    console.error('   3. Or use Supabase Dashboard SQL Editor directly\n');
    process.exit(1);
  }
}

runMigration();

