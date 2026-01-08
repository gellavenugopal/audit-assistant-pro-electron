/**
 * Unified Financial Statement Hierarchy
 * 
 * This structure maintains stable technical codes (HeadCode, SectionCode, NoteCode)
 * while supporting both Corporate (Schedule III) and Non-Corporate Entity reporting.
 * 
 * Key Principles:
 * - Technical codes NEVER change (backward compatibility)
 * - Display labels vary by entity type (via entityTypeConfig)
 * - Same classification logic applies to both entity types
 * - Excel exports use technical codes + separate label columns
 */

export interface FSLineItemEnhanced {
  // Stable Technical Identifiers (NEVER CHANGE)
  technicalCode: string; // Unique stable identifier
  headCode: string; // Section code (e.g., EQUITY_HEAD, ASSETS_HEAD)
  noteCode?: string; // Note number code
  sectionCode: string; // Detailed section code
  
  // Hierarchy Levels
  level: number; // 1 = Major Head, 2 = Sub-head, 3 = Line item, etc.
  parentCode?: string; // Parent technical code
  
  // Classification Metadata
  fsArea: string; // For matching with trial balance
  statementType: 'bs' | 'pl'; // Balance Sheet or P&L
  section: 'equity' | 'liabilities' | 'assets' | 'income' | 'expenses';
  currentNonCurrent?: 'current' | 'non-current'; // Applicable for assets/liabilities
  
  // Display Properties (set at runtime based on entity type)
  displayLabel?: string; // Populated from entityTypeConfig
  displayLabelCorporate: string; // For companies
  displayLabelNCE: string; // For NCEs
  
  // Formatting
  isBold: boolean;
  isIndented: boolean;
  showInBothEntityTypes: boolean; // false if applicable to only one type
  
  // Excel Export Metadata
  excelColumnGroup?: string;
  excelFormatCode?: string;
  
  // Sorting and Display Order
  displayOrder: number;
}

/**
 * Enhanced Balance Sheet Structure
 * Technical codes remain stable, labels adapt per entity type
 */
