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

console.log('🔍 Checking RLS Policies for Audit Program Tables...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Query to check RLS policies
const query = `
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  SUBSTRING(qual::text, 1, 200) as policy_check,
  SUBSTRING(with_check::text, 1, 200) as with_check_clause
FROM pg_policies 
WHERE tablename IN ('audit_programs_new', 'audit_program_sections', 'audit_program_boxes', 'audit_program_attachments')
ORDER BY tablename, policyname;
`;

const { data, error } = await supabase.rpc('exec_sql', { 
  query: query 
}).catch(async () => {
  // If RPC doesn't work, try direct query
  const { data: policies, error: polError } = await supabase
    .from('pg_policies')
    .select('*')
    .in('tablename', ['audit_programs_new', 'audit_program_sections', 'audit_program_boxes', 'audit_program_attachments']);
  
  return { data: policies, error: polError };
});

if (error) {
  console.log('❌ Error fetching policies:', error.message);
  console.log('\n💡 You need to check the policies manually in Supabase Dashboard');
  console.log('   Go to: Database → Tables → audit_programs_new → Policies');
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('⚠️  No RLS policies found!');
  console.log('   This means RLS is enabled but no policies exist.');
  console.log('   You need to run FIX_AUDIT_PROGRAM_RLS.sql');
} else {
  console.log('✅ Found RLS Policies:\n');
  console.table(data);
  
  console.log('\n📋 Policy Details:');
  data.forEach(policy => {
    console.log(`\nTable: ${policy.tablename}`);
    console.log(`Policy: ${policy.policyname}`);
    console.log(`Command: ${policy.cmd}`);
    if (policy.policy_check) console.log(`Check: ${policy.policy_check}`);
    if (policy.with_check_clause) console.log(`With Check: ${policy.with_check_clause}`);
  });
}

console.log('\n============================================================');
console.log('To verify the actual table names in your database:');
console.log('Run this query in Supabase SQL Editor:');
console.log('');
console.log("SELECT tablename FROM pg_tables");
console.log("WHERE schemaname = 'public'");
console.log("AND tablename LIKE 'audit_program%'");
console.log("ORDER BY tablename;");
console.log('============================================================\n');
