// ============================================================================
// MASTER DATA MODEL FOR ENGAGEMENT LETTER GENERATION
// ============================================================================
// Single source of truth for all engagement letter variations

export type EngagementLetterType =
  | 'statutory_audit_company_with_ifc'
  | 'statutory_audit_company_without_ifc'
  | 'tax_audit_partnership_3ca'
  | 'tax_audit_partnership_3cb';

export type EntityType = 'Company' | 'Partnership' | 'LLP' | 'Trust';
export type EntityStatus = 'Unlisted Company' | 'Listed Company' | 'Partnership Firm' | 'LLP' | 'Trust';
export type AccountingStandard = 'Ind AS' | 'AS' | 'Schedule III';

// A. CLIENT / ENTITY DETAILS
export interface EntityDetails {
  entity_name: string;
  entity_type: EntityType;
  entity_status: EntityStatus;
  registration_no: string; // CIN or Firm Registration No
  pan: string;
  gstin?: string;
  registered_address: string;
  email: string;
  phone: string;
}

// B. ENGAGEMENT PERIOD
export interface EngagementPeriod {
  financial_year: string; // e.g., "2024-25" or "2024-2025"
  assessment_year?: string; // For tax audits, e.g., "2024-25"
  balance_sheet_date: string; // ISO format: "2025-03-31"
  appointment_date: string; // ISO format
}

// C. AUDITOR / FIRM DETAILS
export interface AuditorDetails {
  firm_name: string;
  firm_reg_no: string;
  partner_name: string;
  partner_mem_no: string;
  partner_pan: string;
  place: string;
  letter_date: string; // ISO format
}

// D. FEES & COMMERCIAL TERMS
export interface CommercialTerms {
  professional_fees: number;
  professional_fees_currency?: string; // INR by default
  taxes_extra: boolean; // If true, fees are exclusive of taxes
  payment_terms: string; // e.g., "Upon billing", "50% on engagement, 50% on completion"
  out_of_pocket_exp: boolean; // Whether to charge OOE separately
}

// E. MANAGEMENT RESPONSIBILITY ACKNOWLEDGEMENTS
export interface ManagementResponsibilities {
  mgmt_responsibility_ack: boolean; // Management acknowledges its responsibilities
  books_responsibility_ack: boolean; // Books and records responsibility
  internal_control_ack: boolean; // Internal control design responsibility
  fraud_prevention_ack: boolean; // Fraud prevention responsibility
}

// CONDITIONAL FIELDS — STATUTORY AUDIT (COMPANY)
export interface StatutoryAuditCompanyConfig {
  ifc_applicable: boolean; // If true, include IFC audit scope
  caro_applicable: boolean; // If true, include CARO 2020 scope
  ind_as_applicable: boolean; // If false, use AS / Schedule III instead
}

// CONDITIONAL FIELDS — TAX AUDIT (PARTNERSHIP)
export interface TaxAuditPartnershipConfig {
  tax_audit_form: '3CA' | '3CB';
  audited_under_other_law: boolean; // If true, note audit under another law
  accounting_standard: AccountingStandard;
}

// ============================================================================
// MASTER ENGAGEMENT LETTER DATA (COMPREHENSIVE)
// ============================================================================
export interface EngagementLetterMasterData {
  // Engagement type selection (drives all downstream logic)
  engagement_type: EngagementLetterType;

  // Core master data (always required)
  entity: EntityDetails;
  period: EngagementPeriod;
  auditor: AuditorDetails;
  commercial: CommercialTerms;
  mgmt_responsibilities: ManagementResponsibilities;

  // Conditional sections (activated based on engagement_type)
  statutory_audit_config?: StatutoryAuditCompanyConfig;
  tax_audit_config?: TaxAuditPartnershipConfig;
}

// ============================================================================
// DERIVED / HELPER TYPES
// ============================================================================

/**
 * Engagement letter template context
 * This is built from EngagementLetterMasterData for template rendering
 */
export interface LetterContext {
  // All master data fields (flattened for template access)
  entity_name: string;
  entity_type: EntityType;
  entity_status: EntityStatus;
  registration_no: string;
  pan: string;
  gstin?: string;
  registered_address: string;
  email: string;
  phone: string;

  financial_year: string;
  assessment_year?: string;
  balance_sheet_date: string;
  appointment_date: string;

  firm_name: string;
  firm_reg_no: string;
  partner_name: string;
  partner_mem_no: string;
  partner_pan: string;
  place: string;
  letter_date: string;

  professional_fees: string; // formatted
  taxes_extra: boolean;
  payment_terms: string;
  out_of_pocket_exp: boolean;

  mgmt_responsibility_ack: boolean;
  books_responsibility_ack: boolean;
  internal_control_ack: boolean;
  fraud_prevention_ack: boolean;

  // Conditionals
  ifc_applicable?: boolean;
  caro_applicable?: boolean;
  ind_as_applicable?: boolean;
  tax_audit_form?: string;
  audited_under_other_law?: boolean;
  accounting_standard?: AccountingStandard;

  // Derived / computed fields
  is_statutory_audit_company: boolean;
  is_tax_audit_partnership: boolean;
  is_ifc_applicable: boolean;
  is_caro_applicable: boolean;
  is_ind_as: boolean;
  is_3ca: boolean;
  is_3cb: boolean;
}

/**
 * Result of engagement letter generation
 */
export interface GeneratedLetterResult {
  success: boolean;
  document_buffer?: Buffer; // DOCX binary
  document_base64?: string; // Base64 for transmission
  error?: string;
  letter_type: EngagementLetterType;
  generated_at: string;
}
