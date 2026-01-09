import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CostOfMaterialsConsumedNote } from './pl-notes/CostOfMaterialsConsumedNote';
import { ChangesInInventoriesNote } from './pl-notes/ChangesInInventoriesNote';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NoteLedgerItem } from './ScheduleIIIProfitLoss';

interface StockItem {
  'Item Name': string;
  'Stock Group': string;
  'Primary Group': string;
  'Opening Value': number;
  'Closing Value': number;
  'Stock Category': string;
  'Composite Key': string;
}

interface LedgerRow {
  'Ledger Name': string;
  'H3'?: string;
  'Opening Balance'?: number;
  'Closing Balance'?: number;
  [key: string]: string | number | undefined;
}

// Note configuration - maps note keys to their components and titles
const NOTE_COMPONENTS: Record<string, {
  title: string;
  component: 'costOfMaterialsConsumed' | 'changesInInventories' | 'ledgerOnly';
}> = {
  costOfMaterialsConsumed: {
    title: 'Cost of materials consumed',
    component: 'costOfMaterialsConsumed',
  },
  changesInInventories: {
    title: 'Changes in inventories of finished goods, work-in-progress and stock-in-trade',
    component: 'changesInInventories',
  },
  // Notes without prepared components - show ledger-wise details
  employeeBenefits: {
    title: 'Employee benefits expense',
    component: 'ledgerOnly',
  },
  financeCosts: {
    title: 'Finance costs',
    component: 'ledgerOnly',
  },
  depreciation: {
    title: 'Depreciation and amortization expense',
    component: 'ledgerOnly',
  },
  otherExpenses: {
    title: 'Other expenses',
    component: 'ledgerOnly',
  },
  revenueFromOperations: {
    title: 'Revenue from operations',
    component: 'ledgerOnly',
  },
  otherIncome: {
    title: 'Other income',
    component: 'ledgerOnly',
  },
  purchasesOfStockInTrade: {
    title: 'Purchases of stock-in-trade',
    component: 'ledgerOnly',
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteKey: string | null;
  noteNumber: string;
  ledgers: NoteLedgerItem[];
  stockData: StockItem[];
  ledgerData: LedgerRow[];
  reportingScale?: string;
}

export function NoteContentDialog({
  open,
  onOpenChange,
  noteKey,
  noteNumber,
  ledgers,
  stockData,
  ledgerData,
  reportingScale = 'auto',
}: Props) {
  if (!noteKey) return null;

  const noteConfig = NOTE_COMPONENTS[noteKey];
  const hasNoteComponent = noteConfig && noteConfig.component !== 'ledgerOnly';
  const title = noteConfig?.title || noteKey;

  // Calculate total from ledgers
  const total = ledgers.reduce((sum, l) => sum + Math.abs(l.closingBalance || 0), 0);

  const getScaleLabel = () => {
    switch (reportingScale) {
      case 'rupees': return '(Amount in ₹)';
      case 'thousands': return '(Amount in ₹ Thousands)';
      case 'lakhs': return '(Amount in ₹ Lakhs)';
      case 'crores': return '(Amount in ₹ Crores)';
      case 'auto': return '(Auto Scale)';
      default: return '';
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}₹${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'thousands':
        return `${sign}₹${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'lakhs':
        return `${sign}₹${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const renderNoteComponent = () => {
    switch (noteConfig?.component) {
      case 'costOfMaterialsConsumed':
        return (
          <CostOfMaterialsConsumedNote
            stockData={stockData}
            ledgerData={ledgerData}
            reportingScale={reportingScale}
            noteNumber={noteNumber}
          />
        );
      case 'changesInInventories':
        return (
          <ChangesInInventoriesNote
            stockData={stockData}
            reportingScale={reportingScale}
            noteNumber={noteNumber}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded">
              Note {noteNumber}
            </span>
            {title}
          </DialogTitle>
          {reportingScale && reportingScale !== 'auto' && (
            <p className="text-xs text-muted-foreground">{getScaleLabel()}</p>
          )}
        </DialogHeader>

        {hasNoteComponent ? (
          renderNoteComponent()
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Ledger-wise details showing {ledgers.length} ledger(s) with total of {formatCurrency(total)}
            </p>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ledger Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.map((ledger, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{ledger.ledgerName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{ledger.groupName}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(ledger.openingBalance)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(ledger.closingBalance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold border-t-2">
                    <TableCell colSpan={3} className="text-right">Total:</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
