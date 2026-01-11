export type BoxStatus = 'not-commenced' | 'in-progress' | 'review' | 'complete';

export interface AuditExecutionProgram {
  id: string;
  engagement_id: string;
  client_id: string;
  financial_year_id: string;
  name: string;
  description: string | null;
  workpaper_reference: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  prepared_by: string | null;
  prepared_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface AuditExecutionSection {
  id: string;
  audit_program_id: string;
  name: string;
  order: number;
  is_expanded: boolean | null;
  is_applicable: boolean;
  locked: boolean;
  status: BoxStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditExecutionBox {
  id: string;
  section_id: string;
  header: string;
  content: string | null;
  order: number;
  status: BoxStatus;
  locked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditExecutionAttachment {
  id: string;
  audit_program_id: string;
  section_id: string | null;
  box_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by: string;
  uploaded_at: string;
  description: string | null;
  is_evidence: boolean | null;
}

export const DEFAULT_SECTION_NAMES: string[] = [
  'Property, Plant and Equipment',
  'CWIP',
  'Intangible Assets',
  'Right of Use of Assets',
  'Depreciation & Amortization',
  'Investments',
  'Trade Receivables',
  'Cash and Bank',
  'Other Financial Assets',
  'Share Capital',
  'Other Equity',
  'Loans and Borrowings',
  'Finance Cost',
  'Lease Liabilities',
  'Trade Payables',
  'Other Financial Liabilities',
  'Tax Liabilities',
  'Other Current Liabilities',
  'Deferred Tax Liabilities',
  'Revenue from Operations',
  'Other Income',
  'Inventory',
  'Employee Benefits',
  'Expenses',
];

export const LEGACY_SECTION_NAME_MAP: Record<string, string> = {
  'Reserves and Surplus': 'Other Equity',
  Borrowings: 'Loans and Borrowings',
  'Capital Work in Progress': 'CWIP',
  Inventories: 'Inventory',
  'Loans and Advances': 'Other Financial Assets',
  'Other Current Assets': 'Other Financial Assets',
  'Purchases and Cost of Goods Sold': 'Expenses',
  'Employee Benefits Expense': 'Employee Benefits',
  'Finance Costs': 'Finance Cost',
  'Other Expenses': 'Expenses',
  'Statutory Dues and Taxes': 'Tax Liabilities',
  'Provisions and Contingencies': 'Other Current Liabilities',
};

export const DEFAULT_BOX_HEADERS: string[] = [
  'Purpose',
  'Source of Working',
  'Procedure',
  'Test of Details',
  'Conclusion',
];

export const LEGACY_BOX_HEADER_MAP: Record<string, string> = {
  'Accounting Policies and Relevant Disclosures': 'Purpose',
  'Substantive Analytical Procedures': 'Procedure',
  'Working Paper Reference': 'Source of Working',
  'Source': 'Source of Working',
  'Auditor Conclusion': 'Conclusion',
};
