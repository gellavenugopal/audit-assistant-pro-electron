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
 * Note: Order matters for Balance Sheet - follows Schedule III standard format:
 * 1. Equity (Share Capital, Reserves and Surplus, Other Equity)
 * 2. Non-Current Liabilities
 * 3. Current Liabilities
 * 4. Non-Current Assets
 * 5. Current Assets
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

