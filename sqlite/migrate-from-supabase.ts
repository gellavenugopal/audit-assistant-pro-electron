/**
 * Data Migration Script - Supabase to SQLite
 * Exports data from Supabase and imports into SQLite
 * Generated: 2026-01-20
 */

import { createClient } from '@supabase/supabase-js';
import { DatabaseManager } from './database-manager';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationConfig {
  supabaseUrl: string;
  supabaseKey: string;
  sqliteDbPath: string;
  batchSize?: number;
}

interface MigrationStats {
  table: string;
  exported: number;
  imported: number;
  errors: number;
  duration: number;
}

/**
 * Table migration order (respects foreign key dependencies)
 */
const MIGRATION_ORDER = [
  // Core tables (no dependencies)
  'firm_settings',
  'financial_years',
  'profiles',
  'user_roles',
  'partners',
  'clients',
  
  // Engagements (depends on clients, profiles, firm_settings)
  'engagements',
  'engagement_assignments',
  
  // Audit workflow
  'compliance_applicability',
  'materiality_risk_assessment',
  'risks',
  'standard_programs',
  'standard_procedures',
  'procedure_template_checklist_items',
  'procedure_template_evidence_requirements',
  'audit_procedures',
  'procedure_assignees',
  'procedure_checklist_items',
  'procedure_evidence_requirements',
  'evidence_files',
  'evidence_links',
  'review_notes',
  'notifications',
  
  // Audit programs
  'audit_programs_new',
  'audit_program_sections',
  'audit_program_boxes',
  'audit_program_attachments',
  'engagement_letter_templates',
  
  // Audit reports
  'audit_report_setup',
  'audit_report_main_content',
  'audit_report_documents',
  'audit_report_document_versions',
  'audit_report_comments',
  'audit_report_evidence',
  'audit_report_exports',
  'key_audit_matters',
  'caro_clause_library',
  'caro_clause_responses',
  'caro_standard_answers',
  
  // Trial balance
  'trial_balance_lines',
  'schedule_iii_config',
  'tb_new_entity_info',
  'tb_new_ledgers',
  'tb_new_stock_items',
  'tb_new_classification_mappings',
  'tb_new_sessions',
  
  // Going concern
  'going_concern_workpapers',
  'going_concern_checklist_items',
  'gc_annexure_net_worth',
  'gc_annexure_profitability',
  'gc_annexure_borrowings',
  'gc_annexure_cash_flows',
  'gc_annexure_ratios',
  
  // Rule engine
  'aile_rule_sets',
  'aile_mapping_rules',
  'rule_engine_group_rules',
  'rule_engine_keyword_rules',
  'rule_engine_override_rules',
  'rule_engine_validation_rules',
  
  // Templates & System
  'fs_templates',
  'activity_logs',
  'audit_trail',
  'tally_bridge_sessions',
  'tally_bridge_requests',
  'feedback_reports',
  'feedback_attachments'
];

/**
 * Main Migration Class
 */
