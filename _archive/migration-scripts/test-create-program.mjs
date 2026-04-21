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

console.log('🧪 Testing Audit Program Creation...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  console.log('❌ Not authenticated. Please log in to the app first.');
  process.exit(1);
}

console.log(`✅ Authenticated as: ${user.email}\n`);

// Check if user has a profile
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

if (profileError) {
  console.log('❌ Profile error:', profileError.message);
  console.log('Details:', profileError);
  process.exit(1);
}

console.log(`✅ Profile found - Firm ID: ${profile.firm_id}\n`);

// Try to create a test program (we'll delete it after)
console.log('📝 Attempting to create test audit program...\n');

const { data: program, error: programError } = await supabase
  .from('audit_programs_new')
  .insert({
    engagement_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
    client_id: '00000000-0000-0000-0000-000000000000',
    financial_year_id: '00000000-0000-0000-0000-000000000000',
    name: 'Test Program',
    description: 'Test Description',
    status: 'draft',
    created_by: user.id,
  })
  .select()
  .single();

if (programError) {
  console.log('❌ Failed to create program:');
  console.log('Error Code:', programError.code);
  console.log('Error Message:', programError.message);
  console.log('Error Details:', programError.details);
  console.log('Error Hint:', programError.hint);
  
  if (programError.code === '23503') {
    console.log('\n💡 This is a foreign key constraint error.');
    console.log('   Make sure you have valid engagement_id, client_id, and financial_year_id');
  } else if (programError.code === '42501') {
    console.log('\n💡 This is a permission error (RLS policy).');
    console.log('   The RLS policy is blocking the insert.');
  }
} else {
  console.log('✅ Program created successfully!');
  console.log('Program ID:', program.id);
  
  // Clean up
  const { error: deleteError } = await supabase
    .from('audit_programs_new')
    .delete()
    .eq('id', program.id);
  
  if (deleteError) {
    console.log('⚠️  Could not delete test program:', deleteError.message);
  } else {
    console.log('✅ Test program cleaned up');
  }
}
