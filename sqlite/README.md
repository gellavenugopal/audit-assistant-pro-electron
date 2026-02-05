# SQLite Migration Package

Complete migration toolkit for converting Audit Assistant Pro from Supabase to SQLite.

## Quick Start

### 1. Install Dependencies

```bash
npm install better-sqlite3 bcrypt
npm install --save-dev @types/better-sqlite3 @types/bcrypt
```

### 2. Run Migration

```bash
# Export Supabase data to backup
npx ts-node sqlite/migrate-from-supabase.ts export ./supabase-backup.json

# Run full migration
npx ts-node sqlite/migrate-from-supabase.ts

# Or migrate specific tables
npx ts-node sqlite/migrate-from-supabase.ts tables engagements clients
```

### 3. Use in Application

```typescript
import { getDatabase } from '@/sqlite/database-manager';
import { AccessControl } from '@/sqlite/access-control';

// Initialize
const db = getDatabase('./audit_assistant.db');

// Query (Supabase-like API)
const { data, error } = await db
  .from('engagements')
  .select('*')
  .eq('status', 'planning')
  .execute();

// Authentication
const { data: user, error } = await db.login(email, password);
db.setCurrentUser(user);

// Access Control
const ac = new AccessControl(db);
ac.validateAccess(user, 'engagements', 'update', recordId);
```

## Files Overview

### Schema Files (`schema/`)

- `01_core_tables.sql` - Profiles, firms, clients, engagements
- `02_audit_workflow_tables.sql` - Procedures, evidence, risks
- `03_audit_program_tables.sql` - Programs, sections, boxes
- `04_audit_report_tables.sql` - Reports, CARO, KAM
- `05_trial_balance_tables.sql` - TB, Schedule III
- `06_going_concern_tables.sql` - GC workpapers, annexures
- `07_rule_engine_tables.sql` - AILE rules, validation
- `08_template_system_tables.sql` - Templates, logs, feedback

**Total: 66 tables**

### Core Modules

#### `database-manager.ts`

Main database interface providing Supabase-like API:

```typescript
class DatabaseManager {
  // Auth
  login(email, password): Promise<QueryResult<User>>
  signup(email, password, fullName): Promise<QueryResult<User>>
  logout(): void
  getCurrentUser(): User | null
  
  // Queries
  from(table: string): QueryBuilder
  prepare(sql: string): Statement
  exec(sql: string): void
  transaction<T>(fn: () => T): T
  
  // Helpers
  hasRole(userId, role): boolean
  hasEngagementAccess(userId, engagementId): boolean
  getUserFirmId(userId): string | null
  logActivity(params): void
}

class QueryBuilder {
  select(columns?: string): this
  eq(column, value): this
  neq(column, value): this
  like(column, pattern): this
  in(column, values): this
  is(column, null): this
  order(column, options?): this
  limit(count): this
  range(from, to): this
  
  execute(): Promise<QueryResult>
  single(): Promise<QueryResult>
  insert(data): Promise<QueryResult>
  update(data): Promise<QueryResult>
  delete(): Promise<QueryResult>
}
```

#### `access-control.ts`

Application-layer RLS replacement:

```typescript
class AccessControl {
  canAccess(user, table, permission, recordId?): AccessCheckResult
  validateAccess(user, table, permission, recordId?): void
  filterResults<T>(user, table, results): T[]
}

// Permissions: 'select' | 'insert' | 'update' | 'delete'
// Roles: 'partner' | 'manager' | 'senior' | 'staff'
```

#### `migrate-from-supabase.ts`

Data migration utility:

```typescript
class SupabaseToSQLiteMigration {
  migrate(): Promise<void>
  migrateTables(tables: string[]): Promise<void>
  exportToJSON(outputPath: string): Promise<void>
}
```

## Key Differences from Supabase

### Data Types

| PostgreSQL | SQLite | Conversion |
|------------|--------|------------|
| uuid | TEXT | 32-char hex |
| timestamptz | TEXT | ISO 8601 |
| boolean | INTEGER | 0/1 |
| jsonb | TEXT | JSON string |
| array | TEXT | JSON array |
| enum | TEXT + CHECK | Constraint |

### Features

| Feature | Supabase | SQLite |
|---------|----------|--------|
| Authentication | Built-in | Custom (bcrypt) |
| RLS | Native | Application layer |
| Real-time | Yes | No (use polling) |
| Storage | Built-in | Local filesystem |
| Edge Functions | Yes | No (use IPC) |
| Multi-user | Yes | Single writer |

## Environment Setup

### Development

