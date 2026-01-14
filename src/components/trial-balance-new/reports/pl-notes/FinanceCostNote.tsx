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

export function FinanceCostNote({ noteNumber, ledgers, reportingScale = 'rupees' }: Props) {
  // Group ledgers by H3 classification (like Changes in Inventories pattern)
  const categorized = useMemo(() => {
    const categories: Record<string, LedgerItem[]> = {
      'On bank loan': [],
      'On assets on finance lease': [],
      'On partners\' capital/member\' capital': [],
      'On Late Payment of taxes': [],
      'Other borrowing costs': [],
      'Loss on foreign exchange transactions and translations considered as finance cost (net)': [],
    };

    ledgers.forEach(ledger => {
      // Extract H3 and H4 from classification string
      const classification = ledger.classification || '';
      const parts = classification.split('>').map(p => p.trim());
      const h3 = parts.length > 1 ? parts[1] : '';
      const h4 = parts.length > 2 ? parts[2] : '';
      // Prefer H4 if available, otherwise use H3
      const classificationText = (h4 || h3).toLowerCase();

      // Use H4/H3 classification to categorize
      if (!classificationText) {
        categories['Other borrowing costs'].push(ledger);
        return;
      }

      if (classificationText.includes('bank loan') || classificationText.includes('loan from bank')) {
        categories['On bank loan'].push(ledger);
      } else if (classificationText.includes('finance lease') || (classificationText.includes('lease') && classificationText.includes('interest'))) {
        categories['On assets on finance lease'].push(ledger);
      } else if ((classificationText.includes('partner') && classificationText.includes('capital')) || (classificationText.includes('member') && classificationText.includes('capital'))) {
        categories['On partners\' capital/member\' capital'].push(ledger);
      } else if ((classificationText.includes('late payment') && classificationText.includes('tax')) || classificationText.includes('interest on tax')) {
        categories['On Late Payment of taxes'].push(ledger);
      } else if ((classificationText.includes('foreign exchange') && classificationText.includes('loss')) || classificationText.includes('forex loss')) {
        categories['Loss on foreign exchange transactions and translations considered as finance cost (net)'].push(ledger);
      } else {
        categories['Other borrowing costs'].push(ledger);
      }
    });

    return categories;
  }, [ledgers]);

  const totals = useMemo(() => {
    // Use closingBalance directly (same as Purchases in Cost of Materials Consumed)
    const bankLoan = categorized['On bank loan'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const financeLease = categorized['On assets on finance lease'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const partnersCapital = categorized['On partners\' capital/member\' capital'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const lateTax = categorized['On Late Payment of taxes'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const interestExpense = bankLoan + financeLease + partnersCapital + lateTax;
    const otherBorrowing = categorized['Other borrowing costs'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const forexLoss = categorized['Loss on foreign exchange transactions and translations considered as finance cost (net)']
      .reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const total = interestExpense + otherBorrowing + forexLoss;

    return { bankLoan, financeLease, partnersCapital, lateTax, interestExpense, otherBorrowing, forexLoss, total };
  }, [categorized]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{noteNumber}. Finance cost</h3>
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
          <TableRow className="font-medium">
            <TableCell>(a)</TableCell>
            <TableCell>Interest expense</TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="pl-6">(i)</TableCell>
            <TableCell className="pl-4">On bank loan</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.bankLoan, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="pl-6">(ii)</TableCell>
            <TableCell className="pl-4">On assets on finance lease</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.financeLease, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="pl-6">(iii)</TableCell>
            <TableCell className="pl-4">On partners' capital/member' capital</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.partnersCapital, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="pl-6">(iv)</TableCell>
            <TableCell className="pl-4">On Late Payment of taxes</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.lateTax, reportingScale)}</TableCell>
          </TableRow>
          <TableRow className="bg-gray-50">
            <TableCell></TableCell>
            <TableCell className="font-medium pl-4">Total Interest expense</TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(totals.interestExpense, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(b)</TableCell>
            <TableCell>Other borrowing costs</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.otherBorrowing, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(c)</TableCell>
            <TableCell>Loss on foreign exchange transactions and translations considered as finance cost (net)</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.forexLoss, reportingScale)}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-gray-100 border-t-2 border-gray-300">
            <TableCell></TableCell>
            <TableCell>Total Finance cost</TableCell>
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
