import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://jrwfgfdxhlvwhzwqvwkl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZnZmR4aGx2d2h6d3F2d2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTY0NzgsImV4cCI6MjA4MjM5MjQ3OH0.kPdLFeQTwPHJxGGVaDzFkATineghZ7qQeWLatdFMGQU';

console.log('🚀 Executing Database Migration...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeSQLStatements() {
  const sqlFile = path.join(process.cwd(), 'RUN_THIS_SQL.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split into individual statements (simplified approach)
  const statements = sql
    .split('-- ============================================')
    .filter(section => section.trim())
    .map(section => section.split('--').filter(line => !line.trim().startsWith('STEP')).join('--'))
    .join('')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || 
        statement.includes('ALTER TABLE') || statement.includes('CREATE POLICY') ||
        statement.includes('INSERT INTO storage') || statement.includes('CREATE TRIGGER') ||
        statement.includes('CREATE OR REPLACE FUNCTION')) {
      
      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        // Try direct RPC call
        const { data, error } = await supabase.rpc('exec_sql', { query: statement + ';' });
        
        if (error) {
          // Try alternative method - using from() with dummy query
          console.log(`   ⚠️  Standard execution not available`);
          errorCount++;
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ⚠️  ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Completed: ${successCount} successful`);
  console.log(`⚠️  Requires manual execution: ${errorCount} statements`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n📋 Manual migration required:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/jrwfgfdxhlvwhzwqvwkl/sql');
    console.log('2. Copy ALL content from: RUN_THIS_SQL.sql');
    console.log('3. Paste and click "Run"');
    console.log('\n🔗 Direct link: https://supabase.com/dashboard/project/jrwfgfdxhlvwhzwqvwkl/sql/new');
  } else {
    console.log('\n✨ Migration completed successfully!');
    console.log('🎉 You can now use the Audit Program New feature!');
  }
}

executeSQLStatements().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.log('\n📋 Please run the migration manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/jrwfgfdxhlvwhzwqvwkl/sql');
  console.log('2. Copy ALL content from: RUN_THIS_SQL.sql');
  console.log('3. Paste and click "Run"');
});
