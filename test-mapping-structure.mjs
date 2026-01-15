import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mappingPath = join(__dirname, 'SRM_Pro', 'Mapping.xlsx');

console.log('Reading Mapping file:', mappingPath);
console.log('='.repeat(60));

try {
  const workbook = XLSX.readFile(mappingPath);
  
  console.log('\n=== WORKBOOK INFO ===');
  console.log('Sheet names:', workbook.SheetNames);
  console.log('Number of sheets:', workbook.SheetNames.length);
  
  // Read first sheet
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  
  console.log('\n=== SHEET DATA ===');
  console.log('Total rows:', data.length);
  
  if (data.length > 0) {
    console.log('\n=== FIRST 15 ROWS ===');
    for (let i = 0; i < Math.min(15, data.length); i++) {
      console.log(`Row ${i}:`, data[i]);
    }
    
    // Try to understand the structure
    console.log('\n=== STRUCTURE ANALYSIS ===');
    const headers = data[0];
    console.log('First row (potential headers):', headers);
    console.log('Column count:', headers.length);
    
    // Look for columns with 3, 4, 5
    const col3Idx = headers.findIndex(h => h == 3 || h == '3');
    const col4Idx = headers.findIndex(h => h == 4 || h == '4');
    const col5Idx = headers.findIndex(h => h == 5 || h == '5');
    
    console.log('\nColumn indices:');
    console.log('  Column "3" (Corporate):', col3Idx);
    console.log('  Column "4" (Non-Corporate):', col4Idx);
    console.log('  Column "5" (LLP):', col5Idx);
    
    // Check if row 0 or row 1 has headers
    if (data.length > 1) {
      console.log('\nRow 1:', data[1]);
    }
  }
  
} catch (error) {
  console.error('\n✗ ERROR:', error.message);
  console.error(error.stack);
}
