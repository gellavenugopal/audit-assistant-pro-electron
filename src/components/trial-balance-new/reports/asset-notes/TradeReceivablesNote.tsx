import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { formatIndianNumber } from '@/utils/formatNumber';

interface TradeReceivablesNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function TradeReceivablesNote({ data, noteNumber, reportingScale = 'rupees' }: TradeReceivablesNoteProps) {
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

  const receivables = useMemo(() => {
    let securedGood = 0;
    let unsecuredGood = 0;
    let doubtful = 0;
    let provisionDoubtful = 0;

    data.forEach(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = row.ledgerName?.toLowerCase() || '';
      const value = row.closingBalance || 0;

      if (h3.includes('trade receivable') || h4.includes('trade receivable') || 
          ledgerName.includes('sundry debtor') || ledgerName.includes('trade receivable')) {
        if (ledgerName.includes('secured')) {
          securedGood += value;
        } else if (ledgerName.includes('doubtful') || ledgerName.includes('bad debt')) {
          doubtful += value;
        } else if (ledgerName.includes('provision')) {
          provisionDoubtful += Math.abs(value);
        } else {
          unsecuredGood += value;
        }
      }
    });

    return { securedGood, unsecuredGood, doubtful, provisionDoubtful };
  }, [data]);

  const total = receivables.securedGood + receivables.unsecuredGood + receivables.doubtful - receivables.provisionDoubtful;

  if (total === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Trade receivables</h3>
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
            {receivables.securedGood > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Secured, considered good</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(receivables.securedGood)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {receivables.unsecuredGood > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Unsecured, considered good</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(receivables.unsecuredGood)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {receivables.doubtful > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Doubtful</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(receivables.doubtful)}</td>
                <td className="px-3 py-2 text-right text-sm">-</td>
              </tr>
            )}
            {receivables.provisionDoubtful > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Less: Provision for doubtful debts</td>
                <td className="px-3 py-2 text-right text-sm">({formatValue(receivables.provisionDoubtful)})</td>
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

      {/* Ageing Schedule */}
      <div className="mt-6 space-y-4">
        <h4 className="text-sm font-semibold">Ageing for trade receivables from the due date of payment for each of the category as at</h4>
        
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th rowSpan={2} className="px-2 py-2 text-left font-semibold border-r">Particulars</th>
                <th rowSpan={2} className="px-2 py-2 text-center font-semibold border-r">Not Due</th>
                <th colSpan={5} className="px-2 py-2 text-center font-semibold">Outstanding for following periods from Due Date of Payment</th>
              </tr>
              <tr className="border-t">
                <th className="px-2 py-2 text-center font-semibold border-r">Less than 6 months</th>
                <th className="px-2 py-2 text-center font-semibold border-r">6 months - 1 years</th>
                <th className="px-2 py-2 text-center font-semibold border-r">1 - 2 years</th>
                <th className="px-2 py-2 text-center font-semibold border-r">2 - 3 years</th>
                <th className="px-2 py-2 text-center font-semibold border-r">More than 3 years</th>
                <th className="px-2 py-2 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-yellow-50">
                <td className="px-2 py-2">Undisputed - Considered Good</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center font-semibold">0</td>
              </tr>
              <tr className="border-b">
                <td className="px-2 py-2">Undisputed - Considered doubtful</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center font-semibold">0</td>
              </tr>
              <tr className="border-b">
                <td className="px-2 py-2">Disputed - Considered Good</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center font-semibold">0</td>
              </tr>
              <tr className="border-b">
                <td className="px-2 py-2">Disputed - Considered doubtful</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center border-r">-</td>
                <td className="px-2 py-2 text-center font-semibold">0</td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 text-center border-r">0</td>
                <td className="px-2 py-2 text-center border-r">0</td>
                <td className="px-2 py-2 text-center border-r">0</td>
                <td className="px-2 py-2 text-center border-r">0</td>
                <td className="px-2 py-2 text-center border-r">0</td>
                <td className="px-2 py-2 text-center border-r">0</td>
                <td className="px-2 py-2 text-center">0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
