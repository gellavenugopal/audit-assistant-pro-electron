import type { LedgerRow } from '@/services/trialBalanceNewClassification';

export type Totals = {
  opening: number;
  debit: number;
  credit: number;
  closing: number;
};

export const computeTotals = (rows: LedgerRow[]): Totals => {
  return rows.reduce(
    (acc, row) => {
      acc.opening += row['Opening Balance'] || 0;
      acc.debit += row['Debit'] || 0;
      acc.credit += row['Credit'] || 0;
      acc.closing += row['Closing Balance'] || 0;
      return acc;
    },
    { opening: 0, debit: 0, credit: 0, closing: 0 },
  );
};
