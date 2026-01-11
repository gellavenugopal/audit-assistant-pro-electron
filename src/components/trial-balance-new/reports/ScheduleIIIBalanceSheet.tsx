/**
 * Schedule III Balance Sheet Component
 * MIGRATION NOTE: Refactored to consume ONLY the unified ClassifiedLedger model (LedgerRow)
 * from trial-balance-new. NO dependencies on old TrialBalanceLine, fs_area, or aile.
 */

import { useMemo, useState } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  getBalanceSheetFormat,
  getFormatLabel,
  FSLineItem,
} from '@/data/financialStatementFormats';
import { NoteContentDialog } from './NoteContentDialog';
import { FileText } from 'lucide-react';
import { formatCurrency as sharedFormatCurrency, getScaleLabel, ReportingScale } from '@/lib/formatters/currency';

// Types for note values and ledger data
interface NoteLedgerItem {
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  classification?: string;
}

type NoteLedgersMap = {
  [noteKey: string]: NoteLedgerItem[];
};

type BSNoteValues = {
  [key: string]: number | undefined;
};

interface Props {
  currentLines: LedgerRow[];  // Changed from TrialBalanceLine to LedgerRow
  previousLines?: LedgerRow[]; // Changed from TrialBalanceLine to LedgerRow
  reportingScale?: ReportingScale;
  constitution?: string;
  startingNoteNumber?: number;
  noteValues?: BSNoteValues;
  noteLedgers?: NoteLedgersMap;
}

interface DisplayLineItem extends FSLineItem {
  currentAmount: number;
  previousAmount: number;
  displayNoteNo?: string;
  noteKey?: string;
}

