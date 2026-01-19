import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Replicate functions from srmProcessor
const deepClean = (val) => {
  if (val === undefined || val === null) return '';
  let s = String(val);
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  s = s.replace(/[\u00A0\t\r\n]/g, ' ');
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
};

const extract2ndParentAfterPrimary = (row, parentIdx, groupColIndices) => {
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

console.log('=== TESTING MAPPING LOGIC ===\n');

// Load TB format
const tbPath = join(__dirname, 'SRM_Pro', 'TB format.xlsx');
const tbWorkbook = XLSX.readFile(tbPath);
const tbSheet = tbWorkbook.Sheets[tbWorkbook.SheetNames[0]];
const tbData = XLSX.utils.sheet_to_json(tbSheet, { header: 1 });

// Load Mapping
const mappingPath = join(__dirname, 'SRM_Pro', 'Mapping.xlsx');
const mappingWorkbook = XLSX.readFile(mappingPath);
const mappingSheet = mappingWorkbook.Sheets[mappingWorkbook.SheetNames[0]];
const mappingData = XLSX.utils.sheet_to_json(mappingSheet, { header: 1 }).slice(1); // Skip header

console.log('Trial Balance rows:', tbData.length);
console.log('Mapping rules:', mappingData.length);

// Build mapping lookup for Corporate (3)
const assesseeType = '3';
const mappingLookup = {};
mappingData.forEach(row => {
  const constitution = String(row[0] || '').trim();
  if (constitution === assesseeType) {
    const level2 = String(row[2] || '').trim();
    const level3 = String(row[3] || '').trim();
    if (level2 && level3) {
      mappingLookup[deepClean(level2)] = level3;
    }
  }
});

console.log('Mapping lookup entries:', Object.keys(mappingLookup).length);
console.log('\nFirst 10 mapping rules:');
Object.entries(mappingLookup).slice(0, 10).forEach(([key, value]) => {
  console.log(`  "${key}" => "${value}"`);
});

// Process sample TB rows
const tbHeaders = tbData[0];
const tbDataRows = tbData.slice(1);

const colMap = {};
tbHeaders.forEach((header, idx) => {
  const cleanHeader = deepClean(header);
  colMap[cleanHeader] = idx;
});

const findCol = (...names) => {
  for (const name of names) {
    const cleanName = deepClean(name);
    if (colMap[cleanName] !== undefined) return colMap[cleanName];
    const partialMatch = Object.keys(colMap).find(k => k.includes(cleanName) || cleanName.includes(k));
    if (partialMatch) return colMap[partialMatch];
  }
  return -1;
};

const nameIdx = findCol('name', 'ledger', 'particulars');
const parentIdx = findCol('parent');

const groupColIndices = [];
Object.keys(colMap).forEach(key => {
  if (key.includes('group') && key.includes('parent')) {
    groupColIndices.push(colMap[key]);
  }
});
groupColIndices.sort((a, b) => a - b);

console.log('\n=== SAMPLE MAPPINGS ===');
console.log('Column indices - name:', nameIdx, 'parent:', parentIdx, 'group cols:', groupColIndices);

const sampleRows = tbDataRows.slice(0, 20);
let mappedCount = 0;
let unmappedCount = 0;

sampleRows.forEach((row, idx) => {
  const name = row[nameIdx];
  if (!name || String(name).trim() === '') return;
  
  const parent = parentIdx >= 0 ? row[parentIdx] : '';
  const secondParent = extract2ndParentAfterPrimary(row, parentIdx, groupColIndices);
  const cleanSecondParent = deepClean(secondParent);
  
  let category = 'NOT MAPPED';
  if (mappingLookup[cleanSecondParent]) {
    category = mappingLookup[cleanSecondParent];
    mappedCount++;
  } else {
    unmappedCount++;
  }
  
  console.log(`\n${idx + 1}. ${name}`);
  console.log(`   Parent: ${parent}`);
  console.log(`   2nd Parent After Primary: ${secondParent}`);
  console.log(`   Mapped Category: ${category}`);
});

console.log('\n=== SUMMARY ===');
console.log(`Mapped: ${mappedCount}`);
console.log(`Unmapped: ${unmappedCount}`);
console.log(`Total: ${mappedCount + unmappedCount}`);
