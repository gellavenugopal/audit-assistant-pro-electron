/**
 * Entity Type Configuration for Financial Statements
 * 
 * This module provides display label mappings and configurations
 * for both Corporate (Schedule III) and Non-Corporate Entities (NCE)
 * while maintaining stable technical codes for backward compatibility.
 */

export type EntityCategory = 'company' | 'llp' | 'partnership' | 'proprietorship' | 'trust' | 'society' | 'nce';

export interface EntityTypeConfig {
  category: EntityCategory;
  displayName: string;
  isScheduleIII: boolean; // Whether Schedule III applies
  labelSet: 'corporate' | 'nce'; // Which label set to use
}

/**
 * Entity Type Configurations
 * Maps constitution types to their reporting requirements
 */
export const ENTITY_TYPE_CONFIGS: Record<string, EntityTypeConfig> = {
  'company': {
    category: 'company',
    displayName: 'Company',
    isScheduleIII: true,
    labelSet: 'corporate'
  },
  'llp': {
    category: 'llp',
    displayName: 'Limited Liability Partnership',
    isScheduleIII: false,
    labelSet: 'nce'
  },
  'partnership': {
    category: 'partnership',
    displayName: 'Partnership Firm',
    isScheduleIII: false,
    labelSet: 'nce'
  },
  'proprietorship': {
    category: 'proprietorship',
    displayName: 'Proprietorship',
    isScheduleIII: false,
    labelSet: 'nce'
  },
  'trust': {
    category: 'trust',
    displayName: 'Trust',
    isScheduleIII: false,
    labelSet: 'nce'
  },
  'society': {
    category: 'society',
    displayName: 'Society',
    isScheduleIII: false,
    labelSet: 'nce'
  }
};

/**
 * Display Label Mapping
 * Technical codes remain constant, only display labels change based on entity type
 */
export interface LabelMapping {
  technicalCode: string; // Stable identifier - NEVER CHANGES
  corporateLabel: string; // Label for companies
  nceLabel: string; // Label for NCEs
  displayOrder: number;
}

/**
 * Balance Sheet Section Labels
 */
export const BS_SECTION_LABELS: LabelMapping[] = [
  // Equity/Capital Section
  {
    technicalCode: 'EQUITY_HEAD',
    corporateLabel: 'Shareholders\' Funds',
    nceLabel: 'Owners\' Fund',
    displayOrder: 1
  },
  {
    technicalCode: 'SHARE_CAPITAL',
    corporateLabel: 'Share Capital',
    nceLabel: 'Capital Account',
    displayOrder: 2
  },
  {
    technicalCode: 'EQUITY_SHARE_CAPITAL',
    corporateLabel: 'Equity Share Capital',
    nceLabel: 'Proprietor\'s Capital / Partners\' Capital',
    displayOrder: 3
  },
  {
    technicalCode: 'PREFERENCE_SHARE_CAPITAL',
    corporateLabel: 'Preference Share Capital',
    nceLabel: 'N/A',
    displayOrder: 4
  },
  {
    technicalCode: 'RESERVES_SURPLUS',
    corporateLabel: 'Reserves and Surplus',
    nceLabel: 'Reserves and Surplus',
    displayOrder: 5
  },
  {
    technicalCode: 'CAPITAL_RESERVE',
    corporateLabel: 'Capital Reserve',
    nceLabel: 'Capital Reserve',
    displayOrder: 6
  },
  {
    technicalCode: 'SECURITIES_PREMIUM',
    corporateLabel: 'Securities Premium',
    nceLabel: 'N/A',
    displayOrder: 7
  },
  {
    technicalCode: 'GENERAL_RESERVE',
    corporateLabel: 'General Reserve',
    nceLabel: 'General Reserve',
    displayOrder: 8
  },
  {
    technicalCode: 'RETAINED_EARNINGS',
    corporateLabel: 'Surplus (P&L Account)',
    nceLabel: 'Surplus (P&L Account)',
    displayOrder: 9
  },
  {
    technicalCode: 'CURRENT_ACCOUNT',
    corporateLabel: 'N/A',
    nceLabel: 'Current Accounts',
    displayOrder: 10
  },
  {
    technicalCode: 'DRAWINGS',
    corporateLabel: 'N/A',
    nceLabel: 'Less: Drawings',
    displayOrder: 11
  },
  
  // Liabilities Section
  {
    technicalCode: 'NON_CURRENT_LIABILITIES',
    corporateLabel: 'Non-Current Liabilities',
    nceLabel: 'Non-Current Liabilities',
    displayOrder: 20
  },
  {
    technicalCode: 'CURRENT_LIABILITIES',
    corporateLabel: 'Current Liabilities',
    nceLabel: 'Current Liabilities',
    displayOrder: 21
  },
  {
    technicalCode: 'LONG_TERM_BORROWINGS',
    corporateLabel: 'Long-term Borrowings',
    nceLabel: 'Long-term Borrowings',
    displayOrder: 22
  },
  {
    technicalCode: 'SHORT_TERM_BORROWINGS',
    corporateLabel: 'Short-term Borrowings',
    nceLabel: 'Short-term Borrowings',
    displayOrder: 23
  },
  {
    technicalCode: 'TRADE_PAYABLES',
    corporateLabel: 'Trade Payables',
    nceLabel: 'Trade Payables',
    displayOrder: 24
  },
  
  // Assets Section
  {
    technicalCode: 'NON_CURRENT_ASSETS',
    corporateLabel: 'Non-Current Assets',
    nceLabel: 'Non-Current Assets',
    displayOrder: 30
  },
  {
    technicalCode: 'CURRENT_ASSETS',
    corporateLabel: 'Current Assets',
    nceLabel: 'Current Assets',
    displayOrder: 31
  },
  {
    technicalCode: 'FIXED_ASSETS',
    corporateLabel: 'Property, Plant and Equipment',
    nceLabel: 'Fixed Assets',
    displayOrder: 32
  },
  {
    technicalCode: 'INTANGIBLE_ASSETS',
    corporateLabel: 'Intangible Assets',
    nceLabel: 'Intangible Assets',
    displayOrder: 33
  },
  {
    technicalCode: 'TRADE_RECEIVABLES',
    corporateLabel: 'Trade Receivables',
    nceLabel: 'Trade Receivables',
    displayOrder: 34
  },
  {
    technicalCode: 'CASH_BANK',
    corporateLabel: 'Cash and Cash Equivalents',
    nceLabel: 'Cash and Bank Balances',
    displayOrder: 35
  }
];

