import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (amount: number, reportingScale: string) => {
  if (amount === 0) return '-';
  const sign = amount < 0 ? '-' : '';
  const absAmount = Math.abs(amount);
  switch (reportingScale) {
    case 'rupees': return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    case 'thousands': return `${sign}${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'lakhs': return `${sign}${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'crores': return `${sign}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      if (absAmount >= 10000000) return `${sign}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
};

interface LedgerItem {
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  classification?: string;
}

interface Props {
  noteNumber: string;
  ledgers: LedgerItem[];
  reportingScale?: string;
}

export function OtherIncomeNote({ noteNumber, ledgers, reportingScale = 'rupees' }: Props) {
  // Group ledgers by category
  const categorized = useMemo(() => {
    const categories: Record<string, LedgerItem[]> = {
      // Interest income
      'Interest income on Bank deposits': [],
      'Interest income on Non-current Investments': [],
      'Interest income on Current Investments': [],
      'Interest income on Advances and Deposits': [],
      'Interest income on Loans': [],
      'Interest income on Tax refunds': [],
      
      // Dividend income
      'Dividend income on Non-current Investments': [],
      'Dividend income on Current Investments': [],
      'Dividend income from Subsidiaries': [],
      
      // Net Gain on sale of investments
      'Gain on realisation of Non-current Investments [Net]': [],
      'Gain on realisation of Current Investments [Net]': [],
      
      // Other non-operating income
      'Gain on sale or disposal of Property, Plant and Equipment [Net]': [],
      'Gain on Foreign Exchange fluctuations [Net]': [],
      'Provisions written back': [],
      'Trade Payables written back': [],
      'Other liabilities written back': [],
      'Transfer from reserves': [],
      'Miscellaneous non-operating Income': [],
    };

    ledgers.forEach(ledger => {
      const ledgerName = ledger.ledgerName.toLowerCase();
      const groupName = (ledger.groupName || '').toLowerCase();
      const classification = (ledger.classification || '').toLowerCase();

      // Interest income categorization
      if (ledgerName.includes('interest') && (ledgerName.includes('bank') || groupName.includes('bank'))) {
        categories['Interest income on Bank deposits'].push(ledger);
      } else if (ledgerName.includes('interest') && (ledgerName.includes('non-current invest') || groupName.includes('non-current invest'))) {
        categories['Interest income on Non-current Investments'].push(ledger);
      } else if (ledgerName.includes('interest') && (ledgerName.includes('current invest') || groupName.includes('current invest'))) {
        categories['Interest income on Current Investments'].push(ledger);
      } else if (ledgerName.includes('interest') && (ledgerName.includes('advance') || ledgerName.includes('deposit'))) {
        categories['Interest income on Advances and Deposits'].push(ledger);
      } else if (ledgerName.includes('interest') && ledgerName.includes('loan')) {
        categories['Interest income on Loans'].push(ledger);
      } else if (ledgerName.includes('interest') && ledgerName.includes('tax refund')) {
        categories['Interest income on Tax refunds'].push(ledger);
      }
      
      // Dividend income
      else if (ledgerName.includes('dividend') && (ledgerName.includes('non-current') || groupName.includes('non-current'))) {
        categories['Dividend income on Non-current Investments'].push(ledger);
      } else if (ledgerName.includes('dividend') && (ledgerName.includes('current') || groupName.includes('current'))) {
        categories['Dividend income on Current Investments'].push(ledger);
      } else if (ledgerName.includes('dividend') && ledgerName.includes('subsid')) {
        categories['Dividend income from Subsidiaries'].push(ledger);
      }
      
      // Gains on sale
      else if ((ledgerName.includes('gain') || ledgerName.includes('profit')) && 
               (ledgerName.includes('non-current invest') || classification.includes('non-current invest'))) {
        categories['Gain on realisation of Non-current Investments [Net]'].push(ledger);
      } else if ((ledgerName.includes('gain') || ledgerName.includes('profit')) && 
                 (ledgerName.includes('current invest') || classification.includes('current invest'))) {
        categories['Gain on realisation of Current Investments [Net]'].push(ledger);
      } else if ((ledgerName.includes('gain') || ledgerName.includes('profit')) && 
                 (ledgerName.includes('ppe') || ledgerName.includes('fixed asset') || ledgerName.includes('property'))) {
        categories['Gain on sale or disposal of Property, Plant and Equipment [Net]'].push(ledger);
      }
      
      // Foreign exchange
      else if (ledgerName.includes('foreign exchange') || ledgerName.includes('forex')) {
        categories['Gain on Foreign Exchange fluctuations [Net]'].push(ledger);
      }
      
      // Written back items
      else if (ledgerName.includes('provision') && ledgerName.includes('written back')) {
        categories['Provisions written back'].push(ledger);
      } else if (ledgerName.includes('payable') && ledgerName.includes('written back')) {
        categories['Trade Payables written back'].push(ledger);
      } else if (ledgerName.includes('liabilit') && ledgerName.includes('written back')) {
        categories['Other liabilities written back'].push(ledger);
      } else if (ledgerName.includes('transfer from reserve')) {
        categories['Transfer from reserves'].push(ledger);
      }
      
      // Miscellaneous
      else {
        categories['Miscellaneous non-operating Income'].push(ledger);
      }
    });

    return categories;
  }, [ledgers]);

  const totals = useMemo(() => {
    const calc = (category: string) => 
      categorized[category]?.reduce((sum, l) => sum + Math.abs(l.closingBalance), 0) || 0;

    const interestOnBank = calc('Interest income on Bank deposits');
    const interestOnNonCurrentInv = calc('Interest income on Non-current Investments');
    const interestOnCurrentInv = calc('Interest income on Current Investments');
    const interestOnAdvances = calc('Interest income on Advances and Deposits');
    const interestOnLoans = calc('Interest income on Loans');
    const interestOnTax = calc('Interest income on Tax refunds');
    const totalInterest = interestOnBank + interestOnNonCurrentInv + interestOnCurrentInv + 
                         interestOnAdvances + interestOnLoans + interestOnTax;

    const dividendNonCurrent = calc('Dividend income on Non-current Investments');
    const dividendCurrent = calc('Dividend income on Current Investments');
    const dividendSubsidiaries = calc('Dividend income from Subsidiaries');
    const totalDividend = dividendNonCurrent + dividendCurrent + dividendSubsidiaries;

    const gainNonCurrentInv = calc('Gain on realisation of Non-current Investments [Net]');
    const gainCurrentInv = calc('Gain on realisation of Current Investments [Net]');
    const totalGainInv = gainNonCurrentInv + gainCurrentInv;

    const gainPPE = calc('Gain on sale or disposal of Property, Plant and Equipment [Net]');
    const gainForex = calc('Gain on Foreign Exchange fluctuations [Net]');
    const provisionsWrittenBack = calc('Provisions written back');
    const payablesWrittenBack = calc('Trade Payables written back');
    const liabilitiesWrittenBack = calc('Other liabilities written back');
    const transferReserves = calc('Transfer from reserves');
    const miscellaneous = calc('Miscellaneous non-operating Income');

    const totalOtherNonOperating = gainPPE + gainForex + provisionsWrittenBack + payablesWrittenBack + 
                                   liabilitiesWrittenBack + transferReserves + miscellaneous;

    const grandTotal = totalInterest + totalDividend + totalGainInv + totalOtherNonOperating;

    return {
      interestOnBank,
      interestOnNonCurrentInv,
      interestOnCurrentInv,
      interestOnAdvances,
      interestOnLoans,
      interestOnTax,
      totalInterest,
      dividendNonCurrent,
      dividendCurrent,
      dividendSubsidiaries,
      totalDividend,
      gainNonCurrentInv,
      gainCurrentInv,
      totalGainInv,
      gainPPE,
      gainForex,
      provisionsWrittenBack,
      payablesWrittenBack,
      liabilitiesWrittenBack,
      transferReserves,
      miscellaneous,
      totalOtherNonOperating,
      grandTotal,
    };
  }, [categorized]);

  const renderRow = (label: string, amount: number, indent: boolean = false, bold: boolean = false) => {
    if (amount === 0) return null;
    return (
      <TableRow className={bold ? 'font-semibold bg-gray-50' : ''}>
        <TableCell className={indent ? 'pl-6 text-xs' : 'text-xs'}>{label}</TableCell>
        <TableCell className="text-right text-xs">{formatCurrency(amount, reportingScale)}</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{noteNumber}. Other income</h3>
      </div>

      <Table className="text-xs">
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Particulars</TableHead>
            <TableHead className="font-semibold text-right">Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Interest Income */}
          {totals.totalInterest > 0 && (
            <>
              <TableRow className="font-semibold bg-blue-50">
                <TableCell colSpan={2}>Interest income</TableCell>
              </TableRow>
              {renderRow('Interest income on Bank deposits', totals.interestOnBank, true)}
              {renderRow('Interest income on Non-current Investments', totals.interestOnNonCurrentInv, true)}
              {renderRow('Interest income on Current Investments', totals.interestOnCurrentInv, true)}
              {renderRow('Interest income on Advances and Deposits', totals.interestOnAdvances, true)}
              {renderRow('Interest income on Loans', totals.interestOnLoans, true)}
              {renderRow('Interest income on Tax refunds', totals.interestOnTax, true)}
            </>
          )}

          {/* Dividend Income */}
          {totals.totalDividend > 0 && (
            <>
              <TableRow className="font-semibold bg-blue-50">
                <TableCell colSpan={2}>Dividend income</TableCell>
              </TableRow>
              {renderRow('Dividend income on Non-current Investments', totals.dividendNonCurrent, true)}
              {renderRow('Dividend income on Current Investments', totals.dividendCurrent, true)}
              {renderRow('Dividend income from Subsidiaries', totals.dividendSubsidiaries, true)}
            </>
          )}

          {/* Net Gain on sale of investments */}
          {totals.totalGainInv > 0 && (
            <>
              <TableRow className="font-semibold bg-blue-50">
                <TableCell colSpan={2}>Net Gain on sale of investments</TableCell>
              </TableRow>
              {renderRow('Gain on realisation of Non-current Investments [Net]', totals.gainNonCurrentInv, true)}
              {renderRow('Gain on realisation of Current Investments [Net]', totals.gainCurrentInv, true)}
            </>
          )}

          {/* Other non-operating income */}
          {totals.totalOtherNonOperating > 0 && (
            <>
              <TableRow className="font-semibold bg-blue-50">
                <TableCell colSpan={2}>Other non-operating income</TableCell>
              </TableRow>
              {renderRow('Gain on sale or disposal of Property, Plant and Equipment [Net]', totals.gainPPE, true)}
              {renderRow('Gain on Foreign Exchange fluctuations [Net]', totals.gainForex, true)}
              {renderRow('Provisions written back', totals.provisionsWrittenBack, true)}
              {renderRow('Trade Payables written back', totals.payablesWrittenBack, true)}
              {renderRow('Other liabilities written back', totals.liabilitiesWrittenBack, true)}
              {renderRow('Transfer from reserves', totals.transferReserves, true)}
              {renderRow('Miscellaneous non-operating Income', totals.miscellaneous, true)}
            </>
          )}

          {/* Total */}
          <TableRow className="font-bold bg-gray-100 border-t-2 border-gray-300">
            <TableCell>Total Other Income</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.grandTotal, reportingScale)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Ledger-wise details */}
      <details className="mt-4">
        <summary className="text-xs font-medium cursor-pointer text-blue-600 hover:text-blue-800">
          View Ledger-wise Details
        </summary>
        <div className="mt-2 space-y-4">
          {Object.entries(categorized).map(([category, items]) => 
            items.length > 0 ? (
              <div key={category} className="ml-4">
                <h4 className="text-xs font-medium text-gray-700 mb-1">{category}:</h4>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs">Ledger Name</TableHead>
                      <TableHead className="text-xs">Group</TableHead>
                      <TableHead className="text-xs text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{item.ledgerName}</TableCell>
                        <TableCell className="text-xs">{item.groupName}</TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(Math.abs(item.closingBalance), reportingScale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null
          )}
        </div>
      </details>
    </div>
  );
}
