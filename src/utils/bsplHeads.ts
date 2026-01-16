import bsplHeadsData from '@/data/bspl-heads.json';

export type BsplHeadRow = {
  H1: string;
  H2: string;
  H3: string;
  Condition?: string;
};

export type BsplOptions = {
  h1Options: string[];
  h2Options: Record<string, string[]>;
  h3Options: Record<string, Record<string, string[]>>;
};

export const DEFAULT_BSPL_HEADS = bsplHeadsData as BsplHeadRow[];

function normalize(value?: string): string {
  return (value || '').toLowerCase();
}

export function matchesCondition(condition: string | undefined, entityType: string): boolean {
  if (!condition) return true;
  if (!entityType) return true;

  const conditionLower = normalize(condition);
  const entityLower = normalize(entityType);

  const isCorporateCondition = conditionLower.includes('corporate') ||
    conditionLower.includes('private limited') ||
    conditionLower.includes('public limited') ||
    conditionLower.includes('opc');

  const isPartnershipCondition = conditionLower.includes('partnership') ||
    conditionLower.includes('limited liability partnership') ||
    conditionLower.includes('llp');

  const isProprietorshipCondition = conditionLower.includes('proprietorship') ||
    conditionLower.includes('individual') ||
    conditionLower.includes('hindu undivided family') ||
    conditionLower.includes('huf');

  if (isCorporateCondition) {
    return entityLower.includes('company') || entityLower.includes('opc');
  }
  if (isPartnershipCondition) {
    return entityLower.includes('partnership') || entityLower.includes('llp');
  }
  if (isProprietorshipCondition) {
    return entityLower.includes('proprietorship') || entityLower.includes('individual');
  }

  return true;
}

export function filterBsplHeadsByEntityType(rows: BsplHeadRow[], entityType: string): BsplHeadRow[] {
  return rows.filter(row => matchesCondition(row.Condition, entityType));
}

export function buildBsplOptions(rows: BsplHeadRow[]): BsplOptions {
  const h1List: string[] = [];
  const h2Map: Record<string, string[]> = {};
  const h3Map: Record<string, Record<string, string[]>> = {};

  rows.forEach(row => {
    if (!h1List.includes(row.H1)) {
      h1List.push(row.H1);
    }

    if (!h2Map[row.H1]) h2Map[row.H1] = [];
    if (!h2Map[row.H1].includes(row.H2)) {
      h2Map[row.H1].push(row.H2);
    }

    if (!h3Map[row.H1]) h3Map[row.H1] = {};
    if (!h3Map[row.H1][row.H2]) h3Map[row.H1][row.H2] = [];
    if (!h3Map[row.H1][row.H2].includes(row.H3)) {
      h3Map[row.H1][row.H2].push(row.H3);
    }
  });

  const h1Options = h1List;
  const h2Options = h2Map;
  const h3Options = h3Map;

  return { h1Options, h2Options, h3Options };
}
