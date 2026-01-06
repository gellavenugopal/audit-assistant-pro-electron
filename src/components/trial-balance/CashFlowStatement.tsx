import { TrialBalanceLine } from '@/hooks/useTrialBalance';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props {
  lines: TrialBalanceLine[];
}

interface LineItem {
  label: string;
  amount: number;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export function CashFlowStatement({ lines }: Props) {
  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (absAmount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getAmountByFsArea = (fsArea: string) => {
    return Math.abs(lines
      .filter(l => l.fs_area === fsArea)
      .reduce((sum, l) => sum + Number(l.closing_balance), 0));
  };

  const getMovement = (fsArea: string) => {
    return lines
      .filter(l => l.fs_area === fsArea)
      .reduce((sum, l) => {
        const opening = Number(l.opening_balance);
        const closing = Number(l.closing_balance);
        return sum + (closing - opening);
      }, 0);
  };

  // Operating Activities
  const revenueFromOperations = getAmountByFsArea('Revenue');
  const totalExpenses = Math.abs(lines
    .filter(l => l.aile === 'Expense')
    .reduce((sum, l) => sum + Number(l.closing_balance), 0));
  
  const depreciation = lines
    .filter(l => l.account_name.toLowerCase().includes('depreciation'))
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);

  const profitBeforeTax = revenueFromOperations - totalExpenses;
  
  // Working capital changes
  const receivablesChange = -getMovement('Receivables');
  const inventoryChange = -getMovement('Inventory');
  const payablesChange = getMovement('Payables');
  
  const cashFromOperations = profitBeforeTax + depreciation + receivablesChange + inventoryChange + payablesChange;
  
  const taxPaid = lines
    .filter(l => l.account_name.toLowerCase().includes('tax'))
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);

  const netCashFromOperating = cashFromOperations - taxPaid;

  // Investing Activities
  const fixedAssetsPurchase = -getMovement('Fixed Assets');
  const investmentsChange = -getMovement('Investments');
  const netCashFromInvesting = fixedAssetsPurchase + investmentsChange;

  // Financing Activities  
  const borrowingsChange = getMovement('Borrowings');
  const equityChange = getMovement('Equity');
  const financeCharges = -getAmountByFsArea('Finance');
  const netCashFromFinancing = borrowingsChange + equityChange + financeCharges;

  const netChange = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

  const openingCash = lines
    .filter(l => l.fs_area === 'Cash')
    .reduce((sum, l) => sum + Number(l.opening_balance), 0);
  
  const closingCash = lines
    .filter(l => l.fs_area === 'Cash')
    .reduce((sum, l) => sum + Number(l.closing_balance), 0);

  const items: LineItem[] = [
    { label: 'A. CASH FLOW FROM OPERATING ACTIVITIES', amount: 0, isHeader: true },
    { label: 'Profit Before Tax', amount: profitBeforeTax, indent: 1 },
    { label: 'Adjustments for:', amount: 0, isHeader: true },
    { label: 'Depreciation and Amortisation', amount: depreciation, indent: 2 },
    { label: 'Operating Profit before Working Capital Changes', amount: profitBeforeTax + depreciation, isTotal: true },
    { label: 'Changes in Working Capital:', amount: 0, isHeader: true },
    { label: '(Increase)/Decrease in Trade Receivables', amount: receivablesChange, indent: 2 },
    { label: '(Increase)/Decrease in Inventories', amount: inventoryChange, indent: 2 },
    { label: 'Increase/(Decrease) in Trade Payables', amount: payablesChange, indent: 2 },
    { label: 'Cash Generated from Operations', amount: cashFromOperations, isTotal: true },
    { label: 'Less: Income Tax Paid', amount: -taxPaid, indent: 1 },
    { label: 'Net Cash from Operating Activities (A)', amount: netCashFromOperating, isTotal: true },
    
    { label: 'B. CASH FLOW FROM INVESTING ACTIVITIES', amount: 0, isHeader: true },
    { label: 'Purchase of Property, Plant and Equipment', amount: fixedAssetsPurchase, indent: 1 },
    { label: 'Purchase/(Sale) of Investments', amount: investmentsChange, indent: 1 },
    { label: 'Net Cash from Investing Activities (B)', amount: netCashFromInvesting, isTotal: true },
    
    { label: 'C. CASH FLOW FROM FINANCING ACTIVITIES', amount: 0, isHeader: true },
    { label: 'Proceeds/(Repayment) of Borrowings', amount: borrowingsChange, indent: 1 },
    { label: 'Share Capital Changes', amount: equityChange, indent: 1 },
    { label: 'Finance Costs Paid', amount: financeCharges, indent: 1 },
    { label: 'Net Cash from Financing Activities (C)', amount: netCashFromFinancing, isTotal: true },
    
    { label: 'Net Increase/(Decrease) in Cash (A+B+C)', amount: netChange, isTotal: true },
    { label: 'Cash and Cash Equivalents at Beginning', amount: openingCash, indent: 1 },
    { label: 'Cash and Cash Equivalents at End', amount: closingCash, isTotal: true },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Cash Flow Statement</h2>
        <p className="text-sm text-muted-foreground">As per Ind AS 7 / AS 3</p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="audit-card p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right w-36">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i} className={cn(
                  item.isHeader && 'bg-muted/50',
                  item.isTotal && 'font-semibold border-t'
                )}>
                  <TableCell 
                    className={cn(
                      'py-2',
                      item.isHeader && 'font-semibold text-primary'
                    )} 
                    style={{ paddingLeft: item.indent ? `${0.5 + item.indent * 1}rem` : undefined }}
                  >
                    {item.label}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono",
                    item.isTotal && item.label.includes('Net') && (item.amount >= 0 ? 'text-success' : 'text-destructive')
                  )}>
                    {!item.isHeader && formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="audit-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Operating</p>
          <p className={cn(
            "text-xl font-bold mt-1",
            netCashFromOperating >= 0 ? 'text-success' : 'text-destructive'
          )}>{formatCurrency(netCashFromOperating)}</p>
        </div>
        <div className="audit-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Investing</p>
          <p className={cn(
            "text-xl font-bold mt-1",
            netCashFromInvesting >= 0 ? 'text-success' : 'text-destructive'
          )}>{formatCurrency(netCashFromInvesting)}</p>
        </div>
        <div className="audit-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Financing</p>
          <p className={cn(
            "text-xl font-bold mt-1",
            netCashFromFinancing >= 0 ? 'text-success' : 'text-destructive'
          )}>{formatCurrency(netCashFromFinancing)}</p>
        </div>
      </div>

      {/* Cash Reconciliation Check */}
      <div className={cn(
        "p-4 rounded-lg text-center",
        Math.abs((closingCash - openingCash) - netChange) < 1 
          ? "bg-success/10 text-success" 
          : "bg-destructive/10 text-destructive"
      )}>
        <p className="font-medium">
          {Math.abs((closingCash - openingCash) - netChange) < 1 
            ? '✓ Cash flow reconciles with cash movement' 
            : `⚠ Reconciliation difference: ${formatCurrency((closingCash - openingCash) - netChange)}`}
        </p>
      </div>
    </div>
  );
}
