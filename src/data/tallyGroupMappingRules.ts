/**
 * Tally Group Mapping Rules for 5-Level FS Classification
 * 
 * Balance Logic Convention (Tally):
 * - Negative (-ve) balance = Debit balance
 * - Positive (+ve) balance = Credit balance
 * 
 * For Assets: Normal balance is Debit (-ve)
 * For Liabilities: Normal balance is Credit (+ve)
 * 
 * Balance logic applies when an account has an "abnormal" balance
 * (opposite of its natural classification), requiring reclassification.
 */

export interface TallyGroupMappingRule {
  tallyGroup: string;                    // Match against ledger_primary_group
  faceGroup: string;                     // Level 1: Current Assets, Non-Current Assets, Equity, etc.
  noteGroup: string;                     // Level 2: Cash and cash equivalents, Trade receivables, etc.
  subNote: string | null;                // Level 3: Sub-classification
  hasBalanceLogic: boolean;              // Whether balance-based reclassification applies
  // When balance is abnormal (opposite of natural classification)
  reclassifyFaceGroup: string | null;    // Face group for reclassified items
  reclassifyNoteGroup: string | null;    // Note group for reclassified items
  reclassifySubNote: string | null;      // Sub note for reclassified items
  aile: 'Asset' | 'Income' | 'Liability' | 'Expense';
  naturalBalance: 'debit' | 'credit';    // Natural balance for this category
}

/**
 * 64 Rules from logics.xlsx with corrected balance logic
 */
