# Database Architecture Documentation

## Overview

This document provides comprehensive documentation of the database architecture for the Audit Management System. The database is hosted on Lovable Cloud (Supabase-powered backend) and contains **63 tables** organized into logical domains.

---

## Table of Contents

1. [Core Domain Tables](#core-domain-tables)
2. [Audit Workflow Tables](#audit-workflow-tables)
3. [Audit Report Tables](#audit-report-tables)
4. [Trial Balance Tables](#trial-balance-tables)
5. [Going Concern Tables](#going-concern-tables)
6. [Rule Engine Tables](#rule-engine-tables)
7. [System & Configuration Tables](#system--configuration-tables)
8. [Entity Relationship Diagram](#entity-relationship-diagram)
9. [Table Dependencies](#table-dependencies)
10. [RLS Policies Summary](#rls-policies-summary)

---

## Core Domain Tables

### 1. `profiles`
User profile information linked to Supabase auth.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Reference to auth.users |
| full_name | text | NO | - | User's display name |
| email | text | NO | - | User's email address |
| avatar_url | text | YES | - | Profile picture URL |
| phone | text | YES | - | Phone number |
| firm_id | uuid | YES | - | FK → firm_settings.id |
| is_active | boolean | NO | true | Account status |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

**Relationships:**
- `firm_id` → `firm_settings.id` (Many users belong to one firm)

---

### 2. `user_roles`
Role-based access control for users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK → profiles.user_id |
| role | app_role | NO | 'staff' | Role enum: partner, manager, senior, staff |
| created_at | timestamptz | NO | now() | Creation timestamp |

**Valid Roles:** `partner`, `manager`, `senior`, `staff`

---

### 3. `firm_settings`
Firm/organization configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_name | text | NO | - | Firm's legal name |
| firm_registration_no | text | YES | - | ICAI registration number |
| constitution | text | YES | - | Firm constitution type |
| address | text | YES | - | Registered address |
| icai_unique_sl_no | text | YES | - | ICAI unique serial |
| no_of_partners | integer | YES | - | Number of partners |
| created_by | uuid | NO | - | Creator user ID |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

---

### 4. `partners`
Partner information for the firm.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Partner's full name |
| membership_number | text | NO | - | ICAI membership number |
| email | text | YES | - | Email address |
| phone | text | YES | - | Phone number |
| pan | text | YES | - | PAN number |
| date_of_joining | date | NO | - | Date joined firm |
| date_of_exit | date | YES | - | Exit date (if applicable) |
| user_id | uuid | YES | - | Linked user profile |
| is_active | boolean | NO | true | Active status |
| created_by | uuid | NO | - | Creator user ID |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

---

### 5. `clients`
Client/entity master data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Client name |
| industry | text | NO | - | Industry classification |
| constitution | text | YES | 'company' | Legal constitution |
| cin | text | YES | - | Corporate Identity Number |
| pan | text | YES | - | PAN number |
| address | text | YES | - | Registered address |
| state | text | YES | - | State |
| pin | text | YES | - | PIN code |
| contact_person | text | YES | - | Primary contact name |
| contact_email | text | YES | - | Contact email |
| contact_phone | text | YES | - | Contact phone |
| status | text | NO | 'active' | Status: active/inactive |
| notes | text | YES | - | Additional notes |
| created_by | uuid | NO | - | Creator user ID |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

---

### 6. `engagements`
Audit engagement master data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Engagement name |
| client_id | uuid | YES | - | FK → clients.id |
| client_name | text | NO | - | Client name (denormalized) |
| engagement_type | text | NO | 'statutory' | Type: statutory/internal/tax/special |
| financial_year | text | NO | - | Financial year (e.g., "2024-25") |
| status | text | NO | 'planning' | Status: planning/fieldwork/review/completion |
| partner_id | uuid | YES | - | FK → profiles.user_id |
| manager_id | uuid | YES | - | FK → profiles.user_id |
| materiality_amount | numeric | YES | - | Overall materiality |
| performance_materiality | numeric | YES | - | Performance materiality |
| trivial_threshold | numeric | YES | - | Trivial threshold |
| start_date | date | YES | - | Engagement start date |
| end_date | date | YES | - | Engagement end date |
| notes | text | YES | - | Additional notes |
| created_by | uuid | NO | - | Creator user ID |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

**Relationships:**
- `client_id` → `clients.id`
- `partner_id` → `profiles.user_id`
- `manager_id` → `profiles.user_id`

---

### 7. `engagement_assignments`
Team member assignments to engagements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| user_id | uuid | NO | - | Assigned user |
| role | text | NO | - | Assignment role |
| assigned_by | uuid | NO | - | Who made assignment |
| created_at | timestamptz | NO | now() | Creation timestamp |

**Relationships:**
- `engagement_id` → `engagements.id`

---

### 8. `financial_years`
Financial year master data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| year_code | text | NO | - | Year code (e.g., "2024-25") |
| display_name | text | NO | - | Display name |
| is_active | boolean | NO | true | Active status |
| created_by | uuid | NO | - | Creator user ID |
| created_at | timestamptz | NO | now() | Creation timestamp |

---

## Audit Workflow Tables

### 9. `audit_procedures`
Individual audit procedures/steps.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| procedure_name | text | NO | - | Procedure name |
| description | text | YES | - | Detailed description |
| area | text | NO | - | Financial statement area |
| assertion | text | YES | - | Related assertion |
| status | text | NO | 'not_started' | Status: not_started/in_progress/done/reviewed |
| approval_stage | text | NO | 'draft' | Approval: draft/prepared/reviewed/approved |
| assigned_to | uuid | YES | - | FK → profiles.user_id |
| due_date | date | YES | - | Due date |
| completed_date | date | YES | - | Completion date |
| conclusion | text | YES | - | Audit conclusion |
| conclusion_prompt | text | YES | - | AI conclusion prompt |
| workpaper_ref | text | YES | - | Workpaper reference |
| template_id | uuid | YES | - | FK → standard_procedures.id |
| checklist_items | jsonb | NO | '[]' | Checklist items array |
| evidence_requirements | jsonb | NO | '[]' | Evidence requirements |
| prepared_by | uuid | YES | - | Preparer |
| prepared_at | timestamptz | YES | - | Preparation timestamp |
| reviewed_by | uuid | YES | - | Reviewer |
| reviewed_at | timestamptz | YES | - | Review timestamp |
| approved_by | uuid | YES | - | Approver |
| approved_at | timestamptz | YES | - | Approval timestamp |
| locked | boolean | NO | false | Lock status |
| locked_by | uuid | YES | - | Who locked |
| locked_at | timestamptz | YES | - | Lock timestamp |
| unlocked_by | uuid | YES | - | Who unlocked |
| unlocked_at | timestamptz | YES | - | Unlock timestamp |
| unlock_reason | text | YES | - | Reason for unlock |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

**Relationships:**
- `engagement_id` → `engagements.id`
- `assigned_to` → `profiles.user_id`
- `template_id` → `standard_procedures.id`

---

### 10. `procedure_assignees`
Multiple assignees for procedures.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| procedure_id | uuid | NO | - | FK → audit_procedures.id |
| user_id | uuid | NO | - | Assigned user |
| assigned_by | uuid | NO | - | Who assigned |
| created_at | timestamptz | NO | now() | Creation timestamp |

---

### 11. `procedure_checklist_items`
Checklist items within procedures.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| procedure_id | uuid | NO | - | FK → audit_procedures.id |
| text | text | NO | - | Checklist item text |
| status | text | NO | 'pending' | Status: pending/completed/na |
| is_required | boolean | NO | false | Is mandatory |
| sort_order | integer | NO | 0 | Display order |
| remarks | text | YES | - | Additional remarks |
| completed_by | uuid | YES | - | Who completed |
| completed_at | timestamptz | YES | - | Completion timestamp |
| template_item_id | uuid | YES | - | Template reference |
| created_at | timestamptz | NO | now() | Creation timestamp |

---

### 12. `procedure_evidence_requirements`
Evidence requirements for procedures.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| procedure_id | uuid | NO | - | FK → audit_procedures.id |
| title | text | NO | - | Requirement title |
| is_required | boolean | NO | false | Is mandatory |
| wp_ref | text | YES | - | Workpaper reference |
| allowed_file_types | text[] | YES | '{}' | Allowed file types |
| sort_order | integer | NO | 0 | Display order |
| template_requirement_id | uuid | YES | - | Template reference |
| created_at | timestamptz | NO | now() | Creation timestamp |

---

### 13. `evidence_files`
Uploaded evidence files.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | YES | - | FK → engagements.id |
| name | text | NO | - | File name |
| file_path | text | NO | - | Storage path |
| file_type | text | NO | - | File type/extension |
| mime_type | text | YES | - | MIME type |
| file_size | bigint | NO | - | File size in bytes |
| linked_procedure | text | YES | - | Linked procedure ref |
| workpaper_ref | text | YES | - | Workpaper reference |
| approval_stage | text | NO | 'draft' | Approval stage |
| uploaded_by | uuid | NO | - | Uploader |
| prepared_by/reviewed_by/approved_by | uuid | YES | - | Approval chain |
| locked | boolean | NO | false | Lock status |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 14. `evidence_links`
Links between evidence files and procedures.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| procedure_id | uuid | NO | - | FK → audit_procedures.id |
| evidence_id | uuid | NO | - | FK → evidence_files.id |
| evidence_requirement_id | uuid | YES | - | FK → procedure_evidence_requirements.id |
| linked_by | uuid | NO | - | Who created link |
| linked_at | timestamptz | NO | now() | Link timestamp |

---

### 15. `risks`
Risk register entries.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| risk_area | text | NO | - | Financial statement area |
| description | text | NO | - | Risk description |
| risk_type | text | NO | 'significant' | Risk type |
| inherent_risk | text | NO | 'medium' | Inherent risk level |
| control_risk | text | NO | 'medium' | Control risk level |
| combined_risk | text | NO | 'medium' | Combined risk level |
| key_controls | text | YES | - | Key controls |
| audit_response | text | YES | - | Audit response |
| status | text | NO | 'open' | Status: open/mitigated/closed |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 16. `review_notes`
Review notes and queries.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| procedure_id | uuid | YES | - | FK → audit_procedures.id |
| title | text | NO | - | Note title |
| content | text | NO | - | Note content |
| status | text | NO | 'open' | Status: open/responded/resolved |
| priority | text | NO | 'medium' | Priority level |
| response | text | YES | - | Response text |
| assigned_to | uuid | YES | - | Assignee |
| resolved_by | uuid | YES | - | Who resolved |
| resolved_at | timestamptz | YES | - | Resolution timestamp |
| approval_stage | text | NO | 'draft' | Approval stage |
| locked | boolean | NO | false | Lock status |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 17. `notifications`
User notifications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Target user |
| title | text | NO | - | Notification title |
| message | text | NO | - | Notification message |
| type | text | NO | - | Notification type |
| link | text | YES | - | Action link |
| is_read | boolean | NO | false | Read status |
| created_at | timestamptz | NO | now() | Creation timestamp |

---

## Audit Program Tables

### 18. `audit_programs_new`
Structured audit programs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| client_id | uuid | NO | - | FK → clients.id |
| financial_year_id | uuid | NO | - | FK → financial_years.id |
| name | text | NO | - | Program name |
| description | text | YES | - | Description |
| workpaper_reference | text | YES | - | Workpaper ref |
| status | text | NO | 'draft' | Status |
| prepared_by/reviewed_by/approved_by | uuid | YES | - | Approval chain |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Update timestamp |

---

### 19. `audit_program_sections`
Sections within audit programs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| audit_program_id | uuid | NO | - | FK → audit_programs_new.id |
| name | text | NO | - | Section name |
| order | integer | NO | 0 | Display order |
| is_expanded | boolean | YES | false | UI state |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Update timestamp |

---

### 20. `audit_program_boxes`
Content boxes within sections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| section_id | uuid | NO | - | FK → audit_program_sections.id |
| header | text | NO | - | Box header |
| content | text | YES | '' | Box content |
| order | integer | NO | 0 | Display order |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Update timestamp |

---

### 21. `audit_program_attachments`
Attachments for audit programs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| audit_program_id | uuid | NO | - | FK → audit_programs_new.id |
| section_id | uuid | YES | - | FK → audit_program_sections.id |
| box_id | uuid | YES | - | FK → audit_program_boxes.id |
| file_name | text | NO | - | File name |
| file_path | text | NO | - | Storage path |
| file_type | text | NO | - | File type |
| file_size | integer | NO | - | File size |
| description | text | YES | - | Description |
| is_evidence | boolean | YES | false | Is evidence file |
| uploaded_by | uuid | NO | - | Uploader |
| uploaded_at | timestamptz | YES | now() | Upload timestamp |

---

## Audit Report Tables

### 22. `audit_report_setup`
Audit report configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id (unique) |
| company_type | text | YES | - | Company type |
| company_cin | text | YES | - | CIN number |
| registered_office | text | YES | - | Registered office |
| nature_of_business | text | YES | - | Business nature |
| accounting_framework | text | YES | 'AS' | AS/Ind AS |
| is_listed_company | boolean | YES | false | Listed status |
| is_public_company | boolean | YES | false | Public company |
| is_private_company | boolean | YES | false | Private company |
| is_small_company | boolean | YES | false | Small company |
| is_opc | boolean | YES | false | OPC status |
| ifc_applicable | boolean | YES | true | IFC applicable |
| caro_applicable_status | text | YES | 'pending' | CARO status |
| cash_flow_required | boolean | YES | true | Cash flow required |
| has_branch_auditors | boolean | YES | false | Branch auditors |
| has_predecessor_auditor | boolean | YES | false | Predecessor auditor |
| signing_partner_id | uuid | YES | - | FK → partners.id |
| report_date | date | YES | - | Report date |
| report_city | text | YES | - | Report city |
| udin | text | YES | - | UDIN |
| setup_completed | boolean | YES | false | Setup complete |
| locked | boolean | YES | false | Lock status |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 23. `audit_report_main_content`
Main audit report content and opinions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id (unique) |
| opinion_type | text | NO | 'unqualified' | Opinion type |
| basis_for_opinion | text | YES | - | Basis text |
| qualification_details | text | YES | - | Qualification details |
| has_emphasis_of_matter | boolean | YES | false | EoM exists |
| emphasis_of_matter_items | jsonb | YES | '[]' | EoM items |
| has_other_matter | boolean | YES | false | OM exists |
| other_matter_items | jsonb | YES | '[]' | OM items |
| has_going_concern_uncertainty | boolean | YES | false | GC uncertainty |
| include_kam | boolean | YES | false | Include KAM |
| is_finalized | boolean | YES | false | Finalized |
| version_number | integer | YES | 1 | Version |
| created_by | text | NO | - | Creator |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Update timestamp |

*(Contains extensive fields for Companies Act 143(3) clauses and Rule 11 reporting)*

---

### 24. `audit_report_documents`
Versioned document sections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| section_name | text | NO | - | Section identifier |
| section_title | text | YES | - | Display title |
| content_json | jsonb | YES | '{}' | Structured content |
| content_html | text | YES | - | HTML content |
| version_number | integer | YES | 1 | Version |
| is_locked | boolean | YES | false | Lock status |
| changed_by | uuid | YES | - | Last changer |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 25. `key_audit_matters`
Key Audit Matters (KAM).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| title | text | NO | - | KAM title |
| description | text | NO | - | KAM description |
| audit_response | text | NO | - | How we addressed |
| sort_order | integer | YES | 0 | Display order |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 26-28. CARO Tables

#### `caro_clause_library`
Master library of CARO clauses.

| Key Columns | Description |
|-------------|-------------|
| clause_id | Clause identifier (e.g., "3.i.a") |
| clause_title | Clause title |
| positive_wording | Positive reporting template |
| negative_wording | Negative reporting template |
| na_wording | Not applicable template |
| questions | JSONB - Follow-up questions |

#### `caro_clause_responses`
Engagement-specific CARO responses.

| Key Columns | Description |
|-------------|-------------|
| engagement_id | FK → engagements.id |
| clause_id | CARO clause reference |
| is_applicable | Applicability status |
| conclusion_text | Final conclusion |
| answers | JSONB - Question answers |
| status | not_started/in_progress/completed |

#### `caro_standard_answers`
Firm-level standard CARO templates.

---

## Trial Balance Tables

### 29. `trial_balance_lines`
Main trial balance data (v1 - Schedule III focused).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id |
| account_code | text | NO | - | Account code |
| account_name | text | NO | - | Account name |
| opening_balance | numeric | NO | 0 | Opening balance |
| debit | numeric | NO | 0 | Debit movements |
| credit | numeric | NO | 0 | Credit movements |
| closing_balance | numeric | NO | 0 | Closing balance |
| fs_area | text | YES | - | FS area classification |
| aile | text | YES | - | AILE code |
| face_group | text | YES | - | Face of FS group |
| note_group | text | YES | - | Note group |
| sub_note | text | YES | - | Sub-note |
| level4_group | text | YES | - | Level 4 (v3 codes) |
| level5_detail | text | YES | - | Level 5 detail |
| schedule_iii_code | text | YES | - | Schedule III code |
| ledger_primary_group | text | YES | - | Tally primary group |
| ledger_parent | text | YES | - | Tally parent group |
| period_type | text | YES | 'current' | current/prior |
| version | integer | NO | 1 | Data version |
| applied_rule_id | text | YES | - | Applied mapping rule |
| validation_flags | text[] | YES | '{}' | Validation flags |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 30. `schedule_iii_config`
Schedule III configuration per engagement.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id (unique) |
| start_note_number | integer | NO | 1 | Starting note number |
| include_contingent_liabilities | boolean | NO | true | Include contingent liabilities |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 31-34. Trial Balance New Tables (v2)

#### `tb_new_entity_info`
Entity information for TB New module.

| Key Columns | Description |
|-------------|-------------|
| engagement_id | FK → engagements.id |
| entity_name | Entity name |
| entity_type | Entity type |
| business_type | Business type |
| period_from/period_to | Accounting period |
| company_* | Company details |

#### `tb_new_ledgers`
Ledger entries with hierarchical classification.

| Key Columns | Description |
|-------------|-------------|
| engagement_id | FK → engagements.id |
| entity_info_id | FK → tb_new_entity_info.id |
| ledger_name | Ledger name |
| primary_group | Primary group |
| h1-h5 | Hierarchical classification |
| opening/closing_balance | Balances |
| debit/credit | Movements |

#### `tb_new_stock_items`
Stock/inventory items.

#### `tb_new_classification_mappings`
User-defined classification overrides.

#### `tb_new_sessions`
Saved workspaces/sessions.

---

## Going Concern Tables

### 35. `going_concern_workpapers`
Main going concern workpaper.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| engagement_id | uuid | NO | - | FK → engagements.id (unique) |
| procedure_id | uuid | YES | - | FK → audit_procedures.id |
| chapter_no | text | YES | '4.1' | Chapter number |
| topic | text | YES | 'Going Concern' | Topic |
| conclusion | text | YES | - | Overall conclusion |
| status | text | YES | 'draft' | Status |
| prepared_by/reviewed_by/approved_by | uuid | YES | - | Approval chain |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 36. `going_concern_checklist_items`
Checklist items for going concern.

| Key Columns | Description |
|-------------|-------------|
| workpaper_id | FK → going_concern_workpapers.id |
| section_number | Section reference |
| item_number | Item reference |
| description | Item description |
| findings | Audit findings |
| working | Work performed |
| annexure_ref | Annexure reference |

---

### 37-41. Going Concern Annexures

| Table | Purpose |
|-------|---------|
| `gc_annexure_net_worth` | Net worth analysis |
| `gc_annexure_profitability` | Profitability analysis |
| `gc_annexure_borrowings` | Borrowings/debt analysis |
| `gc_annexure_cash_flows` | Cash flow analysis |
| `gc_annexure_ratios` | Financial ratios |

All annexures reference `going_concern_workpapers.id` via `workpaper_id`.

---

## Rule Engine Tables

### 42. `aile_rule_sets`
Rule set containers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Rule set name |
| description | text | YES | - | Description |
| is_active | boolean | NO | true | Active status |
| is_default | boolean | NO | false | Default rule set |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 43. `aile_mapping_rules`
AILE/FS area mapping rules.

| Key Columns | Description |
|-------------|-------------|
| rule_set_id | FK → aile_rule_sets.id |
| match_field | Field to match on |
| match_pattern | Pattern to match |
| match_type | Match type: contains/exact/regex |
| target_aile | Target AILE code |
| target_fs_area | Target FS area |
| target_face_group | Face group |
| target_note_group | Note group |
| priority | Rule priority |
| has_balance_logic | Sign-dependent mapping |

---

### 44-47. Additional Rule Tables

| Table | Purpose |
|-------|---------|
| `rule_engine_group_rules` | Tally group → Schedule III mapping |
| `rule_engine_keyword_rules` | Keyword-based classification |
| `rule_engine_override_rules` | Manual overrides for specific ledgers |
| `rule_engine_validation_rules` | Validation rules |

---

## Template Tables

### 48. `standard_programs`
Standard audit program templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Program name |
| audit_area | text | NO | - | Audit area |
| engagement_type | text | NO | 'statutory' | Engagement type |
| description | text | YES | - | Description |
| is_active | boolean | NO | true | Active status |
| created_by | uuid | NO | - | Creator |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Update timestamp |

---

### 49. `standard_procedures`
Standard procedure templates.

| Key Columns | Description |
|-------------|-------------|
| program_id | FK → standard_programs.id |
| procedure_name | Procedure name |
| area | Financial statement area |
| assertion | Related assertion |
| checklist_items | JSONB - Checklist template |
| evidence_requirements | JSONB - Evidence template |
| is_standalone | Can be used independently |

---

### 50-51. Procedure Template Items

| Table | Purpose |
|-------|---------|
| `procedure_template_checklist_items` | Checklist item templates |
| `procedure_template_evidence_requirements` | Evidence requirement templates |

---

## System Tables

### 52. `activity_logs`
System activity/audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Actor user ID |
| user_name | text | NO | - | Actor name |
| action | text | NO | - | Action performed |
| entity | text | NO | - | Entity type |
| entity_id | uuid | YES | - | Entity ID |
| engagement_id | uuid | YES | - | FK ? engagements.id (nullable) |
| details | text | YES | - | Action details |
| metadata | jsonb | YES | '{}' | Additional metadata |
| ip_address | text | YES | - | IP address |
| created_at | timestamptz | NO | now() | Timestamp |

---

### 53. `feedback_reports`
Product feedback submissions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | YES | - | FK ? firm_settings.id |
| firm_name | text | YES | - | Firm name snapshot |
| user_id | uuid | YES | - | FK ? profiles.user_id |
| user_name | text | YES | - | Submitter name |
| user_email | text | YES | - | Submitter email |
| user_mobile | text | YES | - | Submitter phone |
| feedback_type | text | NO | - | Bug / Improve / New Feature |
| module_area | text | NO | - | Module / area |
| title | text | NO | - | Summary (5?120 chars) |
| description | text | NO | - | Full description |
| impact | text | NO | - | Low / Medium / High |
| severity | text | YES | - | Bug severity |
| reproducibility | text | YES | - | Always / Sometimes / Once |
| steps_to_reproduce | text | YES | - | Steps |
| expected_result | text | YES | - | Expected behavior |
| actual_result | text | YES | - | Actual behavior |
| suggestion | text | YES | - | Improvement / desired outcome |
| business_justification | text | YES | - | Business rationale |
| app_version | text | YES | - | App version |
| build_number | text | YES | - | Build number |
| device_details | text | YES | - | Browser/OS/device |
| platform_details | text | YES | - | Platform info |
| submitted_at | timestamptz | NO | now() | Submission time |
| submitted_at_ist | timestamptz | YES | - | IST timestamp |
| status | text | NO | 'submitted' | Workflow status |

---

### 54. `feedback_attachments`
Attachment metadata for feedback.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| feedback_id | uuid | NO | - | FK ? feedback_reports.id |
| file_name | text | NO | - | File name |
| file_path | text | NO | - | Storage path |
| file_size | bigint | NO | - | File size |
| mime_type | text | YES | - | MIME type |
| created_at | timestamptz | NO | now() | Uploaded at |

---

### 55. `audit_trail`
Detailed change history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| entity_type | text | NO | - | Entity type |
| entity_id | uuid | NO | - | Entity ID |
| action | text | NO | - | Action type |
| old_value | text | YES | - | Previous value |
| new_value | text | YES | - | New value |
| reason | text | YES | - | Change reason |
| performed_by | uuid | NO | - | Who made change |
| performed_at | timestamptz | NO | now() | When |
| metadata | jsonb | YES | '{}' | Additional data |

---

### 56. `fs_templates`
Financial statement templates.

| Key Columns | Description |
|-------------|-------------|
| constitution_type | Entity type |
| level1-level5 | Hierarchy levels |
| sort_order | Display order |

---

### 57-58. Tally Bridge Tables

| Table | Purpose |
|-------|---------|
| `tally_bridge_sessions` | Active Tally connections |
| `tally_bridge_requests` | Tally XML request queue |

---

## Entity Relationship Diagram

```
                                    ┌──────────────────┐
                                    │   firm_settings  │
                                    └────────┬─────────┘
                                             │
                                             │ 1:N
                                             ▼
┌───────────────┐              ┌──────────────────────┐
│  user_roles   │◄─────────────│      profiles        │
└───────────────┘   1:1        └──────────┬───────────┘
                                          │
                                          │ 1:N
                                          ▼
                               ┌──────────────────────┐
                               │    engagements       │◄─────────────┐
                               └──────────┬───────────┘              │
                                          │                          │
         ┌────────────────────────────────┼────────────────────────┐ │
         │                                │                        │ │
         ▼                                ▼                        ▼ │
┌─────────────────┐            ┌──────────────────┐    ┌──────────────────┐
│ audit_procedures│            │      risks       │    │  review_notes    │
└────────┬────────┘            └──────────────────┘    └──────────────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
┌─────────────────────────┐                 ┌────────────────────────────┐
│procedure_checklist_items│                 │procedure_evidence_requirements│
└─────────────────────────┘                 └────────────────────────────┘
                                                        │
                                                        ▼
                                            ┌────────────────────┐
                                            │   evidence_links   │
                                            └─────────┬──────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │   evidence_files   │
                                            └────────────────────┘


                    AUDIT REPORT STRUCTURE
                    ━━━━━━━━━━━━━━━━━━━━━━
                    
┌──────────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│ audit_report_    │     │ audit_report_main_    │     │ key_audit_      │
│ setup            │     │ content               │     │ matters         │
└────────┬─────────┘     └───────────┬───────────┘     └────────┬────────┘
         │                           │                          │
         └───────────────────────────┼──────────────────────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │    engagements     │
                            └────────────────────┘
                                     ▲
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
┌────────┴─────────┐     ┌───────────┴───────────┐    ┌─────────┴──────────┐
│ caro_clause_     │     │ trial_balance_lines   │    │ going_concern_     │
│ responses        │     │                       │    │ workpapers         │
└──────────────────┘     └───────────────────────┘    └────────────────────┘


                    AUDIT PROGRAM STRUCTURE
                    ━━━━━━━━━━━━━━━━━━━━━━━
                    
┌──────────────────────┐
│  audit_programs_new  │
└──────────┬───────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────┐
│ audit_program_sections   │
└──────────┬───────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────┐
│   audit_program_boxes    │
└──────────────────────────┘
```

---

## Table Dependencies

### Primary Dependencies (Foreign Keys)

| Table | Depends On |
|-------|------------|
| `profiles` | `firm_settings` |
| `engagements` | `clients`, `profiles` |
| `engagement_assignments` | `engagements` |
| `audit_procedures` | `engagements`, `profiles`, `standard_procedures` |
| `procedure_assignees` | `audit_procedures` |
| `procedure_checklist_items` | `audit_procedures`, `procedure_template_checklist_items` |
| `procedure_evidence_requirements` | `audit_procedures`, `procedure_template_evidence_requirements` |
| `evidence_files` | `engagements` |
| `evidence_links` | `audit_procedures`, `evidence_files`, `procedure_evidence_requirements` |
| `risks` | `engagements` |
| `review_notes` | `engagements`, `audit_procedures` |
| `audit_programs_new` | `engagements`, `clients`, `financial_years` |
| `audit_program_sections` | `audit_programs_new` |
| `audit_program_boxes` | `audit_program_sections` |
| `audit_program_attachments` | `audit_programs_new`, `audit_program_sections`, `audit_program_boxes` |
| `audit_report_setup` | `engagements`, `partners` |
| `audit_report_main_content` | `engagements` |
| `audit_report_documents` | `engagements` |
| `key_audit_matters` | `engagements` |
| `caro_clause_responses` | `engagements` |
| `trial_balance_lines` | `engagements` |
| `schedule_iii_config` | `engagements` |
| `going_concern_workpapers` | `engagements`, `audit_procedures`, `profiles` |
| `gc_annexure_*` | `going_concern_workpapers` |
| `aile_mapping_rules` | `aile_rule_sets` |
| `rule_engine_*_rules` | `aile_rule_sets` |
| `standard_procedures` | `standard_programs` |
| `procedure_template_*` | `standard_procedures` |
| `tb_new_ledgers` | `engagements`, `tb_new_entity_info` |
| `tb_new_stock_items` | `engagements`, `tb_new_entity_info` |

---

## RLS Policies Summary

The database has **172 RLS policies** enforcing access control:

### Key Access Patterns

1. **Engagement-based Access**
   - Most tables use `has_engagement_access(auth.uid(), engagement_id)` function
   - Users can only access data for engagements they're assigned to

2. **Role-based Permissions**
   - `has_role(auth.uid(), 'partner')` - Partner-only actions
   - `has_role(auth.uid(), 'manager')` - Manager-only actions
   - Partners/managers can delete, staff can only create/update

3. **Creator-based Access**
   - `auth.uid() = created_by` for insert operations
   - Ensures users can only create records for themselves

### Policy Examples

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| engagements | has_engagement_access | created_by = auth.uid() | has_engagement_access | partner/manager only |
| audit_procedures | engagement access | engagement access | engagement access | partner/manager only |
| risks | engagement access | created_by + access | engagement access | partner/manager only |
| profiles | authenticated | via trigger | own profile | admin only |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-08 | Initial documentation |

---

## Notes

1. **UUID Primary Keys**: All tables use UUID v4 for primary keys via `gen_random_uuid()`
2. **Timestamps**: Most tables include `created_at` and `updated_at` with automatic triggers
3. **Soft Deletes**: Some tables use `is_active` boolean instead of hard deletes
4. **JSONB Fields**: Complex nested data stored in JSONB for flexibility
5. **Denormalization**: Some fields like `client_name` in engagements are denormalized for performance
