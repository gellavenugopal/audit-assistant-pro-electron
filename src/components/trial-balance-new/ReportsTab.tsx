import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';
import { convertLedgerRowsToTrialBalanceLines } from '@/utils/trialBalanceNewAdapter';
import { ScheduleIIIBalanceSheet } from '@/components/trial-balance/ScheduleIIIBalanceSheet';
import { ScheduleIIIProfitLoss } from '@/components/trial-balance/ScheduleIIIProfitLoss';
import { CashFlowStatement } from '@/components/trial-balance/CashFlowStatement';
import { NotesManagementTab } from '@/components/trial-balance/capital-notes/NotesManagementTab';
import { FormatSelector } from '@/components/trial-balance/FormatSelector';
import { NoteNumberSettings } from '@/components/trial-balance/NoteNumberSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/contexts/EngagementContext';
import { FileText, BarChart3, TrendingUp, Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReportsTabProps {
  data: LedgerRow[];
  stockData: any[];
  companyName: string;
  toDate: string;
  entityType: string;
}

export function ReportsTab({ data, stockData, companyName, toDate, entityType }: ReportsTabProps) {
  const { user } = useAuth();
  const { currentEngagement } = useEngagement();
  const [reportTab, setReportTab] = useState('balance-sheet');
  const [reportingScale, setReportingScale] = useState<string>('auto');
  const [bsStartingNote, setBsStartingNote] = useState<number>(3);
  const [plStartingNote, setPlStartingNote] = useState<number>(19);

  // Determine constitution from entity type
  const constitution = useMemo(() => {
    const et = entityType.toLowerCase();
    if (et.includes('company')) return 'company';
    if (et.includes('llp') || et.includes('limited liability')) return 'llp';
    if (et.includes('partnership')) return 'partnership';
    if (et.includes('proprietorship') || et.includes('sole')) return 'proprietorship';
    if (et.includes('trust')) return 'trust';
    if (et.includes('society')) return 'society';
    return 'company'; // default
  }, [entityType]);

  // Convert LedgerRow[] to TrialBalanceLine[]
  const trialBalanceLines = useMemo(() => {
    try {
      if (!data.length) return [];
      // Use a temporary engagement ID if none exists
      const engagementId = currentEngagement?.id || 'temp-engagement';
      const userId = user?.id || 'temp-user';
      return convertLedgerRowsToTrialBalanceLines(
        data,
        engagementId,
        userId,
        'current',
        toDate,
        stockData
      );
    } catch (error) {
      console.error('Error converting ledger rows:', error);
      return [];
    }
  }, [data, currentEngagement?.id, user?.id, toDate, stockData]);

  // Parse financial year from toDate
  const financialYear = useMemo(() => {
    if (!toDate) return '';
    const date = new Date(toDate);
    const year = date.getFullYear();
    const prevYear = year - 1;
    return `${prevYear}-${year.toString().slice(-2)}`;
  }, [toDate]);

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No data available. Please import data first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Format Selector and Note Settings */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <FormatSelector constitution={constitution} showDownload={true} />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Scale:</span>
          <Select value={reportingScale} onValueChange={setReportingScale}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="rupees">Rupees</SelectItem>
              <SelectItem value="thousands">Thousands</SelectItem>
              <SelectItem value="lakhs">Lakhs</SelectItem>
              <SelectItem value="crores">Crores</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {reportTab === 'balance-sheet' && (
          <NoteNumberSettings 
            startingNoteNumber={bsStartingNote} 
            onStartingNoteNumberChange={setBsStartingNote} 
          />
        )}
        {reportTab === 'profit-loss' && (
          <NoteNumberSettings 
            startingNoteNumber={plStartingNote} 
            onStartingNoteNumberChange={setPlStartingNote} 
          />
        )}
      </div>

      {/* Report Sub-Tabs */}
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList>
          <TabsTrigger value="balance-sheet">
            <BarChart3 className="w-4 h-4 mr-2" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="profit-loss">
            <TrendingUp className="w-4 h-4 mr-2" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="cash-flow">
            <TrendingUp className="w-4 h-4 mr-2" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="capital-notes">
            <Building2 className="w-4 h-4 mr-2" />
            Capital Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance-sheet" className="mt-4">
          <ScheduleIIIBalanceSheet 
            currentLines={trialBalanceLines} 
            previousLines={[]}
            reportingScale={reportingScale}
            constitution={constitution}
            startingNoteNumber={bsStartingNote}
          />
        </TabsContent>

        <TabsContent value="profit-loss" className="mt-4">
          <ScheduleIIIProfitLoss 
            currentLines={trialBalanceLines} 
            previousLines={[]}
            reportingScale={reportingScale}
            constitution={constitution}
            startingNoteNumber={plStartingNote}
          />
        </TabsContent>

        <TabsContent value="cash-flow" className="mt-4">
          <CashFlowStatement lines={trialBalanceLines} reportingScale={reportingScale} />
        </TabsContent>

        <TabsContent value="capital-notes" className="mt-4">
          <NotesManagementTab 
            lines={trialBalanceLines}
            constitution={constitution}
            financialYear={financialYear}
            clientName={companyName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

