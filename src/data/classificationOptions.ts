/**
 * Unified Classification Options for Trial Balance
 * 
 * IMPORTANT: These options MUST match the BSPL_Heads data structure exactly!
 * 
 * Classification Hierarchy:
 * H1 → Statement type (Asset, Liability, Income, Expense) - matches bspl-heads.json
 * H2 → Face category (Share Capital, Reserves, Long-term Borrowings, etc.)
 * H3 → Note/Section (Specific line items)
 * 
 * Note: This is synced with src/data/bspl-heads.json
 * Balance Sheet items use: "Asset" and "Liability" (Liability includes Equity)
 * P&L items use: "Income" and "Expense"
 */

// H1 Options - Statement Type (MUST match bspl-heads.json exactly)
export const H1_OPTIONS = ['Asset', 'Liability', 'Income', 'Expense'] as const;
export type H1Type = typeof H1_OPTIONS[number];

// H2 Options based on H1 (synced with bspl-heads.json structure)
export const H2_OPTIONS: Record<string, string[]> = {
  // Balance Sheet - Liability section (includes Equity - Share Capital, Reserves, Partners Capital, etc.)
  'Liability': [
    'Share Capital',
    'Owners Capital Account',
    'Partners Capital Account',
    'Reserves and Surplus',
    'Other Equity',
    'Money received against share warrants',
    'Long-term Borrowings',
    'Other financial liabilities (non-current)',
    'Provisions (non-current)',
    'Deferred tax liabilities (net)',
    'Other non-current liabilities',
    'Short-term Borrowings',
    'Trade Payables',
    'Other financial liabilities (current)',
    'Other current liabilities',
    'Provisions (current)',
    'Current tax liabilities (net)',
  ],
  
  // Balance Sheet - Asset section
  'Asset': [
    'Property, Plant and Equipment',
    'Capital work-in-progress',
    'Investment property',
    'Intangible assets',
    'Intangible assets under development',
    'Biological assets',
    'Investments',
    'Loans (non-current)',
    'Other financial assets (non-current)',
    'Deferred tax assets (net)',
    'Other non-current assets',
    'Inventories',
    'Trade Receivables',
    'Cash and cash equivalents',
    'Bank balances other than cash',
    'Loans (current)',
    'Other financial assets (current)',
    'Current tax assets (net)',
    'Other current assets',
    'Unclassified Assets',
  ],
  
  // Profit & Loss - Income
  'Income': [
    'Revenue from Operations',
    'Other Income',
  ],
  
  // Profit & Loss - Expense
  'Expense': [
    'Cost of materials consumed',
    'Purchases of stock-in-trade',
    'Changes in inventories of FG, WIP and stock-in-trade',
    'Employee benefits expense',
    'Finance costs',
    'Depreciation and amortization expense',
    'Other expenses',
  ],
};

