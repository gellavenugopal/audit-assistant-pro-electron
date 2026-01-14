import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CostOfMaterialsConsumedNote } from './pl-notes/CostOfMaterialsConsumedNote';
import { ChangesInInventoriesNote } from './pl-notes/ChangesInInventoriesNote';
import { getScaleLabel, ReportingScale } from '@/lib/formatters/currency';
import { GenericLedgerNote } from '@/components/notes/GenericLedgerNote';
import { NoteHeader } from '@/components/notes/NoteHeader';
import { NoteLedgerItem, StockItem, LedgerRowBasic as LedgerRow } from '@/types/financialStatements';

interface LedgerRowWithH3 extends LedgerRow {
  'H3'?: string;
}

// Note configuration - maps note keys to their components and titles
const NOTE_COMPONENTS: Record<string, {
  title: string;
  component: 'costOfMaterialsConsumed' | 'changesInInventories' | 'ledgerOnly';
}> = {
  // P&L Notes with custom components
  costOfMaterialsConsumed: {
    title: 'Cost of materials consumed',
    component: 'costOfMaterialsConsumed',
  },
  changesInInventories: {
    title: 'Changes in inventories of finished goods, work-in-progress and stock-in-trade',
    component: 'changesInInventories',
  },
  // P&L Notes - ledger-wise details only
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
  // Balance Sheet Notes - Equity & Liabilities
  equity: {
    title: 'Share capital',
    component: 'ledgerOnly',
  },
  reserves: {
    title: 'Reserves and surplus',
    component: 'ledgerOnly',
  },
  shareWarrants: {
    title: 'Share warrants',
    component: 'ledgerOnly',
  },
  shareApplication: {
    title: 'Share application money pending allotment',
    component: 'ledgerOnly',
  },
  borrowings: {
    title: 'Long-term borrowings',
    component: 'ledgerOnly',
  },
  deferredTax: {
    title: 'Deferred tax liabilities (Net)',
    component: 'ledgerOnly',
  },
  otherLongTerm: {
    title: 'Other long-term liabilities',
    component: 'ledgerOnly',
  },
  provisions: {
    title: 'Long-term provisions',
    component: 'ledgerOnly',
  },
  shortTermBorrowings: {
    title: 'Short-term borrowings',
    component: 'ledgerOnly',
  },
  payablesMSME: {
    title: 'Trade payables - MSME',
    component: 'ledgerOnly',
  },
  payables: {
    title: 'Trade payables - Others',
    component: 'ledgerOnly',
  },
  otherCurrentLiabilities: {
    title: 'Other current liabilities',
    component: 'ledgerOnly',
  },
  provisionsCurrent: {
    title: 'Short-term provisions',
    component: 'ledgerOnly',
  },
  // Balance Sheet Notes - Assets
  fixedAssets: {
    title: 'Property, Plant and Equipment',
    component: 'ledgerOnly',
  },
  intangibleAssets: {
    title: 'Intangible assets',
    component: 'ledgerOnly',
  },
  cwip: {
    title: 'Capital work-in-progress',
    component: 'ledgerOnly',
  },
  intangibleUnderDev: {
    title: 'Intangible assets under development',
    component: 'ledgerOnly',
  },
  investments: {
    title: 'Non-current investments',
    component: 'ledgerOnly',
  },
  deferredTaxAsset: {
    title: 'Deferred tax assets (Net)',
    component: 'ledgerOnly',
  },
  otherNonCurrent: {
    title: 'Other non-current assets',
    component: 'ledgerOnly',
  },
  currentInvestments: {
    title: 'Current investments',
    component: 'ledgerOnly',
  },
  inventory: {
    title: 'Inventories',
    component: 'ledgerOnly',
  },
  receivables: {
    title: 'Trade receivables',
    component: 'ledgerOnly',
  },
  cash: {
    title: 'Cash and cash equivalents',
    component: 'ledgerOnly',
  },
  otherCurrent: {
    title: 'Short-term loans and advances',
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
  ledgerData: LedgerRowWithH3[];
  reportingScale?: ReportingScale;
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
          <NoteHeader
            noteNumber={noteNumber}
            title={title}
            scaleLabel={reportingScale && reportingScale !== 'auto' ? getScaleLabel(reportingScale) : ''}
          />
        </DialogHeader>

        {hasNoteComponent ? (
          renderNoteComponent()
        ) : (
          <GenericLedgerNote ledgers={ledgers} reportingScale={reportingScale} includeSymbol />
        )}
      </DialogContent>
    </Dialog>
  );
}
