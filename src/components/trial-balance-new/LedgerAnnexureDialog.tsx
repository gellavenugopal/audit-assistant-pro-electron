import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export interface LedgerItem {
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  classification?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteKey: string | null;
  ledgers: LedgerItem[];
  reportingScale?: string;
}

// Map noteKey to display title - P&L items
export const NOTE_KEY_TO_TITLE: Record<string, string> = {
  // P&L Income
  revenueFromOperations: 'Revenue from Operations',
  otherIncome: 'Other Income',
  // P&L Expenses
  costOfMaterialsConsumed: 'Cost of Materials Consumed',
  purchasesOfStockInTrade: 'Purchases of Stock-in-Trade',
  changesInInventories: 'Changes in Inventories',
  employeeBenefits: 'Employee Benefits Expense',
  financeCosts: 'Finance Costs',
  depreciation: 'Depreciation and Amortization Expense',
  otherExpenses: 'Other Expenses',
  // Balance Sheet - Equity & Liabilities
  equity: 'Share Capital / Equity',
  reserves: 'Reserves and Surplus',
  shareWarrants: 'Money Received Against Share Warrants',
  shareApplication: 'Share Application Money Pending Allotment',
  borrowings: 'Long-term Borrowings',
  deferredTax: 'Deferred Tax Liabilities (Net)',
  otherLongTerm: 'Other Long-term Liabilities',
  provisions: 'Long-term Provisions',
  shortTermBorrowings: 'Short-term Borrowings',
  payablesMSME: 'Trade Payables - MSME',
  payables: 'Trade Payables - Others',
  otherCurrentLiabilities: 'Other Current Liabilities',
  provisionsCurrent: 'Short-term Provisions',
  // Balance Sheet - Assets
  fixedAssets: 'Property, Plant and Equipment',
  intangibleAssets: 'Intangible Assets',
  cwip: 'Capital Work-in-Progress',
  intangibleUnderDev: 'Intangible Assets Under Development',
  investments: 'Non-current Investments',
  deferredTaxAsset: 'Deferred Tax Assets (Net)',
  otherNonCurrent: 'Other Non-current Assets',
  currentInvestments: 'Current Investments',
  inventory: 'Inventories',
  receivables: 'Trade Receivables',
  cash: 'Cash and Cash Equivalents',
  otherCurrent: 'Other Current Assets',
};

// Standalone content component for reuse in other dialogs
interface LedgerAnnexureContentProps {
  ledgers: LedgerItem[];
  total: number;
  formatCurrency: (amount: number) => string;
  onExport?: () => void;
}

export function LedgerAnnexureContent({
  ledgers,
  total,
  formatCurrency,
  onExport
}: LedgerAnnexureContentProps) {
  return (
    <div className="border rounded-lg overflow-auto max-h-[60vh]">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
          <TableRow>
            <TableHead className="w-12 text-center">S.No</TableHead>
            <TableHead>Ledger Name</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="text-right w-32">Opening</TableHead>
            <TableHead className="text-right w-32">Closing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ledgers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No ledger details available
              </TableCell>
            </TableRow>
          ) : (
            <>
              {ledgers.map((ledger, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{ledger.ledgerName}</TableCell>
                  <TableCell className="text-muted-foreground">{ledger.groupName}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(ledger.openingBalance)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(ledger.closingBalance)}</TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell></TableCell>
                <TableCell>TOTAL</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(ledgers.reduce((sum, l) => sum + l.openingBalance, 0))}
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function LedgerAnnexureDialog({
  open,
  onOpenChange,
  noteKey,
  ledgers,
  reportingScale = 'auto'
}: Props) {
  const noteTitle = noteKey ? NOTE_KEY_TO_TITLE[noteKey] || noteKey : '';
  
  const totalAmount = useMemo(() => {
    return ledgers.reduce((sum, l) => sum + Math.abs(l.closingBalance), 0);
  }, [ledgers]);

  const getScaleLabel = () => {
    switch (reportingScale) {
      case 'rupees': return '(Amount in ₹)';
      case 'thousands': return '(Amount in ₹ Thousands)';
      case 'lakhs': return '(Amount in ₹ Lakhs)';
      case 'crores': return '(Amount in ₹ Crores)';
      case 'auto': return '(Auto Scale)';
      default: return '';
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}₹${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'thousands':
        return `${sign}₹${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'lakhs':
        return `${sign}₹${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'crores':
        return `${sign}₹${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'auto':
      default:
        if (absAmount >= 10000000) {
          return `${sign}₹${(absAmount / 10000000).toFixed(2)} Cr`;
        } else if (absAmount >= 100000) {
          return `${sign}₹${(absAmount / 100000).toFixed(2)} L`;
        }
        return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
    }
  };

  const handleExportToExcel = () => {
    const exportData = ledgers.map((ledger, index) => ({
      'S.No': index + 1,
      'Ledger Name': ledger.ledgerName,
      'Group': ledger.groupName,
      'Opening Balance': ledger.openingBalance,
      'Closing Balance': ledger.closingBalance,
      'Classification': ledger.classification || '-'
    }));

    // Add total row
    exportData.push({
      'S.No': '' as unknown as number,
      'Ledger Name': 'TOTAL',
      'Group': '',
      'Opening Balance': ledgers.reduce((sum, l) => sum + l.openingBalance, 0),
      'Closing Balance': totalAmount,
      'Classification': ''
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, noteTitle.substring(0, 31)); // Excel sheet names max 31 chars
    XLSX.writeFile(wb, `${noteTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Annexure.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm font-mono">Annexure</Badge>
                {noteTitle}
              </DialogTitle>
              <DialogDescription>
                Ledger-wise details showing {ledgers.length} ledger(s) with total of {formatCurrency(totalAmount)}
              </DialogDescription>
              {reportingScale && reportingScale !== 'auto' && (
                <p className="text-xs text-muted-foreground mt-1">{getScaleLabel()}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto mt-4 border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
              <TableRow>
                <TableHead className="w-12 text-center">S.No</TableHead>
                <TableHead>Ledger Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right w-32">Opening</TableHead>
                <TableHead className="text-right w-32">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No ledger details available
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {ledgers.map((ledger, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{ledger.ledgerName}</TableCell>
                      <TableCell className="text-muted-foreground">{ledger.groupName}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(ledger.openingBalance)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(ledger.closingBalance)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell></TableCell>
                    <TableCell>TOTAL</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(ledgers.reduce((sum, l) => sum + l.openingBalance, 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalAmount)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