```typescript
// electron/preload.cjs
const { contextBridge } = require('electron');
const { getDatabase } = require('../sqlite/database-manager');

contextBridge.exposeInMainWorld('db', {
  query: (table, options) => getDatabase().from(table)...
});
```

### Production (Electron)

```javascript
// electron/main.cjs
const { app } = require('electron');
const path = require('path');
const { getDatabase } = require('./sqlite/database-manager');

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'audit_assistant.db');
  global.db = getDatabase(dbPath);
});
```

## Migration Checklist

**Pre-Migration:**
- [ ] Install dependencies
- [ ] Set up environment variables
- [ ] Backup Supabase data
- [ ] Review schema files

**Migration:**
- [ ] Run schema initialization
- [ ] Migrate data from Supabase
- [ ] Verify record counts
- [ ] Test foreign keys
- [ ] Validate JSON fields

**Post-Migration:**
- [ ] Update client code
- [ ] Implement auth flow
- [ ] Add access control
- [ ] Configure file storage
- [ ] Test all features
- [ ] Performance tuning

**Deployment:**
- [ ] Build Electron app
- [ ] Test on all platforms
- [ ] Create backup strategy
- [ ] Update documentation
- [ ] Train support team

## Performance Optimization

### Enable WAL Mode

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB
PRAGMA mmap_size = 268435456; -- 256MB
```

### Indexes

All necessary indexes are created in schema files. To add custom indexes:

```sql
CREATE INDEX idx_custom ON table_name(column_name);
```

### Query Optimization

```typescript
// Use specific columns
db.from('table').select('id, name')

// Use pagination
db.from('table').range(0, 99)

// Use prepared statements for repeated queries
const stmt = db.prepare('SELECT * FROM table WHERE id = ?');
const result = stmt.get(id);
```

## Backup & Recovery

### Automatic Backup (Electron)

```javascript
const fs = require('fs');
const path = require('path');

// Daily backup
setInterval(() => {
  const dbPath = path.join(app.getPath('userData'), 'audit_assistant.db');
  const backupPath = path.join(
    app.getPath('userData'),
    'backups',
    `backup-${Date.now()}.db`
  );
  
  fs.copyFileSync(dbPath, backupPath);
  console.log('Backup created:', backupPath);
}, 24 * 60 * 60 * 1000); // 24 hours
```

### Manual Backup

```bash
# Windows
copy "%APPDATA%\audit-assistant\audit_assistant.db" "D:\Backups\audit.db"

# macOS/Linux
cp ~/Library/Application\ Support/audit-assistant/audit_assistant.db ~/Backups/
```

## Troubleshooting

### Database Locked

```typescript
// Increase busy timeout
db.prepare('PRAGMA busy_timeout = 5000').run();
```

### Foreign Key Violations

```sql
-- Check violations
PRAGMA foreign_key_check;

-- Temporarily disable (NOT recommended)
PRAGMA foreign_keys = OFF;
```

### Performance Issues

```sql
-- Analyze query
EXPLAIN QUERY PLAN SELECT * FROM table WHERE ...;

-- Rebuild indexes
REINDEX;

-- Vacuum database
VACUUM;
```

### Data Corruption

```bash
# Check integrity
sqlite3 audit_assistant.db "PRAGMA integrity_check;"

# Recover if possible
sqlite3 audit_assistant.db ".recover" | sqlite3 recovered.db
```

## Testing

### Unit Tests

```typescript
import { getDatabase } from '@/sqlite/database-manager';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Database Manager', () => {
  let db: DatabaseManager;

  beforeEach(() => {
    db = getDatabase(':memory:'); // In-memory for tests
  });

  it('should create engagement', async () => {
    const { data, error } = await db.from('engagements').insert({
      name: 'Test Engagement',
      client_name: 'Test Client',
      financial_year: '2024-25'
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.name).toBe('Test Engagement');
  });
});
```

### Integration Tests

```typescript
describe('Access Control', () => {
  it('should prevent staff from deleting engagements', () => {
    const ac = new AccessControl(db);
    const staffUser = { user_id: '123', role: 'staff', ... };
    
    const result = ac.canAccess(staffUser, 'engagements', 'delete');
    expect(result.allowed).toBe(false);
  });
});
```

## Support

- **Documentation:** See `SQLITE_MIGRATION_GUIDE.md`
- **Schema Reference:** See `DATABASE_ARCHITECTURE (2).md`
- **SQLite Docs:** https://www.sqlite.org/docs.html

## License

Same as parent project (Audit Assistant Pro)

---

**Last Updated:** 2026-01-20  
**Version:** 1.0.0
