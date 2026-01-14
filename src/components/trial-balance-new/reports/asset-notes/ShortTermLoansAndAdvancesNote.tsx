import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { formatIndianNumber } from '@/utils/formatNumber';

interface ShortTermLoansAndAdvancesNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function ShortTermLoansAndAdvancesNote({ data, noteNumber, reportingScale = 'rupees' }: ShortTermLoansAndAdvancesNoteProps) {
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

  const loansAndAdvances = useMemo(() => {
    const secured = {
      loansToEmployees: 0,
      loansToRelatedParties: 0,
      loansToOthers: 0,
    };

    const unsecured = {
      tradeDeposits: 0,
      advanceTax: 0,
      matCredit: 0,
      gstReceivable: 0,
      exciseDuty: 0,
      salesTax: 0,
      serviceTax: 0,
      balancesWithGovt: 0,
      prepaidExpenses: 0,
      advancesToSuppliers: 0,
      advancesToEmployees: 0,
      advancesToRelatedParties: 0,
      advancesToOthers: 0,
      loansToEmployees: 0,
      loansToRelatedParties: 0,
      loansToOthers: 0,
    };

    const doubtful = {
      tradeDeposits: 0,
      balancesWithGovt: 0,
      advancesToSuppliers: 0,
      advancesToEmployees: 0,
      advancesToRelatedParties: 0,
      advancesToOthers: 0,
      loansToEmployees: 0,
      loansToRelatedParties: 0,
      loansToOthers: 0,
      provision: 0,
    };

    data.forEach(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = row.ledgerName?.toLowerCase() || '';
      const value = row.closingBalance || 0;

      if (h3.includes('short term loan') || h3.includes('other current asset') ||
        h4.includes('loan') || h4.includes('advance')) {

        const isSecured = ledgerName.includes('secured');
        const isDoubtful = ledgerName.includes('doubtful') || ledgerName.includes('bad');
        const isProvision = ledgerName.includes('provision');

        if (isProvision) {
          doubtful.provision += Math.abs(value);
        } else if (ledgerName.includes('advance tax') || ledgerName.includes('tds')) {
          unsecured.advanceTax += value;
        } else if (ledgerName.includes('mat credit')) {
          unsecured.matCredit += value;
        } else if (ledgerName.includes('gst') && (ledgerName.includes('receivable') || ledgerName.includes('input'))) {
          unsecured.gstReceivable += value;
        } else if (ledgerName.includes('excise')) {
          unsecured.exciseDuty += value;
        } else if (ledgerName.includes('sales tax') || ledgerName.includes('vat')) {
          unsecured.salesTax += value;
        } else if (ledgerName.includes('service tax')) {
          unsecured.serviceTax += value;
        } else if (ledgerName.includes('government') || ledgerName.includes('statutory')) {
          if (isDoubtful) doubtful.balancesWithGovt += value;
          else unsecured.balancesWithGovt += value;
        } else if (ledgerName.includes('prepaid')) {
          unsecured.prepaidExpenses += value;
        } else if (ledgerName.includes('advance') && ledgerName.includes('supplier')) {
          if (isDoubtful) doubtful.advancesToSuppliers += value;
          else unsecured.advancesToSuppliers += value;
        } else if (ledgerName.includes('advance') && ledgerName.includes('employee')) {
          if (isDoubtful) doubtful.advancesToEmployees += value;
          else unsecured.advancesToEmployees += value;
        } else if (ledgerName.includes('advance') && ledgerName.includes('related')) {
          if (isDoubtful) doubtful.advancesToRelatedParties += value;
          else unsecured.advancesToRelatedParties += value;
        } else if (ledgerName.includes('advance')) {
          if (isDoubtful) doubtful.advancesToOthers += value;
          else unsecured.advancesToOthers += value;
        } else if (ledgerName.includes('loan') && ledgerName.includes('employee')) {
          if (isSecured) secured.loansToEmployees += value;
          else if (isDoubtful) doubtful.loansToEmployees += value;
          else unsecured.loansToEmployees += value;
        } else if (ledgerName.includes('loan') && ledgerName.includes('related')) {
          if (isSecured) secured.loansToRelatedParties += value;
          else if (isDoubtful) doubtful.loansToRelatedParties += value;
          else unsecured.loansToRelatedParties += value;
        } else if (ledgerName.includes('loan')) {
          if (isSecured) secured.loansToOthers += value;
          else if (isDoubtful) doubtful.loansToOthers += value;
          else unsecured.loansToOthers += value;
        } else if (ledgerName.includes('deposit')) {
          if (isDoubtful) doubtful.tradeDeposits += value;
          else unsecured.tradeDeposits += value;
        }
      }
    });

    return { secured, unsecured, doubtful };
  }, [data]);

  const securedTotal = Object.values(loansAndAdvances.secured).reduce((sum, val) => sum + val, 0);
  const unsecuredTotal = Object.values(loansAndAdvances.unsecured).reduce((sum, val) => sum + val, 0);
  const doubtfulTotal = Object.values(loansAndAdvances.doubtful).reduce((sum, val) => sum + val, 0) - loansAndAdvances.doubtful.provision;
  const grandTotal = securedTotal + unsecuredTotal + doubtfulTotal;

  if (grandTotal === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded border p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Short term loans and advances</h3>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">Particulars</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">#NAME?</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">#NAME?</th>
            </tr>
          </thead>
          <tbody>
            {/* Secured */}
            {securedTotal !== 0 && (
              <>
                <tr className="bg-blue-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2">Secured, considered good</td>
                </tr>
                {loansAndAdvances.secured.loansToEmployees !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2">Loans to employees</td>
                    <td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.secured.loansToEmployees)}</td>
                    <td className="px-3 py-2 text-right">-</td>
                  </tr>
                )}
                {loansAndAdvances.secured.loansToRelatedParties !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2">Loans to related parties</td>
                    <td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.secured.loansToRelatedParties)}</td>
                    <td className="px-3 py-2 text-right">-</td>
                  </tr>
                )}
                {loansAndAdvances.secured.loansToOthers !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2">Loans to others</td>
                    <td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.secured.loansToOthers)}</td>
                    <td className="px-3 py-2 text-right">-</td>
                  </tr>
                )}
              </>
            )}

            {/* Unsecured */}
            {unsecuredTotal !== 0 && (
              <>
                <tr className="bg-blue-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2">Unsecured, considered good</td>
                </tr>
                {loansAndAdvances.unsecured.tradeDeposits !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Trade Deposits</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.tradeDeposits)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.unsecured.advanceTax !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Advance Tax and TDS [Net]</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.advanceTax)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.unsecured.matCredit !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">MAT Credit Entitlement</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.matCredit)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.unsecured.gstReceivable !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">GST Receivable</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.gstReceivable)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.unsecured.balancesWithGovt !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Balances with government authorities</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.balancesWithGovt)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.unsecured.prepaidExpenses !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Prepaid Expenses</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.prepaidExpenses)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.unsecured.advancesToSuppliers !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Advances to suppliers</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.advancesToSuppliers)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.unsecured.loansToEmployees !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Loans to employees</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.unsecured.loansToEmployees)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
              </>
            )}

            {/* Doubtful */}
            {doubtfulTotal !== 0 && (
              <>
                <tr className="bg-yellow-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2">Doubtful</td>
                </tr>
                {loansAndAdvances.doubtful.advancesToOthers !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Advances to others</td><td className="px-3 py-2 text-right">{formatValue(loansAndAdvances.doubtful.advancesToOthers)}</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
                {loansAndAdvances.doubtful.provision !== 0 && (
                  <tr className="border-b"><td className="px-3 py-2">Less: Provision for doubtful loans and advances</td><td className="px-3 py-2 text-right">({formatValue(loansAndAdvances.doubtful.provision)})</td><td className="px-3 py-2 text-right">-</td></tr>
                )}
              </>
            )}

            {/* Total */}
            <tr className="bg-gray-100 font-bold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right font-bold">{formatValue(grandTotal)}</td>
              <td className="px-3 py-2 text-right">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Related Party Disclosure Table */}
      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="text-sm font-semibold mb-3">Loans and advances repayable on demand or granted without specifying any terms or period of repayment</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th rowSpan={2} className="px-2 py-2 text-left border">Type of Loan and Borrower</th>
                <th colSpan={2} className="px-2 py-2 text-center border">#NAME?</th>
                <th colSpan={2} className="px-2 py-2 text-center border">#NAME?</th>
              </tr>
              <tr>
                <th className="px-2 py-2 text-center border">Amount outstanding</th>
                <th className="px-2 py-2 text-center border">% of Total</th>
                <th className="px-2 py-2 text-center border">Amount outstanding</th>
                <th className="px-2 py-2 text-center border">% of Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-50 font-semibold">
                <td colSpan={5} className="px-2 py-2 border">Repayable on demand</td>
              </tr>
              <tr className="border-b"><td className="px-2 py-2 border">Promoters</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td></tr>
              <tr className="border-b"><td className="px-2 py-2 border">Directors</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td></tr>
              <tr className="border-b"><td className="px-2 py-2 border">KMPs</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td></tr>
              <tr className="border-b"><td className="px-2 py-2 border">Related Parties</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td><td className="px-2 py-2 text-center border">-</td></tr>
              <tr className="bg-gray-100 font-semibold border-b"><td className="px-2 py-2 border">Total</td><td className="px-2 py-2 text-center border">0</td><td className="px-2 py-2 text-center border">0</td><td className="px-2 py-2 text-center border">0</td><td className="px-2 py-2 text-center border">0</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
