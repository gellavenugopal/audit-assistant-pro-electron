/**
 * Schedule III Financial Statement Hierarchy
 * 
 * Complete 5-level classification structure from Grouping.xlsx:
 * Level 1: Face Group (Balance Sheet section)
 * Level 2: Note Group (Schedule III Note)
 * Level 3: Sub Note (Detailed line item)
 * Level 4: Ledger Grouping (Optional grouping)
 * Level 5: Ledger Detail (Individual ledger)
 * 
 * AILE Classification:
 * - Asset: Non-Current Assets, Current Assets
 * - Income: Revenue, Other Income
 * - Liability: Non-Current Liabilities, Current Liabilities, Equity
 * - Expense: All expense categories
 */

export type AILEType = 'Asset' | 'Income' | 'Liability' | 'Expense';

export interface NoteGroupConfig {
  name: string;
  subNotes: string[];
}

export interface FaceGroupConfig {
  name: string;
  aile: AILEType;
  type: 'bs' | 'pl'; // Balance Sheet or Profit & Loss
  noteGroups: NoteGroupConfig[];
}

/**
 * Complete Schedule III Hierarchy from Grouping.xlsx
 */
export const SCHEDULE_III_HIERARCHY: FaceGroupConfig[] = [
  // ===== EQUITY (LIABILITY) =====
  {
    name: 'Equity',
    aile: 'Liability',
    type: 'bs',
    noteGroups: [
      {
        name: 'Share Capital',
        subNotes: [
          'Issued Equity Share Capital',
          'Preference Share Capital',
        ],
      },
      {
        name: 'Reserves and surplus',
        subNotes: [
          'Capital Reserves',
          'Capital Reserve on Consolidation',
          'Capital Redemption Reserve',
          'Securities Premium',
          'Debenture Redemption Reserve',
          'General Reserve',
          'Revaluation Reserve',
          'Share Options Outstanding Account',
          'MAT Credit Entitlement Reserve',
          'P&L Balance at the beginning of the year',
          'Transfer to General Reserve',
          'Dividend on Equity Shares',
          'Dividend on Preference Shares',
          'Tax on Dividend',
          'Other Appropriation',
          'Other Reserves',
          'Surplus (Profit and Loss Account)',
        ],
      },
      {
        name: 'Money received against share warrants',
        subNotes: ['Money received against share warrants'],
      },
    ],
  },

  // ===== NON-CURRENT LIABILITIES =====
  {
    name: 'Non-Current Liabilities',
    aile: 'Liability',
    type: 'bs',
    noteGroups: [
      {
        name: 'Long-term borrowings',
        subNotes: [
          // Secured
          'Secured - Debentures',
          'Secured - Term Loan from Bank',
          'Secured - Term Loan from NBFC',
          'Secured - Term Loan from Others',
          'Secured - Loans from related parties',
          'Secured - Deposits',
          'Secured - Other Loans and Advances',
          // Unsecured
          'Unsecured - Debentures',
          'Unsecured - Term Loan from Bank',
          'Unsecured - Term Loan from NBFC',
          'Unsecured - Term Loan from Others',
          'Unsecured - Loans from related parties',
          'Unsecured - Deposits',
          'Unsecured - Loans from Directors',
          'Unsecured - Other Loans and Advances',
        ],
      },
      {
        name: 'Deferred tax liabilities (net)',
        subNotes: ['Deferred tax liabilities (net)'],
      },
      {
        name: 'Other long-term liabilities',
        subNotes: [
          'Trade payables - long term',
          'Security deposits received',
          'Retention money',
          'Other long-term liabilities',
        ],
      },
      {
        name: 'Long-term provisions',
        subNotes: [
          'Provision for employee benefits - Gratuity',
          'Provision for employee benefits - Leave encashment',
          'Other long-term provisions',
        ],
      },
    ],
  },

  // ===== CURRENT LIABILITIES =====
  {
    name: 'Current Liabilities',
    aile: 'Liability',
    type: 'bs',
    noteGroups: [
      {
        name: 'Short-term borrowings',
        subNotes: [
          // Secured
          'Secured - Loans repayable on demand from Banks',
          'Secured - Loans repayable on demand from Others',
          'Secured - Other Loans and Advances',
          // Unsecured
          'Unsecured - Loans repayable on demand from Banks',
          'Unsecured - Loans repayable on demand from Others',
          'Unsecured - Loans from related parties',
          'Unsecured - Deposits',
          'Unsecured - Loans from Directors',
          'Unsecured - Other Loans and Advances',
        ],
      },
      {
        name: 'Trade payables',
        subNotes: [
          'Total outstanding dues of micro enterprises and small enterprises',
          'Total outstanding dues of creditors other than micro and small enterprises',
        ],
      },
      {
        name: 'Other current liabilities',
        subNotes: [
          'Current maturities of long-term debt',
          'Current maturities of finance lease obligations',
          'Interest accrued but not due on borrowings',
          'Interest accrued and due on borrowings',
          'Income received in advance',
          'Unpaid dividends',
          'Application money received for allotment and due for refund',
          'Unpaid matured deposits and interest accrued thereon',
          'Unpaid matured debentures and interest accrued thereon',
          'Advance from customers',
          'Statutory dues payable',
          'Payable on purchase of fixed assets',
          'Other payables',
        ],
      },
      {
        name: 'Short-term provisions',
        subNotes: [
          'Provision for employee benefits - Bonus',
          'Provision for employee benefits - Leave encashment',
          'Provision for employee benefits - Others',
          'Provision for tax (net of advance tax)',
          'Proposed dividend',
          'Provision for tax on proposed dividend',
          'Other short-term provisions',
        ],
      },
    ],
  },

  // ===== NON-CURRENT ASSETS =====
  {
    name: 'Non-Current Assets',
    aile: 'Asset',
    type: 'bs',
    noteGroups: [
      {
        name: 'Property, Plant and Equipment',
        subNotes: [
          'Freehold land',
          'Leasehold land',
          'Buildings',
          'Plant and machinery',
          'Furniture and fixtures',
          'Vehicles',
          'Office equipment',
          'Computers and IT equipment',
          'Electrical installations',
          'Laboratory equipment',
          'Other tangible assets',
        ],
      },
      {
        name: 'Capital work-in-progress',
        subNotes: ['Capital work-in-progress'],
      },
      {
        name: 'Investment property',
        subNotes: ['Investment property'],
      },
      {
        name: 'Intangible assets',
        subNotes: [
          'Goodwill',
          'Brands/Trademarks',
          'Computer software',
          'Mastheads and publishing titles',
          'Mining rights',
          'Copyrights, patents and other IP rights',
          'Recipes, formulae, models, designs and prototypes',
          'Licenses and franchise',
          'Other intangible assets',
        ],
      },
      {
        name: 'Intangible assets under development',
        subNotes: ['Intangible assets under development'],
      },
      {
        name: 'Biological Assets other than bearer plants',
        subNotes: ['Biological Assets other than bearer plants'],
      },
      {
        name: 'Non-current investments',
        subNotes: [
          // Trade - Quoted
          'Trade - Quoted - Investment in equity instruments',
          'Trade - Quoted - Investment in preference shares',
          'Trade - Quoted - Investment in government or trust securities',
          'Trade - Quoted - Investment in debentures or bonds',
          'Trade - Quoted - Investment in mutual funds',
          'Trade - Quoted - Investment in partnership firms',
          'Trade - Quoted - Other non-current investments',
          // Trade - Unquoted
          'Trade - Unquoted - Investment in equity instruments',
          'Trade - Unquoted - Investment in preference shares',
          'Trade - Unquoted - Investment in government or trust securities',
          'Trade - Unquoted - Investment in debentures or bonds',
          'Trade - Unquoted - Investment in mutual funds',
          'Trade - Unquoted - Investment in partnership firms',
          'Trade - Unquoted - Other non-current investments',
          // Non-Trade - Quoted
          'Non-Trade - Quoted - Investment in equity instruments',
          'Non-Trade - Quoted - Investment in preference shares',
          'Non-Trade - Quoted - Investment in government or trust securities',
          'Non-Trade - Quoted - Investment in debentures or bonds',
          'Non-Trade - Quoted - Investment in mutual funds',
          'Non-Trade - Quoted - Other non-current investments',
          // Non-Trade - Unquoted
          'Non-Trade - Unquoted - Investment in equity instruments',
          'Non-Trade - Unquoted - Investment in preference shares',
          'Non-Trade - Unquoted - Investment in government or trust securities',
          'Non-Trade - Unquoted - Investment in debentures or bonds',
          'Non-Trade - Unquoted - Investment in mutual funds',
          'Non-Trade - Unquoted - Investment in partnership firms',
          'Non-Trade - Unquoted - Other non-current investments',
        ],
      },
      {
        name: 'Deferred tax assets (net)',
        subNotes: ['Deferred tax assets (net)'],
      },
      {
        name: 'Long-term loans and advances',
        subNotes: [
          'Capital advances',
          'Security deposits',
          'Loans and advances to related parties',
          'Other loans and advances - Secured, considered good',
          'Other loans and advances - Unsecured, considered good',
          'Other loans and advances - Doubtful',
          'Less: Provision for doubtful loans and advances',
        ],
      },
      {
        name: 'Other non-current assets',
        subNotes: [
          'Long-term trade receivables - Secured, considered good',
          'Long-term trade receivables - Unsecured, considered good',
          'Long-term trade receivables - Doubtful',
          'Less: Provision for doubtful receivables',
          'Balances with banks - Deposits with maturity > 12 months',
          'Other non-current assets',
        ],
      },
    ],
  },

  // ===== CURRENT ASSETS =====
  {
    name: 'Current Assets',
    aile: 'Asset',
    type: 'bs',
    noteGroups: [
      {
        name: 'Current investments',
        subNotes: [
          // Trade - Quoted
          'Trade - Quoted - Investment in equity instruments',
          'Trade - Quoted - Investment in preference shares',
          'Trade - Quoted - Investment in government or trust securities',
          'Trade - Quoted - Investment in debentures or bonds',
          'Trade - Quoted - Investment in mutual funds',
          'Trade - Quoted - Other current investments',
          // Trade - Unquoted
          'Trade - Unquoted - Investment in equity instruments',
          'Trade - Unquoted - Investment in preference shares',
          'Trade - Unquoted - Investment in government or trust securities',
          'Trade - Unquoted - Investment in debentures or bonds',
          'Trade - Unquoted - Investment in mutual funds',
          'Trade - Unquoted - Other current investments',
          // Non-Trade - Quoted
          'Non-Trade - Quoted - Investment in equity instruments',
          'Non-Trade - Quoted - Investment in preference shares',
          'Non-Trade - Quoted - Investment in government or trust securities',
          'Non-Trade - Quoted - Investment in debentures or bonds',
          'Non-Trade - Quoted - Investment in mutual funds',
          'Non-Trade - Quoted - Other current investments',
          // Non-Trade - Unquoted
          'Non-Trade - Unquoted - Investment in equity instruments',
          'Non-Trade - Unquoted - Investment in preference shares',
          'Non-Trade - Unquoted - Investment in government or trust securities',
          'Non-Trade - Unquoted - Investment in debentures or bonds',
          'Non-Trade - Unquoted - Investment in mutual funds',
          'Non-Trade - Unquoted - Other current investments',
        ],
      },
      {
        name: 'Inventories',
        subNotes: [
          'Raw materials',
          'Work-in-progress',
          'Finished goods',
          'Stock-in-trade',
          'Stores and spares',
          'Loose tools',
          'Others (goods in transit)',
        ],
      },
      {
        name: 'Trade receivables',
        subNotes: [
          'Secured, considered good',
          'Unsecured, considered good',
          'Doubtful',
          'Less: Provision for doubtful debts',
          'Trade Receivables which have significant increase in Credit Risk',
          'Trade Receivables - credit impaired',
        ],
      },
      {
        name: 'Cash and cash equivalents',
        subNotes: [
          'Cash on hand',
          'Cheques/Drafts on hand',
          'Balances with banks in current accounts',
          'Balances with banks in deposit accounts (< 3 months)',
        ],
      },
      {
        name: 'Bank balances other than cash and cash equivalents',
        subNotes: [
          'Balances with banks - Deposits with maturity 3-12 months',
          'Earmarked balances - Unpaid dividend accounts',
          'Earmarked balances - Margin money deposits',
          'Earmarked balances - Other earmarked balances',
        ],
      },
      {
        name: 'Short-term loans and advances',
        subNotes: [
          'Loans and advances to related parties',
          'Advances to suppliers',
          'Prepaid expenses',
          'Balances with government authorities',
          'Other loans and advances - Secured, considered good',
          'Other loans and advances - Unsecured, considered good',
          'Other loans and advances - Doubtful',
          'Less: Provision for doubtful loans and advances',
        ],
      },
      {
        name: 'Other current assets',
        subNotes: [
          'Security deposits',
          'Advance to suppliers',
          'Interest accrued on deposits',
          'Interest accrued on investments',
          'Unbilled revenue',
          'Export incentive receivable',
          'Insurance claim receivable',
          'Other current assets',
        ],
      },
    ],
  },

  // ===== INCOME =====
  {
    name: 'Income',
    aile: 'Income',
    type: 'pl',
    noteGroups: [
      {
        name: 'Revenue from operations',
        subNotes: [
          'Sale of products',
          'Sale of services',
          'Other operating revenues',
          'Less: Excise duty',
        ],
      },
      {
        name: 'Other income',
        subNotes: [
          'Interest income',
          'Dividend income',
          'Net gain/(loss) on sale of investments',
          'Rent income',
          'Other non-operating income',
        ],
      },
    ],
  },

  // ===== EXPENSES =====
  {
    name: 'Expenses',
    aile: 'Expense',
    type: 'pl',
    noteGroups: [
      {
        name: 'Cost of materials consumed',
        subNotes: [
          'Opening stock of raw materials',
          'Add: Purchases of raw materials',
          'Less: Closing stock of raw materials',
          'Cost of materials consumed',
        ],
      },
      {
        name: 'Purchases of stock-in-trade',
        subNotes: ['Purchases of stock-in-trade'],
      },
      {
        name: 'Changes in inventories of FG, WIP and stock-in-trade',
        subNotes: [
          'Opening stock - Finished goods',
          'Opening stock - Work-in-progress',
          'Opening stock - Stock-in-trade',
          'Less: Closing stock - Finished goods',
          'Less: Closing stock - Work-in-progress',
          'Less: Closing stock - Stock-in-trade',
          'Net change in inventories',
        ],
      },
      {
        name: 'Employee benefit expenses',
        subNotes: [
          'Salaries and wages',
          'Contribution to provident and other funds',
          'Staff welfare expenses',
          'Gratuity expense',
        ],
      },
      {
        name: 'Finance costs',
        subNotes: [
          'Interest expense',
          'Other borrowing costs',
          'Applicable net gain/loss on foreign currency transactions',
        ],
      },
      {
        name: 'Depreciation and amortisation expense',
        subNotes: [
          'Depreciation of tangible assets',
          'Amortisation of intangible assets',
        ],
      },
      {
        name: 'Other expenses',
        subNotes: [
          'Consumption of stores and spares',
          'Power and fuel',
          'Rent',
          'Repairs to buildings',
          'Repairs to machinery',
          'Insurance',
          'Rates and taxes',
          'Communication expenses',
          'Travelling and conveyance',
          'Printing and stationery',
          'Legal and professional charges',
          'Auditors remuneration',
          'Directors sitting fees',
          'Bad debts written off',
          'Provision for doubtful debts',
          'Loss on sale of fixed assets',
          'Net loss on foreign currency transactions',
          'Donation and CSR expenses',
          'Miscellaneous expenses',
        ],
      },
      {
        name: 'Exceptional items',
        subNotes: ['Exceptional items'],
      },
      {
        name: 'Tax expense',
        subNotes: [
          'Current tax',
          'Deferred tax',
          'Tax adjustment for earlier years',
        ],
      },
    ],
  },
];

