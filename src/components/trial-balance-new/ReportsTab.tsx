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
import { ScheduleIIIBalanceSheet } from '@/components/trial-balance-new/reports/ScheduleIIIBalanceSheet';
import { ScheduleIIIProfitLoss } from '@/components/trial-balance-new/reports/ScheduleIIIProfitLoss';
import { CashFlowStatement } from '@/components/trial-balance-new/reports/CashFlowStatement';
import { ChangesInInventoriesNote } from '@/components/trial-balance-new/reports/pl-notes/ChangesInInventoriesNote';
import { CostOfMaterialsConsumedNote } from '@/components/trial-balance-new/reports/pl-notes/CostOfMaterialsConsumedNote';
import { NotesManagementTab } from '@/components/trial-balance-new/reports/capital-notes/NotesManagementTab';
import { 
  RevenueFromOperationsNote,
  OtherIncomeNote,
  EmployeeBenefitsNote,
  FinanceCostNote,
  DepreciationNote,
  OtherExpensesNote 
} from '@/components/trial-balance-new/reports/pl-notes';
import { FormatSelector } from '@/components/trial-balance-new/FormatSelector';
import { NoteNumberSettings } from '@/components/trial-balance-new/NoteNumberSettings';
import { EnhancedNoteNumberSettings } from '@/components/trial-balance-new/EnhancedNoteNumberSettings';
import { NoteNumberSummary } from '@/components/trial-balance-new/NoteNumberSummary';
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
  const [bsNoteCount, setBsNoteCount] = useState<number>(15);
  const [plNoteCount, setPlNoteCount] = useState<number>(7);
  const [includeContingentLiabilities, setIncludeContingentLiabilities] = useState<boolean>(false);
  const [contingentLiabilityNoteNo, setContingentLiabilityNoteNo] = useState<number>(27);

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

  // Handle note number configuration
  const handleApplyNoteSettings = (
    startingNote: number,
    bsCount: number,
    plCount: number,
    includeContingent: boolean
  ) => {
    setBsStartingNote(startingNote);
    setBsNoteCount(bsCount);
    setPlStartingNote(startingNote + bsCount);
    setPlNoteCount(plCount);
    setIncludeContingentLiabilities(includeContingent);
    setContingentLiabilityNoteNo(startingNote + bsCount + plCount);

    toast({
      title: 'Note Numbers Configured',
      description: `BS Notes: ${startingNote}-${startingNote + bsCount - 1}, P&L Notes: ${startingNote + bsCount}-${
        startingNote + bsCount + plCount - 1
      }${includeContingent ? `, Contingent Liabilities: ${startingNote + bsCount + plCount}` : ''}`,
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No data available. Please import data first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Report Sub-Tabs and Controls - Compact Segmented Control */}
      <Tabs value={reportTab} onValueChange={setReportTab} className="w-full">
        <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded border" style={{ minHeight: '36px' }}>
          <TabsList className="h-7 bg-gray-100/80 p-0.5 rounded">
            <TabsTrigger 
              value="balance-sheet" 
              className="h-6 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600"
            >
              <BarChart3 className="w-3 h-3 mr-1.5" />
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger 
              value="profit-loss" 
              className="h-6 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600"
            >
              <TrendingUp className="w-3 h-3 mr-1.5" />
              Profit & Loss
            </TabsTrigger>
            <TabsTrigger 
              value="cash-flow" 
              className="h-6 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600"
            >
              <TrendingUp className="w-3 h-3 mr-1.5" />
              Cash Flow
            </TabsTrigger>
            <TabsTrigger 
              value="bs-notes" 
              className="h-6 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600"
            >
              <Building2 className="w-3 h-3 mr-1.5" />
              BS Notes
            </TabsTrigger>
            <TabsTrigger 
              value="pl-notes" 
              className="h-6 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600"
            >
              <FileText className="w-3 h-3 mr-1.5" />
              PL Notes
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={reportingScale} onValueChange={setReportingScale}>
              <SelectTrigger className="h-6 w-[90px] text-xs">
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
                <Button variant="default" size="sm" className="h-6 px-2 text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                  <ChevronDown className="w-2.5 h-2.5 ml-1" />
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

        <TabsContent value="balance-sheet" className="mt-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">Balance Sheet</h2>
                {bsStartingNote !== 3 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    Note starts: {bsStartingNote}
                  </Badge>
                )}
              </div>
              <EnhancedNoteNumberSettings
                onApplySettings={handleApplyNoteSettings}
                bsStartingNote={bsStartingNote}
                plStartingNote={plStartingNote}
                includeContingentLiabilities={includeContingentLiabilities}
              />
            </div>
            <NoteNumberSummary
              bsStartingNote={bsStartingNote}
              bsNoteCount={bsNoteCount}
              plStartingNote={plStartingNote}
              plNoteCount={plNoteCount}
              includeContingentLiabilities={includeContingentLiabilities}
              contingentLiabilityNoteNo={contingentLiabilityNoteNo}
            />
            <div className="bg-white rounded border overflow-hidden">
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

        <TabsContent value="profit-loss" className="mt-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">Profit & Loss Account</h2>
                {plStartingNote !== 19 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    Note starts: {plStartingNote}
                  </Badge>
                )}
              </div>
              <EnhancedNoteNumberSettings
                onApplySettings={handleApplyNoteSettings}
                bsStartingNote={bsStartingNote}
                plStartingNote={plStartingNote}
                includeContingentLiabilities={includeContingentLiabilities}
              />
            </div>
            <NoteNumberSummary
              bsStartingNote={bsStartingNote}
              bsNoteCount={bsNoteCount}
              plStartingNote={plStartingNote}
              plNoteCount={plNoteCount}
              includeContingentLiabilities={includeContingentLiabilities}
              contingentLiabilityNoteNo={contingentLiabilityNoteNo}
            />
            
            {/* Profit & Loss Statement */}
            <div className="bg-white rounded border overflow-hidden">
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

        <TabsContent value="cash-flow" className="mt-2">
          <div className="bg-white rounded border overflow-hidden">
            <CashFlowStatement lines={trialBalanceLines} reportingScale={reportingScale} />
          </div>
        </TabsContent>

        <TabsContent value="bs-notes" className="mt-2">
          <div className="space-y-2">
            {/* Other Balance Sheet Notes Management */}
            <div className="bg-white rounded border p-3">
              <NotesManagementTab 
                lines={trialBalanceLines}
                constitution={constitution}
                financialYear={financialYear}
                clientName={companyName}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pl-notes" className="mt-2">
          <div className="space-y-3">
            {/* Debug info */}
            {(!plNoteLedgers || Object.keys(plNoteLedgers).length === 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                <strong>Note:</strong> No ledger data classified for P&L notes. Please ensure ledgers are properly classified with H2 classifications like "Revenue from Operations", "Other Income", "Employee benefits expense", etc.
              </div>
            )}

            {/* Revenue from Operations - Note 1 of P&L */}
            <div className="bg-white rounded border p-3">
              <RevenueFromOperationsNote
                noteNumber={String(plStartingNote)}
                ledgers={plNoteLedgers?.revenueFromOperations || []}
                reportingScale={reportingScale}
              />
              {(!plNoteLedgers?.revenueFromOperations || plNoteLedgers.revenueFromOperations.length === 0) && (
                <p className="text-xs text-gray-500 mt-2">No ledgers classified under "Revenue from Operations". Please classify ledgers in the Classified TB.</p>
              )}
            </div>

            {/* Other Income - Note 2 of P&L */}
            <div className="bg-white rounded border p-3">
              <OtherIncomeNote
                noteNumber={String(plStartingNote + 1)}
                ledgers={plNoteLedgers?.otherIncome || []}
                reportingScale={reportingScale}
              />
              {(!plNoteLedgers?.otherIncome || plNoteLedgers.otherIncome.length === 0) && (
                <p className="text-xs text-gray-500 mt-2">No ledgers classified under "Other Income". Please classify ledgers in the Classified TB.</p>
              )}
            </div>

            {/* Changes in Inventories Note - Note 3 of P&L */}
            {stockData && Array.isArray(stockData) && stockData.length > 0 && (
              <div className="bg-white rounded border p-3">
                <ChangesInInventoriesNote
                  stockData={stockData}
                  reportingScale={reportingScale}
                  noteNumber={String(plStartingNote + 2)}
                />
              </div>
            )}
            
            {/* Cost of Materials Consumed Note - Note 4 of P&L */}
            {stockData && Array.isArray(stockData) && stockData.length > 0 && data && Array.isArray(data) && (
              <div className="bg-white rounded border p-3">
                <CostOfMaterialsConsumedNote
                  stockData={stockData}
                  ledgerData={data}
                  reportingScale={reportingScale}
                  noteNumber={String(plStartingNote + 3)}
                />
              </div>
            )}

            {/* Employee Benefits Expense - Note 5 of P&L */}
            <div className="bg-white rounded border p-3">
              <EmployeeBenefitsNote
                noteNumber={String(plStartingNote + 4)}
                ledgers={plNoteLedgers?.employeeBenefits || []}
                reportingScale={reportingScale}
              />
              {(!plNoteLedgers?.employeeBenefits || plNoteLedgers.employeeBenefits.length === 0) && (
                <p className="text-xs text-gray-500 mt-2">No ledgers classified under "Employee benefits expense". Please classify ledgers in the Classified TB.</p>
              )}
            </div>

            {/* Finance Cost - Note 6 of P&L */}
            <div className="bg-white rounded border p-3">
              <FinanceCostNote
                noteNumber={String(plStartingNote + 5)}
                ledgers={plNoteLedgers?.financeCosts || []}
                reportingScale={reportingScale}
              />
              {(!plNoteLedgers?.financeCosts || plNoteLedgers.financeCosts.length === 0) && (
                <p className="text-xs text-gray-500 mt-2">No ledgers classified under "Finance costs". Please classify ledgers in the Classified TB.</p>
              )}
            </div>

            {/* Depreciation and Amortization - Note 7 of P&L */}
            <div className="bg-white rounded border p-3">
              <DepreciationNote
                noteNumber={String(plStartingNote + 6)}
                ledgers={plNoteLedgers?.depreciation || []}
                reportingScale={reportingScale}
                fixedAssetsNoteNumber={String(bsStartingNote + 6)}
              />
              {(!plNoteLedgers?.depreciation || plNoteLedgers.depreciation.length === 0) && (
                <p className="text-xs text-gray-500 mt-2">No ledgers classified under "Depreciation and amortization expense". Please classify ledgers in the Classified TB.</p>
              )}
            </div>

            {/* Other Expenses - Note 8 of P&L */}
            <div className="bg-white rounded border p-3">
              <OtherExpensesNote
                noteNumber={String(plStartingNote + 7)}
                ledgers={plNoteLedgers?.otherExpenses || []}
                reportingScale={reportingScale}
              />
              {(!plNoteLedgers?.otherExpenses || plNoteLedgers.otherExpenses.length === 0) && (
                <p className="text-xs text-gray-500 mt-2">No ledgers classified under "Other expenses". Please classify ledgers in the Classified TB.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

