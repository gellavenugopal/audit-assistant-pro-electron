import { getRowAmount } from './noteBuilder';

export type StatementType = 'BS' | 'PL';

export type PreparedNoteRow = {
  H3: string;
  amount: number;
};

export type PreparedNote = {
  H1: string;
  H2: string;
  noteNo: number;
  rows: PreparedNoteRow[];
  total: number;
};

type BuildPreparedNotesOptions = {
  classifiedRows: Array<Record<string, unknown>>;
  statementType: StatementType;
  tolerance: number;
  h2Order?: string[];
};

const BS_H1 = new Set(['Asset', 'Liability']);
const PL_H1 = new Set(['Income', 'Expense']);

function normalizeH2Key(value: string): string {
  return (value || '')
    .toString()
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase();
}

function normalizeAmount(amount: number, h1: string | undefined, statementType: StatementType): number {
  if (!Number.isFinite(amount)) return 0;
  if (statementType === 'PL' && h1 === 'Expense' && amount < 0) {
    return amount * -1;
  }
  if (statementType === 'BS' && h1 === 'Asset' && amount < 0) {
    return amount * -1;
  }
  return amount;
}

export function buildPreparedNotes({
  classifiedRows,
  statementType,
  tolerance,
  h2Order,
}: BuildPreparedNotesOptions): PreparedNote[] {
  const allowedH1 = statementType === 'BS' ? BS_H1 : PL_H1;
  const h2Index = new Map<string, number>();
  (h2Order || []).forEach((h2, idx) => {
    const key = normalizeH2Key(h2);
    if (!h2Index.has(key)) h2Index.set(key, idx);
  });

  const noteMap = new Map<string, { H1: string; H2: string; rows: Map<string, number> }>();
  classifiedRows.forEach((row) => {
    if (!row) return;
    const h1 = row.H1 as string | undefined;
    const h2 = row.H2 as string | undefined;
    const h3 = row.H3 as string | undefined;
    if (!h1 || !allowedH1.has(h1)) return;
    if (!h2 || !h3) return;
    const amount = normalizeAmount(getRowAmount(row as any), h1, statementType);
    const key = `${h1}||${h2}`;
    if (!noteMap.has(key)) {
      noteMap.set(key, { H1: h1, H2: h2, rows: new Map() });
    }
    const note = noteMap.get(key) as { H1: string; H2: string; rows: Map<string, number> };
    note.rows.set(h3, (note.rows.get(h3) || 0) + amount);
  });

  const notes: PreparedNote[] = [];
  noteMap.forEach((note) => {
    const visibleRows: PreparedNoteRow[] = [];
    let total = 0;
    note.rows.forEach((amount, h3) => {
      if (Math.abs(amount) <= tolerance) return;
      visibleRows.push({ H3: h3, amount });
      total += amount;
    });
    if (visibleRows.length === 0) return;
    notes.push({
      H1: note.H1,
      H2: note.H2,
      noteNo: 0,
      rows: visibleRows,
      total,
    });
  });

  notes.sort((a, b) => {
    const aKey = normalizeH2Key(a.H2);
    const bKey = normalizeH2Key(b.H2);
    const aIndex = h2Index.has(aKey) ? (h2Index.get(aKey) as number) : Number.MAX_SAFE_INTEGER;
    const bIndex = h2Index.has(bKey) ? (h2Index.get(bKey) as number) : Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.H2.localeCompare(b.H2);
  });

  notes.forEach((note, idx) => {
    note.noteNo = idx + 1;
  });

  return notes;
}

type FaceRow = {
  H2: string;
  noteNo: number;
  amount: number;
  H1: string;
};

export type FaceSection = {
  title: string;
  rows: FaceRow[];
  total: number;
};

export type FaceSummary = {
  sections: FaceSection[];
  totals: Record<string, number>;
};

export function buildFaceFromNotes(preparedNotes: PreparedNote[], statementType: StatementType): FaceSummary {
  const sections: FaceSection[] = [];

  if (statementType === 'BS') {
    const assetRows = preparedNotes.filter((note) => note.H1 === 'Asset');
    const liabilityRows = preparedNotes.filter((note) => note.H1 === 'Liability');
    const assetTotal = assetRows.reduce((sum, note) => sum + note.total, 0);
    const liabilityTotal = liabilityRows.reduce((sum, note) => sum + note.total, 0);

    sections.push({
      title: 'Liabilities',
      rows: liabilityRows.map((note) => ({ H2: note.H2, noteNo: note.noteNo, amount: note.total, H1: note.H1 })),
      total: liabilityTotal,
    });
    sections.push({
      title: 'Assets',
      rows: assetRows.map((note) => ({ H2: note.H2, noteNo: note.noteNo, amount: note.total, H1: note.H1 })),
      total: assetTotal,
    });

    return {
      sections,
      totals: {
        totalAssets: assetTotal,
        totalLiabilities: liabilityTotal,
        difference: assetTotal - liabilityTotal,
      },
    };
  }

  const incomeRows = preparedNotes.filter((note) => note.H1 === 'Income');
  const expenseRows = preparedNotes.filter((note) => note.H1 === 'Expense');
  const incomeTotal = incomeRows.reduce((sum, note) => sum + note.total, 0);
  const expenseTotal = expenseRows.reduce((sum, note) => sum + note.total, 0);

  sections.push({
    title: 'Income',
    rows: incomeRows.map((note) => ({ H2: note.H2, noteNo: note.noteNo, amount: note.total, H1: note.H1 })),
    total: incomeTotal,
  });
  sections.push({
    title: 'Expenses',
    rows: expenseRows.map((note) => ({ H2: note.H2, noteNo: note.noteNo, amount: note.total, H1: note.H1 })),
    total: expenseTotal,
  });

  return {
    sections,
    totals: {
      totalIncome: incomeTotal,
      totalExpenses: expenseTotal,
      profitLoss: incomeTotal - expenseTotal,
    },
  };
}
