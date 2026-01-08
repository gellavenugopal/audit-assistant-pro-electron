/**
 * Utility to compute P&L note values and ledger annexures from classified trial balance data
 */

import { LedgerRow } from '@/services/trialBalanceNewClassification';

export interface NoteValues {
  // Income items
  revenueFromOperations?: number;
  otherIncome?: number;
  // Expense items
  costOfMaterialsConsumed?: number;
  purchasesOfStockInTrade?: number;
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
 * Maps H2 classification to note key for P&L
 */
const H2_TO_NOTE_KEY: Record<string, string> = {
  // Income items
  'Revenue from operations': 'revenueFromOperations',
  'Revenue from Operations': 'revenueFromOperations',
  'Sale of products': 'revenueFromOperations',
  'Sale of services': 'revenueFromOperations',
  'Other operating revenue': 'revenueFromOperations',
  'Other income': 'otherIncome',
  'Other Income': 'otherIncome',
  // Expense items
  'Employee benefits expense': 'employeeBenefits',
  'Finance costs': 'financeCosts',
  'Depreciation and amortization expense': 'depreciation',
  'Depreciation': 'depreciation',
  'Other expenses': 'otherExpenses',
  'Purchases of Stock-in-Trade': 'purchasesOfStockInTrade',
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
    // Income
    revenueFromOperations: [],
    otherIncome: [],
    // Expenses
    costOfMaterialsConsumed: [],
    purchasesOfStockInTrade: [],
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
  let revenueFromOperationsTotal = 0;
  let otherIncomeTotal = 0;
  let employeeBenefitsTotal = 0;
  let financeCostsTotal = 0;
  let depreciationTotal = 0;
  let otherExpensesTotal = 0;
  let purchasesOfStockInTradeTotal = 0;

  // Process ledger data
  data.forEach(row => {
    if (!row) return;

    const h1 = row['H1'] || '';
    const h2 = row['H2'] || '';
    const h3 = row['H3'] || '';
    const ledgerName = row['Ledger Name'] || '';
    const groupName = row['Group Name'] || '';
    const openingBalance = row['Opening Balance'] || 0;
    const closingBalance = row['Closing Balance'] || 0;

    // Only process P&L items - handle both possible H1 values
    if (h1 !== 'Profit and Loss' && h1 !== 'P&L Account') return;

    // Debug: Log P&L items to see the actual structure
    if (ledgerName) {
      console.log('P&L Ledger:', { h1, h2, h3, ledgerName, closingBalance });
    }

    // Determine note key from H2 or H3
    let noteKey = H2_TO_NOTE_KEY[h2] || H2_TO_NOTE_KEY[h3];
    
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

      // Add to totals
      const amount = Math.abs(closingBalance);
      
      switch (noteKey) {
        case 'revenueFromOperations':
          revenueFromOperationsTotal += amount;
          break;
        case 'otherIncome':
          otherIncomeTotal += amount;
          break;
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
        case 'purchasesOfStockInTrade':
          purchasesOfStockInTradeTotal += amount;
          break;
      }
    }
  });

  // Set note values only if there are ledgers
  if (noteLedgers.revenueFromOperations.length > 0) {
    noteValues.revenueFromOperations = revenueFromOperationsTotal;
  }
  if (noteLedgers.otherIncome.length > 0) {
    noteValues.otherIncome = otherIncomeTotal;
  }
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
  if (noteLedgers.purchasesOfStockInTrade.length > 0) {
    noteValues.purchasesOfStockInTrade = purchasesOfStockInTradeTotal;
  }

  // Calculate cost of materials consumed and changes in inventories from stock data
  if (stockData && Array.isArray(stockData) && stockData.length > 0) {
    // Helper to check if item is a raw material
    const isRawMaterial = (item: StockItem) => {
      const category = (item['Stock Category'] || '').toLowerCase();
      const stockGroup = (item['Stock Group'] || '').toLowerCase();
      return (
        category.includes('raw') || 
        stockGroup.includes('raw') ||
        category.includes('pack') || 
        stockGroup.includes('pack') ||
        category.includes('consumable') || 
        category.includes('other') ||
        category.includes('component') || 
        category.includes('intermediate')
      );
    };

    // Calculate Changes in Inventories (excludes raw materials - only FG, WIP, SIT)
    let changesInvOpening = 0;
    let changesInvClosing = 0;
    
    stockData.forEach(item => {
      if (!item || isRawMaterial(item)) return; // Skip raw materials
      changesInvOpening += Math.abs(item['Opening Value'] || 0);
      changesInvClosing += Math.abs(item['Closing Value'] || 0);
    });
    
    // Changes in inventories = Opening - Closing (for FG, WIP, SIT only)
    const changesInInventories = changesInvOpening - changesInvClosing;
    noteValues.changesInInventories = changesInInventories;

    // Calculate Cost of Materials Consumed (includes raw materials)
    let rawMaterialOpening = 0;
    let rawMaterialClosing = 0;
    
    stockData.forEach(item => {
      if (!item || !isRawMaterial(item)) return; // Only raw materials
      rawMaterialOpening += Math.abs(item['Opening Value'] || 0);
      rawMaterialClosing += Math.abs(item['Closing Value'] || 0);
    });

    // Get purchases from ledger data - ONLY those classified as "Cost of materials consumed"
    let totalPurchases = 0;
    data.forEach(row => {
      if (!row) return;
      const h3 = (row['H3'] || '').toLowerCase();
      
      // ONLY include if H3 is "Cost of materials consumed"
      if (h3.includes('cost of materials consumed')) {
        totalPurchases += Math.abs(row['Closing Balance'] || 0);
        
        // Also add to costOfMaterialsConsumed ledger list
        noteLedgers.costOfMaterialsConsumed.push({
          ledgerName: row['Ledger Name'] || '',
          groupName: row['Group Name'] || row['Primary Group'] || '',
          openingBalance: row['Opening Balance'] || 0,
          closingBalance: row['Closing Balance'] || 0,
          classification: `${row['H2']}${row['H3'] ? ' > ' + row['H3'] : ''}${row['H4'] ? ' > ' + row['H4'] : ''}`,
        });
      }
    });

    // Cost of materials consumed = Raw Material Opening + Purchases - Raw Material Closing
    const costOfMaterialsConsumed = rawMaterialOpening + totalPurchases - rawMaterialClosing;
    noteValues.costOfMaterialsConsumed = costOfMaterialsConsumed;

    // Add stock items to changes in inventories ledger list (non-raw materials only)
    stockData.forEach(item => {
      if (!item || isRawMaterial(item)) return;
      noteLedgers.changesInInventories.push({
        ledgerName: item['Item Name'] || 'Unknown Item',
        groupName: item['Stock Group'] || 'Unknown Group',
        openingBalance: Math.abs(item['Opening Value'] || 0),
        closingBalance: Math.abs(item['Closing Value'] || 0),
        classification: item['Stock Category'] || 'Stock Item',
      });
    });

    // Add raw materials to cost of materials ledger list
    stockData.forEach(item => {
      if (!item || !isRawMaterial(item)) return;
      noteLedgers.costOfMaterialsConsumed.push({
        ledgerName: item['Item Name'] || 'Unknown Item',
        groupName: item['Stock Group'] || 'Unknown Group',
        openingBalance: Math.abs(item['Opening Value'] || 0),
        closingBalance: Math.abs(item['Closing Value'] || 0),
        classification: item['Stock Category'] || 'Raw Material',
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
