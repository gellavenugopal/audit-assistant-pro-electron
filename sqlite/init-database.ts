/**
 * Initialize SQLite Database - Schema Only
 * Creates all 66 tables without migrating data
 * Generated: 2026-01-20
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize SQLite database with schema
 */
export function initializeDatabase(dbPath: string): Database.Database {
  console.log('🚀 Initializing SQLite Database');
  console.log('=' .repeat(60));
  
  const db = new Database(dbPath);
  
  // Enable foreign keys and optimizations
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB
  db.pragma('mmap_size = 268435456'); // 256MB
  
  console.log('✓ Database file created:', dbPath);
  console.log('✓ Pragmas configured');
  
  // Check if already initialized
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'"
  ).get();
  
  if (tableCheck) {
    console.log('✓ Database already initialized (tables exist)');
    return db;
  }
  
  // Execute schema files in order
  const schemaPath = path.join(__dirname, 'schema');
  const schemaFiles = [
    '01_core_tables.sql',
    '02_audit_workflow_tables.sql',
    '03_audit_program_tables.sql',
    '04_audit_report_tables.sql',
    '05_trial_balance_tables.sql',
    '06_going_concern_tables.sql',
    '07_rule_engine_tables.sql',
    '08_template_system_tables.sql'
  ];
  
  console.log('\n📊 Creating tables...');
  
  schemaFiles.forEach((file, index) => {
    const filePath = path.join(schemaPath, file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Schema file not found: ${file}`);
      throw new Error(`Missing schema file: ${file}`);
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      db.exec(sql);
      console.log(`   ${index + 1}. ✓ ${file}`);
    } catch (error: any) {
      console.error(`   ${index + 1}. ❌ ${file} - ${error.message}`);
      throw error;
    }
  });
  
  // Verify tables created
  const tableCount = db.prepare(
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
  ).get() as { count: number };
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Database initialized successfully!`);
  console.log(`   Tables created: ${tableCount.count}/66`);
  console.log('='.repeat(60));
  
  if (tableCount.count !== 66) {
    console.warn(`⚠️  Expected 66 tables, found ${tableCount.count}`);
  }
  
  return db;
}

/**
 * CLI execution
 */
if (require.main === module) {
  const dbPath = process.argv[2] || './audit_assistant.db';
  
  try {
    const db = initializeDatabase(dbPath);
    
    // List all tables
    console.log('\n📋 Tables created:');
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    
    tables.forEach((table, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${table.name}`);
    });
    
    db.close();
    
    console.log('\n✨ Ready to use!');
    console.log(`   Database location: ${dbPath}`);
    console.log(`   Next step: Start your application and use getDatabase()`);
    
  } catch (error: any) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  }
}
