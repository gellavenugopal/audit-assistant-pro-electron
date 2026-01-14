import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { formatIndianNumber } from '@/utils/formatNumber';

interface OtherCurrentAssetsNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function OtherCurrentAssetsNote({ data, noteNumber, reportingScale = 'rupees' }: OtherCurrentAssetsNoteProps) {
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

  const otherAssets = useMemo(() => {
    let interestAccruedNotDue = 0;
    let interestAccruedDue = 0;
    let unbilledReceivables = 0;
    let others = 0;

    data.forEach(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = row.ledgerName?.toLowerCase() || '';
      const value = row.closingBalance || 0;

      if (h3.includes('other current asset') || h4.includes('other current asset')) {
        if (ledgerName.includes('interest') && ledgerName.includes('not due')) {
          interestAccruedNotDue += value;
        } else if (ledgerName.includes('interest') && (ledgerName.includes('due') || ledgerName.includes('accrued'))) {
          interestAccruedDue += value;
        } else if (ledgerName.includes('unbilled')) {
          unbilledReceivables += value;
        } else {
          others += value;
        }
      }
    });

    return { interestAccruedNotDue, interestAccruedDue, unbilledReceivables, others };
  }, [data]);

  const total = otherAssets.interestAccruedNotDue + otherAssets.interestAccruedDue + otherAssets.unbilledReceivables + otherAssets.others;

  if (total === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded border p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Other current assets</h3>
      </div>

      <p className="text-xs text-gray-600 mb-2">(Specify nature)</p>
      <p className="text-xs text-blue-600 italic mb-4">
        (This is an all-inclusive heading, which incorporates current assets that do not fit into any other asset categories)
      </p>

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
            {otherAssets.interestAccruedNotDue !== 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Interest accrued but not due on deposits</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(otherAssets.interestAccruedNotDue)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {otherAssets.interestAccruedDue !== 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Interest accrued and due on deposits</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(otherAssets.interestAccruedDue)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {otherAssets.unbilledReceivables !== 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Unbilled receivables</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(otherAssets.unbilledReceivables)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {otherAssets.others !== 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Others</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(otherAssets.others)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            <tr className="bg-gray-100 font-bold">
              <td className="px-3 py-2 text-sm">Total</td>
              <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(total)}</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
