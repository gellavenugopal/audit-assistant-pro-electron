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

interface StockItem {
  'Item Name': string;
  'Stock Group': string;
  'Primary Group': string;
  'Opening Value': number;
  'Closing Value': number;
  'Stock Category': string;
  'Composite Key': string;
}

interface LedgerRow {
  'Ledger Name': string;
  'H3'?: string;
  'Opening Balance'?: number;
  'Closing Balance'?: number;
  [key: string]: string | number | undefined;
}

interface Props {
  stockData: StockItem[];
  ledgerData: LedgerRow[];
  reportingScale?: string;
  noteNumber?: string;
}

export function CostOfMaterialsConsumedNote({ 
  stockData, 
  ledgerData,
  reportingScale = 'auto',
  noteNumber = '20'
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

  // Calculate inventory values by category
  const calculateMaterialInventory = () => {
    const result = {
      'Raw Material': { opening: 0, closing: 0 },
      'Packing Material': { opening: 0, closing: 0 },
      'Other Material': { opening: 0, closing: 0 }
    };

    // Safety check for stockData
    if (!stockData || !Array.isArray(stockData)) return result;

    stockData.forEach(item => {
      if (!item) return;
      const category = (item['Stock Category'] || '').toLowerCase();
      const stockGroup = (item['Stock Group'] || '').toLowerCase();
      // Stock values are assets (Dr), so use Math.abs to ensure positive values
      const openingValue = Math.abs(item['Opening Value'] || 0);
      const closingValue = Math.abs(item['Closing Value'] || 0);
      
      // Classify materials
      if (category.includes('raw') || stockGroup.includes('raw')) {
        result['Raw Material'].opening += openingValue;
        result['Raw Material'].closing += closingValue;
      } else if (category.includes('pack') || stockGroup.includes('pack')) {
        result['Packing Material'].opening += openingValue;
        result['Packing Material'].closing += closingValue;
      } else if (category.includes('consumable') || category.includes('other') || 
                 category.includes('component') || category.includes('intermediate')) {
        result['Other Material'].opening += openingValue;
        result['Other Material'].closing += closingValue;
      }
    });

    return result;
  };

  // Get purchases from ledger data
  const getPurchases = () => {
    const result = {
      'Raw Material': 0,
      'Packing Material': 0,
      'Other Material': 0
    };

    // Safety check for ledgerData
    if (!ledgerData || !Array.isArray(ledgerData)) return result;

    ledgerData.forEach(row => {
      if (!row) return;
      const h3 = (row['H3'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      const closing = Math.abs(row['Closing Balance'] || 0);
      
      if (h3.includes('purchase') || ledgerName.includes('purchase')) {
        if (ledgerName.includes('raw') || ledgerName.includes('material')) {
          if (ledgerName.includes('pack')) {
            result['Packing Material'] += closing;
          } else {
            result['Raw Material'] += closing;
          }
        } else if (ledgerName.includes('pack')) {
          result['Packing Material'] += closing;
        } else {
          // Default to raw material for general purchases
          result['Raw Material'] += closing;
        }
      }
    });

    return result;
  };

  const inventory = calculateMaterialInventory();
  const purchases = getPurchases();
  
  // Calculate cost of material consumed for each category
  const calculateCost = (category: keyof typeof inventory) => {
    const inv = inventory[category];
    const purchase = purchases[category];
    return inv.opening + purchase - inv.closing;
  };

  const rawMaterialCost = calculateCost('Raw Material');
  const packingMaterialCost = calculateCost('Packing Material');
  const otherMaterialCost = calculateCost('Other Material');
  const totalMaterialCost = rawMaterialCost + packingMaterialCost + otherMaterialCost;

  // Check if each section has any values
  const hasRawMaterial = inventory['Raw Material'].opening !== 0 || 
                         purchases['Raw Material'] !== 0 || 
                         inventory['Raw Material'].closing !== 0;
  
  const hasPackingMaterial = inventory['Packing Material'].opening !== 0 || 
                             purchases['Packing Material'] !== 0 || 
                             inventory['Packing Material'].closing !== 0;
  
  const hasOtherMaterial = inventory['Other Material'].opening !== 0 || 
                           purchases['Other Material'] !== 0 || 
                           inventory['Other Material'].closing !== 0;

  // If no materials at all, show nothing
  if (!hasRawMaterial && !hasPackingMaterial && !hasOtherMaterial) {
    return null;
  }

  // Get raw material stock items for detailed view
  const rawMaterialItems = stockData.filter(item => {
    const category = (item['Stock Category'] || '').toLowerCase();
    const group = (item['Stock Group'] || '').toLowerCase();
    return category.includes('raw') || group.includes('raw');
  });

  // Get purchase ledgers for detailed view
  const purchaseLedgers = ledgerData.filter(row => {
    const h3 = (row['H3'] || '').toLowerCase();
    const name = (row['Ledger Name'] || '').toLowerCase();
    return h3.includes('purchase') || name.includes('purchase');
  });

  // Export to Excel
  const handleExport = () => {
    // Materials sheet
    const materialsData = rawMaterialItems.map((item, index) => ({
      'S.No': index + 1,
      'Item Name': item['Item Name'],
      'Stock Group': item['Stock Group'],
      'Category': item['Stock Category'],
      'Opening Value': Math.abs(item['Opening Value']),
      'Closing Value': Math.abs(item['Closing Value']),
    }));

    // Purchases sheet
    const purchasesData = purchaseLedgers.map((row, index) => ({
      'S.No': index + 1,
      'Ledger Name': row['Ledger Name'],
      'Classification': row['H3'] || '-',
      'Opening Balance': row['Opening Balance'] || 0,
      'Closing Balance': row['Closing Balance'] || 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(materialsData);
    const ws2 = XLSX.utils.json_to_sheet(purchasesData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Materials');
    XLSX.utils.book_append_sheet(wb, ws2, 'Purchases');
    XLSX.writeFile(wb, `Note_${noteNumber}_Cost_of_Materials.xlsx`);
  };

  // Render Summary View
  const renderSummaryView = () => (
    <Table>
      <TableBody>
          {/* Raw Material Section */}
          {hasRawMaterial && (
            <>
              <TableRow>
                <TableCell colSpan={2} className="font-bold">
                  Cost of raw material consumed
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} className="font-medium pl-4">
                  Raw material consumed
                </TableCell>
              </TableRow>
              {inventory['Raw Material'].opening !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Inventory at the beginning of the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(inventory['Raw Material'].opening)}</TableCell>
                </TableRow>
              )}
              {purchases['Raw Material'] !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Add: Purchases during the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(purchases['Raw Material'])}</TableCell>
                </TableRow>
              )}
              {inventory['Raw Material'].closing !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Less: Inventory at the end of the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(inventory['Raw Material'].closing)}</TableCell>
                </TableRow>
              )}
              <TableRow className="font-bold bg-gray-50">
                <TableCell className="pl-4">Cost of raw material consumed</TableCell>
                <TableCell className="text-right">{formatCurrency(rawMaterialCost)} (I)</TableCell>
              </TableRow>
            </>
          )}

          {/* Packing Material Section */}
          {hasPackingMaterial && (
            <>
              <TableRow>
                <TableCell colSpan={2} className="font-bold pt-4">
                  Packing material consumed (if considered as part of raw material)
                </TableCell>
              </TableRow>
              {inventory['Packing Material'].opening !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Inventory at the beginning of the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(inventory['Packing Material'].opening)}</TableCell>
                </TableRow>
              )}
              {purchases['Packing Material'] !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Add: Purchases during the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(purchases['Packing Material'])}</TableCell>
                </TableRow>
              )}
              {inventory['Packing Material'].closing !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Less: Inventory at the end of the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(inventory['Packing Material'].closing)}</TableCell>
                </TableRow>
              )}
              <TableRow className="font-bold bg-gray-50">
                <TableCell className="pl-4">Cost of packing material consumed</TableCell>
                <TableCell className="text-right">{formatCurrency(packingMaterialCost)} (II)</TableCell>
              </TableRow>
            </>
          )}

          {/* Other Materials Section */}
          {hasOtherMaterial && (
            <>
              <TableRow>
                <TableCell colSpan={2} className="font-bold pt-4">
                  Other materials (purchased intermediates and components)
                </TableCell>
              </TableRow>
              {inventory['Other Material'].opening !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Inventory at the beginning of the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(inventory['Other Material'].opening)}</TableCell>
                </TableRow>
              )}
              {purchases['Other Material'] !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Add: Purchases during the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(purchases['Other Material'])}</TableCell>
                </TableRow>
              )}
              {inventory['Other Material'].closing !== 0 && (
                <TableRow>
                  <TableCell className="pl-8">Less: Inventory at the end of the year</TableCell>
                  <TableCell className="text-right">{formatCurrency(inventory['Other Material'].closing)}</TableCell>
                </TableRow>
              )}
              <TableRow className="font-bold bg-gray-50">
                <TableCell className="pl-4">Cost of other material consumed</TableCell>
                <TableCell className="text-right">{formatCurrency(otherMaterialCost)} (III)</TableCell>
              </TableRow>
            </>
          )}

          {/* Total */}
          <TableRow className="border-t-2 border-black">
            <TableCell className="font-bold text-lg pt-4">
              Total raw material consumed (A)
            </TableCell>
            <TableCell className={cn(
              "text-right font-bold text-lg pt-4"
            )}>
              {formatCurrency(totalMaterialCost)} 
              {hasRawMaterial && hasPackingMaterial && hasOtherMaterial && ' (I+II+III)'}
              {hasRawMaterial && hasPackingMaterial && !hasOtherMaterial && ' (I+II)'}
              {hasRawMaterial && !hasPackingMaterial && hasOtherMaterial && ' (I+III)'}
              {!hasRawMaterial && hasPackingMaterial && hasOtherMaterial && ' (II+III)'}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

  // Render Detailed View (Ledger-wise)
  const renderDetailedView = () => (
    <div className="space-y-6">
      {/* Materials Inventory */}
      <div>
        <h4 className="font-semibold mb-2">Raw Materials Inventory</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">S.No</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock Group</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="text-right">Closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawMaterialItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No raw material items found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rawMaterialItems.map((item, index) => (
                  <TableRow key={item['Composite Key'] || index}>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item['Item Name']}</TableCell>
                    <TableCell className="text-muted-foreground">{item['Stock Group']}</TableCell>
                    <TableCell className="text-muted-foreground">{item['Stock Category']}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Math.abs(item['Opening Value']))}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Math.abs(item['Closing Value']))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-100 border-t-2">
                  <TableCell></TableCell>
                  <TableCell>TOTAL</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(rawMaterialItems.reduce((sum, i) => sum + Math.abs(i['Opening Value']), 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(rawMaterialItems.reduce((sum, i) => sum + Math.abs(i['Closing Value']), 0))}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Purchase Ledgers */}
      <div>
        <h4 className="font-semibold mb-2">Purchase Ledgers</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">S.No</TableHead>
              <TableHead>Ledger Name</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="text-right">Closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseLedgers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No purchase ledgers found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {purchaseLedgers.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row['Ledger Name']}</TableCell>
                    <TableCell className="text-muted-foreground">{row['H3'] || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row['Opening Balance'] || 0)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Math.abs(row['Closing Balance'] || 0))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-100 border-t-2">
                  <TableCell></TableCell>
                  <TableCell>TOTAL</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(purchaseLedgers.reduce((sum, r) => sum + (r['Opening Balance'] || 0), 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(purchaseLedgers.reduce((sum, r) => sum + Math.abs(r['Closing Balance'] || 0), 0))}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b pb-1">
        <div>
          <h3 className="text-sm font-semibold">
            Note {noteNumber}: Cost of materials consumed
          </h3>
          <p className="text-[10px] text-gray-500">{getScaleLabel()}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Compact segmented control */}
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
