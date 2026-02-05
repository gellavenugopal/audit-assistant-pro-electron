-- SQLite Schema Migration - Template & System Tables
-- Generated: 2026-01-20

-- ============================================================================
-- TEMPLATE TABLES
-- ============================================================================

-- Standard Programs
CREATE TABLE IF NOT EXISTS standard_programs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    audit_area TEXT NOT NULL,
    engagement_type TEXT NOT NULL DEFAULT 'statutory',
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_standard_programs_audit_area ON standard_programs(audit_area);
CREATE INDEX IF NOT EXISTS idx_standard_programs_engagement_type ON standard_programs(engagement_type);

-- Standard Procedures
CREATE TABLE IF NOT EXISTS standard_procedures (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    program_id TEXT NOT NULL,
    procedure_name TEXT NOT NULL,
    area TEXT NOT NULL,
    assertion TEXT,
    description TEXT,
    checklist_items TEXT DEFAULT '[]', -- JSON array
    evidence_requirements TEXT DEFAULT '[]', -- JSON array
    is_standalone INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES standard_programs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_standard_procedures_program_id ON standard_procedures(program_id);
CREATE INDEX IF NOT EXISTS idx_standard_procedures_area ON standard_procedures(area);

-- Procedure Template Checklist Items
CREATE TABLE IF NOT EXISTS procedure_template_checklist_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    template_id TEXT NOT NULL,
    text TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES standard_procedures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_procedure_template_checklist_items_template_id ON procedure_template_checklist_items(template_id);

-- Procedure Template Evidence Requirements
CREATE TABLE IF NOT EXISTS procedure_template_evidence_requirements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    template_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 0,
    allowed_file_types TEXT, -- JSON array
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES standard_procedures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_procedure_template_evidence_requirements_template_id ON procedure_template_evidence_requirements(template_id);

-- Financial Statement Templates
CREATE TABLE IF NOT EXISTS fs_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    constitution_type TEXT NOT NULL,
    level1 TEXT,
    level2 TEXT,
    level3 TEXT,
    level4 TEXT,
    level5 TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fs_templates_constitution_type ON fs_templates(constitution_type);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    engagement_id TEXT,
    details TEXT,
    metadata TEXT DEFAULT '{}', -- JSON object
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_engagement_id ON activity_logs(engagement_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    performed_by TEXT NOT NULL,
    performed_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}', -- JSON object
    FOREIGN KEY (performed_by) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_type ON audit_trail(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_id ON audit_trail(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON audit_trail(performed_at);

-- Tally Bridge Sessions
CREATE TABLE IF NOT EXISTS tally_bridge_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT,
    session_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    company_name TEXT,
    tally_version TEXT,
    last_ping TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tally_bridge_sessions_session_key ON tally_bridge_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_tally_bridge_sessions_engagement_id ON tally_bridge_sessions(engagement_id);

-- Tally Bridge Requests
CREATE TABLE IF NOT EXISTS tally_bridge_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL,
    request_type TEXT NOT NULL,
    request_xml TEXT NOT NULL,
    response_xml TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (session_id) REFERENCES tally_bridge_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tally_bridge_requests_session_id ON tally_bridge_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_tally_bridge_requests_status ON tally_bridge_requests(status);

-- Feedback Reports
CREATE TABLE IF NOT EXISTS feedback_reports (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'question')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    response TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES profiles(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_user_id ON feedback_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_feedback_type ON feedback_reports(feedback_type);

-- Feedback Attachments
CREATE TABLE IF NOT EXISTS feedback_attachments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    feedback_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (feedback_id) REFERENCES feedback_reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id ON feedback_attachments(feedback_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_standard_programs_timestamp
AFTER UPDATE ON standard_programs
BEGIN
    UPDATE standard_programs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_standard_procedures_timestamp
AFTER UPDATE ON standard_procedures
BEGIN
    UPDATE standard_procedures SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_fs_templates_timestamp
AFTER UPDATE ON fs_templates
BEGIN
    UPDATE fs_templates SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_feedback_reports_timestamp
AFTER UPDATE ON feedback_reports
BEGIN
    UPDATE feedback_reports SET updated_at = datetime('now') WHERE id = NEW.id;
END;