// ===== HELPER FUNCTIONS =====

/**
 * Get all unique face groups
 */
export function getAllFaceGroups(): string[] {
  return SCHEDULE_III_HIERARCHY.map(fg => fg.name);
}

/**
 * Get face groups for Balance Sheet only
 */
export function getBalanceSheetFaceGroups(): string[] {
  return SCHEDULE_III_HIERARCHY
    .filter(fg => fg.type === 'bs')
    .map(fg => fg.name);
}

/**
 * Get face groups for Profit & Loss only
 */
export function getProfitLossFaceGroups(): string[] {
  return SCHEDULE_III_HIERARCHY
    .filter(fg => fg.type === 'pl')
    .map(fg => fg.name);
}

/**
 * Get AILE classification for a face group
 */
export function getAileForFaceGroup(faceGroup: string): AILEType | null {
  const fg = SCHEDULE_III_HIERARCHY.find(f => f.name === faceGroup);
  return fg?.aile || null;
}

/**
 * Get all note groups for a face group
 */
export function getNoteGroupsForFaceGroup(faceGroup: string): string[] {
  const fg = SCHEDULE_III_HIERARCHY.find(f => f.name === faceGroup);
  return fg?.noteGroups.map(ng => ng.name) || [];
}

/**
 * Get all sub notes for a note group
 */
