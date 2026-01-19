/**
 * Run Trial Balance New Migration
 * Executes the migration SQL directly using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL not found in .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.error('\n💡 To get your Service Role Key:');
  console.error('   1. Go to Supabase Dashboard');
  console.error('   2. Project Settings > API');
  console.error('   3. Copy the "service_role" key (keep it secret!)');
  console.error('   4. Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your-key-here\n');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql) {
  // Use the REST API to execute SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    // Try alternative method using PostgREST
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return await response.json();
}

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250115000001_create_trial_balance_new_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Executing migration...');
    console.log(`   Project: ${SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}`);
    console.log('   This may take a few moments...\n');

    // Remove comments and split into statements
    const statements = migrationSQL
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--') && trimmed !== ';';
      })
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^COMMENT\s+ON/i));

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute statements one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (!statement || statement.trim().length === 0) continue;
      
      // Skip COMMENT statements (they can cause issues)
      if (statement.toUpperCase().includes('COMMENT ON')) {
        console.log(`   ⏭️  Skipping COMMENT statement (${i + 1}/${statements.length})`);
        continue;
      }

      try {
        // Use Supabase REST API to execute SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ sql: statement + ';' })
        });

        if (!response.ok) {
          // Try using PostgREST directly for DDL statements
          // For CREATE TABLE, ALTER TABLE, etc., we need to use a different approach
          const errorText = await response.text();
          
          // If exec_sql function doesn't exist, we'll need to use psql or dashboard
          if (errorText.includes('function exec_sql') || errorText.includes('does not exist')) {
            throw new Error('Direct SQL execution not available. Please use Supabase Dashboard SQL Editor or install Supabase CLI.');
          }
          
          // Some errors are acceptable (like "already exists")
          if (errorText.includes('already exists') || errorText.includes('duplicate')) {
            console.log(`   ⚠️  Statement ${i + 1}: Already exists (skipping)`);
            successCount++;
            continue;
          }
          
          throw new Error(errorText);
        }

        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Processed ${i + 1}/${statements.length} statements...`);
        }
      } catch (err) {
        errorCount++;
        const errorMsg = err.message.substring(0, 100);
        errors.push({ statement: i + 1, error: errorMsg });
        console.error(`   ❌ Error in statement ${i + 1}: ${errorMsg}`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Successful statements: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
      console.log('\n⚠️  Some statements failed. This might be normal if:');
      console.log('   - Tables already exist');
      console.log('   - Indexes/triggers already exist');
      console.log('   - Using Supabase Dashboard is recommended for DDL statements\n');
    } else {
      console.log('\n✨ All tables created successfully!\n');
    }

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'tb_new_%');

    if (!verifyError && tables) {
      const tableNames = tables.map(t => t.table_name).sort();
      console.log(`   Found ${tableNames.length} tables:`);
      tableNames.forEach(name => console.log(`   ✓ ${name}`));
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Alternative methods:');
    console.error('   1. Supabase Dashboard: Go to SQL Editor and paste the migration SQL');
    console.error('   2. Supabase CLI: Run "supabase db push" (if CLI is installed)');
    console.error('   3. psql: Connect directly using PostgreSQL client\n');
    process.exit(1);
  }
}

runMigration();

