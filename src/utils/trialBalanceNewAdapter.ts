// Adapter to convert LedgerRow (Trial Balance New) to TrialBalanceLine format
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';
import { getActualBalanceSign } from '@/utils/naturalBalance';

// Map H1-H5 hierarchy to fs_area and aile
function mapHierarchyToFsArea(h1: string, h2: string, h3: string, h4: string): { aile: string | null; fs_area: string | null } {
  // Determine AILE (Asset/Income/Liability/Expense)
  let aile: string | null = null;
  if (h1 === 'Balance Sheet') {
    if (h2 === 'Assets') aile = 'Asset';
    else if (h2 === 'Liabilities') aile = 'Liability';
    else if (h2 === 'Equity') aile = 'Liability'; // Equity is shown under liabilities side
  } else if (h1 === 'P&L Account') {
    if (h2 === 'Income') aile = 'Income';
    else if (h2 === 'Expenses') aile = 'Expense';
  }

  // Map H3 to fs_area based on common patterns
  let fs_area: string | null = null;
  
  if (h3) {
    const h3Lower = h3.toLowerCase();
    
    // Balance Sheet mappings - exact matches first
    if (h3Lower === 'share capital' || h3Lower.includes('share capital')) {
      fs_area = 'Equity';
    } else if (h3Lower === 'reserves and surplus' || h3Lower.includes('reserves') || h3Lower.includes('surplus')) {
      fs_area = 'Reserves';
    } else if (h3Lower === 'borrowings' || h3Lower.includes('borrowing') || h3Lower.includes('loan')) {
      fs_area = 'Borrowings';
    } else if (h3Lower === 'trade payables' || h3Lower.includes('payables')) {
      fs_area = 'Payables';
    } else if (h3Lower === 'ppe & ia (net)' || h3Lower.includes('ppe') || h3Lower.includes('fixed assets') || h3Lower.includes('property')) {
      fs_area = 'Fixed Assets';
    } else if (h3Lower === 'investments' || h3Lower.includes('investment')) {
      fs_area = 'Investments';
    } else if (h3Lower === 'trade receivables' || h3Lower.includes('receivables')) {
      fs_area = 'Receivables';
    } else if (h3Lower === 'cash and bank balance' || h3Lower.includes('cash') || h3Lower.includes('bank')) {
      fs_area = 'Cash';
    } else if (h3Lower.includes('inventory') || h3Lower.includes('stock')) {
      fs_area = 'Inventory';
    } else if (h3Lower === 'provisions' || h3Lower.includes('provision')) {
      fs_area = 'Provisions';
    } else if (h3Lower === 'deferred tax (net)' || h3Lower.includes('deferred tax')) {
      fs_area = h2 === 'Assets' ? 'Deferred Tax Asset' : 'Deferred Tax';
    } else if (h3Lower === 'other current assets' || h3Lower === 'other current liabilities') {
      fs_area = h2 === 'Assets' ? 'Other Current' : 'Other Current Liabilities';
    } else if (h3Lower === 'other non-current assets' || h3Lower === 'other non-current liabilities' || h3Lower === 'loans and advances') {
      fs_area = h2 === 'Assets' ? 'Other Non-Current' : 'Other Long Term';
    } else if (h3Lower.includes('short-term')) {
      fs_area = h2 === 'Liabilities' ? 'Short Term Borrowings' : 'Current Investments';
    }
    
    // P&L mappings
    if (h3Lower === 'revenue from operations' || h3Lower.includes('revenue') || h3Lower.includes('operations')) {
      fs_area = 'Revenue';
    } else if (h3Lower === 'other income' || h3Lower.includes('other income')) {
      fs_area = 'Other Income';
    } else if (h3Lower === 'cost of goods sold' || h3Lower.includes('cost of goods') || h3Lower.includes('cogs')) {
      fs_area = 'Cost of Materials';
    } else if (h3Lower === 'employee benefits expenses' || h3Lower.includes('employee') || h3Lower.includes('benefit')) {
      fs_area = 'Employee Benefits';
    } else if (h3Lower === 'finance costs' || h3Lower.includes('finance') || h3Lower.includes('interest')) {
      fs_area = 'Finance';
    } else if (h3Lower === 'depreciation and amortization expense' || h3Lower.includes('depreciation') || h3Lower.includes('amortization')) {
      fs_area = 'Depreciation';
    } else if (h3Lower === 'other expenses' || h3Lower.includes('other expense')) {
      fs_area = 'Other Expenses';
    } else if ((h3Lower.includes('tax') || h3Lower.includes('income tax')) && h2 === 'Expenses') {
      fs_area = 'Current Tax';
    }
  }

  return { aile, fs_area };
}

