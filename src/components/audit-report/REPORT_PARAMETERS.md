# Audit Report — Report Parameters

Purpose: concise reference of fields required by the Main Report editor and Report export.

Location: used by `MainReportEditor.tsx` and `ReportExport.tsx` (report assembly via `AuditReportGenerator`).

Required `setup` fields
- `signing_partner_id` — partner lookup for signer name and membership number.
- `report_city` — printed as Place in signatures.
- `report_date` — printed as Date in signatures.
- `udin` — UDIN printed under signature.
- `caro_applicable_status` — controls CARO clause inclusion (`not_applicable`, `cfs_only_xxi`, ...).
- `caro_annexure_letter`, `ifc_annexure_letter` — annexure identifiers (optional).
- Feature flags: `cash_flow_required`, `ifc_applicable`, `is_listed_company`.
- Conditional fields: `branch_locations`, `predecessor_auditor_name`, `predecessor_report_date` (if corresponding flags set).
- `locked` — UI status (Draft / Locked) — not required for generation but used by UI.

Required `draft` (main report content) fields
- Signature block: `firm_name`, `firm_registration_no`, `partner_name`, `membership_no`.
- Opinion: `opinion_type` (`unqualified`/`qualified`/`adverse`/`disclaimer`), `basis_for_opinion`.
- Qualification details (if opinion modified): `qualification_details`.
- Going concern: `has_going_concern_uncertainty`, `going_concern_details`, `going_concern_note_ref`.
- KAM inclusion: `include_kam` (KAMs come from `useKeyAuditMatters`).
- Emphasis / Other matter arrays: `has_emphasis_of_matter`, `emphasis_of_matter_items[]` (each `{title, paragraph, note_ref}`); `has_other_matter`, `other_matter_items[]`.
- SA 720: `board_report_status`, `board_report_misstatement_details` (if applicable).
- Section 143(3): clause fields such as `clause_143_3_a_status`, `clause_143_3_a_details`, `clause_143_3_b_audit_trail_status`, `clause_143_3_b_server_outside_india`, `clause_143_3_i_ifc_qualification`, etc.
- Rule 11: `rule_11_a_pending_litigations`, `rule_11_b_long_term_contracts`, `rule_11_c_iepf_status`, `rule_11_c_delay_amount`, `rule_11_e_interim_dividend_amount`, `rule_11_e_final_dividend_amount`, note refs and related fields.
- Numeric fields: use numbers or `null` (inputs coerce with `coerceNumber`).

Other required data
- `responses` — CARO responses with `clause_id`, `status`, `is_applicable`, `na_reason`, `conclusion_text` (used for Annexure + completion %).
- `clauses` — clause library with `clause_id` and `clause_title`.
- `firmSettings` — includes `firm_name`, `firm_registration_no`, `address`, and optionally logo used for Word export.
- `currentEngagement` / props — `client_name`, `financial_year`.
- Assets: `ca-india-logo.jpg` (or configured logo) for Word letterhead.

Filenames produced by export
- Full PDF / Word: `Audit_Report_{entityName}_FY{financialYear}.pdf|.docx`
- CARO only PDF: `CARO_2020_Annexure_{engagementId.slice(0,8)}.pdf`

Notes
- Report assembly is done by `AuditReportGenerator` (constructed in `MainReportEditor.tsx`).
- Keep `setup` signature fields populated before generating final documents to avoid placeholders.
