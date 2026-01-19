import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Replicate the deepClean function
const deepClean = (val) => {
  if (val === undefined || val === null) return '';
  let s = String(val);
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  s = s.replace(/[\u00A0\t\r\n]/g, ' ');
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
};

const excelPath = join(__dirname, 'SRM_Pro', 'TB format.xlsx');

console.log('=== TESTING FULL PROCESSING LOGIC ===\n');

try {
  const workbook = XLSX.readFile(excelPath);
  console.log('✓ Workbook loaded');
  console.log('Sheet names:', workbook.SheetNames);
  console.log('Number of sheets:', workbook.SheetNames.length);
  
  // Single sheet processing
  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  console.log('\n✓ Sheet data loaded:', sheetData.length, 'rows');
  
  // Find header row
  let headerRowIdx = sheetData.findIndex((row) =>
    row.some((cell) => {
      const c = deepClean(cell);
      return c.includes('name') || c.includes('openingbalance') || c.includes('closingbalance') || c.includes('parent');
    })
  );
  if (headerRowIdx === -1) headerRowIdx = 0;
  
  console.log('✓ Header row index:', headerRowIdx);
  
  const headers = sheetData[headerRowIdx] || [];
  const dataRows = sheetData.slice(headerRowIdx + 1);
  
  console.log('✓ Headers:', headers);
  console.log('✓ Data rows:', dataRows.length);
  
  // Map column names
  const colMap = {};
  headers.forEach((header, idx) => {
    const cleanHeader = deepClean(header);
    colMap[cleanHeader] = idx;
  });
  
  console.log('\n✓ Column map:', colMap);
  
  // Find columns
  const findCol = (...names) => {
    for (const name of names) {
      const cleanName = deepClean(name);
      if (colMap[cleanName] !== undefined) return colMap[cleanName];
      // Partial match
      const partialMatch = Object.keys(colMap).find(k => k.includes(cleanName) || cleanName.includes(k));
      if (partialMatch) return colMap[partialMatch];
    }
    return -1;
  };
  
  const nameIdx = findCol('name', 'ledger', 'particulars');
  const parentIdx = findCol('parent');
  const primaryGroupIdx = findCol('primarygroup', 'primary group', 'group');
  const openingBalIdx = findCol('openingbalance', 'opening balance', 'opening');
  const debitIdx = findCol('debit');
  const creditIdx = findCol('credit');
  const closingBalIdx = findCol('closingbalance', 'closing balance', 'closing');
  const isDeemedPositiveIdx = findCol('isdeemedpositive', 'is deemed positive', 'deemedpositive');
  
  console.log('\n✓ Column indices found:');
  console.log('  nameIdx:', nameIdx);
  console.log('  parentIdx:', parentIdx);
  console.log('  primaryGroupIdx:', primaryGroupIdx);
  console.log('  openingBalIdx:', openingBalIdx);
  console.log('  debitIdx:', debitIdx);
  console.log('  creditIdx:', creditIdx);
  console.log('  closingBalIdx:', closingBalIdx);
  console.log('  isDeemedPositiveIdx:', isDeemedPositiveIdx);
  
  // Validate
  if (nameIdx === -1) {
    console.error('\n✗ ERROR: Could not find Name/Ledger column!');
    console.error('Available columns:', headers);
    process.exit(1);
  }
  
  console.log('\n✓ Validation passed: Name column found');
  
  // Process first few rows
  console.log('\n=== PROCESSING SAMPLE ROWS ===');
  const sampleRows = dataRows.slice(0, 5);
  
  sampleRows.forEach((row, idx) => {
    if (!row || row.length === 0 || !row[nameIdx]) {
      console.log(`Row ${idx + 1}: SKIPPED (empty or no name)`);
      return;
    }
    
    const name = row[nameIdx];
    if (!name || String(name).trim() === '' || String(name).toLowerCase().includes('total')) {
      console.log(`Row ${idx + 1}: SKIPPED (${name})`);
      return;
    }
    
    const parent = parentIdx >= 0 ? row[parentIdx] : '';
    const isDeemedPositive = isDeemedPositiveIdx >= 0 ? 
      (row[isDeemedPositiveIdx] === 1 || row[isDeemedPositiveIdx] === '1' || row[isDeemedPositiveIdx] === true) : 
      false;
    
    let closingBalance = 0;
    if (closingBalIdx >= 0 && row[closingBalIdx] !== undefined && row[closingBalIdx] !== null && row[closingBalIdx] !== '') {
      closingBalance = parseFloat(String(row[closingBalIdx]).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0;
    } else {
      const opening = openingBalIdx >= 0 ? (parseFloat(String(row[openingBalIdx] || 0).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0) : 0;
      const debit = debitIdx >= 0 ? (parseFloat(String(row[debitIdx] || 0).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0) : 0;
      const credit = creditIdx >= 0 ? (parseFloat(String(row[creditIdx] || 0).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0) : 0;
      closingBalance = opening + debit - credit;
    }
    
    const correctedAmount = isDeemedPositive ? -closingBalance : closingBalance;
    
    console.log(`\nRow ${idx + 1}: ${name}`);
    console.log(`  Parent: ${parent}`);
    console.log(`  IsDeemedPositive: ${isDeemedPositive}`);
    console.log(`  Closing Balance: ${closingBalance}`);
    console.log(`  Corrected Amount: ${correctedAmount}`);
    console.log(`  Mapped Category: NOT MAPPED`);
  });
  
  console.log('\n\n✓ SUCCESS: All processing completed without errors');
  console.log('The code should work correctly in the browser.');
  
} catch (error) {
  console.error('\n✗ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
