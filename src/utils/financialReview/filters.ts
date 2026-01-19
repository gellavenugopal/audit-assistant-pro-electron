import type { LedgerRow } from '@/services/trialBalanceNewClassification';

type ColumnFilters = Record<string, Set<string | number>>;

// Primary groups that should be excluded from trial balance import
// Stock-in-Hand is managed via manual inventory entry, not imported from TB
const EXCLUDED_PRIMARY_GROUPS = [
  'Stock-in-Hand',
];

export const applyColumnFilters = <T extends Record<string, unknown>>(
  rows: T[],
  columnFilters: ColumnFilters,
  getColumnValue?: (row: T, column: string) => string | number | undefined,
) => {
  let filtered = rows;
  Object.entries(columnFilters).forEach(([column, selectedValues]) => {
    if (selectedValues.size > 0) {
      filtered = filtered.filter((row) => {
        const value = getColumnValue ? getColumnValue(row, column) : (row[column] as string | number | undefined);
        return selectedValues.has(value as string | number);
      });
    }
  });
  return filtered;
};

export const applySorting = <T extends Record<string, unknown>>(
  rows: T[],
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc' | null,
) => {
  if (!sortColumn || !sortDirection) return rows;
  return [...rows].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal || '');
    const bStr = String(bVal || '');
    return sortDirection === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
};

type FilterActualRowsArgs = {
  rows: Array<LedgerRow & { __searchText?: string }>;
  searchTerm: string;
  groupFilter: string;
  balanceFilter: string;
  columnFilters: ColumnFilters;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
};

export const filterActualRows = ({
  rows,
  searchTerm,
  groupFilter,
  balanceFilter,
  columnFilters,
  sortColumn,
  sortDirection,
}: FilterActualRowsArgs) => {
  let filtered = rows;

  // Exclude Stock-in-Hand which is managed via manual inventory entry
  filtered = filtered.filter((row) => {
    const primaryGroup = row['Primary Group'] || '';
    return !EXCLUDED_PRIMARY_GROUPS.includes(primaryGroup);
  });

  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter((row) => (row.__searchText || '').includes(searchLower));
  }

  if (groupFilter !== 'all') {
    filtered = filtered.filter((row) => (row['Primary Group'] || '') === groupFilter);
  }

  if (balanceFilter !== 'all') {
    filtered = filtered.filter((row) => {
      const balance = row['Closing Balance'] || 0;
      if (balanceFilter === 'positive') return balance > 0;
      if (balanceFilter === 'negative') return balance < 0;
      if (balanceFilter === 'zero') return balance === 0;
      return true;
    });
  }

  filtered = applyColumnFilters(filtered, columnFilters);
  filtered = applySorting(filtered, sortColumn, sortDirection);

  return filtered;
};

type FilterClassifiedRowsArgs = {
  rows: Array<LedgerRow & { __searchText?: string }>;
  searchTerm: string;
  columnFilters: ColumnFilters;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  getStatusLabel: (row: LedgerRow) => string;
};

export const filterClassifiedRowsByFilters = ({
  rows,
  searchTerm,
  columnFilters,
  sortColumn,
  sortDirection,
  getStatusLabel,
}: FilterClassifiedRowsArgs) => {
  let filtered = rows;

  // Exclude Stock-in-Hand which is managed via manual inventory entry
  filtered = filtered.filter((row) => {
    const primaryGroup = row['Primary Group'] || '';
    return !EXCLUDED_PRIMARY_GROUPS.includes(primaryGroup);
  });

  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter((row) => (row.__searchText || '').includes(searchLower));
  }

  filtered = applyColumnFilters(filtered, columnFilters, (row, column) => {
    if (column === 'Status') return getStatusLabel(row as LedgerRow);
    return row[column] as string | number | undefined;
  });
  filtered = applySorting(filtered, sortColumn, sortDirection);

  return filtered;
};
