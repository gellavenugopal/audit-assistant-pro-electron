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
  'Planning and Overview',
  'Share Capital',
  'Reserves and Surplus',
  'Borrowings',
  'Property, Plant and Equipment',
  'Capital Work in Progress',
  'Intangible Assets',
  'Investments',
  'Inventories',
  'Trade Receivables',
  'Loans and Advances',
  'Cash and Bank',
  'Other Current Assets',
  'Revenue from Operations',
  'Other Income',
  'Purchases and Cost of Goods Sold',
  'Employee Benefits Expense',
  'Finance Costs',
  'Other Expenses',
  'Trade Payables',
  'Provisions and Contingencies',
  'Statutory Dues and Taxes',
  'Related Party Transactions',
  'Contingent Liabilities and Commitments',
];

export const DEFAULT_BOX_HEADERS: string[] = [
  'Accounting Policies and Relevant Disclosures',
  'Substantive Analytical Procedures',
  'Test of Details',
  'Working Paper Reference',
  'Auditor Conclusion',
];