// H3 Options based on H2
export const H3_OPTIONS: Record<string, string[]> = {
  // Equity items
  'Share Capital': [
    'Equity - fully paid up',
    'Preference - fully paid up',
  ],
  'Owners Capital Account': [
    'Owners Capital Account',
    'Owners Current Account',
  ],
  'Partners Capital Account': [
    'Partners Capital Account',
    'Partners Current Account',
  ],
  'Reserves and Surplus': [
    'Capital Reserves',
    'Securities Premium',
    'General Reserve',
    'Surplus in Statement of Profit and Loss',
  ],
  
  // Liability items - Non-Current
  'Long-term Borrowings': [
    'Secured - Term loans from banks',
    'Secured - Term loans from financial institutions',
    'Secured - Term loans from others',
    'Unsecured - Term loans from banks',
    'Unsecured - Term loans from financial institutions',
    'Unsecured - Term loans from others',
  ],
  
  // Liability items - Current
  'Short-term Borrowings': [
    'Secured - Loans repayable on demand from banks',
    'Unsecured - Loans repayable on demand from banks',
  ],
  'Trade Payables': [
    'Total outstanding dues of MSME',
    'Total outstanding dues of creditors other than MSME',
  ],
  
  // Asset items - Non-Current
  'Property, Plant and Equipment': [
    'Freehold Land',
    'Buildings',
    'Plant and Machinery',
    'Furniture and Fixtures',
    'Vehicles',
    'Office Equipment',
  ],
  'Investments': [
    'Investment in Subsidiaries',
    'Investment in Associates',
    'Investment in Joint Ventures',
  ],
  
  // Asset items - Current
  'Inventories': [
    'Raw Materials',
    'Work-in-Progress',
    'Finished Goods',
    'Stock-in-Trade',
  ],
  'Trade Receivables': [
    'Secured, considered good',
    'Unsecured, considered good',
  ],
  'Cash and cash equivalents': [
    'Cash on hand',
    'Balances with banks',
  ],
  'Unclassified Assets': [
    'Unclassified Assets',
  ],
  
  // Income items
  'Revenue from Operations': [
    'Sale of Products',
    'Sale of Services',
  ],
  'Other Income': [
    'Interest Income',
    'Dividend Income',
  ],
  
  // Expense items
  'Employee benefits expense': [
    'Salaries and Wages',
    'Contribution to Provident Fund',
  ],
  'Finance costs': [
    'Interest expense',
    'Bank charges',
  ],
  'Other expenses': [
    'Rent',
    'Repairs and Maintenance',
    'Insurance',
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
 * Infer H1 from H2
 */
export function inferH1FromH2(h2: string): string {
  if (['Property, Plant and Equipment', 'Investments', 'Inventories', 'Trade Receivables', 'Cash and cash equivalents'].includes(h2)) {
    return 'Asset';
  } else if (['Share Capital', 'Owners Capital Account', 'Partners Capital Account', 'Reserves and Surplus', 'Long-term Borrowings', 'Short-term Borrowings', 'Trade Payables'].includes(h2)) {
    return 'Liability';
  } else if (['Revenue from Operations', 'Other Income'].includes(h2)) {
    return 'Income';
  } else if (['Employee benefits expense', 'Finance costs', 'Depreciation and amortization expense', 'Other expenses'].includes(h2)) {
    return 'Expense';
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
 * ============================================================
 * BALANCE SHEET ORDERING RULES
 * ============================================================
 * 
 * Financial Accounting Principle:
 * Balance Sheet MUST follow Schedule III format:
 * 
 * TOTAL = EQUITY + LIABILITIES + ASSETS
 * (Where Equity is a subset of Liabilities in accounting terms)
 * 
 * Display Order:
 * 1. EQUITY (Share Capital, Owners' Capital, Reserves)
 * 2. NON-CURRENT LIABILITIES
 * 3. CURRENT LIABILITIES
 * 4. NON-CURRENT ASSETS
 * 5. CURRENT ASSETS
 * 
 * Within EQUITY, strict order is enforced:
 * → Share Capital (issued and subscribed)
 * → Owners' Capital Account (for proprietorship/partnership)
 * → Partners' Capital Account (for partnership)
 * → Reserves and Surplus (retained earnings)
 * → Other Equity (various reserves)
 */

/**
 * Equity Section Items - MUST be ordered strictly
 * Used to filter and order items that belong to Equity
 */
export const EQUITY_ITEMS = [
  'Share Capital',
  'Owners Capital Account',
  'Partners Capital Account',
  'Reserves and Surplus',
  'Other Equity',
  'Money received against share warrants',
] as const;

/**
 * Normalize H2 value by removing all apostrophes, quotes, and special characters
 * Handles all variants: ' ' ` ´ '' '' ‛ ′ ＇ etc.
 * This ensures matching works regardless of how apostrophes are encoded in the database
 */
export function normalizeH2ForComparison(h2: string | undefined): string {
  if (!h2) return '';
  return (h2 || '')
    .replace(/[\u0027\u2018\u2019\u00B4\u02B9\u02BC\u055F\u05F3\u07F4\u07F5\u2032\uFF07`]/g, '')  // Remove all apostrophe/quote variants
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
}

/**
 * Map for determining if an H2 is an Equity item
 */
export const EQUITY_ITEMS_SET = new Set(EQUITY_ITEMS.map((item) => normalizeH2ForComparison(item)));

/**
 * Check if an H2 value belongs to Equity section
 * Equity items should NEVER appear:
 * - After Assets in display
 * - In "Unclassified" sections
 * - Without explicit H1='Liability' classification
 */
export function isEquityItem(h2: string | undefined): boolean {
  if (!h2) return false;
  const normalized = normalizeH2ForComparison(h2);
  return EQUITY_ITEMS_SET.has(normalized);
}

/**
 * Get equity item ordering index
 * Lower index = appears first in Balance Sheet
 * Used for deterministic sorting
 */
export function getEquityOrderIndex(h2: string | undefined): number {
  if (!h2) return EQUITY_ITEMS.length; // Unclassified goes to end
  const normalized = normalizeH2ForComparison(h2);
  const index = EQUITY_ITEMS.indexOf(normalized as any);
  return index >= 0 ? index : EQUITY_ITEMS.length;
}

/**
 * Non-Current Liabilities - in order
 */
export const NON_CURRENT_LIABILITY_ITEMS = [
  'Long-term Borrowings',
  'Other financial liabilities (non-current)',
  'Provisions (non-current)',
  'Deferred tax liabilities (net)',
  'Other non-current liabilities',
] as const;

/**
 * Current Liabilities - in order
 */
export const CURRENT_LIABILITY_ITEMS = [
  'Short-term Borrowings',
  'Trade Payables',
  'Other financial liabilities (current)',
  'Other current liabilities',
  'Provisions (current)',
  'Current tax liabilities (net)',
] as const;

/**
 * Check if an H2 is a true liability (not equity)
 */
export function isTrueLiability(h2: string | undefined): boolean {
  if (!h2) return false;
  const normalized = normalizeH2ForComparison(h2);
  return !isEquityItem(h2) && H2_OPTIONS['Liability'].includes(h2);
}

/**
 * Balance Sheet section classifier
 * Determines WHERE an item should be displayed
 */
export function getBalanceSheetSection(h2: string | undefined): 'Equity' | 'NonCurrentLiabilities' | 'CurrentLiabilities' | 'Unclassified' {
  if (isEquityItem(h2)) return 'Equity';
  if (NON_CURRENT_LIABILITY_ITEMS.includes(h2 as any)) return 'NonCurrentLiabilities';
  if (CURRENT_LIABILITY_ITEMS.includes(h2 as any)) return 'CurrentLiabilities';
  return 'Unclassified';
}

/**
 * Validation: Ensure Equity never appears with Assets or after Total Assets
 * Call this during rendering to detect configuration errors
 */
export function validateEquityPlacement(h2: string, h1: string, position: number, totalRows: number): boolean {
  if (h1 !== 'Liability') {
    console.warn(`[ClassificationError] Equity item "${h2}" has H1="${h1}" but should have H1="Liability"`);
    return false;
  }
  if (isEquityItem(h2) && position > totalRows * 0.8) {
    console.warn(`[PlacementError] Equity item "${h2}" appears too late in Balance Sheet (position ${position}/${totalRows})`);
    return false;
  }
  return true;
}