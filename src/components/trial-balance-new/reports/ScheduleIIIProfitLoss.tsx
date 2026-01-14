/**
 * Schedule III Profit & Loss Statement Component
 * MIGRATION NOTE: Refactored to consume ONLY the unified ClassifiedLedger model (LedgerRow)
 * from trial-balance-new. NO dependencies on old TrialBalanceLine, fs_area, or aile.
 * All data comes from:
 * - noteValues (computed from H2/H3 classification)
 * - noteLedgers (ledger annexures with H1-H5 classification)
 * - LedgerRow[] (for any additional period comparison if needed)
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getProfitLossFormat,
  getFormatLabel,
  FSLineItem,
} from '@/data/financialStatementFormats';
import { NoteContentDialog } from './NoteContentDialog';
import { FileText } from 'lucide-react';
import { formatCurrency as sharedFormatCurrency, getScaleLabel, ReportingScale } from '@/lib/formatters/currency';

// Note values that can be passed from computed notes
export interface NoteValues {
  costOfMaterialsConsumed?: number;
  changesInInventories?: number;
  employeeBenefits?: number;
  financeCosts?: number;
  depreciation?: number;
  otherExpenses?: number;
  [key: string]: number | undefined;
}

// Ledger item for annexure
export interface NoteLedgerItem {
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  classification?: string;
}

// Note ledgers mapping
export interface NoteLedgersMap {
  [noteKey: string]: NoteLedgerItem[];
}

interface Props {
  currentLines: LedgerRow[];  // Changed from TrialBalanceLine to LedgerRow
  previousLines?: LedgerRow[]; // Changed from TrialBalanceLine to LedgerRow
  reportingScale?: ReportingScale;
  constitution?: string;
  startingNoteNumber?: number;
  stockData?: any[];
  ledgerData?: any[];  // Ledger rows for notes like Cost of Materials
  noteValues?: NoteValues;
  noteLedgers?: NoteLedgersMap;
}

interface DisplayLineItem extends FSLineItem {
  currentAmount: number;
  previousAmount: number;
  displayNoteNo?: string;
  noteKey?: string; // Key for looking up ledgers
}

export function ScheduleIIIProfitLoss({ 
  currentLines, 
  previousLines = [], 
  reportingScale = 'auto',
  constitution = 'company',
  startingNoteNumber = 19,
  stockData = [],
  ledgerData = [],
  noteValues = {},
  noteLedgers = {}
}: Props) {
  // State for note dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedNoteKey, setSelectedNoteKey] = useState<string | null>(null);
  const [selectedNoteNumber, setSelectedNoteNumber] = useState<string>('');

  const formatCurrency = (amount: number) => sharedFormatCurrency(amount, reportingScale, { includeSymbol: true });

  const hasPreviousPeriod = previousLines && previousLines.length > 0;
  const formatLabel = getFormatLabel(constitution);
  const plFormat = getProfitLossFormat(constitution);

  // Helper to get amount from lines by H2 classification (replaces fs_area)
  // This is a FALLBACK only - primary source should be noteValues
  const getAmountByH2 = (lines: LedgerRow[], h2Value: string): number => {
    if (!lines || !Array.isArray(lines)) return 0;
    return lines
      .filter(l => l && l['H2'] === h2Value && l['H1'] === 'Profit and Loss')
      .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);
  };

  // Helper to get amount for tax items (Current Tax, Deferred Tax)
  const getTaxAmount = (lines: LedgerRow[]): number => {
    if (!lines || !Array.isArray(lines)) return 0;
    return lines
      .filter(l => l && l['H1'] === 'Profit and Loss' && (
        (l['H2'] || '').toLowerCase().includes('tax') ||
        (l['H3'] || '').toLowerCase().includes('current tax') ||
        (l['H3'] || '').toLowerCase().includes('deferred tax')
      ))
      .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);
  };

  // Calculate computed totals - Use note values when available, fallback to H2 classification
  const currentRevenue = noteValues.revenueFromOperations ?? getAmountByH2(currentLines, 'Revenue from operations');
  const currentOtherIncome = noteValues.otherIncome ?? getAmountByH2(currentLines, 'Other income');
  const currentTotalIncome = currentRevenue + currentOtherIncome;
  
  // Calculate Total Expenses from note values
  const currentCostOfMaterials = noteValues.costOfMaterialsConsumed ?? 0;
  const currentPurchases = noteValues.purchasesOfStockInTrade ?? 0;
  const currentChangesInInventories = noteValues.changesInInventories ?? 0;
  const currentEmployeeBenefits = noteValues.employeeBenefits ?? 0;
  const currentFinanceCosts = noteValues.financeCosts ?? 0;
  const currentDepreciation = noteValues.depreciation ?? 0;
  const currentOtherExpenses = noteValues.otherExpenses ?? 0;
  
  // Sum all expense note values
  const currentTotalExpenses = 
    currentCostOfMaterials +
    currentPurchases +
    currentChangesInInventories +
    currentEmployeeBenefits +
    currentFinanceCosts +
    currentDepreciation +
    currentOtherExpenses;
  
  console.log('ScheduleIIIProfitLoss: P&L populated from note values:', {
    revenue: currentRevenue,
    otherIncome: currentOtherIncome,
    costOfMaterials: currentCostOfMaterials,
    purchases: currentPurchases,
    changesInInventories: currentChangesInInventories,
    employeeBenefits: currentEmployeeBenefits,
    financeCosts: currentFinanceCosts,
    depreciation: currentDepreciation,
    otherExpenses: currentOtherExpenses,
    totalExpenses: currentTotalExpenses
  });
  
  const currentPBT = currentTotalIncome - currentTotalExpenses;
  const currentTax = getTaxAmount(currentLines);
  const currentPAT = currentPBT - currentTax;

  const prevRevenue = getAmountByH2(previousLines, 'Revenue from operations');
  const prevOtherIncome = getAmountByH2(previousLines, 'Other income');
  const prevTotalIncome = prevRevenue + prevOtherIncome;
  
  // For previous period, sum all expense H2 categories
  const prevTotalExpenses = (previousLines || [])
    .filter(l => l && l['H1'] === 'Profit and Loss' && 
      ((l['H2'] || '').toLowerCase().includes('expense') || 
       (l['H2'] || '').toLowerCase().includes('cost')))
    .reduce((sum, l) => sum + Math.abs(Number(l['Closing Balance'] || 0)), 0);
  
  const prevPBT = prevTotalIncome - prevTotalExpenses;
  const prevTax = getTaxAmount(previousLines);
  const prevPAT = prevPBT - prevTax;

  // Build display items with amounts and note numbers
  const displayItems = useMemo(() => {
    const items: DisplayLineItem[] = [];
    let noteCounter = startingNoteNumber;

    // Map fsArea to noteValues keys - includes both Income and Expense items
    // NOTE: fsArea is still used in the format definition, but we map it to noteValues
    // which are computed from H2/H3 classification, NOT from old trial balance
    const fsAreaToNoteKey: Record<string, string> = {
      // Income items
      'Revenue': 'revenueFromOperations',
      'Other Income': 'otherIncome',
      // Expense items
      'Cost of Materials': 'costOfMaterialsConsumed',
      'Purchases': 'purchasesOfStockInTrade',
      'Inventory Change': 'changesInInventories',
      'Employee Benefits': 'employeeBenefits',
      'Finance': 'financeCosts',
      'Depreciation': 'depreciation',
      'Other Expenses': 'otherExpenses',
    };

    plFormat.forEach(formatItem => {
      let currentAmount = 0;
      let previousAmount = 0;
      let noteKey: string | undefined;

      // Check for note values first (from computed notes) - ALWAYS USE NOTE VALUES when available
      if (formatItem.fsArea) {
        noteKey = fsAreaToNoteKey[formatItem.fsArea];
        
        // PRIORITY: ONLY use noteValues from computed notes for these items
        // Do NOT fall back to trial balance for these calculated items
        if (noteKey && noteValues[noteKey] !== undefined && noteValues[noteKey] !== null) {
          currentAmount = noteValues[noteKey] as number;
          console.log(`P&L: Using note value for ${formatItem.fsArea}:`, currentAmount, `(noteKey: ${noteKey})`);
        } else if (noteKey && ['costOfMaterialsConsumed', 'changesInInventories', 'purchasesOfStockInTrade'].includes(noteKey)) {
          // These items MUST come from noteValues only - no trial balance fallback
          currentAmount = 0;
          console.log(`P&L: WARNING - No note value found for ${formatItem.fsArea} (${noteKey}), using 0`);
        } else if (formatItem.fsArea) {
          // Fall back to H2 classification only for simple items (not calculated notes)
          const h2Map: Record<string, string> = {
            'Revenue': 'Revenue from operations',
            'Other Income': 'Other income',
            'Employee Benefits': 'Employee benefits expense',
            'Finance': 'Finance costs',
            'Depreciation': 'Depreciation and amortization expense',
            'Other Expenses': 'Other expenses',
          };
          const h2Value = h2Map[formatItem.fsArea];
          if (h2Value) {
            currentAmount = getAmountByH2(currentLines, h2Value);
            previousAmount = getAmountByH2(previousLines, h2Value);
            console.log(`P&L: Using H2 classification for ${formatItem.fsArea}:`, currentAmount);
          }
        }
      } else if (formatItem.particulars.includes('Total Income')) {
        currentAmount = currentTotalIncome;
        previousAmount = prevTotalIncome;
      } else if (formatItem.particulars.includes('Total expenses')) {
        currentAmount = currentTotalExpenses;
        previousAmount = prevTotalExpenses;
      } else if (formatItem.particulars.includes('Profit/(loss) before exceptional') || 
                 formatItem.particulars.includes('Profit/(loss) before tax') ||
                 formatItem.particulars.includes('Profit before tax')) {
        currentAmount = currentPBT;
        previousAmount = prevPBT;
      } else if (formatItem.particulars.includes('Profit/(Loss) for the period') ||
                 formatItem.particulars.includes('Profit/(Loss) for the year') ||
                 formatItem.particulars.includes('Profit for the Period')) {
        currentAmount = currentPAT;
        previousAmount = prevPAT;
      }

      // Only assign note number if there's a value in either period and it has an fsArea
      let displayNoteNo: string | undefined;
      if (formatItem.fsArea && (currentAmount !== 0 || previousAmount !== 0)) {
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
  }, [plFormat, currentLines, previousLines, startingNoteNumber, currentTotalIncome, prevTotalIncome, currentTotalExpenses, prevTotalExpenses, currentPBT, prevPBT, currentPAT, prevPAT, noteValues]);

  // Store note number mapping for click handler
  const noteNumberMap = useMemo(() => {
    const map: Record<string, string> = {};
    displayItems.forEach(item => {
      if (item.noteKey && item.displayNoteNo) {
        map[item.noteKey] = item.displayNoteNo;
      }
    });
    return map;
  }, [displayItems]);

  const handleNoteClick = (noteKey: string) => {
    if (noteKey) {
      setSelectedNoteKey(noteKey);
      setSelectedNoteNumber(noteNumberMap[noteKey] || '');
      setNoteDialogOpen(true);
    }
  };

  const renderRow = (item: DisplayLineItem, index: number) => {
    const isHeader = item.level === 0 || (item.level === 1 && !item.srNo);
    const isChangesInInventories = item.particulars.toLowerCase().includes('changes in inventories');
    const showAmount = item.fsArea || item.isTotal || item.particulars.includes('Profit') || item.particulars.includes('Total') || isChangesInInventories;
    // Note is clickable if it has a noteKey (either has prepared Note component or ledger data)
    const hasNoteData = item.noteKey && (
      ['costOfMaterialsConsumed', 'changesInInventories', 'purchasesOfStockInTrade', 'employeeBenefits', 'financeCosts', 'depreciation', 'otherExpenses'].includes(item.noteKey) || // Has prepared component
      (noteLedgers[item.noteKey] && noteLedgers[item.noteKey].length > 0) // Has ledger data
    );
    
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
        )} style={{ paddingLeft: item.level > 1 ? `${(item.level - 1) * 1}rem` : undefined }}>
          {item.particulars}
        </TableCell>
        <TableCell className="text-center w-16">
          {item.displayNoteNo && hasNoteData ? (
            <button
              onClick={() => handleNoteClick(item.noteKey!)}
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline font-medium"
              title="Click to view note details"
            >
              {item.displayNoteNo}
              <FileText className="h-3 w-3" />
            </button>
          ) : (
            item.displayNoteNo
          )}
        </TableCell>
        <TableCell className={cn(
          "text-right font-mono w-32",
          item.isTotal && item.particulars.includes('Profit') && (item.currentAmount >= 0 ? 'text-success' : 'text-destructive')
        )}>
          {showAmount ? formatCurrency(item.currentAmount) : ''}
        </TableCell>
        {hasPreviousPeriod && (
          <TableCell className={cn(
            "text-right font-mono text-muted-foreground w-32",
            item.isTotal && item.particulars.includes('Profit') && (item.previousAmount >= 0 ? 'text-success' : 'text-destructive')
          )}>
            {showAmount ? formatCurrency(item.previousAmount) : ''}
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-center mb-2">
        <h2 className="text-base font-semibold">Statement of Profit and Loss</h2>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="audit-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(currentTotalIncome)}</p>
          {hasPreviousPeriod && (
            <p className="text-sm text-muted-foreground">Prev: {formatCurrency(prevTotalIncome)}</p>
          )}
        </div>
        <div className="audit-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(currentTotalExpenses)}</p>
          {hasPreviousPeriod && (
            <p className="text-sm text-muted-foreground">Prev: {formatCurrency(prevTotalExpenses)}</p>
          )}
        </div>
        <div className="audit-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net Profit</p>
          <p className={cn(
            "text-2xl font-bold mt-1",
            currentPAT >= 0 ? 'text-success' : 'text-destructive'
          )}>{formatCurrency(currentPAT)}</p>
          {hasPreviousPeriod && (
            <p className={cn(
              "text-sm",
              prevPAT >= 0 ? 'text-success' : 'text-destructive'
            )}>Prev: {formatCurrency(prevPAT)}</p>
          )}
        </div>
      </div>

      {/* Note Content Dialog - shows Note component for prepared notes, or ledger details for others */}
      <NoteContentDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        noteKey={selectedNoteKey}
        noteNumber={selectedNoteNumber}
        ledgers={selectedNoteKey ? noteLedgers[selectedNoteKey] || [] : []}
        stockData={stockData}
        ledgerData={ledgerData}
        reportingScale={reportingScale}
      />
    </div>
  );
}
