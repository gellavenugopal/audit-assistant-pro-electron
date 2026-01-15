import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutList, List, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LedgerRow {
  'Ledger Name': string;
  'H3'?: string;
  'H4'?: string;
  'H5'?: string;
  'Opening Balance'?: number;
  'Closing Balance'?: number;
  [key: string]: string | number | undefined;
}

interface Props {
  ledgerData: LedgerRow[];
  reportingScale?: string;
  noteNumber?: string;
}

export function OtherIncomeNoteNew({ ledgerData, reportingScale = 'auto', noteNumber = '20' }: Props) {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    switch (reportingScale) {
      case 'rupees': return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'thousands': return `${sign}${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      case 'lakhs': return `${sign}${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      case 'crores': return `${sign}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      default: return absAmount >= 10000000 ? `${sign}${(absAmount / 10000000).toFixed(2)} Cr` : absAmount >= 100000 ? `${sign}${(absAmount / 100000).toFixed(2)} L` : `${sign}${absAmount.toLocaleString('en-IN')}`;
    }
  };

  const getScaleLabel = () => {
    switch (reportingScale) {
      case 'rupees': return '(Amount in ₹)';
      case 'thousands': return "(Amount in 1000's)";
      case 'lakhs': return '(Amount in Lakhs)';
      case 'crores': return '(Amount in Crores)';
      default: return '';
    }
  };

  const otherIncomeLedgers = ledgerData.filter(row => row['H3'] && row['H3'].toLowerCase().includes('other income'));
  
  const categorized = {
    'Interest income': otherIncomeLedgers.filter(row => row['H4']?.toLowerCase().includes('interest')),
    'Dividend income': otherIncomeLedgers.filter(row => row['H4']?.toLowerCase().includes('dividend')),
    'Other non-operating income': otherIncomeLedgers.filter(row => {
      const h4 = row['H4']?.toLowerCase() || '';
      return !h4.includes('interest') && !h4.includes('dividend');
    })
  };

  const totals = {
    interest: categorized['Interest income'].reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0),
    dividend: categorized['Dividend income'].reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0),
    other: categorized['Other non-operating income'].reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0)
  };
  totals.total = totals.interest + totals.dividend + totals.other;

  const handleExport = () => {
    const exportData: any[] = [];
    exportData.push({ 'Particulars': 'Interest income', 'Amount': totals.interest });
    exportData.push({ 'Particulars': 'Dividend income', 'Amount': totals.dividend });
    exportData.push({ 'Particulars': 'Other non-operating income', 'Amount': totals.other });
    exportData.push({ 'Particulars': '', 'Amount': '' });
    exportData.push({ 'Particulars': 'Total other income', 'Amount': totals.total });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Note ${noteNumber}`);
    XLSX.writeFile(workbook, `Note_${noteNumber}_Other_Income.xlsx`);
  };

  const renderSummaryView = () => (
    <div className="border rounded overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-xs">Particulars</TableHead>
            <TableHead className="text-right font-semibold text-xs">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {totals.interest > 0 && <TableRow><TableCell>Interest income</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.interest)}</TableCell></TableRow>}
          {totals.dividend > 0 && <TableRow><TableCell>Dividend income</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.dividend)}</TableCell></TableRow>}
          {totals.other > 0 && <TableRow><TableCell>Other non-operating income</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.other)}</TableCell></TableRow>}
          <TableRow className="font-bold bg-gray-100 border-t-2">
            <TableCell>Total other income</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(totals.total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  const renderDetailedView = () => (
    <div className="border rounded overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-xs w-8">#</TableHead>
            <TableHead className="font-semibold text-xs">Ledger Name</TableHead>
            <TableHead className="font-semibold text-xs">H4</TableHead>
            <TableHead className="text-right font-semibold text-xs">Closing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {Object.entries(categorized).map(([category, ledgers]) => {
            if (ledgers.length === 0) return null;
            return (
              <>
                <TableRow key={category} className="bg-blue-50 font-semibold"><TableCell colSpan={4}>{category}</TableCell></TableRow>
                {ledgers.map((row, idx) => (
                  <TableRow key={`${category}-${idx}`}>
                    <TableCell className="text-gray-500">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row['Ledger Name']}</TableCell>
                    <TableCell className="text-gray-600">{row['H4'] || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Math.abs(row['Closing Balance'] || 0))}</TableCell>
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b pb-1">
        <div>
          <h3 className="text-sm font-semibold">Note {noteNumber}: Other income</h3>
          <p className="text-[10px] text-gray-500">{getScaleLabel()}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-gray-100 rounded p-0.5">
            <button onClick={() => setViewMode('summary')} className={cn("px-2 py-0.5 text-[10px] font-medium rounded transition-colors", viewMode === 'summary' ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900")}>
              <LayoutList className="h-3 w-3 inline mr-1" />Summary
            </button>
            <button onClick={() => setViewMode('detailed')} className={cn("px-2 py-0.5 text-[10px] font-medium rounded transition-colors", viewMode === 'detailed' ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900")}>
              <List className="h-3 w-3 inline mr-1" />Detailed
            </button>
          </div>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={handleExport}><Download className="h-3 w-3 mr-1" />Export</Button>
        </div>
      </div>
      {viewMode === 'summary' ? renderSummaryView() : renderDetailedView()}
    </div>
  );
}
