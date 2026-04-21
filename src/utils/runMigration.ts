/**
 * Utility to run database migrations programmatically
 * For SQLite, migrations are handled via schema files
 */

import { getSQLiteClient } from '@/integrations/sqlite/client';

const db = getSQLiteClient();

export async function addIfcColumns() {
  try {
    // Note: This requires service_role access or appropriate RLS policies
    // If using anon key, you'll need to run this in Supabase Dashboard
    
    const migrations = [
      `ALTER TABLE audit_report_setup ADD COLUMN IF NOT EXISTS is_public_unlisted_company BOOLEAN DEFAULT false`,
      `ALTER TABLE audit_report_setup ADD COLUMN IF NOT EXISTS private_turnover_above_50cr BOOLEAN DEFAULT false`,
      `ALTER TABLE audit_report_setup ADD COLUMN IF NOT EXISTS private_borrowing_above_25cr BOOLEAN DEFAULT false`,
      `ALTER TABLE audit_report_setup ADD COLUMN IF NOT EXISTS is_small_company BOOLEAN DEFAULT false`,
      `ALTER TABLE audit_report_setup ADD COLUMN IF NOT EXISTS is_opc BOOLEAN DEFAULT false`,
    ];

    for (const sql of migrations) {
      // SQLite migrations are handled via schema files
      // Use db.execute() for direct SQL execution if needed
      const { error } = await db.execute(sql);
      if (error) {
        console.error('Migration error:', error);
        throw error;
      }
    }

    console.log('✓ IFC columns added successfully');
    return true;
  } catch (error) {
    console.error('Failed to add IFC columns:', error);
    return false;
  }
}
