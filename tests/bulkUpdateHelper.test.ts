import { computeCommonClassification } from '../src/utils/bulkUpdate.ts';
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

const createRow = (overrides: Partial<LedgerRow>) => ({
  ...baseRow,
  ...overrides,
});

const helperTestCases: Array<{
  name: string;
  rows: LedgerRow[];
  expected: ReturnType<typeof computeCommonClassification>;
}> = [
  {
    name: 'uniform H1/H2 with missing H3',
    rows: Array.from({ length: 5 }, () =>
      createRow({
        H1: 'Asset',
        H2: 'Property, Plant and Equipment',
        H3: '',
      }),
    ),
    expected: {
      commonH1: 'Asset',
      commonH2: 'Property, Plant and Equipment',
      commonH3: '',
      isH1Uniform: true,
      isH2Uniform: true,
      isH3Uniform: false,
    },
  },
  {
    name: 'uniform H1 only',
    rows: [
      createRow({ H1: 'Income', H2: 'Sales Accounts', H3: '' }),
      createRow({ H1: 'Income', H2: 'Revenue from Operations', H3: 'Sale of products' }),
      createRow({ H1: 'Income', H2: '', H3: '' }),
    ],
    expected: {
      commonH1: 'Income',
      commonH2: '',
      commonH3: '',
      isH1Uniform: true,
      isH2Uniform: false,
      isH3Uniform: false,
    },
  },
  {
    name: 'mixed classifications skip auto-fill',
    rows: [
      createRow({ H1: 'Asset', H2: 'Loans & Advances', H3: 'Capital Advances' }),
      createRow({ H1: 'Income', H2: 'Sales Accounts', H3: 'Sale of products' }),
    ],
    expected: {
      commonH1: '',
      commonH2: '',
      commonH3: '',
      isH1Uniform: false,
      isH2Uniform: false,
      isH3Uniform: false,
    },
  },
  {
    name: 'all fields uniform',
    rows: [
      createRow({ H1: 'Expense', H2: 'Indirect Expenses', H3: 'Power and Fuel' }),
      createRow({ H1: 'Expense', H2: 'Indirect Expenses', H3: 'Power and Fuel' }),
    ],
    expected: {
      commonH1: 'Expense',
      commonH2: 'Indirect Expenses',
      commonH3: 'Power and Fuel',
      isH1Uniform: true,
      isH2Uniform: true,
      isH3Uniform: true,
    },
  },
  {
    name: 'single ledger inherits its values',
    rows: [
      createRow({ H1: 'Liability', H2: 'Current Liabilities', H3: 'Sundry Creditors' }),
    ],
    expected: {
      commonH1: 'Liability',
      commonH2: 'Current Liabilities',
      commonH3: 'Sundry Creditors',
      isH1Uniform: true,
      isH2Uniform: true,
      isH3Uniform: true,
    },
  },
];

const runHelperTest = (name: string, payload: { rows: LedgerRow[]; expected: ReturnType<typeof computeCommonClassification> }) => {
  const result = computeCommonClassification(payload.rows);
  const mismatches = Object.entries(payload.expected).filter(([key, value]) => (result as any)[key] !== value);
  if (mismatches.length > 0) {
    console.error(`Test failed: ${name}`);
    mismatches.forEach(([key, value]) => {
      console.error(`  Expected ${key}=${value}, got ${(result as any)[key]}`);
    });
    process.exitCode = 1;
  } else {
    console.log(`Passed: ${name}`);
  }
};

helperTestCases.forEach((testCase) => runHelperTest(testCase.name, testCase));
