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
  fixedAssetsNoteNumber?: string;
}

export function DepreciationNote({ noteNumber, ledgers, reportingScale = 'rupees', fixedAssetsNoteNumber = '[number]' }: Props) {
  // Group ledgers by H3 classification (like Changes in Inventories pattern)
  const categorized = useMemo(() => {
    const categories: Record<string, LedgerItem[]> = {
      'on tangible assets': [],
      'on intangible assets': [],
    };

    ledgers.forEach(ledger => {
      // Extract H3 from classification string
      const classification = ledger.classification || '';
      const parts = classification.split('>').map(p => p.trim());
      const h3 = parts.length > 1 ? parts[1] : '';
      const h4 = parts.length > 2 ? parts[2] : '';
      // Prefer H4 if available, otherwise use H3
      const classificationText = (h4 || h3).toLowerCase();

      // Use H4/H3 classification to categorize
      if (classificationText.includes('intangible') || classificationText.includes('amortiz')) {
        categories['on intangible assets'].push(ledger);
      } else {
        categories['on tangible assets'].push(ledger);
      }
    });

    return categories;
  }, [ledgers]);

  const totals = useMemo(() => {
    // Use closingBalance directly (same as Purchases in Cost of Materials Consumed)
    const tangible = categorized['on tangible assets'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const intangible = categorized['on intangible assets'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const total = tangible + intangible;

    return { tangible, intangible, total };
  }, [categorized]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{noteNumber}. Depreciation and amortization expense</h3>
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
            <TableCell>
              on tangible assets (Refer note of Fixed Assets[{fixedAssetsNoteNumber}])
            </TableCell>
            <TableCell className="text-right">{formatCurrency(totals.tangible, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(b)</TableCell>
            <TableCell>
              on intangible assets (Refer note Fixed Assets[{fixedAssetsNoteNumber}])
            </TableCell>
            <TableCell className="text-right">{formatCurrency(totals.intangible, reportingScale)}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-gray-100 border-t-2 border-gray-300">
            <TableCell></TableCell>
            <TableCell>Total Depreciation and amortization expense</TableCell>
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
                <h4 className="text-xs font-medium text-gray-700 mb-1 capitalize">{category}:</h4>
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
