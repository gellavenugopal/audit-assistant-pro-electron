import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Database,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  RefreshCw,
  FileText,
  BarChart3,
  Save,
  Trash2,
  Settings,
  Package,
  Layers,
  Calculator,
  Pencil,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTallyODBC } from '@/hooks/useTallyODBC';
import { useEngagement } from '@/contexts/EngagementContext';
import { classifyDataframeBatch, LedgerRow, generateLedgerKey } from '@/services/trialBalanceNewClassification';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { StockItemsTab } from '@/components/trial-balance-new/StockItemsTab';
import { ReportsTab } from '@/components/trial-balance-new/ReportsTab';
import { BulkUpdateDialog } from '@/components/trial-balance-new/BulkUpdateDialog';
import { ClassificationManager } from '@/components/trial-balance-new/ClassificationManager';
import { Ribbon } from '@/components/trial-balance-new/Ribbon';
import { ClassificationResult } from '@/services/trialBalanceNewClassification';

// Entity Types
const ENTITY_TYPES = [
  "Individual / Sole Proprietorship",
  "Partnership",
  "Limited Liability Partnership (LLP)",
  "Private Limited Company",
  "Public Limited Company",
  "One Person Company (OPC)",
  "Trust",
  "Society",
  "Others"
];

// Business Types
const BUSINESS_TYPES = [
  "Trading",
  "Manufacturing",
  "Service",
  "Construction",
  "Retail",
  "Wholesale",
  "Others"
];

