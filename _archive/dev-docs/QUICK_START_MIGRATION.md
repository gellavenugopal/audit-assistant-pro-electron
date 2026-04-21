# Quick Start: Run Trial Balance New Migration

## Option 1: One-Time Setup + npm Script (Recommended)

### Step 1: Setup Helper Function (One-time only)
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/jrwfgfdxhlvwhzwqvwkl/sql/new
2. Copy and paste the contents of `scripts/setup-migration-helper.sql`
3. Click **Run**
4. You should see "Success" - this creates a helper function

### Step 2: Add Service Role Key to .env
1. Get your Service Role Key from: Supabase Dashboard > Project Settings > API > service_role key
2. Add to `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### Step 3: Run Migration
```bash
npm run migrate:tb-new
```

That's it! The migration will run automatically.

---

## Option 2: Direct Supabase Dashboard (Easiest - No Setup)

1. Go to: https://supabase.com/dashboard/project/jrwfgfdxhlvwhzwqvwkl/sql/new
2. Open `supabase/migrations/20250115000001_create_trial_balance_new_tables.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run**

---

## Option 3: PowerShell Script

```powershell
.\scripts\run-migration-direct.ps1
```

This will guide you through the process.

---

## Verification

After migration, verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'tb_new_%'
ORDER BY table_name;
```

Expected output:
- tb_new_classification_mappings
- tb_new_entity_info
- tb_new_ledgers
- tb_new_sessions
- tb_new_stock_items

---

## Troubleshooting

**Error: "function exec_sql does not exist"**
- Run Step 1 from Option 1 first (setup helper function)

**Error: "SUPABASE_SERVICE_ROLE_KEY not found"**
- Add the service role key to .env file

**Error: "already exists"**
- This is normal if tables already exist. Migration will skip existing objects.

