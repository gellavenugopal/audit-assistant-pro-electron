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

// Helper function to extract 2nd highest parent after "Primary"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extract2ndParentAfterPrimary = (row: any[], parentIdx: number, groupColIndices: number[]): string => {
  // The hierarchy goes: Ledger -> Parent -> Group.$Parent -> Group.$Parent.1 -> ... -> Primary
  // We need to find the 2nd level after Primary
  
  // Check Group.$Parent columns from right to left (highest to lowest hierarchy)
  for (let i = groupColIndices.length - 1; i >= 0; i--) {
    const colIdx = groupColIndices[i];
    if (colIdx >= 0 && row[colIdx]) {
      const value = String(row[colIdx]).trim();
      // Skip if it contains "Primary" marker
      if (value.includes('\x04') || value.toLowerCase().includes('primary')) {
        // The next column to the left should be the 2nd parent after Primary
        if (i > 0) {
          const nextIdx = groupColIndices[i - 1];
          if (nextIdx >= 0 && row[nextIdx]) {
            return String(row[nextIdx]).trim();
          }
        }
        // If no more group columns, use Parent column
        if (parentIdx >= 0 && row[parentIdx]) {
          return String(row[parentIdx]).trim();
        }
      }
    }
  }
  
  // Fallback: use Parent column
  if (parentIdx >= 0 && row[parentIdx]) {
    return String(row[parentIdx]).trim();
  }
  
  return '';
};


export const processAccountingData = (
  workbook: XLSX.WorkBook, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mappingData?: any[][], 
  assesseeType?: '3' | '4' | '5'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] => {
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
  const primaryGroupIdx = findCol('primarygroup', 'primary group', 'group');
  const openingBalIdx = findCol('openingbalance', 'opening balance', 'opening');
  const debitIdx = findCol('debit');
  const creditIdx = findCol('credit');
  const closingBalIdx = findCol('closingbalance', 'closing balance', 'closing');
  const isDeemedPositiveIdx = findCol('isdeemedpositive', 'is deemed positive', 'deemedpositive');
  
  // Find all Group.$Parent columns for hierarchy extraction
  const groupColIndices: number[] = [];
  Object.keys(colMap).forEach(key => {
    if (key.includes('group') && key.includes('parent')) {
      groupColIndices.push(colMap[key]);
    }
  });
  groupColIndices.sort((a, b) => a - b); // Sort by column index

  console.log('Column mapping:', {
    nameIdx, parentIdx, primaryGroupIdx, openingBalIdx, 
    debitIdx, creditIdx, closingBalIdx, isDeemedPositiveIdx,
    groupColIndices,
    headers: headers.slice(0, 15) // Show first 15 headers
  });
  
  // Build mapping lookup from mapping data
  // Mapping structure: [Constitution, Level 1, Level 2, Level 3, Level 4, Level 5, Level 6, ...]
  // We match on Level 2 (column index 2) and use Level 3 (column index 3) as mapped category
  const mappingLookup: Record<string, string> = {};
  if (mappingData && mappingData.length > 0 && assesseeType) {
    mappingData.forEach(row => {
      const constitution = String(row[0] || '').trim();
      if (constitution === assesseeType) {
        const level2 = String(row[2] || '').trim(); // 2nd parent to match
        const level3 = String(row[3] || '').trim(); // Mapped category
        if (level2 && level3) {
          mappingLookup[deepClean(level2)] = level3;
        }
      }
    });
    console.log('Mapping lookup built:', Object.keys(mappingLookup).length, 'rules for assessee type', assesseeType);
  }
  
  // Validate critical columns
  if (nameIdx === -1) {
    console.error('Available columns:', headers);
    throw new Error('Could not find Name/Ledger column. Available columns: ' + headers.join(', '));
  }
  if (closingBalIdx === -1) {
    console.warn('Could not find ClosingBalance column. Will try to calculate from Opening + Debit - Credit');
  }

  // Transform Data
  const results = dataRows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any[], rowIndex: number) => {
      if (!row || row.length === 0 || !row[nameIdx]) return null;

      const name = row[nameIdx];
      
      // Skip empty rows or summary rows
      if (!name || String(name).trim() === '' || String(name).toLowerCase().includes('total')) {
        return null;
      }
      
      const parent = parentIdx >= 0 ? row[parentIdx] : '';
      const primaryGroup = primaryGroupIdx >= 0 ? row[primaryGroupIdx] : '';
      const isDeemedPositive = isDeemedPositiveIdx >= 0 ? (row[isDeemedPositiveIdx] === 1 || row[isDeemedPositiveIdx] === '1' || row[isDeemedPositiveIdx] === true) : false;
      
      // Extract 2nd highest parent after Primary for mapping
      const secondParentAfterPrimary = extract2ndParentAfterPrimary(row, parentIdx, groupColIndices);
      const cleanSecondParent = deepClean(secondParentAfterPrimary);
      
      // Get mapped category using the mapping lookup
      let category = 'NOT MAPPED';
      if (mappingLookup && cleanSecondParent && mappingLookup[cleanSecondParent]) {
        category = mappingLookup[cleanSecondParent];
      }

      // Get closing balance (primary amount to use)
      let closingBalance = 0;
      if (closingBalIdx >= 0 && row[closingBalIdx] !== undefined && row[closingBalIdx] !== null && row[closingBalIdx] !== '') {
        closingBalance = parseFloat(String(row[closingBalIdx]).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0;
      } else {
        // Calculate from Opening + Debit - Credit if ClosingBalance not available
        const opening = openingBalIdx >= 0 ? (parseFloat(String(row[openingBalIdx] || 0).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0) : 0;
        const debit = debitIdx >= 0 ? (parseFloat(String(row[debitIdx] || 0).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0) : 0;
        const credit = creditIdx >= 0 ? (parseFloat(String(row[creditIdx] || 0).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0) : 0;
        closingBalance = opening + debit - credit;
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
      obj['2nd Parent After Primary'] = secondParentAfterPrimary; // For debugging
      obj['Logic Trace'] = `Parent: ${parent} | 2nd: ${secondParentAfterPrimary} | Mapped: ${category}${isDeemedPositive ? ' (Sign flipped)' : ''}`;

      return obj;
    })
    .filter((r) => r !== null);

  console.log('Processed Rows:', results.length);
  if (results.length > 0) {
    console.log('Sample processed row:', results[0]);
  }
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
