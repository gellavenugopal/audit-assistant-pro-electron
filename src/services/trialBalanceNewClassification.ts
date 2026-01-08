// Classification service for Trial Balance New module
// Based on FS Cursor classification.js

export interface ClassificationResult {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  technicalCode?: string;
  headCode?: string;
  sectionCode?: string;
  noteCode?: string;
}

export interface LedgerRow {
  'Ledger Name': string;
  'Primary Group': string;
  'Parent Group'?: string;
  'Composite Key'?: string;
  'Opening Balance': number;
  'Debit': number;
  'Credit': number;
  'Closing Balance': number;
  'Is Revenue'?: string;
  'H1'?: string;
  'H2'?: string;
  'H3'?: string;
  'H4'?: string;
  'H5'?: string;
  'Status'?: string;
  'Errors'?: string;
  'Verified'?: string;
  'Notes'?: string;
  'Sheet Name'?: string;
  'Technical Code'?: string;
  'Head Code'?: string;
  'Section Code'?: string;
  'Note Code'?: string;
}

// Generate composite key for ledger lookup
export function generateLedgerKey(ledgerName: string, tallyGroup: string): string {
  const ledger = (ledgerName || '').toString().trim();
  const group = (tallyGroup || '').toString().trim();
  return `${ledger}|${group}`;
}

// Keyword matching for Other Expenses
/**
 * Expense Classification Rules - Priority Order
 * 
 * These rules are applied in strict priority order (1 = highest priority).
 * When a ledger name matches multiple rules, the highest priority wins.
 * 
 * Priority 1: Audit Fee → Other expenses > Audit Fee
 * Priority 2: Bad Debt (not Provision) → Other expenses > Bad debts written off
 * Priority 3: Depreciation/Amortisation → Depreciation and amortization expense
 * Priority 4: Electric/Generator/Fuel → Other expenses > Power and Fuel
 * Priority 5: Interest/Int → Finance costs > Interest expense on borrowings
 * Priority 6: Legal/Professional/Fee (not Audit) → Other expenses > Legal and Professional Fees
 * Priority 7: PF/Provident Fund → Employee benefits expense > Contribution to Provident Fund
 */

interface ExpenseClassificationRule {
  priority: number;
  name: string;
  keywords: string[];
  excludeKeywords?: string[];
  h3: string;
  h4: string;
}

const EXPENSE_CLASSIFICATION_RULES: ExpenseClassificationRule[] = [
  // Priority 1: Audit Fee
  {
    priority: 1,
    name: 'Audit Fee',
    keywords: ['audit fee', 'audit fees', 'auditor fee', 'auditor fees', 'statutory audit'],
    h3: 'Other expenses',
    h4: 'Audit Fee'
  },
  // Priority 2: Bad Debt (not containing Provision)
  {
    priority: 2,
    name: 'Bad Debts',
    keywords: ['bad debt', 'bad debts', 'doubtful debt', 'written off'],
    excludeKeywords: ['provision'],
    h3: 'Other expenses',
    h4: 'Bad debts written off'
  },
  // Priority 3: Depreciation or Amortisation
  {
    priority: 3,
    name: 'Depreciation',
    keywords: ['depreciation', 'amortisation', 'amortization', 'dep.', 'depn'],
    h3: 'Depreciation and amortization expense',
    h4: 'Depreciation on tangible assets'
  },
  // Priority 4: Electric, Generator, Fuel
  {
    priority: 4,
    name: 'Power and Fuel',
    keywords: ['electric', 'electricity', 'generator', 'fuel', 'diesel', 'petrol', 'power', 'energy', 'gas'],
    h3: 'Other expenses',
    h4: 'Power and Fuel'
  },
  // Priority 5: Interest
  {
    priority: 5,
    name: 'Finance Costs',
    keywords: ['interest', 'int.', 'int ', ' int', 'finance charge', 'bank interest'],
    h3: 'Finance costs',
    h4: 'Interest expense on borrowings'
  },
  // Priority 6: Legal, Professional, Fee (but not Audit Fee)
  {
    priority: 6,
    name: 'Legal and Professional',
    keywords: ['legal', 'professional', 'consultant', 'consultancy', 'fee', 'fees', 'ca ', 'advocate', 'lawyer'],
    excludeKeywords: ['audit fee', 'audit fees', 'auditor'],
    h3: 'Other expenses',
    h4: 'Legal and Professional Fees'
  },
  // Priority 7: PF, Provident Fund
  {
    priority: 7,
    name: 'Provident Fund',
    keywords: ['pf', 'provident fund', 'p.f.', 'pf-', 'pf ', ' pf', 'epf', 'e.p.f'],
    h3: 'Employee benefits expense',
    h4: 'Contribution to Provident Fund'
  }
];

