import { ReportingScale } from '@/lib/formatters/currency';

// Shared ledger types for financial statements and notes
export interface StockItem {
  'Item Name': string;
  'Stock Group': string;
  'Primary Group': string;
  'Opening Value': number;
  'Closing Value': number;
  'Stock Category': string;
  'Composite Key': string;
}

export interface NoteLedgerItem {
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  classification?: string;
}

export type NoteLedgersMap = Record<string, NoteLedgerItem[]>;

export interface LedgerRowBasic {
  'Ledger Name': string;
  'H3'?: string;
  'Opening Balance'?: number;
  'Closing Balance'?: number;
  [key: string]: string | number | undefined;
}

export type BSNoteValues = Record<string, number | undefined>;
export type PLNoteValues = Record<string, number | undefined>;

export interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteKey: string | null;
  noteNumber: string;
  ledgers: NoteLedgerItem[];
  stockData: StockItem[];
  ledgerData: LedgerRowBasic[];
  reportingScale?: ReportingScale;
}
