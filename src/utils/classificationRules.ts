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

export type ClassificationContext = {
  businessType?: string;
  force?: boolean;
};

function normalize(value?: string): string {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some(needle => value.includes(needle));
}

function addAutoNote(row: LedgerRow, reason: string): LedgerRow {
  return { ...row, Auto: 'Yes', 'Auto Reason': reason };
}

function matchesWord(value: string, word: string): boolean {
  const pattern = new RegExp(`\\b${word}\\b`, 'i');
  return pattern.test(value);
}

function matchesGroup(value: string, phrase: string): boolean {
  if (!value) return false;
  const escaped = phrase
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
  return pattern.test(value);
}

function getSalesAccountsH3(ledger: string): string {
  if (hasAny(ledger, ['professional', 'service', 'services'])) return 'Sale of services';
  if (hasAny(ledger, ['scrap'])) return 'Scrap sales';
  if (hasAny(ledger, ['export'])) return 'Export incentives';
  if (hasAny(ledger, ['grant'])) return 'Government grants';
  if (hasAny(ledger, ['commission'])) return 'Commission income';
  if (hasAny(ledger, ['rent', 'rental'])) return 'Rental Income';
  if (hasAny(ledger, ['royalty'])) return 'Royalty income';
  if (hasAny(ledger, ['know', 'how'])) return 'Technical know how fees';
  if (hasAny(ledger, ['insurance'])) return 'Insurance claims';
  if (hasAny(ledger, ['misc'])) return 'Miscellaneous receipts';
  return 'Sale of products';
}

function getOtherIncomeH3(ledger: string): string {
  const isInterest = ledger.includes('interest') || matchesWord(ledger, 'int');
  if (isInterest) {
    if (hasAny(ledger, ['income tax', 'tax refund', 'tax'])) {
      return 'Interest income on Tax refunds';
    }
    if (hasAny(ledger, ['bank', 'fd', 'fixed deposit', 'fixeddeposit'])) {
      return 'Interest income on Bank deposits';
    }
    if (hasAny(ledger, ['non-current investment', 'non current investment', 'noncurrent investment'])) {
      return 'Interest income on Non-current Investments';
    }
    if (hasAny(ledger, ['current investment', 'current investments'])) {
      return 'Interest income on Current Investments';
    }
    if (hasAny(ledger, ['advance', 'advances', 'deposit', 'deposits'])) {
      return 'Interest income on Advances and Deposits';
    }
    if (hasAny(ledger, ['loan', 'loans'])) {
      return 'Interest income on Loans';
    }
  }

  if (hasAny(ledger, ['dividend'])) {
    return 'Dividend income on Non-current Investments';
  }

  if ((hasAny(ledger, ['forex', 'foreign']) && hasAny(ledger, ['gain', 'loss']))) {
    return 'Gain on Foreign Exchange fluctuations (Net)';
  }

  if (ledger.includes('sale') && hasAny(ledger, ['fixed asset', 'fixed assets', 'plant', 'property'])) {
    return 'Gain on Foreign Exchange fluctuations (Net)';
  }

  if (hasAny(ledger, ['written back', 'written off'])) {
    return 'Provisions written back';
  }

  return 'Miscellaneous non-operating Income';
}

function isUserDefined(value?: string): boolean {
  return normalize(value) === 'user_defined' || normalize(value) === 'user defined';
}

function isPlaceholder(value?: string): boolean {
  const normalized = normalize(value);
  if (!normalized) return true;
  return normalized === 'h2' ||
    normalized === 'h3' ||
    normalized === 'select h1' ||
    normalized === 'select h1/h2' ||
    normalized === 'select h1 h2';
}

function isGenericH2(value?: string): boolean {
  const normalized = normalize(value);
  return normalized === 'other exper' ||
    normalized === 'other expense' ||
    normalized === 'other expenses';
}

