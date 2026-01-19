import { LedgerRow } from '@/services/trialBalanceNewClassification';

export type StatementType = 'BS' | 'PL';
export type NumberScale = 'actual' | 'tens' | 'hundreds' | 'thousands' | 'lakhs' | 'millions' | 'crores';

export type ClassifiedRow = {
  H1?: string;
  H2?: string;
  H3?: string;
  amount?: number;
  'Closing Balance'?: number;
};

export type NoteRow = {
  id: string;
  label: string;
  amount: number;
  formattedAmount: string;
  type: 'parent' | 'child' | 'item';
  children?: NoteRow[];
};

export type NoteStructure = {
  header: string;
  rows: NoteRow[];
  totalAmount: number;
  formattedTotal: string;
};

type NoteBuilderOptions = {
  statementType: StatementType;
  selectedH2: string;
  rows: ClassifiedRow[];
  numberScale: NumberScale;
  formatNumber: (num: number) => string;
  hideEmpty?: boolean;
  h3Order?: string[];
  includeParentTotals?: boolean;
  includeZeroRows?: boolean;
};

const BS_H1 = new Set(['Asset', 'Liability']);
const PL_H1 = new Set(['Income', 'Expense']);

export function getScaleFactor(numberScale: NumberScale): number {
  return numberScale === 'tens'
    ? 10
    : numberScale === 'hundreds'
      ? 100
      : numberScale === 'thousands'
        ? 1000
        : numberScale === 'lakhs'
          ? 100000
          : numberScale === 'millions'
            ? 1000000
            : numberScale === 'crores'
              ? 10000000
              : 1;
}

export function getRowAmount(row: ClassifiedRow | LedgerRow): number {
  if (typeof row.amount === 'number' && Number.isFinite(row.amount)) {
    return row.amount;
  }
  if (typeof row['Closing Balance'] === 'number' && Number.isFinite(row['Closing Balance'])) {
    return row['Closing Balance'] as number;
  }
  return 0;
}

export function isZeroAfterScale(amount: number, scaleFactor: number): boolean {
  const scaled = amount / scaleFactor;
  const rounded = Math.round(scaled * 100) / 100;
  return Math.abs(rounded) === 0;
}

function resolveAllowedH1(statementType: StatementType): Set<string> {
  return statementType === 'BS' ? BS_H1 : PL_H1;
}

function parseHierarchyLabel(label: string): { parent: string; child: string | null } {
  const parts = (label || '').split(' > ').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      parent: parts[0],
      child: parts.slice(1).join(' > '),
    };
  }
  return { parent: label, child: null };
}

function normalizeAmountForStatement(amount: number, h1: string | undefined, statementType: StatementType): number {
  if (!Number.isFinite(amount)) return 0;
  if (statementType === 'PL' && h1 === 'Expense' && amount < 0) {
    return amount * -1;
  }
  if (statementType === 'BS' && h1 === 'Asset' && amount < 0) {
    return amount * -1;
  }
  return amount;
}

