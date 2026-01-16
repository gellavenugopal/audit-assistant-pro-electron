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

// Load mapping file from public folder
const loadMappingFile = async (filename: string, assesseeType: string) => {
  try {
    const response = await fetch(`/SRM_Pro/${filename}`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as DataRow[];
    
    // Filter by assessee type (column 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.filter((row: any[]) => row && row[0] && String(row[0]) === assesseeType);
  } catch (error) {
    console.error(`Error loading mapping file ${filename}:`, error);
    return [];
  }
};

// Apply Mapping.xlsx rules - exact match on 2nd highest parent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyMapping1 = (ledger: any, mappingRules: DataRow[]): string => {
  // Extract 2nd highest parent from hierarchy (before Primary)
  const hierarchyParts: string[] = [];
  
  // Build hierarchy from Group.$Parent columns in TB
  // Assuming columns 12-20 contain hierarchy
  if (ledger.hierarchyArray) {
    hierarchyParts.push(...ledger.hierarchyArray);
  }
  
  // 2nd highest parent is the first non-empty value (Primary is last, so we take first)
  const secondHighestParent = hierarchyParts[0] || '';
  
  if (!secondHighestParent) return 'NOT MAPPED';
  
  // Match with Level 2 (column index 2) in mapping rules
  for (const rule of mappingRules) {
    const level2 = String(rule[2] || '').trim();
    if (level2.toLowerCase() === secondHighestParent.toLowerCase()) {
      // Return Level 3 (column index 3)
      return String(rule[3] || 'NOT MAPPED').trim();
    }
  }
  
  return 'NOT MAPPED';
};

