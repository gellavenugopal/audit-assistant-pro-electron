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
    default: return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

export function OtherExpensesNote({ noteNumber, ledgers, reportingScale = 'rupees' }: Props) {
  // Group ledgers by category
  const categorized = useMemo(() => {
    const categories: Record<string, LedgerItem[]> = {
      'Consumption of stores and spare parts': [],
      'Electricity, Power and fuel': [],
      'Rent expenses': [],
      'Repairs to buildings': [],
      'Repairs to machinery': [],
      'Repairs and maintenance': [],
      'Insurance expenses': [],
      'Rates and Taxes': [],
      'Royalty expenses': [],
      'Processing and manufacturing charges': [],
      'Design and product development': [],
      'Recruitment and training charges': [],
      'Directors\' fees and commission': [],
      'Professional and consultancy charges': [],
      'Payment to Auditors': [],
      'Printing and stationery': [],
      'Telephone and Internet': [],
      'Information technology services': [],
      'Office and Administration': [],
      'Security and Housekeeping': [],
      'Travelling expenses': [],
      'Conveyance expenses': [],
      'Freight and forwarding': [],
      'Advertisement and Marketing': [],
      'Selling and Distribution expenses': [],
      'Commission and Brokerage': [],
      'Donations and charity': [],
      'Corporate social responsibility expense': [],
      'Miscellaneous expenses': [],
      'Loss on realisation of Non-Current Investments [Net]': [],
      'Loss on realisation of Current Investments [Net]': [],
      'Loss on sale or disposal of Property, Plant and Equipment [Net]': [],
      'Loss on Foreign Exchange fluctuations [Net]': [],
      'Bad Debts written off': [],
      'Bad Loans and Advances written off': [],
      'Provision for Diminution in value of Investments': [],
      'Provision for Doubtful Debts': [],
      'Provision for Doubtful Loans and Advances': [],
      'Provision for Warranties': [],
      'Provision for Other Expenses': [],
    };

    ledgers.forEach(ledger => {
      const ledgerName = ledger.ledgerName.toLowerCase();
      const groupName = (ledger.groupName || '').toLowerCase();

      // Use a comprehensive keyword matching
      if (ledgerName.includes('stores') || ledgerName.includes('spare')) {
        categories['Consumption of stores and spare parts'].push(ledger);
      } else if (ledgerName.includes('electric') || ledgerName.includes('power') || ledgerName.includes('fuel')) {
        categories['Electricity, Power and fuel'].push(ledger);
      } else if (ledgerName.includes('rent')) {
        categories['Rent expenses'].push(ledger);
      } else if (ledgerName.includes('repair') && ledgerName.includes('building')) {
        categories['Repairs to buildings'].push(ledger);
      } else if (ledgerName.includes('repair') && ledgerName.includes('machinery')) {
        categories['Repairs to machinery'].push(ledger);
      } else if (ledgerName.includes('repair') || ledgerName.includes('maintenance')) {
        categories['Repairs and maintenance'].push(ledger);
      } else if (ledgerName.includes('insurance')) {
        categories['Insurance expenses'].push(ledger);
      } else if (ledgerName.includes('rate') || ledgerName.includes('tax') && !ledgerName.includes('income tax')) {
        categories['Rates and Taxes'].push(ledger);
      } else if (ledgerName.includes('royalty')) {
        categories['Royalty expenses'].push(ledger);
      } else if (ledgerName.includes('processing') || ledgerName.includes('manufacturing charge')) {
        categories['Processing and manufacturing charges'].push(ledger);
      } else if (ledgerName.includes('design') || ledgerName.includes('product development') || ledgerName.includes('r&d')) {
        categories['Design and product development'].push(ledger);
      } else if (ledgerName.includes('recruitment') || ledgerName.includes('training')) {
        categories['Recruitment and training charges'].push(ledger);
      } else if (ledgerName.includes('director') && (ledgerName.includes('fee') || ledgerName.includes('commission'))) {
        categories['Directors\' fees and commission'].push(ledger);
      } else if (ledgerName.includes('professional') || ledgerName.includes('consultancy') || ledgerName.includes('legal')) {
        categories['Professional and consultancy charges'].push(ledger);
      } else if (ledgerName.includes('auditor') || ledgerName.includes('audit fee')) {
        categories['Payment to Auditors'].push(ledger);
      } else if (ledgerName.includes('printing') || ledgerName.includes('stationery')) {
        categories['Printing and stationery'].push(ledger);
      } else if (ledgerName.includes('telephone') || ledgerName.includes('mobile') || ledgerName.includes('internet')) {
        categories['Telephone and Internet'].push(ledger);
      } else if (ledgerName.includes('information technology') || ledgerName.includes('it service') || ledgerName.includes('software')) {
        categories['Information technology services'].push(ledger);
      } else if (ledgerName.includes('office') || ledgerName.includes('administration')) {
        categories['Office and Administration'].push(ledger);
      } else if (ledgerName.includes('security') || ledgerName.includes('housekeeping')) {
        categories['Security and Housekeeping'].push(ledger);
      } else if (ledgerName.includes('travel')) {
        categories['Travelling expenses'].push(ledger);
      } else if (ledgerName.includes('conveyance') || ledgerName.includes('vehicle')) {
        categories['Conveyance expenses'].push(ledger);
      } else if (ledgerName.includes('freight') || ledgerName.includes('forward') || ledgerName.includes('cargo')) {
        categories['Freight and forwarding'].push(ledger);
      } else if (ledgerName.includes('advertis') || ledgerName.includes('marketing') || ledgerName.includes('promotion')) {
        categories['Advertisement and Marketing'].push(ledger);
      } else if (ledgerName.includes('selling') || ledgerName.includes('distribution')) {
        categories['Selling and Distribution expenses'].push(ledger);
      } else if (ledgerName.includes('commission') || ledgerName.includes('brokerage')) {
        categories['Commission and Brokerage'].push(ledger);
      } else if (ledgerName.includes('donation') || ledgerName.includes('charity')) {
        categories['Donations and charity'].push(ledger);
      } else if (ledgerName.includes('csr') || ledgerName.includes('corporate social')) {
        categories['Corporate social responsibility expense'].push(ledger);
      } else if (ledgerName.includes('loss') && ledgerName.includes('non-current invest')) {
        categories['Loss on realisation of Non-Current Investments [Net]'].push(ledger);
      } else if (ledgerName.includes('loss') && ledgerName.includes('current invest')) {
        categories['Loss on realisation of Current Investments [Net]'].push(ledger);
      } else if (ledgerName.includes('loss') && (ledgerName.includes('ppe') || ledgerName.includes('fixed asset'))) {
        categories['Loss on sale or disposal of Property, Plant and Equipment [Net]'].push(ledger);
      } else if (ledgerName.includes('loss') && ledgerName.includes('foreign exchange')) {
        categories['Loss on Foreign Exchange fluctuations [Net]'].push(ledger);
      } else if (ledgerName.includes('bad debt') && ledgerName.includes('written off')) {
        categories['Bad Debts written off'].push(ledger);
      } else if (ledgerName.includes('bad loan') || ledgerName.includes('advance') && ledgerName.includes('written off')) {
        categories['Bad Loans and Advances written off'].push(ledger);
      } else if (ledgerName.includes('provision') && ledgerName.includes('invest')) {
        categories['Provision for Diminution in value of Investments'].push(ledger);
      } else if (ledgerName.includes('provision') && ledgerName.includes('doubtful debt')) {
        categories['Provision for Doubtful Debts'].push(ledger);
      } else if (ledgerName.includes('provision') && ledgerName.includes('doubtful loan')) {
        categories['Provision for Doubtful Loans and Advances'].push(ledger);
      } else if (ledgerName.includes('provision') && ledgerName.includes('warrant')) {
        categories['Provision for Warranties'].push(ledger);
      } else if (ledgerName.includes('provision')) {
        categories['Provision for Other Expenses'].push(ledger);
      } else {
        categories['Miscellaneous expenses'].push(ledger);
      }
    });

    return categories;
  }, [ledgers]);

  const renderCategoryRows = () => {
    const rows: JSX.Element[] = [];

    Object.entries(categorized).forEach(([category, items]) => {
      if (items.length > 0) {
        const total = items.reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
        rows.push(
          <TableRow key={category}>
            <TableCell className="text-xs">{category}</TableCell>
            <TableCell className="text-right text-xs">{formatCurrency(total, reportingScale)}</TableCell>
          </TableRow>
        );
      }
    });

    // User Defined section placeholder
    rows.push(
        <TableRow key="user-defined" className="bg-yellow-50">
          <TableCell className="text-xs font-semibold">User Defined:</TableCell>
          <TableCell></TableCell>
        </TableRow>
      );


    return rows;
  };

  const grandTotal = useMemo(() => {
    return ledgers.reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
  }, [ledgers]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{noteNumber}. Other Expenses</h3>
      </div>

      <Table className="text-xs">
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Particulars</TableHead>
            <TableHead className="font-semibold text-right">Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderCategoryRows()}
          <TableRow className="font-bold bg-gray-100 border-t-2 border-gray-300">
            <TableCell>Total Other Expenses</TableCell>
            <TableCell className="text-right">{formatCurrency(grandTotal, reportingScale)}</TableCell>
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
