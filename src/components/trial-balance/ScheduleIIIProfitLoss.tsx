import { useMemo, useState } from 'react';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';
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
import { LedgerAnnexureDialog } from './LedgerAnnexureDialog';
import { FileText } from 'lucide-react';

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
  currentLines: TrialBalanceLine[];
  previousLines?: TrialBalanceLine[];
  reportingScale?: string;
  constitution?: string;
  startingNoteNumber?: number;
  stockData?: any[];
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
  noteValues = {},
  noteLedgers = {}
}: Props) {
  // State for annexure dialog
  const [annexureOpen, setAnnexureOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<{
    title: string;
    noteNumber: string;
    ledgers: NoteLedgerItem[];
    total: number;
  } | null>(null);
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}₹${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'hundreds':
        return `${sign}₹${(absAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'thousands':
        return `${sign}₹${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'lakhs':
        return `${sign}₹${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'millions':
        return `${sign}₹${(absAmount / 1000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'crores':
        return `${sign}₹${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'auto':
      default:
        if (absAmount >= 10000000) {
          return `${sign}₹${(absAmount / 10000000).toFixed(2)} Cr`;
        } else if (absAmount >= 100000) {
          return `${sign}₹${(absAmount / 100000).toFixed(2)} L`;
        }
        return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
    }
  };

  const getScaleLabel = () => {
    switch (reportingScale) {
      case 'rupees': return '(Amount in ₹)';
      case 'hundreds': return "(Amount in 100's)";
      case 'thousands': return "(Amount in 1000's)";
      case 'lakhs': return '(Amount in Lakhs)';
      case 'millions': return '(Amount in Millions)';
      case 'crores': return '(Amount in Crores)';
      default: return '';
    }
  };

  const hasPreviousPeriod = previousLines && previousLines.length > 0;
  const formatLabel = getFormatLabel(constitution);
  const plFormat = getProfitLossFormat(constitution);

  // Helper to get amount from lines by fs_area
  const getAmountByFsArea = (lines: TrialBalanceLine[], fsArea: string): number => {
    if (!lines || !Array.isArray(lines)) return 0;
    return lines
      .filter(l => l && l.fs_area === fsArea)
      .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);
  };

  // Calculate Changes in Inventories from stock data
  const changesInInventories = useMemo(() => {
    if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
      console.log('ScheduleIIIProfitLoss: No stock data available');
      return 0;
    }
    
    // Stock values are assets (Dr), so use Math.abs to ensure positive values
    const totalOpening = stockData.reduce((sum, item) => {
      if (!item) return sum;
      return sum + Math.abs(item['Opening Value'] || 0);
    }, 0);
    const totalClosing = stockData.reduce((sum, item) => {
      if (!item) return sum;
      return sum + Math.abs(item['Closing Value'] || 0);
    }, 0);
    const changes = totalOpening - totalClosing;
    
    console.log('ScheduleIIIProfitLoss: Changes in Inventories calculated:', {
      stockItems: stockData.length,
      totalOpening,
      totalClosing,
      changes
    });
    
    return changes; // Opening - Closing
  }, [stockData]);

  // Calculate computed totals
  const currentRevenue = getAmountByFsArea(currentLines, 'Revenue');
  const currentOtherIncome = getAmountByFsArea(currentLines, 'Other Income');
  const currentTotalIncome = currentRevenue + currentOtherIncome;
  
  // Calculate Total Expenses - sum all expense lines
  const expenseLines = (currentLines || []).filter(l => l && (l.aile === 'Expense' || l.note_group === 'Expenses'));
  const currentTotalExpenses = expenseLines.reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);
  
  console.log('ScheduleIIIProfitLoss: Total Expenses:', {
    expenseLineCount: expenseLines.length,
    totalExpenses: currentTotalExpenses,
    sampleLines: expenseLines.slice(0, 3).map(l => ({ name: l.account_name, aile: l.aile, note_group: l.note_group, balance: l.closing_balance }))
  });
  
  const currentPBT = currentTotalIncome - currentTotalExpenses;
  const currentTax = getAmountByFsArea(currentLines, 'Current Tax') + getAmountByFsArea(currentLines, 'Deferred Tax Expense');
  const currentPAT = currentPBT - currentTax;

  const prevRevenue = getAmountByFsArea(previousLines, 'Revenue');
  const prevOtherIncome = getAmountByFsArea(previousLines, 'Other Income');
  const prevTotalIncome = prevRevenue + prevOtherIncome;
  
  const prevTotalExpenses = (previousLines || [])
    .filter(l => l && l.aile === 'Expense')
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);
  
  const prevPBT = prevTotalIncome - prevTotalExpenses;
  const prevTax = getAmountByFsArea(previousLines, 'Current Tax') + getAmountByFsArea(previousLines, 'Deferred Tax Expense');
  const prevPAT = prevPBT - prevTax;

  // Build display items with amounts and note numbers
  const displayItems = useMemo(() => {
    const items: DisplayLineItem[] = [];
    let noteCounter = startingNoteNumber;

    // Map fsArea to noteValues keys
    const fsAreaToNoteKey: Record<string, string> = {
      'Cost of Materials': 'costOfMaterialsConsumed',
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

      // Check for note values first (from computed notes)
      if (formatItem.fsArea) {
        noteKey = fsAreaToNoteKey[formatItem.fsArea];
        
        // Use noteValues if available for this fsArea
        if (noteKey && noteValues[noteKey] !== undefined) {
          currentAmount = noteValues[noteKey] as number;
          console.log(`P&L: Using note value for ${formatItem.fsArea}:`, currentAmount);
        } else if (formatItem.fsArea === 'Inventory Change' || 
            formatItem.particulars.toLowerCase().includes('changes in inventories')) {
          // Use calculated changes in inventories from stock data
          currentAmount = changesInInventories;
          noteKey = 'changesInInventories';
          console.log('P&L: Applying Changes in Inventories:', currentAmount);
        } else {
          // Fall back to trial balance lines
          currentAmount = getAmountByFsArea(currentLines, formatItem.fsArea);
          previousAmount = getAmountByFsArea(previousLines, formatItem.fsArea);
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
  }, [plFormat, currentLines, previousLines, startingNoteNumber, currentTotalIncome, prevTotalIncome, currentTotalExpenses, prevTotalExpenses, currentPBT, prevPBT, currentPAT, prevPAT, changesInInventories, noteValues]);

  const handleNoteClick = (noteKey: string) => {
    if (noteKey && noteLedgers[noteKey] && noteLedgers[noteKey].length > 0) {
      setSelectedNote(noteKey);
      setAnnexureOpen(true);
    }
  };

  const renderRow = (item: DisplayLineItem, index: number) => {
    const isHeader = item.level === 0 || (item.level === 1 && !item.srNo);
    const isChangesInInventories = item.particulars.toLowerCase().includes('changes in inventories');
    const showAmount = item.fsArea || item.isTotal || item.particulars.includes('Profit') || item.particulars.includes('Total') || isChangesInInventories;
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
        )} style={{ paddingLeft: item.level > 1 ? `${(item.level - 1) * 1}rem` : undefined }}>
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
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Statement of Profit and Loss</h2>
        <p className="text-sm text-muted-foreground">{formatLabel}</p>
        {reportingScale !== 'auto' && (
          <p className="text-xs text-muted-foreground mt-1">{getScaleLabel()}</p>
        )}
      </div>

      <div className="audit-card p-0 overflow-hidden">
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

      {/* Ledger Annexure Dialog */}
      <LedgerAnnexureDialog
        open={annexureOpen}
        onOpenChange={setAnnexureOpen}
        noteKey={selectedNote}
        ledgers={selectedNote ? noteLedgers[selectedNote] || [] : []}
      />
    </div>
  );
}
