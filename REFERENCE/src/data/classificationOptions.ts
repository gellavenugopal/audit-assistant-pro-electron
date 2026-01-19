/**
 * Unified Classification Options for Trial Balance
 * 
 * This file provides the single source of truth for classification dropdowns.
 * Used by both Edit Classification dialog and Classification Manager.
 * 
 * H1 → Statement type (Balance Sheet / P&L Account)
 * H2 → Face category (Assets, Liabilities, Equity, Income, Expenses)
 * H3 → Note/Section (Property Plant Equipment, Trade Receivables, etc.)
 * H4 → Sub-note/Line item (specific items)
 * H5 → Detail (free text)
 */

// H1 Options - Statement Type
export const H1_OPTIONS = ['Balance Sheet', 'Profit and Loss'] as const;
export type H1Type = typeof H1_OPTIONS[number];

// H2 Options based on H1
export const H2_OPTIONS: Record<string, string[]> = {
  'Balance Sheet': ['Assets', 'Equity', 'Liabilities'],
  'Profit and Loss': ['Income', 'Expenses'],
};

// H3 Options based on H2 - aligned with Schedule III format
export const H3_OPTIONS: Record<string, string[]> = {
  // Balance Sheet - Assets
  'Assets': [
    'Non-Current Assets',
    'Property, Plant and Equipment',
    'Capital work-in-progress',
    'Investment property',
    'Intangible assets',
    'Intangible assets under development',
    'Biological assets',
    'Investments',
    'Loans',
    'Other financial assets',
    'Deferred tax assets (net)',
    'Other non-current assets',
    'Current Assets',
    'Inventories',
    'Trade Receivables',
    'Cash and cash equivalents',
    'Bank balances other than cash',
    'Loans',
    'Other financial assets',
    'Current tax assets (net)',
    'Other current assets',
  ],
  
  // Balance Sheet - Equity
  'Equity': [
    'Share Capital',
    'Reserves and Surplus',
    'Other Equity',
    'Money received against share warrants',
  ],
  
  // Balance Sheet - Liabilities
  'Liabilities': [
    'Non-Current Liabilities',
    'Long-term borrowings',
    'Other financial liabilities',
    'Provisions',
    'Deferred tax liabilities (net)',
    'Other non-current liabilities',
    'Current Liabilities',
    'Short-term borrowings',
    'Trade Payables',
    'Other financial liabilities',
    'Other current liabilities',
    'Provisions',
    'Current tax liabilities (net)',
  ],
  
  // Profit & Loss - Income
  'Income': [
    'Revenue from Operations',
    'Other Income',
  ],
  
  // Profit & Loss - Expenses
  'Expenses': [
    'Cost of materials consumed',
    'Purchases of stock-in-trade',
    'Changes in inventories of FG, WIP and stock-in-trade',
    'Employee benefits expense',
    'Finance costs',
    'Depreciation and amortization expense',
    'Other expenses',
  ],
};

