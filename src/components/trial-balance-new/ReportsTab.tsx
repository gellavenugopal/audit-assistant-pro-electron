import { useState, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';
import { convertLedgerRowsToTrialBalanceLines } from '@/utils/trialBalanceNewAdapter';
import { computePLNoteValues } from '@/utils/computePLNoteValues';
import { computeBSNoteValues } from '@/utils/computeBSNoteValues';
import { ScheduleIIIBalanceSheet } from '@/components/trial-balance/ScheduleIIIBalanceSheet';
import { ScheduleIIIProfitLoss } from '@/components/trial-balance/ScheduleIIIProfitLoss';
import { CashFlowStatement } from '@/components/trial-balance/CashFlowStatement';
import { ChangesInInventoriesNote } from '@/components/trial-balance/ChangesInInventoriesNote';
import { CostOfMaterialsConsumedNote } from '@/components/trial-balance/CostOfMaterialsConsumedNote';
import { NotesManagementTab } from '@/components/trial-balance/capital-notes/NotesManagementTab';
import { FormatSelector } from '@/components/trial-balance/FormatSelector';
import { NoteNumberSettings } from '@/components/trial-balance/NoteNumberSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/contexts/EngagementContext';
import { useToast } from '@/hooks/use-toast';
import { FileText, BarChart3, TrendingUp, Building2, Download, ChevronDown } from 'lucide-react';
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
  signingDetails?: {
    date: string;
    place: string;
    partnerName: string;
    firmName: string;
  };
}

export function ReportsTab({ data, stockData, companyName, toDate, entityType, signingDetails }: ReportsTabProps) {
  const { user } = useAuth();
  const { currentEngagement } = useEngagement();
  const { toast } = useToast();
  const [reportTab, setReportTab] = useState('balance-sheet');
  const [reportingScale, setReportingScale] = useState<string>('rupees');
  const [bsStartingNote, setBsStartingNote] = useState<number>(3);
  const [plStartingNote, setPlStartingNote] = useState<number>(19);

  // Determine constitution from entity type
  const constitution = useMemo(() => {
    if (!entityType) return 'company';
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
      if (!data || !Array.isArray(data) || data.length === 0) return [];
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

  // Compute P&L note values and ledger annexures
  const { noteValues: plNoteValues, noteLedgers: plNoteLedgers } = useMemo(() => {
    return computePLNoteValues(data, stockData);
  }, [data, stockData]);

  // Compute Balance Sheet note values and ledger annexures
  const { noteValues: bsNoteValues, noteLedgers: bsNoteLedgers } = useMemo(() => {
    return computeBSNoteValues(data);
  }, [data]);

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

  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No data available. Please import data first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Report Sub-Tabs and Controls in Single Row */}
      <Tabs value={reportTab} onValueChange={setReportTab} className="w-full">
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border shadow-sm">
          <TabsList className="h-9 bg-gray-100">
            <TabsTrigger value="balance-sheet" className="flex items-center gap-2 data-[state=active]:bg-white">
              <BarChart3 className="w-4 h-4" />
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger value="profit-loss" className="flex items-center gap-2 data-[state=active]:bg-white">
              <TrendingUp className="w-4 h-4" />
              Profit & Loss
            </TabsTrigger>
            <TabsTrigger value="cash-flow" className="flex items-center gap-2 data-[state=active]:bg-white">
              <TrendingUp className="w-4 h-4" />
              Cash Flow
            </TabsTrigger>
            <TabsTrigger value="capital-notes" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Building2 className="w-4 h-4" />
              Capital Notes
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <Select value={reportingScale} onValueChange={setReportingScale}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
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
            
            {/* Download Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="h-8">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadBS}>
                  <FileText className="w-4 h-4 mr-2" />
                  Balance Sheet with Notes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPL}>
                  <FileText className="w-4 h-4 mr-2" />
                  P&L with Notes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Complete Financial Package
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="balance-sheet" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Balance Sheet</h2>
              {bsStartingNote !== 3 && (
                <Badge variant="secondary" className="text-xs">
                  Note starts: {bsStartingNote}
                </Badge>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <ScheduleIIIBalanceSheet 
                currentLines={trialBalanceLines} 
                previousLines={[]}
                reportingScale={reportingScale}
                constitution={constitution}
                startingNoteNumber={bsStartingNote}
                noteValues={bsNoteValues}
                noteLedgers={bsNoteLedgers}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profit-loss" className="mt-4">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Profit & Loss Account</h2>
              {plStartingNote !== 19 && (
                <Badge variant="secondary" className="text-xs">
                  Note starts: {plStartingNote}
                </Badge>
              )}
            </div>
            
            {/* Profit & Loss Statement */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <ScheduleIIIProfitLoss 
                currentLines={trialBalanceLines} 
                previousLines={[]}
                reportingScale={reportingScale}
                constitution={constitution}
                startingNoteNumber={plStartingNote}
                stockData={stockData}
                ledgerData={data}
                noteValues={plNoteValues}
                noteLedgers={plNoteLedgers}
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
          <div className="space-y-6">
            {/* Changes in Inventories Note - For P&L */}
            {stockData && Array.isArray(stockData) && stockData.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <ChangesInInventoriesNote
                  stockData={stockData}
                  reportingScale={reportingScale}
                  noteNumber={String(plStartingNote + 2)}
                />
              </div>
            )}
            
            {/* Cost of Materials Consumed Note */}
            {stockData && Array.isArray(stockData) && stockData.length > 0 && data && Array.isArray(data) && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <CostOfMaterialsConsumedNote
                  stockData={stockData}
                  ledgerData={data}
                  reportingScale={reportingScale}
                  noteNumber={String(plStartingNote + 3)}
                />
              </div>
            )}
            
            {/* Other Notes Management */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <NotesManagementTab 
                lines={trialBalanceLines}
                constitution={constitution}
                financialYear={financialYear}
                clientName={companyName}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

