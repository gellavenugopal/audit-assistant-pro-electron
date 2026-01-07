// Classification service for Trial Balance New module
// Based on FS Cursor classification.js

export interface ClassificationResult {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
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
}

// Generate composite key for ledger lookup
export function generateLedgerKey(ledgerName: string, tallyGroup: string): string {
  const ledger = (ledgerName || '').toString().trim();
  const group = (tallyGroup || '').toString().trim();
  return `${ledger}|${group}`;
}

// Keyword matching for Other Expenses
const OTHER_EXPENSES_KEYWORDS: Record<string, string[]> = {
  'Rent': ['rent', 'rental', 'lease'],
  'Rates and Taxes': ['tax', 'rate', 'cess', 'municipal', 'property tax'],
  'Repairs and Maintenance': ['repair', 'maintenance', 'maint', 'amc'],
  'Insurance': ['insurance', 'premium'],
  'Power and Fuel': ['electricity', 'power', 'fuel', 'diesel', 'petrol', 'gas'],
  'Telephone and Internet': ['telephone', 'phone', 'mobile', 'internet', 'broadband', 'data'],
  'Printing and Stationery': ['printing', 'stationery', 'paper', 'stationary'],
  'Travelling and Conveyance': ['travel', 'travelling', 'conveyance', 'taxi', 'transport', 'vehicle'],
  'Legal and Professional': ['legal', 'professional', 'consultant', 'ca fee', 'audit'],
  'Bank Charges': ['bank charge', 'bank charges', 'banking'],
  'Advertisement': ['advertisement', 'advertising', 'marketing', 'promotion'],
  'Commission': ['commission', 'brokerage'],
  'Bad Debts': ['bad debt', 'doubtful debt', 'provision'],
  'Donation': ['donation', 'charity', 'csr'],
  'Miscellaneous Expenses': ['misc', 'miscellaneous', 'sundry']
};

function matchExpenseKeyword(ledgerName: string): string {
  if (!ledgerName) return 'Others';
  
  const ledgerLower = ledgerName.toLowerCase();
  
  for (const [h4Category, keywords] of Object.entries(OTHER_EXPENSES_KEYWORDS)) {
    for (const keyword of keywords) {
      if (ledgerLower.includes(keyword)) {
        return h4Category;
      }
    }
  }
  
  return 'Others';
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
    note: 'Other Current Assets',
    subnote: 'Stock-in-Hand'
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
    return 'P&L Account';
  }
  return '';
}

export function classifyLedgerWithPriority(
  ledgerName: string,
  tallyGroup: string,
  closingBalance: number,
  savedMappingsDict: Record<string, ClassificationResult> | null = null
): ClassificationResult {
  // Generate composite key for lookup
  const compositeKey = generateLedgerKey(ledgerName, tallyGroup);
  
  // PRIORITY 1: User-Saved Mappings
  if (savedMappingsDict && savedMappingsDict[compositeKey]) {
    return savedMappingsDict[compositeKey];
  }
  
  // PRIORITY 2: Default Mappings with Special Rules
  
  // RULE 1: Trade Receivables always go to "Unsecured Considered Good"
  if (['Sundry Debtors', 'Debtors', 'Trade Receivables'].includes(tallyGroup)) {
    return {
      h1: 'Balance Sheet',
      h2: 'Assets',
      h3: 'Trade Receivables',
      h4: 'Unsecured Considered Good',
      h5: ''
    };
  }
  
  // RULE 2: Indirect Expenses - Special handling
  if (tallyGroup === 'Indirect Expenses') {
    if (ledgerName && ledgerName.toLowerCase().includes('depreciation')) {
      return {
        h1: 'P&L Account',
        h2: 'Expenses',
        h3: 'Depreciation and Amortization Expense',
        h4: 'Depreciation on Tangible Assets',
        h5: ''
      };
    }
    
    // Otherwise, match keywords for Other Expenses
    const h4Matched = matchExpenseKeyword(ledgerName);
    return {
      h1: 'P&L Account',
      h2: 'Expenses',
      h3: 'Other Expenses',
      h4: h4Matched,
      h5: ''
    };
  }
  
  // PRIORITY 3: Default Mappings from config
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
  savedMappingsDict: Record<string, ClassificationResult> | null = null
): LedgerRow[] {
  return dataframe.map(row => {
    const classification = classifyLedgerWithPriority(
      row['Ledger Name'] || '',
      row['Primary Group'] || '',
      row['Closing Balance'] || 0,
      savedMappingsDict
    );
    
    // Determine status
    let status = 'Mapped';
    if (classification.h1 === 'Needs User Input') {
      status = 'Error';
    } else if (!classification.h1 || !classification.h2) {
      status = 'Unmapped';
    }
    
    return {
      ...row,
      'H1': classification.h1,
      'H2': classification.h2,
      'H3': classification.h3,
      'H4': classification.h4,
      'H5': classification.h5,
      'Status': status,
      'Composite Key': row['Composite Key'] || generateLedgerKey(row['Ledger Name'] || '', row['Primary Group'] || '')
    };
  });
}

