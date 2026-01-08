import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (amount: number, reportingScale: string) => {
  if (amount === 0) return '-';
  const sign = amount < 0 ? '-' : '';
  const absAmount = Math.abs(amount);
  
  switch (reportingScale) {
    case 'rupees':
      return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    case 'thousands':
      return `${sign}${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'lakhs':
      return `${sign}${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'crores':
      return `${sign}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      if (absAmount >= 10000000) return `${sign}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (absAmount >= 100000) return `${sign}${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (absAmount >= 1000) return `${sign}${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

export function RevenueFromOperationsNote({ noteNumber, ledgers, reportingScale = 'rupees' }: Props) {
  // Group ledgers by category
  const categorized = useMemo(() => {
    const categories: Record<string, LedgerItem[]> = {
      'Sale of products': [],
      'Sale of services': [],
      'Grants or donations received': [],
      'Other operating revenue': [],
    };

    ledgers.forEach(ledger => {
      const ledgerName = ledger.ledgerName.toLowerCase();
      const groupName = (ledger.groupName || '').toLowerCase();
      const classification = (ledger.classification || '').toLowerCase();

      if (ledgerName.includes('sale of product') || groupName.includes('sale of product') || 
          ledgerName.includes('product sale') || classification.includes('sale of product')) {
        categories['Sale of products'].push(ledger);
      } else if (ledgerName.includes('sale of service') || groupName.includes('sale of service') || 
                 ledgerName.includes('service income') || classification.includes('sale of service')) {
        categories['Sale of services'].push(ledger);
      } else if (ledgerName.includes('grant') || ledgerName.includes('donation') || 
                 groupName.includes('grant') || groupName.includes('donation')) {
        categories['Grants or donations received'].push(ledger);
      } else {
        categories['Other operating revenue'].push(ledger);
      }
    });

    return categories;
  }, [ledgers]);

  const totals = useMemo(() => {
    const saleOfProducts = categorized['Sale of products'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const saleOfServices = categorized['Sale of services'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const grants = categorized['Grants or donations received'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const otherRevenue = categorized['Other operating revenue'].reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
    const gross = saleOfProducts + saleOfServices + grants + otherRevenue;
    
    return {
      saleOfProducts,
      saleOfServices,
      grants,
      otherRevenue,
      gross,
      exciseDuty: 0, // To be configured if applicable
      net: gross,
    };
  }, [categorized]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{noteNumber}. Revenue from operations</h3>
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
            <TableCell>Sale of products</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.saleOfProducts, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(b)</TableCell>
            <TableCell>Sale of services</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.saleOfServices, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(c)</TableCell>
            <TableCell>Grants or donations received</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.grants, reportingScale)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">(d)</TableCell>
            <TableCell>Other operating revenue</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.otherRevenue, reportingScale)}</TableCell>
          </TableRow>
          <TableRow className="font-semibold bg-gray-50">
            <TableCell></TableCell>
            <TableCell>Revenue from operations (Gross)</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.gross, reportingScale)}</TableCell>
          </TableRow>
          {totals.exciseDuty > 0 && (
            <>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>Less: Excise duty</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.exciseDuty, reportingScale)}</TableCell>
              </TableRow>
              <TableRow className="font-bold bg-gray-100">
                <TableCell></TableCell>
                <TableCell>Revenue from operations (Net)</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.net, reportingScale)}</TableCell>
              </TableRow>
            </>
          )}
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