export const TALLY_GROUP_MAPPING_RULES: TallyGroupMappingRule[] = [
  // ===== CURRENT ASSETS =====
  {
    tallyGroup: 'Bank Accounts',
    faceGroup: 'Current Assets',
    noteGroup: 'Cash and cash equivalents',
    subNote: 'Balances with banks in current accounts',
    hasBalanceLogic: true,
    reclassifyFaceGroup: 'Current Liabilities',
    reclassifyNoteGroup: 'Short term borrowings',
    reclassifySubNote: 'Secured Loans repayable on demand from banks',
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Bank OCC A/c',
    faceGroup: 'Current Liabilities',
    noteGroup: 'Short term borrowings',
    subNote: 'Secured Loans repayable on demand from banks',
    hasBalanceLogic: true,
    reclassifyFaceGroup: 'Current Assets',
    reclassifyNoteGroup: 'Cash and cash equivalents',
    reclassifySubNote: 'Balances with banks in current accounts',
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Bank OD A/c',
    faceGroup: 'Current Liabilities',
    noteGroup: 'Short term borrowings',
    subNote: 'Secured Loans repayable on demand from banks',
    hasBalanceLogic: true,
    reclassifyFaceGroup: 'Current Assets',
    reclassifyNoteGroup: 'Cash and cash equivalents',
    reclassifySubNote: 'Balances with banks in current accounts',
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Cash-in-Hand',
    faceGroup: 'Current Assets',
    noteGroup: 'Cash and cash equivalents',
    subNote: 'Cash on hand',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Deposits (Asset)',
    faceGroup: 'Current Assets',
    noteGroup: 'Other current assets',
    subNote: 'Security deposits',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Loans & Advances (Asset)',
    faceGroup: 'Current Assets',
    noteGroup: 'Short term loans and advances',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Stock-in-Hand',
    faceGroup: 'Current Assets',
    noteGroup: 'Inventories',
    subNote: 'Raw materials',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Sundry Debtors',
    faceGroup: 'Current Assets',
    noteGroup: 'Trade receivables',
    subNote: 'Unsecured, considered good',
    hasBalanceLogic: true,
    reclassifyFaceGroup: 'Current Liabilities',
    reclassifyNoteGroup: 'Other current liabilities',
    reclassifySubNote: 'Advance from customers',
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Sundry Creditors',
    faceGroup: 'Current Liabilities',
    noteGroup: 'Trade payables',
    subNote: 'Total outstanding dues of creditors other than micro and small enterprises',
    hasBalanceLogic: true,
    reclassifyFaceGroup: 'Current Assets',
    reclassifyNoteGroup: 'Other current assets',
    reclassifySubNote: 'Advance to suppliers',
    aile: 'Liability',
    naturalBalance: 'credit',
  },

  // ===== NON-CURRENT ASSETS - FIXED ASSETS =====
  {
    tallyGroup: 'Fixed Assets',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Computers',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: 'Computers and IT equipment',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Furniture & Fixtures',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: 'Furniture and fixtures',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Plant & Machinery',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: 'Plant and machinery',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Building',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: 'Buildings',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Land',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: 'Freehold land',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Vehicles',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: 'Vehicles',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Office Equipment',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Property, Plant and Equipment',
    subNote: 'Office equipment',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Intangible Assets',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Intangible assets',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Goodwill',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Intangible assets',
    subNote: 'Goodwill',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Patents & Trademarks',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Intangible assets',
    subNote: 'Patents and trademarks',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },

  // ===== NON-CURRENT ASSETS - INVESTMENTS =====
  {
    tallyGroup: 'Investments',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Non-current investments',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Investment in Shares',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Non-current investments',
    subNote: 'Investment in equity instruments',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Investment in Debentures',
    faceGroup: 'Non-Current Assets',
    noteGroup: 'Non-current investments',
    subNote: 'Investment in debentures or bonds',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Investment in Mutual Funds',
    faceGroup: 'Current Assets',
    noteGroup: 'Current investments',
    subNote: 'Investment in mutual funds',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Asset',
    naturalBalance: 'debit',
  },

  // ===== NON-CURRENT LIABILITIES =====
  {
    tallyGroup: 'Secured Loans',
    faceGroup: 'Non-Current Liabilities',
    noteGroup: 'Long-term borrowings',
    subNote: 'Term loans from banks',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Unsecured Loans',
    faceGroup: 'Non-Current Liabilities',
    noteGroup: 'Long-term borrowings',
    subNote: 'Unsecured loans',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Loans (Liability)',
    faceGroup: 'Non-Current Liabilities',
    noteGroup: 'Long-term borrowings',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Long Term Provisions',
    faceGroup: 'Non-Current Liabilities',
    noteGroup: 'Long-term provisions',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Deferred Tax Liability',
    faceGroup: 'Non-Current Liabilities',
    noteGroup: 'Deferred tax liabilities (net)',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },

  // ===== CURRENT LIABILITIES =====
  {
    tallyGroup: 'Current Liabilities',
    faceGroup: 'Current Liabilities',
    noteGroup: 'Other current liabilities',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Duties & Taxes',
    faceGroup: 'Current Liabilities',
    noteGroup: 'Other current liabilities',
    subNote: 'Statutory dues payable',
    hasBalanceLogic: true,
    reclassifyFaceGroup: 'Current Assets',
    reclassifyNoteGroup: 'Other current assets',
    reclassifySubNote: 'Balances with government authorities',
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Provisions',
    faceGroup: 'Current Liabilities',
    noteGroup: 'Short-term provisions',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Short Term Provisions',
    faceGroup: 'Current Liabilities',
    noteGroup: 'Short-term provisions',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },

  // ===== EQUITY =====
  {
    tallyGroup: 'Capital Account',
    faceGroup: 'Equity',
    noteGroup: 'Share capital',
    subNote: 'Equity share capital',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Share Capital',
    faceGroup: 'Equity',
    noteGroup: 'Share capital',
    subNote: 'Equity share capital',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Reserves & Surplus',
    faceGroup: 'Equity',
    noteGroup: 'Reserves and surplus',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'General Reserve',
    faceGroup: 'Equity',
    noteGroup: 'Reserves and surplus',
    subNote: 'General reserve',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Profit & Loss A/c',
    faceGroup: 'Equity',
    noteGroup: 'Reserves and surplus',
    subNote: 'Surplus (Profit and Loss Account)',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Retained Earnings',
    faceGroup: 'Equity',
    noteGroup: 'Reserves and surplus',
    subNote: 'Retained earnings',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Partners Capital',
    faceGroup: 'Equity',
    noteGroup: 'Partners capital accounts',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Liability',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Partners Current A/c',
    faceGroup: 'Equity',
    noteGroup: 'Partners current accounts',
    subNote: null,
    hasBalanceLogic: true,
    reclassifyFaceGroup: 'Current Assets',
    reclassifyNoteGroup: 'Short term loans and advances',
    reclassifySubNote: 'Loans to partners',
    aile: 'Liability',
    naturalBalance: 'credit',
  },

  // ===== INCOME =====
  {
    tallyGroup: 'Sales Accounts',
    faceGroup: 'Income',
    noteGroup: 'Revenue from operations',
    subNote: 'Sale of products',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Revenue',
    faceGroup: 'Income',
    noteGroup: 'Revenue from operations',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Direct Incomes',
    faceGroup: 'Income',
    noteGroup: 'Revenue from operations',
    subNote: 'Sale of services',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Indirect Incomes',
    faceGroup: 'Income',
    noteGroup: 'Other income',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Interest Income',
    faceGroup: 'Income',
    noteGroup: 'Other income',
    subNote: 'Interest income',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Dividend Income',
    faceGroup: 'Income',
    noteGroup: 'Other income',
    subNote: 'Dividend income',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Rent Received',
    faceGroup: 'Income',
    noteGroup: 'Other income',
    subNote: 'Rental income',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },
  {
    tallyGroup: 'Commission Received',
    faceGroup: 'Income',
    noteGroup: 'Other income',
    subNote: 'Commission income',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Income',
    naturalBalance: 'credit',
  },

  // ===== EXPENSES - COST OF MATERIALS =====
  {
    tallyGroup: 'Purchase Accounts',
    faceGroup: 'Expenses',
    noteGroup: 'Cost of materials consumed',
    subNote: 'Purchases of stock-in-trade',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Direct Expenses',
    faceGroup: 'Expenses',
    noteGroup: 'Cost of materials consumed',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Manufacturing Expenses',
    faceGroup: 'Expenses',
    noteGroup: 'Cost of materials consumed',
    subNote: 'Manufacturing expenses',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },

  // ===== EXPENSES - EMPLOYEE BENEFITS =====
  {
    tallyGroup: 'Indirect Expenses',
    faceGroup: 'Expenses',
    noteGroup: 'Other expenses',
    subNote: null,
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Salaries & Wages',
    faceGroup: 'Expenses',
    noteGroup: 'Employee benefits expense',
    subNote: 'Salaries and wages',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Staff Welfare',
    faceGroup: 'Expenses',
    noteGroup: 'Employee benefits expense',
    subNote: 'Staff welfare expenses',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Bonus',
    faceGroup: 'Expenses',
    noteGroup: 'Employee benefits expense',
    subNote: 'Bonus',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Gratuity',
    faceGroup: 'Expenses',
    noteGroup: 'Employee benefits expense',
    subNote: 'Contribution to gratuity',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'PF Contribution',
    faceGroup: 'Expenses',
    noteGroup: 'Employee benefits expense',
    subNote: 'Contribution to provident fund',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'ESI Contribution',
    faceGroup: 'Expenses',
    noteGroup: 'Employee benefits expense',
    subNote: 'Contribution to ESI',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },

  // ===== EXPENSES - OTHER EXPENSES =====
  {
    tallyGroup: 'Administrative Expenses',
    faceGroup: 'Expenses',
    noteGroup: 'Other expenses',
    subNote: 'Administrative expenses',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Rent Paid',
    faceGroup: 'Expenses',
    noteGroup: 'Other expenses',
    subNote: 'Rent',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Interest Paid',
    faceGroup: 'Expenses',
    noteGroup: 'Finance costs',
    subNote: 'Interest expense',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Bank Charges',
    faceGroup: 'Expenses',
    noteGroup: 'Finance costs',
    subNote: 'Bank charges',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Depreciation',
    faceGroup: 'Expenses',
    noteGroup: 'Depreciation and amortisation expense',
    subNote: 'Depreciation on tangible assets',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Amortisation',
    faceGroup: 'Expenses',
    noteGroup: 'Depreciation and amortisation expense',
    subNote: 'Amortisation of intangible assets',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
  {
    tallyGroup: 'Income Tax',
    faceGroup: 'Expenses',
    noteGroup: 'Tax expense',
    subNote: 'Current tax',
    hasBalanceLogic: false,
    reclassifyFaceGroup: null,
    reclassifyNoteGroup: null,
    reclassifySubNote: null,
    aile: 'Expense',
    naturalBalance: 'debit',
  },
];

/**
 * Derive AILE from Face Group
 */
export function deriveAileFromFaceGroup(faceGroup: string): 'Asset' | 'Income' | 'Liability' | 'Expense' | null {
  if (['Current Assets', 'Non-Current Assets'].includes(faceGroup)) return 'Asset';
  if (['Current Liabilities', 'Non-Current Liabilities', 'Equity'].includes(faceGroup)) return 'Liability';
  if (faceGroup === 'Income') return 'Income';
  if (faceGroup === 'Expenses') return 'Expense';
  return null;
}

/**
 * Check if balance is abnormal based on natural balance
 * Tally convention: -ve = Debit, +ve = Credit
 */
export function isAbnormalBalance(closingBalance: number, naturalBalance: 'debit' | 'credit'): boolean {
  if (naturalBalance === 'debit') {
    // Natural debit should be negative, positive is abnormal
    return closingBalance > 0;
  } else {
    // Natural credit should be positive, negative is abnormal
    return closingBalance < 0;
  }
}

/**
 * Find matching rule for a ledger primary group
 */
export function findMatchingRule(ledgerPrimaryGroup: string | null): TallyGroupMappingRule | null {
  if (!ledgerPrimaryGroup) return null;
  
  const lowerGroup = ledgerPrimaryGroup.toLowerCase();
  
  // Try exact match first
  let rule = TALLY_GROUP_MAPPING_RULES.find(
    r => r.tallyGroup.toLowerCase() === lowerGroup
  );
  
  if (rule) return rule;
  
  // Try contains match
  rule = TALLY_GROUP_MAPPING_RULES.find(
    r => lowerGroup.includes(r.tallyGroup.toLowerCase()) || 
         r.tallyGroup.toLowerCase().includes(lowerGroup)
  );
  
  return rule || null;
}

/**
 * Apply classification rules to a trial balance line
 * Returns the 5-level classification
 */
export interface ClassificationResult {
  faceGroup: string | null;
  noteGroup: string | null;
  subNote: string | null;
  aile: string | null;
  reclassified: boolean;
  reclassificationReason: string | null;
}

export function classifyLine(
  ledgerPrimaryGroup: string | null,
  closingBalance: number
): ClassificationResult {
  const rule = findMatchingRule(ledgerPrimaryGroup);
  
  if (!rule) {
    return {
      faceGroup: null,
      noteGroup: null,
      subNote: null,
      aile: null,
      reclassified: false,
      reclassificationReason: null,
    };
  }
  
  // Check if balance logic applies
  if (rule.hasBalanceLogic && isAbnormalBalance(closingBalance, rule.naturalBalance)) {
    // Reclassify based on abnormal balance
    const reclassifiedAile = deriveAileFromFaceGroup(rule.reclassifyFaceGroup || '');
    return {
      faceGroup: rule.reclassifyFaceGroup,
      noteGroup: rule.reclassifyNoteGroup,
      subNote: rule.reclassifySubNote,
      aile: reclassifiedAile,
      reclassified: true,
      reclassificationReason: `Abnormal ${rule.naturalBalance === 'debit' ? 'credit' : 'debit'} balance reclassified from ${rule.faceGroup} to ${rule.reclassifyFaceGroup}`,
    };
  }
  
  // Normal classification
  return {
    faceGroup: rule.faceGroup,
    noteGroup: rule.noteGroup,
    subNote: rule.subNote,
    aile: rule.aile,
    reclassified: false,
    reclassificationReason: null,
  };
}

/**
 * Get unique face groups for dropdown
 * @deprecated Use getAllFaceGroups from scheduleIIIHierarchy.ts instead
 */
export function getUniqueFaceGroups(): string[] {
  const groups = new Set(TALLY_GROUP_MAPPING_RULES.map(r => r.faceGroup));
  return Array.from(groups).sort();
}

/**
 * Get note groups for a given face group
 * @deprecated Use getNoteGroupsForFaceGroup from scheduleIIIHierarchy.ts instead
 */
export function getNoteGroupsForFaceGroup(faceGroup: string): string[] {
  const groups = new Set(
    TALLY_GROUP_MAPPING_RULES
      .filter(r => r.faceGroup === faceGroup)
      .map(r => r.noteGroup)
  );
  return Array.from(groups).sort();
}

/**
 * Get sub notes for a given note group
 * @deprecated Use getSubNotesForNoteGroup from scheduleIIIHierarchy.ts instead
 */
export function getSubNotesForNoteGroup(noteGroup: string): string[] {
  const subNotes = new Set(
    TALLY_GROUP_MAPPING_RULES
      .filter(r => r.noteGroup === noteGroup && r.subNote)
      .map(r => r.subNote!)
  );
  return Array.from(subNotes).sort();
}