// Additional keyword mappings for Other Expenses (lower priority)
const OTHER_EXPENSES_KEYWORDS: Record<string, string[]> = {
  'Rent': ['rent', 'rental', 'lease'],
  'Rates and Taxes': ['tax', 'rate', 'cess', 'municipal', 'property tax', 'gst', 'tds'],
  'Repairs and Maintenance - Others': ['repair', 'maintenance', 'maint', 'amc'],
  'Insurance': ['insurance', 'premium', 'lic'],
  'Telephone and Internet': ['telephone', 'phone', 'mobile', 'internet', 'broadband', 'data', 'telecom'],
  'Printing and Stationery': ['printing', 'stationery', 'paper', 'stationary'],
  'Travelling and Conveyance': ['travel', 'travelling', 'conveyance', 'taxi', 'transport', 'vehicle', 'cab'],
  'Bank Charges': ['bank charge', 'bank charges', 'banking', 'bank fee'],
  'Advertisement and Publicity': ['advertisement', 'advertising', 'marketing', 'promotion', 'publicity'],
  'Commission and Brokerage': ['commission', 'brokerage'],
  'Donations': ['donation', 'charity', 'csr'],
  'Corporate Social Responsibility': ['csr expense', 'corporate social'],
  'Miscellaneous Expenses': ['misc', 'miscellaneous', 'sundry', 'general expense']
};

/**
 * Classify expense ledger using priority-based fuzzy matching
 * Returns the classification result based on the highest priority match
 */
function classifyExpenseLedger(ledgerName: string): { h3: string; h4: string } | null {
  if (!ledgerName) return null;
  
  const ledgerLower = ledgerName.toLowerCase();
  
  // Sort rules by priority (lowest number = highest priority)
  const sortedRules = [...EXPENSE_CLASSIFICATION_RULES].sort((a, b) => a.priority - b.priority);
  
  // Find the first matching rule (highest priority)
  for (const rule of sortedRules) {
    // Check if any keyword matches
    const hasKeywordMatch = rule.keywords.some(keyword => {
      // Handle keywords with spaces carefully for word boundary matching
      if (keyword.startsWith(' ') || keyword.endsWith(' ')) {
        return ledgerLower.includes(keyword);
      }
      // For short keywords like 'pf', 'int', check word boundaries
      if (keyword.length <= 3 && !keyword.includes('.')) {
        const regex = new RegExp(`\\b${keyword}\\b|[^a-z]${keyword}[^a-z]|^${keyword}[^a-z]|[^a-z]${keyword}$`, 'i');
        return regex.test(ledgerLower);
      }
      return ledgerLower.includes(keyword);
    });
    
    if (!hasKeywordMatch) continue;
    
    // Check exclusions if present
    if (rule.excludeKeywords && rule.excludeKeywords.length > 0) {
      const hasExcludedKeyword = rule.excludeKeywords.some(exclude => 
        ledgerLower.includes(exclude)
      );
      if (hasExcludedKeyword) continue;
    }
    
    // Match found!
    return { h3: rule.h3, h4: rule.h4 };
  }
  
  return null;
}

/**
 * Fallback matching for Other Expenses when no priority rule matches
 */
function matchOtherExpenseKeyword(ledgerName: string): string {
  if (!ledgerName) return 'Miscellaneous Expenses';
  
  const ledgerLower = ledgerName.toLowerCase();
  
  for (const [h4Category, keywords] of Object.entries(OTHER_EXPENSES_KEYWORDS)) {
    for (const keyword of keywords) {
      if (ledgerLower.includes(keyword)) {
        return h4Category;
      }
    }
  }
  
  return 'Miscellaneous Expenses';
}

