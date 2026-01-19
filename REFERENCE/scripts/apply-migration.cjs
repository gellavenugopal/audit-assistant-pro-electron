/**
 * Run this script to apply the IFC migration
 * Usage: node scripts/apply-migration.js
 */

const https = require('https');

const SUPABASE_URL = 'https://jrwfgfdxhlvwhzwqvwkl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZnZmR4aGx2d2h6d3F2d2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTY0NzgsImV4cCI6MjA4MjM5MjQ3OH0.kPdLFeQTwPHJxGGVaDzFkATineghZ7qQeWLatdFMGQU';

console.log('⚠️  Anon key cannot run DDL statements like ALTER TABLE');
console.log('');
console.log('Please apply the migration manually:');
console.log('');
console.log('1. Open: ' + SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/').replace('.supabase.co', '/sql/new'));
console.log('');
console.log('2. Run this SQL:');
console.log('');
console.log(`
ALTER TABLE audit_report_setup
  ADD COLUMN IF NOT EXISTS is_public_unlisted_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS private_turnover_above_50cr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS private_borrowing_above_25cr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_small_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_opc BOOLEAN DEFAULT false;
`);
