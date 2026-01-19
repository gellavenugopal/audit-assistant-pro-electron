import type { LedgerRow } from '@/services/trialBalanceNewClassification';

export const buildKeyToIndexMap = (rows: LedgerRow[]) => {
  const map = new Map<string, number>();
  rows.forEach((row, index) => {
    const key = row['Composite Key'];
    if (key) {
      map.set(String(key), index);
    }
  });
  return map;
};

export const computeSelectedFilteredCount = (
  selectedRowIndices: Set<number>,
  filteredRows: LedgerRow[],
  keyToIndexMap: Map<string, number>,
) => {
  let count = 0;
  for (const row of filteredRows) {
    const key = row['Composite Key'];
    if (!key) continue;
    const index = keyToIndexMap.get(String(key));
    if (index !== undefined && selectedRowIndices.has(index)) {
      count += 1;
    }
  }
  return count;
};
