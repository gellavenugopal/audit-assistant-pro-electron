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
  entityType?: string;
};

function normalize(value?: string): string {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEntity(value?: string): string {
  return normalize(value).replace(/\s+/g, ' ');
}

function isCompanyEntity(entityType?: string): boolean {
  const value = normalizeEntity(entityType);
  return value.includes('private limited') ||
    value.includes('public limited') ||
    value.includes('one person company') ||
    value.includes('opc');
}

function isPartnershipEntity(entityType?: string): boolean {
  const value = normalizeEntity(entityType);
  return value.includes('partnership') || value.includes('limited liability partnership') || value.includes('llp');
}

function normalizeForMatch(value?: string): string {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesPhrase(value: string, phrase: string): boolean {
  if (!value || !phrase) return false;
  const haystack = normalizeForMatch(value);
  const needle = normalizeForMatch(phrase);
  if (!needle) return false;
  const pattern = new RegExp(`(^|\\s)${needle.replace(/\s+/g, '\\s+')}(\\s|$)`, 'i');
  return pattern.test(haystack);
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some(needle => matchesPhrase(value, needle));
}

function addAutoNote(row: LedgerRow, reason: string): LedgerRow {
  return { ...row, Auto: 'Yes', 'Auto Reason': reason };
}

function matchesWord(value: string, word: string): boolean {
  return matchesPhrase(value, word);
}

function matchesGroup(value: string, phrase: string): boolean {
  return matchesPhrase(value, phrase);
}

function hasAnyInLedgerOrParent(ledger: string, parent: string, needles: string[]): boolean {
  return hasAny(ledger, needles) || hasAny(parent, needles);
}

function matchesPhraseInLedgerOrParent(ledger: string, parent: string, phrase: string): boolean {
  return matchesPhrase(ledger, phrase) || matchesPhrase(parent, phrase);
}

function getSalesAccountsH3(ledger: string, parent: string): string {
  if (hasAnyInLedgerOrParent(ledger, parent, ['professional', 'service', 'services'])) return 'Sale of services';
  if (hasAnyInLedgerOrParent(ledger, parent, ['scrap'])) return 'Scrap sales';
  if (hasAnyInLedgerOrParent(ledger, parent, ['export'])) return 'Export incentives';
  if (hasAnyInLedgerOrParent(ledger, parent, ['grant'])) return 'Government grants';
  if (hasAnyInLedgerOrParent(ledger, parent, ['commission'])) return 'Commission income';
  if (hasAnyInLedgerOrParent(ledger, parent, ['rent', 'rental'])) return 'Rental Income';
  if (hasAnyInLedgerOrParent(ledger, parent, ['royalty'])) return 'Royalty income';
  if (matchesPhraseInLedgerOrParent(ledger, parent, 'know how')) return 'Technical know how fees';
  if (hasAnyInLedgerOrParent(ledger, parent, ['insurance'])) return 'Insurance claims';
  if (hasAnyInLedgerOrParent(ledger, parent, ['misc'])) return 'Miscellaneous receipts';
  return 'Sale of products';
}

function getOtherIncomeH3(ledger: string, parent: string): string {
  const isInterest = hasAnyInLedgerOrParent(ledger, parent, ['interest', 'int']);
  if (isInterest) {
    if (hasAnyInLedgerOrParent(ledger, parent, ['income tax', 'tax refund', 'tax'])) {
      return 'Interest income on Tax refunds';
    }
    if (hasAnyInLedgerOrParent(ledger, parent, ['bank', 'fd', 'fixed deposit', 'fixeddeposit'])) {
      return 'Interest income on Bank deposits';
    }
    if (hasAnyInLedgerOrParent(ledger, parent, ['non-current investment', 'non current investment', 'noncurrent investment'])) {
      return 'Interest income on Non-current Investments';
    }
    if (hasAnyInLedgerOrParent(ledger, parent, ['current investment', 'current investments'])) {
      return 'Interest income on Current Investments';
    }
    if (hasAnyInLedgerOrParent(ledger, parent, ['advance', 'advances', 'deposit', 'deposits'])) {
      return 'Interest income on Advances and Deposits';
    }
    if (hasAnyInLedgerOrParent(ledger, parent, ['loan', 'loans'])) {
      return 'Interest income on Loans';
    }
  }

  if (hasAnyInLedgerOrParent(ledger, parent, ['dividend'])) {
    return 'Dividend income on Non-current Investments';
  }

  if ((hasAnyInLedgerOrParent(ledger, parent, ['forex', 'foreign']) && hasAnyInLedgerOrParent(ledger, parent, ['gain', 'loss']))) {
    return 'Gain on Foreign Exchange fluctuations (Net)';
  }

  if (hasAnyInLedgerOrParent(ledger, parent, ['sale']) && hasAnyInLedgerOrParent(ledger, parent, ['fixed asset', 'fixed assets', 'plant', 'property'])) {
    return 'Gain on Foreign Exchange fluctuations (Net)';
  }

  if (hasAnyInLedgerOrParent(ledger, parent, ['written back', 'written off'])) {
    return 'Provisions written back';
  }

  return 'Miscellaneous non-operating Income';
}

function getPpeH3(ledger: string, parent: string): string {
  const rules: Array<{ label: string; keywords: string[] }> = [
    { label: 'Gross Block - Freehold Land', keywords: ['freehold land', 'land freehold', 'owned land', 'plot', 'land asset', 'land property'] },
    { label: 'Gross Block - Leasehold Land', keywords: ['leasehold land', 'land leasehold', 'leased land', 'land on lease', 'long term lease land'] },
    { label: 'Gross Block - Leasehold Improvement', keywords: ['leasehold improvement', 'lease improvement', 'lease renovation', 'lease fit out', 'lease interior', 'tenant improvement'] },
    { label: 'Gross Block - Buildings', keywords: ['office building', 'factory building', 'warehouse', 'godown', 'commercial building', 'civil construction', 'structure', 'building'] },
    { label: 'Gross Block - Plant and Machinery', keywords: ['production machinery', 'manufacturing equipment', 'tools and machinery', 'equipment industrial', 'machinery', 'machine', 'plant'] },
    { label: 'Gross Block - Furniture and Fixtures', keywords: ['office furniture', 'furniture', 'fixtures', 'desk', 'table', 'chair', 'workstation', 'cabinet', 'cupboard', 'rack', 'shelf'] },
    { label: 'Gross Block - Electrical Installations', keywords: ['electrical installation', 'electrical fitting', 'wiring', 'cabling', 'switchboard', 'panel board', 'transformer', 'generator', 'dg set', 'power installation'] },
    { label: 'Gross Block - Office Equipment', keywords: ['office equipment', 'printer', 'scanner', 'photocopier', 'copier machine', 'xerox', 'projector', 'shredder', 'laminator', 'biometric machine', 'attendance machine'] },
    { label: 'Gross Block - Computers', keywords: ['computer', 'desktop', 'laptop', 'notebook', 'server', 'workstation', 'cpu', 'monitor', 'ups', 'router', 'switch', 'networking equipment'] },
    { label: 'Gross Block - Vehicles', keywords: ['commercial vehicle', 'vehicle', 'car', 'truck', 'lorry', 'van', 'bus', 'two wheeler', 'scooter', 'bike'] },
    { label: 'Gross Block - Capital Work-in-Progress (CWIP)', keywords: ['capital work in progress', 'cwip', 'capital wip', 'asset under construction', 'project under construction', 'work in progress capital', 'incomplete asset'] },
  ];

  const matched = rules.find(rule => hasAnyInLedgerOrParent(ledger, parent, rule.keywords));
  return matched ? matched.label : '';
}

function getCashBankH3(primary: string, ledger: string, parent: string): string {
  if (matchesGroup(primary, 'cash-in-hand')) {
    if (hasAnyInLedgerOrParent(ledger, parent, ['cash'])) {
      return 'Cash on hand';
    }
    return '';
  }

  if (!matchesGroup(primary, 'bank accounts')) {
    return '';
  }

  if (hasAnyInLedgerOrParent(ledger, parent, ['eefc', 'exchange earners foreign currency'])) {
    return 'EEFC Account';
  }
  if (hasAnyInLedgerOrParent(ledger, parent, ['margin money', 'margin', 'lien', 'lien marked'])) {
    return 'Bank balances held as margin money';
  }
  if (hasAnyInLedgerOrParent(ledger, parent, ['security', 'secured', 'collateral', 'against borrowing', 'against loan', 'loan security'])) {
    return 'Bank balances held as security against borrowings';
  }
  if (hasAnyInLedgerOrParent(ledger, parent, ['cheque', 'draft', 'dd'])) {
    return 'Cheques, drafts on hand';
  }
  if (hasAnyInLedgerOrParent(ledger, parent, ['fd', 'fdr', 'fixed deposit', 'term deposit', 'td', 'deposit']) &&
    hasAnyInLedgerOrParent(ledger, parent, ['3 months', '90 days', 'upto 3 months', 'short term', 'st'])) {
    return 'Bank deposits with upto three months maturity';
  }
  if (hasAnyInLedgerOrParent(ledger, parent, ['fd', 'fdr', 'fixed deposit', 'term deposit', 'td', 'deposit']) &&
    hasAnyInLedgerOrParent(ledger, parent, ['12 months', '365 days', '1 year', 'upto 12 months'])) {
    return 'Bank deposits with upto twelve months maturity';
  }
  if (hasAnyInLedgerOrParent(ledger, parent, ['saving', 'sb'])) {
    return 'Balances with banks in savings accounts';
  }
  if (hasAnyInLedgerOrParent(ledger, parent, ['current', 'ca'])) {
    return 'Balances with banks in current accounts';
  }

  return 'Other bank balances';
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
  if (row.Auto === 'Manual' && !forceAuto) {
    return row;
  }
  const allowAutoOverride = forceAuto || !hasMeaningfulH2 || !hasMeaningfulH3 || isGenericH2(row['H2']);
  const primary = normalize(row['Primary Group']);
  const parent = normalize(row['Parent Group']);
  const group = primary || parent;
  const ledger = normalize(row['Ledger Name']);
  const businessType = normalize(context.businessType);
  const entityType = context.entityType;
  const isTrading = businessType.includes('trading');
  const isCompany = isCompanyEntity(entityType);
  const isPartnership = isPartnershipEntity(entityType);

  if (allowAutoOverride) {
    const reservesMatch = [
      'reserves and surplus',
      'reserve and surplus',
      'reserves & surplus',
      'reserve & surplus',
    ].some(phrase =>
      matchesGroup(primary, phrase) ||
      matchesGroup(parent, phrase) ||
      matchesGroup(group, phrase) ||
      matchesGroup(ledger, phrase)
    );
    const capitalMatch = matchesGroup(primary, 'capital account') ||
      matchesGroup(parent, 'capital account') ||
      matchesGroup(group, 'capital account');

    if (capitalMatch && reservesMatch) {
      if (hasAnyInLedgerOrParent(ledger, parent, ['capital reserve'])) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': 'Reserves and Surplus',
          'H3': 'Capital Reserve',
        }, 'Reserves & Surplus - Capital Reserve');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['securities premium'])) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': 'Reserves and Surplus',
          'H3': 'Securities Premium',
        }, 'Reserves & Surplus - Securities Premium');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['capital redemption'])) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': 'Reserves and Surplus',
          'H3': 'Capital Redemption Reserve',
        }, 'Reserves & Surplus - Capital Redemption');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['debenture'])) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': 'Reserves and Surplus',
          'H3': 'Debenture Redemption Reserve',
        }, 'Reserves & Surplus - Debenture Redemption');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['revaluation'])) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': 'Reserves and Surplus',
          'H3': 'Revaluation Reserve',
        }, 'Reserves & Surplus - Revaluation');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['share option'])) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': 'Reserves and Surplus',
          'H3': 'Share Option Outstanding Account',
        }, 'Reserves & Surplus - Share Option');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['general'])) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': 'Reserves and Surplus',
          'H3': 'General Reserve',
        }, 'Reserves & Surplus - General');
      }
      return addAutoNote({
        ...row,
        'H1': 'Liability',
        'H2': 'Reserves and Surplus',
        'H3': 'Surplus in Statement of Profit and Loss',
      }, 'Reserves & Surplus - Surplus');
    }

    if ((matchesGroup(parent, 'primary') || matchesGroup(group, 'primary')) &&
      hasAnyInLedgerOrParent(ledger, parent, ['profit', 'loss', 'profit & loss'])) {
      return addAutoNote({
        ...row,
        'H1': 'Liability',
        'H2': 'Reserves and Surplus',
        'H3': 'Surplus in Statement of Profit and Loss',
      }, 'Profit & Loss A/c');
    }
  }

  if (allowAutoOverride && rules.length > 0) {
    const matched = rules.find(rule => {
      const primaryNeedle = normalize(rule.primaryGroupContains);
      const parentNeedle = normalize(rule.parentGroupContains);
      const ledgerNeedle = normalize(rule.ledgerNameContains);
      const primaryMatch = primaryNeedle ? matchesPhrase(primary, primaryNeedle) : true;
      const parentMatch = parentNeedle ? matchesPhrase(parent, parentNeedle) : true;
      const ledgerMatch = ledgerNeedle ? (matchesPhrase(ledger, ledgerNeedle) || matchesPhrase(parent, ledgerNeedle)) : true;
      return primaryMatch && parentMatch && ledgerMatch;
    });

    if (matched) {
      const nextRow: LedgerRow = {
        ...row,
        'H1': matched.h1 || row['H1'] || '',
        'H2': matched.h2 || row['H2'] || '',
        'H3': matched.h3 || row['H3'] || '',
      };
      return addAutoNote(nextRow, 'User Rule');
    }
  }

  if (allowAutoOverride) {
    const isCapitalAccount = normalize(row['H1']) === 'liability' && matchesGroup(group, 'capital account');
    if (isCapitalAccount) {
      if (isCompany) {
        if (hasAnyInLedgerOrParent(ledger, parent, ['share capital'])) {
          return addAutoNote({
            ...row,
            'H1': 'Liability',
            'H2': 'Share Capital',
            'H3': 'Equity - fully paid up',
          }, 'Capital Account - Share Capital');
        }
        if (hasAnyInLedgerOrParent(ledger, parent, ['preference'])) {
          return addAutoNote({
            ...row,
            'H1': 'Liability',
            'H2': 'Share Capital',
            'H3': 'Preference - fully paid up',
          }, 'Capital Account - Preference');
        }
      } else if (isPartnership) {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': "Partners' Capital Account",
          'H3': "Partners' Capital Account",
        }, 'Capital Account - Partnership');
      } else {
        return addAutoNote({
          ...row,
          'H1': 'Liability',
          'H2': "Owners' Capital Account",
          'H3': "Owners' Capital Account",
        }, 'Capital Account - Owner');
      }
    }

    const isPpeGroup = normalize(row['H1']) === 'asset' && [
      'fixed assets',
      'ppe',
      'property plant and equipment',
      'property plant & equipment',
    ].some(phrase => matchesGroup(primary, phrase));
    if (isPpeGroup) {
      return addAutoNote({
        ...row,
        'H1': 'Asset',
        'H2': 'Property, Plant and Equipment',
        'H3': getPpeH3(ledger, parent),
      }, 'Fixed Assets - PPE');
    }

    if (normalize(row['H1']) === 'asset' && (matchesGroup(primary, 'cash-in-hand') || matchesGroup(primary, 'bank accounts'))) {
      const h3 = getCashBankH3(primary, ledger, parent);
      if (h3) {
        return addAutoNote({
          ...row,
          'H1': 'Asset',
          'H2': 'Cash and Bank Balances',
          'H3': h3,
        }, 'Cash & Bank Balances');
      }
    }

    if (matchesGroup(group, 'sales accounts')) {
      return addAutoNote({
        ...row,
        'H1': 'Income',
        'H2': 'Revenue from Operations',
        'H3': getSalesAccountsH3(ledger, parent),
      }, 'Sales Accounts');
    }

    if (matchesGroup(group, 'direct incomes') || matchesGroup(group, 'indirect incomes')) {
      return addAutoNote({
        ...row,
        'H1': 'Income',
        'H2': 'Other Income',
        'H3': getOtherIncomeH3(ledger, parent),
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
      if (hasAnyInLedgerOrParent(ledger, parent, ['interest', 'int', 'int.']) || matchesWord(ledger, 'int') || matchesWord(parent, 'int')) {
        if (hasAnyInLedgerOrParent(ledger, parent, ['bank', 'loan', 'cash credit', 'cc', 'overdraft', 'od'])) {
          return addAutoNote({
            ...row,
            'H1': 'Expense',
            'H2': 'Finance Costs',
            'H3': 'Interest expense on Borrowings',
          }, 'Indirect Expenses - Finance Costs (Borrowings)');
        }
        if (hasAnyInLedgerOrParent(ledger, parent, ['gst', 'income tax', 'tds', 'tax'])) {
          return addAutoNote({
            ...row,
            'H1': 'Expense',
            'H2': 'Finance Costs',
            'H3': 'Interest expense on late payment of taxes',
          }, 'Indirect Expenses - Finance Costs (Taxes)');
        }
        if (hasAnyInLedgerOrParent(ledger, parent, ['partner', 'capital', 'owner'])) {
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
      if (hasAnyInLedgerOrParent(ledger, parent, ['employee'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Salaries and wages',
        }, 'Indirect Expenses - Employee Benefits (Salaries)');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['esi'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Contribution to provident and other funds',
        }, 'Indirect Expenses - Employee Benefits (ESI/PF)');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['bank charge', 'bank charges', 'renewal charge', 'processing charge', 'bg commission'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Finance Costs',
          'H3': 'Other Borrowing costs',
        }, 'Indirect Expenses - Finance Costs (Other Borrowing)');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['depreciation', 'depn', 'amortisation', 'amortization'])) {
        if (hasAnyInLedgerOrParent(ledger, parent, ['amortisation', 'amortization', 'amorti'])) {
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
      if (hasAnyInLedgerOrParent(ledger, parent, ['director', 'directors']) && hasAnyInLedgerOrParent(ledger, parent, ['remuneration', 'remu']) && isCompany) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': "Directors' Remuneration",
        }, 'Indirect Expenses - Directors Remuneration');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['remuneration']) && isPartnership) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': "Partners' Remuneration",
          'H3': "Partners' Remuneration",
        }, 'Indirect Expenses - Partners Remuneration');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['esi'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Contribution to provident and other funds',
        }, 'Indirect Expenses - Employee Benefits (ESI/PF)');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['pf', 'provident', 'esic', 'employee state', 'gratuity'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Contribution to provident and other funds',
        }, 'Indirect Expenses - Provident/Gratuity');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['salary', 'salaries', 'wages', 'wage', 'stipend'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Salaries and wages',
        }, 'Indirect Expenses - Salaries');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['employee'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Employee Benefits Expense',
          'H3': 'Salaries and wages',
        }, 'Indirect Expenses - Employee Benefits (Salaries)');
      }
      if ((hasAnyInLedgerOrParent(ledger, parent, ['income tax', 'tax']) && hasAnyInLedgerOrParent(ledger, parent, ['current', 'current year']))) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Tax Expenses',
          'H3': 'Income Tax - Current Year',
        }, 'Indirect Expenses - Tax Current Year');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['deferred tax', 'deferred'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Tax Expenses',
          'H3': 'Deferred Tax - Origination and reversal of Timing differences',
        }, 'Indirect Expenses - Deferred Tax');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['mat'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Tax Expenses',
          'H3': 'Income Tax - Less: MAT Credit Entitlement',
        }, 'Indirect Expenses - MAT');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['adver', 'marketing'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Advertisement and Marketing',
        }, 'Indirect Expenses - Marketing');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['audit'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': "Auditor's Remuneration",
        }, 'Indirect Expenses - Audit');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['bad debt', 'write off', 'written off'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Bad Debts written off',
        }, 'Indirect Expenses - Bad Debts');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['bad loan', 'bad adva', 'bad adv'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Bad Loans and Advances written off',
        }, 'Indirect Expenses - Bad Loans');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['bank chg', 'bank charge'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Bank Charges',
        }, 'Indirect Expenses - Bank Charges');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['commission', 'brokerage'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Commission and Brokerage',
        }, 'Indirect Expenses - Commission');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['stores', 'spares', 'parts'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Stores and spare parts - Purchase',
        }, 'Indirect Expenses - Stores');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['conveyance', 'local travel'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Conveyance expenses',
        }, 'Indirect Expenses - Conveyance');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['csr', 'corporate social']) && isCompany) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Corporate social responsibility expense',
        }, 'Indirect Expenses - CSR');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['design', 'product', 'development'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Design and product development',
        }, 'Indirect Expenses - Design');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['director sitting fees', 'director commission']) && isCompany) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': "Directors' fees and commission",
        }, 'Indirect Expenses - Directors Fees');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['donation', 'charity'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Donations and charity',
        }, 'Indirect Expenses - Donations');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['electricity', 'power', 'fuel', 'diesel', 'petrol'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Electricity, Power and fuel',
        }, 'Indirect Expenses - Power/Fuel');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['freight', 'carriage', 'forwarding', 'transport'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Freight and forwarding',
        }, 'Indirect Expenses - Freight');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['information', 'technology', 'software'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Information technology services',
        }, 'Indirect Expenses - IT');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['insurance', 'life', 'health', 'key man'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Insurance expenses',
        }, 'Indirect Expenses - Insurance');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['office', 'admin'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Office and Administration',
        }, 'Indirect Expenses - Office/Admin');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['print', 'stationery', 'stationary'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Printing and stationery',
        }, 'Indirect Expenses - Printing');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['professional', 'consultancy', 'retainer'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Professional and consultancy charges',
        }, 'Indirect Expenses - Professional Fees');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['provision']) && hasAnyInLedgerOrParent(ledger, parent, ['debt'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Doubtful Debts',
        }, 'Indirect Expenses - Provision Debts');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['provision']) && hasAnyInLedgerOrParent(ledger, parent, ['loan', 'advance'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Doubtful Loans and Advances',
        }, 'Indirect Expenses - Provision Loans');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['provision']) && hasAnyInLedgerOrParent(ledger, parent, ['warran'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Warranties',
        }, 'Indirect Expenses - Provision Warranties');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['provision'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Provision for Other Expenses',
        }, 'Indirect Expenses - Provision Other');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['rates', 'taxes', 'professional tax', 'ptax', 'trade licence', 'municipal tax', 'late fee'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Rates and Taxes',
        }, 'Indirect Expenses - Rates/Taxes');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['recruitment', 'training'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Recruitment and training charges',
        }, 'Indirect Expenses - Recruitment');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['rent'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Rent expenses',
        }, 'Indirect Expenses - Rent');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['repair', 'r&m']) && hasAnyInLedgerOrParent(ledger, parent, ['building', 'office', 'factory'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Repairs to buildings',
        }, 'Indirect Expenses - Repairs Buildings');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['repair', 'r&m']) && hasAnyInLedgerOrParent(ledger, parent, ['plant', 'machinery', 'p&m'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Repairs to machinery',
        }, 'Indirect Expenses - Repairs Machinery');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['repair', 'r&m'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Repairs and maintenance',
        }, 'Indirect Expenses - Repairs');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['royalty'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Royalty expenses',
        }, 'Indirect Expenses - Royalty');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['security', 'housekeeping'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Security and Housekeeping',
        }, 'Indirect Expenses - Security');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['selling', 'distribution'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Selling and Distribution expenses',
        }, 'Indirect Expenses - Selling');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['telephone', 'mobile', 'internet'])) {
        return addAutoNote({
          ...row,
          'H1': 'Expense',
          'H2': 'Other Expenses',
          'H3': 'Telephone and Internet',
        }, 'Indirect Expenses - Telecom');
      }
      if (hasAnyInLedgerOrParent(ledger, parent, ['travel'])) {
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

  return row;
}



