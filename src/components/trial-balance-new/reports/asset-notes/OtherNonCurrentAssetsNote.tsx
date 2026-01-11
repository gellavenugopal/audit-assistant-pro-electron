import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { formatIndianNumber } from '@/utils/formatNumber';

interface OtherNonCurrentAssetsNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function OtherNonCurrentAssetsNote({ data, noteNumber, reportingScale = 'rupees' }: OtherNonCurrentAssetsNoteProps) {
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
    let securityDeposits = 0;
    let prepaidExpenses = 0;
    let others = 0;

    data.forEach(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = (row['Ledger Name'] || row.ledgerName || '').toLowerCase();
      const primary = (row['Primary Group'] || '').toLowerCase();
      const value = row['Closing Balance'] || row.closingBalance || 0;

      // Exclude PPE items (Fixed Assets group or common PPE ledger names)
      const isPPE = primary.includes('fixed asset') ||
        ['land', 'building', 'plant', 'machinery', 'furniture', 'fixture',
          'vehicle', 'computer', 'electrical', 'office equipment',
          'goodwill', 'software', 'trademark', 'brand'].some(pattern => ledgerName.includes(pattern));

      if (isPPE) return; // Skip PPE items

      if (h3.includes('other non-current asset') || h4.includes('other non-current asset')) {
        if (ledgerName.includes('security deposit')) {
          securityDeposits += value;
        } else if (ledgerName.includes('prepaid')) {
          prepaidExpenses += value;
        } else {
          others += value;
        }
      }
    });

    return { securityDeposits, prepaidExpenses, others };
  }, [data]);

  const total = otherAssets.securityDeposits + otherAssets.prepaidExpenses + otherAssets.others;

  if (total === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded border p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Other non-current assets</h3>
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
            {otherAssets.securityDeposits !== 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Security Deposits</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(otherAssets.securityDeposits)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {otherAssets.prepaidExpenses !== 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Prepaid expenses</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(otherAssets.prepaidExpenses)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {otherAssets.others !== 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Others (Specify nature)</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(otherAssets.others)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            <tr className="bg-gray-100 font-bold">
              <td className="px-3 py-2 text-sm">Total other non-current other assets</td>
              <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(total)}</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
