import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import {
  ReservesAndSurplusNote,
  LongTermBorrowingsNote,
  ShortTermBorrowingsNote,
  TradePayablesNote,
  OtherCurrentLiabilitiesNote,
  ProvisionsNote
} from './index';

interface LiabilityNotesTabProps {
  data: LedgerRow[];
  reportingScale?: string;
  startingNoteNumber?: number;
}

export function LiabilityNotesTab({ 
  data, 
  reportingScale = 'rupees',
  startingNoteNumber = 4 
}: LiabilityNotesTabProps) {
  
  // Calculate note numbers dynamically based on which notes have data
  const noteNumbers = useMemo(() => {
    let currentNote = startingNoteNumber;
    const numbers: Record<string, string> = {};
    
    // Check each note type and assign numbers only if they have data
    const hasReserves = data.some(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return h4.includes('reserve') || h4.includes('surplus') || 
             ledgerName.includes('capital reserve') || ledgerName.includes('securities premium') ||
             ledgerName.includes('revaluation reserve') || ledgerName.includes('surplus');
    });
    if (hasReserves) {
      numbers['reserves'] = String(currentNote++);
    }
    
    const hasLongTermBorrowings = data.some(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return (h4.includes('long') && (h4.includes('borrowing') || h4.includes('loan'))) ||
             (ledgerName.includes('term loan') && !ledgerName.includes('short'));
    });
    if (hasLongTermBorrowings) {
      numbers['longTermBorrowings'] = String(currentNote++);
    }
    
    const hasShortTermBorrowings = data.some(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return (h4.includes('short') && (h4.includes('borrowing') || h4.includes('loan'))) ||
             ledgerName.includes('bank od') || ledgerName.includes('cash credit');
    });
    if (hasShortTermBorrowings) {
      numbers['shortTermBorrowings'] = String(currentNote++);
    }
    
    const hasTradePayables = data.some(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      const primaryGroup = (row['Primary Group'] || '').toLowerCase();
      return h4.includes('trade payable') || 
             ledgerName.includes('sundry creditor') ||
             primaryGroup.includes('sundry creditors');
    });
    if (hasTradePayables) {
      numbers['tradePayables'] = String(currentNote++);
    }
    
    const hasOtherCurrentLiabilities = data.some(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return h4.includes('other current liabilit') ||
             ledgerName.includes('statutory dues') || ledgerName.includes('tds payable') ||
             ledgerName.includes('gst payable');
    });
    if (hasOtherCurrentLiabilities) {
      numbers['otherCurrentLiabilities'] = String(currentNote++);
    }
    
    const hasProvisions = data.some(row => {
      const h4 = (row['H4'] || '').toLowerCase();
      const ledgerName = (row['Ledger Name'] || '').toLowerCase();
      return h4.includes('provision') ||
             ledgerName.includes('provision for');
    });
    if (hasProvisions) {
      numbers['provisions'] = String(currentNote++);
    }
    
    return numbers;
  }, [data, startingNoteNumber]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-muted-foreground">
            Please classify ledgers in the Classified TB to generate liability notes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Card className="p-2">
        <CardHeader className="pb-2 pt-2">
          <CardTitle className="text-lg">Liability Notes</CardTitle>
        </CardHeader>
      </Card>

      {noteNumbers['reserves'] && (
        <ReservesAndSurplusNote 
          data={data} 
          noteNumber={noteNumbers['reserves']}
          reportingScale={reportingScale}
        />
      )}

      {noteNumbers['longTermBorrowings'] && (
        <LongTermBorrowingsNote 
          data={data} 
          noteNumber={noteNumbers['longTermBorrowings']}
          reportingScale={reportingScale}
        />
      )}

      {noteNumbers['shortTermBorrowings'] && (
        <ShortTermBorrowingsNote 
          data={data} 
          noteNumber={noteNumbers['shortTermBorrowings']}
          reportingScale={reportingScale}
        />
      )}

      {noteNumbers['tradePayables'] && (
        <TradePayablesNote 
          data={data} 
          noteNumber={noteNumbers['tradePayables']}
          reportingScale={reportingScale}
        />
      )}

      {noteNumbers['otherCurrentLiabilities'] && (
        <OtherCurrentLiabilitiesNote 
          data={data} 
          noteNumber={noteNumbers['otherCurrentLiabilities']}
          reportingScale={reportingScale}
        />
      )}

      {noteNumbers['provisions'] && (
        <ProvisionsNote 
          data={data} 
          noteNumber={noteNumbers['provisions']}
          reportingScale={reportingScale}
        />
      )}
    </div>
  );
}
