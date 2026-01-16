import { LedgerRow } from '@/services/trialBalanceNewClassification';

export type BalanceSign = 'Dr' | 'Cr';

type NaturalInputs = {
  h2?: string | null;
  primaryGroup?: string | null;
  parentGroup?: string | null;
  isRevenue?: boolean;
};

function normalizeText(value?: string | null): string {
  return (value || '').toLowerCase();
}

function inferFromGroups({ h2, primaryGroup, parentGroup, isRevenue }: NaturalInputs): BalanceSign {
  const h2Lower = normalizeText(h2);
  const primaryLower = normalizeText(primaryGroup);
  const parentLower = normalizeText(parentGroup);

  // Explicit H2 mapping first
  if (h2Lower.includes('asset') || h2Lower.includes('expense')) return 'Dr';
  if (h2Lower.includes('liabil') || h2Lower.includes('equity') || h2Lower.includes('income') || h2Lower.includes('revenue')) return 'Cr';

  // Parent/primary group keywords
  const drKeywords = ['debtor', 'receivable', 'asset', 'bank', 'cash', 'advance', 'loan & advance', 'stock', 'inventory', 'expense', 'purchase'];
  const crKeywords = ['creditor', 'payable', 'liabil', 'equity', 'capital', 'reserve', 'surplus', 'overdraft', 'od', 'occ', 'loan', 'borrowing', 'income', 'revenue', 'sales'];

  if (drKeywords.some(k => primaryLower.includes(k) || parentLower.includes(k))) return 'Dr';
  if (crKeywords.some(k => primaryLower.includes(k) || parentLower.includes(k))) return 'Cr';

  // Fall back to revenue flag: revenue items default to Income (Cr), others to Expenses (Dr)
  if (typeof isRevenue === 'boolean') {
    return isRevenue ? 'Cr' : 'Dr';
  }

  // Default safest assumption
  return 'Dr';
}

export function getNaturalBalanceSide(row: LedgerRow): BalanceSign {
  return inferFromGroups({
    h2: row['H2'],
    primaryGroup: row['Primary Group'],
    parentGroup: row['Parent Group'],
    isRevenue: row['Is Revenue'] === 'Yes'
  });
}

export function getNaturalBalanceSideFromGroups(
  h2?: string,
  primaryGroup?: string,
  parentGroup?: string,
  isRevenue?: boolean
): BalanceSign {
  return inferFromGroups({ h2, primaryGroup, parentGroup, isRevenue });
}

export function getActualBalanceSign(row: LedgerRow): BalanceSign {
  const natural = getNaturalBalanceSide(row);
  const closing = row['Closing Balance'] || 0;
  const opening = row['Opening Balance'] || 0;
  const amount = closing !== 0 ? closing : opening;
  if (amount === 0) return natural;
  return amount < 0 ? 'Dr' : 'Cr';
}

export function normalizeSignedAmount(row: LedgerRow): number {
  const sign = getActualBalanceSign(row);
  const magnitude = Math.abs(row['Closing Balance'] || 0);
  return sign === 'Dr' ? magnitude : -magnitude;
}
