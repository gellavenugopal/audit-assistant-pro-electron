import { useMemo } from 'react';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';
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

interface Props {
  currentLines: TrialBalanceLine[];
  previousLines?: TrialBalanceLine[];
  reportingScale?: string;
  constitution?: string;
  startingNoteNumber?: number;
}

interface DisplayLineItem extends FSLineItem {
  currentAmount: number;
  previousAmount: number;
  displayNoteNo?: string;
}

export function ScheduleIIIBalanceSheet({ 
  currentLines, 
  previousLines = [], 
  reportingScale = 'auto',
  constitution = 'company',
  startingNoteNumber = 3
}: Props) {
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
  const bsFormat = getBalanceSheetFormat(constitution);

  // Helper to get amount from lines by fs_area
  const getAmountByFsArea = (lines: TrialBalanceLine[], fsArea: string): number => {
    if (!lines || !Array.isArray(lines)) return 0;
    return lines
      .filter(l => l && l.fs_area === fsArea)
      .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);
  };

  // Build display items with amounts and note numbers
  const displayItems = useMemo(() => {
    const items: DisplayLineItem[] = [];
    let noteCounter = startingNoteNumber;

    bsFormat.forEach(formatItem => {
      const currentAmount = formatItem.fsArea 
        ? getAmountByFsArea(currentLines, formatItem.fsArea) 
        : 0;
      const previousAmount = formatItem.fsArea 
        ? getAmountByFsArea(previousLines, formatItem.fsArea) 
        : 0;
      
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
      });
    });

    return items;
  }, [bsFormat, currentLines, previousLines, startingNoteNumber]);

  // Calculate totals
  const totalAssets = (currentLines || [])
    .filter(l => l && l.aile === 'Asset')
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);
  
  const totalLiabilities = (currentLines || [])
    .filter(l => l && l.aile === 'Liability')
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);

  const prevTotalAssets = (previousLines || [])
    .filter(l => l && l.aile === 'Asset')
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);
  
  const prevTotalLiabilities = (previousLines || [])
    .filter(l => l && l.aile === 'Liability')
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance || 0)), 0);

  const renderRow = (item: DisplayLineItem, index: number) => {
    const isHeader = item.level === 0 || item.level === 1;
    const showAmount = item.fsArea || item.isTotal;
    
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
          {item.displayNoteNo}
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
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Balance Sheet</h2>
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
    </div>
  );
}
