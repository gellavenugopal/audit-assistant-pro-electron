import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerRow } from '@/services/trialBalanceNewClassification';

interface ReservesAndSurplusNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function ReservesAndSurplusNote({ data, noteNumber, reportingScale = 'rupees' }: ReservesAndSurplusNoteProps) {
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

  // Filter reserves and surplus ledgers
  const reservesLedgers = useMemo(() => {
    return data.filter(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return h4.includes('reserve') || h4.includes('surplus') || 
             ledgerName.includes('capital reserve') || ledgerName.includes('securities premium') ||
             ledgerName.includes('revaluation reserve') || ledgerName.includes('surplus') ||
             ledgerName.includes('debenture redemption');
    });
  }, [data]);

  // Categorize reserves
  const categories = useMemo(() => {
    const result: Record<string, LedgerRow[]> = {
      'Capital Reserves': [],
      'Capital Reserve on Consolidation': [],
      'Capital Redemption Reserve': [],
      'Securities Premium': [],
      'Debenture Redemption Reserve': [],
      'Revaluation Reserve': [],
      'Share Options Outstanding Account': [],
      'Surplus': []
    };

    reservesLedgers.forEach(ledger => {
      const name = (ledger['Ledger Name'] || '').toLowerCase();
      const h5 = (ledger['H5'] || '').toLowerCase();
      
      if (name.includes('capital reserve') && !name.includes('consolidation') && !name.includes('redemption')) {
        result['Capital Reserves'].push(ledger);
      } else if (name.includes('consolidation')) {
        result['Capital Reserve on Consolidation'].push(ledger);
      } else if (name.includes('capital redemption')) {
        result['Capital Redemption Reserve'].push(ledger);
      } else if (name.includes('securities premium') || name.includes('share premium')) {
        result['Securities Premium'].push(ledger);
      } else if (name.includes('debenture redemption')) {
        result['Debenture Redemption Reserve'].push(ledger);
      } else if (name.includes('revaluation')) {
        result['Revaluation Reserve'].push(ledger);
      } else if (name.includes('share option') || name.includes('stock option')) {
        result['Share Options Outstanding Account'].push(ledger);
      } else if (name.includes('surplus') || name.includes('retained earning') || name.includes('profit')) {
        result['Surplus'].push(ledger);
      }
    });

    return result;
  }, [reservesLedgers]);

  // Calculate total
  const total = useMemo(() => {
    return reservesLedgers.reduce((sum, ledger) => sum + Math.abs(ledger['Closing Balance'] || 0), 0);
  }, [reservesLedgers]);

  // Don't render if no data
  if (reservesLedgers.length === 0) {
    return null;
  }

  return (
    <Card className="p-2">
      <CardHeader className="pb-2 pt-2">
        <CardTitle className="text-sm font-semibold">
          Note {noteNumber}: Reserves and surplus
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
            {Object.entries(categories).map(([category, ledgers]) => {
              if (ledgers.length === 0) return null;
              
              const categoryTotal = ledgers.reduce((sum, l) => sum + Math.abs(l['Closing Balance'] || 0), 0);
              
              return (
                <TableRow key={category}>
                  <TableCell className="font-medium">{category}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(categoryTotal)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-bold bg-gray-100 border-t-2">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
