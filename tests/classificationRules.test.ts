import { applyClassificationRules } from '../src/utils/classificationRules.ts';
import type { LedgerRow } from '../src/services/trialBalanceNewClassification.ts';

const baseRow: LedgerRow = {
  'Ledger Name': '',
  'Primary Group': '',
  'Parent Group': '',
  'Composite Key': '',
  'Opening Balance': 0,
  'Debit': 0,
  'Credit': 0,
  'Closing Balance': 0,
};

const cloneRow = (overrides: Partial<LedgerRow>): LedgerRow => ({
  ...baseRow,
  ...overrides,
});

type TestCase = {
  name: string;
  row: LedgerRow;
  expect: Partial<LedgerRow>;
};

const tests: TestCase[] = [
  {
    name: 'Loans & Advances with land should remain Asset',
    row: cloneRow({
      'Ledger Name': 'Advance for land to XYZ',
      'Primary Group': 'Loans & Advances',
      'Parent Group': 'Loans & Advances',
      'Closing Balance': 1000,
      'H1': 'Asset',
      'H2': 'Loans & Advances',
    }),
    expect: { 'H1': 'Asset' },
  },
  {
    name: 'Current Assets property deposit stays Asset',
    row: cloneRow({
      'Ledger Name': 'Property deposit',
      'Primary Group': 'Current Assets',
      'Parent Group': 'Advances',
      'Closing Balance': 500,
      'H1': 'Asset',
      'H2': 'Other Current Assets',
    }),
    expect: { 'H1': 'Asset' },
  },
  {
    name: 'Sales Accounts sale of property becomes real estate revenue',
    row: cloneRow({
      'Ledger Name': 'Sale of property',
      'Primary Group': 'Sales Accounts',
      'Parent Group': 'Revenue',
      'Closing Balance': -2000,
    }),
    expect: {
      'H1': 'Income',
      'H2': 'Revenue from Operations',
      'H3': 'Sale of real estate properties',
    },
  },
  {
    name: 'Direct Income real estate sale remains Income revenue',
    row: cloneRow({
      'Ledger Name': 'Real estate sale consideration',
      'Primary Group': 'Direct Incomes',
      'Parent Group': 'Income',
      'Closing Balance': -1500,
    }),
    expect: {
      'H1': 'Income',
      'H2': 'Revenue from Operations',
      'H3': 'Sale of real estate properties',
    },
  },
];

let failed = false;

tests.forEach((test) => {
  const result = applyClassificationRules(test.row, [], {});
  const violations = Object.entries(test.expect).filter(([key, value]) => result[key] !== value);
  if (violations.length > 0) {
    failed = true;
    console.error(`Test failed: ${test.name}`);
    violations.forEach(([key, value]) => {
      console.error(`  Expected ${key}=${value}, got ${result[key]}`);
    });
  } else {
    console.log(`Passed: ${test.name}`);
  }
});

if (failed) {
  process.exitCode = 1;
  console.error('classificationRules regression tests failed.');
} else {
  console.log('classificationRules regression tests passed.');
}