export function convertLedgerRowToTrialBalanceLine(
  row: LedgerRow,
  engagementId: string,
  userId: string,
  periodType: string = 'current',
  periodEnding?: string
): TrialBalanceLine {
  const { aile, fs_area } = mapHierarchyToFsArea(
    row['H1'] || '',
    row['H2'] || '',
    row['H3'] || '',
    row['H4'] || ''
  );

  // Determine balance type
  const closingBalance = row['Closing Balance'] || 0;
  const balanceSign = getActualBalanceSign(row);
  const balanceType = balanceSign === 'Dr' ? 'Debit' : 'Credit';

  return {
    id: `temp-${row['Composite Key'] || Math.random().toString(36)}`,
    engagement_id: engagementId,
    branch_name: null,
    account_code: row['Composite Key']?.substring(0, 20) || '',
    account_name: row['Ledger Name'] || '',
    ledger_parent: row['Parent Group'] || null,
    ledger_primary_group: row['Primary Group'] || null,
    opening_balance: row['Opening Balance'] || 0,
    debit: row['Debit'] || 0,
    credit: row['Credit'] || 0,
    closing_balance: closingBalance,
    balance_type: balanceType,
    aile,
    fs_area,
    note: null,
    period_type: periodType,
    period_ending: periodEnding || null,
    // Map H1-H5 to 5-level hierarchy
    face_group: row['H1'] || null,
    note_group: row['H2'] || null,
    sub_note: row['H3'] || null,
    level4_group: row['H4'] || null,
    level5_detail: row['H5'] || null,
    version: 1,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function convertLedgerRowsToTrialBalanceLines(
  rows: LedgerRow[],
  engagementId: string,
  userId: string,
  periodType: string = 'current',
  periodEnding?: string,
  stockData?: any[]
): TrialBalanceLine[] {
  const lines = rows.map(row => convertLedgerRowToTrialBalanceLine(row, engagementId, userId, periodType, periodEnding));
  
  // Add inventory from stock data if available
  if (stockData && stockData.length > 0) {
    const inventoryTotal = stockData.reduce((sum: number, row: any) => {
      return sum + Math.abs(parseFloat(row['Closing Value'] || 0));
    }, 0);
    
    if (inventoryTotal > 0) {
      // Create inventory line if not already present
      const hasInventory = lines.some(l => l.fs_area === 'Inventory');
      if (!hasInventory) {
        lines.push({
          id: `temp-inventory-${Math.random().toString(36)}`,
          engagement_id: engagementId,
          branch_name: null,
          account_code: 'INVENTORY',
          account_name: 'Inventories',
          ledger_parent: null,
          ledger_primary_group: 'Stock-in-Hand',
          opening_balance: stockData.reduce((sum: number, row: any) => sum + Math.abs(parseFloat(row['Opening Value'] || 0)), 0),
          debit: 0,
          credit: 0,
          closing_balance: inventoryTotal,
          balance_type: 'Debit',
          aile: 'Asset',
          fs_area: 'Inventory',
          note: null,
          period_type: periodType,
          period_ending: periodEnding || null,
          face_group: 'Balance Sheet',
          note_group: 'Assets',
          sub_note: 'Other Current Assets',
          level4_group: 'Inventories',
          level5_detail: null,
          version: 1,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }
  
  return lines;
}

