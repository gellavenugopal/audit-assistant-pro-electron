import * as XLSX from 'xlsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataRow = any[];

// Clean strings: removes Tally boxes, tabs, and standardizes spacing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deepClean = (val: any): string => {
  if (val === undefined || val === null) return '';
  let s = String(val);
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  s = s.replace(/[\u00A0\t\r\n]/g, ' ');
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processAccountingData = (workbook: XLSX.WorkBook, mappingMap?: Record<string, string>): any[] => {
  // NEW FORMAT: Single sheet with all data
  // Columns: Period, Branch, Ledger Code, Name, OpeningBalance, Debit, Credit, ClosingBalance,
  //          IsRevenue, IsDeemedPositive, TrailBalance, PrimaryGroup, Parent, Groups.$Parent.1-8
  
  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as DataRow[];
  
  // Find header row (look for 'Name' or 'OpeningBalance' columns)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let headerRowIdx = sheetData.findIndex((row: any[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row.some((cell: any) => {
      const c = deepClean(cell);
      return c.includes('name') || c.includes('openingbalance') || c.includes('closingbalance') || c.includes('parent');
    })
  );
  if (headerRowIdx === -1) headerRowIdx = 0;

  const headers = (sheetData[headerRowIdx] || []) as DataRow;
  const dataRows = sheetData.slice(headerRowIdx + 1);

  // Map column names to indices
  const colMap: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers.forEach((header: any, idx: number) => {
    const cleanHeader = deepClean(header);
    colMap[cleanHeader] = idx;
  });

  // Helper to find column index by multiple possible names
  const findCol = (...names: string[]): number => {
    for (const name of names) {
      const cleanName = deepClean(name);
      if (colMap[cleanName] !== undefined) return colMap[cleanName];
      // Partial match
      const partialMatch = Object.keys(colMap).find(k => k.includes(cleanName) || cleanName.includes(k));
      if (partialMatch) return colMap[partialMatch];
    }
    return -1;
  };

  // Find key column indices
  const nameIdx = findCol('name', 'ledger', 'particulars');
  const parentIdx = findCol('parent');
  const primaryGroupIdx = findCol('primarygroup', 'primary group');
  const openingBalIdx = findCol('openingbalance', 'opening balance', 'opening');
  const debitIdx = findCol('debit');
  const creditIdx = findCol('credit');
  const closingBalIdx = findCol('closingbalance', 'closing balance', 'closing');
  const isDeemedPositiveIdx = findCol('isdeemedpositive', 'is deemed positive', 'deemedpositive');

  console.log('Column mapping:', {
    nameIdx, parentIdx, primaryGroupIdx, openingBalIdx, 
    debitIdx, creditIdx, closingBalIdx, isDeemedPositiveIdx
  });

  // Transform Data
  const results = dataRows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any[]) => {
      if (!row || row.length === 0 || !row[nameIdx]) return null;

      const name = row[nameIdx];
      const parent = parentIdx >= 0 ? row[parentIdx] : '';
      const primaryGroup = primaryGroupIdx >= 0 ? row[primaryGroupIdx] : '';
      const isDeemedPositive = isDeemedPositiveIdx >= 0 ? (row[isDeemedPositiveIdx] === 1 || row[isDeemedPositiveIdx] === '1') : false;
      
      // Get mapped category from provided mapping or default to 'NOT MAPPED'
      const cleanParent = deepClean(parent || '');
      const category = (mappingMap && cleanParent) ? (mappingMap[cleanParent] || 'NOT MAPPED') : 'NOT MAPPED';

      // Get closing balance (primary amount to use)
      let closingBalance = 0;
      if (closingBalIdx >= 0 && row[closingBalIdx] !== undefined) {
        closingBalance = parseFloat(String(row[closingBalIdx]).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0;
      }

      // Apply sign correction using IsDeemedPositive flag
      // IsDeemedPositive = 1: Flip sign (for Assets/Expenses with debit balances)
      // IsDeemedPositive = 0: Keep as is (for Liabilities/Income with credit balances)
      const correctedAmount = isDeemedPositive ? -closingBalance : closingBalance;

      // Build row object preserving original data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: Record<string, any> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headers.forEach((h: any, i: number) => {
        obj[h || `Col_${i}`] = row[i];
      });
      
      // Add computed/standardized fields
      obj['Ledger'] = name;
      obj['Ledger Parent'] = parent;
      obj['Group'] = primaryGroup;
      obj['Mapped Category'] = category;
      obj['AmountValue'] = correctedAmount;
      obj['Logic Trace'] = parent ? `Parent: ${parent}` : 'No Parent Found';

      return obj;
    })
    .filter((r) => r !== null);

  console.log('Processed Rows:', results.length);
  return results;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const summarizeData = (processedData: any[]): Record<string, number> => {
  const summary: Record<string, number> = {};
  processedData.forEach((row) => {
    const key = deepClean(row['Mapped Category']);
    summary[key] = (summary[key] || 0) + (row['AmountValue'] || 0);
  });
  return summary;
};
