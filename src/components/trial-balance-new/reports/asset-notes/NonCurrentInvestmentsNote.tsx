import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { formatIndianNumber } from '@/utils/format';

interface NonCurrentInvestmentsNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function NonCurrentInvestmentsNote({ data, noteNumber, reportingScale = 'rupees' }: NonCurrentInvestmentsNoteProps) {
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

  // Categorize investments
  const investments = useMemo(() => {
    const quoted = {
      investmentProperty: 0,
      investmentPropertyDepreciation: 0,
      subsidiaries: 0,
      provisionSubsidiaries: 0,
      associates: 0,
      jointVentures: 0,
      partnershipFirm: 0,
      preferenceShares: 0,
      govtSecurities: 0,
      debentures: 0,
      mutualFunds: 0,
      otherLongTerm: 0,
    };

    const unquoted = {
      investmentProperty: 0,
      investmentPropertyDepreciation: 0,
      subsidiaries: 0,
      provisionSubsidiaries: 0,
      associates: 0,
      jointVentures: 0,
      partnershipFirm: 0,
      preferenceShares: 0,
      govtSecurities: 0,
      debentures: 0,
      mutualFunds: 0,
      otherLongTerm: 0,
    };

    data.forEach(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = row.ledgerName?.toLowerCase() || '';
      const value = row.closingBalance || 0;

      if (h3.includes('non-current investment') || h4.includes('non-current investment')) {
        const isQuoted = ledgerName.includes('quoted') || h4.includes('quoted');
        const target = isQuoted ? quoted : unquoted;

        if (ledgerName.includes('investment property')) {
          target.investmentProperty += value;
        } else if (ledgerName.includes('subsid')) {
          target.subsidiaries += value;
        } else if (ledgerName.includes('associate')) {
          target.associates += value;
        } else if (ledgerName.includes('joint venture')) {
          target.jointVentures += value;
        } else if (ledgerName.includes('partnership')) {
          target.partnershipFirm += value;
        } else if (ledgerName.includes('preference share')) {
          target.preferenceShares += value;
        } else if (ledgerName.includes('government') || ledgerName.includes('trust securities')) {
          target.govtSecurities += value;
        } else if (ledgerName.includes('debenture') || ledgerName.includes('bond')) {
          target.debentures += value;
        } else if (ledgerName.includes('mutual fund')) {
          target.mutualFunds += value;
        } else {
          target.otherLongTerm += value;
        }
      }
    });

    return { quoted, unquoted };
  }, [data]);

  const quotedTotal = useMemo(() => {
    return Object.values(investments.quoted).reduce((sum, val) => sum + val, 0);
  }, [investments.quoted]);

  const unquotedTotal = useMemo(() => {
    return Object.values(investments.unquoted).reduce((sum, val) => sum + val, 0);
  }, [investments.unquoted]);

  const netTotal = quotedTotal + unquotedTotal;

  if (netTotal === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Non-current investments</h3>
      </div>

      <p className="text-xs text-gray-600 mb-4">(valued at historical cost unless stated otherwise)</p>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">Particulars</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Face Value</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Numbers/Units/Shares</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Book Value</th>
            </tr>
          </thead>
          <tbody>
            {/* Trade Investments - Quoted */}
            <tr className="bg-blue-50 font-semibold">
              <td colSpan={4} className="px-3 py-2 text-sm">Trade Investments - Quoted</td>
            </tr>
            
            {investments.quoted.investmentProperty > 0 && (
              <>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">Investment property (Valued at cost less accumulated depreciation)</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.investmentProperty)}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm pl-6">Cost of land and building given on operating lease</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm">-</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm pl-6">Less: Accumulated depreciation</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm">-</td>
                </tr>
              </>
            )}

            {investments.quoted.subsidiaries > 0 && (
              <>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">Investments in subsidiaries</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.subsidiaries)}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm pl-6">Less: Provision for diminution in value of investments</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm">-</td>
                </tr>
              </>
            )}

            {investments.quoted.associates > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Investments in associates</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.associates)}</td>
              </tr>
            )}

            {investments.quoted.jointVentures > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Investments in joint ventures</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.jointVentures)}</td>
              </tr>
            )}

            {investments.quoted.partnershipFirm > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Investments in partnership firm (Refer footnote 1)</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.partnershipFirm)}</td>
              </tr>
            )}

            <tr className="bg-gray-50 font-semibold border-b">
              <td className="px-3 py-2 text-sm">Other Investments</td>
              <td colSpan={3}></td>
            </tr>

            {investments.quoted.preferenceShares > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Investments in preference shares</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.preferenceShares)}</td>
              </tr>
            )}

            {investments.quoted.govtSecurities > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Investments in government or trust securities</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.govtSecurities)}</td>
              </tr>
            )}

            {investments.quoted.debentures > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Investments in debentures or bonds</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.debentures)}</td>
              </tr>
            )}

            {investments.quoted.mutualFunds > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Investments in mutual funds</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.mutualFunds)}</td>
              </tr>
            )}

            {investments.quoted.otherLongTerm > 0 && (
              <tr className="border-b">
                <td className="px-3 py-2 text-sm">Other long term investments (specify nature)</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-center text-sm">-</td>
                <td className="px-3 py-2 text-right text-sm">{formatValue(investments.quoted.otherLongTerm)}</td>
              </tr>
            )}

            {quotedTotal > 0 && (
              <>
                <tr className="bg-gray-100 font-semibold border-b">
                  <td className="px-3 py-2 text-sm">Total Non-current investments (gross)</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm">{formatValue(quotedTotal)}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">Less: Current maturities of long term investments (Refer note XX)</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm">-</td>
                </tr>
                <tr className="bg-gray-100 font-bold border-b">
                  <td className="px-3 py-2 text-sm">Net non current investments</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(quotedTotal)}</td>
                </tr>
              </>
            )}

            {/* Trade Investments - Unquoted */}
            {unquotedTotal > 0 && (
              <>
                <tr className="bg-blue-50 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-sm">Trade Investments - Unquoted</td>
                </tr>
                
                {/* Similar structure for unquoted investments */}
                {investments.unquoted.investmentProperty > 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Investment property (Valued at cost less accumulated depreciation)</td>
                    <td className="px-3 py-2 text-center text-sm">-</td>
                    <td className="px-3 py-2 text-center text-sm">-</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(investments.unquoted.investmentProperty)}</td>
                  </tr>
                )}

                <tr className="bg-gray-100 font-bold border-b">
                  <td className="px-3 py-2 text-sm">Net non current investments</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-center text-sm">-</td>
                  <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(unquotedTotal)}</td>
                </tr>
              </>
            )}

            {/* Aggregate Market Value */}
            <tr className="bg-yellow-50">
              <td colSpan={4} className="px-3 py-2 text-sm font-semibold">Aggregate market value as at the end of the year:</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm">Market value of quoted investments</td>
              <td colSpan={3} className="px-3 py-2 text-right text-sm">-</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm">Market value of Un-quoted investments</td>
              <td colSpan={3} className="px-3 py-2 text-right text-sm">-</td>
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm">Provision for diminution in value of investments</td>
              <td colSpan={3} className="px-3 py-2 text-right text-sm">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footnote */}
      {(investments.quoted.partnershipFirm > 0 || investments.unquoted.partnershipFirm > 0) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs font-semibold text-blue-900 mb-2">Footnote 1: Details of investment in partnership firm</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Name of partner with % share in profits of such firm</th>
                <th className="text-right py-1">Share %</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1">ABC</td>
                <td className="text-right py-1">40</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">XYZ</td>
                <td className="text-right py-1">40</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">Mr. A</td>
                <td className="text-right py-1">20</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 font-semibold">Total capital of the firm (Amount in Rs.)</td>
                <td className="text-right py-1">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
