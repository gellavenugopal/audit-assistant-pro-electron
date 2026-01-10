import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { NonCurrentInvestmentsNote } from './NonCurrentInvestmentsNote';
import { OtherNonCurrentAssetsNote } from './OtherNonCurrentAssetsNote';
import { InventoriesNote } from './InventoriesNote';
import { TradeReceivablesNote } from './TradeReceivablesNote';
import { CashAndBankBalancesNote } from './CashAndBankBalancesNote';
import { ShortTermLoansAndAdvancesNote } from './ShortTermLoansAndAdvancesNote';
import { OtherCurrentAssetsNote } from './OtherCurrentAssetsNote';
import { useMemo } from 'react';

interface AssetNotesTabProps {
  data: LedgerRow[];
  stockData?: any[];
  reportingScale?: string;
  startingNoteNumber?: number;
}

export function AssetNotesTab({ data, stockData = [], reportingScale = 'rupees', startingNoteNumber = 1 }: AssetNotesTabProps) {
  // Dynamic note numbering - only assign numbers to notes with data
  const noteNumbers = useMemo(() => {
    let currentNote = startingNoteNumber;
    const numbers: Record<string, string> = {};

    // Check each note type for data availability
    const hasInvestments = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      return h3.includes('non-current investment') || h4.includes('non-current investment');
    });
    if (hasInvestments) numbers['investments'] = String(currentNote++);

    const hasOtherNonCurrentAssets = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      return h3.includes('other non-current asset') || h4.includes('other non-current asset');
    });
    if (hasOtherNonCurrentAssets) numbers['otherNonCurrentAssets'] = String(currentNote++);

    const hasInventories = stockData && stockData.length > 0;
    if (hasInventories) numbers['inventories'] = String(currentNote++);

    const hasReceivables = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = row.ledgerName?.toLowerCase() || '';
      return h3.includes('trade receivable') || h4.includes('trade receivable') || 
             ledgerName.includes('sundry debtor') || ledgerName.includes('trade receivable');
    });
    if (hasReceivables) numbers['receivables'] = String(currentNote++);

    const hasCashBank = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      return h3.includes('cash') || h4.includes('cash') || h3.includes('bank') || h4.includes('bank');
    });
    if (hasCashBank) numbers['cashBank'] = String(currentNote++);

    const hasLoansAdvances = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      return h3.includes('short term loan') || h3.includes('other current asset') || 
             h4.includes('loan') || h4.includes('advance');
    });
    if (hasLoansAdvances) numbers['loansAdvances'] = String(currentNote++);

    const hasOtherCurrentAssets = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      return h3.includes('other current asset') || h4.includes('other current asset');
    });
    if (hasOtherCurrentAssets) numbers['otherCurrentAssets'] = String(currentNote++);

    return numbers;
  }, [data, stockData, startingNoteNumber]);

  const hasAnyData = Object.keys(noteNumbers).length > 0;

  if (!hasAnyData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No asset data available. Please classify assets in the Classified TB.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Asset Notes</h3>
        <p className="text-xs text-blue-700">
          Comprehensive asset disclosures including Non-current Investments, Inventories, Trade Receivables, 
          Cash & Bank Balances, Loans & Advances, and Other Assets with detailed categorization and ageing analysis.
        </p>
      </div>

      {/* Non-current Investments */}
      {noteNumbers['investments'] && (
        <div className="bg-white rounded border p-4">
          <NonCurrentInvestmentsNote 
            data={data}
            noteNumber={noteNumbers['investments']}
            reportingScale={reportingScale}
          />
        </div>
      )}

      {/* Other Non-current Assets */}
      {noteNumbers['otherNonCurrentAssets'] && (
        <div className="bg-white rounded border p-4">
          <OtherNonCurrentAssetsNote 
            data={data}
            noteNumber={noteNumbers['otherNonCurrentAssets']}
            reportingScale={reportingScale}
          />
        </div>
      )}

      {/* Inventories */}
      {noteNumbers['inventories'] && (
        <div className="bg-white rounded border p-4">
          <InventoriesNote 
            stockData={stockData}
            noteNumber={noteNumbers['inventories']}
            reportingScale={reportingScale}
          />
        </div>
      )}

      {/* Trade Receivables */}
      {noteNumbers['receivables'] && (
        <div className="bg-white rounded border p-4">
          <TradeReceivablesNote 
            data={data}
            noteNumber={noteNumbers['receivables']}
            reportingScale={reportingScale}
          />
        </div>
      )}

      {/* Cash and Bank Balances */}
      {noteNumbers['cashBank'] && (
        <div className="bg-white rounded border p-4">
          <CashAndBankBalancesNote 
            data={data}
            noteNumber={noteNumbers['cashBank']}
            reportingScale={reportingScale}
          />
        </div>
      )}

      {/* Short-term Loans and Advances */}
      {noteNumbers['loansAdvances'] && (
        <div className="bg-white rounded border p-4">
          <ShortTermLoansAndAdvancesNote 
            data={data}
            noteNumber={noteNumbers['loansAdvances']}
            reportingScale={reportingScale}
          />
        </div>
      )}

      {/* Other Current Assets */}
      {noteNumbers['otherCurrentAssets'] && (
        <div className="bg-white rounded border p-4">
          <OtherCurrentAssetsNote 
            data={data}
            noteNumber={noteNumbers['otherCurrentAssets']}
            reportingScale={reportingScale}
          />
        </div>
      )}
    </div>
  );
}
