/**
 * Enhanced Excel Export Utilities
 * 
 * Exports financial statements with both technical codes and display labels
 * ensuring backward compatibility with existing pivot tables, Power Query, 
 * and automation scripts.
 * 
 * Key Features:
 * - Technical codes remain stable (never change)
 * - Display labels adapt to entity type
 * - All existing columns preserved
 * - Additional metadata columns for advanced analysis
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as XLSX from 'xlsx';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { getDisplayLabel, getEntityConfig } from '@/data/entityTypeConfig';
import { ENHANCED_BS_HIERARCHY, ENHANCED_PL_HIERARCHY, FSLineItemEnhanced, getLineItemLabel, filterByEntityType } from '@/data/enhancedFSHierarchy';

export interface ExportOptions {
  companyName: string;
  financialYear: string;
  constitution: string;
  bsStartingNote?: number;
  plStartingNote?: number;
  includeMetadata?: boolean; // Include technical codes and additional metadata
  includePreviousYear?: boolean;
  previousYearData?: LedgerRow[];
}

export interface EnhancedLineItem extends LedgerRow {
  technicalCode?: string;
  headCode?: string;
  noteCode?: string;
  sectionCode?: string;
  displayLabel?: string;
  entityType?: string;
  labelSet?: 'corporate' | 'nce';
}

/**
 * Enhance ledger rows with technical codes and display labels
 */