export function getSubNotesForNoteGroup(faceGroup: string, noteGroup: string): string[] {
  const fg = SCHEDULE_III_HIERARCHY.find(f => f.name === faceGroup);
  if (!fg) return [];
  const ng = fg.noteGroups.find(n => n.name === noteGroup);
  return ng?.subNotes || [];
}

/**
 * Check if a face group is a Balance Sheet item
 */
export function isBalanceSheetFaceGroup(faceGroup: string): boolean {
  const fg = SCHEDULE_III_HIERARCHY.find(f => f.name === faceGroup);
  return fg?.type === 'bs';
}

/**
 * Check if a face group is a Profit & Loss item
 */
export function isProfitLossFaceGroup(faceGroup: string): boolean {
  const fg = SCHEDULE_III_HIERARCHY.find(f => f.name === faceGroup);
  return fg?.type === 'pl';
}

/**
 * Find matching face group and note group for a given ledger primary group
 * Used for auto-classification
 */
export function findClassificationForTallyGroup(tallyGroup: string | null): {
  faceGroup: string | null;
  noteGroup: string | null;
  subNote: string | null;
  aile: AILEType | null;
} {
  if (!tallyGroup) {
    return { faceGroup: null, noteGroup: null, subNote: null, aile: null };
  }

  const normalizedGroup = tallyGroup.toLowerCase().trim();

  // Simple keyword-based matching
  const keywordMappings: { keywords: string[]; faceGroup: string; noteGroup: string; subNote?: string }[] = [
    // Cash & Bank
    { keywords: ['cash', 'petty cash'], faceGroup: 'Current Assets', noteGroup: 'Cash and cash equivalents', subNote: 'Cash on hand' },
    { keywords: ['bank account', 'bank a/c', 'current account'], faceGroup: 'Current Assets', noteGroup: 'Cash and cash equivalents', subNote: 'Balances with banks in current accounts' },
    { keywords: ['bank od', 'bank occ', 'overdraft'], faceGroup: 'Current Liabilities', noteGroup: 'Short-term borrowings', subNote: 'Secured - Loans repayable on demand from Banks' },
    
    // Receivables & Payables
    { keywords: ['sundry debtor', 'trade receivable', 'accounts receivable'], faceGroup: 'Current Assets', noteGroup: 'Trade receivables', subNote: 'Unsecured, considered good' },
    { keywords: ['sundry creditor', 'trade payable', 'accounts payable'], faceGroup: 'Current Liabilities', noteGroup: 'Trade payables', subNote: 'Total outstanding dues of creditors other than micro and small enterprises' },
    
    // Fixed Assets
    { keywords: ['fixed asset', 'plant', 'machinery'], faceGroup: 'Non-Current Assets', noteGroup: 'Property, Plant and Equipment' },
    { keywords: ['building'], faceGroup: 'Non-Current Assets', noteGroup: 'Property, Plant and Equipment', subNote: 'Buildings' },
    { keywords: ['land'], faceGroup: 'Non-Current Assets', noteGroup: 'Property, Plant and Equipment', subNote: 'Freehold land' },
    { keywords: ['furniture', 'fixture'], faceGroup: 'Non-Current Assets', noteGroup: 'Property, Plant and Equipment', subNote: 'Furniture and fixtures' },
    { keywords: ['vehicle', 'motor'], faceGroup: 'Non-Current Assets', noteGroup: 'Property, Plant and Equipment', subNote: 'Vehicles' },
    { keywords: ['computer'], faceGroup: 'Non-Current Assets', noteGroup: 'Property, Plant and Equipment', subNote: 'Computers and IT equipment' },
    
    // Inventory
    { keywords: ['stock', 'inventory', 'raw material'], faceGroup: 'Current Assets', noteGroup: 'Inventories', subNote: 'Raw materials' },
    
    // Capital & Equity
    { keywords: ['capital account', 'share capital'], faceGroup: 'Equity', noteGroup: 'Share Capital', subNote: 'Issued Equity Share Capital' },
    { keywords: ['reserve', 'surplus'], faceGroup: 'Equity', noteGroup: 'Reserves and surplus' },
    { keywords: ['profit & loss', 'retained earning'], faceGroup: 'Equity', noteGroup: 'Reserves and surplus', subNote: 'Surplus (Profit and Loss Account)' },
    
    // Loans
    { keywords: ['secured loan', 'term loan'], faceGroup: 'Non-Current Liabilities', noteGroup: 'Long-term borrowings', subNote: 'Secured - Term Loan from Bank' },
    { keywords: ['unsecured loan'], faceGroup: 'Non-Current Liabilities', noteGroup: 'Long-term borrowings', subNote: 'Unsecured - Other Loans and Advances' },
    
    // Income
    { keywords: ['sales', 'revenue', 'income from operation'], faceGroup: 'Income', noteGroup: 'Revenue from operations', subNote: 'Sale of products' },
    { keywords: ['other income', 'interest income'], faceGroup: 'Income', noteGroup: 'Other income' },
    
    // Expenses
    { keywords: ['salary', 'wage', 'employee'], faceGroup: 'Expenses', noteGroup: 'Employee benefit expenses', subNote: 'Salaries and wages' },
    { keywords: ['depreciation', 'amortisation'], faceGroup: 'Expenses', noteGroup: 'Depreciation and amortisation expense' },
    { keywords: ['interest expense', 'finance cost', 'bank charge'], faceGroup: 'Expenses', noteGroup: 'Finance costs', subNote: 'Interest expense' },
    { keywords: ['rent expense', 'rent paid'], faceGroup: 'Expenses', noteGroup: 'Other expenses', subNote: 'Rent' },
    { keywords: ['purchase', 'cost of good'], faceGroup: 'Expenses', noteGroup: 'Purchases of stock-in-trade' },
    
    // Taxes
    { keywords: ['duties', 'taxes', 'gst', 'tds'], faceGroup: 'Current Liabilities', noteGroup: 'Other current liabilities', subNote: 'Statutory dues payable' },
    { keywords: ['current tax', 'income tax', 'tax expense'], faceGroup: 'Expenses', noteGroup: 'Tax expense', subNote: 'Current tax' },
    { keywords: ['deferred tax liability'], faceGroup: 'Non-Current Liabilities', noteGroup: 'Deferred tax liabilities (net)' },
    { keywords: ['deferred tax asset'], faceGroup: 'Non-Current Assets', noteGroup: 'Deferred tax assets (net)' },
  ];

  for (const mapping of keywordMappings) {
    if (mapping.keywords.some(kw => normalizedGroup.includes(kw))) {
      const aile = getAileForFaceGroup(mapping.faceGroup);
      return {
        faceGroup: mapping.faceGroup,
        noteGroup: mapping.noteGroup,
        subNote: mapping.subNote || null,
        aile,
      };
    }
  }

  return { faceGroup: null, noteGroup: null, subNote: null, aile: null };
}

/**
 * Get all sub notes flattened with their parent info
 */
export function getAllSubNotes(): { faceGroup: string; noteGroup: string; subNote: string; aile: AILEType }[] {
  const result: { faceGroup: string; noteGroup: string; subNote: string; aile: AILEType }[] = [];
  
  for (const fg of SCHEDULE_III_HIERARCHY) {
    for (const ng of fg.noteGroups) {
      for (const sn of ng.subNotes) {
        result.push({
          faceGroup: fg.name,
          noteGroup: ng.name,
          subNote: sn,
          aile: fg.aile,
        });
      }
    }
  }
  
  return result;
}
