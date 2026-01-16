import { LedgerRow } from '@/services/trialBalanceNewClassification';

export type RuleScope = 'global' | 'client';

export type ClassificationRule = {
  id: string;
  primaryGroupContains?: string;
  parentGroupContains?: string;
  ledgerNameContains?: string;
  h1: string;
  h2: string;
  h3: string;
  scope: RuleScope;
};

function normalize(value?: string): string {
  return (value || '').toLowerCase().trim();
}

function isUserDefined(value?: string): boolean {
  return normalize(value) === 'user_defined' || normalize(value) === 'user defined';
}

export function applyClassificationRules(row: LedgerRow, rules: ClassificationRule[]): LedgerRow {
  const hasH2OrH3 = Boolean(row['H2'] || row['H3']);
  if (hasH2OrH3 || rules.length === 0) return row;

  const primary = normalize(row['Primary Group']);
  const parent = normalize(row['Parent Group']);
  const ledger = normalize(row['Ledger Name']);

  const matched = rules.find(rule => {
    const primaryNeedle = normalize(rule.primaryGroupContains);
    const parentNeedle = normalize(rule.parentGroupContains);
    const ledgerNeedle = normalize(rule.ledgerNameContains);
    const primaryMatch = primaryNeedle ? primary.includes(primaryNeedle) : true;
    const parentMatch = parentNeedle ? parent.includes(parentNeedle) : true;
    const ledgerMatch = ledgerNeedle ? ledger.includes(ledgerNeedle) : true;
    return primaryMatch && parentMatch && ledgerMatch;
  });

  if (!matched) return row;

  const nextRow: LedgerRow = {
    ...row,
    'H1': row['H1'] || matched.h1 || '',
    'H2': row['H2'] || matched.h2 || '',
    'H3': row['H3'] || matched.h3 || '',
  };

  if (isUserDefined(nextRow['H2']) || isUserDefined(nextRow['H3'])) {
    nextRow['H2'] = isUserDefined(nextRow['H2']) ? '' : nextRow['H2'];
    nextRow['H3'] = isUserDefined(nextRow['H3']) ? '' : nextRow['H3'];
    nextRow['Notes'] = nextRow['Notes'] || 'User_Defined - set H2/H3 manually';
  }

  return nextRow;
}
