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

export function EmployeeBenefitsNote({ noteNumber, ledgers, reportingScale = 'rupees' }: Props) {
  // Group ledgers by category
  const categorized = useMemo(() => {
    const categories: Record<string, LedgerItem[]> = {
      'Salaries, wages, bonus and other allowances': [],
      'Contribution to provident and other funds': [],
      'Gratuity expenses': [],
      'Staff welfare expenses': [],
      'Share based payments to employees(ESOP)': [],
      'Director\'s Remuneration': [],
    };

    ledgers.forEach(ledger => {
      const ledgerName = ledger.ledgerName.toLowerCase();
      const groupName = (ledger.groupName || '').toLowerCase();

      if (ledgerName.includes('salary') || ledgerName.includes('wage') || ledgerName.includes('bonus') || 
          ledgerName.includes('allowance') || groupName.includes('salary') || groupName.includes('wage')) {
        categories['Salaries, wages, bonus and other allowances'].push(ledger);
      } else if (ledgerName.includes('provident') || ledgerName.includes('pf') || ledgerName.includes('esi') ||
                 ledgerName.includes('pension') || groupName.includes('provident')) {
        categories['Contribution to provident and other funds'].push(ledger);
      } else if (ledgerName.includes('gratuity')) {
        categories['Gratuity expenses'].push(ledger);
      } else if (ledgerName.includes('director') && ledgerName.includes('remuneration')) {
        categories['Director\'s Remuneration'].push(ledger);
      } else if (ledgerName.includes('esop') || ledgerName.includes('stock option') || 
                 ledgerName.includes('share based')) {
        categories['Share based payments to employees(ESOP)'].push(ledger);
      } else {
        categories['Staff welfare expenses'].push(ledger);
      }
    });

    return categories;
  }, [ledgers]);

  const totals = useMemo(() => {
    const salaries = categorized['Salaries, wages, bonus and other allowances'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const provident = categorized['Contribution to provident and other funds'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const gratuity = categorized['Gratuity expenses'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const welfare = categorized['Staff welfare expenses'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const esop = categorized['Share based payments to employees(ESOP)'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const directors = categorized['Director\'s Remuneration'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const total = salaries + provident + gratuity + welfare + esop + directors;

    return { salaries, provident, gratuity, welfare, esop, directors, total };
  }, [categorized]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{noteNumber}. Employee benefits expense</h3>
        <div className="text-xs text-gray-600">(Including contract labour)</div>
      </div>

      <Table className="text-xs">
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold w-12"></TableHead>
            <TableHead className="font-semibold">Particulars</TableHead>
            <TableHead className="font-semibold text-right">Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">(a)</TableCell>
            <TableCell>Salaries, wages, bonus and other allowances</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.salaries, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(b)</TableCell>
            <TableCell>Contribution to provident and other funds</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.provident, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(c)</TableCell>
            <TableCell>Gratuity expenses</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.gratuity, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(d)</TableCell>
            <TableCell>Staff welfare expenses</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.welfare, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(e)</TableCell>
            <TableCell>Share based payments to employees(ESOP)</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.esop, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(f)</TableCell>
            <TableCell>Director's Remuneration</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.directors, reportingScale)}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-gray-100 border-t-2 border-gray-300">
            <TableCell></TableCell>
            <TableCell>Total Employee benefits expense</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.total, reportingScale)}</TableCell>
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