// Schedule III Mapping (simplified - full version would be much larger)
const SCHEDULE_III_MAPPING: Record<string, {
  face: string;
  note?: string;
  subnote?: string;
  balance_logic?: {
    negative?: { face: string; note?: string; subnote?: string };
    positive?: { face: string; note?: string; subnote?: string };
  };
}> = {
  'Fixed Assets': {
    face: 'Assets',
    note: 'PPE & IA (Net)',
    subnote: 'Net - Freehold Land'
  },
  'Cash-in-hand': {
    face: 'Assets',
    note: 'Cash and Bank Balance',
    subnote: 'Cash on Hand'
  },
  'Bank Accounts': {
    face: 'Assets',
    note: 'Cash and Bank Balance',
    subnote: 'Balances with Scheduled Banks in Current Account',
    balance_logic: {
      negative: { face: 'Liabilities', note: 'Other Current Liabilities', subnote: 'Bank Overdraft' },
      positive: { face: 'Assets', note: 'Cash and Bank Balance', subnote: 'Balances with Scheduled Banks in Current Account' }
    }
  },
  'Sundry Debtors': {
    face: 'Assets',
    note: 'Trade Receivables',
    subnote: 'Unsecured Considered Good'
  },
  'Stock-in-Hand': {
    face: 'Assets',
    note: 'Inventories',
    subnote: 'Stock-in-Hand'
  },
  'Closing Stock': {
    face: 'Assets',
    note: 'Inventories',
    subnote: 'Closing Stock'
  },
  'Opening Stock': {
    face: 'Expenses',
    note: 'Changes in inventories of FG, WIP and stock-in-trade',
    subnote: 'Opening Stock'
  },
  'Capital Account': {
    face: 'Equity',
    note: 'Share Capital',
    subnote: 'Equity Share Capital'
  },
  'Reserves & Surplus': {
    face: 'Equity',
    note: 'Reserves and Surplus',
    subnote: 'Retained Earnings'
  },
  'Sundry Creditors': {
    face: 'Liabilities',
    note: 'Trade Payables',
    subnote: 'Non-MSME'
  },
  'Sales Accounts': {
    face: 'Income',
    note: 'Revenue from Operations',
    subnote: 'Sale of Products'
  },
  'Purchase Accounts': {
    face: 'Expenses',
    note: 'Cost of Goods Sold',
    subnote: 'Purchases - Raw Materials'
  },
  'Indirect Expenses': {
    face: 'Expenses',
    note: 'Other Expenses',
    subnote: 'Miscellaneous Expenses'
  },
  'Direct Expenses': {
    face: 'Expenses',
    note: 'Cost of Goods Sold',
    subnote: 'Direct Expenses'
  },
  'Indirect Incomes': {
    face: 'Income',
    note: 'Other Income',
    subnote: 'Interest Income'
  },
  'Direct Incomes': {
    face: 'Income',
    note: 'Revenue from Operations',
    subnote: 'Sale of Services'
  }
};

function inferH1FromH2(h2: string): string {
  if (['Assets', 'Liabilities', 'Equity'].includes(h2)) {
    return 'Balance Sheet';
  } else if (['Income', 'Expenses'].includes(h2)) {
    return 'Profit and Loss';
  }
  return '';
}

