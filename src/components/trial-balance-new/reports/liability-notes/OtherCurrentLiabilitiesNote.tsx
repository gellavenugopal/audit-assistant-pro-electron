import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerRow } from '@/services/trialBalanceNewClassification';

interface OtherCurrentLiabilitiesNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function OtherCurrentLiabilitiesNote({ data, noteNumber, reportingScale = 'rupees' }: OtherCurrentLiabilitiesNoteProps) {
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

  const liabilitiesLedgers = useMemo(() => {
    return data.filter(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return h4.includes('other current liabilit') ||
             ledgerName.includes('statutory dues') || ledgerName.includes('tds payable') ||
             ledgerName.includes('gst payable') || ledgerName.includes('pf dues') ||
             ledgerName.includes('esi dues') || ledgerName.includes('advance from customer') ||
             ledgerName.includes('unearned revenue');
    });
  }, [data]);

  const categories = useMemo(() => {
    const result: Record<string, number> = {};

    liabilitiesLedgers.forEach(ledger => {
      const name = (ledger['Ledger Name'] || '').toLowerCase();
      const amount = Math.abs(ledger['Closing Balance'] || 0);
      
      if (name.includes('tds payable') || name.includes('tds')) {
        result['TDS payable'] = (result['TDS payable'] || 0) + amount;
      } else if (name.includes('gst') || name.includes('service tax') || name.includes('sales tax')) {
        result['Goods and Service tax payable'] = (result['Goods and Service tax payable'] || 0) + amount;
      } else if (name.includes('pf') || name.includes('provident fund')) {
        result['PF Dues Payable'] = (result['PF Dues Payable'] || 0) + amount;
      } else if (name.includes('esi') || name.includes('esic')) {
        result['ESI Dues Payable'] = (result['ESI Dues Payable'] || 0) + amount;
      } else if (name.includes('advance from customer')) {
        result['Advance from Customers'] = (result['Advance from Customers'] || 0) + amount;
      } else if (name.includes('unearned revenue')) {
        result['Unearned revenue'] = (result['Unearned revenue'] || 0) + amount;
      } else if (name.includes('statutory')) {
        result['Statutory Dues Payable'] = (result['Statutory Dues Payable'] || 0) + amount;
      } else {
        result['Other payables'] = (result['Other payables'] || 0) + amount;
      }
    });

    return result;
  }, [liabilitiesLedgers]);

  const total = useMemo(() => {
    return Object.values(categories).reduce((sum, amount) => sum + amount, 0);
  }, [categories]);

  if (liabilitiesLedgers.length === 0) {
    return null;
  }

  return (
    <Card className="p-2">
      <CardHeader className="pb-2 pt-2">
        <CardTitle className="text-sm font-semibold">
          Note {noteNumber}: Other current liabilities
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
              <TableCell>Total Other current liabilities</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