export default function TrialBalanceNew() {
  const { currentEngagement } = useEngagement();
  const { toast } = useToast();
  const odbcConnection = useTallyODBC();
  
  // Entity and Business Info
  const [entityType, setEntityType] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('');
  
  // Data State
  const [currentData, setCurrentData] = useState<LedgerRow[]>([]);
  const [currentStockData, setCurrentStockData] = useState<any[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, ClassificationResult>>({});
  
  // UI State
  const [activeTab, setActiveTab] = useState('data');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [h2Filter, setH2Filter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>('2025-03-31');
  const [odbcPort, setOdbcPort] = useState<string>('9000');
  const [isFetching, setIsFetching] = useState(false);
  const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isClassificationManagerOpen, setIsClassificationManagerOpen] = useState(false);
  
  // Filtered data
  const filteredData = useMemo(() => {
    let filtered = currentData;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        (row['Ledger Name'] || '').toLowerCase().includes(searchLower) ||
        (row['Primary Group'] || '').toLowerCase().includes(searchLower) ||
        (row['H1'] || '').toLowerCase().includes(searchLower) ||
        (row['H2'] || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(row => (row['Status'] || 'Unmapped') === statusFilter);
    }
    
    // H2 filter
    if (h2Filter !== 'all') {
      filtered = filtered.filter(row => (row['H2'] || '') === h2Filter);
    }
    
    return filtered;
  }, [currentData, searchTerm, statusFilter, h2Filter]);
  
  // Totals calculation
  const totals = useMemo(() => {
    return filteredData.reduce((acc, row) => {
      acc.opening += row['Opening Balance'] || 0;
      acc.debit += row['Debit'] || 0;
      acc.credit += row['Credit'] || 0;
      acc.closing += row['Closing Balance'] || 0;
      return acc;
    }, { opening: 0, debit: 0, credit: 0, closing: 0 });
  }, [filteredData]);
  
  // Connect to Tally
  const handleConnectTally = useCallback(async () => {
    if (!odbcConnection.isConnected) {
      const connected = await odbcConnection.testConnection();
      if (!connected) {
        return;
      }
    }
    
    // Show entity type dialog first
    setIsEntityDialogOpen(true);
  }, [odbcConnection]);
  
  // Fetch data from Tally after entity selection
  const handleFetchFromTally = useCallback(async () => {
    if (!entityType) {
      toast({
        title: 'Entity Type Required',
        description: 'Please select an entity type first',
        variant: 'destructive'
      });
      return;
    }
    
    setIsFetching(true);
    try {
      const lines = await odbcConnection.fetchTrialBalance(fromDate, toDate);
      
      if (!lines || lines.length === 0) {
        toast({
          title: 'No Data',
          description: 'No trial balance data found',
          variant: 'destructive'
        });
        setIsFetching(false);
        return;
      }
      
      // Convert to LedgerRow format
      const processedData: LedgerRow[] = lines.map(line => ({
        'Ledger Name': line.accountHead,
        'Primary Group': line.primaryGroup || '',
        'Parent Group': line.parent || '',
        'Composite Key': generateLedgerKey(line.accountHead, line.primaryGroup || ''),
        'Opening Balance': line.openingBalance || 0,
        'Debit': Math.abs(line.totalDebit || 0),
        'Credit': Math.abs(line.totalCredit || 0),
        'Closing Balance': line.closingBalance || 0,
        'Is Revenue': line.isRevenue ? 'Yes' : 'No',
        'Sheet Name': 'TB CY'
      }));
      
      // Auto-classify
      const classified = classifyDataframeBatch(processedData, savedMappings);
      setCurrentData(classified);
      
      toast({
        title: 'Success',
        description: `Imported and classified ${classified.length} ledgers from Tally`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch from Tally',
        variant: 'destructive'
      });
    } finally {
      setIsFetching(false);
      setIsEntityDialogOpen(false);
    }
  }, [entityType, fromDate, toDate, odbcConnection, savedMappings, toast]);
  
  // Auto-classify existing data
  const handleAutoClassify = useCallback(() => {
    if (currentData.length === 0) {
      toast({
        title: 'No Data',
        description: 'Please import data first',
        variant: 'destructive'
      });
      return;
    }
    
    const classified = classifyDataframeBatch(currentData, savedMappings);
    setCurrentData(classified);
    
    const mappedCount = classified.filter(row => row['Status'] === 'Mapped').length;
    toast({
      title: 'Classification Complete',
      description: `Classified ${classified.length} ledgers (${mappedCount} mapped)`
    });
  }, [currentData, savedMappings, toast]);

  // Handle bulk update
  const handleBulkUpdate = useCallback((updates: Partial<LedgerRow>) => {
    if (selectedRowIndices.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select rows to update',
        variant: 'destructive'
      });
      return;
    }

    const updatedData = [...currentData];
    const updateCount = selectedRowIndices.size;
    
    selectedRowIndices.forEach(index => {
      if (updatedData[index]) {
        updatedData[index] = {
          ...updatedData[index],
          ...updates,
        };
        
        // Update status based on H1 and H2
        const finalH1 = updates['H1'] !== undefined ? updates['H1'] : updatedData[index]['H1'];
        const finalH2 = updates['H2'] !== undefined ? updates['H2'] : updatedData[index]['H2'];
        
        if (finalH1 && finalH2) {
          updatedData[index]['Status'] = 'Mapped';
        } else if (!finalH1 || !finalH2) {
          updatedData[index]['Status'] = 'Unmapped';
        }
      }
    });

    setCurrentData(updatedData);
    setSelectedRowIndices(new Set());
    
    toast({
      title: 'Bulk Update Complete',
      description: `Updated ${updateCount} ledger(s)`
    });
  }, [currentData, selectedRowIndices, toast]);

  // Handle save mapping
  const handleSaveMapping = useCallback((compositeKey: string, classification: ClassificationResult) => {
    setSavedMappings(prev => ({
      ...prev,
      [compositeKey]: classification
    }));
    
    toast({
      title: 'Mapping Saved',
      description: 'Classification mapping saved successfully'
    });
  }, [toast]);

  // Handle delete mapping
  const handleDeleteMapping = useCallback((compositeKey: string) => {
    setSavedMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[compositeKey];
      return newMappings;
    });
    
    toast({
      title: 'Mapping Deleted',
      description: 'Classification mapping deleted successfully'
    });
  }, [toast]);

  // Toggle row selection
  const toggleRowSelection = useCallback((index: number, event?: React.MouseEvent) => {
    setSelectedRowIndices(prev => {
      const newSet = new Set(prev);
      if (event?.ctrlKey || event?.metaKey) {
        // Toggle selection
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
      } else if (event?.shiftKey && prev.size > 0) {
        // Range selection
        const indices = Array.from(prev);
        const lastIndex = indices[indices.length - 1];
        const start = Math.min(lastIndex, index);
        const end = Math.max(lastIndex, index);
        for (let i = start; i <= end; i++) {
          newSet.add(i);
        }
      } else {
        // Single selection
        newSet.clear();
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Excel-like keyboard navigation
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (filteredData.length === 0) return;

      // Arrow keys for navigation
      if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusedRowIndex(prev => {
          const current = prev !== null ? prev : -1;
          const next = Math.min(current + 1, filteredData.length - 1);
          const originalIndex = currentData.findIndex(r => 
            r['Composite Key'] === filteredData[next]?.['Composite Key']
          );
          if (originalIndex !== -1 && !e.shiftKey) {
            setSelectedRowIndices(new Set([originalIndex]));
          }
          return next;
        });
      } else if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusedRowIndex(prev => {
          const current = prev !== null ? prev : filteredData.length;
          const next = Math.max(current - 1, 0);
          const originalIndex = currentData.findIndex(r => 
            r['Composite Key'] === filteredData[next]?.['Composite Key']
          );
          if (originalIndex !== -1 && !e.shiftKey) {
            setSelectedRowIndices(new Set([originalIndex]));
          }
          return next;
        });
      } else if (e.key === 'Home' && e.ctrlKey) {
        e.preventDefault();
        if (filteredData.length > 0) {
          const originalIndex = currentData.findIndex(r => 
            r['Composite Key'] === filteredData[0]?.['Composite Key']
          );
          if (originalIndex !== -1) {
            setFocusedRowIndex(0);
            setSelectedRowIndices(new Set([originalIndex]));
          }
        }
      } else if (e.key === 'End' && e.ctrlKey) {
        e.preventDefault();
        if (filteredData.length > 0) {
          const lastIndex = filteredData.length - 1;
          const originalIndex = currentData.findIndex(r => 
            r['Composite Key'] === filteredData[lastIndex]?.['Composite Key']
          );
          if (originalIndex !== -1) {
            setFocusedRowIndex(lastIndex);
            setSelectedRowIndices(new Set([originalIndex]));
          }
        }
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectedRowIndices(new Set(filteredData.map((_, i) => {
          const originalIndex = currentData.findIndex(r => 
            r['Composite Key'] === filteredData[i]?.['Composite Key']
          );
          return originalIndex;
        }).filter(i => i !== -1)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredData, currentData]);
  
  // Format number for display
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Excel Import
  const handleExcelImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const processedData: LedgerRow[] = jsonData.map((row: any) => ({
          'Ledger Name': row['Ledger Name'] || row['ledger_name'] || '',
          'Primary Group': row['Primary Group'] || row['primary_group'] || '',
          'Parent Group': row['Parent Group'] || row['parent_group'] || '',
          'Composite Key': generateLedgerKey(
            row['Ledger Name'] || row['ledger_name'] || '',
            row['Primary Group'] || row['primary_group'] || ''
          ),
          'Opening Balance': parseFloat(row['Opening Balance'] || row['opening_balance'] || 0),
          'Debit': parseFloat(row['Debit'] || row['debit'] || 0),
          'Credit': parseFloat(row['Credit'] || row['credit'] || 0),
          'Closing Balance': parseFloat(row['Closing Balance'] || row['closing_balance'] || 0),
          'Is Revenue': row['Is Revenue'] || row['is_revenue'] || 'No',
          'H1': row['H1'] || '',
          'H2': row['H2'] || '',
          'H3': row['H3'] || '',
          'H4': row['H4'] || '',
          'H5': row['H5'] || '',
          'Status': row['Status'] || 'Unmapped',
          'Sheet Name': 'TB CY'
        }));
        
        const classified = classifyDataframeBatch(processedData, savedMappings);
        setCurrentData(classified);
        
        toast({
          title: 'Import Successful',
          description: `Imported ${classified.length} ledgers from Excel`
        });
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: error instanceof Error ? error.message : 'Failed to import Excel file',
          variant: 'destructive'
        });
      }
    };
    input.click();
  }, [savedMappings, toast]);

  // Excel Export
  const handleExcelExport = useCallback(() => {
    if (currentData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data to export',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(currentData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance');
      
      if (currentStockData.length > 0) {
        const stockWorksheet = XLSX.utils.json_to_sheet(currentStockData);
        XLSX.utils.book_append_sheet(workbook, stockWorksheet, 'Stock Items');
      }
      
      XLSX.writeFile(workbook, `Trial_Balance_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: 'Export Successful',
        description: 'Data exported to Excel'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive'
      });
    }
  }, [currentData, currentStockData, toast]);

  // Save Session
  const handleSave = useCallback(() => {
    const sessionName = prompt('Enter session name:', `Session_${new Date().toISOString().split('T')[0]}`);
    if (!sessionName) return;
    
    // TODO: Implement session save to database
    toast({
      title: 'Save',
      description: 'Session save feature coming soon'
    });
  }, [toast]);

  // Clear Data
  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all data?')) {
      setCurrentData([]);
      setCurrentStockData([]);
      toast({
        title: 'Data Cleared',
        description: 'All data has been cleared'
      });
    }
  }, [toast]);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Excel-style Ribbon */}
      <Ribbon
        odbcPort={odbcPort}
        onOdbcPortChange={setOdbcPort}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        onTallyImport={handleConnectTally}
        onExcelImport={handleExcelImport}
        isConnecting={isFetching || odbcConnection.isConnecting}
        isConnected={odbcConnection.isConnected}
        onAutoClassify={handleAutoClassify}
        onBulkUpdate={() => {
          if (selectedRowIndices.size === 0) {
            toast({
              title: 'No Selection',
              description: 'Please select rows to update',
              variant: 'destructive'
            });
            return;
          }
          setIsBulkUpdateDialogOpen(true);
        }}
        onClassificationManager={() => setIsClassificationManagerOpen(true)}
        hasData={currentData.length > 0}
        selectedCount={selectedRowIndices.size}
        onFinancialStatements={() => setActiveTab('reports')}
        onExcelExport={handleExcelExport}
        onSave={handleSave}
        onClear={handleClear}
      />

      {/* Entity Information Bar (Compact) */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 border-b text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Entity:</span>
          <button
            onClick={() => setIsEntityDialogOpen(true)}
            className={cn(
              "px-2 py-1 rounded hover:bg-gray-200 transition-colors",
              entityType ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {entityType || 'Select Entity Type'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Business:</span>
          <button
            onClick={() => setIsBusinessDialogOpen(true)}
            className={cn(
              "px-2 py-1 rounded hover:bg-gray-200 transition-colors",
              businessType ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {businessType || 'Select Business Type'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Company:</span>
          <span className="text-foreground">{entityName || 'Not Imported'}</span>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter Bar (Compact) */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b">
          <Input
            placeholder="Search (Ctrl+F)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-64 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchTerm('');
              }
            }}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Mapped">Mapped</SelectItem>
              <SelectItem value="Unmapped">Unmapped</SelectItem>
              <SelectItem value="Error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={h2Filter} onValueChange={setH2Filter}>
            <SelectTrigger className="h-8 w-[130px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All H2</SelectItem>
              <SelectItem value="Assets">Assets</SelectItem>
              <SelectItem value="Liabilities">Liabilities</SelectItem>
              <SelectItem value="Equity">Equity</SelectItem>
              <SelectItem value="Income">Income</SelectItem>
              <SelectItem value="Expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Opening: <strong className="text-foreground">{formatNumber(totals.opening)}</strong></span>
            <span>Debit: <strong className="text-foreground">{formatNumber(totals.debit)}</strong></span>
            <span>Credit: <strong className="text-foreground">{formatNumber(totals.credit)}</strong></span>
            <span>Closing: <strong className="text-foreground">{formatNumber(totals.closing)}</strong></span>
          </div>
        </div>
      
        {/* Sheet Tabs (Excel-style) */}
        <div className="flex items-center border-b bg-gray-50 px-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-8 p-0">
              <TabsTrigger 
                value="trial-balance"
                className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-8 px-4"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1.5" />
                Trial Balance
              </TabsTrigger>
              <TabsTrigger 
                value="stock-items"
                className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-8 px-4"
              >
                <Package className="w-3 h-3 mr-1.5" />
                Stock Items
              </TabsTrigger>
              <TabsTrigger 
                value="hierarchy"
                className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-8 px-4"
              >
                <Layers className="w-3 h-3 mr-1.5" />
                Hierarchy
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-8 px-4"
              >
                <FileText className="w-3 h-3 mr-1.5" />
                Reports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="trial-balance" className="mt-0 p-4">
              <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRowIndices.size === filteredData.length && filteredData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowIndices(new Set(filteredData.map((_, i) => i)));
                        } else {
                          setSelectedRowIndices(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Ledger Name</TableHead>
                  <TableHead>Primary Group</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead>H1</TableHead>
                  <TableHead>H2</TableHead>
                  <TableHead>H3</TableHead>
                  <TableHead>H4</TableHead>
                  <TableHead>H5</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                      No data loaded. Import from Tally or Excel to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, index) => {
                    // Find the original index in currentData
                    const originalIndex = currentData.findIndex(r => 
                      r['Composite Key'] === row['Composite Key']
                    );
                    const isSelected = originalIndex !== -1 && selectedRowIndices.has(originalIndex);
                    
                    return (
                      <TableRow 
                        key={row['Composite Key'] || index}
                        className={cn(
                          isSelected && "bg-blue-100/50",
                          focusedRowIndex === index && "ring-2 ring-blue-500 ring-inset",
                          "cursor-pointer hover:bg-muted/30"
                        )}
                        onClick={(e) => {
                          if (originalIndex !== -1) {
                            setFocusedRowIndex(index);
                            toggleRowSelection(originalIndex, e);
                          }
                        }}
                        tabIndex={0}
                        onFocus={() => setFocusedRowIndex(index)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (originalIndex !== -1) {
                                toggleRowSelection(originalIndex);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row['Ledger Name']}</TableCell>
                        <TableCell>{row['Primary Group']}</TableCell>
                        <TableCell className="text-right">{formatNumber(row['Opening Balance'])}</TableCell>
                        <TableCell className="text-right">{formatNumber(row['Debit'])}</TableCell>
                        <TableCell className="text-right">{formatNumber(row['Credit'])}</TableCell>
                        <TableCell className="text-right">{formatNumber(row['Closing Balance'])}</TableCell>
                        <TableCell>{row['H1'] || '-'}</TableCell>
                        <TableCell>{row['H2'] || '-'}</TableCell>
                        <TableCell>{row['H3'] || '-'}</TableCell>
                        <TableCell>{row['H4'] || '-'}</TableCell>
                        <TableCell>{row['H5'] || '-'}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded text-xs",
                            row['Status'] === 'Mapped' ? "bg-green-100 text-green-800" :
                            row['Status'] === 'Unmapped' ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          )}>
                            {row['Status'] || 'Unmapped'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="stock-items" className="mt-0 p-4">
              <StockItemsTab 
                stockData={currentStockData} 
                onUpdateStockData={setCurrentStockData}
              />
            </TabsContent>
            
            <TabsContent value="hierarchy" className="mt-0 p-4">
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Classification Hierarchy (H1-H2-H3-H4-H5)</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Balance Sheet</h4>
                    <div className="ml-4 space-y-1 text-sm">
                      <div>• Assets</div>
                      <div className="ml-4">  - PPE & IA (Net)</div>
                      <div className="ml-4">  - Investments</div>
                      <div className="ml-4">  - Trade Receivables</div>
                      <div className="ml-4">  - Cash and Bank Balance</div>
                      <div>• Liabilities</div>
                      <div className="ml-4">  - Borrowings</div>
                      <div className="ml-4">  - Trade Payables</div>
                      <div>• Equity</div>
                      <div className="ml-4">  - Share Capital</div>
                      <div className="ml-4">  - Reserves and Surplus</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">P&L Account</h4>
                    <div className="ml-4 space-y-1 text-sm">
                      <div>• Income</div>
                      <div className="ml-4">  - Revenue from Operations</div>
                      <div className="ml-4">  - Other Income</div>
                      <div>• Expenses</div>
                      <div className="ml-4">  - Cost of Goods Sold</div>
                      <div className="ml-4">  - Employee Benefits Expenses</div>
                      <div className="ml-4">  - Finance Costs</div>
                      <div className="ml-4">  - Depreciation and Amortization Expense</div>
                      <div className="ml-4">  - Other Expenses</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="reports" className="mt-0 p-4">
              <ReportsTab 
                data={currentData}
                stockData={currentStockData}
                companyName={entityName}
                toDate={toDate}
                entityType={entityType}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Status Bar (Excel-style) */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-gray-100 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Ready</span>
            {currentData.length > 0 && (
              <>
                <span>•</span>
                <span>{currentData.length} Ledger{currentData.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{selectedRowIndices.size} Selected</span>
                <span>•</span>
                <span>{filteredData.filter(r => r['Status'] === 'Mapped').length} Mapped</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded">Ctrl+?</kbd>
            <span>for shortcuts</span>
          </div>
        </div>
      </div>
      
      {/* Entity Type Dialog */}
      <Dialog open={isEntityDialogOpen} onOpenChange={setIsEntityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Entity Type</DialogTitle>
            <DialogDescription>
              Select the type of entity for this Trial Balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Name</label>
              <Input
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="Will be Auto Imported from Tally"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEntityDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleFetchFromTally} disabled={!entityType || isFetching}>
                {isFetching ? 'Fetching...' : 'Confirm & Fetch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Business Type Dialog */}
      <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Business Type</DialogTitle>
            <DialogDescription>
              Select the business type for stock classification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBusinessDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsBusinessDialogOpen(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        open={isBulkUpdateDialogOpen}
        onOpenChange={setIsBulkUpdateDialogOpen}
        selectedRows={Array.from(selectedRowIndices)
          .map(index => currentData[index])
          .filter((row): row is LedgerRow => row !== undefined)}
        onUpdate={handleBulkUpdate}
      />

      {/* Classification Manager Dialog */}
      <ClassificationManager
        open={isClassificationManagerOpen}
        onOpenChange={setIsClassificationManagerOpen}
        savedMappings={savedMappings}
        onSaveMapping={handleSaveMapping}
        onDeleteMapping={handleDeleteMapping}
      />
    </div>
  );
}

