/**
 * Unified Classification Options for Trial Balance
 * 
 * This file provides the single source of truth for classification dropdowns.
 * Used by both Edit Classification dialog and Classification Manager in FinancialReview.
 * 
 * Classification Hierarchy:
 * H1 → Statement type (Balance Sheet / Profit and Loss)
 * H2 → Face category (Equity, Liabilities, Assets for BS; Income, Expenses for PL)
 * H3 → Note/Section (Property Plant Equipment, Trade Receivables, etc.)
 * 
 */

// H1 Options - Statement Type
export const H1_OPTIONS = ['Balance Sheet', 'Profit and Loss'] as const;
export type H1Type = typeof H1_OPTIONS[number];

// H2 Options based on H1
// Balance Sheet follows Schedule III order: Equity, Liabilities, Assets
export const H2_OPTIONS: Record<string, string[]> = {
  'Balance Sheet': ['Equity', 'Liabilities', 'Assets'],
  'Profit and Loss': ['Income', 'Expenses'],
};

// H3 Options based on H2 - aligned with Schedule III format
export const H3_OPTIONS: Record<string, string[]> = {
  // Balance Sheet - Equity
  'Equity': [
    'Share Capital',
    'Owners Capital Account',
    'Partners Capital Account',
    'Reserves and Surplus',
    'Other Equity',
    'Money received against share warrants',
  ],
  
  // Balance Sheet - Liabilities (organized by Non-Current and Current)
  'Liabilities': [
    'Long-term borrowings',
    'Other financial liabilities (non-current)',
    'Provisions (non-current)',
    'Deferred tax liabilities (net)',
    'Other non-current liabilities',
    'Short-term borrowings',
    'Trade Payables',
    'Other financial liabilities (current)',
    'Other current liabilities',
    'Provisions (current)',
    'Current tax liabilities (net)',
  ],
  
  // Balance Sheet - Assets (organized by Non-Current and Current)
  'Assets': [
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
  if (['Equity', 'Liabilities', 'Assets'].includes(h2)) {
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
  'Owners\u2019 Capital Account',
  'Partners\' Capital Account',
  'Reserves and Surplus',
  'Other Equity',
  'Money received against share warrants',
] as const;

/**
 * Map for determining if an H2 is an Equity item
 */
export const EQUITY_ITEMS_SET = new Set(EQUITY_ITEMS);

/**
 * Check if an H2 value belongs to Equity section
 * Equity items should NEVER appear:
 * - After Assets in display
 * - In "Unclassified" sections
 * - Without explicit H1='Liability' classification
 */
export function isEquityItem(h2: string | undefined): boolean {
  return h2 ? EQUITY_ITEMS_SET.has(h2) : false;
}

/**
 * Get equity item ordering index
 * Lower index = appears first in Balance Sheet
 * Used for deterministic sorting
 */
export function getEquityOrderIndex(h2: string | undefined): number {
  if (!h2) return EQUITY_ITEMS.length; // Unclassified goes to end
  const index = EQUITY_ITEMS.indexOf(h2 as any);
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
  return h2 ? (!EQUITY_ITEMS_SET.has(h2) && H2_OPTIONS['Liability'].includes(h2)) : false;
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
