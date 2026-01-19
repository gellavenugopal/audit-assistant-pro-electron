import type { LedgerRow } from '@/services/trialBalanceNewClassification';

const normalizeValue = (value?: string | null) => (value || '').trim();

const evaluateUniformField = (rows: LedgerRow[], field: keyof LedgerRow) => {
  let canonicalValue = '';
  let canonicalNormalized: string | null = null;
  let isUniform = rows.length > 0;

  for (const row of rows) {
    const rawValue = normalizeValue(row[field] as string | undefined | null);
    if (!rawValue) {
      isUniform = false;
      break;
    }

    const currentNormalized = rawValue.toLowerCase();

    if (canonicalNormalized === null) {
      canonicalValue = rawValue;
      canonicalNormalized = currentNormalized;
      continue;
    }

    if (currentNormalized !== canonicalNormalized) {
      isUniform = false;
      break;
    }
  }

  if (!canonicalNormalized) {
    isUniform = false;
    canonicalValue = '';
  }

  return {
    value: isUniform ? canonicalValue : '',
    isUniform,
  };
};

export type BulkUpdateClassificationSummary = {
  commonH1: string;
  commonH2: string;
  commonH3: string;
  isH1Uniform: boolean;
  isH2Uniform: boolean;
  isH3Uniform: boolean;
};

export const computeCommonClassification = (rows: LedgerRow[]): BulkUpdateClassificationSummary => {
  const h1 = evaluateUniformField(rows, 'H1');
  const h2 = evaluateUniformField(rows, 'H2');
  const h3 = evaluateUniformField(rows, 'H3');

  return {
    commonH1: h1.value,
    commonH2: h2.value,
    commonH3: h3.value,
    isH1Uniform: h1.isUniform,
    isH2Uniform: h2.isUniform,
    isH3Uniform: h3.isUniform,
  };
};

export type BulkUpdateFormDefaults = {
  h1: string | null;
  h2: string | null;
  h3: string | null;
  isH3Required: boolean;
};

export const buildBulkUpdateFormDefaults = (rows: LedgerRow[]): BulkUpdateFormDefaults => {
  const summary = computeCommonClassification(rows);
  return {
    h1: summary.isH1Uniform ? summary.commonH1 : null,
    h2: summary.isH2Uniform ? summary.commonH2 : null,
    h3: summary.isH3Uniform ? summary.commonH3 : null,
    isH3Required: !summary.isH3Uniform,
  };
};
