-- SQLite Schema Migration - Going Concern Tables
-- Generated: 2026-01-20

-- ============================================================================
-- GOING CONCERN TABLES
-- ============================================================================

-- Going Concern Workpapers
CREATE TABLE IF NOT EXISTS going_concern_workpapers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL UNIQUE,
    procedure_id TEXT,
    chapter_no TEXT DEFAULT '4.1',
    topic TEXT DEFAULT 'Going Concern',
    conclusion TEXT,
    status TEXT DEFAULT 'draft',
    prepared_by TEXT,
    prepared_at TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    approved_by TEXT,
    approved_at TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (procedure_id) REFERENCES audit_procedures(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_going_concern_workpapers_engagement_id ON going_concern_workpapers(engagement_id);
CREATE INDEX IF NOT EXISTS idx_going_concern_workpapers_procedure_id ON going_concern_workpapers(procedure_id);

-- Going Concern Checklist Items
CREATE TABLE IF NOT EXISTS going_concern_checklist_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workpaper_id TEXT NOT NULL,
    section_number TEXT,
    item_number TEXT,
    description TEXT NOT NULL,
    findings TEXT,
    working TEXT,
    annexure_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workpaper_id) REFERENCES going_concern_workpapers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_going_concern_checklist_items_workpaper_id ON going_concern_checklist_items(workpaper_id);

-- GC Annexure: Net Worth
CREATE TABLE IF NOT EXISTS gc_annexure_net_worth (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workpaper_id TEXT NOT NULL,
    particulars TEXT NOT NULL,
    current_year REAL DEFAULT 0,
    previous_year REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_total INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workpaper_id) REFERENCES going_concern_workpapers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gc_annexure_net_worth_workpaper_id ON gc_annexure_net_worth(workpaper_id);

-- GC Annexure: Profitability
CREATE TABLE IF NOT EXISTS gc_annexure_profitability (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workpaper_id TEXT NOT NULL,
    particulars TEXT NOT NULL,
    current_year REAL DEFAULT 0,
    previous_year REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_total INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workpaper_id) REFERENCES going_concern_workpapers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gc_annexure_profitability_workpaper_id ON gc_annexure_profitability(workpaper_id);

-- GC Annexure: Borrowings
CREATE TABLE IF NOT EXISTS gc_annexure_borrowings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workpaper_id TEXT NOT NULL,
    particulars TEXT NOT NULL,
    current_year REAL DEFAULT 0,
    previous_year REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_total INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workpaper_id) REFERENCES going_concern_workpapers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gc_annexure_borrowings_workpaper_id ON gc_annexure_borrowings(workpaper_id);

-- GC Annexure: Cash Flows
CREATE TABLE IF NOT EXISTS gc_annexure_cash_flows (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workpaper_id TEXT NOT NULL,
    particulars TEXT NOT NULL,
    current_year REAL DEFAULT 0,
    previous_year REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_total INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workpaper_id) REFERENCES going_concern_workpapers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gc_annexure_cash_flows_workpaper_id ON gc_annexure_cash_flows(workpaper_id);

-- GC Annexure: Ratios
CREATE TABLE IF NOT EXISTS gc_annexure_ratios (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workpaper_id TEXT NOT NULL,
    ratio_name TEXT NOT NULL,
    current_year REAL DEFAULT 0,
    previous_year REAL DEFAULT 0,
    variance REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workpaper_id) REFERENCES going_concern_workpapers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gc_annexure_ratios_workpaper_id ON gc_annexure_ratios(workpaper_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_going_concern_workpapers_timestamp
AFTER UPDATE ON going_concern_workpapers
BEGIN
    UPDATE going_concern_workpapers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_going_concern_checklist_items_timestamp
AFTER UPDATE ON going_concern_checklist_items
BEGIN
    UPDATE going_concern_checklist_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gc_annexure_net_worth_timestamp
AFTER UPDATE ON gc_annexure_net_worth
BEGIN
    UPDATE gc_annexure_net_worth SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gc_annexure_profitability_timestamp
AFTER UPDATE ON gc_annexure_profitability
BEGIN
    UPDATE gc_annexure_profitability SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gc_annexure_borrowings_timestamp
AFTER UPDATE ON gc_annexure_borrowings
BEGIN
    UPDATE gc_annexure_borrowings SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gc_annexure_cash_flows_timestamp
AFTER UPDATE ON gc_annexure_cash_flows
BEGIN
    UPDATE gc_annexure_cash_flows SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gc_annexure_ratios_timestamp
AFTER UPDATE ON gc_annexure_ratios
BEGIN
    UPDATE gc_annexure_ratios SET updated_at = datetime('now') WHERE id = NEW.id;
END;
