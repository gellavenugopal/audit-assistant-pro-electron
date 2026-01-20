-- SQLite Schema Migration - Trial Balance Tables
-- Generated: 2026-01-20

-- ============================================================================
-- TRIAL BALANCE TABLES
-- ============================================================================

-- Trial Balance Lines (v1 - Schedule III focused)
CREATE TABLE IF NOT EXISTS trial_balance_lines (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    opening_balance REAL NOT NULL DEFAULT 0,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    closing_balance REAL NOT NULL DEFAULT 0,
    fs_area TEXT,
    aile TEXT,
    face_group TEXT,
    note_group TEXT,
    sub_note TEXT,
    level4_group TEXT,
    level5_detail TEXT,
    schedule_iii_code TEXT,
    ledger_primary_group TEXT,
    ledger_parent TEXT,
    period_type TEXT DEFAULT 'current',
    version INTEGER NOT NULL DEFAULT 1,
    applied_rule_id TEXT,
    validation_flags TEXT, -- JSON array stored as TEXT
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_trial_balance_lines_engagement_id ON trial_balance_lines(engagement_id);
CREATE INDEX idx_trial_balance_lines_account_code ON trial_balance_lines(account_code);
CREATE INDEX idx_trial_balance_lines_aile ON trial_balance_lines(aile);

-- Schedule III Config
CREATE TABLE IF NOT EXISTS schedule_iii_config (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL UNIQUE,
    start_note_number INTEGER NOT NULL DEFAULT 1,
    include_contingent_liabilities INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedule_iii_config_engagement_id ON schedule_iii_config(engagement_id);

-- TB New Entity Info
CREATE TABLE IF NOT EXISTS tb_new_entity_info (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    entity_name TEXT,
    entity_type TEXT,
    business_type TEXT,
    period_from TEXT,
    period_to TEXT,
    company_name TEXT,
    company_cin TEXT,
    company_pan TEXT,
    company_address TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_tb_new_entity_info_engagement_id ON tb_new_entity_info(engagement_id);

-- TB New Ledgers
CREATE TABLE IF NOT EXISTS tb_new_ledgers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    entity_info_id TEXT NOT NULL,
    ledger_name TEXT NOT NULL,
    primary_group TEXT,
    h1 TEXT,
    h2 TEXT,
    h3 TEXT,
    h4 TEXT,
    h5 TEXT,
    opening_balance REAL DEFAULT 0,
    closing_balance REAL DEFAULT 0,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_info_id) REFERENCES tb_new_entity_info(id) ON DELETE CASCADE
);

CREATE INDEX idx_tb_new_ledgers_engagement_id ON tb_new_ledgers(engagement_id);
CREATE INDEX idx_tb_new_ledgers_entity_info_id ON tb_new_ledgers(entity_info_id);

-- TB New Stock Items
CREATE TABLE IF NOT EXISTS tb_new_stock_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    entity_info_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    opening_qty REAL DEFAULT 0,
    opening_value REAL DEFAULT 0,
    closing_qty REAL DEFAULT 0,
    closing_value REAL DEFAULT 0,
    unit TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_info_id) REFERENCES tb_new_entity_info(id) ON DELETE CASCADE
);

CREATE INDEX idx_tb_new_stock_items_engagement_id ON tb_new_stock_items(engagement_id);
CREATE INDEX idx_tb_new_stock_items_entity_info_id ON tb_new_stock_items(entity_info_id);

-- TB New Classification Mappings
CREATE TABLE IF NOT EXISTS tb_new_classification_mappings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    entity_info_id TEXT NOT NULL,
    ledger_name TEXT NOT NULL,
    custom_h1 TEXT,
    custom_h2 TEXT,
    custom_h3 TEXT,
    custom_h4 TEXT,
    custom_h5 TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_info_id) REFERENCES tb_new_entity_info(id) ON DELETE CASCADE
);

CREATE INDEX idx_tb_new_classification_mappings_engagement_id ON tb_new_classification_mappings(engagement_id);
CREATE INDEX idx_tb_new_classification_mappings_entity_info_id ON tb_new_classification_mappings(entity_info_id);

-- TB New Sessions
CREATE TABLE IF NOT EXISTS tb_new_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    session_name TEXT NOT NULL,
    session_data TEXT, -- JSON object
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_tb_new_sessions_engagement_id ON tb_new_sessions(engagement_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_trial_balance_lines_timestamp
AFTER UPDATE ON trial_balance_lines
BEGIN
    UPDATE trial_balance_lines SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_schedule_iii_config_timestamp
AFTER UPDATE ON schedule_iii_config
BEGIN
    UPDATE schedule_iii_config SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tb_new_entity_info_timestamp
AFTER UPDATE ON tb_new_entity_info
BEGIN
    UPDATE tb_new_entity_info SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tb_new_ledgers_timestamp
AFTER UPDATE ON tb_new_ledgers
BEGIN
    UPDATE tb_new_ledgers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tb_new_stock_items_timestamp
AFTER UPDATE ON tb_new_stock_items
BEGIN
    UPDATE tb_new_stock_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tb_new_classification_mappings_timestamp
AFTER UPDATE ON tb_new_classification_mappings
BEGIN
    UPDATE tb_new_classification_mappings SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tb_new_sessions_timestamp
AFTER UPDATE ON tb_new_sessions
BEGIN
    UPDATE tb_new_sessions SET updated_at = datetime('now') WHERE id = NEW.id;
END;
