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

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-bold">
          Note {noteNumber}: Cost of materials consumed
        </h3>
        <p className="text-sm text-gray-600">{getScaleLabel()}</p>
      </div>

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
    </div>
  );
}