export function buildNoteStructure({
  statementType,
  selectedH2,
  rows,
  numberScale,
  formatNumber,
  hideEmpty = true,
  h3Order,
  includeParentTotals = false,
  includeZeroRows = false,
}: NoteBuilderOptions): NoteStructure | null {
  if (!selectedH2) return null;

  const allowedH1 = resolveAllowedH1(statementType);
  const scaleFactor = getScaleFactor(numberScale);
  const totalsByH3 = new Map<string, number>();

  rows.forEach((row) => {
    if (!row) return;
    if (!row.H1 || !allowedH1.has(row.H1)) return;
    if (!row.H2 || row.H2 !== selectedH2) return;
    if (!row.H3) return;
    const rawAmount = getRowAmount(row);
    const amount = normalizeAmountForStatement(rawAmount, row.H1, statementType);
    if (!totalsByH3.has(row.H3)) {
      totalsByH3.set(row.H3, amount);
    } else {
      totalsByH3.set(row.H3, (totalsByH3.get(row.H3) || 0) + amount);
    }
  });

  if (includeZeroRows && h3Order && h3Order.length > 0) {
    h3Order.forEach((label) => {
      if (!totalsByH3.has(label)) {
        totalsByH3.set(label, 0);
      }
    });
  }

  const rowsWithAmounts: (NoteRow & { index: number; orderIndex: number })[] = [];
  const parentBuckets = new Map<string, {
    parentLabel: string;
    children: Map<string, { amount: number; index: number; orderIndex: number }>;
    index: number;
    orderIndex: number;
  }>();
  const orderMap = new Map<string, number>();
  if (h3Order && h3Order.length > 0) {
    h3Order.forEach((label, idx) => {
      if (!orderMap.has(label)) orderMap.set(label, idx);
    });
  }

  let insertionIndex = 0;
  let totalAmount = 0;
  totalsByH3.forEach((amount, label) => {
    const { parent, child } = parseHierarchyLabel(label);
    const orderIndex = orderMap.has(label) ? (orderMap.get(label) as number) : Number.MAX_SAFE_INTEGER;
    if (!child) {
      if (!includeZeroRows && isZeroAfterScale(amount, scaleFactor)) {
        insertionIndex += 1;
        return;
      }
      totalAmount += amount;
      rowsWithAmounts.push({
        id: `item:${label}`,
        label,
        amount,
        formattedAmount: formatNumber(amount),
        type: 'item',
        index: insertionIndex,
        orderIndex: orderMap.has(label) ? (orderMap.get(label) as number) : Number.MAX_SAFE_INTEGER,
      });
      insertionIndex += 1;
      return;
    }

    if (!parentBuckets.has(parent)) {
      parentBuckets.set(parent, {
        parentLabel: parent,
        children: new Map(),
        index: insertionIndex,
        orderIndex: orderMap.has(parent) ? (orderMap.get(parent) as number) : Number.MAX_SAFE_INTEGER,
      });
    }

    const bucket = parentBuckets.get(parent) as {
      parentLabel: string;
      children: Map<string, { amount: number; index: number; orderIndex: number }>;
      index: number;
      orderIndex: number;
    };
    const childEntry = bucket.children.get(child);
    if (!childEntry) {
      bucket.children.set(child, {
        amount,
        index: insertionIndex,
        orderIndex,
      });
    } else {
      childEntry.amount += amount;
      bucket.children.set(child, childEntry);
    }
    if (bucket.orderIndex === Number.MAX_SAFE_INTEGER && orderIndex !== Number.MAX_SAFE_INTEGER) {
      bucket.orderIndex = orderIndex;
    }
    insertionIndex += 1;
  });

  parentBuckets.forEach((bucket) => {
    const childRows: NoteRow[] = [];
    let parentTotal = 0;
    const childrenSorted = Array.from(bucket.children.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
        return a.index - b.index;
      });

    childrenSorted.forEach((child) => {
      if (!includeZeroRows && isZeroAfterScale(child.amount, scaleFactor)) return;
      parentTotal += child.amount;
      totalAmount += child.amount;
      childRows.push({
        id: `child:${bucket.parentLabel}:${child.label}`,
        label: child.label,
        amount: child.amount,
        formattedAmount: formatNumber(child.amount),
        type: 'child',
      });
    });

    if (!includeZeroRows && hideEmpty && childRows.length === 0) {
      return;
    }

    rowsWithAmounts.push({
      id: `parent:${bucket.parentLabel}`,
      label: bucket.parentLabel,
      amount: parentTotal,
      formattedAmount: includeParentTotals && childRows.length > 0 ? formatNumber(parentTotal) : '',
      type: 'parent',
      children: childRows,
      index: bucket.index,
      orderIndex: bucket.orderIndex,
    });
  });

  rowsWithAmounts.sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    return a.index - b.index;
  });

  if (hideEmpty && rowsWithAmounts.length === 0) {
    return null;
  }

  return {
    header: selectedH2,
    rows: rowsWithAmounts.map(({ index, orderIndex, ...rest }) => rest),
    totalAmount,
    formattedTotal: formatNumber(totalAmount),
  };
}

export function getNoteH2Options(
  statementType: StatementType,
  rows: ClassifiedRow[],
  numberScale: NumberScale
): string[] {
  const allowedH1 = resolveAllowedH1(statementType);
  const scaleFactor = getScaleFactor(numberScale);
  const h2Totals = new Map<string, Map<string, number>>();
  const orderedH2: string[] = [];

  rows.forEach((row) => {
    if (!row) return;
    if (!row.H1 || !allowedH1.has(row.H1)) return;
    if (!row.H2 || !row.H3) return;

    const amount = getRowAmount(row);
    let h3Totals = h2Totals.get(row.H2);
    if (!h3Totals) {
      h3Totals = new Map<string, number>();
      h2Totals.set(row.H2, h3Totals);
      orderedH2.push(row.H2);
    }

    h3Totals.set(row.H3, (h3Totals.get(row.H3) || 0) + amount);
  });

  return orderedH2.filter((h2) => {
    const h3Totals = h2Totals.get(h2);
    if (!h3Totals) return false;
    for (const amount of h3Totals.values()) {
      if (!isZeroAfterScale(amount, scaleFactor)) {
        return true;
      }
    }
    return false;
  });
}
