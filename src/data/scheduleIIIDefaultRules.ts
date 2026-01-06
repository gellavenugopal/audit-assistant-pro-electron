// Default rules for Schedule III Rule Engine
// Based on Excel workbook: Schedule_III_Rule_Engine_v2.xlsx

// ==========================================
// GROUP MAPPING RULES (Priority 3)
// ==========================================

export interface GroupRule {
  ruleId: string;
  tallyGroupName: string;
  tallyParentGroup: string | null;
  mapsToCode: string;
  mapsToDescription: string;
  notes: string | null;
}

export const DEFAULT_GROUP_RULES: GroupRule[] = [
  // === EQUITY & LIABILITIES ===
  // Share Capital
  { ruleId: 'GM001', tallyGroupName: 'Capital Account', tallyParentGroup: 'Primary', mapsToCode: 'EL-SHF-SC-EQ', mapsToDescription: 'Equity Share Capital', notes: 'For proprietorship/partnership, use Partners Capital' },
  { ruleId: 'GM002', tallyGroupName: 'Share Capital', tallyParentGroup: 'Capital Account', mapsToCode: 'EL-SHF-SC-EQ', mapsToDescription: 'Equity Share Capital', notes: null },
  
  // Reserves
  { ruleId: 'GM003', tallyGroupName: 'Reserves & Surplus', tallyParentGroup: 'Capital Account', mapsToCode: 'EL-SHF-RS-PL', mapsToDescription: 'Surplus (Profit & Loss Account)', notes: 'Default to P&L unless specific reserve' },
  { ruleId: 'GM004', tallyGroupName: 'Retained Earnings', tallyParentGroup: 'Reserves & Surplus', mapsToCode: 'EL-SHF-RS-PL', mapsToDescription: 'Surplus (Profit & Loss Account)', notes: null },
  
  // Non-Current Liabilities
  { ruleId: 'GM005', tallyGroupName: 'Secured Loans', tallyParentGroup: 'Loans (Liability)', mapsToCode: 'EL-NCL-LTB-TL', mapsToDescription: 'Term Loans from Banks', notes: 'Verify current/non-current split' },
  { ruleId: 'GM006', tallyGroupName: 'Unsecured Loans', tallyParentGroup: 'Loans (Liability)', mapsToCode: 'EL-NCL-LTB-OT', mapsToDescription: 'Other Long-term Borrowings', notes: 'Verify current/non-current split' },
  { ruleId: 'GM007', tallyGroupName: 'Bank OD A/c', tallyParentGroup: 'Loans (Liability)', mapsToCode: 'EL-CL-STB-CC', mapsToDescription: 'Cash Credit/Overdraft from Banks', notes: 'Current liability by nature' },
  { ruleId: 'GM008', tallyGroupName: 'Bank OCC A/c', tallyParentGroup: 'Loans (Liability)', mapsToCode: 'EL-CL-STB-CC', mapsToDescription: 'Cash Credit/Overdraft from Banks', notes: 'Current liability by nature' },
  
  // Current Liabilities
  { ruleId: 'GM009', tallyGroupName: 'Sundry Creditors', tallyParentGroup: 'Current Liabilities', mapsToCode: 'EL-CL-TP-OTH', mapsToDescription: 'Trade Payables - Due to Others', notes: 'Check for MSME creditors' },
  { ruleId: 'GM010', tallyGroupName: 'Duties & Taxes', tallyParentGroup: 'Current Liabilities', mapsToCode: 'EL-CL-OCL-SD', mapsToDescription: 'Statutory Dues Payable', notes: null },
  { ruleId: 'GM011', tallyGroupName: 'Provisions', tallyParentGroup: 'Current Liabilities', mapsToCode: 'EL-CL-STP-OT', mapsToDescription: 'Other Provisions', notes: 'Verify short-term vs long-term' },
  
  // === ASSETS ===
  // Fixed Assets
  { ruleId: 'GM012', tallyGroupName: 'Fixed Assets', tallyParentGroup: 'Primary', mapsToCode: 'AS-NCA-PPE', mapsToDescription: 'Property, Plant and Equipment', notes: 'Map to specific asset types' },
  { ruleId: 'GM013', tallyGroupName: 'Land', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-LA', mapsToDescription: 'Land', notes: null },
  { ruleId: 'GM014', tallyGroupName: 'Buildings', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-BU', mapsToDescription: 'Buildings', notes: null },
  { ruleId: 'GM015', tallyGroupName: 'Plant & Machinery', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-PM', mapsToDescription: 'Plant and Machinery', notes: null },
  { ruleId: 'GM016', tallyGroupName: 'Furniture & Fixtures', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-FU', mapsToDescription: 'Furniture and Fixtures', notes: null },
  { ruleId: 'GM017', tallyGroupName: 'Vehicles', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-VE', mapsToDescription: 'Vehicles', notes: null },
  { ruleId: 'GM018', tallyGroupName: 'Office Equipment', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-OF', mapsToDescription: 'Office Equipment', notes: null },
  { ruleId: 'GM019', tallyGroupName: 'Computer Equipment', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-CO', mapsToDescription: 'Computers', notes: null },
  { ruleId: 'GM020', tallyGroupName: 'Computers', tallyParentGroup: 'Fixed Assets', mapsToCode: 'AS-NCA-PPE-CO', mapsToDescription: 'Computers', notes: null },
  
  // Investments
  { ruleId: 'GM021', tallyGroupName: 'Investments', tallyParentGroup: 'Primary', mapsToCode: 'AS-NCA-NCI', mapsToDescription: 'Non-Current Investments', notes: 'Verify current vs non-current' },
  
  // Current Assets
  { ruleId: 'GM022', tallyGroupName: 'Stock-in-Hand', tallyParentGroup: 'Current Assets', mapsToCode: 'AS-CA-INV', mapsToDescription: 'Inventories', notes: null },
  { ruleId: 'GM023', tallyGroupName: 'Raw Materials', tallyParentGroup: 'Stock-in-Hand', mapsToCode: 'AS-CA-INV-RM', mapsToDescription: 'Raw Materials', notes: null },
  { ruleId: 'GM024', tallyGroupName: 'Work-in-Progress', tallyParentGroup: 'Stock-in-Hand', mapsToCode: 'AS-CA-INV-WIP', mapsToDescription: 'Work-in-Progress', notes: null },
  { ruleId: 'GM025', tallyGroupName: 'Finished Goods', tallyParentGroup: 'Stock-in-Hand', mapsToCode: 'AS-CA-INV-FG', mapsToDescription: 'Finished Goods', notes: null },
  { ruleId: 'GM026', tallyGroupName: 'Stores & Spares', tallyParentGroup: 'Stock-in-Hand', mapsToCode: 'AS-CA-INV-SP', mapsToDescription: 'Stores and Spares', notes: null },
  
  // Trade Receivables
  { ruleId: 'GM027', tallyGroupName: 'Sundry Debtors', tallyParentGroup: 'Current Assets', mapsToCode: 'AS-CA-TR-USEC', mapsToDescription: 'Trade Receivables - Unsecured', notes: null },
  
  // Cash & Bank
  { ruleId: 'GM028', tallyGroupName: 'Cash-in-Hand', tallyParentGroup: 'Current Assets', mapsToCode: 'AS-CA-CCE-COH', mapsToDescription: 'Cash on Hand', notes: null },
  { ruleId: 'GM029', tallyGroupName: 'Bank Accounts', tallyParentGroup: 'Current Assets', mapsToCode: 'AS-CA-CCE-BB', mapsToDescription: 'Balances with Banks', notes: null },
  { ruleId: 'GM030', tallyGroupName: 'Bank OD A/c', tallyParentGroup: 'Current Assets', mapsToCode: 'AS-CA-CCE-BB', mapsToDescription: 'Balances with Banks', notes: 'Net off with OD if same bank' },
  
  // Loans & Advances
  { ruleId: 'GM031', tallyGroupName: 'Loans & Advances (Asset)', tallyParentGroup: 'Current Assets', mapsToCode: 'AS-CA-STLA', mapsToDescription: 'Short-term Loans and Advances', notes: 'Verify current vs non-current' },
  { ruleId: 'GM032', tallyGroupName: 'Deposits (Asset)', tallyParentGroup: 'Current Assets', mapsToCode: 'AS-NCA-LTLA-SD', mapsToDescription: 'Security Deposits', notes: 'Usually non-current' },
  
  // === INCOME ===
  { ruleId: 'GM033', tallyGroupName: 'Sales Accounts', tallyParentGroup: 'Primary', mapsToCode: 'INC-RFO-SG', mapsToDescription: 'Sale of Goods', notes: null },
  { ruleId: 'GM034', tallyGroupName: 'Direct Incomes', tallyParentGroup: 'Primary', mapsToCode: 'INC-RFO-OOR', mapsToDescription: 'Other Operating Revenue', notes: null },
  { ruleId: 'GM035', tallyGroupName: 'Indirect Incomes', tallyParentGroup: 'Primary', mapsToCode: 'INC-OI-OT', mapsToDescription: 'Other Non-Operating Income', notes: null },
  
  // === EXPENSES ===
  { ruleId: 'GM036', tallyGroupName: 'Purchase Accounts', tallyParentGroup: 'Primary', mapsToCode: 'EXP-CMC-RM', mapsToDescription: 'Raw Materials Consumed', notes: 'For manufacturing companies' },
  { ruleId: 'GM037', tallyGroupName: 'Direct Expenses', tallyParentGroup: 'Primary', mapsToCode: 'EXP-OE-MFG', mapsToDescription: 'Manufacturing Expenses', notes: null },
  { ruleId: 'GM038', tallyGroupName: 'Indirect Expenses', tallyParentGroup: 'Primary', mapsToCode: 'EXP-OE-MISC', mapsToDescription: 'Miscellaneous Expenses', notes: 'Map to specific expense types' },
  
  // Specific Expenses
  { ruleId: 'GM039', tallyGroupName: 'Salary', tallyParentGroup: 'Indirect Expenses', mapsToCode: 'EXP-EBE-SAL', mapsToDescription: 'Salaries and Wages', notes: null },
  { ruleId: 'GM040', tallyGroupName: 'Rent', tallyParentGroup: 'Indirect Expenses', mapsToCode: 'EXP-OE-RENT', mapsToDescription: 'Rent', notes: null },
  { ruleId: 'GM041', tallyGroupName: 'Depreciation', tallyParentGroup: 'Indirect Expenses', mapsToCode: 'EXP-DA-DEP', mapsToDescription: 'Depreciation on PPE', notes: null },
  { ruleId: 'GM042', tallyGroupName: 'Interest Paid', tallyParentGroup: 'Indirect Expenses', mapsToCode: 'EXP-FC-INT', mapsToDescription: 'Interest Expense', notes: null },
];

// ==========================================
// KEYWORD RULES (Priority 2)
// ==========================================

export interface KeywordRule {
  ruleId: string;
  keywordPattern: string;
  matchType: 'Contains' | 'Starts With' | 'Ends With';
  mapsToCode: string;
  mapsToDescription: string;
  priority: number;
}

export const DEFAULT_KEYWORD_RULES: KeywordRule[] = [
  // === HIGH PRIORITY KEYWORDS (80-100) ===
  
  // MSME Detection
  { ruleId: 'KW001', keywordPattern: 'MSME', matchType: 'Contains', mapsToCode: 'EL-CL-TP-MSME', mapsToDescription: 'Trade Payables - Due to MSME', priority: 95 },
  { ruleId: 'KW002', keywordPattern: 'Micro', matchType: 'Contains', mapsToCode: 'EL-CL-TP-MSME', mapsToDescription: 'Trade Payables - Due to MSME', priority: 90 },
  { ruleId: 'KW003', keywordPattern: 'Small Enterprise', matchType: 'Contains', mapsToCode: 'EL-CL-TP-MSME', mapsToDescription: 'Trade Payables - Due to MSME', priority: 90 },
  
  // Related Party Detection
  { ruleId: 'KW004', keywordPattern: 'Director', matchType: 'Contains', mapsToCode: 'EL-NCL-LTB-LO', mapsToDescription: 'Loans from Related Parties', priority: 85 },
  { ruleId: 'KW005', keywordPattern: 'Promoter', matchType: 'Contains', mapsToCode: 'EL-NCL-LTB-LO', mapsToDescription: 'Loans from Related Parties', priority: 85 },
  { ruleId: 'KW006', keywordPattern: 'Subsidiary', matchType: 'Contains', mapsToCode: 'AS-NCA-NCI-EQ', mapsToDescription: 'Investment in Equity Instruments', priority: 85 },
  { ruleId: 'KW007', keywordPattern: 'Associate', matchType: 'Contains', mapsToCode: 'AS-NCA-NCI-EQ', mapsToDescription: 'Investment in Equity Instruments', priority: 85 },
  { ruleId: 'KW008', keywordPattern: 'Holding Company', matchType: 'Contains', mapsToCode: 'EL-NCL-LTB-LO', mapsToDescription: 'Loans from Related Parties', priority: 85 },
  
  // === MEDIUM PRIORITY KEYWORDS (50-79) ===
  
  // Reserves
  { ruleId: 'KW009', keywordPattern: 'Securities Premium', matchType: 'Contains', mapsToCode: 'EL-SHF-RS-SPR', mapsToDescription: 'Securities Premium Reserve', priority: 75 },
  { ruleId: 'KW010', keywordPattern: 'Capital Reserve', matchType: 'Contains', mapsToCode: 'EL-SHF-RS-CR', mapsToDescription: 'Capital Reserves', priority: 75 },
  { ruleId: 'KW011', keywordPattern: 'General Reserve', matchType: 'Contains', mapsToCode: 'EL-SHF-RS-GR', mapsToDescription: 'General Reserve', priority: 75 },
  { ruleId: 'KW012', keywordPattern: 'Revaluation Reserve', matchType: 'Contains', mapsToCode: 'EL-SHF-RS-RVR', mapsToDescription: 'Revaluation Reserve', priority: 75 },
  { ruleId: 'KW013', keywordPattern: 'Profit & Loss', matchType: 'Contains', mapsToCode: 'EL-SHF-RS-PL', mapsToDescription: 'Surplus (Profit & Loss Account)', priority: 70 },
  { ruleId: 'KW014', keywordPattern: 'P&L', matchType: 'Contains', mapsToCode: 'EL-SHF-RS-PL', mapsToDescription: 'Surplus (Profit & Loss Account)', priority: 70 },
  
  // Statutory Dues
  { ruleId: 'KW015', keywordPattern: 'GST', matchType: 'Contains', mapsToCode: 'EL-CL-OCL-SD', mapsToDescription: 'Statutory Dues Payable', priority: 70 },
  { ruleId: 'KW016', keywordPattern: 'TDS', matchType: 'Contains', mapsToCode: 'EL-CL-OCL-SD', mapsToDescription: 'Statutory Dues Payable', priority: 70 },
  { ruleId: 'KW017', keywordPattern: 'TCS', matchType: 'Contains', mapsToCode: 'EL-CL-OCL-SD', mapsToDescription: 'Statutory Dues Payable', priority: 70 },
  { ruleId: 'KW018', keywordPattern: 'PF Payable', matchType: 'Contains', mapsToCode: 'EL-CL-OCL-SD', mapsToDescription: 'Statutory Dues Payable', priority: 70 },
  { ruleId: 'KW019', keywordPattern: 'ESI Payable', matchType: 'Contains', mapsToCode: 'EL-CL-OCL-SD', mapsToDescription: 'Statutory Dues Payable', priority: 70 },
  { ruleId: 'KW020', keywordPattern: 'PT Payable', matchType: 'Contains', mapsToCode: 'EL-CL-OCL-SD', mapsToDescription: 'Statutory Dues Payable', priority: 70 },
  
  // Provisions
  { ruleId: 'KW021', keywordPattern: 'Provision for Gratuity', matchType: 'Contains', mapsToCode: 'EL-NCL-LTP-EB', mapsToDescription: 'Provision for Employee Benefits', priority: 70 },
  { ruleId: 'KW022', keywordPattern: 'Provision for Leave', matchType: 'Contains', mapsToCode: 'EL-CL-STP-EB', mapsToDescription: 'Provision for Employee Benefits', priority: 70 },
  { ruleId: 'KW023', keywordPattern: 'Provision for Tax', matchType: 'Contains', mapsToCode: 'EL-CL-STP-TAX', mapsToDescription: 'Provision for Tax', priority: 70 },
  { ruleId: 'KW024', keywordPattern: 'Provision for Bad Debts', matchType: 'Contains', mapsToCode: 'AS-CA-TR-PROV', mapsToDescription: 'Less: Provision for Doubtful Debts', priority: 70 },
  
  // Bank Accounts
  { ruleId: 'KW025', keywordPattern: 'Fixed Deposit', matchType: 'Contains', mapsToCode: 'AS-CA-CCE-FD', mapsToDescription: 'Fixed Deposits (Short-term)', priority: 65 },
  { ruleId: 'KW026', keywordPattern: 'FD', matchType: 'Starts With', mapsToCode: 'AS-CA-CCE-FD', mapsToDescription: 'Fixed Deposits (Short-term)', priority: 60 },
  { ruleId: 'KW027', keywordPattern: 'Current Account', matchType: 'Contains', mapsToCode: 'AS-CA-CCE-BB', mapsToDescription: 'Balances with Banks', priority: 60 },
  { ruleId: 'KW028', keywordPattern: 'Savings Account', matchType: 'Contains', mapsToCode: 'AS-CA-CCE-BB', mapsToDescription: 'Balances with Banks', priority: 60 },
  
  // Employee Related
  { ruleId: 'KW029', keywordPattern: 'Salary', matchType: 'Contains', mapsToCode: 'EXP-EBE-SAL', mapsToDescription: 'Salaries and Wages', priority: 65 },
  { ruleId: 'KW030', keywordPattern: 'Wages', matchType: 'Contains', mapsToCode: 'EXP-EBE-SAL', mapsToDescription: 'Salaries and Wages', priority: 65 },
  { ruleId: 'KW031', keywordPattern: 'Bonus', matchType: 'Contains', mapsToCode: 'EXP-EBE-BON', mapsToDescription: 'Bonus', priority: 65 },
  { ruleId: 'KW032', keywordPattern: 'Staff Welfare', matchType: 'Contains', mapsToCode: 'EXP-EBE-WEL', mapsToDescription: 'Staff Welfare Expenses', priority: 65 },
  
  // === LOWER PRIORITY KEYWORDS (20-49) ===
  
  // Expenses
  { ruleId: 'KW033', keywordPattern: 'Audit Fee', matchType: 'Contains', mapsToCode: 'EXP-OE-AUD', mapsToDescription: 'Audit Fees', priority: 60 },
  { ruleId: 'KW034', keywordPattern: 'Legal Fee', matchType: 'Contains', mapsToCode: 'EXP-OE-LEG', mapsToDescription: 'Legal and Professional Fees', priority: 60 },
  { ruleId: 'KW035', keywordPattern: 'Professional Fee', matchType: 'Contains', mapsToCode: 'EXP-OE-LEG', mapsToDescription: 'Legal and Professional Fees', priority: 60 },
  { ruleId: 'KW036', keywordPattern: 'Consulting', matchType: 'Contains', mapsToCode: 'EXP-OE-LEG', mapsToDescription: 'Legal and Professional Fees', priority: 55 },
  { ruleId: 'KW037', keywordPattern: 'Travelling', matchType: 'Contains', mapsToCode: 'EXP-OE-TRV', mapsToDescription: 'Travelling and Conveyance', priority: 55 },
  { ruleId: 'KW038', keywordPattern: 'Conveyance', matchType: 'Contains', mapsToCode: 'EXP-OE-TRV', mapsToDescription: 'Travelling and Conveyance', priority: 55 },
  { ruleId: 'KW039', keywordPattern: 'Telephone', matchType: 'Contains', mapsToCode: 'EXP-OE-TEL', mapsToDescription: 'Telephone and Communication', priority: 55 },
  { ruleId: 'KW040', keywordPattern: 'Insurance', matchType: 'Contains', mapsToCode: 'EXP-OE-INS', mapsToDescription: 'Insurance', priority: 55 },
  { ruleId: 'KW041', keywordPattern: 'Bank Charges', matchType: 'Contains', mapsToCode: 'EXP-FC-BC', mapsToDescription: 'Bank Charges', priority: 55 },
];

// ==========================================
// OVERRIDE RULES (Priority 1) - Sample
// ==========================================

export interface OverrideRule {
  ruleId: string;
  exactLedgerName: string;
  currentTallyGroup: string | null;
  overrideToCode: string;
  overrideToDescription: string;
  reasonForOverride: string;
  effectiveDate: string | null;
}

export const DEFAULT_OVERRIDE_RULES: OverrideRule[] = [
  // Sample override rules - typically company-specific
  { ruleId: 'OV001', exactLedgerName: 'Building - Leasehold', currentTallyGroup: 'Fixed Assets', overrideToCode: 'AS-NCA-PPE-BU', overrideToDescription: 'Buildings', reasonForOverride: 'Leasehold building to be disclosed under Buildings', effectiveDate: null },
  { ruleId: 'OV002', exactLedgerName: 'Goodwill (Acquired)', currentTallyGroup: 'Fixed Assets', overrideToCode: 'AS-NCA-IA-GW', overrideToDescription: 'Goodwill', reasonForOverride: 'Reclassify from Fixed Assets to Intangible Assets', effectiveDate: null },
];

// ==========================================
// VALIDATION RULES
// ==========================================

export interface ValidationRule {
  ruleId: string;
  validationType: string;
  conditionDescription: string;
  action: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  messageTemplate: string;
}

export const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  { ruleId: 'VL001', validationType: 'Unmapped Ledger', conditionDescription: 'Ledger not mapped to any Schedule III code', action: 'Flag for Review', severity: 'Critical', messageTemplate: 'Ledger "{ledger_name}" is not mapped to any Schedule III line item' },
  { ruleId: 'VL002', validationType: 'Balance Anomaly - Liability', conditionDescription: 'Debit balance in Liability account', action: 'Flag for Review', severity: 'High', messageTemplate: 'Liability account "{ledger_name}" has a debit balance of {amount}' },
  { ruleId: 'VL003', validationType: 'Balance Anomaly - Asset', conditionDescription: 'Credit balance in Asset account', action: 'Flag for Review', severity: 'High', messageTemplate: 'Asset account "{ledger_name}" has a credit balance of {amount}' },
  { ruleId: 'VL004', validationType: 'Zero Balance', conditionDescription: 'Ledger with zero closing balance', action: 'Flag for Review', severity: 'Low', messageTemplate: 'Ledger "{ledger_name}" has zero balance - confirm if correct' },
  { ruleId: 'VL005', validationType: 'Current/Non-Current', conditionDescription: 'Needs maturity classification', action: 'Request Info', severity: 'Medium', messageTemplate: 'Ledger "{ledger_name}" requires current/non-current classification' },
  { ruleId: 'VL006', validationType: 'Related Party', conditionDescription: 'Potential related party transaction', action: 'Request Info', severity: 'High', messageTemplate: 'Ledger "{ledger_name}" may involve related party - verify disclosure' },
  { ruleId: 'VL007', validationType: 'MSME Creditor', conditionDescription: 'Trade payable may be MSME', action: 'Request Info', severity: 'High', messageTemplate: 'Trade payable "{ledger_name}" - verify if MSME creditor' },
  { ruleId: 'VL008', validationType: 'Statutory Dues', conditionDescription: 'Verify statutory compliance', action: 'Request Info', severity: 'Medium', messageTemplate: 'Statutory due "{ledger_name}" - verify payment status' },
  { ruleId: 'VL009', validationType: 'Large Balance', conditionDescription: 'Unusually large balance', action: 'Flag for Review', severity: 'Medium', messageTemplate: 'Ledger "{ledger_name}" has unusually large balance of {amount}' },
  { ruleId: 'VL010', validationType: 'Negative Balance', conditionDescription: 'Unexpected negative balance', action: 'Flag for Review', severity: 'High', messageTemplate: 'Ledger "{ledger_name}" has unexpected negative balance' },
  { ruleId: 'VL011', validationType: 'Dormant Account', conditionDescription: 'No movement during period', action: 'Flag for Review', severity: 'Low', messageTemplate: 'Ledger "{ledger_name}" shows no movement - verify if dormant' },
];
