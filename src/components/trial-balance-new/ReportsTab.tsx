import { useState, useMemo, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { FileText, BarChart3, TrendingUp, Building2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  exportBalanceSheetWithNotes,
  exportProfitLossWithNotes,
  downloadWorkbook,
  ExportOptions
} from '@/utils/enhancedExcelExport';
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
  const { toast } = useToast();
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

  // Download Balance Sheet (using enhanced export)
  const handleDownloadBS = useCallback(() => {
    try {
      const exportOptions: ExportOptions = {
        companyName,
        financialYear,
        constitution,
        bsStartingNote,
        includeMetadata: true, // Include technical codes and metadata
        includePreviousYear: false, // TODO: Add previous year support
        previousYearData: []
      };
      
      const workbook = exportBalanceSheetWithNotes(data, exportOptions);
      downloadWorkbook(workbook, `Balance_Sheet_with_Notes_${companyName}_${financialYear}.xlsx`);
      
      toast({
        title: 'Downloaded',
        description: 'Balance Sheet with Notes exported successfully with technical codes'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export Balance Sheet',
        variant: 'destructive'
      });
    }
  }, [data, companyName, financialYear, constitution, bsStartingNote, toast]);

  // Download P&L (using enhanced export)
  const handleDownloadPL = useCallback(() => {
    try {
      const exportOptions: ExportOptions = {
        companyName,
        financialYear,
        constitution,
        plStartingNote,
        includeMetadata: true, // Include technical codes and metadata
        includePreviousYear: false, // TODO: Add previous year support
        previousYearData: []
      };
      
      const workbook = exportProfitLossWithNotes(data, exportOptions);
      downloadWorkbook(workbook, `Profit_Loss_with_Notes_${companyName}_${financialYear}.xlsx`);
      
      toast({
        title: 'Downloaded',
        description: 'P&L with Notes exported successfully with technical codes'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export P&L',
        variant: 'destructive'
      });
    }
  }, [data, companyName, financialYear, constitution, plStartingNote, toast]);
          XLSX.utils.book_append_sheet(workbook, noteSheet, `Note ${noteNum} - ${h2}`.substring(0, 31));
        }
      });
      
      XLSX.writeFile(workbook, `Profit_Loss_with_Notes_${companyName}_${financialYear}.xlsx`);
      
      toast({
        title: 'Downloaded',
        description: 'Profit & Loss with Notes exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export Profit & Loss',
        variant: 'destructive'
      });
    }
  }, [data, companyName, financialYear, plStartingNote, toast]);

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No data available. Please import data first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Company</p>
            <p className="font-semibold text-gray-900">{companyName || 'Not Set'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Financial Year</p>
            <p className="font-semibold text-gray-900">{financialYear || 'Not Set'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Entity Type</p>
            <p className="font-semibold text-gray-900">{entityType || 'Not Set'}</p>
          </div>
        </div>
      </div>
      
      {/* Format Selector and Note Settings */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-lg border">
        <FormatSelector constitution={constitution} showDownload={true} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Scale:</span>
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
      <Tabs value={reportTab} onValueChange={setReportTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Balance Sheet</span>
            <span className="sm:hidden">BS</span>
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Profit & Loss</span>
            <span className="sm:hidden">P&L</span>
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Cash Flow</span>
            <span className="sm:hidden">CF</span>
          </TabsTrigger>
          <TabsTrigger value="capital-notes" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Capital Notes</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance-sheet" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
              <Button onClick={handleDownloadBS} variant="default" size="sm" className="shadow-sm">
                <Download className="w-4 h-4 mr-2" />
                Download BS with Notes
              </Button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <ScheduleIIIBalanceSheet 
                currentLines={trialBalanceLines} 
                previousLines={[]}
                reportingScale={reportingScale}
                constitution={constitution}
                startingNoteNumber={bsStartingNote}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profit-loss" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Profit & Loss Account</h2>
              <Button onClick={handleDownloadPL} variant="default" size="sm" className="shadow-sm">
                <Download className="w-4 h-4 mr-2" />
                Download P&L with Notes
              </Button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <ScheduleIIIProfitLoss 
                currentLines={trialBalanceLines} 
                previousLines={[]}
                reportingScale={reportingScale}
                constitution={constitution}
                startingNoteNumber={plStartingNote}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cash-flow" className="mt-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <CashFlowStatement lines={trialBalanceLines} reportingScale={reportingScale} />
          </div>
        </TabsContent>

        <TabsContent value="capital-notes" className="mt-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <NotesManagementTab 
              lines={trialBalanceLines}
              constitution={constitution}
              financialYear={financialYear}
              clientName={companyName}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