export const ENHANCED_BS_HIERARCHY: FSLineItemEnhanced[] = [
  // ========== EQUITY AND LIABILITIES ==========
  
  // Major Head: Equity
  {
    technicalCode: 'BS_EQUITY_HEAD',
    headCode: 'EQUITY_HEAD',
    sectionCode: 'EQUITY',
    level: 1,
    fsArea: 'Equity',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Shareholders\' Funds',
    displayLabelNCE: 'Owners\' Fund',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 100
  },
  
  // Share Capital / Capital Account
  {
    technicalCode: 'BS_EQUITY_CAPITAL',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_CAPITAL',
    sectionCode: 'SHARE_CAPITAL',
    level: 2,
    parentCode: 'BS_EQUITY_HEAD',
    fsArea: 'Share Capital',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Share Capital',
    displayLabelNCE: 'Capital Account',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    excelColumnGroup: 'Equity',
    displayOrder: 110
  },
  
  // Equity Share Capital / Proprietor's Capital
  {
    technicalCode: 'BS_EQUITY_SHARES',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_CAPITAL',
    sectionCode: 'EQUITY_SHARE_CAPITAL',
    level: 3,
    parentCode: 'BS_EQUITY_CAPITAL',
    fsArea: 'Equity Share Capital',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Equity Share Capital',
    displayLabelNCE: 'Proprietor\'s Capital / Partners\' Capital',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 111
  },
  
  // Preference Share Capital (Corporate only)
  {
    technicalCode: 'BS_PREFERENCE_SHARES',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_CAPITAL',
    sectionCode: 'PREFERENCE_SHARE_CAPITAL',
    level: 3,
    parentCode: 'BS_EQUITY_CAPITAL',
    fsArea: 'Preference Share Capital',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Preference Share Capital',
    displayLabelNCE: 'N/A',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: false, // Corporate only
    displayOrder: 112
  },
  
  // Current Account (NCE only)
  {
    technicalCode: 'BS_CURRENT_ACCOUNT',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_CAPITAL',
    sectionCode: 'CURRENT_ACCOUNT',
    level: 3,
    parentCode: 'BS_EQUITY_CAPITAL',
    fsArea: 'Current Account',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'N/A',
    displayLabelNCE: 'Current Accounts',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: false, // NCE only
    displayOrder: 113
  },
  
  // Drawings (NCE only)
  {
    technicalCode: 'BS_DRAWINGS',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_CAPITAL',
    sectionCode: 'DRAWINGS',
    level: 3,
    parentCode: 'BS_EQUITY_CAPITAL',
    fsArea: 'Drawings',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'N/A',
    displayLabelNCE: 'Less: Drawings',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: false, // NCE only
    displayOrder: 114
  },
  
  // Reserves and Surplus
  {
    technicalCode: 'BS_RESERVES_SURPLUS',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_RESERVES',
    sectionCode: 'RESERVES_SURPLUS',
    level: 2,
    parentCode: 'BS_EQUITY_HEAD',
    fsArea: 'Reserves and Surplus',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Reserves and Surplus',
    displayLabelNCE: 'Reserves and Surplus',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 120
  },
  
  // Capital Reserve
  {
    technicalCode: 'BS_CAPITAL_RESERVE',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_RESERVES',
    sectionCode: 'CAPITAL_RESERVE',
    level: 3,
    parentCode: 'BS_RESERVES_SURPLUS',
    fsArea: 'Capital Reserve',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Capital Reserve',
    displayLabelNCE: 'Capital Reserve',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 121
  },
  
  // Securities Premium (Corporate only)
  {
    technicalCode: 'BS_SECURITIES_PREMIUM',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_RESERVES',
    sectionCode: 'SECURITIES_PREMIUM',
    level: 3,
    parentCode: 'BS_RESERVES_SURPLUS',
    fsArea: 'Securities Premium',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Securities Premium',
    displayLabelNCE: 'N/A',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: false,
    displayOrder: 122
  },
  
  // General Reserve
  {
    technicalCode: 'BS_GENERAL_RESERVE',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_RESERVES',
    sectionCode: 'GENERAL_RESERVE',
    level: 3,
    parentCode: 'BS_RESERVES_SURPLUS',
    fsArea: 'General Reserve',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'General Reserve',
    displayLabelNCE: 'General Reserve',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 123
  },
  
  // Retained Earnings / Surplus
  {
    technicalCode: 'BS_RETAINED_EARNINGS',
    headCode: 'EQUITY_HEAD',
    noteCode: 'NOTE_RESERVES',
    sectionCode: 'RETAINED_EARNINGS',
    level: 3,
    parentCode: 'BS_RESERVES_SURPLUS',
    fsArea: 'Surplus',
    statementType: 'bs',
    section: 'equity',
    displayLabelCorporate: 'Surplus (P&L Account)',
    displayLabelNCE: 'Surplus (P&L Account)',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 124
  },
  
  // ========== NON-CURRENT LIABILITIES ==========
  
  {
    technicalCode: 'BS_NCL_HEAD',
    headCode: 'LIABILITIES_HEAD',
    sectionCode: 'NON_CURRENT_LIABILITIES',
    level: 1,
    fsArea: 'Non-Current Liabilities',
    statementType: 'bs',
    section: 'liabilities',
    currentNonCurrent: 'non-current',
    displayLabelCorporate: 'Non-Current Liabilities',
    displayLabelNCE: 'Non-Current Liabilities',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 200
  },
  
  {
    technicalCode: 'BS_LONG_TERM_BORROWINGS',
    headCode: 'LIABILITIES_HEAD',
    noteCode: 'NOTE_BORROWINGS_LT',
    sectionCode: 'LONG_TERM_BORROWINGS',
    level: 2,
    parentCode: 'BS_NCL_HEAD',
    fsArea: 'Long-term Borrowings',
    statementType: 'bs',
    section: 'liabilities',
    currentNonCurrent: 'non-current',
    displayLabelCorporate: 'Long-term Borrowings',
    displayLabelNCE: 'Long-term Borrowings',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 210
  },
  
  // ========== CURRENT LIABILITIES ==========
  
  {
    technicalCode: 'BS_CL_HEAD',
    headCode: 'LIABILITIES_HEAD',
    sectionCode: 'CURRENT_LIABILITIES',
    level: 1,
    fsArea: 'Current Liabilities',
    statementType: 'bs',
    section: 'liabilities',
    currentNonCurrent: 'current',
    displayLabelCorporate: 'Current Liabilities',
    displayLabelNCE: 'Current Liabilities',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 300
  },
  
  {
    technicalCode: 'BS_SHORT_TERM_BORROWINGS',
    headCode: 'LIABILITIES_HEAD',
    noteCode: 'NOTE_BORROWINGS_ST',
    sectionCode: 'SHORT_TERM_BORROWINGS',
    level: 2,
    parentCode: 'BS_CL_HEAD',
    fsArea: 'Short-term Borrowings',
    statementType: 'bs',
    section: 'liabilities',
    currentNonCurrent: 'current',
    displayLabelCorporate: 'Short-term Borrowings',
    displayLabelNCE: 'Short-term Borrowings',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 310
  },
  
  {
    technicalCode: 'BS_TRADE_PAYABLES',
    headCode: 'LIABILITIES_HEAD',
    noteCode: 'NOTE_TRADE_PAYABLES',
    sectionCode: 'TRADE_PAYABLES',
    level: 2,
    parentCode: 'BS_CL_HEAD',
    fsArea: 'Trade Payables',
    statementType: 'bs',
    section: 'liabilities',
    currentNonCurrent: 'current',
    displayLabelCorporate: 'Trade Payables',
    displayLabelNCE: 'Trade Payables',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 320
  },
  
  // ========== NON-CURRENT ASSETS ==========
  
  {
    technicalCode: 'BS_NCA_HEAD',
    headCode: 'ASSETS_HEAD',
    sectionCode: 'NON_CURRENT_ASSETS',
    level: 1,
    fsArea: 'Non-Current Assets',
    statementType: 'bs',
    section: 'assets',
    currentNonCurrent: 'non-current',
    displayLabelCorporate: 'Non-Current Assets',
    displayLabelNCE: 'Non-Current Assets',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 400
  },
  
  {
    technicalCode: 'BS_FIXED_ASSETS',
    headCode: 'ASSETS_HEAD',
    noteCode: 'NOTE_FIXED_ASSETS',
    sectionCode: 'FIXED_ASSETS',
    level: 2,
    parentCode: 'BS_NCA_HEAD',
    fsArea: 'Fixed Assets',
    statementType: 'bs',
    section: 'assets',
    currentNonCurrent: 'non-current',
    displayLabelCorporate: 'Property, Plant and Equipment',
    displayLabelNCE: 'Fixed Assets',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 410
  },
  
  {
    technicalCode: 'BS_INTANGIBLE_ASSETS',
    headCode: 'ASSETS_HEAD',
    noteCode: 'NOTE_INTANGIBLE',
    sectionCode: 'INTANGIBLE_ASSETS',
    level: 2,
    parentCode: 'BS_NCA_HEAD',
    fsArea: 'Intangible Assets',
    statementType: 'bs',
    section: 'assets',
    currentNonCurrent: 'non-current',
    displayLabelCorporate: 'Intangible Assets',
    displayLabelNCE: 'Intangible Assets',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 420
  },
  
  // ========== CURRENT ASSETS ==========
  
  {
    technicalCode: 'BS_CA_HEAD',
    headCode: 'ASSETS_HEAD',
    sectionCode: 'CURRENT_ASSETS',
    level: 1,
    fsArea: 'Current Assets',
    statementType: 'bs',
    section: 'assets',
    currentNonCurrent: 'current',
    displayLabelCorporate: 'Current Assets',
    displayLabelNCE: 'Current Assets',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 500
  },
  
  {
    technicalCode: 'BS_INVENTORIES',
    headCode: 'ASSETS_HEAD',
    noteCode: 'NOTE_INVENTORIES',
    sectionCode: 'INVENTORIES',
    level: 2,
    parentCode: 'BS_CA_HEAD',
    fsArea: 'Inventories',
    statementType: 'bs',
    section: 'assets',
    currentNonCurrent: 'current',
    displayLabelCorporate: 'Inventories',
    displayLabelNCE: 'Inventories',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 510
  },
  
  {
    technicalCode: 'BS_TRADE_RECEIVABLES',
    headCode: 'ASSETS_HEAD',
    noteCode: 'NOTE_TRADE_RECEIVABLES',
    sectionCode: 'TRADE_RECEIVABLES',
    level: 2,
    parentCode: 'BS_CA_HEAD',
    fsArea: 'Trade Receivables',
    statementType: 'bs',
    section: 'assets',
    currentNonCurrent: 'current',
    displayLabelCorporate: 'Trade Receivables',
    displayLabelNCE: 'Trade Receivables',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 520
  },
  
  {
    technicalCode: 'BS_CASH_BANK',
    headCode: 'ASSETS_HEAD',
    noteCode: 'NOTE_CASH_BANK',
    sectionCode: 'CASH_BANK',
    level: 2,
    parentCode: 'BS_CA_HEAD',
    fsArea: 'Cash and Bank',
    statementType: 'bs',
    section: 'assets',
    currentNonCurrent: 'current',
    displayLabelCorporate: 'Cash and Cash Equivalents',
    displayLabelNCE: 'Cash and Bank Balances',
    isBold: false,
    isIndented: true,
    showInBothEntityTypes: true,
    displayOrder: 530
  }
];

