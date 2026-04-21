/**
 * SQLite Database Manager
 * Replaces Supabase client with local SQLite database
 * Generated: 2026-01-20
 */

import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

export interface QueryResult<T = any> {
  data: T | null;
  error: Error | null;
}

export interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  firm_id: string | null;
  is_active: boolean;
}

/**
 * Database Manager Class
 * Provides Supabase-like API for SQLite
 */
export class DatabaseManager {
  private db: Database.Database;
  private currentUser: User | null = null;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    
    // Initialize schema if needed
    this.initializeSchema();
  }

  /**
   * Initialize database schema from SQL files
   */
  private initializeSchema(): void {
    const schemaPath = path.join(__dirname, 'schema');
    
    if (!fs.existsSync(schemaPath)) {
      console.warn('Schema directory not found');
      return;
    }

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

    // Check if database is already initialized
    const tableCheck = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'"
    ).get();

    if (tableCheck) {
      return; // Already initialized
    }

    // Execute schema files in order
    schemaFiles.forEach(file => {
      const filePath = path.join(schemaPath, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8');
        this.db.exec(sql);
        console.log(`✓ Executed ${file}`);
      }
    });
  }

  /**
   * Generate UUID (SQLite compatible)
   */
  private generateUUID(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Set current authenticated user (call after login)
   */
  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  /**
   * Authentication - Login
   */
  public async login(email: string, password: string): Promise<QueryResult<User>> {
    try {
      const user = this.db.prepare(`
        SELECT * FROM profiles WHERE email = ?
      `).get(email) as any;

      if (!user) {
        return { data: null, error: new Error('Invalid credentials') };
      }

      if (!user.password_hash) {
        return { data: null, error: new Error('Password not set') };
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return { data: null, error: new Error('Invalid credentials') };
      }

      this.currentUser = user;
      return { data: user, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Authentication - Sign up
   */
  public async signup(email: string, password: string, fullName: string): Promise<QueryResult<User>> {
    try {
      const userId = this.generateUUID();
      const passwordHash = await bcrypt.hash(password, 10);

      const stmt = this.db.prepare(`
        INSERT INTO profiles (user_id, email, full_name, password_hash)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(userId, email, fullName, passwordHash);

      const user = this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as User;
      this.currentUser = user;

      return { data: user, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Authentication - Logout
   */
  public logout(): void {
    this.currentUser = null;
  }

  /**
   * Query builder - SELECT
   */
  public from(table: string) {
    return new QueryBuilder(this.db, table, this.currentUser);
  }

  /**
   * Execute raw SQL
   */
  public exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Prepare statement
   */
  public prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Begin transaction
   */
  public transaction<T>(fn: () => T): T {
    const txn = this.db.transaction(fn);
    return txn();
  }

  /**
   * Check if user has role
   */
  public hasRole(userId: string, role: 'partner' | 'manager' | 'senior' | 'staff'): boolean {
    const result = this.db.prepare(`
      SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?
    `).get(userId, role);
    return !!result;
  }

  /**
   * Check if user has engagement access
   */
  public hasEngagementAccess(userId: string, engagementId: string): boolean {
    const result = this.db.prepare(`
      SELECT 1 FROM engagements e
      WHERE e.id = ? AND (
        e.created_by = ? OR
        e.partner_id = ? OR
        e.manager_id = ? OR
        EXISTS (
          SELECT 1 FROM engagement_assignments ea
          WHERE ea.engagement_id = e.id AND ea.user_id = ?
        )
      )
    `).get(engagementId, userId, userId, userId, userId);
    return !!result;
  }

  /**
   * Get user's firm ID
   */
  public getUserFirmId(userId: string): string | null {
    const result = this.db.prepare(`
      SELECT firm_id FROM profiles WHERE user_id = ?
    `).get(userId) as any;
    return result?.firm_id || null;
  }

  /**
   * Log activity
   */
  public logActivity(params: {
    userId: string;
    userName: string;
    action: string;
    entity: string;
    entityId?: string;
    engagementId?: string;
    details?: string;
    metadata?: object;
  }): void {
    this.db.prepare(`
      INSERT INTO activity_logs (user_id, user_name, action, entity, entity_id, engagement_id, details, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.userId,
      params.userName,
      params.action,
      params.entity,
      params.entityId || null,
      params.engagementId || null,
      params.details || null,
      params.metadata ? JSON.stringify(params.metadata) : '{}'
    );
  }
}

/**
 * Query Builder Class
 * Provides Supabase-like query interface
 */
class QueryBuilder {
  private db: Database.Database;
  private table: string;
  private currentUser: User | null;
  private selectCols: string[] = ['*'];
  private whereClauses: string[] = [];
  private whereParams: any[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';

  constructor(db: Database.Database, table: string, currentUser: User | null) {
    this.db = db;
    this.table = table;
    this.currentUser = currentUser;
  }

  /**
   * SELECT specific columns
   */
  select(columns: string = '*'): this {
    this.selectCols = columns === '*' ? ['*'] : columns.split(',').map(c => c.trim());
    return this;
  }

  /**
   * WHERE clause (equality)
   */
  eq(column: string, value: any): this {
    this.whereClauses.push(`${column} = ?`);
    this.whereParams.push(value);
    return this;
  }

  /**
   * WHERE clause (not equal)
   */
  neq(column: string, value: any): this {
    this.whereClauses.push(`${column} != ?`);
    this.whereParams.push(value);
    return this;
  }

  /**
   * WHERE clause (LIKE)
   */
  like(column: string, pattern: string): this {
    this.whereClauses.push(`${column} LIKE ?`);
    this.whereParams.push(pattern);
    return this;
  }

  /**
   * WHERE clause (IN)
   */
  in(column: string, values: any[]): this {
    const placeholders = values.map(() => '?').join(',');
    this.whereClauses.push(`${column} IN (${placeholders})`);
    this.whereParams.push(...values);
    return this;
  }

  /**
   * WHERE clause (IS NULL)
   */
  is(column: string, value: null): this {
    this.whereClauses.push(`${column} IS NULL`);
    return this;
  }

  /**
   * ORDER BY
   */
  order(column: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? 'DESC' : 'ASC';
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  /**
   * LIMIT
   */
  limit(count: number): this {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  /**
   * OFFSET (for pagination)
   */
  range(from: number, to: number): this {
    this.limitClause = `LIMIT ${to - from + 1}`;
    this.offsetClause = `OFFSET ${from}`;
    return this;
  }

  /**
   * Execute SELECT query
   */
  async execute(): Promise<QueryResult> {
    try {
      const whereClause = this.whereClauses.length > 0 
        ? `WHERE ${this.whereClauses.join(' AND ')}`
        : '';

      const sql = `
        SELECT ${this.selectCols.join(', ')}
        FROM ${this.table}
        ${whereClause}
        ${this.orderByClause}
        ${this.limitClause}
        ${this.offsetClause}
      `.trim();

      const stmt = this.db.prepare(sql);
      const data = this.limitClause && !this.limitClause.includes('1') 
        ? stmt.all(...this.whereParams)
        : stmt.all(...this.whereParams);

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Execute and get single result
   */
  async single(): Promise<QueryResult> {
    try {
      const whereClause = this.whereClauses.length > 0 
        ? `WHERE ${this.whereClauses.join(' AND ')}`
        : '';

      const sql = `
        SELECT ${this.selectCols.join(', ')}
        FROM ${this.table}
        ${whereClause}
        LIMIT 1
      `.trim();

      const stmt = this.db.prepare(sql);
      const data = stmt.get(...this.whereParams);

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * INSERT
   */
  async insert(data: object | object[]): Promise<QueryResult> {
    try {
      const records = Array.isArray(data) ? data : [data];
      const results: any[] = [];

      for (const record of records) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map(() => '?').join(',');

        const sql = `
          INSERT INTO ${this.table} (${columns.join(', ')})
          VALUES (${placeholders})
        `;

        const stmt = this.db.prepare(sql);
        const info = stmt.run(...values);
        
        // Get the inserted record
        const inserted = this.db.prepare(`SELECT * FROM ${this.table} WHERE rowid = ?`).get(info.lastInsertRowid);
        results.push(inserted);
      }

      return { data: Array.isArray(data) ? results : results[0], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * UPDATE
   */
  async update(data: object): Promise<QueryResult> {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClauses = columns.map(col => `${col} = ?`).join(', ');

      const whereClause = this.whereClauses.length > 0 
        ? `WHERE ${this.whereClauses.join(' AND ')}`
        : '';

      const sql = `
        UPDATE ${this.table}
        SET ${setClauses}
        ${whereClause}
      `;

      const stmt = this.db.prepare(sql);
      stmt.run(...values, ...this.whereParams);

      // Return updated records
      const selectSql = `SELECT * FROM ${this.table} ${whereClause}`;
      const updated = this.db.prepare(selectSql).all(...this.whereParams);

      return { data: updated, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * DELETE
   */
  async delete(): Promise<QueryResult> {
    try {
      const whereClause = this.whereClauses.length > 0 
        ? `WHERE ${this.whereClauses.join(' AND ')}`
        : '';

      const sql = `DELETE FROM ${this.table} ${whereClause}`;

      const stmt = this.db.prepare(sql);
      const info = stmt.run(...this.whereParams);

      return { data: { count: info.changes }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

// Export singleton instance
let dbInstance: DatabaseManager | null = null;

export function getDatabase(dbPath?: string): DatabaseManager {
  if (!dbInstance) {
    const path = dbPath || './audit_assistant.db';
    dbInstance = new DatabaseManager(path);
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
