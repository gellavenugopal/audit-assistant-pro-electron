/**
 * Utility to compute Balance Sheet note values and ledger annexures from classified trial balance data
 */

import { LedgerRow } from '@/services/trialBalanceNewClassification';

export interface BSNoteValues {
  // Equity & Liabilities
  equity?: number;
  reserves?: number;
  shareWarrants?: number;
  shareApplication?: number;
  borrowings?: number;
  deferredTax?: number;
  otherLongTerm?: number;
  provisions?: number;
  shortTermBorrowings?: number;
  payablesMSME?: number;
  payables?: number;
  otherCurrentLiabilities?: number;
  provisionsCurrent?: number;
  // Assets
  fixedAssets?: number;
  intangibleAssets?: number;
  cwip?: number;
  intangibleUnderDev?: number;
  investments?: number;
  deferredTaxAsset?: number;
  otherNonCurrent?: number;
  currentInvestments?: number;
  inventory?: number;
  receivables?: number;
  cash?: number;
  otherCurrent?: number;
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

/**
 * Maps fs_area to note key for Balance Sheet
 */
const FS_AREA_TO_NOTE_KEY: Record<string, string> = {
  // Equity & Liabilities
  'Equity': 'equity',
  'Reserves': 'reserves',
  'Share Warrants': 'shareWarrants',
  'Share Application': 'shareApplication',
  'Borrowings': 'borrowings',
  'Deferred Tax': 'deferredTax',
  'Other Long Term': 'otherLongTerm',
  'Provisions': 'provisions',
  'Short Term Borrowings': 'shortTermBorrowings',
  'Payables MSME': 'payablesMSME',
  'Payables': 'payables',
  'Other Current Liabilities': 'otherCurrentLiabilities',
  'Provisions Current': 'provisionsCurrent',
  // Assets
  'Fixed Assets': 'fixedAssets',
  'Intangible Assets': 'intangibleAssets',
  'CWIP': 'cwip',
  'Intangible Under Dev': 'intangibleUnderDev',
  'Investments': 'investments',
  'Deferred Tax Asset': 'deferredTaxAsset',
  'Other Non-Current': 'otherNonCurrent',
  'Current Investments': 'currentInvestments',
  'Inventory': 'inventory',
  'Receivables': 'receivables',
  'Cash': 'cash',
  'Other Current': 'otherCurrent',
};

/**
 * Maps H2 classification to fs_area for Balance Sheet items
 */
const H2_TO_FS_AREA: Record<string, string> = {
  // Equity & Liabilities
  'Share Capital': 'Equity',
  'Equity Share Capital': 'Equity',
  'Preference Share Capital': 'Equity',
  'Partners Capital': 'Equity',
  'Proprietor Capital': 'Equity',
  'Capital Account': 'Equity',
  'Reserves and Surplus': 'Reserves',
  'General Reserve': 'Reserves',
  'Retained Earnings': 'Reserves',
  'Profit and Loss Account': 'Reserves',
  'Long-term borrowings': 'Borrowings',
  'Secured Loans': 'Borrowings',
  'Unsecured Loans': 'Borrowings',
  'Term Loans': 'Borrowings',
  'Deferred tax liabilities': 'Deferred Tax',
  'Other long-term liabilities': 'Other Long Term',
  'Long-term provisions': 'Provisions',
  'Short-term borrowings': 'Short Term Borrowings',
  'Bank Overdraft': 'Short Term Borrowings',
  'Trade Payables - MSME': 'Payables MSME',
  'Trade Payables - Others': 'Payables',
  'Sundry Creditors': 'Payables',
  'Other current liabilities': 'Other Current Liabilities',
  'Statutory Dues': 'Other Current Liabilities',
  'Short-term provisions': 'Provisions Current',
  // Assets
  'Property, Plant and Equipment': 'Fixed Assets',
  'Fixed Assets': 'Fixed Assets',
  'Tangible Assets': 'Fixed Assets',
  'Intangible assets': 'Intangible Assets',
  'Goodwill': 'Intangible Assets',
  'Capital work-in-progress': 'CWIP',
  'Non-current investments': 'Investments',
  'Long-term investments': 'Investments',
  'Deferred tax assets': 'Deferred Tax Asset',
  'Long-term loans and advances': 'Other Non-Current',
  'Other non-current assets': 'Other Non-Current',
  'Current investments': 'Current Investments',
  'Short-term investments': 'Current Investments',
  'Inventories': 'Inventory',
  'Stock-in-Trade': 'Inventory',
  'Trade receivables': 'Receivables',
  'Sundry Debtors': 'Receivables',
  'Cash and cash equivalents': 'Cash',
  'Bank Accounts': 'Cash',
  'Cash-in-Hand': 'Cash',
  'Short-term loans and advances': 'Other Current',
  'Other current assets': 'Other Current',
  'Prepaid Expenses': 'Other Current',
  'Advance to Suppliers': 'Other Current',
};

/**
 * Compute Balance Sheet note values from classified ledger data
 */
export function computeBSNoteValues(
  data: LedgerRow[]
): { noteValues: BSNoteValues; noteLedgers: NoteLedgersMap } {
  // GUARD: Validate all data is properly classified
  const unclassified = data.filter(row => 
    !row.H1 || !row.H2 || !row.H3 || row.Status !== 'Mapped'
  );
  
  if (unclassified.length > 0) {
    console.error(
      `[INTEGRITY ERROR] computeBSNoteValues received ${unclassified.length} unclassified ledgers. ` +
      `This should never happen! All data must be classified before reaching this function.`,
      unclassified.map(r => r['Ledger Name'])
    );
    // Filter out unclassified to prevent corruption
    data = data.filter(row => row.H1 && row.H2 && row.H3 && row.Status === 'Mapped');
  }
  
  const noteValues: BSNoteValues = {};
  const noteLedgers: NoteLedgersMap = {
    // Equity & Liabilities
    equity: [],
    reserves: [],
    shareWarrants: [],
    shareApplication: [],
    borrowings: [],
    deferredTax: [],
    otherLongTerm: [],
    provisions: [],
    shortTermBorrowings: [],
    payablesMSME: [],
    payables: [],
    otherCurrentLiabilities: [],
    provisionsCurrent: [],
    // Assets
    fixedAssets: [],
    intangibleAssets: [],
    cwip: [],
    intangibleUnderDev: [],
    investments: [],
    deferredTaxAsset: [],
    otherNonCurrent: [],
    currentInvestments: [],
    inventory: [],
    receivables: [],
    cash: [],
    otherCurrent: [],
  };

  if (!data || !Array.isArray(data)) {
    return { noteValues, noteLedgers };
  }

  // Initialize totals map
  const totals: Record<string, number> = {};

  // Process ledger data
  data.forEach(row => {
    if (!row) return;

    const h1 = row['H1'] || '';
    const h2 = row['H2'] || '';
    const h3 = row['H3'] || '';
    const h4 = row['H4'] || '';
    const ledgerName = (row['Ledger Name'] || '').toLowerCase();
    const groupName = row['Group Name'] || '';
    const primaryGroup = (row['Primary Group'] || '').toLowerCase();
    const openingBalance = row['Opening Balance'] || 0;
    const closingBalance = row['Closing Balance'] || 0;

    // Only process Balance Sheet items
    if (h1 !== 'Balance Sheet') return;

    // Enhanced matching for liability notes
    let noteKey: string | undefined;
    
    // Reserves and Surplus - detailed matching
    if (h4.toLowerCase().includes('reserve') || h4.toLowerCase().includes('surplus') ||
        ledgerName.includes('capital reserve') || ledgerName.includes('securities premium') ||
        ledgerName.includes('revaluation reserve') || ledgerName.includes('surplus')) {
      noteKey = 'reserves';
    }
    // Long-term borrowings
    else if ((h4.toLowerCase().includes('long') && (h4.toLowerCase().includes('borrowing') || h4.toLowerCase().includes('loan'))) ||
        (ledgerName.includes('term loan') && !ledgerName.includes('short'))) {
      noteKey = 'borrowings';
    }
    // Short-term borrowings
    else if ((h4.toLowerCase().includes('short') && (h4.toLowerCase().includes('borrowing') || h4.toLowerCase().includes('loan'))) ||
        ledgerName.includes('bank od') || ledgerName.includes('cash credit')) {
      noteKey = 'shortTermBorrowings';
    }
    // Trade Payables
    else if (h4.toLowerCase().includes('trade payable') || 
        ledgerName.includes('sundry creditor') ||
        primaryGroup.includes('sundry creditors')) {
      // Check if MSME or Others
      if (ledgerName.includes('msme') || h4.toLowerCase().includes('msme')) {
        noteKey = 'payablesMSME';
      } else {
        noteKey = 'payables';
      }
    }
    // Other Current Liabilities  
    else if (h4.toLowerCase().includes('other current liabilit') ||
        ledgerName.includes('statutory dues') || ledgerName.includes('tds payable') ||
        ledgerName.includes('gst payable') || ledgerName.includes('pf dues') ||
        ledgerName.includes('esi dues')) {
      noteKey = 'otherCurrentLiabilities';
    }
    // Provisions
    else if (h4.toLowerCase().includes('provision') || ledgerName.includes('provision for')) {
      // Check if current or non-current based on H3
      if (h3.toLowerCase().includes('current')) {
        noteKey = 'provisionsCurrent';
      } else {
        noteKey = 'provisions';
      }
    }
    // Fall back to H2 mapping if no detailed match found
    else {
      const fsArea = H2_TO_FS_AREA[h2];
      if (fsArea) {
        noteKey = FS_AREA_TO_NOTE_KEY[fsArea];
      }
    }
    
    if (!noteKey) return;

    const ledgerItem: NoteLedgerItem = {
      ledgerName: row['Ledger Name'] || '',
      groupName,
      openingBalance,
      closingBalance,
      classification: `${h2}${h3 ? ' > ' + h3 : ''}${h4 ? ' > ' + h4 : ''}`,
    };

    // Add to ledger list
    if (noteLedgers[noteKey]) {
      noteLedgers[noteKey].push(ledgerItem);
    }

    // Add to totals
    if (!totals[noteKey]) totals[noteKey] = 0;
    totals[noteKey] += Math.abs(closingBalance);
  });

  // Set note values only if there are ledgers
  Object.keys(noteLedgers).forEach(key => {
    if (noteLedgers[key].length > 0 && totals[key]) {
      (noteValues as Record<string, number>)[key] = totals[key];
    }
  });

  console.log('Computed BS note values:', noteValues);
  console.log('Computed BS note ledgers:', Object.keys(noteLedgers).map(k => `${k}: ${noteLedgers[k].length} ledgers`));

  return { noteValues, noteLedgers };
}
