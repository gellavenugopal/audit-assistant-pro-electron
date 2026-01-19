import { TrialBalanceLine } from '@/hooks/useTrialBalance';

/**
 * Balance-based reclassification rules for financial statement grouping
 * These rules override the standard parent-based classification when specific
 * balance conditions are met.
 */

export interface ReclassificationResult {
  originalFsArea: string | null;
  newFsArea: string;
  originalAile: string | null;
  newAile: string;
  reclassified: boolean;
  reason: string;
}

/**
 * Check if a ledger parent matches any of the given patterns (case-insensitive)
 */
function matchesPattern(value: string | null | undefined, patterns: string[]): boolean {
  if (!value) return false;
  const lowerValue = value.toLowerCase();
  return patterns.some(pattern => lowerValue.includes(pattern.toLowerCase()));
}

/**
 * Apply balance-based reclassification rules to a trial balance line
 * 
 * Rules:
 * 1. Bank OCC/OD with positive (Debit) balance → Cash and cash equivalents
 * 2. Bank Balance with negative (Credit) balance → Short term borrowings
 * 3. Trade Receivables with negative (Credit) balance → Advance from Customers
 * 4. Trade Payables with positive (Debit) balance → Advance to Suppliers
 */
export function applyBalanceReclassification(line: TrialBalanceLine): ReclassificationResult {
  const closingBalance = Number(line.closing_balance);
  const ledgerParent = line.ledger_parent?.toLowerCase() || '';
  const ledgerPrimaryGroup = line.ledger_primary_group?.toLowerCase() || '';
  
  const originalResult: ReclassificationResult = {
    originalFsArea: line.fs_area,
    newFsArea: line.fs_area || '',
    originalAile: line.aile,
    newAile: line.aile || '',
    reclassified: false,
    reason: '',
  };

  // Rule 1: Bank OCC A/c or Bank OD A/c with positive (Debit) balance
  // Reclassify to "Balances with banks" under Cash and cash equivalents
  const bankOdPatterns = ['bank occ', 'bank od', 'overdraft', 'occ a/c', 'od a/c', 'cash credit'];
  if (matchesPattern(ledgerParent, bankOdPatterns) || matchesPattern(ledgerPrimaryGroup, bankOdPatterns)) {
    if (closingBalance > 0) {
      return {
        ...originalResult,
        newFsArea: 'Cash',
        newAile: 'Asset',
        reclassified: true,
        reason: 'Bank OCC/OD with debit balance reclassified to Cash & Cash Equivalents',
      };
    }
  }

  // Rule 2: Bank Balance with negative (Credit) balance
  // Reclassify to "Secured Loans repayable on demand from banks" under Short term borrowings
  const bankBalancePatterns = ['bank balance', 'balance with bank', 'bank account', 'bank a/c', 'savings account', 'current account'];
  if (matchesPattern(ledgerParent, bankBalancePatterns) || matchesPattern(ledgerPrimaryGroup, bankBalancePatterns)) {
    if (closingBalance < 0) {
      return {
        ...originalResult,
        newFsArea: 'Short Term Borrowings',
        newAile: 'Liability',
        reclassified: true,
        reason: 'Bank balance with credit balance reclassified to Short Term Borrowings',
      };
    }
  }

  // Rule 3: Trade Receivables with negative (Credit) balance
  // Reclassify to "Advance from Customers" under Current Liabilities
  const receivablePatterns = ['trade receivable', 'sundry debtor', 'accounts receivable', 'debtors'];
  if (matchesPattern(ledgerParent, receivablePatterns) || matchesPattern(ledgerPrimaryGroup, receivablePatterns)) {
    if (closingBalance < 0) {
      return {
        ...originalResult,
        newFsArea: 'Other Current Liabilities',
        newAile: 'Liability',
        reclassified: true,
        reason: 'Trade receivable with credit balance reclassified to Advance from Customers',
      };
    }
  }

  // Rule 4: Trade Payables with positive (Debit) balance
  // Reclassify to "Advance to Suppliers" under Current Assets
  const payablePatterns = ['trade payable', 'sundry creditor', 'accounts payable', 'creditors'];
  if (matchesPattern(ledgerParent, payablePatterns) || matchesPattern(ledgerPrimaryGroup, payablePatterns)) {
    if (closingBalance > 0) {
      return {
        ...originalResult,
        newFsArea: 'Other Current',
        newAile: 'Asset',
        reclassified: true,
        reason: 'Trade payable with debit balance reclassified to Advance to Suppliers',
      };
    }
  }

  return originalResult;
}

/**
 * Apply balance-based reclassification to all lines and return updated lines
 * This creates a virtual view with reclassified FS areas for reporting purposes
 */
export function getBalanceReclassifiedLines(lines: TrialBalanceLine[]): TrialBalanceLine[] {
  return lines.map(line => {
    const result = applyBalanceReclassification(line);
    
    if (result.reclassified) {
      return {
        ...line,
        fs_area: result.newFsArea,
        aile: result.newAile,
      };
    }
    
    return line;
  });
}

/**
 * Get a summary of all reclassifications applied
 */
export function getReclassificationSummary(lines: TrialBalanceLine[]): {
  count: number;
  details: Array<{
    accountName: string;
    originalFsArea: string | null;
    newFsArea: string;
    reason: string;
    amount: number;
  }>;
} {
  const details: Array<{
    accountName: string;
    originalFsArea: string | null;
    newFsArea: string;
    reason: string;
    amount: number;
  }> = [];

  for (const line of lines) {
    const result = applyBalanceReclassification(line);
    if (result.reclassified) {
      details.push({
        accountName: line.account_name,
        originalFsArea: result.originalFsArea,
        newFsArea: result.newFsArea,
        reason: result.reason,
        amount: Number(line.closing_balance),
      });
    }
  }

  return {
    count: details.length,
    details,
  };
}
