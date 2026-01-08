import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Search, Plus, Pencil, Trash2, FileText, BarChart3, Banknote, AlertTriangle, Copy, Scale, Wand2, Tags, XCircle, FileDown, BookOpen } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useEngagement } from '@/contexts/EngagementContext';
import { useTrialBalance, TrialBalanceLine, TrialBalanceLineInput } from '@/hooks/useTrialBalance';
import { TrialBalanceLineDialog } from '@/components/trial-balance/TrialBalanceLineDialog';
import { TrialBalanceImportDialog, downloadBlankTBTemplate } from '@/components/trial-balance/TrialBalanceImportDialog';
import { BulkUpdateDialog } from '@/components/trial-balance/BulkUpdateDialog';
import { ScheduleIIIBalanceSheet } from '@/components/trial-balance/ScheduleIIIBalanceSheet';
import { ScheduleIIIProfitLoss } from '@/components/trial-balance/ScheduleIIIProfitLoss';
import { CashFlowStatement } from '@/components/trial-balance/CashFlowStatement';

import { ScheduleIIIRuleEngine } from '@/components/trial-balance/ScheduleIIIRuleEngine';
import { UncategorizedItemsPanel } from '@/components/trial-balance/UncategorizedItemsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTabShortcuts } from '@/hooks/useKeyboardShortcuts';
import { 
  exportBalanceSheet, 
  exportProfitLoss, 
  exportCashFlowStatement 
} from '@/utils/financialExport';
import { NoteNumberSettings } from '@/components/trial-balance/NoteNumberSettings';
import { EnhancedNoteNumberSettings } from '@/components/trial-balance/EnhancedNoteNumberSettings';
import { NoteNumberSummary } from '@/components/trial-balance/NoteNumberSummary';
import { FormatSelector } from '@/components/trial-balance/FormatSelector';
import { useClients } from '@/hooks/useClients';
import { getBalanceReclassifiedLines, getReclassificationSummary } from '@/utils/balanceReclassification';
import { NotesManagementTab } from '@/components/trial-balance/capital-notes/NotesManagementTab';
import { QuickAssignmentDialog } from '@/components/trial-balance/QuickAssignmentDialog';

const TRIAL_BALANCE_TABS = ['trial-balance', 'rule-engine', 'uncategorized', 'capital-notes', 'balance-sheet', 'profit-loss', 'cash-flow'];

