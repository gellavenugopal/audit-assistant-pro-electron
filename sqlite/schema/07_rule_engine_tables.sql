-- SQLite Schema Migration - Rule Engine Tables
-- Generated: 2026-01-20

-- ============================================================================
-- RULE ENGINE TABLES
-- ============================================================================

-- AILE Rule Sets
CREATE TABLE IF NOT EXISTS aile_rule_sets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_aile_rule_sets_is_active ON aile_rule_sets(is_active);
CREATE INDEX idx_aile_rule_sets_is_default ON aile_rule_sets(is_default);

-- AILE Mapping Rules
CREATE TABLE IF NOT EXISTS aile_mapping_rules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    rule_set_id TEXT NOT NULL,
    match_field TEXT NOT NULL,
    match_pattern TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK (match_type IN ('contains', 'exact', 'regex', 'starts_with', 'ends_with')),
    target_aile TEXT,
    target_fs_area TEXT,
    target_face_group TEXT,
    target_note_group TEXT,
    target_sub_note TEXT,
    target_level4 TEXT,
    target_level5 TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    has_balance_logic INTEGER NOT NULL DEFAULT 0,
    debit_aile TEXT,
    credit_aile TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rule_set_id) REFERENCES aile_rule_sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_aile_mapping_rules_rule_set_id ON aile_mapping_rules(rule_set_id);
CREATE INDEX idx_aile_mapping_rules_match_field ON aile_mapping_rules(match_field);
CREATE INDEX idx_aile_mapping_rules_priority ON aile_mapping_rules(priority);

-- Rule Engine: Group Rules
CREATE TABLE IF NOT EXISTS rule_engine_group_rules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    rule_set_id TEXT NOT NULL,
    tally_group TEXT NOT NULL,
    schedule_iii_code TEXT NOT NULL,
    h1 TEXT,
    h2 TEXT,
    h3 TEXT,
    h4 TEXT,
    h5 TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rule_set_id) REFERENCES aile_rule_sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_rule_engine_group_rules_rule_set_id ON rule_engine_group_rules(rule_set_id);
CREATE INDEX idx_rule_engine_group_rules_tally_group ON rule_engine_group_rules(tally_group);

-- Rule Engine: Keyword Rules
CREATE TABLE IF NOT EXISTS rule_engine_keyword_rules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    rule_set_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK (match_type IN ('contains', 'exact', 'regex', 'starts_with', 'ends_with')),
    h1 TEXT,
    h2 TEXT,
    h3 TEXT,
    h4 TEXT,
    h5 TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rule_set_id) REFERENCES aile_rule_sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_rule_engine_keyword_rules_rule_set_id ON rule_engine_keyword_rules(rule_set_id);
CREATE INDEX idx_rule_engine_keyword_rules_keyword ON rule_engine_keyword_rules(keyword);

-- Rule Engine: Override Rules (Manual)
CREATE TABLE IF NOT EXISTS rule_engine_override_rules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    ledger_name TEXT NOT NULL,
    h1 TEXT,
    h2 TEXT,
    h3 TEXT,
    h4 TEXT,
    h5 TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_rule_engine_override_rules_engagement_id ON rule_engine_override_rules(engagement_id);
CREATE INDEX idx_rule_engine_override_rules_ledger_name ON rule_engine_override_rules(ledger_name);

-- Rule Engine: Validation Rules
CREATE TABLE IF NOT EXISTS rule_engine_validation_rules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    rule_set_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    validation_type TEXT NOT NULL,
    validation_config TEXT, -- JSON object
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('error', 'warning', 'info')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rule_set_id) REFERENCES aile_rule_sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_rule_engine_validation_rules_rule_set_id ON rule_engine_validation_rules(rule_set_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_aile_rule_sets_timestamp
AFTER UPDATE ON aile_rule_sets
BEGIN
    UPDATE aile_rule_sets SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_aile_mapping_rules_timestamp
AFTER UPDATE ON aile_mapping_rules
BEGIN
    UPDATE aile_mapping_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_rule_engine_group_rules_timestamp
AFTER UPDATE ON rule_engine_group_rules
BEGIN
    UPDATE rule_engine_group_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_rule_engine_keyword_rules_timestamp
AFTER UPDATE ON rule_engine_keyword_rules
BEGIN
    UPDATE rule_engine_keyword_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_rule_engine_override_rules_timestamp
AFTER UPDATE ON rule_engine_override_rules
BEGIN
    UPDATE rule_engine_override_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_rule_engine_validation_rules_timestamp
AFTER UPDATE ON rule_engine_validation_rules
BEGIN
    UPDATE rule_engine_validation_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;
