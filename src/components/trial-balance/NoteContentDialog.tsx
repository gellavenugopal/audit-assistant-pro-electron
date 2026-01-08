import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CostOfMaterialsConsumedNote } from './CostOfMaterialsConsumedNote';
import { ChangesInInventoriesNote } from './ChangesInInventoriesNote';
import { LedgerAnnexureContent } from './LedgerAnnexureDialog';
import { NoteLedgerItem } from './ScheduleIIIProfitLoss';
import { useState } from 'react';

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
  const [viewTab, setViewTab] = useState<'note' | 'ledgers'>('note');
  
  if (!noteKey) return null;

  const noteConfig = NOTE_COMPONENTS[noteKey];
  const hasNoteComponent = noteConfig && noteConfig.component !== 'ledgerOnly';
  const title = noteConfig?.title || noteKey;

  // Calculate total from ledgers
  const total = ledgers.reduce((sum, l) => sum + Math.abs(l.closingBalance || 0), 0);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `₹${(absAmount / 10000000).toFixed(2)} Cr`;
    } else if (absAmount >= 100000) {
      return `₹${(absAmount / 100000).toFixed(2)} L`;
    }
    return `₹${absAmount.toLocaleString('en-IN')}`;
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
        </DialogHeader>

        {hasNoteComponent ? (
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'note' | 'ledgers')}>
            <TabsList className="mb-4">
              <TabsTrigger value="note">Note View</TabsTrigger>
              <TabsTrigger value="ledgers">Ledger Details ({ledgers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="note" className="mt-0">
              {renderNoteComponent()}
            </TabsContent>
            <TabsContent value="ledgers" className="mt-0">
              <LedgerAnnexureContent
                ledgers={ledgers}
                total={total}
                formatCurrency={formatCurrency}
                onExport={() => {}}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Ledger-wise details showing {ledgers.length} ledger(s) with total of {formatCurrency(total)}
            </p>
            <LedgerAnnexureContent
              ledgers={ledgers}
              total={total}
              formatCurrency={formatCurrency}
              onExport={() => {}}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