export default function TrialBalance() {
  const { currentEngagement } = useEngagement();
  const { lines, loading, currentVersion, addLine, updateLine, deleteLine, deleteLines, updateLines, importLines } = useTrialBalance(currentEngagement?.id);
  const { clients } = useClients();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('trial-balance');
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<TrialBalanceLine | null>(null);
  const [deleteConfirmLine, setDeleteConfirmLine] = useState<TrialBalanceLine | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [showDeleteFilteredConfirm, setShowDeleteFilteredConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [reportingScale, setReportingScale] = useState<string>('auto');
  const [bsStartingNote, setBsStartingNote] = useState<number>(3);
  const [plStartingNote, setPlStartingNote] = useState<number>(19);
  const [bsNoteCount, setBsNoteCount] = useState<number>(15);
  const [plNoteCount, setPlNoteCount] = useState<number>(7);
  const [includeContingentLiabilities, setIncludeContingentLiabilities] = useState<boolean>(false);
  const [contingentLiabilityNoteNo, setContingentLiabilityNoteNo] = useState<number>(27);
  const [quickAssignLine, setQuickAssignLine] = useState<TrialBalanceLine | null>(null);
  
  // Get client constitution for format selection
  const clientConstitution = useMemo(() => {
    if (!currentEngagement?.client_id) return 'company';
    const client = clients.find(c => c.id === currentEngagement.client_id);
    return client?.constitution || 'company';
  }, [currentEngagement?.client_id, clients]);

  // Enable tab keyboard shortcuts (Ctrl+1-5, Alt+Arrow)
  useTabShortcuts(TRIAL_BALANCE_TABS, activeTab, setActiveTab);

  const handleExport = () => {
    if (lines.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please add or import trial balance data first.',
        variant: 'destructive',
      });
      return;
    }

    const exportData = lines.map(line => ({
      'Branch Name': line.branch_name || '',
      'Account Code': line.account_code,
      'Account Name': line.account_name,
      'Ledger Parent': line.ledger_parent || '',
      'Ledger Primary Group': line.ledger_primary_group || '',
      'Opening Balance': Number(line.opening_balance),
      'Debit': Number(line.debit),
      'Credit': Number(line.credit),
      'Closing Balance': Number(line.closing_balance),
      'Balance Type': line.balance_type || '',
      'AILE': line.aile || '',
      'FS Area': line.fs_area || '',
      'Note': line.note || '',
      'Period Type': line.period_type || '',
      'Period Ending': line.period_ending || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 35 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance');

    const fileName = `TrialBalance_${currentEngagement?.name?.replace(/[^a-z0-9]/gi, '_') || 'export'}_v${currentVersion}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: 'Export successful',
      description: `Downloaded ${fileName}`,
    });
  };

  const filteredLines = useMemo(() => lines.filter(
    (line) =>
      line.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (line.fs_area && line.fs_area.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (line.ledger_parent && line.ledger_parent.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (line.ledger_primary_group && line.ledger_primary_group.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (line.branch_name && line.branch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (line.aile && line.aile.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [lines, searchTerm]);

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}₹${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'hundreds':
        return `${sign}₹${(absAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'thousands':
        return `${sign}₹${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'lakhs':
        return `${sign}₹${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'millions':
        return `${sign}₹${(absAmount / 1000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'crores':
        return `${sign}₹${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'auto':
      default:
        // Auto format based on magnitude
        if (absAmount >= 10000000) {
          return `${sign}₹${(absAmount / 10000000).toFixed(2)} Cr`;
        } else if (absAmount >= 100000) {
          return `${sign}₹${(absAmount / 100000).toFixed(2)} L`;
        }
        return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
    }
  };

  const getScaleLabel = () => {
    switch (reportingScale) {
      case 'rupees': return 'in ₹';
      case 'hundreds': return "in 100's";
      case 'thousands': return "in 1000's";
      case 'lakhs': return 'in Lakhs';
      case 'millions': return 'in Millions';
      case 'crores': return 'in Crores';
      default: return 'Auto';
    }
  };

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

  // Calculate totals
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
  
  // Calculate closing balance sums by type
  const closingDebitSum = lines
    .filter(line => Number(line.closing_balance) > 0 || line.balance_type === 'Dr')
    .reduce((sum, line) => sum + Math.abs(Number(line.closing_balance)), 0);
  
  const closingCreditSum = lines
    .filter(line => Number(line.closing_balance) < 0 || line.balance_type === 'Cr')
    .reduce((sum, line) => sum + Math.abs(Number(line.closing_balance)), 0);

  // Calculate unmapped items
  const unmappedItems = useMemo(() => {
    const unmapped = lines.filter(line => !line.aile || !line.fs_area);
    const unmappedValue = unmapped.reduce((sum, line) => sum + Math.abs(Number(line.closing_balance)), 0);
    return { count: unmapped.length, value: unmappedValue };
  }, [lines]);

  // Get uncategorized lines for quick assignment
  const uncategorizedLines = useMemo(() => {
    return lines.filter(line => !line.face_group || !line.note_group);
  }, [lines]);

  // Handle double-click for quick assignment
  const handleRowDoubleClick = (line: TrialBalanceLine) => {
    setQuickAssignLine(line);
  };

  // Handle save and navigate to next uncategorized
  const handleSaveAndNext = () => {
    const remaining = uncategorizedLines.filter(l => l.id !== quickAssignLine?.id);
    if (remaining.length > 0) {
      setQuickAssignLine(remaining[0]);
    } else {
      setQuickAssignLine(null);
    }
  };

  const handleAddLine = () => {
    setEditingLine(null);
    setIsLineDialogOpen(true);
  };

  const handleEditLine = (line: TrialBalanceLine) => {
    setEditingLine(line);
    setIsLineDialogOpen(true);
  };

  const handleSaveLine = async (data: TrialBalanceLineInput) => {
    if (editingLine) {
      return await updateLine(editingLine.id, data);
    }
    return await addLine(data);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmLine) {
      await deleteLine(deleteConfirmLine.id);
      setDeleteConfirmLine(null);
    }
  };

  const handleDeleteFiltered = async () => {
    if (filteredLines.length > 0 && searchTerm) {
      const ids = filteredLines.map(l => l.id);
      await deleteLines(ids);
      setSearchTerm('');
      setShowDeleteFilteredConfirm(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLineIds(new Set(filteredLines.map(l => l.id)));
    } else {
      setSelectedLineIds(new Set());
    }
  };

  const handleSelectLine = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedLineIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedLineIds(newSelected);
  };

  const handleBulkUpdate = async (data: Partial<TrialBalanceLineInput>) => {
    const ids = Array.from(selectedLineIds);
    const success = await updateLines(ids, data);
    if (success) {
      setSelectedLineIds(new Set());
    }
    return success;
  };

  // Get current and previous period lines for Balance Sheet/P&L
  // Apply balance-based reclassification for financial statement purposes
  const currentPeriodLines = useMemo(() => {
    const filtered = lines.filter(l => l.period_type === 'current');
    return getBalanceReclassifiedLines(filtered.length > 0 ? filtered : lines);
  }, [lines]);
  
  const previousPeriodLines = useMemo(() => {
    const filtered = lines.filter(l => l.period_type === 'previous');
    return getBalanceReclassifiedLines(filtered);
  }, [lines]);

  // Get reclassification summary for display
  const reclassificationSummary = useMemo(() => getReclassificationSummary(lines), [lines]);

  const handleClearAll = async () => {
    if (lines.length === 0) return;
    const ids = lines.map(l => l.id);
    await deleteLines(ids);
    setShowClearAllConfirm(false);
    toast({ title: 'Trial Balance Cleared', description: `All ${ids.length} entries have been removed.` });
  };

  const handleExportBS = () => {
    exportBalanceSheet(currentPeriodLines.length > 0 ? currentPeriodLines : lines, previousPeriodLines, {
      engagementName: currentEngagement?.name || 'export', 
      clientName: currentEngagement?.client_name || '',
      financialYear: currentEngagement?.financial_year || '', 
      reportingScale,
      constitution: clientConstitution,
      startingNoteNumber: bsStartingNote,
    });
    toast({ title: 'Balance Sheet exported with Notes' });
  };

  const handleExportPL = () => {
    exportProfitLoss(currentPeriodLines.length > 0 ? currentPeriodLines : lines, previousPeriodLines, {
      engagementName: currentEngagement?.name || 'export', 
      clientName: currentEngagement?.client_name || '',
      financialYear: currentEngagement?.financial_year || '', 
      reportingScale,
      constitution: clientConstitution,
      startingNoteNumber: plStartingNote,
    });
    toast({ title: 'Profit & Loss exported with Notes' });
  };

  const handleExportCFS = () => {
    exportCashFlowStatement(lines, {
      engagementName: currentEngagement?.name || 'export', 
      clientName: currentEngagement?.client_name || '',
      financialYear: currentEngagement?.financial_year || '', 
      reportingScale,
    });
    toast({ title: 'Cash Flow Statement exported' });
  };


  const getAileColor = (aile: string | null) => {
    switch (aile) {
      case 'Asset': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Income': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Liability': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Expense': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!currentEngagement) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Please select an engagement first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trial Balance & Financials</h1>
          <p className="text-muted-foreground mt-1">
            {lines.length > 0 
              ? `Version ${currentVersion} • ${lines.length} accounts` 
              : 'No trial balance imported yet'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Reporting Scale Dropdown */}
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <Select value={reportingScale} onValueChange={setReportingScale}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Scale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Scale</SelectItem>
                <SelectItem value="rupees">Amount in ₹</SelectItem>
                <SelectItem value="hundreds">in 100's</SelectItem>
                <SelectItem value="thousands">in 1000's</SelectItem>
                <SelectItem value="lakhs">in Lakhs</SelectItem>
                <SelectItem value="millions">in Millions</SelectItem>
                <SelectItem value="crores">in Crores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleAddLine}>
            <Plus className="h-4 w-4" />
            Add Line
          </Button>
          <Button variant="outline" className="gap-2" onClick={downloadBlankTBTemplate}>
            <FileDown className="h-4 w-4" />
            Template
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Import TB
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <FileText className="h-4 w-4 mr-2" />
                Trial Balance
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportBS} disabled={lines.length === 0}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Balance Sheet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPL} disabled={lines.length === 0}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Profit & Loss
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCFS} disabled={lines.length === 0}>
                <Banknote className="h-4 w-4 mr-2" />
                Cash Flow Statement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {lines.length > 0 && (
            <Button 
              variant="outline" 
              className="gap-2 text-destructive hover:text-destructive" 
              onClick={() => setShowClearAllConfirm(true)}
            >
              <XCircle className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
          <TabsTrigger value="trial-balance" className="gap-2 data-[state=active]:text-white">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Trial Balance</span>
            <span className="sm:hidden">TB</span>
          </TabsTrigger>
          <TabsTrigger value="rule-engine" className="gap-2 data-[state=active]:text-white">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Rule Engine</span>
            <span className="sm:hidden">Rules</span>
          </TabsTrigger>
          <TabsTrigger value="uncategorized" className="gap-2 data-[state=active]:text-white">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">Uncategorized</span>
            <span className="sm:hidden">Uncat</span>
          </TabsTrigger>
          <TabsTrigger value="capital-notes" className="gap-2 data-[state=active]:text-white">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Capital Notes</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="gap-2 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Balance Sheet</span>
            <span className="sm:hidden">BS</span>
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="gap-2 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">P&L</span>
            <span className="sm:hidden">P&L</span>
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="gap-2 data-[state=active]:text-white">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">Cash Flow</span>
            <span className="sm:hidden">CF</span>
          </TabsTrigger>
        </TabsList>

        {/* Trial Balance Tab */}
        <TabsContent value="trial-balance" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="audit-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Debits
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(totalDebit)}
              </p>
            </div>
            <div className="audit-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Credits
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(totalCredit)}
              </p>
            </div>
            <div className="audit-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Closing Debit Sum
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(closingDebitSum)}
              </p>
            </div>
            <div className="audit-card">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Closing Credit Sum
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(closingCreditSum)}
              </p>
            </div>
          </div>

          {/* Unmapped Items Warning */}
          {unmappedItems.count > 0 && (
            <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="font-medium text-warning">Unmapped Items Detected</p>
                <p className="text-sm text-muted-foreground">
                  {unmappedItems.count} line item(s) worth {formatCurrency(unmappedItems.value)} are not mapped to AILE or FS Area. These will not appear in Balance Sheet or P&L.
                </p>
              </div>
            </div>
          )}

          {/* Reclassification Info */}
          {reclassificationSummary.count > 0 && (
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Scale className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="font-medium text-blue-500">Balance-Based Reclassifications Applied</p>
                <p className="text-sm text-muted-foreground">
                  {reclassificationSummary.count} item(s) have been reclassified for financial statement presentation based on their closing balance (e.g., Bank OD with debit balance → Cash, Trade Receivables with credit balance → Advance from Customers).
                </p>
              </div>
            </div>
          )}

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by branch, account code, name, AILE, FS area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && filteredLines.length > 0 && (
              <Button 
                variant="destructive" 
                className="gap-2"
                onClick={() => setShowDeleteFilteredConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Filtered ({filteredLines.length})
              </Button>
            )}
            {selectedLineIds.size > 0 && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setIsBulkUpdateDialogOpen(true)}
              >
                <Copy className="h-4 w-4" />
                Bulk Update ({selectedLineIds.size})
              </Button>
            )}
          </div>

          {/* Trial Balance Table */}
          <div className="audit-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : lines.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No trial balance data found for this engagement.</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={handleAddLine}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Line
                    </Button>
                    <Button onClick={() => setIsImportDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Excel
                    </Button>
                  </div>
                </div>
              ) : (
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filteredLines.length > 0 && selectedLineIds.size === filteredLines.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-24">Branch</TableHead>
                      <TableHead className="w-20">Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="w-24 text-right">Opening</TableHead>
                      <TableHead className="w-24 text-right">Debit</TableHead>
                      <TableHead className="w-24 text-right">Credit</TableHead>
                      <TableHead className="w-24 text-right">Closing</TableHead>
                      <TableHead className="w-16">Type</TableHead>
                      <TableHead className="w-20">AILE</TableHead>
                      <TableHead className="w-24">FS Area</TableHead>
                      <TableHead className="w-16">Note</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLines.map((line) => (
                      <TableRow 
                        key={line.id} 
                        className={cn(
                          "hover:bg-muted/30 cursor-pointer",
                          selectedLineIds.has(line.id) && "bg-primary/5"
                        )}
                        onDoubleClick={() => handleRowDoubleClick(line)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedLineIds.has(line.id)}
                            onCheckedChange={(checked) => handleSelectLine(line.id, checked === true)}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.branch_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{line.account_code}</TableCell>
                        <TableCell className="font-medium">{line.account_name}</TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-xs",
                          Number(line.opening_balance) < 0 && "text-destructive"
                        )}>
                          {formatCurrency(Number(line.opening_balance))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(Number(line.debit))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(Number(line.credit))}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-xs font-medium",
                          Number(line.closing_balance) < 0 && "text-destructive"
                        )}>
                          {formatCurrency(Number(line.closing_balance))}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {line.balance_type || '-'}
                        </TableCell>
                        <TableCell>
                          {line.aile ? (
                            <span className={cn(
                              "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                              getAileColor(line.aile)
                            )}>
                              {line.aile}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {line.fs_area ? (
                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
                              {line.fs_area}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {line.note || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditLine(line)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmLine(line)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Rule Engine Tab */}
        <TabsContent value="rule-engine" className="mt-6">
          <ScheduleIIIRuleEngine 
            lines={lines} 
            onUpdateLines={updateLines} 
            reportingScale={reportingScale}
          />
        </TabsContent>

        {/* Uncategorized Items Tab */}
        <TabsContent value="uncategorized" className="mt-6">
          <UncategorizedItemsPanel 
            lines={lines} 
            onUpdateLines={updateLines} 
            reportingScale={reportingScale}
          />
        </TabsContent>

        {/* Capital Notes Tab */}
        <TabsContent value="capital-notes" className="mt-6">
          <NotesManagementTab 
            lines={lines}
            constitution={clientConstitution}
            financialYear={currentEngagement?.financial_year || ''}
            clientName={currentEngagement?.client_name || ''}
          />
        </TabsContent>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance-sheet" className="mt-6">
          {lines.length === 0 ? (
            <div className="audit-card p-8 text-center">
              <p className="text-muted-foreground mb-4">Import trial balance data to generate Balance Sheet.</p>
              <Button onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Trial Balance
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <FormatSelector constitution={clientConstitution} showDownload={true} />
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
              <ScheduleIIIBalanceSheet 
                currentLines={currentPeriodLines} 
                previousLines={previousPeriodLines}
                reportingScale={reportingScale}
                constitution={clientConstitution}
                startingNoteNumber={bsStartingNote}
              />
            </div>
          )}
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="profit-loss" className="mt-6">
          {lines.length === 0 ? (
            <div className="audit-card p-8 text-center">
              <p className="text-muted-foreground mb-4">Import trial balance data to generate Statement of Profit & Loss.</p>
              <Button onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Trial Balance
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <FormatSelector constitution={clientConstitution} showDownload={true} />
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
              <ScheduleIIIProfitLoss 
                currentLines={currentPeriodLines} 
                previousLines={previousPeriodLines}
                reportingScale={reportingScale}
                constitution={clientConstitution}
                startingNoteNumber={plStartingNote}
              />
            </div>
          )}
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cash-flow" className="mt-6">
          {lines.length === 0 ? (
            <div className="audit-card p-8 text-center">
              <p className="text-muted-foreground mb-4">Import trial balance data to generate Cash Flow Statement.</p>
              <Button onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Trial Balance
              </Button>
            </div>
          ) : (
            <CashFlowStatement lines={lines} />
          )}
        </TabsContent>

      </Tabs>

      {/* Line Dialog */}
      <TrialBalanceLineDialog
        open={isLineDialogOpen}
        onOpenChange={setIsLineDialogOpen}
        line={editingLine}
        onSave={handleSaveLine}
      />

      {/* Import Dialog */}
      <TrialBalanceImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={importLines}
      />

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        open={isBulkUpdateDialogOpen}
        onOpenChange={setIsBulkUpdateDialogOpen}
        selectedCount={selectedLineIds.size}
        onUpdate={handleBulkUpdate}
      />

      {/* Delete Single Confirmation */}
      <AlertDialog open={!!deleteConfirmLine} onOpenChange={() => setDeleteConfirmLine(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trial Balance Line</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete account "{deleteConfirmLine?.account_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Filtered Confirmation */}
      <AlertDialog open={showDeleteFilteredConfirm} onOpenChange={setShowDeleteFilteredConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filtered Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {filteredLines.length} filtered items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFiltered} className="bg-destructive hover:bg-destructive/90">
              Delete All Filtered
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Trial Balance Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {lines.length} entries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Assignment Dialog */}
      <QuickAssignmentDialog
        open={!!quickAssignLine}
        onOpenChange={(open) => !open && setQuickAssignLine(null)}
        line={quickAssignLine}
        onSave={updateLine}
        onSaveAndNext={handleSaveAndNext}
        uncategorizedLines={uncategorizedLines}
      />
    </div>
  );
}
