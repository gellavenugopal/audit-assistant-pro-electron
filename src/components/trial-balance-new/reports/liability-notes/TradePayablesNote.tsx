import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerRow } from '@/services/trialBalanceNewClassification';

interface TradePayablesNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function TradePayablesNote({ data, noteNumber, reportingScale = 'rupees' }: TradePayablesNoteProps) {
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

  const payablesLedgers = useMemo(() => {
    return data.filter(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      const primaryGroup = (row['Primary Group'] || '').toLowerCase();
      return h4.includes('trade payable') || 
             ledgerName.includes('sundry creditor') ||
             ledgerName.includes('trade payable') ||
             primaryGroup.includes('sundry creditors');
    });
  }, [data]);

  const totals = useMemo(() => {
    const msme = payablesLedgers.filter(l => {
      const name = (l['Ledger Name'] || '').toLowerCase();
      return name.includes('msme') || name.includes('micro') || name.includes('small enterprise');
    }).reduce((sum, l) => sum + Math.abs(l['Closing Balance'] || 0), 0);

    const others = payablesLedgers.filter(l => {
      const name = (l['Ledger Name'] || '').toLowerCase();
      return !(name.includes('msme') || name.includes('micro') || name.includes('small enterprise'));
    }).reduce((sum, l) => sum + Math.abs(l['Closing Balance'] || 0), 0);

    return { msme, others, total: msme + others };
  }, [payablesLedgers]);

  if (payablesLedgers.length === 0) {
    return null;
  }

  return (
    <Card className="p-2">
      <CardHeader className="pb-2 pt-2">
        <CardTitle className="text-sm font-semibold">
          Note {noteNumber}: Trade payables
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
            {totals.msme > 0 && (
              <TableRow>
                <TableCell className="font-medium">Total outstanding dues of micro and small enterprises</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.msme)}</TableCell>
              </TableRow>
            )}
            {totals.others > 0 && (
              <TableRow>
                <TableCell className="font-medium">Total outstanding dues of other than micro and small enterprises</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.others)}</TableCell>
              </TableRow>
            )}
            <TableRow className="font-bold bg-gray-100 border-t-2">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totals.total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
