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

  // Download Balance Sheet
  const handleDownloadBS = useCallback(() => {
    try {
      // Group data by H2 and H3 for proper note structure
      const bsData = data.filter(row => row.H1 === 'Balance Sheet' || row.H1 === 'BS');
      
      // Create main Balance Sheet sheet with note references
      const bsSummary: any[] = [];
      const noteCounter: { [key: string]: number } = {};
      let currentNote = bsStartingNote;
      
      // Group by H2 (main sections)
      const h2Groups = bsData.reduce((acc: any, row) => {
        const h2 = row.H2 || 'Unmapped';
        if (!acc[h2]) acc[h2] = [];
        acc[h2].push(row);
        return acc;
      }, {});
      
      // Create summary with note references
      Object.entries(h2Groups).forEach(([h2, rows]: [string, any]) => {
        const total = rows.reduce((sum: number, r: any) => sum + (r['Closing Balance'] || 0), 0);
        
        // Assign note number if has H3 (notes)
        const hasNotes = rows.some((r: any) => r.H3 && r.H3.trim());
        const noteNum = hasNotes ? currentNote++ : '';
        if (hasNotes) noteCounter[h2] = noteNum;
        
        bsSummary.push({
          'Particulars': h2,
          'Note No.': noteNum ? `Note ${noteNum}` : '',
          'Current Year (₹)': total,
          'Previous Year (₹)': 0  // Add previous year column
        });
      });
      
      const workbook = XLSX.utils.book_new();
      
      // Main Balance Sheet sheet
      const bsSheet = XLSX.utils.json_to_sheet(bsSummary);
      bsSheet['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, bsSheet, 'Balance Sheet');
      
      // Create detailed notes sheets
      Object.entries(h2Groups).forEach(([h2, rows]: [string, any]) => {
        const noteNum = noteCounter[h2];
        if (!noteNum) return;  // Skip if no note number assigned
        
        // Group by H3 within this H2
        const h3Groups = rows.reduce((acc: any, row: any) => {
          const h3 = row.H3 || 'Others';
          if (!acc[h3]) acc[h3] = [];
          acc[h3].push(row);
          return acc;
        }, {});
        
        const noteData: any[] = [];
        Object.entries(h3Groups).forEach(([h3, items]: [string, any]) => {
          items.forEach((item: any) => {
            noteData.push({
              'Particulars': item['Ledger Name'] || '',
              'H3': h3,
              'H4': item.H4 || '',
              'H5': item.H5 || '',
              'Current Year (₹)': item['Closing Balance'] || 0,
              'Previous Year (₹)': 0
            });
          });
        });
        
        if (noteData.length > 0) {
          const noteSheet = XLSX.utils.json_to_sheet(noteData);
          noteSheet['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
          XLSX.utils.book_append_sheet(workbook, noteSheet, `Note ${noteNum} - ${h2}`.substring(0, 31));
        }
      });
      
      XLSX.writeFile(workbook, `Balance_Sheet_with_Notes_${companyName}_${financialYear}.xlsx`);
      
      toast({
        title: 'Downloaded',
        description: 'Balance Sheet with Notes exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export Balance Sheet',
        variant: 'destructive'
      });
    }
  }, [data, companyName, financialYear, bsStartingNote, toast]);

  // Download P&L
  const handleDownloadPL = useCallback(() => {
    try {
      // Group data by H2 and H3 for proper note structure
      const plData = data.filter(row => row.H1 === 'Profit & Loss' || row.H1 === 'P&L' || row.H1 === 'PL');
      
      // Create main P&L sheet with note references
      const plSummary: any[] = [];
      const noteCounter: { [key: string]: number } = {};
      let currentNote = plStartingNote;
      
      // Group by H2 (main sections like Revenue, Expenses)
      const h2Groups = plData.reduce((acc: any, row) => {
        const h2 = row.H2 || 'Unmapped';
        if (!acc[h2]) acc[h2] = [];
        acc[h2].push(row);
        return acc;
      }, {});
      
      // Create summary with note references
      Object.entries(h2Groups).forEach(([h2, rows]: [string, any]) => {
        const total = rows.reduce((sum: number, r: any) => sum + Math.abs(r['Closing Balance'] || 0), 0);
        
        // Assign note number if has H3 (notes)
        const hasNotes = rows.some((r: any) => r.H3 && r.H3.trim());
        const noteNum = hasNotes ? currentNote++ : '';
        if (hasNotes) noteCounter[h2] = noteNum;
        
        plSummary.push({
          'Particulars': h2,
          'Note No.': noteNum ? `Note ${noteNum}` : '',
          'Current Year (₹)': total,
          'Previous Year (₹)': 0
        });
      });
      
      const workbook = XLSX.utils.book_new();
      
      // Main P&L sheet
      const plSheet = XLSX.utils.json_to_sheet(plSummary);
      plSheet['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, plSheet, 'Profit & Loss');
      
      // Create detailed notes sheets
      Object.entries(h2Groups).forEach(([h2, rows]: [string, any]) => {
        const noteNum = noteCounter[h2];
        if (!noteNum) return;
        
        // Group by H3 within this H2
        const h3Groups = rows.reduce((acc: any, row: any) => {
          const h3 = row.H3 || 'Others';
          if (!acc[h3]) acc[h3] = [];
          acc[h3].push(row);
          return acc;
        }, {});
        
        const noteData: any[] = [];
        Object.entries(h3Groups).forEach(([h3, items]: [string, any]) => {
          items.forEach((item: any) => {
            noteData.push({
              'Particulars': item['Ledger Name'] || '',
              'H3': h3,
              'H4': item.H4 || '',
              'H5': item.H5 || '',
              'Current Year (₹)': Math.abs(item['Closing Balance'] || 0),
              'Previous Year (₹)': 0
            });
          });
        });
        
        if (noteData.length > 0) {
          const noteSheet = XLSX.utils.json_to_sheet(noteData);
          noteSheet['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
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
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleDownloadBS} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Balance Sheet
              </Button>
            </div>
            <ScheduleIIIBalanceSheet 
              currentLines={trialBalanceLines} 
              previousLines={[]}
              reportingScale={reportingScale}
              constitution={constitution}
              startingNoteNumber={bsStartingNote}
            />
          </div>
        </TabsContent>

        <TabsContent value="profit-loss" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleDownloadPL} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Profit & Loss
              </Button>
            </div>
            <ScheduleIIIProfitLoss 
              currentLines={trialBalanceLines} 
              previousLines={[]}
              reportingScale={reportingScale}
              constitution={constitution}
              startingNoteNumber={plStartingNote}
            />
          </div>
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

