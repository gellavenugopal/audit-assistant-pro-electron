import { useMemo } from 'react';
import { formatIndianNumber } from '@/utils/formatNumber';

interface InventoriesNoteProps {
  stockData: any[];
  noteNumber: string;
  reportingScale?: string;
}

export function InventoriesNote({ stockData, noteNumber, reportingScale = 'rupees' }: InventoriesNoteProps) {
  const scaleValue = useMemo(() => {
    switch (reportingScale) {
      case 'thousands': return 1000;
      case 'lakhs': return 100000;
      case 'crores': return 10000000;
      default: return 1;
    }
  }, [reportingScale]);

  const formatValue = (value: number) => {
    const scaled = value / scaleValue;
    return formatIndianNumber(scaled);
  };

  const inventories = useMemo(() => {
    let rawMaterials = 0;
    let workInProgress = 0;
    let finishedGoods = 0;
    let stockInTrade = 0;
    let storesAndSpares = 0;

    stockData.forEach(item => {
      const category = item.category?.toLowerCase() || '';
      const closingValue = item.closingValue || 0;

      if (category.includes('raw material')) {
        rawMaterials += closingValue;
      } else if (category.includes('work in progress') || category.includes('wip')) {
        workInProgress += closingValue;
      } else if (category.includes('finished goods')) {
        finishedGoods += closingValue;
      } else if (category.includes('stock-in-trade') || category.includes('trading goods')) {
        stockInTrade += closingValue;
      } else if (category.includes('stores') || category.includes('spares')) {
        storesAndSpares += closingValue;
      }
    });

    return { rawMaterials, workInProgress, finishedGoods, stockInTrade, storesAndSpares };
  }, [stockData]);

  const total = Object.values(inventories).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Inventories</h3>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">Particulars</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">#NAME?</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">#NAME?</th>
            </tr>
          </thead>
          <tbody>
            {inventories.rawMaterials > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Raw Materials</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(inventories.rawMaterials)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {inventories.workInProgress > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Work-in-progress</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(inventories.workInProgress)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {inventories.finishedGoods > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Finished goods</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(inventories.finishedGoods)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {inventories.stockInTrade > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Stock-in-trade</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(inventories.stockInTrade)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {inventories.storesAndSpares > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Stores and Spares</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(inventories.storesAndSpares)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            <tr className="bg-gray-100 font-bold border-b">
              <td className="px-3 py-2 text-sm">Total</td>
              <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(total)}</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>

            {/* Goods in Transit */}
            <tr className="bg-yellow-50">
              <td colSpan={3} className="px-3 py-2 text-sm font-semibold">Above inventories includes goods in transit as under:</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm">Raw Materials in transit</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm">Finished goods in transit</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm">Stock-in-trade in transit</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm">Stores and Spares in transit</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