// Apply Mapping (1).xlsx rules - priority-based keyword search
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyMapping2 = (ledger: any, mappingRules: DataRow[]): string => {
  // Sort rules by priority (column 7)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedRules = [...mappingRules].sort((a: any[], b: any[]) => {
    const priorityA = parseInt(String(a[7] || '999')) || 999;
    const priorityB = parseInt(String(b[7] || '999')) || 999;
    return priorityA - priorityB;
  });
  
  // Build search path: hierarchy in descending order + ledger name
  const searchPath: string[] = [];
  if (ledger.hierarchyArray) {
    searchPath.push(...ledger.hierarchyArray);
  }
  searchPath.push(ledger.Name || '');
  
  // Search through each hierarchy level
  for (const pathItem of searchPath) {
    if (!pathItem) continue;
    const pathItemLower = pathItem.toLowerCase();
    
    // Check each rule in priority order
    for (const rule of sortedRules) {
      const keywordsStr = String(rule[1] || '');
      const category = String(rule[2] || '').trim();
      
      if (!keywordsStr || !category) continue;
      
      // Split keywords by "|"
      const keywords = keywordsStr.split('|').map(k => k.trim().toLowerCase());
      
      // Check if any keyword matches (substring match)
      for (const keyword of keywords) {
        if (keyword && pathItemLower.includes(keyword)) {
          return category;
        }
      }
    }
  }
  
  return 'NOT MAPPED';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processAccountingData = async (workbook: XLSX.WorkBook, assesseeType: string = '3'): Promise<any[]> => {
  // Load mapping files
  const mapping1Rules = await loadMappingFile('Mapping.xlsx', assesseeType);
  const mapping2Rules = await loadMappingFile('Mapping (1).xlsx', assesseeType);
  
  console.log(`Loaded ${mapping1Rules.length} rules from Mapping.xlsx`);
  console.log(`Loaded ${mapping2Rules.length} rules from Mapping (1).xlsx`);

  // Handle single-sheet format with columns: Name, Parent, OpeningBalance, Debit, Credit, ClosingBalance, IsDeemedPositive, TrailBalance, Group.$Parent hierarchy
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as DataRow[];

  if (rawData.length < 2) {
    console.error('No data found in sheet');
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers = rawData[0] as any[];
  const dataRows = rawData.slice(1);

  console.log('Headers:', headers);
  console.log('Total data rows:', dataRows.length);

  // Find column indices
  const findColumnIndex = (keywords: string[]) => {
    return headers.findIndex((h: string) => {
      const clean = deepClean(h);
      return keywords.some(kw => clean.includes(kw));
    });
  };

  const nameIdx = findColumnIndex(['name', 'ledger', 'particulars']);
  const parentIdx = findColumnIndex(['parent']) !== -1 ? findColumnIndex(['parent']) : 11; // Default to column 11
  const openingIdx = findColumnIndex(['opening', 'openingbalance']);
  const debitIdx = findColumnIndex(['debit']);
  const creditIdx = findColumnIndex(['credit']);
  const closingIdx = findColumnIndex(['closing', 'closingbalance']);
  const isDeemedPositiveIdx = findColumnIndex(['isdeemedpositive', 'deemed']);
  const trailBalanceIdx = findColumnIndex(['trailbalance', 'trail']);

  console.log('Column indices:', { nameIdx, parentIdx, openingIdx, debitIdx, creditIdx, closingIdx, isDeemedPositiveIdx, trailBalanceIdx });

  // Process each row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataRows.forEach((row: any[]) => {
    if (!row || row.length === 0 || !row[nameIdx]) return;

    const name = String(row[nameIdx] || '').trim();
    if (!name) return;

    const parent = String(row[parentIdx] || '').trim();
    const openingBalance = parseFloat(String(row[openingIdx] || 0).replace(/,/g, '')) || 0;
    const debit = parseFloat(String(row[debitIdx] || 0).replace(/,/g, '')) || 0;
    const credit = parseFloat(String(row[creditIdx] || 0).replace(/,/g, '')) || 0;
    const closingBalance = parseFloat(String(row[closingIdx] || 0).replace(/,/g, '')) || 0;
    const isDeemedPositive = row[isDeemedPositiveIdx] === 1 || row[isDeemedPositiveIdx] === '1';
    const trailBalance = String(row[trailBalanceIdx] || '').trim();

    // Build hierarchy path from Group.$Parent columns (12 onwards)
    const hierarchyParts: string[] = [];
    for (let i = 12; i < Math.min(21, headers.length); i++) {
      if (row[i] && String(row[i]).trim() && !String(row[i]).includes('Primary')) {
        hierarchyParts.push(String(row[i]).trim());
      }
    }
    const hierarchyPath = hierarchyParts.join(' > ');

    // Apply sign correction based on IsDeemedPositive
    // If IsDeemedPositive = 1: Assets/Expenses -> Debit positive, Credit negative
    // If IsDeemedPositive = 0: Liabilities/Income -> Credit positive, Debit negative
    let correctedClosing = closingBalance;
    if (!isDeemedPositive) {
      correctedClosing = -closingBalance;
    }

    // Build ledger object for mapping
    const ledgerObj = {
      Name: name,
      Parent: parent,
      hierarchyArray: hierarchyParts,
      'AILE Type': trailBalance,
    };

    // Apply mappings
    const mappedCategory1 = applyMapping1(ledgerObj, mapping1Rules);
    const mappedCategory2 = applyMapping2(ledgerObj, mapping2Rules);

    // Build result object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: Record<string, any> = {
      Name: name,
      Parent: parent,
      'Opening Balance': openingBalance,
      Debit: debit,
      Credit: credit,
      'Closing Balance': closingBalance,
      'Corrected Closing': correctedClosing,
      IsDeemedPositive: isDeemedPositive ? 'Yes' : 'No',
      'AILE Type': trailBalance,
      'Hierarchy Path': hierarchyPath,
      'Mapped Category': mappedCategory1,
      'Mapped Category 2': mappedCategory2,
    };

    results.push(obj);
  });

  console.log('Processed Rows:', results.length);
  return results;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const summarizeData = (processedData: any[]): Record<string, number> => {
  const summary: Record<string, number> = {};
  processedData.forEach((row) => {
    const category = row['Mapped Category'] || 'NOT MAPPED';
    const amount = row['Corrected Closing'] || 0;
    summary[category] = (summary[category] || 0) + amount;
  });
  return summary;
};
