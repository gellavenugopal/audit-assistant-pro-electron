import type { LedgerRow } from '@/services/trialBalanceNewClassification';

export const filterClassifiedRows = (rows: LedgerRow[]) => {
  // Filter for Classified TB only: exclude ledgers where Opening=0 AND Closing=0
  return rows.filter((row) => {
    const opening = row['Opening Balance'] || 0;
    const closing = row['Closing Balance'] || 0;
    return opening !== 0 || closing !== 0;
  });
};
