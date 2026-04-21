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

console.log('🧪 Testing Audit Program Loading...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test 1: Check authentication
console.log('1️⃣ Checking authentication...');
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  console.log('❌ Not authenticated. You need to be logged in to test this.');
  console.log('Please log in to the app first, then run this script again.\n');
  process.exit(1);
}
console.log(`✅ Authenticated as: ${user.email}\n`);

// Test 2: Check profile and firm_id
console.log('2️⃣ Checking user profile...');
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

if (profileError) {
  console.log('❌ Profile error:', profileError.message);
  process.exit(1);
}
console.log(`✅ Profile found - Firm ID: ${profile.firm_id}\n`);

// Test 3: Check engagements
console.log('3️⃣ Checking engagements...');
const { data: engagements, error: engError } = await supabase
  .from('engagements')
  .select('id, name')
  .limit(5);

if (engError) {
  console.log('❌ Engagement error:', engError.message);
} else if (!engagements || engagements.length === 0) {
  console.log('⚠️  No engagements found. Create an engagement first.');
} else {
  console.log(`✅ Found ${engagements.length} engagement(s)`);
  console.log('   First engagement:', engagements[0].name);
}
console.log();

// Test 4: Try to load audit programs
console.log('4️⃣ Testing audit program loading...');
const testEngagementId = engagements?.[0]?.id;

if (!testEngagementId) {
  console.log('⚠️  No engagement ID to test with.\n');
} else {
  console.log(`   Using engagement ID: ${testEngagementId}`);
  
  const { data: programs, error: loadError } = await supabase
    .from('audit_programs_new')
    .select('*')
    .eq('engagement_id', testEngagementId)
    .order('created_at', { ascending: false });

  if (loadError) {
    console.log('❌ Failed to load audit programs');
    console.log('   Error Code:', loadError.code);
    console.log('   Error Message:', loadError.message);
    console.log('   Error Details:', loadError.details);
    console.log('   Error Hint:', loadError.hint);
    
    if (loadError.code === '42501') {
      console.log('\n💡 This is a permission error (RLS policy blocking SELECT).');
      console.log('   The RLS policy for SELECT is too restrictive.');
    }
  } else {
    console.log(`✅ Successfully loaded ${programs?.length || 0} audit program(s)\n`);
    if (programs && programs.length > 0) {
      console.log('   First program:', programs[0].name);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('Test complete!');
console.log('='.repeat(60));