// H4 Options based on H3 - detailed line items
export const H4_OPTIONS: Record<string, string[]> = {
  // Assets - Non-Current
  'Property, Plant and Equipment': [
    'Freehold Land',
    'Leasehold Land',
    'Buildings',
    'Plant and Machinery',
    'Furniture and Fixtures',
    'Vehicles',
    'Office Equipment',
    'Computers',
    'Other tangible assets',
  ],
  'Intangible assets': [
    'Goodwill',
    'Brands/Trademarks',
    'Computer software',
    'Patents and copyrights',
    'Mining rights',
    'Other intangible assets',
  ],
  'Investments': [
    'Investment in Subsidiaries',
    'Investment in Associates',
    'Investment in Joint Ventures',
    'Investment in equity instruments',
    'Investment in preference shares',
    'Investment in debentures/bonds',
    'Investment in Government securities',
    'Investment in mutual funds',
    'Other investments',
  ],
  
  // Assets - Current
  'Inventories': [
    'Raw Materials',
    'Work-in-Progress',
    'Finished Goods',
    'Stock-in-Trade',
    'Stores and Spares',
    'Loose Tools',
    'Packing Materials',
  ],
  'Trade Receivables': [
    'Secured, considered good',
    'Unsecured, considered good',
    'Trade Receivables which have significant increase in Credit Risk',
    'Trade Receivables - credit impaired',
  ],
  'Cash and cash equivalents': [
    'Cash on hand',
    'Cheques/Drafts on hand',
    'Balances with banks in current accounts',
    'Balances with banks in deposit accounts (< 3 months)',
  ],
  'Bank balances other than cash': [
    'Balances with banks - Deposits (3-12 months)',
    'Earmarked balances - Unpaid dividend accounts',
    'Earmarked balances - Other earmarked',
  ],
  'Other current assets': [
    'Security deposits',
    'Advance to suppliers',
    'Prepaid expenses',
    'Interest accrued',
    'Other advances',
    'Other current assets',
  ],
  
  // Equity
  'Share Capital': [
    'Equity Share Capital',
    'Preference Share Capital',
  ],
  'Reserves and Surplus': [
    'Capital Reserve',
    'Capital Redemption Reserve',
    'Securities Premium',
    'Debenture Redemption Reserve',
    'Revaluation Reserve',
    'Share Options Outstanding Account',
    'Other Reserves',
    'Retained Earnings (Surplus in P&L)',
  ],
  
  // Liabilities - Non-Current
  'Long-term borrowings': [
    'Secured - Debentures',
    'Secured - Term Loans from Banks',
    'Secured - Term Loans from Others',
    'Secured - Loans from related parties',
    'Unsecured - Debentures',
    'Unsecured - Term Loans from Banks',
    'Unsecured - Loans from Directors',
    'Unsecured - Loans from related parties',
    'Unsecured - Other loans',
  ],
  
  // Liabilities - Current
  'Short-term borrowings': [
    'Secured - Loans repayable on demand from Banks',
    'Secured - Working Capital Loans',
    'Unsecured - Loans repayable on demand from Banks',
    'Unsecured - Loans from related parties',
    'Unsecured - Commercial Paper',
    'Unsecured - Other short-term borrowings',
  ],
  'Trade Payables': [
    'Total outstanding dues of MSME',
    'Total outstanding dues of creditors other than MSME',
  ],
  'Other current liabilities': [
    'Current maturities of long-term borrowings',
    'Interest accrued but not due',
    'Interest accrued and due',
    'Unpaid dividends',
    'Statutory dues',
    'Advance from customers',
    'Other payables',
  ],
  
  // Income
  'Revenue from Operations': [
    'Sale of Products',
    'Sale of Services',
    'Other Operating Revenues',
  ],
  'Other Income': [
    'Interest Income',
    'Dividend Income',
    'Rental Income',
    'Profit on sale of investments',
    'Net gain on foreign currency transactions',
    'Liabilities written back',
    'Miscellaneous income',
  ],
  
  // Expenses
  'Cost of materials consumed': [
    'Opening Stock - Raw Materials',
    'Add: Purchases - Raw Materials',
    'Less: Closing Stock - Raw Materials',
  ],
  'Purchases of stock-in-trade': [
    'Purchases - Stock-in-Trade',
  ],
  'Changes in inventories of FG, WIP and stock-in-trade': [
    'Opening Stock - Finished Goods',
    'Opening Stock - Work-in-Progress',
    'Opening Stock - Stock-in-Trade',
    'Less: Closing Stock - Finished Goods',
    'Less: Closing Stock - Work-in-Progress',
    'Less: Closing Stock - Stock-in-Trade',
  ],
  'Employee benefits expense': [
    'Salaries and Wages',
    'Contribution to Provident Fund',
    'Contribution to ESI',
    'Staff Welfare Expenses',
    'Gratuity Expense',
    'Leave Encashment',
    'Directors Remuneration',
    'Other employee benefits',
  ],
  'Finance costs': [
    'Interest expense on borrowings',
    'Interest on lease liabilities',
    'Other borrowing costs',
    'Bank charges',
  ],
  'Depreciation and amortization expense': [
    'Depreciation on tangible assets',
    'Amortization on intangible assets',
  ],
  'Other expenses': [
    'Rent',
    'Rates and Taxes',
    'Repairs and Maintenance - Building',
    'Repairs and Maintenance - Machinery',
    'Repairs and Maintenance - Others',
    'Insurance',
    'Power and Fuel',
    'Telephone and Internet',
    'Printing and Stationery',
    'Travelling and Conveyance',
    'Legal and Professional Fees',
    'Audit Fee',
    'Advertisement and Publicity',
    'Commission and Brokerage',
    'Bad debts written off',
    'Loss on sale of assets',
    'Foreign exchange loss',
    'Corporate Social Responsibility',
    'Donations',
    'Miscellaneous Expenses',
  ],
};

/**
 * Get H2 options based on H1 selection
 */
export function getH2Options(h1: string): string[] {
  return H2_OPTIONS[h1] || [];
}

/**
 * Get H3 options based on H2 selection
 */
export function getH3Options(h2: string): string[] {
  return H3_OPTIONS[h2] || [];
}

/**
 * Get H4 options based on H3 selection
 */
export function getH4Options(h3: string): string[] {
  return H4_OPTIONS[h3] || [];
}

/**
 * Infer H1 from H2
 */
export function inferH1FromH2(h2: string): string {
  if (['Assets', 'Liabilities', 'Equity'].includes(h2)) {
    return 'Balance Sheet';
  } else if (['Income', 'Expenses'].includes(h2)) {
    return 'Profit and Loss';
  }
  return '';
}

/**
 * Get all H2 options (flat)
 */
export function getAllH2Options(): string[] {
  return Object.values(H2_OPTIONS).flat();
}

/**
 * Get all H3 options (flat)
 */
export function getAllH3Options(): string[] {
  return Object.values(H3_OPTIONS).flat();
}

/**
 * Get all H4 options (flat)
 */
export function getAllH4Options(): string[] {
  return Object.values(H4_OPTIONS).flat();
}
