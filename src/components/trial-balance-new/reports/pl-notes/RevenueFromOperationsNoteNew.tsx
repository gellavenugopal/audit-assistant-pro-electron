import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export function RevenueFromOperationsNoteNew({ 
  ledgerData,
  reportingScale = 'auto',
  noteNumber = '19'
}: Props) {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'hundreds':
        return `${sign}${(absAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'thousands':
        return `${sign}${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'lakhs':
        return `${sign}${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'millions':
        return `${sign}${(absAmount / 1000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'crores':
        return `${sign}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'auto':
      default:
        if (absAmount >= 10000000) {
          return `${sign}${(absAmount / 10000000).toFixed(2)} Cr`;
        } else if (absAmount >= 100000) {
          return `${sign}${(absAmount / 100000).toFixed(2)} L`;
        }
        return `${sign}${absAmount.toLocaleString('en-IN')}`;
    }
  };

  const getScaleLabel = () => {
    switch (reportingScale) {
      case 'rupees': return '(Amount in ₹)';
      case 'hundreds': return "(Amount in 100's)";
      case 'thousands': return "(Amount in 1000's)";
      case 'lakhs': return '(Amount in Lakhs)';
      case 'millions': return '(Amount in Millions)';
      case 'crores': return '(Amount in Crores)';
      default: return '';
    }
  };

  // Filter revenue ledgers (H3 = Revenue from operations)
  const revenueLedgers = ledgerData.filter(row => 
    row['H3'] && row['H3'].toLowerCase().includes('revenue from operations')
  );

  // Categorize by H4
  const categorized = {
    'Sale of products': revenueLedgers.filter(row => row['H4']?.toLowerCase().includes('sale of product')),
    'Sale of services': revenueLedgers.filter(row => row['H4']?.toLowerCase().includes('sale of service')),
    'Other operating revenues': revenueLedgers.filter(row => {
      const h4 = row['H4']?.toLowerCase() || '';
      return !h4.includes('sale of product') && !h4.includes('sale of service');
    })
  };

  // Calculate totals
  const totals = {
    saleOfProducts: categorized['Sale of products'].reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0),
    saleOfServices: categorized['Sale of services'].reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0),
    otherRevenue: categorized['Other operating revenues'].reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0)
  };

  totals.gross = totals.saleOfProducts + totals.saleOfServices + totals.otherRevenue;

  // Excel export handler
  const handleExport = () => {
    const exportData: any[] = [];
    
    // Summary section
    exportData.push({ 'Particulars': 'Sale of products', 'Amount': totals.saleOfProducts });
    exportData.push({ 'Particulars': 'Sale of services', 'Amount': totals.saleOfServices });
    exportData.push({ 'Particulars': 'Other operating revenues', 'Amount': totals.otherRevenue });
    exportData.push({ 'Particulars': '', 'Amount': '' });
    exportData.push({ 'Particulars': 'Revenue from operations (gross)', 'Amount': totals.gross });
    
    // Detailed breakdown
    exportData.push({ 'Particulars': '', 'Amount': '' });
    exportData.push({ 'Particulars': 'Detailed Breakdown', 'Amount': '' });
    
    Object.entries(categorized).forEach(([category, ledgers]) => {
      if (ledgers.length > 0) {
        exportData.push({ 'Particulars': '', 'Amount': '' });
        exportData.push({ 'Particulars': category, 'Amount': '' });
        ledgers.forEach(ledger => {
          exportData.push({
            'Particulars': ledger['Ledger Name'],
            'H4': ledger['H4'] || '',
            'H5': ledger['H5'] || '',
            'Opening Balance': ledger['Opening Balance'] || 0,
            'Closing Balance': Math.abs(ledger['Closing Balance'] || 0)
          });
        });
      }
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Note ${noteNumber}`);
    XLSX.writeFile(workbook, `Note_${noteNumber}_Revenue_from_Operations.xlsx`);
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
          {totals.saleOfProducts > 0 && (
            <TableRow>
              <TableCell>Sale of products</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totals.saleOfProducts)}</TableCell>
            </TableRow>
          )}
          {totals.saleOfServices > 0 && (
            <TableRow>
              <TableCell>Sale of services</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totals.saleOfServices)}</TableCell>
            </TableRow>
          )}
          {totals.otherRevenue > 0 && (
            <TableRow>
              <TableCell>Other operating revenues</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totals.otherRevenue)}</TableCell>
            </TableRow>
          )}
          <TableRow className="font-bold bg-gray-100 border-t-2">
            <TableCell>Revenue from operations (gross)</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(totals.gross)}</TableCell>
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
            <TableHead className="font-semibold text-xs">H5</TableHead>
            <TableHead className="text-right font-semibold text-xs">Opening</TableHead>
            <TableHead className="text-right font-semibold text-xs">Closing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {Object.entries(categorized).map(([category, ledgers]) => {
            if (ledgers.length === 0) return null;
            return (
              <>
                <TableRow key={category} className="bg-blue-50 font-semibold">
                  <TableCell colSpan={6}>{category}</TableCell>
                </TableRow>
                {ledgers.map((row, idx) => (
                  <TableRow key={`${category}-${idx}`}>
                    <TableCell className="text-gray-500">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row['Ledger Name']}</TableCell>
                    <TableCell className="text-gray-600">{row['H4'] || '-'}</TableCell>
                    <TableCell className="text-gray-600">{row['H5'] || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row['Opening Balance'] || 0)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Math.abs(row['Closing Balance'] || 0))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-100">
                  <TableCell colSpan={4}>Subtotal - {category}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(ledgers.reduce((sum, r) => sum + (r['Opening Balance'] || 0), 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(ledgers.reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0))}
                  </TableCell>
                </TableRow>
              </>
            );
          })}
          <TableRow className="font-bold bg-gray-100 border-t-2">
            <TableCell colSpan={4}>TOTAL - Revenue from operations</TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(revenueLedgers.reduce((sum, r) => sum + (r['Opening Balance'] || 0), 0))}
            </TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(totals.gross)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b pb-1">
        <div>
          <h3 className="text-sm font-semibold">
            Note {noteNumber}: Revenue from operations
          </h3>
          <p className="text-[10px] text-gray-500">{getScaleLabel()}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-gray-100 rounded p-0.5">
            <button
              onClick={() => setViewMode('summary')}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                viewMode === 'summary' 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <LayoutList className="h-3 w-3 inline mr-1" />
              Summary
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                viewMode === 'detailed' 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <List className="h-3 w-3 inline mr-1" />
              Detailed
            </button>
          </div>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={handleExport}>
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {viewMode === 'summary' ? renderSummaryView() : renderDetailedView()}
    </div>
  );
}