export class SupabaseToSQLiteMigration {
  private supabase: any;
  private sqlite: DatabaseManager;
  private config: MigrationConfig;
  private stats: MigrationStats[] = [];
  private batchSize: number;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.batchSize = config.batchSize || 1000;
    
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.sqlite = new DatabaseManager(config.sqliteDbPath);
  }

  /**
   * Run full migration
   */
  async migrate(): Promise<void> {
    console.log('🚀 Starting Supabase → SQLite Migration');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();

    try {
      for (const table of MIGRATION_ORDER) {
        await this.migrateTable(table);
      }

      const totalDuration = Date.now() - startTime;
      this.printSummary(totalDuration);
      this.saveReport();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      this.sqlite.close();
    }
  }

  /**
   * Migrate single table
   */
  private async migrateTable(tableName: string): Promise<void> {
    console.log(`\n📊 Migrating: ${tableName}`);
    const startTime = Date.now();
    
    let exported = 0;
    let imported = 0;
    let errors = 0;
    let offset = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        // Fetch batch from Supabase
        const { data, error } = await this.supabase
          .from(tableName)
          .select('*')
          .range(offset, offset + this.batchSize - 1);

        if (error) {
          console.error(`   ❌ Error fetching from ${tableName}:`, error.message);
          errors++;
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        exported += data.length;

        // Transform and insert into SQLite
        const transformed = this.transformData(tableName, data);
        const insertedCount = await this.insertBatch(tableName, transformed);
        imported += insertedCount;

        console.log(`   ✓ Batch: ${offset}-${offset + data.length} (${data.length} records)`);

        if (data.length < this.batchSize) {
          hasMore = false;
        } else {
          offset += this.batchSize;
        }
      }

      const duration = Date.now() - startTime;
      this.stats.push({ table: tableName, exported, imported, errors, duration });
      
      console.log(`   ✅ Complete: ${imported} records in ${(duration / 1000).toFixed(2)}s`);

    } catch (error: any) {
      console.error(`   ❌ Error migrating ${tableName}:`, error.message);
      errors++;
      const duration = Date.now() - startTime;
      this.stats.push({ table: tableName, exported, imported, errors, duration });
    }
  }

  /**
   * Transform data from PostgreSQL to SQLite format
   */
  private transformData(tableName: string, data: any[]): any[] {
    return data.map(row => {
      const transformed: any = {};

      for (const [key, value] of Object.entries(row)) {
        // Convert boolean to integer
        if (typeof value === 'boolean') {
          transformed[key] = value ? 1 : 0;
        }
        // Convert arrays to JSON string
        else if (Array.isArray(value)) {
          transformed[key] = JSON.stringify(value);
        }
        // Convert objects to JSON string
        else if (value !== null && typeof value === 'object') {
          transformed[key] = JSON.stringify(value);
        }
        // Convert timestamps
        else if (value instanceof Date) {
          transformed[key] = value.toISOString();
        }
        // Keep null and primitives as-is
        else {
          transformed[key] = value;
        }
      }

      return transformed;
    });
  }

  /**
   * Insert batch into SQLite
   */
  private async insertBatch(tableName: string, data: any[]): Promise<number> {
    let count = 0;

    this.sqlite.transaction(() => {
      for (const row of data) {
        try {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map(() => '?').join(',');

          const sql = `
            INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
          `;

          this.sqlite.prepare(sql).run(...values);
          count++;
        } catch (error: any) {
          console.error(`     ⚠️  Error inserting row:`, error.message);
        }
      }
    });

    return count;
  }

  /**
   * Print migration summary
   */
  private printSummary(totalDuration: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));

    const totalExported = this.stats.reduce((sum, s) => sum + s.exported, 0);
    const totalImported = this.stats.reduce((sum, s) => sum + s.imported, 0);
    const totalErrors = this.stats.reduce((sum, s) => sum + s.errors, 0);

    console.log(`Total Records Exported: ${totalExported}`);
    console.log(`Total Records Imported: ${totalImported}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60));

    if (totalErrors > 0) {
      console.log('\n⚠️  Tables with errors:');
      this.stats
        .filter(s => s.errors > 0)
        .forEach(s => console.log(`   - ${s.table}: ${s.errors} errors`));
    }
  }

  /**
   * Save migration report
   */
  private saveReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      config: {
        supabaseUrl: this.config.supabaseUrl,
        sqliteDbPath: this.config.sqliteDbPath,
        batchSize: this.batchSize
      },
      stats: this.stats,
      summary: {
        totalExported: this.stats.reduce((sum, s) => sum + s.exported, 0),
        totalImported: this.stats.reduce((sum, s) => sum + s.imported, 0),
        totalErrors: this.stats.reduce((sum, s) => sum + s.errors, 0),
        totalDuration: this.stats.reduce((sum, s) => sum + s.duration, 0)
      }
    };

    const reportPath = path.join(
      path.dirname(this.config.sqliteDbPath),
      `migration-report-${Date.now()}.json`
    );

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);
  }

  /**
   * Migrate specific tables only
   */
  async migrateTables(tables: string[]): Promise<void> {
    console.log(`🚀 Migrating specific tables: ${tables.join(', ')}`);
    
    for (const table of tables) {
      if (MIGRATION_ORDER.includes(table)) {
        await this.migrateTable(table);
      } else {
        console.warn(`⚠️  Unknown table: ${table}`);
      }
    }

    this.printSummary(this.stats.reduce((sum, s) => sum + s.duration, 0));
    this.saveReport();
    this.sqlite.close();
  }

  /**
   * Export Supabase data to JSON backup
   */
  async exportToJSON(outputPath: string): Promise<void> {
    console.log('📦 Exporting Supabase data to JSON backup');
    
    const backup: any = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    for (const table of MIGRATION_ORDER) {
      console.log(`   Exporting ${table}...`);
      
      let allData: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .range(offset, offset + this.batchSize - 1);

        if (error) {
          console.error(`   Error: ${error.message}`);
          break;
        }

        if (!data || data.length === 0) {
          break;
        }

        allData = allData.concat(data);
        
        if (data.length < this.batchSize) {
          hasMore = false;
        } else {
          offset += this.batchSize;
        }
      }

      backup.tables[table] = allData;
      console.log(`   ✓ ${allData.length} records`);
    }

    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
    console.log(`\n✅ Backup saved: ${outputPath}`);
  }
}

/**
 * CLI Execution
 */
if (require.main === module) {
  const config: MigrationConfig = {
    supabaseUrl: process.env.VITE_SUPABASE_URL || '',
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    sqliteDbPath: process.env.SQLITE_DB_PATH || './audit_assistant.db',
    batchSize: 1000
  };

  if (!config.supabaseUrl || !config.supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const migration = new SupabaseToSQLiteMigration(config);

  const command = process.argv[2];

  if (command === 'export') {
    const outputPath = process.argv[3] || './supabase-backup.json';
    migration.exportToJSON(outputPath).catch(console.error);
  } else if (command === 'tables') {
    const tables = process.argv.slice(3);
    migration.migrateTables(tables).catch(console.error);
  } else {
    migration.migrate().catch(console.error);
  }
}
