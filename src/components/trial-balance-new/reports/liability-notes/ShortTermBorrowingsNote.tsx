import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerRow } from '@/services/trialBalanceNewClassification';

interface ShortTermBorrowingsNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function ShortTermBorrowingsNote({ data, noteNumber, reportingScale = 'rupees' }: ShortTermBorrowingsNoteProps) {
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'thousands':
        return `${sign}${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      case 'lakhs':
        return `${sign}${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      case 'crores':
        return `${sign}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      default:
        return absAmount >= 10000000 ? `${sign}${(absAmount / 10000000).toFixed(2)} Cr` : absAmount >= 100000 ? `${sign}${(absAmount / 100000).toFixed(2)} L` : `${sign}${absAmount.toLocaleString('en-IN')}`;
    }
  };

  const borrowingsLedgers = useMemo(() => {
    return data.filter(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return (h4.includes('short') && (h4.includes('borrowing') || h4.includes('loan'))) ||
             ledgerName.includes('bank od') || ledgerName.includes('bank o/d') ||
             ledgerName.includes('cash credit') || ledgerName.includes('working capital loan');
    });
  }, [data]);

  const categories = useMemo(() => {
    const secured: LedgerRow[] = [];
    const unsecured: LedgerRow[] = [];

    borrowingsLedgers.forEach(ledger => {
      const name = (ledger['Ledger Name'] || '').toLowerCase();
      if (name.includes('secured')) {
        secured.push(ledger);
      } else {
        unsecured.push(ledger);
      }
    });

    return { secured, unsecured };
  }, [borrowingsLedgers]);

  const totals = useMemo(() => {
    return {
      secured: categories.secured.reduce((sum, l) => sum + Math.abs(l['Closing Balance'] || 0), 0),
      unsecured: categories.unsecured.reduce((sum, l) => sum + Math.abs(l['Closing Balance'] || 0), 0)
    };
  }, [categories]);

  const grandTotal = totals.secured + totals.unsecured;

  if (borrowingsLedgers.length === 0) {
    return null;
  }

  return (
    <Card className="p-2">
      <CardHeader className="pb-2 pt-2">
        <CardTitle className="text-sm font-semibold">
          Note {noteNumber}: Short-term borrowings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-xs">Particulars</TableHead>
              <TableHead className="text-right font-semibold text-xs w-32">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {totals.secured > 0 && (
              <TableRow>
                <TableCell className="font-medium">Secured</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.secured)}</TableCell>
              </TableRow>
            )}
            {totals.unsecured > 0 && (
              <TableRow>
                <TableCell className="font-medium">Unsecured</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.unsecured)}</TableCell>
              </TableRow>
            )}
            <TableRow className="font-bold bg-gray-100 border-t-2">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
