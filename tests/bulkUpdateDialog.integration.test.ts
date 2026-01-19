import { buildBulkUpdateFormDefaults } from '../src/utils/bulkUpdate.ts';
import type { LedgerRow } from '../src/services/trialBalanceNewClassification.ts';

const scenarioRows: LedgerRow[] = [
  {
    'Ledger Name': 'Land Sale Alpha',
    'Primary Group': 'Sales Accounts',
    'Parent Group': 'Revenue',
    'Composite Key': '1',
    'Opening Balance': 0,
    'Debit': 0,
    'Credit': 0,
    'Closing Balance': -1000,
    'H1': 'Income',
    'H2': 'Revenue from Operations',
    'H3': '',
  },
  {
    'Ledger Name': 'Land Sale Beta',
    'Primary Group': 'Sales Accounts',
    'Parent Group': 'Revenue',
    'Composite Key': '2',
    'Opening Balance': 0,
    'Debit': 0,
    'Credit': 0,
    'Closing Balance': -1200,
    'H1': 'Income',
    'H2': 'Revenue from Operations',
    'H3': '',
  },
];

const formDefaults = buildBulkUpdateFormDefaults(scenarioRows);

const h1 = formDefaults.h1;
const h2 = formDefaults.h2;
const h3 = formDefaults.h3;
const h3Required = formDefaults.isH3Required;

if (h1 !== 'Income') {
  console.error('H1 should prefill as Income for uniform Income rows');
  process.exitCode = 1;
}
if (h2 !== 'Revenue from Operations') {
  console.error('H2 should prefill as Revenue from Operations');
  process.exitCode = 1;
}
if (h3 !== null) {
  console.error('H3 must start blank (null) when missing across selection');
  process.exitCode = 1;
}
if (!h3Required) {
  console.error('H3 must be required when it is not common');
  process.exitCode = 1;
}

console.log('Integration scenario passed: common H1/H2 auto-filled, H3 required.');
