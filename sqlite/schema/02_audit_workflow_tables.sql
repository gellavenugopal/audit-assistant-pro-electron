-- SQLite Schema Migration - Audit Workflow Tables
-- Generated: 2026-01-20

-- ============================================================================
-- AUDIT WORKFLOW TABLES
-- ============================================================================

-- Audit Procedures
CREATE TABLE IF NOT EXISTS audit_procedures (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    procedure_name TEXT NOT NULL,
    description TEXT,
    area TEXT NOT NULL,
    assertion TEXT,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done', 'reviewed')),
    approval_stage TEXT NOT NULL DEFAULT 'draft' CHECK (approval_stage IN ('draft', 'prepared', 'reviewed', 'approved')),
    assigned_to TEXT,
    due_date TEXT,
    completed_date TEXT,
    conclusion TEXT,
    conclusion_prompt TEXT,
    workpaper_ref TEXT,
    template_id TEXT,
    checklist_items TEXT NOT NULL DEFAULT '[]', -- JSON array
    evidence_requirements TEXT NOT NULL DEFAULT '[]', -- JSON array
    prepared_by TEXT,
    prepared_at TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    approved_by TEXT,
    approved_at TEXT,
    locked INTEGER NOT NULL DEFAULT 0,
    locked_by TEXT,
    locked_at TEXT,
    unlocked_by TEXT,
    unlocked_at TEXT,
    unlock_reason TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES profiles(user_id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES standard_procedures(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_procedures_engagement_id ON audit_procedures(engagement_id);
CREATE INDEX idx_audit_procedures_assigned_to ON audit_procedures(assigned_to);
CREATE INDEX idx_audit_procedures_status ON audit_procedures(status);
CREATE INDEX idx_audit_procedures_area ON audit_procedures(area);

-- Procedure Assignees
CREATE TABLE IF NOT EXISTS procedure_assignees (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    procedure_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    assigned_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (procedure_id) REFERENCES audit_procedures(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    UNIQUE(procedure_id, user_id)
);

CREATE INDEX idx_procedure_assignees_procedure_id ON procedure_assignees(procedure_id);
CREATE INDEX idx_procedure_assignees_user_id ON procedure_assignees(user_id);

-- Procedure Checklist Items
CREATE TABLE IF NOT EXISTS procedure_checklist_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    procedure_id TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'na')),
    is_required INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    completed_by TEXT,
    completed_at TEXT,
    template_item_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (procedure_id) REFERENCES audit_procedures(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES profiles(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_procedure_checklist_items_procedure_id ON procedure_checklist_items(procedure_id);

-- Procedure Evidence Requirements
CREATE TABLE IF NOT EXISTS procedure_evidence_requirements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    procedure_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 0,
    wp_ref TEXT,
    allowed_file_types TEXT, -- JSON array stored as TEXT
    sort_order INTEGER NOT NULL DEFAULT 0,
    template_requirement_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (procedure_id) REFERENCES audit_procedures(id) ON DELETE CASCADE
);

CREATE INDEX idx_procedure_evidence_requirements_procedure_id ON procedure_evidence_requirements(procedure_id);

-- Evidence Files
CREATE TABLE IF NOT EXISTS evidence_files (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER NOT NULL,
    linked_procedure TEXT,
    workpaper_ref TEXT,
    approval_stage TEXT NOT NULL DEFAULT 'draft',
    uploaded_by TEXT NOT NULL,
    prepared_by TEXT,
    prepared_at TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    approved_by TEXT,
    approved_at TEXT,
    locked INTEGER NOT NULL DEFAULT 0,
    locked_by TEXT,
    locked_at TEXT,
    unlocked_by TEXT,
    unlocked_at TEXT,
    unlock_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_files_engagement_id ON evidence_files(engagement_id);
CREATE INDEX idx_evidence_files_uploaded_by ON evidence_files(uploaded_by);

-- Evidence Links
CREATE TABLE IF NOT EXISTS evidence_links (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    procedure_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    evidence_requirement_id TEXT,
    linked_by TEXT NOT NULL,
    linked_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (procedure_id) REFERENCES audit_procedures(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_requirement_id) REFERENCES procedure_evidence_requirements(id) ON DELETE SET NULL,
    FOREIGN KEY (linked_by) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_links_procedure_id ON evidence_links(procedure_id);
CREATE INDEX idx_evidence_links_evidence_id ON evidence_links(evidence_id);

-- Risks
CREATE TABLE IF NOT EXISTS risks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    risk_area TEXT NOT NULL,
    description TEXT NOT NULL,
    risk_type TEXT NOT NULL DEFAULT 'significant',
    inherent_risk TEXT NOT NULL DEFAULT 'medium',
    control_risk TEXT NOT NULL DEFAULT 'medium',
    combined_risk TEXT NOT NULL DEFAULT 'medium',
    key_controls TEXT,
    audit_response TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'closed')),
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_risks_engagement_id ON risks(engagement_id);

-- Review Notes
CREATE TABLE IF NOT EXISTS review_notes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL,
    procedure_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'responded', 'resolved')),
    priority TEXT NOT NULL DEFAULT 'medium',
    response TEXT,
    assigned_to TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    approval_stage TEXT NOT NULL DEFAULT 'draft',
    locked INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (procedure_id) REFERENCES audit_procedures(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES profiles(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_review_notes_engagement_id ON review_notes(engagement_id);
CREATE INDEX idx_review_notes_procedure_id ON review_notes(procedure_id);

-- Compliance Applicability
CREATE TABLE IF NOT EXISTS compliance_applicability (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL UNIQUE,
    inputs TEXT NOT NULL DEFAULT '{}', -- JSON object
    results TEXT NOT NULL DEFAULT '[]', -- JSON array
    reasons TEXT NOT NULL DEFAULT '[]', -- JSON array
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_compliance_applicability_engagement ON compliance_applicability(engagement_id);

-- Materiality Risk Assessment
CREATE TABLE IF NOT EXISTS materiality_risk_assessment (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    engagement_id TEXT NOT NULL UNIQUE,
    risk_state TEXT NOT NULL DEFAULT '{}', -- JSON object
    materiality_state TEXT NOT NULL DEFAULT '{}', -- JSON object
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_materiality_risk_assessment_engagement ON materiality_risk_assessment(engagement_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_audit_procedures_timestamp
AFTER UPDATE ON audit_procedures
BEGIN
    UPDATE audit_procedures SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_evidence_files_timestamp
AFTER UPDATE ON evidence_files
BEGIN
    UPDATE evidence_files SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_risks_timestamp
AFTER UPDATE ON risks
BEGIN
    UPDATE risks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_review_notes_timestamp
AFTER UPDATE ON review_notes
BEGIN
    UPDATE review_notes SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_compliance_applicability_timestamp
AFTER UPDATE ON compliance_applicability
BEGIN
    UPDATE compliance_applicability SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_materiality_risk_assessment_timestamp
AFTER UPDATE ON materiality_risk_assessment
BEGIN
    UPDATE materiality_risk_assessment SET updated_at = datetime('now') WHERE id = NEW.id;
END;
