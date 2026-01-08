export type BoxStatus = 'not-commenced' | 'in-progress' | 'review' | 'complete';

export interface WorkingSectionBox {
  id: string;
  section_id: string;
  header: string;
  content: string;
  order: number;
  status: BoxStatus;
  locked: boolean;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface AuditProgramSection {
  id: string;
  audit_program_id: string;
  name: string;
  order: number;
  is_expanded: boolean;
  status: BoxStatus;
  locked: boolean;
  is_applicable: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuditProgramNew {
  id: string;
  engagement_id: string;
  name: string;
  description?: string;
  workpaper_reference?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'approved';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  prepared_by?: string;
  prepared_at?: Date;
  reviewed_by?: string;
  reviewed_at?: Date;
  approved_by?: string;
  approved_at?: Date;
}

export interface AuditProgramAttachment {
  id: string;
  audit_program_id: string;
  section_id?: string;
  box_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by: string;
  uploaded_at: Date;
  description?: string;
  is_evidence: boolean;
}

export interface Comment {
  id: string;
  box_id: string;
  user_id: string;
  user_name: string;
  content: string;
  resolved: boolean;
  created_at: Date;
  updated_at: Date;
}

export const DEFAULT_SECTION_NAMES = [
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

export const DEFAULT_BOX_HEADERS = [
  'Background',
  'Procedures Planned',
  'Procedures Done',
  'Observations',
  'Conclusions',
];