/**
 * P&L Statement Section Labels
 */
export const PL_SECTION_LABELS: LabelMapping[] = [
  // Revenue Section
  {
    technicalCode: 'REVENUE_OPERATIONS',
    corporateLabel: 'Revenue from Operations',
    nceLabel: 'Revenue from Operations',
    displayOrder: 1
  },
  {
    technicalCode: 'OTHER_INCOME',
    corporateLabel: 'Other Income',
    nceLabel: 'Other Income',
    displayOrder: 2
  },
  
  // Expense Section
  {
    technicalCode: 'COST_MATERIALS',
    corporateLabel: 'Cost of Materials Consumed',
    nceLabel: 'Cost of Materials Consumed',
    displayOrder: 10
  },
  {
    technicalCode: 'PURCHASES_STOCK_TRADE',
    corporateLabel: 'Purchases of Stock-in-Trade',
    nceLabel: 'Purchases of Stock-in-Trade',
    displayOrder: 11
  },
  {
    technicalCode: 'CHANGES_INVENTORIES',
    corporateLabel: 'Changes in Inventories of FG, WIP and Stock-in-Trade',
    nceLabel: 'Changes in Inventories',
    displayOrder: 12
  },
  {
    technicalCode: 'EMPLOYEE_BENEFITS',
    corporateLabel: 'Employee Benefits Expense',
    nceLabel: 'Employee Benefits Expense',
    displayOrder: 13
  },
  {
    technicalCode: 'FINANCE_COSTS',
    corporateLabel: 'Finance Costs',
    nceLabel: 'Finance Costs',
    displayOrder: 14
  },
  {
    technicalCode: 'DEPRECIATION_AMORTIZATION',
    corporateLabel: 'Depreciation and Amortisation Expense',
    nceLabel: 'Depreciation and Amortisation Expense',
    displayOrder: 15
  },
  {
    technicalCode: 'OTHER_EXPENSES',
    corporateLabel: 'Other Expenses',
    nceLabel: 'Other Expenses',
    displayOrder: 16
  }
];

/**
 * Get display label based on entity type
 */
export function getDisplayLabel(technicalCode: string, constitution: string, statementType: 'bs' | 'pl' = 'bs'): string {
  const config = ENTITY_TYPE_CONFIGS[constitution] || ENTITY_TYPE_CONFIGS['company'];
  const labelSet = config.labelSet;
  
  const labels = statementType === 'bs' ? BS_SECTION_LABELS : PL_SECTION_LABELS;
  const mapping = labels.find(l => l.technicalCode === technicalCode);
  
  if (!mapping) return technicalCode;
  
  return labelSet === 'corporate' ? mapping.corporateLabel : mapping.nceLabel;
}

/**
 * Get entity configuration
 */
export function getEntityConfig(constitution: string): EntityTypeConfig {
  return ENTITY_TYPE_CONFIGS[constitution] || ENTITY_TYPE_CONFIGS['company'];
}

/**
 * Check if entity follows Schedule III
 */
export function isScheduleIIIEntity(constitution: string): boolean {
  const config = getEntityConfig(constitution);
  return config.isScheduleIII;
}

/**
 * Get label set for entity
 */
export function getLabelSet(constitution: string): 'corporate' | 'nce' {
  const config = getEntityConfig(constitution);
  return config.labelSet;
}