/**
 * Enhanced P&L Structure
 */
export const ENHANCED_PL_HIERARCHY: FSLineItemEnhanced[] = [
  // Revenue
  {
    technicalCode: 'PL_REVENUE_OPS',
    headCode: 'INCOME_HEAD',
    noteCode: 'NOTE_REVENUE',
    sectionCode: 'REVENUE_OPERATIONS',
    level: 1,
    fsArea: 'Revenue from Operations',
    statementType: 'pl',
    section: 'income',
    displayLabelCorporate: 'Revenue from Operations',
    displayLabelNCE: 'Revenue from Operations',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 100
  },
  
  {
    technicalCode: 'PL_OTHER_INCOME',
    headCode: 'INCOME_HEAD',
    noteCode: 'NOTE_OTHER_INCOME',
    sectionCode: 'OTHER_INCOME',
    level: 1,
    fsArea: 'Other Income',
    statementType: 'pl',
    section: 'income',
    displayLabelCorporate: 'Other Income',
    displayLabelNCE: 'Other Income',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 200
  },
  
  // Expenses
  {
    technicalCode: 'PL_COST_MATERIALS',
    headCode: 'EXPENSES_HEAD',
    noteCode: 'NOTE_COST_MATERIALS',
    sectionCode: 'COST_MATERIALS',
    level: 1,
    fsArea: 'Cost of Materials Consumed',
    statementType: 'pl',
    section: 'expenses',
    displayLabelCorporate: 'Cost of Materials Consumed',
    displayLabelNCE: 'Cost of Materials Consumed',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 300
  },
  
  {
    technicalCode: 'PL_PURCHASES_STOCK',
    headCode: 'EXPENSES_HEAD',
    noteCode: 'NOTE_PURCHASES',
    sectionCode: 'PURCHASES_STOCK_TRADE',
    level: 1,
    fsArea: 'Purchases of Stock-in-Trade',
    statementType: 'pl',
    section: 'expenses',
    displayLabelCorporate: 'Purchases of Stock-in-Trade',
    displayLabelNCE: 'Purchases of Stock-in-Trade',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 310
  },
  
  {
    technicalCode: 'PL_CHANGES_INVENTORY',
    headCode: 'EXPENSES_HEAD',
    noteCode: 'NOTE_INVENTORY_CHANGE',
    sectionCode: 'CHANGES_INVENTORIES',
    level: 1,
    fsArea: 'Changes in Inventories',
    statementType: 'pl',
    section: 'expenses',
    displayLabelCorporate: 'Changes in Inventories of FG, WIP and Stock-in-Trade',
    displayLabelNCE: 'Changes in Inventories',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 320
  },
  
  {
    technicalCode: 'PL_EMPLOYEE_BENEFITS',
    headCode: 'EXPENSES_HEAD',
    noteCode: 'NOTE_EMPLOYEE',
    sectionCode: 'EMPLOYEE_BENEFITS',
    level: 1,
    fsArea: 'Employee Benefits Expense',
    statementType: 'pl',
    section: 'expenses',
    displayLabelCorporate: 'Employee Benefits Expense',
    displayLabelNCE: 'Employee Benefits Expense',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 400
  },
  
  {
    technicalCode: 'PL_FINANCE_COSTS',
    headCode: 'EXPENSES_HEAD',
    noteCode: 'NOTE_FINANCE',
    sectionCode: 'FINANCE_COSTS',
    level: 1,
    fsArea: 'Finance Costs',
    statementType: 'pl',
    section: 'expenses',
    displayLabelCorporate: 'Finance Costs',
    displayLabelNCE: 'Finance Costs',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 500
  },
  
  {
    technicalCode: 'PL_DEPRECIATION',
    headCode: 'EXPENSES_HEAD',
    noteCode: 'NOTE_DEPRECIATION',
    sectionCode: 'DEPRECIATION_AMORTIZATION',
    level: 1,
    fsArea: 'Depreciation and Amortisation',
    statementType: 'pl',
    section: 'expenses',
    displayLabelCorporate: 'Depreciation and Amortisation Expense',
    displayLabelNCE: 'Depreciation and Amortisation Expense',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 600
  },
  
  {
    technicalCode: 'PL_OTHER_EXPENSES',
    headCode: 'EXPENSES_HEAD',
    noteCode: 'NOTE_OTHER_EXP',
    sectionCode: 'OTHER_EXPENSES',
    level: 1,
    fsArea: 'Other Expenses',
    statementType: 'pl',
    section: 'expenses',
    displayLabelCorporate: 'Other Expenses',
    displayLabelNCE: 'Other Expenses',
    isBold: true,
    isIndented: false,
    showInBothEntityTypes: true,
    displayOrder: 700
  }
];

import { getEntityConfig } from './entityTypeConfig';

/**
 * Get display label for a line item based on entity type
 */
export function getLineItemLabel(item: FSLineItemEnhanced, constitution: string): string {
  const config = getEntityConfig(constitution);
  return config.labelSet === 'corporate' ? item.displayLabelCorporate : item.displayLabelNCE;
}

/**
 * Filter items applicable to entity type
 */
export function filterByEntityType(items: FSLineItemEnhanced[], constitution: string): FSLineItemEnhanced[] {
  const config = getEntityConfig(constitution);
  const labelSet = config.labelSet;
  
  return items.filter(item => {
    if (!item.showInBothEntityTypes) {
      // Check if applicable to this entity type
      if (labelSet === 'corporate') {
        return item.displayLabelCorporate !== 'N/A';
      } else {
        return item.displayLabelNCE !== 'N/A';
      }
    }
    return true;
  });
}