export function classifyLedgerWithPriority(
  ledgerName: string,
  tallyGroup: string,
  closingBalance: number,
  savedMappingsDict: Record<string, ClassificationResult> | null = null,
  businessType: string = '',
  constitution: string = 'company',
  isRevenue: boolean = false
): ClassificationResult {
  // Generate composite key for lookup
  const compositeKey = generateLedgerKey(ledgerName, tallyGroup);
  
  // PRIORITY 1: User-Saved Mappings
  if (savedMappingsDict && savedMappingsDict[compositeKey]) {
    return savedMappingsDict[compositeKey];
  }
  
  // PRIORITY 2: Special Equity Classification Rule
  // If IsRevenue = No AND Primary Group = Capital / Reserves & Surplus AND balance is Credit → H2 = Equity
  const groupLower = tallyGroup.toLowerCase();
  const isCredit = closingBalance < 0; // Credit balance in accounting
  const isRevenueGroup = ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes'].includes(tallyGroup);
  
  if (!isRevenueGroup && 
      (groupLower.includes('capital') || groupLower.includes('reserve') || groupLower.includes('surplus')) && 
      isCredit) {
    return {
      h1: 'Balance Sheet',
      h2: 'Equity',
      h3: groupLower.includes('capital') ? 'Share Capital' : 'Other Equity',
      h4: groupLower.includes('reserve') ? 'Reserves and Surplus' : '',
      h5: '',
      technicalCode: 'BS_EQUITY',
      headCode: 'EQUITY_HEAD',
      sectionCode: 'EQUITY',
      noteCode: 'NOTE_EQUITY'
    };
  }
  
  // PRIORITY 3: Business Type Specific Rules
  
  // Trading Business: Purchase Accounts → Purchase of Stock-in-Trade
  if (businessType === 'Trading' && tallyGroup === 'Purchase Accounts') {
    return {
      h1: 'Profit and Loss',
      h2: 'Expenses',
      h3: 'Purchases of stock-in-trade',
      h4: '',
      h5: '',
      technicalCode: 'PL_PURCHASES_STOCK',
      headCode: 'EXPENSES_HEAD',
      sectionCode: 'PURCHASES_STOCK_TRADE',
      noteCode: 'NOTE_PURCHASES'
    };
  }
  
  // Manufacturing Business: Purchase Accounts → Cost of materials consumed
  if (businessType === 'Manufacturing' && tallyGroup === 'Purchase Accounts') {
    return {
      h1: 'Profit and Loss',
      h2: 'Expenses',
      h3: 'Cost of materials consumed',
      h4: 'Purchases of raw materials',
      h5: '',
      technicalCode: 'PL_COST_MATERIALS',
      headCode: 'EXPENSES_HEAD',
      sectionCode: 'COST_MATERIALS',
      noteCode: 'NOTE_COST_MATERIALS'
    };
  }
  
  // PRIORITY 3: Default Mappings with Special Rules
  
  // RULE 1: Trade Receivables always go to "Unsecured Considered Good"
  if (['Sundry Debtors', 'Debtors', 'Trade Receivables'].includes(tallyGroup)) {
    return {
      h1: 'Balance Sheet',
      h2: 'Assets',
      h3: 'Trade Receivables',
      h4: 'Unsecured Considered Good',
      h5: '',
      technicalCode: 'BS_TRADE_RECEIVABLES',
      headCode: 'ASSETS_HEAD',
      sectionCode: 'TRADE_RECEIVABLES',
      noteCode: 'NOTE_TRADE_RECEIVABLES'
    };
  }
  
  // RULE 2: Stock-in-Hand mapping based on business type
  if (tallyGroup === 'Stock-in-Hand') {
    if (businessType === 'Trading') {
      return {
        h1: 'Balance Sheet',
        h2: 'Assets',
        h3: 'Inventories',
        h4: 'Stock-in-Trade',
        h5: '',
        technicalCode: 'BS_INVENTORIES',
        headCode: 'ASSETS_HEAD',
        sectionCode: 'INVENTORIES',
        noteCode: 'NOTE_INVENTORIES'
      };
    }
    // For Manufacturing, default to general stock mapping
    return {
      h1: 'Balance Sheet',
      h2: 'Assets',
      h3: 'Inventories',
      h4: '', // Will be classified based on stock items
      h5: '',
      technicalCode: 'BS_INVENTORIES',
      headCode: 'ASSETS_HEAD',
      sectionCode: 'INVENTORIES',
      noteCode: 'NOTE_INVENTORIES'
    };
  }
  
  // RULE 3: Indirect Expenses - Priority-based fuzzy matching
  if (tallyGroup === 'Indirect Expenses' || tallyGroup === 'Direct Expenses') {
    // Try priority-based expense classification first
    const expenseMatch = classifyExpenseLedger(ledgerName);
    
    // Determine H1 and H2 based on IsRevenue and closing balance
    const h1 = isRevenue ? 'Profit and Loss' : 'Balance Sheet';
    const isNegative = closingBalance < 0;
    let h2 = '';
    if (h1 === 'Balance Sheet') {
      h2 = isNegative ? 'Assets' : 'Liabilities';
    } else { // Profit and Loss
      h2 = isNegative ? 'Expenses' : 'Income';
    }
    
    if (expenseMatch) {
      return {
        h1,
        h2,
        h3: expenseMatch.h3,
        h4: expenseMatch.h4,
        h5: ''
      };
    }
    
    // Fallback to Other Expenses with keyword matching
    const h4Matched = matchOtherExpenseKeyword(ledgerName);
    return {
      h1,
      h2,
      h3: 'Other expenses',
      h4: h4Matched,
      h5: ''
    };
  }
  
  // RULE 4: Opening/Closing Stock - Changes in Inventories
  const ledgerLower = ledgerName.toLowerCase();
  if (ledgerLower.includes('opening stock') || ledgerLower.includes('opening balance stock')) {
    return {
      h1: 'Profit and Loss',
      h2: 'Expenses',
      h3: 'Changes in inventories of FG, WIP and stock-in-trade',
      h4: 'Opening Stock',
      h5: ''
    };
  }
  
  if (ledgerLower.includes('closing stock') || ledgerLower.includes('closing balance stock')) {
    return {
      h1: 'Profit and Loss',
      h2: 'Expenses',
      h3: 'Changes in inventories of FG, WIP and stock-in-trade',
      h4: 'Less: Closing Stock',
      h5: ''
    };
  }
  
  // PRIORITY 4: Default Mappings from config
  const defaultMapping = SCHEDULE_III_MAPPING[tallyGroup];
  if (defaultMapping) {
    let result: ClassificationResult = {
      h1: inferH1FromH2(defaultMapping.face),
      h2: defaultMapping.face,
      h3: defaultMapping.note || '',
      h4: defaultMapping.subnote || '',
      h5: ''
    };
    
    // Apply balance logic if exists
    if (defaultMapping.balance_logic) {
      const balance = parseFloat(String(closingBalance)) || 0;
      if (balance < 0 && defaultMapping.balance_logic.negative) {
        result = {
          h1: inferH1FromH2(defaultMapping.balance_logic.negative.face),
          h2: defaultMapping.balance_logic.negative.face,
          h3: defaultMapping.balance_logic.negative.note || '',
          h4: defaultMapping.balance_logic.negative.subnote || '',
          h5: ''
        };
      } else if (balance >= 0 && defaultMapping.balance_logic.positive) {
        result = {
          h1: inferH1FromH2(defaultMapping.balance_logic.positive.face),
          h2: defaultMapping.balance_logic.positive.face,
          h3: defaultMapping.balance_logic.positive.note || '',
          h4: defaultMapping.balance_logic.positive.subnote || '',
          h5: ''
        };
      }
    }
    
    return result;
  }
  
  // Default: Unmapped
  return {
    h1: '',
    h2: '',
    h3: '',
    h4: '',
    h5: ''
  };
}

