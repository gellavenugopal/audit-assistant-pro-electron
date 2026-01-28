/**
 * Access Control Layer - RLS Alternative for SQLite
 * Implements Supabase RLS policies at application level
 * Generated: 2026-01-20
 */

import { DatabaseManager, User } from './database-manager';

export type Permission = 'select' | 'insert' | 'update' | 'delete';
export type Role = 'partner' | 'manager' | 'senior' | 'staff';

interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Access Control Manager
 * Enforces RLS-like policies at application level
 */
export class AccessControl {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Check if user can access a table
   */
  canAccess(
    user: User | null,
    table: string,
    permission: Permission,
    recordId?: string
  ): AccessCheckResult {
    if (!user) {
      return { allowed: false, reason: 'Not authenticated' };
    }

    // Get user's role
    const roles = this.getUserRoles(user.user_id);
    const isPartner = roles.includes('partner');
    const isManager = roles.includes('manager');
    const isManagerOrAbove = isPartner || isManager;

    // Apply table-specific policies
    switch (table) {
      // CORE TABLES
      case 'profiles':
        return this.checkProfilesAccess(user, permission, recordId);
      
      case 'user_roles':
        return permission === 'select' 
          ? { allowed: true }
          : { allowed: false, reason: 'Managed by triggers only' };
      
      case 'firm_settings':
      case 'partners':
      case 'clients':
      case 'financial_years':
        return this.checkCoreTablesAccess(user, permission, isManagerOrAbove, isPartner);
      
      // ENGAGEMENTS
      case 'engagements':
        return this.checkEngagementAccess(user, permission, recordId, isManagerOrAbove);
      
      case 'engagement_assignments':
        return permission === 'select'
          ? { allowed: true }
          : { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
      
      // AUDIT WORKFLOW
      case 'audit_procedures':
      case 'procedure_assignees':
      case 'procedure_checklist_items':
      case 'procedure_evidence_requirements':
      case 'evidence_files':
      case 'evidence_links':
      case 'risks':
      case 'review_notes':
      case 'compliance_applicability':
      case 'materiality_risk_assessment':
        return this.checkEngagementBasedAccess(user, permission, recordId, table, isManagerOrAbove);
      
      // AUDIT PROGRAMS
      case 'audit_programs_new':
      case 'audit_program_sections':
      case 'audit_program_boxes':
      case 'audit_program_attachments':
        return this.checkAuditProgramAccess(user, permission, recordId, isPartner);
      
      case 'engagement_letter_templates':
        return permission === 'select'
          ? { allowed: true }
          : { allowed: isPartner, reason: 'Requires partner role' };
      
      // AUDIT REPORTS
      case 'audit_report_setup':
      case 'audit_report_main_content':
      case 'audit_report_documents':
      case 'audit_report_document_versions':
      case 'audit_report_comments':
      case 'audit_report_evidence':
      case 'audit_report_exports':
      case 'key_audit_matters':
      case 'caro_clause_responses':
        return this.checkEngagementBasedAccess(user, permission, recordId, table, false);
      
      case 'caro_clause_library':
      case 'caro_standard_answers':
        return permission === 'select'
          ? { allowed: true }
          : { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
      
      // TRIAL BALANCE
      case 'trial_balance_lines':
      case 'schedule_iii_config':
      case 'tb_new_entity_info':
      case 'tb_new_ledgers':
      case 'tb_new_stock_items':
      case 'tb_new_classification_mappings':
      case 'tb_new_sessions':
        return this.checkEngagementBasedAccess(user, permission, recordId, table, false);
      
      // GOING CONCERN
      case 'going_concern_workpapers':
      case 'going_concern_checklist_items':
      case 'gc_annexure_net_worth':
      case 'gc_annexure_profitability':
      case 'gc_annexure_borrowings':
      case 'gc_annexure_cash_flows':
      case 'gc_annexure_ratios':
        return this.checkEngagementBasedAccess(user, permission, recordId, table, false);
      
      // RULE ENGINE
      case 'aile_rule_sets':
      case 'aile_mapping_rules':
      case 'rule_engine_group_rules':
      case 'rule_engine_keyword_rules':
      case 'rule_engine_validation_rules':
        return permission === 'select'
          ? { allowed: true }
          : { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
      
      case 'rule_engine_override_rules':
        return this.checkEngagementBasedAccess(user, permission, recordId, table, false);
      
      // TEMPLATES
      case 'standard_programs':
      case 'standard_procedures':
      case 'procedure_template_checklist_items':
      case 'procedure_template_evidence_requirements':
        return permission === 'select'
          ? { allowed: true }
          : { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
      
      case 'fs_templates':
        return { allowed: true };
      
      // SYSTEM TABLES
      case 'activity_logs':
        return permission === 'select'
          ? { allowed: true }
          : permission === 'insert'
          ? { allowed: true } // Allow logging
          : { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
      
      case 'audit_trail':
        return permission === 'select' || permission === 'insert'
          ? { allowed: true }
          : { allowed: false, reason: 'Read-only after creation' };
      
      case 'notifications':
        return this.checkNotificationsAccess(user, permission, recordId);
      
      case 'feedback_reports':
      case 'feedback_attachments':
        return this.checkFeedbackAccess(user, permission, recordId, isPartner);
      
      case 'tally_bridge_sessions':
      case 'tally_bridge_requests':
        return { allowed: true }; // Temporary - for Tally integration
      
      default:
        return { allowed: false, reason: `Unknown table: ${table}` };
    }
  }

  /**
   * Check profiles table access
   */
  private checkProfilesAccess(user: User, permission: Permission, recordId?: string): AccessCheckResult {
    switch (permission) {
      case 'select':
        return { allowed: true };
      case 'insert':
        return { allowed: false, reason: 'Managed by signup' };
      case 'update':
        if (!recordId) return { allowed: false, reason: 'Record ID required' };
        return recordId === user.id 
          ? { allowed: true }
          : { allowed: false, reason: 'Can only update own profile' };
      case 'delete':
        return { allowed: false, reason: 'Admin only' };
    }
  }

  /**
   * Check core tables access
   */
  private checkCoreTablesAccess(
    user: User,
    permission: Permission,
    isManagerOrAbove: boolean,
    isPartner: boolean
  ): AccessCheckResult {
    switch (permission) {
      case 'select':
        return { allowed: true };
      case 'insert':
      case 'update':
        return { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
      case 'delete':
        return { allowed: isPartner, reason: 'Requires partner role' };
    }
  }

  /**
   * Check engagement access
   */
  private checkEngagementAccess(
    user: User,
    permission: Permission,
    recordId: string | undefined,
    isManagerOrAbove: boolean
  ): AccessCheckResult {
    switch (permission) {
      case 'select':
        if (!recordId) return { allowed: true }; // List view
        // Check if user has access to this engagement
        const hasAccess = this.db.hasEngagementAccess(user.user_id, recordId);
        return { allowed: hasAccess, reason: hasAccess ? undefined : 'No access to engagement' };
      
      case 'insert':
        return { allowed: true }; // Any user can create engagements
      
      case 'update':
        if (!recordId) return { allowed: false, reason: 'Record ID required' };
        const canUpdate = this.db.hasEngagementAccess(user.user_id, recordId);
        return { allowed: canUpdate, reason: canUpdate ? undefined : 'No access to engagement' };
      
      case 'delete':
        return { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
    }
  }

  /**
   * Check engagement-based table access
   */
  private checkEngagementBasedAccess(
    user: User,
    permission: Permission,
    recordId: string | undefined,
    table: string,
    requireManagerForDelete: boolean
  ): AccessCheckResult {
    // For engagement-based tables, check engagement access
    if (recordId) {
      const engagementId = this.getEngagementIdForRecord(table, recordId);
      if (engagementId) {
        const hasAccess = this.db.hasEngagementAccess(user.user_id, engagementId);
        if (!hasAccess) {
          return { allowed: false, reason: 'No access to engagement' };
        }
      }
    }

    switch (permission) {
      case 'select':
      case 'insert':
      case 'update':
        return { allowed: true };
      case 'delete':
        if (requireManagerForDelete) {
          const roles = this.getUserRoles(user.user_id);
          const isManagerOrAbove = roles.includes('partner') || roles.includes('manager');
          return { allowed: isManagerOrAbove, reason: 'Requires manager+ role' };
        }
        return { allowed: true };
    }
  }

  /**
   * Check audit program access
   */
  private checkAuditProgramAccess(
    user: User,
    permission: Permission,
    recordId: string | undefined,
    isPartner: boolean
  ): AccessCheckResult {
    switch (permission) {
      case 'select':
        return { allowed: true };
      case 'insert':
      case 'update':
        return { allowed: true };
      case 'delete':
        if (!recordId) return { allowed: false, reason: 'Record ID required' };
        // Check if user created it or is partner
        const creator = this.getRecordCreator('audit_programs_new', recordId);
        return creator === user.user_id || isPartner
          ? { allowed: true }
          : { allowed: false, reason: 'Can only delete own programs or be partner' };
    }
  }

  /**
   * Check notifications access
   */
  private checkNotificationsAccess(
    user: User,
    permission: Permission,
    recordId?: string
  ): AccessCheckResult {
    switch (permission) {
      case 'select':
      case 'update':
        // Users can only access their own notifications
        if (recordId) {
          const notification = this.db.prepare('SELECT user_id FROM notifications WHERE id = ?')
            .get(recordId) as any;
          return notification?.user_id === user.user_id
            ? { allowed: true }
            : { allowed: false, reason: 'Can only access own notifications' };
        }
        return { allowed: true };
      case 'insert':
        return { allowed: true };
      case 'delete':
        return { allowed: true }; // Users can delete own notifications
    }
  }

  /**
   * Check feedback access
   */
  private checkFeedbackAccess(
    user: User,
    permission: Permission,
    recordId: string | undefined,
    isPartner: boolean
  ): AccessCheckResult {
    switch (permission) {
      case 'select':
        return { allowed: true };
      case 'insert':
        return { allowed: true };
      case 'update':
        return { allowed: isPartner, reason: 'Only partners can update feedback' };
      case 'delete':
        return { allowed: false, reason: 'Feedback cannot be deleted' };
    }
  }

  /**
   * Get user roles
   */
  private getUserRoles(userId: string): Role[] {
    const roles = this.db.prepare(`
      SELECT role FROM user_roles WHERE user_id = ?
    `).all(userId) as any[];
    
    return roles.map(r => r.role);
  }

  /**
   * Get engagement ID for a record (helper)
   */
  private getEngagementIdForRecord(table: string, recordId: string): string | null {
    try {
      const result = this.db.prepare(`
        SELECT engagement_id FROM ${table} WHERE id = ?
      `).get(recordId) as any;
      
      return result?.engagement_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Get record creator (helper)
   */
  private getRecordCreator(table: string, recordId: string): string | null {
    try {
      const result = this.db.prepare(`
        SELECT created_by FROM ${table} WHERE id = ?
      `).get(recordId) as any;
      
      return result?.created_by || null;
    } catch {
      return null;
    }
  }

  /**
   * Middleware: Validate access before query
   */
  validateAccess(
    user: User | null,
    table: string,
    permission: Permission,
    recordId?: string
  ): void {
    const result = this.canAccess(user, table, permission, recordId);
    if (!result.allowed) {
      throw new Error(`Access denied: ${result.reason || 'Insufficient permissions'}`);
    }
  }

  /**
   * Filter query results based on user access (for SELECT)
   */
  filterResults<T extends { id?: string; engagement_id?: string; user_id?: string; created_by?: string }>(
    user: User | null,
    table: string,
    results: T[]
  ): T[] {
    if (!user) return [];

    // Tables that filter by firm_id
    const firmBasedTables = ['engagements', 'clients', 'partners'];
    if (firmBasedTables.includes(table) && user.firm_id) {
      return results.filter(r => (r as any).firm_id === user.firm_id);
    }

    // Tables that filter by engagement access
    const engagementBasedTables = [
      'audit_procedures', 'risks', 'review_notes', 'audit_programs_new',
      'audit_report_setup', 'trial_balance_lines', 'going_concern_workpapers'
    ];
    
    if (engagementBasedTables.includes(table)) {
      return results.filter(r => {
        if (!r.engagement_id) return true;
        return this.db.hasEngagementAccess(user.user_id, r.engagement_id);
      });
    }

    // Tables that filter by user_id
    if (table === 'notifications') {
      return results.filter(r => r.user_id === user.user_id);
    }

    // Default: return all
    return results;
  }
}

/**
 * Express/Electron Middleware Example
 */
export function createAccessMiddleware(db: DatabaseManager) {
  const ac = new AccessControl(db);

  return (req: any, res: any, next: any) => {
    const user = db.getCurrentUser();
    const { table, permission, recordId } = req.body;

    try {
      ac.validateAccess(user, table, permission, recordId);
      next();
    } catch (error: any) {
      res.status(403).json({ error: error.message });
    }
  };
}
