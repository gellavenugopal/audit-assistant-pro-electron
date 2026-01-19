import type { LedgerRow } from '@/services/trialBalanceNewClassification';

// Primary groups that should be excluded from trial balance import
// Stock-in-Hand is managed via manual inventory entry, not imported from TB
const EXCLUDED_PRIMARY_GROUPS = [
  'Stock-in-Hand',
];

export const filterActualRows = (rows: LedgerRow[]) => {
  // Filter for Actual TB: exclude Stock-in-Hand and other excluded groups
  return rows.filter((row) => {
    const primaryGroup = row['Primary Group'] || '';
    return !EXCLUDED_PRIMARY_GROUPS.includes(primaryGroup);
  });
};

export const filterClassifiedRows = (rows: LedgerRow[]) => {
  // Filter for Classified TB only: exclude ledgers where Opening=0 AND Closing=0
  // and also exclude Stock-in-Hand which is managed via manual inventory
  return rows.filter((row) => {
    const primaryGroup = row['Primary Group'] || '';
    if (EXCLUDED_PRIMARY_GROUPS.includes(primaryGroup)) {
      return false;
    }
    const opening = row['Opening Balance'] || 0;
    const closing = row['Closing Balance'] || 0;
    return opening !== 0 || closing !== 0;
  });
};