export function applyClassificationRules(
  row: LedgerRow,
  rules: ClassificationRule[],
  context: ClassificationContext = {}
): LedgerRow {
  const hasMeaningfulH2 = !isPlaceholder(row['H2']);
  const hasMeaningfulH3 = !isPlaceholder(row['H3']);
  const forceAuto = context.force === true;
  const allowAutoOverride = forceAuto || !hasMeaningfulH2 || !hasMeaningfulH3 || isGenericH2(row['H2']);
  if (allowAutoOverride) {
    const primary = normalize(row['Primary Group']);
    const parent = normalize(row['Parent Group']);
    const group = primary || parent;
    const ledger = normalize(row['Ledger Name']);
    const businessType = normalize(context.businessType);
    const isTrading = businessType.includes('trading');

    if (matchesGroup(group, 'sales accounts')) {
      return addAutoNote({
        ...row,
        'H1': 'Income',
        'H2': 'Revenue from Operations',
        'H3': getSalesAccountsH3(ledger),
      }, 'Sales Accounts');
    }

    if (matchesGroup(group, 'direct incomes') || matchesGroup(group, 'indirect incomes')) {
      return addAutoNote({
        ...row,
        'H1': 'Income',
        'H2': 'Other Income',
        'H3': getOtherIncomeH3(ledger),
      }, 'Direct/Indirect Incomes');
    }

    if (matchesGroup(group, 'purchase accounts')) {
      if (isTrading) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Purchases of Stock in Trade',
          'H3': 'Purchases of Stock in Trade',
        }, 'Purchase Accounts (Trading)');
      }
      return addAutoNote({
        ...row,
        'H1': 'Expense',
        'H2': 'Cost of Materials Consumed',
        'H3': 'Purchase of Raw Materials',
      }, 'Purchase Accounts');
    }

    if (matchesGroup(group, 'stock-in-hand')) {
      if (isTrading) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Change in Inventories',
          'H3': 'Change in Inventories',
        }, 'Stock-in-Hand (Trading)');
      }
    }

    if (matchesGroup(group, 'indirect expenses')) {
      const haystack = `${ledger} ${parent}`;
      if (hasAny(haystack, ['interest', 'int.']) || matchesWord(haystack, 'int')) {
        if (hasAny(haystack, ['bank', 'loan', 'cash credit', 'cc', 'overdraft', 'od'])) {
          return addAutoNote({
            ...row,
            'H1': 'Expense',
            'H2': 'Finance Costs',
            'H3': 'Interest expense on Borrowings',
          }, 'Indirect Expenses - Finance Costs (Borrowings)');
        }
        if (hasAny(haystack, ['gst', 'income tax', 'tds', 'tax'])) {
          return addAutoNote({
            ...row,
            'H1': 'Expense',
            'H2': 'Finance Costs',
            'H3': 'Interest expense on late payment of taxes',
          }, 'Indirect Expenses - Finance Costs (Taxes)');
        }
        if (hasAny(haystack, ['partner', 'capital', 'owner'])) {
          return addAutoNote({
            ...row,
            'H1': 'Expense',
            'H2': 'Finance Costs',
            'H3': "Interest on Partners' or Owners' Capital",
          }, 'Indirect Expenses - Finance Costs (Partners Capital)');
        }
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Finance Costs',
          'H3': 'Interest expense others',
        }, 'Indirect Expenses - Finance Costs');
      }
      if (hasAny(haystack, ['bank charge', 'bank charges', 'renewal charge', 'processing charge', 'bg commission'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Finance Costs',
          'H3': 'Other Borrowing costs',
        }, 'Indirect Expenses - Finance Costs (Other Borrowing)');
      }
      if (hasAny(haystack, ['depreciation', 'depn', 'amortisation', 'amortization'])) {
        if (hasAny(haystack, ['amortisation', 'amortization', 'amorti'])) {
          return addAutoNote({
            ...row,
            'H1': 'Expense',
            'H2': 'Depreciation and Amortisation Expense',
            'H3': 'Amortisation of Intangible Assets',
          }, 'Indirect Expenses - Amortisation');
        }
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Depreciation and Amortisation Expense',
          'H3': 'Depreciation on Property, Plant and Equipment',
        }, 'Indirect Expenses - Depreciation');
      }
      if (hasAny(haystack, ['remuneration'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': "Partners' Remuneration",
          'H3': "Partners' Remuneration",
        }, 'Indirect Expenses - Partners Remuneration');
      }
      if (hasAny(haystack, ['salary', 'salaries', 'wages', 'wage', 'stipend'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Salaries and wages',
        }, 'Indirect Expenses - Salaries');
      }
      if (hasAny(haystack, ['director', 'remuneration'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': "Directors' Remuneration",
        }, 'Indirect Expenses - Directors Remuneration');
      }
      if (hasAny(haystack, ['pf', 'provident', 'esic', 'employee state', 'gratuity'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Contribution to provident and other funds',
        }, 'Indirect Expenses - Provident/Gratuity');
      }
      if (hasAny(haystack, ['income tax', 'current year'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Tax Expenses',
          'H3': 'Income Tax - Current Year',
        }, 'Indirect Expenses - Tax Current Year');
      }
      if (hasAny(haystack, ['deferred tax', 'deferred'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Tax Expenses',
          'H3': 'Deferred Tax - Origination and reversal of Timing differences',
        }, 'Indirect Expenses - Deferred Tax');
      }
      if (hasAny(haystack, ['mat'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Tax Expenses',
          'H3': 'Income Tax - Less: MAT Credit Entitlement',
        }, 'Indirect Expenses - MAT');
      }
      if (hasAny(haystack, ['adver', 'marketing'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Advertisement and Marketing',
        }, 'Indirect Expenses - Marketing');
      }
      if (hasAny(haystack, ['audit'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': "Auditor's Remuneration",
        }, 'Indirect Expenses - Audit');
      }
      if (hasAny(haystack, ['bad debt', 'write off', 'written off'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Bad Debts written off',
        }, 'Indirect Expenses - Bad Debts');
      }
      if (hasAny(haystack, ['bad loan', 'bad adva', 'bad adv'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Bad Loans and Advances written off',
        }, 'Indirect Expenses - Bad Loans');
      }
      if (hasAny(haystack, ['bank chg', 'bank charge'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Bank Charges',
        }, 'Indirect Expenses - Bank Charges');
      }
      if (hasAny(haystack, ['commission', 'brokerage'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Commission and Brokerage',
        }, 'Indirect Expenses - Commission');
      }
      if (hasAny(haystack, ['stores', 'spares', 'parts'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Stores and spare parts - Purchase',
        }, 'Indirect Expenses - Stores');
      }
      if (hasAny(haystack, ['conveyance', 'local travel'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Conveyance expenses',
        }, 'Indirect Expenses - Conveyance');
      }
      if (hasAny(haystack, ['csr', 'corporate social'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Corporate social responsibility expense',
        }, 'Indirect Expenses - CSR');
      }
      if (hasAny(haystack, ['design', 'product', 'development'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Design and product development',
        }, 'Indirect Expenses - Design');
      }
      if (hasAny(haystack, ['director sitting fees', 'director commission'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': "Directors' fees and commission",
        }, 'Indirect Expenses - Directors Fees');
      }
      if (hasAny(haystack, ['donation', 'charity'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Donations and charity',
        }, 'Indirect Expenses - Donations');
      }
      if (hasAny(haystack, ['electricity', 'power', 'fuel', 'diesel', 'petrol'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Electricity, Power and fuel',
        }, 'Indirect Expenses - Power/Fuel');
      }
      if (hasAny(haystack, ['freight', 'carriage', 'forwarding', 'transport'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Freight and forwarding',
        }, 'Indirect Expenses - Freight');
      }
      if (hasAny(haystack, ['information', 'technology', 'software'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Information technology services',
        }, 'Indirect Expenses - IT');
      }
      if (hasAny(haystack, ['insurance', 'life', 'health', 'key man'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Insurance expenses',
        }, 'Indirect Expenses - Insurance');
      }
      if (hasAny(haystack, ['office', 'admin'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Office and Administration',
        }, 'Indirect Expenses - Office/Admin');
      }
      if (hasAny(haystack, ['print', 'stationery', 'stationary'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Printing and stationery',
        }, 'Indirect Expenses - Printing');
      }
      if (hasAny(haystack, ['professional', 'consultancy', 'retainer'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Professional and consultancy charges',
        }, 'Indirect Expenses - Professional Fees');
      }
      if (hasAny(haystack, ['provision', 'debt'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Doubtful Debts',
        }, 'Indirect Expenses - Provision Debts');
      }
      if (hasAny(haystack, ['provision', 'loan', 'advance'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Doubtful Loans and Advances',
        }, 'Indirect Expenses - Provision Loans');
      }
      if (hasAny(haystack, ['provision', 'warran'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Warranties',
        }, 'Indirect Expenses - Provision Warranties');
      }
      if (hasAny(haystack, ['provision'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Other Expenses',
        }, 'Indirect Expenses - Provision Other');
      }
      if (hasAny(haystack, ['rates', 'taxes', 'professional tax', 'ptax', 'trade licence', 'municipal tax', 'late fee'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Rates and Taxes',
        }, 'Indirect Expenses - Rates/Taxes');
      }
      if (hasAny(haystack, ['recruitment', 'training'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Recruitment and training charges',
        }, 'Indirect Expenses - Recruitment');
      }
      if (hasAny(haystack, ['rent'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Rent expenses',
        }, 'Indirect Expenses - Rent');
      }
      if (hasAny(haystack, ['repair', 'r&m']) && hasAny(haystack, ['building', 'office', 'factory'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Repairs to buildings',
        }, 'Indirect Expenses - Repairs Buildings');
      }
      if (hasAny(haystack, ['repair', 'r&m']) && hasAny(haystack, ['plant', 'machinery', 'p&m'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Repairs to machinery',
        }, 'Indirect Expenses - Repairs Machinery');
      }
      if (hasAny(haystack, ['repair', 'r&m'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Repairs and maintenance',
        }, 'Indirect Expenses - Repairs');
      }
      if (hasAny(haystack, ['royalty'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Royalty expenses',
        }, 'Indirect Expenses - Royalty');
      }
      if (hasAny(haystack, ['security', 'housekeeping'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Security and Housekeeping',
        }, 'Indirect Expenses - Security');
      }
      if (hasAny(haystack, ['selling', 'distribution'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Selling and Distribution expenses',
        }, 'Indirect Expenses - Selling');
      }
      if (hasAny(haystack, ['telephone', 'mobile', 'internet'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Telephone and Internet',
        }, 'Indirect Expenses - Telecom');
      }
      if (hasAny(haystack, ['travel'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Travelling expenses',
        }, 'Indirect Expenses - Travel');
      }
      return addAutoNote({
        ...row,
        'H1': 'Expense',
        'H2': 'Other Expenses',
        'H3': 'Miscellaneous other expenses',
      }, 'Indirect Expenses - Other');
    }

    if (matchesGroup(group, 'direct expenses') && !matchesGroup(group, 'indirect expenses')) {
      if (isTrading) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': row['H3'] || '',
        }, 'Direct Expenses (Trading)');
      }
      return addAutoNote({
        ...row,
        'H1': 'Expense',
        'H2': 'Cost of Materials Consumed',
        'H3': 'Other Direct expenses',
      }, 'Direct Expenses');
    }
  }

  if (!allowAutoOverride || rules.length === 0) return row;

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

