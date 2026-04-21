import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf-8');

// Parse environment variables
const parseEnv = (content) => {
  const lines = content.split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      env[key.trim()] = value.trim();
    }
  }
  return env;
};

const env = parseEnv(envContent);
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Verifying Database Migration...\n');
console.log(`📡 Connecting to: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

// Check if tables exist
const tablesToCheck = [
  'audit_programs_new',
  'audit_program_sections',
  'audit_program_boxes',
  'audit_program_attachments'
];

let allTablesExist = true;

for (const tableName of tablesToCheck) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table "${tableName}" does NOT exist`);
        allTablesExist = false;
      } else if (error.code === 'PGRST116') {
        console.log(`✅ Table "${tableName}" exists (empty)`);
      } else {
        console.log(`⚠️  Table "${tableName}" - Error: ${error.message}`);
      }
    } else {
      console.log(`✅ Table "${tableName}" exists with ${data?.length || 0} rows`);
    }
  } catch (err) {
    console.log(`❌ Table "${tableName}" - Error: ${err.message}`);
    allTablesExist = false;
  }
}

console.log('\n' + '='.repeat(60));

if (allTablesExist) {
  console.log('✅ All tables exist! Migration completed successfully!');
  console.log('\n🎉 You can now use the Audit Program New feature!');
  console.log('📍 Navigate to: http://localhost:8081/programs-new');
} else {
  console.log('❌ Some tables are missing. Migration not completed.');
  console.log('\n📋 Please run the SQL manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/jrwfgfdxhlvwhzwqvwkl/sql/new');
  console.log('2. Copy ALL content from: RUN_THIS_SQL.sql');
  console.log('3. Paste and click "Run"');
}

console.log('='.repeat(60));
