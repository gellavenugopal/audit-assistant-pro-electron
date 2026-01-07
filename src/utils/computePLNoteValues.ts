/**
 * Utility to compute P&L note values and ledger annexures from classified trial balance data
 */

import { LedgerRow } from '@/services/trialBalanceNewClassification';

export interface NoteValues {
  costOfMaterialsConsumed?: number;
  changesInInventories?: number;
  employeeBenefits?: number;
  financeCosts?: number;
  depreciation?: number;
  otherExpenses?: number;
}

export interface NoteLedgerItem {
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  classification?: string;
}

export type NoteLedgersMap = {
  [noteKey: string]: NoteLedgerItem[];
};

interface StockItem {
  'Item Name'?: string;
  'Stock Group'?: string;
  'Opening Value'?: number;
  'Closing Value'?: number;
  'Stock Category'?: string;
  [key: string]: string | number | undefined;
}

/**
 * Maps H2 classification to note key
 */
const H2_TO_NOTE_KEY: Record<string, string> = {
  'Employee benefits expense': 'employeeBenefits',
  'Finance costs': 'financeCosts',
  'Depreciation and amortization expense': 'depreciation',
  'Depreciation': 'depreciation',
  'Other expenses': 'otherExpenses',
};

/**
 * Compute P&L note values from classified ledger data
 */
export function computePLNoteValues(
  data: LedgerRow[],
  stockData?: StockItem[]
): { noteValues: NoteValues; noteLedgers: NoteLedgersMap } {
  const noteValues: NoteValues = {};
  const noteLedgers: NoteLedgersMap = {
    costOfMaterialsConsumed: [],
    changesInInventories: [],
    employeeBenefits: [],
    financeCosts: [],
    depreciation: [],
    otherExpenses: [],
  };

  if (!data || !Array.isArray(data)) {
    return { noteValues, noteLedgers };
  }

  // Initialize totals
  let employeeBenefitsTotal = 0;
  let financeCostsTotal = 0;
  let depreciationTotal = 0;
  let otherExpensesTotal = 0;

  // Process ledger data
  data.forEach(row => {
    if (!row) return;

    const h1 = row['H1'] || '';
    const h2 = row['H2'] || '';
    const ledgerName = row['Ledger Name'] || '';
    const groupName = row['Group Name'] || '';
    const openingBalance = row['Opening Balance'] || 0;
    const closingBalance = row['Closing Balance'] || 0;

    // Only process P&L items (expenses)
    if (h1 !== 'Profit and Loss') return;

    // Determine note key from H2
    const noteKey = H2_TO_NOTE_KEY[h2];
    
    if (noteKey) {
      const ledgerItem: NoteLedgerItem = {
        ledgerName,
        groupName,
        openingBalance,
        closingBalance,
        classification: `${h2}${row['H3'] ? ' > ' + row['H3'] : ''}${row['H4'] ? ' > ' + row['H4'] : ''}`,
      };

      // Add to ledger list
      if (noteLedgers[noteKey]) {
        noteLedgers[noteKey].push(ledgerItem);
      }

      // Add to totals (expenses are typically positive closing balances)
      const amount = Math.abs(closingBalance);
      
      switch (noteKey) {
        case 'employeeBenefits':
          employeeBenefitsTotal += amount;
          break;
        case 'financeCosts':
          financeCostsTotal += amount;
          break;
        case 'depreciation':
          depreciationTotal += amount;
          break;
        case 'otherExpenses':
          otherExpensesTotal += amount;
          break;
      }
    }
  });

  // Set note values only if there are ledgers
  if (noteLedgers.employeeBenefits.length > 0) {
    noteValues.employeeBenefits = employeeBenefitsTotal;
  }
  if (noteLedgers.financeCosts.length > 0) {
    noteValues.financeCosts = financeCostsTotal;
  }
  if (noteLedgers.depreciation.length > 0) {
    noteValues.depreciation = depreciationTotal;
  }
  if (noteLedgers.otherExpenses.length > 0) {
    noteValues.otherExpenses = otherExpensesTotal;
  }

  // Calculate cost of materials consumed and changes in inventories from stock data
  if (stockData && Array.isArray(stockData) && stockData.length > 0) {
    let totalOpeningStock = 0;
    let totalClosingStock = 0;
    let totalPurchases = 0;

    // Calculate opening and closing inventory
    stockData.forEach(item => {
      if (!item) return;
      const openingValue = Math.abs(item['Opening Value'] || 0);
      const closingValue = Math.abs(item['Closing Value'] || 0);
      totalOpeningStock += openingValue;
      totalClosingStock += closingValue;
    });

    // Get purchases from ledger data
    data.forEach(row => {
      if (!row) return;
      const h3 = (row['H3'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      
      if (h3.includes('purchase') || ledgerName.includes('purchase')) {
        totalPurchases += Math.abs(row['Closing Balance'] || 0);
      }
    });

    // Changes in inventories = Opening Stock - Closing Stock (positive if decrease)
    const changesInInventories = totalOpeningStock - totalClosingStock;
    noteValues.changesInInventories = changesInInventories;

    // Cost of materials consumed = Opening + Purchases - Closing
    const costOfMaterialsConsumed = totalOpeningStock + totalPurchases - totalClosingStock;
    noteValues.costOfMaterialsConsumed = costOfMaterialsConsumed;

    // Add stock items to changes in inventories ledger list
    stockData.forEach(item => {
      if (!item) return;
      noteLedgers.changesInInventories.push({
        ledgerName: item['Item Name'] || 'Unknown Item',
        groupName: item['Stock Group'] || 'Unknown Group',
        openingBalance: Math.abs(item['Opening Value'] || 0),
        closingBalance: Math.abs(item['Closing Value'] || 0),
        classification: item['Stock Category'] || 'Stock Item',
      });
    });

    // Add purchases to cost of materials ledger list  
    data.forEach(row => {
      if (!row) return;
      const h3 = (row['H3'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      
      if (h3.includes('purchase') || ledgerName.includes('purchase')) {
        noteLedgers.costOfMaterialsConsumed.push({
          ledgerName: row['Ledger Name'] || '',
          groupName: row['Group Name'] || '',
          openingBalance: row['Opening Balance'] || 0,
          closingBalance: row['Closing Balance'] || 0,
          classification: 'Purchases',
        });
      }
    });
  }

  console.log('Computed P&L note values:', noteValues);
  console.log('Computed note ledgers:', Object.keys(noteLedgers).map(k => `${k}: ${noteLedgers[k].length} ledgers`));

  return { noteValues, noteLedgers };
}
