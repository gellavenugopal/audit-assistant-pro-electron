import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, ReportingScale } from '@/lib/formatters/currency';
import { NoteLedgerItem } from '@/types/financialStatements';

interface GenericLedgerNoteProps {
  ledgers: NoteLedgerItem[];
  reportingScale?: ReportingScale;
  includeSymbol?: boolean;
}

export function GenericLedgerNote({ ledgers, reportingScale = 'auto', includeSymbol = true }: GenericLedgerNoteProps) {
  const total = ledgers.reduce((sum, l) => sum + Math.abs(l.closingBalance || 0), 0);
  const format = (amount: number) => formatCurrency(amount, reportingScale, { includeSymbol });

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Ledger-wise details showing {ledgers.length} ledger(s) with total of {format(total)}
      </p>
      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ledger Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Opening Balance</TableHead>
              <TableHead className="text-right">Closing Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgers.map((ledger, idx) => (
              <TableRow key={idx}>
                <TableCell>{ledger.ledgerName}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{ledger.groupName}</TableCell>
                <TableCell className="text-right font-mono text-xs">{format(ledger.openingBalance)}</TableCell>
                <TableCell className="text-right font-mono">{format(ledger.closingBalance)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold border-t-2">
              <TableCell colSpan={3} className="text-right">Total:</TableCell>
              <TableCell className="text-right font-mono">{format(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
