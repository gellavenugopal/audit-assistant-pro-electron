import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { formatIndianNumber } from '@/utils/formatNumber';

interface CashAndBankBalancesNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

export function CashAndBankBalancesNote({ data, noteNumber, reportingScale = 'rupees' }: CashAndBankBalancesNoteProps) {
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

  const cashAndBank = useMemo(() => {
    const cash = {
      currentAccounts: 0,
      savingAccounts: 0,
      cashCredit: 0,
      fixedDeposits: 0,
      depositsLessThan3Months: 0,
      cheques: 0,
      cashOnHand: 0,
    };

    const otherBank = {
      bankDeposits: 0,
      earmarkedDeposits: 0,
      depositsMoreThan3Months: 0,
      marginMoney: 0,
      others: 0,
    };

    data.forEach(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = row.ledgerName?.toLowerCase() || '';
      const value = row.closingBalance || 0;

      if (h3.includes('cash') || h4.includes('cash') || h3.includes('bank') || h4.includes('bank')) {
        // Cash and cash equivalents
        if (ledgerName.includes('current account')) {
          cash.currentAccounts += value;
        } else if (ledgerName.includes('saving account') || ledgerName.includes('savings account')) {
          cash.savingAccounts += value;
        } else if (ledgerName.includes('cash credit') || ledgerName.includes('cc account')) {
          cash.cashCredit += value;
        } else if (ledgerName.includes('fixed deposit') && (ledgerName.includes('less than 3') || ledgerName.includes('<3'))) {
          cash.depositsLessThan3Months += value;
        } else if (ledgerName.includes('cheque') || ledgerName.includes('draft')) {
          cash.cheques += value;
        } else if (ledgerName.includes('cash on hand') || ledgerName.includes('cash in hand')) {
          cash.cashOnHand += value;
        }
        // Other bank balances
        else if (ledgerName.includes('bank deposit')) {
          otherBank.bankDeposits += value;
        } else if (ledgerName.includes('earmark')) {
          otherBank.earmarkedDeposits += value;
        } else if (ledgerName.includes('fixed deposit') || ledgerName.includes('fd')) {
          otherBank.depositsMoreThan3Months += value;
        } else if (ledgerName.includes('margin money') || ledgerName.includes('lien')) {
          otherBank.marginMoney += value;
        } else if (value > 0) {
          otherBank.others += value;
        }
      }
    });

    return { cash, otherBank };
  }, [data]);

  const cashTotal = Object.values(cashAndBank.cash).reduce((sum, val) => sum + val, 0);
  const otherBankTotal = Object.values(cashAndBank.otherBank).reduce((sum, val) => sum + val, 0);
  const grandTotal = cashTotal + otherBankTotal;

  if (grandTotal === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded border p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Cash and Bank Balances</h3>
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
            {/* Cash and cash equivalents */}
            {cashTotal !== 0 && (
              <>
                <tr className="bg-blue-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-sm">Cash and cash equivalents</td>
                </tr>

                {cashAndBank.cash.currentAccounts !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">On current accounts</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.cash.currentAccounts)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.cash.savingAccounts !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">On saving accounts</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.cash.savingAccounts)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.cash.cashCredit !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Cash credit account (Debit balance)</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.cash.cashCredit)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.cash.fixedDeposits !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Fixed Deposits</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.cash.fixedDeposits)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.cash.depositsLessThan3Months !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Deposits with original maturity of less than three months</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.cash.depositsLessThan3Months)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.cash.cheques !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Cheques, drafts on hand</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.cash.cheques)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.cash.cashOnHand !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Cash on hand</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.cash.cashOnHand)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                <tr className="bg-gray-100 font-bold border-b">
                  <td className="px-3 py-2 text-sm">Total (I)</td>
                  <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(cashTotal)}</td>
                  <td className="px-3 py-2 text-right text-sm">-</td>
                </tr>
              </>
            )}

            {/* Other bank balances */}
            {otherBankTotal !== 0 && (
              <>
                <tr className="bg-blue-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-sm">Other bank balances</td>
                </tr>

                {cashAndBank.otherBank.bankDeposits !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Bank Deposits</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.otherBank.bankDeposits)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.otherBank.earmarkedDeposits !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Earmarked Bank Deposits</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.otherBank.earmarkedDeposits)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.otherBank.depositsMoreThan3Months !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm">Deposits with original maturity for more than 3 months but less than 12 months from reporting date</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.otherBank.depositsMoreThan3Months)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.otherBank.marginMoney !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm pl-6">Margin money or deposits under lien</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.otherBank.marginMoney)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                {cashAndBank.otherBank.others !== 0 && (
                  <tr className="border-b">
                    <td className="px-3 py-2 text-sm pl-6">Others (specify nature)</td>
                    <td className="px-3 py-2 text-right text-sm">{formatValue(cashAndBank.otherBank.others)}</td>
                    <td className="px-3 py-2 text-right text-sm">-</td>
                  </tr>
                )}

                <tr className="bg-gray-100 font-bold border-b">
                  <td className="px-3 py-2 text-sm">Total other bank balances (II)</td>
                  <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(otherBankTotal)}</td>
                  <td className="px-3 py-2 text-right text-sm">-</td>
                </tr>
              </>
            )}

            {/* Grand Total */}
            <tr className="bg-gray-200 font-bold">
              <td className="px-3 py-2 text-sm">Total Cash and bank balances (I+II)</td>
              <td className="px-3 py-2 text-right text-sm font-bold">{formatValue(grandTotal)}</td>
              <td className="px-3 py-2 text-right text-sm">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
