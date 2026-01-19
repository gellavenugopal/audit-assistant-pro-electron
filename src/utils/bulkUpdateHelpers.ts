/**
 * Bulk Update Helper Utilities
 * 
 * Provides utilities for auto-population logic in the Bulk Update dialog.
 * Detects uniform values across selected ledgers for H1, H2, H3.
 */

import type { LedgerRow } from '@/services/trialBalanceNewClassification';

/**
 * Normalize a value for comparison
 * - Convert to lowercase
 * - Trim whitespace
 * - Replace smart quotes with straight quotes
 */
export const normalizeValue = (value?: string): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[""''`]/g, "'")
    .replace(/\s+/g, ' ');
};

/**
 * Check if a value is considered "empty" or "missing"
 * Empty includes: null, undefined, empty string, 'null', 'undefined'
 */
export const isEmpty = (value?: string | null): boolean => {
  if (value === null || value === undefined) return true;
  const normalized = normalizeValue(value);
  if (!normalized) return true;
  if (['null', 'undefined', 'n/a', 'na', '-'].includes(normalized)) return true;
  return false;
};

/**
 * Check if a value is a placeholder (like "H2", "Select H1/H2")
 * These indicate the user hasn't actually set a value
 */
export const isPlaceholder = (value?: string): boolean => {
  if (isEmpty(value)) return true;
  const normalized = normalizeValue(value);
  const placeholders = [
    'h1',
    'h2',
    'h3',
    'select h1',
    'select h2',
    'select h3',
    'select h1/h2',
    'select h1 h2',
    'select category',
    'select subcategory',
    'enter subcategory',
    'select h3',
  ];
  return placeholders.includes(normalized);
};

/**
 * Uniformity detection result
 */
export interface UniformityResult {
  isUniform: boolean;
  value?: string;
  count: number;
  missingCount: number;
  reason?: string;
}

/**
 * Detect if a field is uniform across selected ledgers
 * 
 * @param ledgers - Array of selected ledger rows
 * @param field - Field name (H1, H2, or H3)
 * @returns UniformityResult with uniformity status and value
 */
export const detectUniformValue = (
  ledgers: LedgerRow[],
  field: 'H1' | 'H2' | 'H3'
): UniformityResult => {
  if (ledgers.length === 0) {
    return { isUniform: false, count: 0, missingCount: 0, reason: 'No ledgers selected' };
  }

  // Filter out rows where this field is empty/placeholder
  const nonEmptyValues = ledgers
    .map(row => row[field] as string | undefined)
    .filter(v => !isEmpty(v) && !isPlaceholder(v));

  const emptyCount = ledgers.length - nonEmptyValues.length;

  if (nonEmptyValues.length === 0) {
    return {
      isUniform: false,
      count: ledgers.length,
      missingCount: emptyCount,
      reason: `All ${field} values are empty or missing`,
    };
  }

  // Normalize all values for comparison
  const normalizedValues = nonEmptyValues.map(normalizeValue);
  const uniqueValues = Array.from(new Set(normalizedValues));

  if (uniqueValues.length === 1) {
    // All values match
    return {
      isUniform: true,
      value: nonEmptyValues[0],
      count: nonEmptyValues.length,
      missingCount: emptyCount,
      reason: `${field} is uniform across ${nonEmptyValues.length} ledger(s)`,
    };
  }

  // Values are mixed
  return {
    isUniform: false,
    count: ledgers.length,
    missingCount: emptyCount,
    reason: `${field} values differ (${uniqueValues.length} unique values found)`,
  };
};

/**
 * Auto-population result for bulk update
 */
export interface BulkUpdateAutoPopulateResult {
  h1: {
    isUniform: boolean;
    value?: string;
    shouldEnable: boolean;
  };
  h2: {
    isUniform: boolean;
    value?: string;
    shouldEnable: boolean;
  };
  h3: {
    isUniform: boolean;
    value?: string;
    shouldEnable: boolean;
  };
  applyButtonEnabled: boolean;
  summary: string;
}

/**
 * Calculate auto-population values for Bulk Update dialog
 * 
 * Rules:
 * - If H1 and H2 are uniform, auto-populate them
 * - If H1 is uniform but H2 is not, populate H1 only
 * - H3 is always left empty if not 100% uniform (forces manual selection)
 * - Apply button enabled only if at least one field is selected/populated
 */
export const calculateBulkUpdateAutoPopulation = (
  selectedLedgers: LedgerRow[]
): BulkUpdateAutoPopulateResult => {
  if (selectedLedgers.length === 0) {
    return {
      h1: { isUniform: false, shouldEnable: false },
      h2: { isUniform: false, shouldEnable: false },
      h3: { isUniform: false, shouldEnable: false },
      applyButtonEnabled: false,
      summary: 'Select 1 or more ledgers to enable bulk update',
    };
  }

  const h1Result = detectUniformValue(selectedLedgers, 'H1');
  const h2Result = detectUniformValue(selectedLedgers, 'H2');
  const h3Result = detectUniformValue(selectedLedgers, 'H3');

  // H3 requires ALL ledgers to have the same value (including those missing it)
  // We use a stricter check: ALL ledgers must have non-empty, non-placeholder H3
  const h3IsCompletelyUniform = selectedLedgers
    .map(row => row['H3'] as string | undefined)
    .every(v => !isEmpty(v) && !isPlaceholder(v));
  
  const h3NonEmptyUniform = h3IsCompletelyUniform
    ? selectedLedgers
        .map(row => normalizeValue(row['H3'] as string | undefined))
        .every((v, _, arr) => v === arr[0])
    : false;

  return {
    h1: {
      isUniform: h1Result.isUniform,
      value: h1Result.isUniform ? h1Result.value : undefined,
      shouldEnable: true, // Always enable for selection
    },
    h2: {
      isUniform: h2Result.isUniform && h1Result.isUniform, // Only uniform if H1 is also uniform
      value: h2Result.isUniform && h1Result.isUniform ? h2Result.value : undefined,
      shouldEnable: true, // Always enable for selection
    },
    h3: {
      isUniform: h3NonEmptyUniform,
      value: h3NonEmptyUniform ? selectedLedgers[0]['H3'] : undefined,
      shouldEnable: false, // Never auto-populate H3, must be manual
    },
    applyButtonEnabled: h1Result.isUniform || h2Result.isUniform || h3NonEmptyUniform,
    summary: buildAutoPopulationSummary(
      selectedLedgers.length,
      h1Result,
      h2Result,
      h3Result,
      h3NonEmptyUniform
    ),
  };
};

/**
 * Build a human-readable summary of auto-population status
 */
const buildAutoPopulationSummary = (
  totalCount: number,
  h1: UniformityResult,
  h2: UniformityResult,
  h3: UniformityResult,
  h3Uniform: boolean
): string => {
  const parts: string[] = [];
  
  if (h1.isUniform) {
    parts.push(`✓ H1 uniform (${h1.count}/${totalCount})`);
  } else {
    parts.push(`✗ H1 mixed (${h1.missingCount} missing)`);
  }

  if (h2.isUniform && h1.isUniform) {
    parts.push(`✓ H2 uniform (${h2.count}/${totalCount})`);
  } else {
    parts.push(`✗ H2 mixed or H1 not uniform`);
  }

  if (h3Uniform) {
    parts.push(`✓ H3 uniform (${h3.count}/${totalCount})`);
  } else {
    parts.push(`• H3 needs manual selection (${h3.missingCount} missing)`);
  }

  return parts.join(' | ');
};

/**
 * Get the state for the Apply button
 * Button should be ENABLED only if at least one classification field will be updated
 */
export const shouldEnableApplyButton = (result: BulkUpdateAutoPopulateResult): boolean => {
  return result.applyButtonEnabled;
};

/**
 * Prepare the updates to be applied to selected ledgers
 */
export interface BulkUpdatePayload {
  H1?: string;
  H2?: string;
  H3?: string;
  Auto?: string;
  'Auto Reason'?: string;
}

export const prepareBulkUpdatePayload = (
  h1Value?: string,
  h2Value?: string,
  h3Value?: string
): BulkUpdatePayload => {
  const payload: BulkUpdatePayload = {};

  if (h1Value) payload.H1 = h1Value;
  if (h2Value) payload.H2 = h2Value;
  if (h3Value) payload.H3 = h3Value;

  // Mark as manual if any classification field is being set
  if (h1Value || h2Value || h3Value) {
    payload.Auto = 'Manual';
    payload['Auto Reason'] = 'Bulk update applied manually';
  }

  return payload;
};
