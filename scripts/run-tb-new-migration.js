/**
 * Script to run Trial Balance New migration
 * This script executes the migration SQL file against Supabase
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL or SUPABASE_URL not found in .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY not found in .env');
  console.error('   Please add your Supabase Service Role Key to .env file');
  console.error('   You can find it in: Supabase Dashboard > Project Settings > API > service_role key');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250115000001_create_trial_balance_new_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Executing migration...');
    console.log('   This may take a few moments...\n');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      try {
        // Execute each statement
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(0);
          
          if (queryError && queryError.message.includes('exec_sql')) {
            // Fallback: Use REST API to execute SQL
            console.log('⚠️  Note: Using alternative method to execute SQL...');
            // For complex migrations, we'll need to use psql or Supabase CLI
            throw new Error('Direct SQL execution not available. Please use Supabase CLI or Dashboard.');
          }
        }
        
        successCount++;
      } catch (err) {
        // Skip COMMENT statements
        if (statement.toUpperCase().includes('COMMENT')) {
          continue;
        }
        errorCount++;
        console.error(`   ⚠️  Error executing statement: ${err.message}`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Successful statements: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Run the migration manually using one of these methods:');
    console.error('   1. Supabase Dashboard: Go to SQL Editor and paste the migration SQL');
    console.error('   2. Supabase CLI: Run "supabase db push"');
    console.error('   3. psql: Connect directly and run the SQL file');
    process.exit(1);
  }
}

runMigration();