export function ScheduleIIIBalanceSheet({ 
  currentLines, 
  previousLines = [], 
  reportingScale = 'auto',
  constitution = 'company',
  startingNoteNumber = 3,
  noteValues = {},
  noteLedgers = {}
}: Props) {
  // State for annexure dialog
  const [annexureOpen, setAnnexureOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  const formatCurrency = (amount: number) => sharedFormatCurrency(amount, reportingScale, { includeSymbol: true });

  const hasPreviousPeriod = previousLines && previousLines.length > 0;
  const formatLabel = getFormatLabel(constitution);
  const bsFormat = getBalanceSheetFormat(constitution);

  // Map fsArea to noteKey
  const fsAreaToNoteKey: Record<string, string> = {
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

  // Helper to get amount from lines by H2/H3 classification (replaces fs_area)
  const getAmountByH2H3 = (lines: LedgerRow[], h2Value: string, h3Value?: string): number => {
    if (!lines || !Array.isArray(lines)) return 0;
    return lines
      .filter(l => {
        if (!l) return false;
        const matchH1 = l['H1'] === 'Balance Sheet';
        const matchH2 = l['H2'] === h2Value;
        const matchH3 = h3Value ? l['H3'] === h3Value : true;
        return matchH1 && matchH2 && matchH3;
      })
      .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);
  };

  // Build display items with amounts and note numbers
  const displayItems = useMemo(() => {
    const items: DisplayLineItem[] = [];
    let noteCounter = startingNoteNumber;

    bsFormat.forEach(formatItem => {
      let currentAmount = 0;
      let previousAmount = 0;
      let noteKey: string | undefined;

      if (formatItem.fsArea) {
        noteKey = fsAreaToNoteKey[formatItem.fsArea];
        
        // Use noteValues if available (primary source)
        if (noteKey && noteValues[noteKey] !== undefined) {
          currentAmount = noteValues[noteKey] as number;
        } else if (formatItem.fsArea) {
          // Fall back to H2 classification (no longer using fs_area field)
          // Map fsArea to H2 values for fallback calculation
          const h2Map: Record<string, string> = {
            'Cash': 'Cash and cash equivalents',
            'Receivables': 'Trade receivables',
            'Inventory': 'Inventories',
            'Fixed Assets': 'Property, plant and equipment',
            'Payables': 'Trade payables',
            'Borrowings': 'Borrowings',
            'Equity': 'Equity share capital',
            // Add more mappings as needed
          };
          const h2Value = h2Map[formatItem.fsArea];
          if (h2Value) {
            currentAmount = getAmountByH2H3(currentLines, h2Value);
            previousAmount = getAmountByH2H3(previousLines, h2Value);
          }
        }
      }
      
      // Only assign note number if there's a value in either period and it has an fsArea
      let displayNoteNo: string | undefined;
      if (formatItem.fsArea && (currentAmount > 0 || previousAmount > 0)) {
        displayNoteNo = noteCounter.toString();
        noteCounter++;
      }

      items.push({
        ...formatItem,
        currentAmount,
        previousAmount,
        displayNoteNo,
        noteKey,
      });
    });

    return items;
  }, [bsFormat, currentLines, previousLines, startingNoteNumber, noteValues]);

  // Calculate totals using H1 classification instead of aile
  const totalAssets = (currentLines || [])
    .filter(l => l && l['H1'] === 'Balance Sheet' && 
      ((l['H2'] || '').toLowerCase().includes('asset') || 
       (l['H2'] || '').includes('Property') ||
       (l['H2'] || '').includes('Inventories') ||
       (l['H2'] || '').includes('receivable')))
    .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);
  
  const totalLiabilities = (currentLines || [])
    .filter(l => l && l['H1'] === 'Balance Sheet' && 
      ((l['H2'] || '').toLowerCase().includes('liabilit') || 
       (l['H2'] || '').includes('Equity') ||
       (l['H2'] || '').includes('payable') ||
       (l['H2'] || '').includes('Borrowings')))
    .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);

  const prevTotalAssets = (previousLines || [])
    .filter(l => l && l['H1'] === 'Balance Sheet' && 
      ((l['H2'] || '').toLowerCase().includes('asset') || 
       (l['H2'] || '').includes('Property') ||
       (l['H2'] || '').includes('Inventories') ||
       (l['H2'] || '').includes('receivable')))
    .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);
  
  const prevTotalLiabilities = (previousLines || [])
    .filter(l => l && l['H1'] === 'Balance Sheet' && 
      ((l['H2'] || '').toLowerCase().includes('liabilit') || 
       (l['H2'] || '').includes('Equity') ||
       (l['H2'] || '').includes('payable') ||
       (l['H2'] || '').includes('Borrowings')))
    .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);

  const handleNoteClick = (noteKey: string) => {
    if (noteKey && noteLedgers[noteKey] && noteLedgers[noteKey].length > 0) {
      setSelectedNote(noteKey);
      setAnnexureOpen(true);
    }
  };

  const renderRow = (item: DisplayLineItem, index: number) => {
    const isHeader = item.level === 0 || item.level === 1;
    const showAmount = item.fsArea || item.isTotal;
    const hasAnnexure = item.noteKey && noteLedgers[item.noteKey] && noteLedgers[item.noteKey].length > 0;
    
    return (
      <TableRow key={index} className={cn(
        isHeader && !item.isTotal && 'bg-muted/50',
        item.isTotal && 'font-semibold border-t-2'
      )}>
        <TableCell className="w-16 text-center">
          {item.srNo}
        </TableCell>
        <TableCell className={cn(
          'py-2',
          isHeader && 'font-semibold text-primary'
        )} style={{ paddingLeft: item.level > 0 ? `${item.level * 1}rem` : undefined }}>
          {item.particulars}
        </TableCell>
        <TableCell className="text-center w-16">
          {item.displayNoteNo && hasAnnexure ? (
            <button
              onClick={() => handleNoteClick(item.noteKey!)}
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline font-medium"
              title="Click to view ledger-wise annexure"
            >
              {item.displayNoteNo}
              <FileText className="h-3 w-3" />
            </button>
          ) : (
            item.displayNoteNo
          )}
        </TableCell>
        <TableCell className="text-right font-mono w-32">
          {showAmount ? formatCurrency(item.currentAmount) : ''}
        </TableCell>
        {hasPreviousPeriod && (
          <TableCell className="text-right font-mono text-muted-foreground w-32">
            {showAmount ? formatCurrency(item.previousAmount) : ''}
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-center mb-2">
        <h2 className="text-base font-semibold">Balance Sheet</h2>
        <p className="text-xs text-muted-foreground">{formatLabel}</p>
        {reportingScale !== 'auto' && (
          <p className="text-[10px] text-muted-foreground">{getScaleLabel(reportingScale)}</p>
        )}
      </div>

      <div className="border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Sr. No.</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-center w-16">Note</TableHead>
                <TableHead className="text-right w-32">Current Period</TableHead>
                {hasPreviousPeriod && (
                  <TableHead className="text-right w-32">Previous Period</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item, i) => renderRow(item, i))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Balance Check */}
      <div className={cn(
        "p-4 rounded-lg text-center",
        Math.abs(totalAssets - totalLiabilities) < 1 
          ? "bg-success/10 text-success" 
          : "bg-destructive/10 text-destructive"
      )}>
        <p className="font-medium">
          {Math.abs(totalAssets - totalLiabilities) < 1 
            ? '✓ Balance Sheet is balanced' 
            : `⚠ Difference: ${formatCurrency(totalAssets - totalLiabilities)}`}
        </p>
        <p className="text-sm mt-1">
          Total Assets: {formatCurrency(totalAssets)} | Total Liabilities: {formatCurrency(totalLiabilities)}
        </p>
      </div>

      {/* Note Content Dialog */}
      <NoteContentDialog
        open={annexureOpen}
        onOpenChange={setAnnexureOpen}
        noteKey={selectedNote || ''}
        noteNumber=""
        ledgers={selectedNote ? noteLedgers[selectedNote] || [] : []}
        stockData={[]}
        ledgerData={currentLines}
        reportingScale={reportingScale}
      />
    </div>
  );
}
