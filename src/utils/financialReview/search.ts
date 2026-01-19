import type { LedgerRow } from '@/services/trialBalanceNewClassification';

export const buildSearchText = (
  row: LedgerRow,
  fields: Array<keyof LedgerRow>,
) => {
  return fields
    .map((field) => {
      const value = row[field];
      if (value === null || value === undefined) return '';
      return String(value);
    })
    .join('|')
    .toLowerCase();
};