export function classifyDataframeBatch(
  dataframe: LedgerRow[],
  savedMappingsDict: Record<string, ClassificationResult> | null = null,
  businessType: string = '',
  constitution: string = 'company'
): LedgerRow[] {
  return dataframe.map(row => {
    // First get the IsRevenue value to determine correct H1/H2
    const isRevenue = row['Is Revenue'] === 'Yes';
    const closingBalance = row['Closing Balance'] || 0;
    
    const classification = classifyLedgerWithPriority(
      row['Ledger Name'] || '',
      row['Primary Group'] || '',
      closingBalance,
      savedMappingsDict,
      businessType,
      constitution,
      isRevenue // Pass isRevenue to classification
    );
    
    // IMPORTANT: Always override H1/H2 based on IsRevenue and closing balance
    // Skip this logic ONLY for "Profit & Loss A/c" ledger with Primary parent
    const ledgerName = (row['Ledger Name'] || '').toLowerCase();
    const parentGroup = (row['Parent Group'] || '').toLowerCase();
    const skipAutoClassification = ledgerName.includes('profit') && ledgerName.includes('loss') && ledgerName.includes('a/c') && parentGroup.includes('primary');
    
    let finalH1 = classification.h1;
    let finalH2 = classification.h2;
    
    if (!skipAutoClassification) {
      // Determine H1 based on IsRevenue
      finalH1 = isRevenue ? 'Profit and Loss' : 'Balance Sheet';
      
      // Determine H2 based on H1 and closing balance sign
      const isNegative = closingBalance < 0;
      if (finalH1 === 'Balance Sheet') {
        finalH2 = isNegative ? 'Assets' : 'Liabilities';
      } else { // Profit and Loss
        finalH2 = isNegative ? 'Expenses' : 'Income';
      }
    }
    
    // Determine status
    let status = 'Mapped';
    if (finalH1 === 'Needs User Input') {
      status = 'Error';
    } else if (!finalH1 || !finalH2) {
      status = 'Unmapped';
    }
    
    return {
      ...row,
      'H1': finalH1,
      'H2': finalH2,
      'H3': classification.h3,
      'H4': classification.h4,
      'H5': classification.h5,
      'Technical Code': classification.technicalCode,
      'Head Code': classification.headCode,
      'Section Code': classification.sectionCode,
      'Note Code': classification.noteCode,
      'Status': status,
      'Composite Key': row['Composite Key'] || generateLedgerKey(row['Ledger Name'] || '', row['Primary Group'] || '')
    };
  });
}

