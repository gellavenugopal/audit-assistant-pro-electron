import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface StockItem {
  'Item Name': string;
  'Stock Group': string;
  'Primary Group': string;
  'Opening Value': number;
  'Closing Value': number;
  'Stock Category': string;
  'Composite Key': string;
}

interface Props {
  stockData: StockItem[];
  reportingScale?: string;
  noteNumber?: string;
}

export function ChangesInInventoriesNote({ 
  stockData, 
  reportingScale = 'auto',
  noteNumber = '19'
}: Props) {
  
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
      const category = (item['Stock Category'] || '').toLowerCase();
      // Stock values are assets (Dr), so use Math.abs to ensure positive values
      const openingValue = Math.abs(item['Opening Value'] || 0);
      const closingValue = Math.abs(item['Closing Value'] || 0);
      
      // Match to standard categories with flexible matching
      if (category.includes('stock-in-trade') || category.includes('stock in trade') || category === 'trading') {
        result['Stock-in-Trade'].opening += openingValue;
        result['Stock-in-Trade'].closing += closingValue;
      } else if (category.includes('work-in-progress') || category.includes('work in progress') || category.includes('wip')) {
        result['Work in Progress'].opening += openingValue;
        result['Work in Progress'].closing += closingValue;
      } else if (category.includes('finished') || category.includes('fg')) {
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

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-bold">
          Note {noteNumber}: Changes in inventories of finished goods, work in progress and stock-in-trade
        </h3>
        <p className="text-sm text-gray-600">{getScaleLabel()}</p>
      </div>

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
    </div>
  );
}
