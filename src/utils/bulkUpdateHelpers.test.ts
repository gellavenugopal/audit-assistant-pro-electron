/**
 * Unit Tests for Bulk Update Helper Functions
 * 
 * Tests all utility functions for:
 * - Value normalization
 * - Empty/placeholder detection
 * - Uniformity detection across selected ledgers
 * - Auto-population logic for H1, H2, H3
 */

import {
  normalizeValue,
  isEmpty,
  isPlaceholder,
  detectUniformValue,
  calculateBulkUpdateAutoPopulation,
  shouldEnableApplyButton,
  prepareBulkUpdatePayload,
  type UniformityResult,
  type BulkUpdateAutoPopulateResult,
} from '../utils/bulkUpdateHelpers';
import type { LedgerRow } from '@/services/trialBalanceNewClassification';

describe('Bulk Update Helper Functions', () => {
  describe('normalizeValue', () => {
    it('should convert to lowercase', () => {
      expect(normalizeValue('Asset')).toBe('asset');
      expect(normalizeValue('PROPERTY, PLANT AND EQUIPMENT')).toBe('property, plant and equipment');
    });

    it('should trim whitespace', () => {
      expect(normalizeValue('  Asset  ')).toBe('asset');
      expect(normalizeValue(' H1 ')).toBe('h1');
    });

    it('should replace smart quotes with straight quotes', () => {
      expect(normalizeValue('"Test"')).toBe("'test'");
      expect(normalizeValue("''Test''")).toBe("'test'");
    });

    it('should handle empty values', () => {
      expect(normalizeValue('')).toBe('');
      expect(normalizeValue(undefined)).toBe('');
      expect(normalizeValue(null)).toBe('');
    });

    it('should consolidate multiple spaces', () => {
      expect(normalizeValue('Property    Plant    Equipment')).toBe('property plant equipment');
    });
  });

  describe('isEmpty', () => {
    it('should return true for null/undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only strings', () => {
      expect(isEmpty('   ')).toBe(true);
    });

    it('should return true for "null" and "undefined" strings', () => {
      expect(isEmpty('null')).toBe(true);
      expect(isEmpty('undefined')).toBe(true);
      expect(isEmpty('NULL')).toBe(true);
      expect(isEmpty('Undefined')).toBe(true);
    });

    it('should return true for common placeholder values', () => {
      expect(isEmpty('n/a')).toBe(true);
      expect(isEmpty('na')).toBe(true);
      expect(isEmpty('-')).toBe(true);
    });

    it('should return false for actual values', () => {
      expect(isEmpty('Asset')).toBe(false);
      expect(isEmpty('Property, Plant and Equipment')).toBe(false);
    });
  });

  describe('isPlaceholder', () => {
    it('should return true for H1/H2/H3 placeholders', () => {
      expect(isPlaceholder('H1')).toBe(true);
      expect(isPlaceholder('H2')).toBe(true);
      expect(isPlaceholder('H3')).toBe(true);
    });

    it('should return true for "Select" prompts', () => {
      expect(isPlaceholder('Select H1')).toBe(true);
      expect(isPlaceholder('Select H1/H2')).toBe(true);
      expect(isPlaceholder('Select H1 H2')).toBe(true);
      expect(isPlaceholder('Select Category')).toBe(true);
    });

    it('should return true for "Enter" prompts', () => {
      expect(isPlaceholder('Enter Subcategory')).toBe(true);
    });

    it('should return true for empty/null', () => {
      expect(isPlaceholder('')).toBe(true);
      expect(isPlaceholder(null)).toBe(true);
      expect(isPlaceholder(undefined)).toBe(true);
    });

    it('should return false for actual values', () => {
      expect(isPlaceholder('Asset')).toBe(false);
      expect(isPlaceholder('Property, Plant and Equipment')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isPlaceholder('SELECT H1')).toBe(true);
      expect(isPlaceholder('ENTER SUBCATEGORY')).toBe(true);
    });
  });

  describe('detectUniformValue', () => {
    it('Test Case 1: Should detect uniform H1 across multiple ledgers', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
      ];

      const result = detectUniformValue(ledgers, 'H1');
      expect(result.isUniform).toBe(true);
      expect(result.value).toBe('Asset');
      expect(result.count).toBe(3);
      expect(result.missingCount).toBe(0);
    });

    it('Test Case 1: Should detect uniform H2 across multiple ledgers', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: null } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: undefined } as LedgerRow,
      ];

      const result = detectUniformValue(ledgers, 'H2');
      expect(result.isUniform).toBe(true);
      expect(result.value).toBe('Property, Plant and Equipment');
      expect(result.count).toBe(5);
      expect(result.missingCount).toBe(0);
    });

    it('Test Case 1: Should NOT detect uniform H3 when it is missing/null', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'PPE', H3: null } as LedgerRow,
        { H1: 'Asset', H2: 'PPE', H3: undefined } as LedgerRow,
        { H1: 'Asset', H2: 'PPE', H3: '' } as LedgerRow,
      ];

      const result = detectUniformValue(ledgers, 'H3');
      expect(result.isUniform).toBe(false);
      expect(result.missingCount).toBe(3);
    });

    it('Test Case 2: Should NOT detect uniform when H2 values differ', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Non-current Assets', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
      ];

      const result = detectUniformValue(ledgers, 'H2');
      expect(result.isUniform).toBe(false);
      expect(result.count).toBe(3);
    });

    it('Test Case 3: Should handle mixed H1, H2, H3', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: 'Cash' } as LedgerRow,
        { H1: 'Liability', H2: 'Current Liabilities', H3: 'Payables' } as LedgerRow,
        { H1: 'Income', H2: 'Revenue', H3: 'Sales' } as LedgerRow,
      ];

      const h1Result = detectUniformValue(ledgers, 'H1');
      const h2Result = detectUniformValue(ledgers, 'H2');
      const h3Result = detectUniformValue(ledgers, 'H3');

      expect(h1Result.isUniform).toBe(false);
      expect(h2Result.isUniform).toBe(false);
      expect(h3Result.isUniform).toBe(false);
    });

    it('Test Case 5: Should handle single ledger', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: 'Cash' } as LedgerRow,
      ];

      const h1Result = detectUniformValue(ledgers, 'H1');
      const h2Result = detectUniformValue(ledgers, 'H2');
      const h3Result = detectUniformValue(ledgers, 'H3');

      expect(h1Result.isUniform).toBe(true);
      expect(h1Result.value).toBe('Asset');
      expect(h1Result.count).toBe(1);

      expect(h2Result.isUniform).toBe(true);
      expect(h2Result.value).toBe('Current Assets');

      expect(h3Result.isUniform).toBe(true);
      expect(h3Result.value).toBe('Cash');
    });

    it('Should be case-insensitive', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
        { H1: 'ASSET', H2: 'current assets', H3: '' } as LedgerRow,
        { H1: 'asset', H2: 'Current assets', H3: '' } as LedgerRow,
      ];

      const h1Result = detectUniformValue(ledgers, 'H1');
      const h2Result = detectUniformValue(ledgers, 'H2');

      expect(h1Result.isUniform).toBe(true);
      expect(h2Result.isUniform).toBe(true);
    });

    it('Should handle placeholders as empty', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Select H2', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'H2', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: '', H3: '' } as LedgerRow,
      ];

      const h2Result = detectUniformValue(ledgers, 'H2');
      expect(h2Result.isUniform).toBe(false);
      expect(h2Result.missingCount).toBe(3);
    });

    it('Should return helpful reason messages', () => {
      const uniformLedgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
      ];

      const mixedLedgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
        { H1: 'Liability', H2: 'Current Liabilities', H3: '' } as LedgerRow,
      ];

      const uniformResult = detectUniformValue(uniformLedgers, 'H1');
      expect(uniformResult.reason).toContain('uniform');

      const mixedResult = detectUniformValue(mixedLedgers, 'H1');
      expect(mixedResult.reason).toContain('differ');
    });
  });

  describe('calculateBulkUpdateAutoPopulation', () => {
    it('Test Case 1: Should auto-populate H1 and H2 when uniform, leave H3 empty', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: null } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: undefined } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: null } as LedgerRow,
        { H1: 'Asset', H2: 'Property, Plant and Equipment', H3: undefined } as LedgerRow,
      ];

      const result = calculateBulkUpdateAutoPopulation(ledgers);

      expect(result.h1.isUniform).toBe(true);
      expect(result.h1.value).toBe('Asset');
      expect(result.h1.shouldEnable).toBe(true);

      expect(result.h2.isUniform).toBe(true);
      expect(result.h2.value).toBe('Property, Plant and Equipment');
      expect(result.h2.shouldEnable).toBe(true);

      expect(result.h3.isUniform).toBe(false);
      expect(result.h3.value).toBeUndefined();
      expect(result.h3.shouldEnable).toBe(false);

      expect(result.applyButtonEnabled).toBe(true);
    });

    it('Test Case 2: Should auto-populate H1 only when H2 is mixed', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Non-current Assets', H3: '' } as LedgerRow,
        { H1: 'Asset', H2: 'Current Assets', H3: '' } as LedgerRow,
      ];

      const result = calculateBulkUpdateAutoPopulation(ledgers);

      expect(result.h1.isUniform).toBe(true);
      expect(result.h1.value).toBe('Asset');

      expect(result.h2.isUniform).toBe(false);
      expect(result.h2.value).toBeUndefined();

      expect(result.h3.isUniform).toBe(false);
    });

    it('Test Case 3: Should NOT auto-populate when all H1, H2, H3 are mixed', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: 'Cash' } as LedgerRow,
        { H1: 'Liability', H2: 'Current Liabilities', H3: 'Payables' } as LedgerRow,
        { H1: 'Income', H2: 'Revenue', H3: 'Sales' } as LedgerRow,
      ];

      const result = calculateBulkUpdateAutoPopulation(ledgers);

      expect(result.h1.isUniform).toBe(false);
      expect(result.h2.isUniform).toBe(false);
      expect(result.h3.isUniform).toBe(false);
      expect(result.applyButtonEnabled).toBe(false);
    });

    it('Test Case 4: Should auto-populate all fields when all H1, H2, H3 are uniform', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: 'Cash' } as LedgerRow,
        { H1: 'Asset', H2: 'Current Assets', H3: 'Cash' } as LedgerRow,
      ];

      const result = calculateBulkUpdateAutoPopulation(ledgers);

      expect(result.h1.isUniform).toBe(true);
      expect(result.h1.value).toBe('Asset');

      expect(result.h2.isUniform).toBe(true);
      expect(result.h2.value).toBe('Current Assets');

      expect(result.h3.isUniform).toBe(true);
      expect(result.h3.value).toBe('Cash');

      expect(result.applyButtonEnabled).toBe(true);
    });

    it('Test Case 5: Should handle single ledger', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: 'Cash' } as LedgerRow,
      ];

      const result = calculateBulkUpdateAutoPopulation(ledgers);

      expect(result.h1.isUniform).toBe(true);
      expect(result.h1.value).toBe('Asset');

      expect(result.h2.isUniform).toBe(true);
      expect(result.h2.value).toBe('Current Assets');

      expect(result.h3.isUniform).toBe(true);
      expect(result.h3.value).toBe('Cash');
    });

    it('Should disable apply button when no fields are uniform', () => {
      const ledgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: 'Cash' } as LedgerRow,
        { H1: 'Liability', H2: 'Non-current Liabilities', H3: 'Bonds' } as LedgerRow,
      ];

      const result = calculateBulkUpdateAutoPopulation(ledgers);
      expect(result.applyButtonEnabled).toBe(false);
    });

    it('Should provide a summary of auto-population status', () => {
      const uniformLedgers: LedgerRow[] = [
        { H1: 'Asset', H2: 'Current Assets', H3: null } as LedgerRow,
        { H1: 'Asset', H2: 'Current Assets', H3: null } as LedgerRow,
      ];

      const result = calculateBulkUpdateAutoPopulation(uniformLedgers);
      expect(result.summary).toContain('✓');
      expect(result.summary).toContain('H1');
      expect(result.summary).toContain('H2');
    });

    it('Should handle empty selection', () => {
      const result = calculateBulkUpdateAutoPopulation([]);

      expect(result.h1.isUniform).toBe(false);
      expect(result.h2.isUniform).toBe(false);
      expect(result.h3.isUniform).toBe(false);
      expect(result.applyButtonEnabled).toBe(false);
      expect(result.summary).toContain('Select 1 or more');
    });
  });

  describe('shouldEnableApplyButton', () => {
    it('Should enable when at least one field is uniform', () => {
      const result: BulkUpdateAutoPopulateResult = {
        h1: { isUniform: true, value: 'Asset', shouldEnable: true },
        h2: { isUniform: false, shouldEnable: true },
        h3: { isUniform: false, shouldEnable: false },
        applyButtonEnabled: true,
        summary: 'H1 is uniform',
      };

      expect(shouldEnableApplyButton(result)).toBe(true);
    });

    it('Should disable when no fields are uniform', () => {
      const result: BulkUpdateAutoPopulateResult = {
        h1: { isUniform: false, shouldEnable: true },
        h2: { isUniform: false, shouldEnable: true },
        h3: { isUniform: false, shouldEnable: false },
        applyButtonEnabled: false,
        summary: 'No uniform fields',
      };

      expect(shouldEnableApplyButton(result)).toBe(false);
    });
  });

  describe('prepareBulkUpdatePayload', () => {
    it('Should create payload with all provided values', () => {
      const payload = prepareBulkUpdatePayload('Asset', 'Current Assets', 'Cash');

      expect(payload.H1).toBe('Asset');
      expect(payload.H2).toBe('Current Assets');
      expect(payload.H3).toBe('Cash');
      expect(payload.Auto).toBe('Manual');
      expect(payload['Auto Reason']).toBe('Bulk update applied manually');
    });

    it('Should only include provided values', () => {
      const payload = prepareBulkUpdatePayload('Asset', undefined, undefined);

      expect(payload.H1).toBe('Asset');
      expect(payload.H2).toBeUndefined();
      expect(payload.H3).toBeUndefined();
      expect(payload.Auto).toBe('Manual');
    });

    it('Should not include Auto flag when no values provided', () => {
      const payload = prepareBulkUpdatePayload(undefined, undefined, undefined);

      expect(Object.keys(payload).length).toBe(0);
    });
  });
});
