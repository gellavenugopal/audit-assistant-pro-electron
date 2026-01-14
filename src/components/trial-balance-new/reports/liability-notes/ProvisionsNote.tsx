import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerRow } from '@/services/trialBalanceNewClassification';

interface ProvisionsNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function ProvisionsNote({ data, noteNumber, reportingScale = 'rupees' }: ProvisionsNoteProps) {
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

  const provisionsLedgers = useMemo(() => {
    return data.filter(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return h4.includes('provision') ||
             ledgerName.includes('provision for') ||
             ledgerName.includes('gratuity') || ledgerName.includes('leave encashment');
    });
  }, [data]);

  const categories = useMemo(() => {
    const result: Record<string, number> = {};

    provisionsLedgers.forEach(ledger => {
      const name = (ledger['Ledger Name'] || '').toLowerCase();
      const amount = Math.abs(ledger['Closing Balance'] || 0);
      
      if (name.includes('employee benefit') || name.includes('gratuity') || name.includes('leave')) {
        result['Provision for employee benefits'] = (result['Provision for employee benefits'] || 0) + amount;
      } else if (name.includes('income tax') || name.includes('tax')) {
        result['Provision for Income tax'] = (result['Provision for Income tax'] || 0) + amount;
      } else if (name.includes('warranty') || name.includes('warranties')) {
        result['Provision for warranties'] = (result['Provision for warranties'] || 0) + amount;
      } else {
        result['Other provisions'] = (result['Other provisions'] || 0) + amount;
      }
    });

    return result;
  }, [provisionsLedgers]);

  const total = useMemo(() => {
    return Object.values(categories).reduce((sum, amount) => sum + amount, 0);
  }, [categories]);

  if (provisionsLedgers.length === 0) {
    return null;
  }

  return (
    <Card className="p-2">
      <CardHeader className="pb-2 pt-2">
        <CardTitle className="text-sm font-semibold">
          Note {noteNumber}: Provisions
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
            {Object.entries(categories).map(([category, amount]) => (
              <TableRow key={category}>
                <TableCell className="font-medium">{category}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-gray-100 border-t-2">
              <TableCell>Total Provisions</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
