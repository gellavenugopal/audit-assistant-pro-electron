import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const excelPath = join(__dirname, 'SRM_Pro', 'TB format.xlsx');

console.log('Reading Excel file:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);
  
  console.log('\n=== WORKBOOK INFO ===');
  console.log('Sheet names:', workbook.SheetNames);
  console.log('Number of sheets:', workbook.SheetNames.length);
  
  // Read first sheet
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  
  console.log('\n=== FIRST SHEET DATA ===');
  console.log('Total rows:', data.length);
  
  if (data.length > 0) {
    console.log('\nFirst row (headers):', data[0]);
    console.log('\nHeader count:', data[0].length);
    
    // Look for key columns
    const headers = data[0];
    const findHeader = (name) => {
      const lowerName = name.toLowerCase();
      return headers.findIndex(h => h && h.toString().toLowerCase().includes(lowerName));
    };
    
    console.log('\n=== KEY COLUMN INDICES ===');
    console.log('Name/Ledger:', findHeader('name'));
    console.log('Parent:', findHeader('parent'));
    console.log('OpeningBalance:', findHeader('opening'));
    console.log('Debit:', findHeader('debit'));
    console.log('Credit:', findHeader('credit'));
    console.log('ClosingBalance:', findHeader('closing'));
    console.log('IsDeemedPositive:', findHeader('deemed'));
    
    if (data.length > 1) {
      console.log('\n=== SAMPLE DATA ROWS ===');
      for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
        console.log(`Row ${i}:`, data[i]);
      }
    }
  }
  
} catch (error) {
  console.error('Error reading Excel file:', error.message);
}
