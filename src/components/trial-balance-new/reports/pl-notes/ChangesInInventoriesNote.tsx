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
import { formatCurrency as sharedFormatCurrency, getScaleLabel, ReportingScale } from '@/lib/formatters/currency';
import { StockItem } from '@/types/financialStatements';

interface Props {
  stockData: StockItem[];
  reportingScale?: ReportingScale;
  noteNumber?: string;
}

export function ChangesInInventoriesNote({ 
  stockData, 
  reportingScale = 'auto',
  noteNumber = '19'
}: Props) {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const formatCurrency = (amount: number) => sharedFormatCurrency(amount, reportingScale);

  // Helper to check if item is a raw material (goes to Cost of Materials Consumed)
  const isRawMaterial = (item: StockItem) => {
    const category = (item['Stock Category'] || '').toLowerCase();
    const stockGroup = (item['Stock Group'] || '').toLowerCase();
    return (
      category.includes('raw') || 
      stockGroup.includes('raw') ||
      category.includes('pack') || 
      stockGroup.includes('pack') ||
      category.includes('consumable') || 
      category.includes('other') ||
      category.includes('component') || 
      category.includes('intermediate')
    );
  };

  // Calculate inventory values by category - includes all NON-raw material items
  const calculateInventory = () => {
    const result = {
      'Stock-in-Trade': { opening: 0, closing: 0 },
      'Work in Progress': { opening: 0, closing: 0 },
      'Finished Goods': { opening: 0, closing: 0 }
    };

    // Safety check for stockData
    if (!stockData || !Array.isArray(stockData)) return result;

    stockData.forEach(item => {
      if (!item) return;
      
      // Skip raw materials - they go to Cost of Materials Consumed
      if (isRawMaterial(item)) return;
      
      const category = (item['Stock Category'] || '').toLowerCase();
      const stockGroup = (item['Stock Group'] || '').toLowerCase();
      // Stock values are assets (Dr), so use Math.abs to ensure positive values
      const openingValue = Math.abs(item['Opening Value'] || 0);
      const closingValue = Math.abs(item['Closing Value'] || 0);
      
      // Match to standard categories with flexible matching
      if (category.includes('stock-in-trade') || category.includes('stock in trade') || 
          category === 'trading' || stockGroup.includes('trading')) {
        result['Stock-in-Trade'].opening += openingValue;
        result['Stock-in-Trade'].closing += closingValue;
      } else if (category.includes('work-in-progress') || category.includes('work in progress') || 
                 category.includes('wip') || stockGroup.includes('wip')) {
        result['Work in Progress'].opening += openingValue;
        result['Work in Progress'].closing += closingValue;
      } else {
        // Default: Finished Goods (includes items not matching other categories)
        result['Finished Goods'].opening += openingValue;
        result['Finished Goods'].closing += closingValue;
      }
    });

    return result;
  };

  const inventory = calculateInventory();
  
  const totalOpening = 
    inventory['Stock-in-Trade'].opening +
    inventory['Work in Progress'].opening +
    inventory['Finished Goods'].opening;
  
  const totalClosing = 
    inventory['Stock-in-Trade'].closing +
    inventory['Work in Progress'].closing +
    inventory['Finished Goods'].closing;
  
  const changesInInventories = totalOpening - totalClosing;

  // Check which categories have values
  const hasStockInTrade = inventory['Stock-in-Trade'].opening !== 0 || inventory['Stock-in-Trade'].closing !== 0;
  const hasWorkInProgress = inventory['Work in Progress'].opening !== 0 || inventory['Work in Progress'].closing !== 0;
  const hasFinishedGoods = inventory['Finished Goods'].opening !== 0 || inventory['Finished Goods'].closing !== 0;

  // If no inventories at all, show nothing
  if (!hasStockInTrade && !hasWorkInProgress && !hasFinishedGoods) {
    return null;
  }

  // Filter stock data for export - exclude raw materials
  const finishedGoodsForExport = stockData.filter(item => item && !isRawMaterial(item));

  // Export to Excel
  const handleExport = () => {
    const exportData = finishedGoodsForExport.map((item, index) => ({
      'S.No': index + 1,
      'Item Name': item['Item Name'],
      'Stock Group': item['Stock Group'],
      'Category': item['Stock Category'],
      'Opening Value': Math.abs(item['Opening Value']),
      'Closing Value': Math.abs(item['Closing Value']),
      'Change': Math.abs(item['Opening Value']) - Math.abs(item['Closing Value']),
    }));
    
    // Add total row
    exportData.push({
      'S.No': '' as unknown as number,
      'Item Name': 'TOTAL',
      'Stock Group': '',
      'Category': '',
      'Opening Value': totalOpening,
      'Closing Value': totalClosing,
      'Change': changesInInventories,
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Note ${noteNumber}`);
    XLSX.writeFile(wb, `Note_${noteNumber}_Changes_in_Inventories.xlsx`);
  };

  // Render Summary View
  const renderSummaryView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold"></TableHead>
          <TableHead className="text-right font-bold">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Opening Inventories */}
        {totalOpening !== 0 && (
          <>
            <TableRow>
              <TableCell colSpan={2} className="font-bold">
                Inventories at the beginning of the year:
              </TableCell>
            </TableRow>
            {hasStockInTrade && inventory['Stock-in-Trade'].opening !== 0 && (
              <TableRow>
                <TableCell className="pl-8">Stock-in-trade</TableCell>
                <TableCell className="text-right">{formatCurrency(inventory['Stock-in-Trade'].opening)}</TableCell>
              </TableRow>
            )}
            {hasWorkInProgress && inventory['Work in Progress'].opening !== 0 && (
              <TableRow>
                <TableCell className="pl-8">Work in progress</TableCell>
                <TableCell className="text-right">{formatCurrency(inventory['Work in Progress'].opening)}</TableCell>
              </TableRow>
            )}
            {hasFinishedGoods && inventory['Finished Goods'].opening !== 0 && (
              <TableRow>
                <TableCell className="pl-8">Finished goods</TableCell>
                <TableCell className="text-right">{formatCurrency(inventory['Finished Goods'].opening)}</TableCell>
              </TableRow>
            )}
            <TableRow className="font-bold bg-gray-50">
              <TableCell></TableCell>
              <TableCell className="text-right">{formatCurrency(totalOpening)} (I)</TableCell>
            </TableRow>
          </>
        )}

        {/* Closing Inventories */}
        {totalClosing !== 0 && (
          <>
            <TableRow>
              <TableCell colSpan={2} className="font-bold pt-4">
                Inventories at the end of the year:
              </TableCell>
            </TableRow>
            {hasStockInTrade && inventory['Stock-in-Trade'].closing !== 0 && (
              <TableRow>
                <TableCell className="pl-8">Stock-in-trade</TableCell>
                <TableCell className="text-right">{formatCurrency(inventory['Stock-in-Trade'].closing)}</TableCell>
              </TableRow>
            )}
            {hasWorkInProgress && inventory['Work in Progress'].closing !== 0 && (
              <TableRow>
                <TableCell className="pl-8">Work in progress</TableCell>
                <TableCell className="text-right">{formatCurrency(inventory['Work in Progress'].closing)}</TableCell>
              </TableRow>
            )}
            {hasFinishedGoods && inventory['Finished Goods'].closing !== 0 && (
              <TableRow>
                <TableCell className="pl-8">Finished goods</TableCell>
                <TableCell className="text-right">{formatCurrency(inventory['Finished Goods'].closing)}</TableCell>
              </TableRow>
            )}
            <TableRow className="font-bold bg-gray-50">
              <TableCell></TableCell>
              <TableCell className="text-right">{formatCurrency(totalClosing)} (II)</TableCell>
            </TableRow>
          </>
        )}

        {/* Total Change */}
        <TableRow className="border-t-2 border-black">
          <TableCell className="font-bold text-lg pt-4">
            Changes in inventories {totalOpening !== 0 && totalClosing !== 0 && '(I - II)'}
          </TableCell>
          <TableCell className={cn(
            "text-right font-bold text-lg pt-4",
            changesInInventories < 0 ? "text-red-600" : "text-green-600"
          )}>
            {formatCurrency(changesInInventories)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  // Filter stock data for detailed view - exclude raw materials
  const finishedGoodsItems = stockData.filter(item => item && !isRawMaterial(item));

  // Render Detailed View (Ledger-wise) - only non-raw material items
  const renderDetailedView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">S.No</TableHead>
          <TableHead>Item Name</TableHead>
          <TableHead>Stock Group</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Opening</TableHead>
          <TableHead className="text-right">Closing</TableHead>
          <TableHead className="text-right">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {finishedGoodsItems.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
              No finished goods, WIP, or stock-in-trade items found
            </TableCell>
          </TableRow>
        ) : (
          <>
            {finishedGoodsItems.map((item, index) => (
              <TableRow key={item['Composite Key'] || index}>
                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{item['Item Name']}</TableCell>
                <TableCell className="text-muted-foreground">{item['Stock Group']}</TableCell>
                <TableCell className="text-muted-foreground">{item['Stock Category']}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(Math.abs(item['Opening Value']))}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(Math.abs(item['Closing Value']))}</TableCell>
                <TableCell className={cn(
                  "text-right font-mono",
                  (item['Opening Value'] - item['Closing Value']) < 0 ? "text-red-600" : "text-green-600"
                )}>
                  {formatCurrency(Math.abs(item['Opening Value']) - Math.abs(item['Closing Value']))}
                </TableCell>
              </TableRow>
            ))}
            {/* Total Row */}
            <TableRow className="font-bold bg-gray-100 border-t-2">
              <TableCell></TableCell>
              <TableCell>TOTAL</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalOpening)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalClosing)}</TableCell>
              <TableCell className={cn(
                "text-right font-mono",
                changesInInventories < 0 ? "text-red-600" : "text-green-600"
              )}>
                {formatCurrency(changesInInventories)}
              </TableCell>
            </TableRow>
          </>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b pb-1">
        <div>
          <h3 className="text-sm font-semibold">
            Note {noteNumber}: Changes in inventories of finished goods, work in progress and stock-in-trade
          </h3>
          <p className="text-[10px] text-gray-500">{getScaleLabel(reportingScale)}</p>
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