export function enhanceLedgerRows(
  rows: LedgerRow[],
  constitution: string,
  statementType: 'bs' | 'pl'
): EnhancedLineItem[] {
  const config = getEntityConfig(constitution);
  const hierarchy = statementType === 'bs' ? ENHANCED_BS_HIERARCHY : ENHANCED_PL_HIERARCHY;
  
  return rows.map(row => {
    // Find matching hierarchy item based on H3, H2, or fsArea
    let matchedItem: FSLineItemEnhanced | undefined;
    
    // Try exact match on H3 first
    if (row.H3) {
      matchedItem = hierarchy.find(item => 
        getLineItemLabel(item, constitution) === row.H3 ||
        item.fsArea === row.H3
      );
    }
    
    // Fallback to H2 match
    if (!matchedItem && row.H2) {
      matchedItem = hierarchy.find(item => 
        getLineItemLabel(item, constitution) === row.H2 ||
        item.fsArea === row.H2
      );
    }
    
    // If found, enhance the row
    if (matchedItem) {
      return {
        ...row,
        technicalCode: matchedItem.technicalCode,
        headCode: matchedItem.headCode,
        noteCode: matchedItem.noteCode,
        sectionCode: matchedItem.sectionCode,
        displayLabel: getLineItemLabel(matchedItem, constitution),
        entityType: constitution,
        labelSet: config.labelSet
      };
    }
    
    // No match - return row with minimal enhancement
    return {
      ...row,
      technicalCode: `UNMAPPED_${row.H3 || row.H2 || 'UNKNOWN'}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      displayLabel: row.H3 || row.H2 || 'Unmapped',
      entityType: constitution,
      labelSet: config.labelSet
    };
  });
}

/**
 * Export Balance Sheet with Notes (Enhanced Version)
 */
export function exportBalanceSheetWithNotes(
  data: LedgerRow[],
  options: ExportOptions
): XLSX.WorkBook {
  const {
    companyName,
    financialYear,
    constitution,
    bsStartingNote = 3,
    includeMetadata = true,
    includePreviousYear = true,
    previousYearData = []
  } = options;
  
  const config = getEntityConfig(constitution);
  const bsData = data.filter(row => row.H1 === 'Balance Sheet' || row.H1 === 'BS');
  const enhancedData = enhanceLedgerRows(bsData, constitution, 'bs');
  
  // Previous year data
  const prevBsData = includePreviousYear 
    ? enhanceLedgerRows(
        previousYearData.filter(row => row.H1 === 'Balance Sheet' || row.H1 === 'BS'),
        constitution,
        'bs'
      )
    : [];
  
  const workbook = XLSX.utils.book_new();
  
  // ========== MAIN BALANCE SHEET SUMMARY ==========
  const bsSummary: any[] = [];
  const noteCounter: { [key: string]: number } = {};
  let currentNote = bsStartingNote;
  
  // Group by H2 (major sections)
  const h2Groups = enhancedData.reduce((acc: any, row) => {
    const h2 = row.H2 || 'Unmapped';
    if (!acc[h2]) acc[h2] = {
      rows: [],
      technicalCode: row.headCode || row.technicalCode,
      displayLabel: row.H2
    };
    acc[h2].rows.push(row);
    return acc;
  }, {});
  
  // Group previous year data similarly
  const prevH2Groups = includePreviousYear
    ? prevBsData.reduce((acc: any, row) => {
        const h2 = row.H2 || 'Unmapped';
        if (!acc[h2]) acc[h2] = [];
        acc[h2].push(row);
        return acc;
      }, {})
    : {};
  
  // Create summary with note references
  Object.entries(h2Groups).forEach(([h2, group]: [string, any]) => {
    const rows = group.rows;
    const currentTotal = rows.reduce((sum: number, r: any) => sum + (r['Closing Balance'] || 0), 0);
    const prevTotal = includePreviousYear && prevH2Groups[h2]
      ? prevH2Groups[h2].reduce((sum: number, r: any) => sum + (r['Closing Balance'] || 0), 0)
      : 0;
    
    // Assign note number if has H3 (notes)
    const hasNotes = rows.some((r: any) => r.H3 && r.H3.trim());
    const noteNum = hasNotes ? currentNote++ : 0;
    if (hasNotes && noteNum) noteCounter[h2] = noteNum;
    
    const summaryRow: any = {
      'Particulars': h2,
      'Note No.': noteNum ? `Note ${noteNum}` : '',
      'Current Year (₹)': currentTotal
    };
    
    if (includePreviousYear) {
      summaryRow['Previous Year (₹)'] = prevTotal;
    }
    
    // Add metadata columns if requested
    if (includeMetadata) {
      summaryRow['Technical Code'] = group.technicalCode;
      summaryRow['Entity Type'] = config.category;
      summaryRow['Label Set'] = config.labelSet;
    }
    
    bsSummary.push(summaryRow);
  });
  
  // Create main Balance Sheet sheet
  const bsSheet = XLSX.utils.json_to_sheet(bsSummary);
  const colCount = includeMetadata ? 6 : 3 + (includePreviousYear ? 1 : 0);
  const colWidths = includeMetadata
    ? [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }]
    : [{ wch: 40 }, { wch: 15 }, { wch: 20 }, ...(includePreviousYear ? [{ wch: 20 }] : [])];
  bsSheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, bsSheet, 'Balance Sheet');
  
  // ========== DETAILED NOTES SHEETS ==========
  Object.entries(h2Groups).forEach(([h2, group]: [string, any]) => {
    const noteNum = noteCounter[h2];
    if (!noteNum) return;  // Skip if no note number assigned
    
    const rows = group.rows;
    
    // Group by H3 within this H2
    const h3Groups = rows.reduce((acc: any, row: any) => {
      const h3 = row.H3 || 'Others';
      if (!acc[h3]) acc[h3] = [];
      acc[h3].push(row);
      return acc;
    }, {});
    
    const noteData: any[] = [];
    Object.entries(h3Groups).forEach(([h3, items]: [string, any]) => {
      items.forEach((item: any) => {
        const prevBalance = includePreviousYear && prevH2Groups[h2]
          ? prevH2Groups[h2].find((p: any) => p['Ledger Name'] === item['Ledger Name'])?.[' Closing Balance'] || 0
          : 0;
        
        const noteRow: any = {
          'Ledger Name': item['Ledger Name'] || '',
          'H3': h3,
          'H4': item.H4 || '',
          'H5': item.H5 || '',
          'Current Year (₹)': item['Closing Balance'] || 0
        };
        
        if (includePreviousYear) {
          noteRow['Previous Year (₹)'] = prevBalance;
        }
        
        // Add metadata columns
        if (includeMetadata) {
          noteRow['Technical Code'] = item.technicalCode || '';
          noteRow['Section Code'] = item.sectionCode || '';
          noteRow['Note Code'] = item.noteCode || '';
          noteRow['Display Label'] = item.displayLabel || '';
          noteRow['Entity Type'] = item.entityType || '';
          noteRow['Label Set'] = item.labelSet || '';
        }
        
        noteData.push(noteRow);
      });
    });
    
    if (noteData.length > 0) {
      const noteSheet = XLSX.utils.json_to_sheet(noteData);
      const noteColWidths = includeMetadata
        ? [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }]
        : [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, ...(includePreviousYear ? [{ wch: 20 }] : [])];
      noteSheet['!cols'] = noteColWidths;
      
      // Truncate sheet name to 31 chars (Excel limit)
      const sheetName = `Note ${noteNum} - ${h2}`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, noteSheet, sheetName);
    }
  });
  
  // ========== METADATA SHEET (for Power Query/Pivot Tables) ==========
  if (includeMetadata) {
    const metadataSheet = XLSX.utils.json_to_sheet([
      { 'Property': 'Company Name', 'Value': companyName },
      { 'Property': 'Financial Year', 'Value': financialYear },
      { 'Property': 'Entity Type', 'Value': constitution },
      { 'Property': 'Label Set', 'Value': config.labelSet },
      { 'Property': 'Export Date', 'Value': new Date().toISOString() },
      { 'Property': 'Statement Type', 'Value': 'Balance Sheet' }
    ]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Metadata');
  }
  
  return workbook;
}

/**
 * Export Profit & Loss with Notes (Enhanced Version)
 */
export function exportProfitLossWithNotes(
  data: LedgerRow[],
  options: ExportOptions
): XLSX.WorkBook {
  const {
    companyName,
    financialYear,
    constitution,
    plStartingNote = 19,
    includeMetadata = true,
    includePreviousYear = true,
    previousYearData = []
  } = options;
  
  const config = getEntityConfig(constitution);
  const plData = data.filter(row => row.H1 === 'Profit & Loss' || row.H1 === 'P&L' || row.H1 === 'PL');
  const enhancedData = enhanceLedgerRows(plData, constitution, 'pl');
  
  // Previous year data
  const prevPlData = includePreviousYear 
    ? enhanceLedgerRows(
        previousYearData.filter(row => row.H1 === 'Profit & Loss' || row.H1 === 'P&L' || row.H1 === 'PL'),
        constitution,
        'pl'
      )
    : [];
  
  const workbook = XLSX.utils.book_new();
  
  // ========== MAIN P&L SUMMARY ==========
  const plSummary: any[] = [];
  const noteCounter: { [key: string]: number } = {};
  let currentNote = plStartingNote;
  
  // Group by H2
  const h2Groups = enhancedData.reduce((acc: any, row) => {
    const h2 = row.H2 || 'Unmapped';
    if (!acc[h2]) acc[h2] = {
      rows: [],
      technicalCode: row.headCode || row.technicalCode,
      displayLabel: row.H2
    };
    acc[h2].rows.push(row);
    return acc;
  }, {});
  
  // Previous year groups
  const prevH2Groups = includePreviousYear
    ? prevPlData.reduce((acc: any, row) => {
        const h2 = row.H2 || 'Unmapped';
        if (!acc[h2]) acc[h2] = [];
        acc[h2].push(row);
        return acc;
      }, {})
    : {};
  
  // Create summary
  Object.entries(h2Groups).forEach(([h2, group]: [string, any]) => {
    const rows = group.rows;
    const currentTotal = rows.reduce((sum: number, r: any) => sum + Math.abs(r['Closing Balance'] || 0), 0);
    const prevTotal = includePreviousYear && prevH2Groups[h2]
      ? prevH2Groups[h2].reduce((sum: number, r: any) => sum + Math.abs(r['Closing Balance'] || 0), 0)
      : 0;
    
    const hasNotes = rows.some((r: any) => r.H3 && r.H3.trim());
        const noteNum = hasNotes ? currentNote++ : 0;
        if (hasNotes && noteNum) noteCounter[h2] = noteNum;
    const summaryRow: any = {
      'Particulars': h2,
      'Note No.': noteNum ? `Note ${noteNum}` : '',
      'Current Year (₹)': currentTotal
    };
    
    if (includePreviousYear) {
      summaryRow['Previous Year (₹)'] = prevTotal;
    }
    
    if (includeMetadata) {
      summaryRow['Technical Code'] = group.technicalCode;
      summaryRow['Entity Type'] = config.category;
      summaryRow['Label Set'] = config.labelSet;
    }
    
    plSummary.push(summaryRow);
  });
  
  const plSheet = XLSX.utils.json_to_sheet(plSummary);
  const colWidths = includeMetadata
    ? [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }]
    : [{ wch: 40 }, { wch: 15 }, { wch: 20 }, ...(includePreviousYear ? [{ wch: 20 }] : [])];
  plSheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, plSheet, 'Profit & Loss');
  
  // ========== DETAILED NOTES ==========
  Object.entries(h2Groups).forEach(([h2, group]: [string, any]) => {
    const noteNum = noteCounter[h2];
    if (!noteNum) return;
    
    const rows = group.rows;
    const h3Groups = rows.reduce((acc: any, row: any) => {
      const h3 = row.H3 || 'Others';
      if (!acc[h3]) acc[h3] = [];
      acc[h3].push(row);
      return acc;
    }, {});
    
    const noteData: any[] = [];
    Object.entries(h3Groups).forEach(([h3, items]: [string, any]) => {
      items.forEach((item: any) => {
        const prevBalance = includePreviousYear && prevH2Groups[h2]
          ? prevH2Groups[h2].find((p: any) => p['Ledger Name'] === item['Ledger Name'])?.[' Closing Balance'] || 0
          : 0;
        
        const noteRow: any = {
          'Ledger Name': item['Ledger Name'] || '',
          'H3': h3,
          'H4': item.H4 || '',
          'H5': item.H5 || '',
          'Current Year (₹)': Math.abs(item['Closing Balance'] || 0)
        };
        
        if (includePreviousYear) {
          noteRow['Previous Year (₹)'] = Math.abs(prevBalance);
        }
        
        if (includeMetadata) {
          noteRow['Technical Code'] = item.technicalCode || '';
          noteRow['Section Code'] = item.sectionCode || '';
          noteRow['Note Code'] = item.noteCode || '';
          noteRow['Display Label'] = item.displayLabel || '';
          noteRow['Entity Type'] = item.entityType || '';
          noteRow['Label Set'] = item.labelSet || '';
        }
        
        noteData.push(noteRow);
      });
    });
    
    if (noteData.length > 0) {
      const noteSheet = XLSX.utils.json_to_sheet(noteData);
      const noteColWidths = includeMetadata
        ? [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }]
        : [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, ...(includePreviousYear ? [{ wch: 20 }] : [])];
      noteSheet['!cols'] = noteColWidths;
      
      const sheetName = `Note ${noteNum} - ${h2}`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, noteSheet, sheetName);
    }
  });
  
  // ========== METADATA SHEET ==========
  if (includeMetadata) {
    const metadataSheet = XLSX.utils.json_to_sheet([
      { 'Property': 'Company Name', 'Value': companyName },
      { 'Property': 'Financial Year', 'Value': financialYear },
      { 'Property': 'Entity Type', 'Value': constitution },
      { 'Property': 'Label Set', 'Value': config.labelSet },
      { 'Property': 'Export Date', 'Value': new Date().toISOString() },
      { 'Property': 'Statement Type', 'Value': 'Profit & Loss' }
    ]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Metadata');
  }
  
  return workbook;
}

/**
 * Download workbook as file
 */
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename);
}
