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

    console.log('=== AssetNotesTab Debug ===');
    console.log('Total data rows:', data.length);
    console.log('Stock data length:', stockData.length);
    console.log('Sample rows (first 10):', data.slice(0, 10).map(r => ({ 
      h3: r.H3, 
      h4: r.H4, 
      ledger: r['Ledger Name'] || r.ledgerName,
      closing: r['Closing Balance'] || r.closingBalance,
      opening: r['Opening Balance'] || r.openingBalance
    })));
    
    // Log all unique H3 values
    const uniqueH3 = [...new Set(data.map(r => r.H3).filter(Boolean))];
    const uniqueH4 = [...new Set(data.map(r => r.H4).filter(Boolean))];
    console.log('Unique H3 values:', uniqueH3);
    console.log('Unique H4 values:', uniqueH4);

    // Check each note type for data availability - check both classification AND non-zero values
    const hasInvestments = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const value = Math.abs(Number(row['Closing Balance'] ?? row.closingBalance ?? 0));
      return (h3.includes('non-current investment') || h4.includes('non-current investment')) && value > 0;
    });
    if (hasInvestments) numbers['investments'] = String(currentNote++);

    const hasOtherNonCurrentAssets = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const value = Math.abs(Number(row['Closing Balance'] ?? row.closingBalance ?? 0));
      return (h3.includes('other non-current asset') || h4.includes('other non-current asset')) && value > 0;
    });
    if (hasOtherNonCurrentAssets) numbers['otherNonCurrentAssets'] = String(currentNote++);

    const hasInventories = stockData && stockData.length > 0;
    if (hasInventories) numbers['inventories'] = String(currentNote++);

    const hasReceivables = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const ledgerName = (row['Ledger Name'] || row.ledgerName || '').toLowerCase();
      const value = Math.abs(Number(row['Closing Balance'] ?? row.closingBalance ?? 0));
      return (h3.includes('trade receivable') || h4.includes('trade receivable') || 
             ledgerName.includes('sundry debtor') || ledgerName.includes('trade receivable')) && value > 0;
    });
    if (hasReceivables) numbers['receivables'] = String(currentNote++);

    const hasCashBank = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const value = Math.abs(Number(row['Closing Balance'] ?? row.closingBalance ?? 0));
      return (h3.includes('cash') || h4.includes('cash') || h3.includes('bank') || h4.includes('bank')) && value > 0;
    });
    if (hasCashBank) numbers['cashBank'] = String(currentNote++);

    const hasLoansAdvances = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const value = Math.abs(Number(row['Closing Balance'] ?? row.closingBalance ?? 0));
      return (h3.includes('short term loan') || h3.includes('other current asset') || 
             h4.includes('loan') || h4.includes('advance')) && value > 0;
    });
    if (hasLoansAdvances) numbers['loansAdvances'] = String(currentNote++);

    const hasOtherCurrentAssets = data.some(row => {
      const h3 = row.H3?.toLowerCase() || '';
      const h4 = row.H4?.toLowerCase() || '';
      const value = Math.abs(Number(row['Closing Balance'] ?? row.closingBalance ?? 0));
      return (h3.includes('other current asset') || h4.includes('other current asset')) && value > 0;
    });
    if (hasOtherCurrentAssets) numbers['otherCurrentAssets'] = String(currentNote++);

    return numbers;
  }, [data, stockData, startingNoteNumber]);

  const hasAnyData = Object.keys(noteNumbers).length > 0;

  if (!hasAnyData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">Asset Notes Not Available</h4>
        <p className="text-sm text-yellow-800 mb-3">
          No asset ledgers are properly classified for detailed notes. To display asset notes, please classify your ledgers in the <strong>Classified TB</strong> tab with the following H3 categories:
        </p>
        <ul className="text-xs text-yellow-700 space-y-1 ml-4 list-disc">
          <li><strong>Non-current Investments</strong> - For long-term investments</li>
          <li><strong>Other Non-current Assets</strong> - For other long-term assets</li>
          <li><strong>Inventories</strong> - For stock items (or add stock data)</li>
          <li><strong>Trade Receivables</strong> - For sundry debtors/receivables</li>
          <li><strong>Cash and Cash Equivalents</strong> - For cash and bank balances</li>
          <li><strong>Short-term Loans and Advances</strong> - For current loans/advances</li>
          <li><strong>Other Current Assets</strong> - For other current assets</li>
        </ul>
        <p className="text-xs text-yellow-600 mt-3">
          <strong>Note:</strong> Currently found H3 values: {[...new Set(data.map(r => r.H3).filter(Boolean))].slice(0, 5).join(', ')}
          {[...new Set(data.map(r => r.H3).filter(Boolean))].length > 5 ? '...' : ''}
        </p>
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
        <NonCurrentInvestmentsNote 
          data={data}
          noteNumber={noteNumbers['investments']}
          reportingScale={reportingScale}
        />
      )}

      {/* Other Non-current Assets */}
      {noteNumbers['otherNonCurrentAssets'] && (
        <OtherNonCurrentAssetsNote 
          data={data}
          noteNumber={noteNumbers['otherNonCurrentAssets']}
          reportingScale={reportingScale}
        />
      )}

      {/* Inventories */}
      {noteNumbers['inventories'] && (
        <InventoriesNote 
          stockData={stockData}
          noteNumber={noteNumbers['inventories']}
          reportingScale={reportingScale}
        />
      )}

      {/* Trade Receivables */}
      {noteNumbers['receivables'] && (
        <TradeReceivablesNote 
          data={data}
          noteNumber={noteNumbers['receivables']}
          reportingScale={reportingScale}
        />
      )}

      {/* Cash and Bank Balances */}
      {noteNumbers['cashBank'] && (
        <CashAndBankBalancesNote 
          data={data}
          noteNumber={noteNumbers['cashBank']}
          reportingScale={reportingScale}
        />
      )}

      {/* Short-term Loans and Advances */}
      {noteNumbers['loansAdvances'] && (
        <ShortTermLoansAndAdvancesNote 
          data={data}
          noteNumber={noteNumbers['loansAdvances']}
          reportingScale={reportingScale}
        />
      )}

      {/* Other Current Assets */}
      {noteNumbers['otherCurrentAssets'] && (
        <OtherCurrentAssetsNote 
          data={data}
          noteNumber={noteNumbers['otherCurrentAssets']}
          reportingScale={reportingScale}
        />
      )}
    </div>
  );
}
