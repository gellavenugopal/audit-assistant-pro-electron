import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResizableColumns } from '@/hooks/useResizableColumns';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { ColumnFilter } from '@/components/ui/column-filter';
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
  Cog,
  Plus,
  Edit,
  Trash,
  X,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTallyODBC } from '@/hooks/useTallyODBC';
import { useEngagement } from '@/contexts/EngagementContext';
import { useTrialBalance, TrialBalanceLineInput } from '@/hooks/useTrialBalance';
import { classifyDataframeBatch, LedgerRow, generateLedgerKey } from '@/services/trialBalanceNewClassification';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { StockItemsTab } from '@/components/trial-balance-new/StockItemsTab';
import { ReportsTab } from '@/components/trial-balance-new/ReportsTab';
import { BulkUpdateDialog } from '@/components/trial-balance-new/BulkUpdateDialog';
import { ClassificationManager } from '@/components/trial-balance-new/ClassificationManager';
import { FilterModal } from '@/components/trial-balance-new/FilterModal';
import { ClassificationResult } from '@/services/trialBalanceNewClassification';
import { DEFAULT_GROUP_RULES, DEFAULT_KEYWORD_RULES, DEFAULT_OVERRIDE_RULES } from '@/data/scheduleIIIDefaultRules';
import { H1_OPTIONS, getH2Options, getH3Options, getH4Options } from '@/data/classificationOptions';
import { getActualBalanceSign } from '@/utils/naturalBalance';

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
  "Trading - Wholesale and Retail",
  "Manufacturing",
  "Service",
  "Construction",
  "Others"
];

// Disabled entity types (not supported in this phase)
const DISABLED_ENTITY_TYPES = ["Trust", "Society", "Others"];

const getConstitutionFromEntityType = (et: string) => {
  const lower = et.toLowerCase();
  if (lower.includes('company') || lower.includes('opc')) return 'company';
  if (lower.includes('llp') || lower.includes('limited liability')) return 'llp';
  if (lower.includes('partnership')) return 'partnership';
  if (lower.includes('proprietorship') || lower.includes('sole') || lower.includes('individual')) return 'proprietorship';
  if (lower.includes('trust')) return 'trust';
  if (lower.includes('society')) return 'society';
  return 'company';
};

// Helper function to automatically classify H1 and H2 based on Is Revenue and Closing Balance
function applyAutoH1H2Classification(rows: LedgerRow[]): LedgerRow[] {
  return rows.map(row => {
    // Skip classification for "Profit & Loss A/c" ledger when parent group contains "Primary"
    const ledgerName = (row['Ledger Name'] || '').toLowerCase();
    const parentGroup = (row['Parent Group'] || '').toLowerCase();
    
    if (ledgerName.includes('profit') && ledgerName.includes('loss') && ledgerName.includes('a/c') && parentGroup.includes('primary')) {
      return row; // Return unchanged
    }
    
    const isRevenue = row['Is Revenue'] === 'Yes';
    const closingBalance = row['Closing Balance'] || 0;
    const isNegative = closingBalance < 0;
    
    // H1: Determine if Profit and Loss or Balance Sheet
    const h1 = isRevenue ? 'Profit and Loss' : 'Balance Sheet';
    
    // H2: Determine sub-category based on H1 and closing balance sign
    let h2 = '';
    if (h1 === 'Balance Sheet') {
      h2 = isNegative ? 'Assets' : 'Liabilities';
    } else { // Profit and Loss
      h2 = isNegative ? 'Expenses' : 'Income';
    }
    
    return {
      ...row,
      'H1': h1,
      'H2': h2
    };
  });
}

export default function FinancialReview() {
  const { currentEngagement } = useEngagement();
  const { toast } = useToast();
  const odbcConnection = useTallyODBC();
  const trialBalanceDB = useTrialBalance(currentEngagement?.id);
  
  // Entity and Business Info
  const [entityType, setEntityType] = useState<string>('');
  const [entityTypeDraft, setEntityTypeDraft] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('');
  const [includeStockItems, setIncludeStockItems] = useState<boolean>(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Derive constitution from entity type
  const constitution = useMemo(() => getConstitutionFromEntityType(entityType), [entityType]);
  
  // Data State
  const [actualData, setActualData] = useState<LedgerRow[]>([]); // Unclassified actual data
  const [currentData, setCurrentData] = useState<LedgerRow[]>([]); // Classified data
  const [previousData, setPreviousData] = useState<LedgerRow[]>([]);
  const [currentStockData, setCurrentStockData] = useState<any[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, ClassificationResult>>({});
  const [importPeriodType, setImportPeriodType] = useState<'current' | 'previous'>('current');
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);
  const [isAddLineDialogOpen, setIsAddLineDialogOpen] = useState(false);
  const [isSigningDialogOpen, setIsSigningDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<LedgerRow[] | null>(null);
  const [signingDetails, setSigningDetails] = useState({
    date: '',
    place: '',
    partnerName: '',
    firmName: ''
  });
  const [newLineForm, setNewLineForm] = useState({
    ledgerName: '',
    primaryGroup: '',
    openingBalance: 0,
    debit: 0,
    credit: 0,
    closingBalance: 0,
    periodType: 'current' as 'current' | 'previous'
  });
  const [selectedRuleSet, setSelectedRuleSet] = useState<string>('schedule-iii');
  
  // UI State
  const [activeTab, setActiveTab] = useState('actual-tb'); // Start with Actual TB tab

  // Column widths for resizable columns - Actual TB
  const {
    columnWidths: actualTbColumnWidths,
    handleMouseDown: actualTbHandleMouseDown,
    isResizing: actualTbIsResizing,
    resizingColumn: actualTbResizingColumn
  } = useResizableColumns({
    'Ledger Name': 250,
    'Parent Group': 250,
    'Primary Group': 250,
    'Opening Balance': 150,
    'Debit': 150,
    'Credit': 150,
    'Closing Balance': 150,
    'Is Revenue': 120
  });
  
  // Column widths for resizable columns - Classified TB
  const {
    columnWidths: classifiedTbColumnWidths,
    handleMouseDown: classifiedTbHandleMouseDown,
    isResizing: classifiedTbIsResizing,
    resizingColumn: classifiedTbResizingColumn
  } = useResizableColumns({
    'Ledger Name': 250,
    'Parent Group': 250,
    'Primary Group': 250,
    'Opening Balance': 150,
    'Debit': 150,
    'Credit': 150,
    'Closing Balance': 150,
    'H1': 180,
    'H2': 180,
    'H3': 180,
    'H4': 180,
    'H5': 180,
    'Status': 120
  });

  const actualStickyOffsets = useMemo(() => {
    const selection = 0;
    const ledger = 32; // slimmer selection column
    return { selection, ledger };
  }, []);

  const classifiedStickyOffsets = useMemo(() => {
    const selection = 0;
    const ledger = 32;
    return { selection, ledger };
  }, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<string>('all'); // all, positive, negative, zero
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>('2025-03-31');
  const [odbcPort, setOdbcPort] = useState<string>('9000');
  const [isFetching, setIsFetching] = useState(false);
  const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1); // For shift+click range selection
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isSingleEditDialogOpen, setIsSingleEditDialogOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<LedgerRow | null>(null);
  const [editingLedgerIndex, setEditingLedgerIndex] = useState<number>(-1);
  const [isClassificationManagerOpen, setIsClassificationManagerOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRuleKey, setEditingRuleKey] = useState<string | null>(null);
  const [isRuleTemplateDialogOpen, setIsRuleTemplateDialogOpen] = useState(false);
  const [isResetConfirmDialogOpen, setIsResetConfirmDialogOpen] = useState(false);
  const [ruleTemplateName, setRuleTemplateName] = useState<string>('');
  
  // Keep draft entity type in sync when dialog opens
  useEffect(() => {
    if (isEntityDialogOpen) {
      setEntityTypeDraft(entityType);
    }
  }, [isEntityDialogOpen, entityType]);
  
  // Compute stock item counts and totals directly via useMemo (avoids infinite loop from callbacks)
  const { stockItemCount, stockTotals } = useMemo(() => {
    // Safety check for array
    if (!currentStockData || !Array.isArray(currentStockData)) {
      return {
        stockItemCount: { filtered: 0, total: 0 },
        stockTotals: { opening: 0, closing: 0 }
      };
    }
    
    // Filter out items where both opening AND closing are 0
    const nonZeroItems = currentStockData.filter(item => {
      if (!item) return false;
      const opening = Math.abs(item['Opening Value'] || 0);
      const closing = Math.abs(item['Closing Value'] || 0);
      return !(opening === 0 && closing === 0);
    });
    
    const stockSearchTerm = activeTab === 'stock-items' ? searchTerm : '';

    // Apply search filter with null safety
    const filtered = stockSearchTerm
      ? nonZeroItems.filter(item => {
          if (!item) return false;
          const itemName = (item['Item Name'] || '').toLowerCase();
          const stockGroup = (item['Stock Group'] || '').toLowerCase();
          const primaryGroup = (item['Primary Group'] || '').toLowerCase();
          const search = stockSearchTerm.toLowerCase();
          return itemName.includes(search) || stockGroup.includes(search) || primaryGroup.includes(search);
        })
      : nonZeroItems;
    
    // Calculate totals from filtered items - use Math.abs since stock values are assets (Dr)
    const totals = filtered.reduce((acc, item) => ({
      opening: acc.opening + Math.abs(item?.['Opening Value'] || 0),
      closing: acc.closing + Math.abs(item?.['Closing Value'] || 0),
    }), { opening: 0, closing: 0 });
    
    return {
      stockItemCount: { filtered: filtered.length, total: nonZeroItems.length },
      stockTotals: totals
    };
  }, [currentStockData, searchTerm, activeTab]);
  
  // Column filters and sorting state for Actual TB
  const [actualTbColumnFilters, setActualTbColumnFilters] = useState<Record<string, Set<string | number>>>({});
  const [actualTbSortColumn, setActualTbSortColumn] = useState<string | null>(null);
  const [actualTbSortDirection, setActualTbSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  // Column filters and sorting state for Classified TB
  const [classifiedTbColumnFilters, setClassifiedTbColumnFilters] = useState<Record<string, Set<string | number>>>({});
  const [classifiedTbSortColumn, setClassifiedTbSortColumn] = useState<string | null>(null);
  const [classifiedTbSortDirection, setClassifiedTbSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  const [ruleForm, setRuleForm] = useState({
    conditionType: 'Primary Group',
    conditionValue: '',
    h1: '',
    h2: '',
    h3: '',
    h4: '',
    h5: ''
  });
  
  // Filtered data for Actual TB
  const filteredActualData = useMemo(() => {
    let filtered = actualData;
    
    // UNIVERSAL SEARCH FILTER - Works on ALL columns including numeric
    const actualSearch = activeTab === 'actual-tb' ? searchTerm : '';
    if (actualSearch) {
      const searchLower = actualSearch.toLowerCase();
      filtered = filtered.filter(row => {
        // Build searchable string including ALL text and numeric columns
        const searchableString = [
          row['Ledger Name'] || '',
          row['Primary Group'] || '',
          row['Parent Group'] || '',
          // Include numeric columns as formatted strings
          (row['Opening Balance'] || 0).toString(),
          (row['Debit'] || 0).toString(),
          (row['Credit'] || 0).toString(),
          (row['Closing Balance'] || 0).toString()
        ].join('|').toLowerCase();
        
        return searchableString.includes(searchLower);
      });
    }
    
    // Group filter
    const appliedGroupFilter = activeTab === 'actual-tb' ? groupFilter : 'all';
    if (appliedGroupFilter !== 'all') {
      filtered = filtered.filter(row => (row['Primary Group'] || '') === appliedGroupFilter);
    }
    
    // Balance filter
    const appliedBalanceFilter = activeTab === 'actual-tb' ? balanceFilter : 'all';
    if (appliedBalanceFilter !== 'all') {
      filtered = filtered.filter(row => {
        const balance = row['Closing Balance'] || 0;
        if (appliedBalanceFilter === 'positive') return balance > 0;
        if (appliedBalanceFilter === 'negative') return balance < 0;
        if (appliedBalanceFilter === 'zero') return balance === 0;
        return true;
      });
    }
    
    // Apply column filters
    Object.entries(actualTbColumnFilters).forEach(([column, selectedValues]) => {
      if (selectedValues.size > 0) {
        filtered = filtered.filter(row => {
          const value = row[column as keyof LedgerRow];
          return selectedValues.has(value as string | number);
        });
      }
    });
    
    // Apply sorting
    if (actualTbSortColumn && actualTbSortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[actualTbSortColumn as keyof LedgerRow];
        const bVal = b[actualTbSortColumn as keyof LedgerRow];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return actualTbSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return actualTbSortDirection === 'asc' 
          ? aStr.localeCompare(bStr) 
          : bStr.localeCompare(aStr);
      });
    }
    
    return filtered;
  }, [actualData, searchTerm, groupFilter, balanceFilter, actualTbColumnFilters, actualTbSortColumn, actualTbSortDirection, activeTab]);
  
  // Filtered data for Classified TB
  const filteredData = useMemo(() => {
    let filtered = currentData;
    
    // UNIVERSAL SEARCH FILTER - Works on ALL columns including numeric
    const classifiedSearch = activeTab === 'classified-tb' ? searchTerm : '';
    if (classifiedSearch) {
      const searchLower = classifiedSearch.toLowerCase();
      filtered = filtered.filter(row => {
        // Build searchable string including ALL text and numeric columns
        const searchableString = [
          row['Ledger Name'] || '',
          row['Primary Group'] || '',
          row['Parent Group'] || '',
          row['H1'] || '',
          row['H2'] || '',
          row['H3'] || '',
          row['H4'] || '',
          row['H5'] || '',
          row['Status'] || '',
          // Include numeric columns as formatted strings
          (row['Opening Balance'] || 0).toString(),
          (row['Debit'] || 0).toString(),
          (row['Credit'] || 0).toString(),
          (row['Closing Balance'] || 0).toString()
        ].join('|').toLowerCase();
        
        return searchableString.includes(searchLower);
      });
    }
    
    // Status filter
    const appliedStatusFilter = activeTab === 'classified-tb' ? statusFilter : 'all';
    if (appliedStatusFilter !== 'all') {
      filtered = filtered.filter(row => (row['Status'] || 'Unmapped') === appliedStatusFilter);
    }
    
    // Apply column filters
    Object.entries(classifiedTbColumnFilters).forEach(([column, selectedValues]) => {
      if (selectedValues.size > 0) {
        filtered = filtered.filter(row => {
          const value = row[column as keyof LedgerRow];
          return selectedValues.has(value as string | number);
        });
      }
    });
    
    // Apply sorting
    if (classifiedTbSortColumn && classifiedTbSortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[classifiedTbSortColumn as keyof LedgerRow];
        const bVal = b[classifiedTbSortColumn as keyof LedgerRow];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return classifiedTbSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return classifiedTbSortDirection === 'asc' 
          ? aStr.localeCompare(bStr) 
          : bStr.localeCompare(aStr);
      });
    }
    
    return filtered;
  }, [currentData, searchTerm, statusFilter, classifiedTbColumnFilters, classifiedTbSortColumn, classifiedTbSortDirection, activeTab]);
  
  // Classification status counter
  const classificationStatus = useMemo(() => {
    const total = actualData.length; // Total rows in Actual TB
    const classified = currentData.filter(row => row.H1 && row.H1.trim() !== '').length; // Rows with H1 filled
    return {
      total,
      classified,
      unclassified: total - classified,
      percentageComplete: total > 0 ? Math.round((classified / total) * 100) : 0
    };
  }, [actualData, currentData]);
  
  // Selected rows that are in filtered view (for accurate bulk action count)
  const selectedFilteredCount = useMemo(() => {
    // Get indices of filtered rows
    const filteredIndices = new Set(
      filteredData.map(row => 
        currentData.findIndex(r => r['Composite Key'] === row['Composite Key'])
      ).filter(idx => idx !== -1)
    );
    
    // Count how many selected indices are in filtered set
    return Array.from(selectedRowIndices).filter(idx => filteredIndices.has(idx)).length;
  }, [selectedRowIndices, filteredData, currentData]);
  

  
  // Totals calculation - based on active tab
  const totals = useMemo(() => {
    if (activeTab === 'actual-tb') {
      // Calculate from actual TB filtered data
      return filteredActualData.reduce((acc, row) => {
        acc.opening += row['Opening Balance'] || 0;
        acc.debit += row['Debit'] || 0;
        acc.credit += row['Credit'] || 0;
        acc.closing += row['Closing Balance'] || 0;
        return acc;
      }, { opening: 0, debit: 0, credit: 0, closing: 0 });
    } else if (activeTab === 'stock-items') {
      // Use filtered stock totals from StockItemsTab
      return { 
        opening: stockTotals.opening, 
        debit: 0, 
        credit: 0, 
        closing: stockTotals.closing 
      };
    } else {
      // Default to classified TB filtered data
      return filteredData.reduce((acc, row) => {
        acc.opening += row['Opening Balance'] || 0;
        acc.debit += row['Debit'] || 0;
        acc.credit += row['Credit'] || 0;
        acc.closing += row['Closing Balance'] || 0;
        return acc;
      }, { opening: 0, debit: 0, credit: 0, closing: 0 });
    }
  }, [activeTab, filteredActualData, filteredData, stockTotals]);
  
  // Helper to get unique column values for filters
  const getActualTbColumnValues = useCallback((column: string) => {
    return actualData.map(row => row[column as keyof LedgerRow]).filter(v => v !== null && v !== undefined) as (string | number)[];
  }, [actualData]);
  
  const getClassifiedTbColumnValues = useCallback((column: string) => {
    return currentData.map(row => row[column as keyof LedgerRow]).filter(v => v !== null && v !== undefined) as (string | number)[];
  }, [currentData]);
  
  // Handlers for actual TB column filter changes
  const handleActualTbFilterChange = useCallback((column: string, values: Set<string | number>) => {
    setActualTbColumnFilters(prev => ({ ...prev, [column]: values }));
  }, []);
  
  const handleActualTbSort = useCallback((column: string, direction: 'asc' | 'desc' | null) => {
    setActualTbSortColumn(direction ? column : null);
    setActualTbSortDirection(direction);
  }, []);
  
  // Handlers for classified TB column filter changes
  const handleClassifiedTbFilterChange = useCallback((column: string, values: Set<string | number>) => {
    setClassifiedTbColumnFilters(prev => ({ ...prev, [column]: values }));
  }, []);
  
  const handleClassifiedTbSort = useCallback((column: string, direction: 'asc' | 'desc' | null) => {
    setClassifiedTbSortColumn(direction ? column : null);
    setClassifiedTbSortDirection(direction);
  }, []);
  
  // Connect to Tally
  const handleConnectTally = useCallback(async () => {
    if (!odbcConnection.isConnected) {
      const connected = await odbcConnection.testConnection();
      if (!connected) {
        return;
      }
    }
    
    // Set default stock items to true
    setIncludeStockItems(true);
    
    // Check if entity type is selected
    if (!entityType) {
      setIsEntityDialogOpen(true);
      return;
    }
    
    // Check if business type is selected
    if (!businessType) {
      setIsBusinessDialogOpen(true);
      return;
    }
    
    // If all checks passed, entity dialog should trigger the fetch
    setIsEntityDialogOpen(true);
  }, [odbcConnection, entityType, businessType]);
  
  // Fetch data from Tally after entity selection
  const handleFetchFromTally = useCallback(async (overrideEntityType?: string) => {
    const effectiveEntityType = overrideEntityType || entityType;
    const effectiveConstitution = getConstitutionFromEntityType(effectiveEntityType);

    if (!effectiveEntityType || !businessType) {
      toast({
        title: 'Setup Required',
        description: 'Please complete entity type and business type selection',
        variant: 'destructive'
      });
      return;
    }
    
    setIsFetching(true);
    try {
      const { data: lines, companyName } = await odbcConnection.fetchTrialBalance(fromDate, toDate);
      
      // Set company name
      if (companyName) {
        setEntityName(companyName);
      }
      
      if (!lines || lines.length === 0) {
        toast({
          title: 'No Data',
          description: 'No trial balance data found',
          variant: 'destructive'
        });
        setIsFetching(false);
        return;
      }
      
      // Convert to LedgerRow format and apply hard filter for Actual TB
      const processedData: LedgerRow[] = lines
        .map(line => ({
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
        }))
        .filter(row => {
          // HARD FILTER: Hide completely inactive ledgers (Opening=0 AND Debit=0 AND Credit=0 AND Closing=0)
          const opening = row['Opening Balance'] || 0;
          const debit = row['Debit'] || 0;
          const credit = row['Credit'] || 0;
          const closing = row['Closing Balance'] || 0;
          return !(opening === 0 && debit === 0 && credit === 0 && closing === 0);
        });
      
      // Store actual data (unclassified) - FILTERED DATA (no completely inactive ledgers)
      setActualData(processedData);
      
      // Classify ALL data (no filtering before classification)
      const classified = classifyDataframeBatch(processedData, savedMappings, businessType, effectiveConstitution);
      
      // VALIDATION: Log data integrity
      console.log(`[DATA INTEGRITY] Ingested: ${lines.length}, Processed: ${processedData.length}, Classified: ${classified.length}`);
      if (processedData.length !== classified.length) {
        console.error(`[CRITICAL] Data loss detected: ${processedData.length - classified.length} rows lost during classification`);
      }
      
      // Import directly based on selected period type
      if (importPeriodType === 'current') {
        setActualData(processedData);
        setCurrentData(classified);
      } else {
        setPreviousData(classified);
      }
      
      // Fetch stock items if required
      if (includeStockItems && (businessType === 'Trading - Wholesale and Retail' || businessType === 'Manufacturing')) {
        try {
          const stockItems = await odbcConnection.fetchStockItems();
          const transformedStockItems = stockItems.map((item: any) => ({
            'Item Name': item['Item Name'] || '',
            'Stock Group': item['Stock Group'] || '',
            'Primary Group': item['Primary Group'] || '',
            'Opening Value': parseFloat(item['Opening Value'] || 0),
            'Closing Value': parseFloat(item['Closing Value'] || 0),
            'Stock Category': item['Stock Category'] || '',
            'Composite Key': item['Composite Key'] || `STOCK|${item['Item Name']}`
          }));
          setCurrentStockData(transformedStockItems);
        } catch (error) {
          console.error('Failed to fetch stock items:', error);
        }
      }
      
      // Save to database if engagement exists
      if (currentEngagement?.id) {
        const dbLines: TrialBalanceLineInput[] = classified.map(row => ({
          account_code: row['Composite Key'] || '',
          account_name: row['Ledger Name'] || '',
          ledger_parent: row['Parent Group'] || row['Primary Group'] || null,
          ledger_primary_group: row['Primary Group'] || null,
          opening_balance: row['Opening Balance'] || 0,
          debit: row['Debit'] || 0,
          credit: row['Credit'] || 0,
          closing_balance: row['Closing Balance'] || 0,
          line_item_h1: row['H1'] || null,
          line_item_h2: row['H2'] || null,
          line_item_h3: row['H3'] || null,
          line_item_h4: row['H4'] || null,
          line_item_h5: row['H5'] || null,
          is_revenue: row['Is Revenue'] === 'Yes',
          engagement_id: currentEngagement.id,
          user_id: currentEngagement.created_by || '',
          period: importPeriodType,
          period_end_date: toDate,
          sheet_name: 'TB CY'
        }));

        await trialBalanceDB.importLines(dbLines, false);
      }
      
      setIsFetching(false);
      setIsEntityDialogOpen(false);
      
      toast({
        title: 'Import Successful',
        description: `Imported ${classified.length} ledgers as ${importPeriodType} period`,
      });
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch from Tally',
        variant: 'destructive'
      });
      setIsFetching(false);
      setIsEntityDialogOpen(false);
    }
  }, [entityType, businessType, fromDate, toDate, odbcConnection, savedMappings, importPeriodType, currentEngagement, trialBalanceDB, toast]);

  // Save only entity type override and optionally re-run classification
  const handleSaveEntityType = useCallback(async () => {
    if (!entityTypeDraft) {
      toast({
        title: 'Entity type required',
        description: 'Please select an entity type to continue',
        variant: 'destructive',
      });
      return;
    }

    const newConstitution = getConstitutionFromEntityType(entityTypeDraft);
    const hasData = currentData.length > 0 || previousData.length > 0;
    let proceed = true;

    if (hasData) {
      proceed = window.confirm('Update entity type and re-run classification on the loaded trial balance? This may change note visibility.');
    }

    setEntityType(entityTypeDraft);

    if (proceed && currentData.length > 0 && actualData.length > 0) {
      const reclassified = classifyDataframeBatch(actualData, savedMappings, businessType, newConstitution);
      setCurrentData(reclassified);
      toast({
        title: 'Entity updated',
        description: 'Entity type overridden and classifications refreshed.',
      });
    } else {
      toast({
        title: 'Entity updated',
        description: 'Entity type overridden. Re-run classification when ready.',
      });
    }

    setIsEntityDialogOpen(false);
  }, [entityTypeDraft, currentData.length, previousData.length, actualData, savedMappings, businessType, toast]);
  
  // Handle period selection confirmation
  const handlePeriodConfirm = useCallback(async () => {
    if (!pendingImportData) return;
    
    if (importPeriodType === 'current') {
      setCurrentData(pendingImportData);
    } else {
      setPreviousData(pendingImportData);
    }
    
    // Save to database
    if (currentEngagement?.id) {
      const dbLines: TrialBalanceLineInput[] = pendingImportData.map(row => ({
        account_code: row['Composite Key'] || '',
        account_name: row['Ledger Name'] || '',
        ledger_parent: row['Parent Group'] || row['Primary Group'] || null,
        ledger_primary_group: row['Primary Group'] || null,
        opening_balance: row['Opening Balance'] || 0,
        debit: row['Debit'] || 0,
        credit: row['Credit'] || 0,
        closing_balance: row['Closing Balance'] || 0,
        balance_type: getActualBalanceSign(row),
        period_type: importPeriodType,
        period_ending: toDate || null,
        face_group: row.H1 || null,
        note_group: row.H2 || null,
        sub_note: row.H3 || null,
        level4_group: row.H4 || null,
        level5_detail: row.H5 || null,
      }));
      
      await trialBalanceDB.importLines(dbLines, false);
    }
    
    // Fetch stock items if required
    if (includeStockItems && (businessType === 'Trading' || businessType === 'Manufacturing')) {
      try {
        const stockItems = await odbcConnection.fetchStockItems();
        const transformedStockItems = stockItems.map((item: any) => ({
          'Item Name': item['Item Name'] || '',
          'Stock Group': item['Stock Group'] || '',
          'Primary Group': item['Primary Group'] || '',
          'Opening Value': parseFloat(item['Opening Value'] || 0),
          'Closing Value': parseFloat(item['Closing Value'] || 0),
          'Stock Category': item['Stock Category'] || '',
          'Composite Key': item['Composite Key'] || `STOCK|${item['Item Name']}`
        }));
        setCurrentStockData(transformedStockItems);
      } catch (error) {
        console.error('Failed to fetch stock items:', error);
      }
    }
    
    toast({
      title: 'Success',
      description: `Imported ${pendingImportData.length} ledgers as ${importPeriodType === 'current' ? 'Current' : 'Previous'} Period`
    });
    
    setPendingImportData(null);
    setIsPeriodDialogOpen(false);
  }, [pendingImportData, importPeriodType, currentEngagement?.id, toDate, includeStockItems, businessType, odbcConnection, trialBalanceDB, toast]);
  
  // Handle adding a new line item
  const handleAddLineItem = useCallback(() => {
    const newLine: LedgerRow = {
      'Ledger Name': newLineForm.ledgerName,
      'Primary Group': newLineForm.primaryGroup,
      'Parent Group': '',
      'Composite Key': generateLedgerKey(newLineForm.ledgerName, newLineForm.primaryGroup),
      'Opening Balance': newLineForm.openingBalance,
      'Debit': newLineForm.debit,
      'Credit': newLineForm.credit,
      'Closing Balance': newLineForm.closingBalance,
      'Is Revenue': 'No',
      'Sheet Name': newLineForm.periodType === 'current' ? 'TB CY' : 'TB PY',
      'H1': '',
      'H2': '',
      'H3': '',
      'H4': '',
      'H5': '',
      'Status': 'Unmapped'
    };
    
    // Classify the new line
    let classified = classifyDataframeBatch([newLine], savedMappings, businessType, constitution);
    
    // Apply automatic H1 and H2 classification
    classified = applyAutoH1H2Classification(classified);
    
    if (newLineForm.periodType === 'current') {
      setCurrentData(prev => [...prev, classified[0]]);
    } else {
      setPreviousData(prev => [...prev, classified[0]]);
    }
    
    toast({
      title: 'Line Added',
      description: `Added "${newLineForm.ledgerName}" to ${newLineForm.periodType === 'current' ? 'Current' : 'Previous'} Period`
    });
    
    // Reset form
    setNewLineForm({
      ledgerName: '',
      primaryGroup: '',
      openingBalance: 0,
      debit: 0,
      credit: 0,
      closingBalance: 0,
      periodType: 'current'
    });
    setIsAddLineDialogOpen(false);
  }, [newLineForm, savedMappings, businessType, toast]);
  
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
    
    let classified = classifyDataframeBatch(currentData, savedMappings, businessType, constitution);
    
    // Apply automatic H1 and H2 classification
    classified = applyAutoH1H2Classification(classified);
    
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
      
      if (event?.shiftKey && lastSelectedIndex !== -1) {
        // SHIFT+CLICK: Range selection from last selected to current
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          newSet.add(i);
        }
      } else {
        // REGULAR CLICK: Toggle single row selection
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
      }
      
      return newSet;
    });
    
    // Update last selected index for shift+click
    setLastSelectedIndex(index);
  }, [lastSelectedIndex]);

  // Excel-like keyboard navigation
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const [focusedClassifiedRowIndex, setFocusedClassifiedRowIndex] = useState<number | null>(null);
  
  // Load default rules and engagement-specific rules on mount
  useEffect(() => {
    // Initialize with default rules
    const defaultMappings: Record<string, ClassificationResult> = {};
    
    // Convert DEFAULT_GROUP_RULES to mapping format
    DEFAULT_GROUP_RULES.forEach(rule => {
      const key = `${rule.tallyGroupName}`;
      defaultMappings[key] = {
        h1: rule.mapsToCode.split('-')[0] || '',
        h2: rule.mapsToCode.split('-')[1] || '',
        h3: rule.mapsToCode.split('-')[2] || '',
        h4: rule.mapsToCode.split('-')[3] || '',
        h5: rule.mapsToCode.split('-')[4] || '',
        compositeKey: `${rule.tallyGroupName}_DEFAULT`,
        confidence: 'High'
      };
    });
    
    // Load engagement-specific rules if available
    if (currentEngagement?.id) {
      const savedTemplateKey = `trialbalance_rules_${currentEngagement.id}`;
      const savedTemplate = localStorage.getItem(savedTemplateKey);
      if (savedTemplate) {
        try {
          const parsed = JSON.parse(savedTemplate);
          setSavedMappings({ ...defaultMappings, ...parsed });
        } catch (error) {
          console.error('Failed to parse saved rules:', error);
          setSavedMappings(defaultMappings);
        }
      } else {
        setSavedMappings(defaultMappings);
      }
    } else {
      setSavedMappings(defaultMappings);
    }
  }, [currentEngagement?.id]);

  // Reset local state buckets when engagement switches to prevent bleed across clients
  useEffect(() => {
    setActualData([]);
    setCurrentData([]);
    setCurrentStockData([]);
  }, [currentEngagement?.id]);
  
  // Load data from cache/database when engagement changes
  useEffect(() => {
    if (!currentEngagement?.id) return;
    
    // Load saved entity info from localStorage
    const savedEntityInfo = localStorage.getItem(`tb_entity_${currentEngagement.id}`);
    if (savedEntityInfo) {
      try {
        const { entityType: savedEntityType, entityName: savedEntityName, businessType: savedBusinessType } = JSON.parse(savedEntityInfo);
        if (savedEntityType) setEntityType(savedEntityType);
        if (savedEntityName) setEntityName(savedEntityName);
        if (savedBusinessType) setBusinessType(savedBusinessType);
      } catch (e) {
        console.error('Failed to load entity info:', e);
      }
    }
    
    // Load saved stock data from localStorage
    const savedStockData = localStorage.getItem(`tb_stock_${currentEngagement.id}`);
    if (savedStockData) {
      try {
        const parsedStock = JSON.parse(savedStockData);
        if (Array.isArray(parsedStock) && parsedStock.length > 0) {
          setCurrentStockData(parsedStock);
        }
      } catch (e) {
        console.error('Failed to load stock data:', e);
      }
    }

    // Load Actual TB from localStorage
    const savedActual = localStorage.getItem(`tb_actual_${currentEngagement.id}`);
    let hydrated = false;
    if (savedActual) {
      try {
        const parsedActual = JSON.parse(savedActual);
        if (Array.isArray(parsedActual) && parsedActual.length > 0) {
          setActualData(parsedActual);
          hydrated = true;
        }
      } catch (e) {
        console.error('Failed to load actual TB:', e);
      }
    }

    // Load Classified TB from localStorage
    const savedClassified = localStorage.getItem(`tb_classified_${currentEngagement.id}`);
    if (savedClassified) {
      try {
        const parsedClassified = JSON.parse(savedClassified);
        if (Array.isArray(parsedClassified) && parsedClassified.length > 0) {
          setCurrentData(parsedClassified);
          hydrated = true;
        }
      } catch (e) {
        console.error('Failed to load classified TB:', e);
      }
    }
    
    // Fallback to database if nothing in local cache
    if (!hydrated && trialBalanceDB.lines && trialBalanceDB.lines.length > 0) {
      const loadedData: LedgerRow[] = trialBalanceDB.lines.map(line => ({
        'Ledger Name': line.account_name,
        'Primary Group': line.ledger_primary_group || '',
        'Parent Group': line.ledger_parent || '',
        'Composite Key': line.account_code,
        'Opening Balance': line.opening_balance,
        'Debit': line.debit,
        'Credit': line.credit,
        'Closing Balance': line.closing_balance,
        'Is Revenue': line.aile === 'Income' || line.aile === 'Expense' ? 'Yes' : 'No',
        'Sheet Name': 'TB CY',
        'H1': line.face_group || '',
        'H2': line.note_group || '',
        'H3': line.sub_note || '',
        'H4': line.level4_group || '',
        'H5': line.level5_detail || '',
        'Status': (line.face_group || line.note_group) ? 'Mapped' : 'Unmapped'
      }));
      
      setActualData(loadedData);
      setCurrentData(loadedData);
      
      toast({
        title: 'Data Loaded',
        description: `Loaded ${loadedData.length} ledgers from saved data`,
      });
    }
  }, [currentEngagement?.id, trialBalanceDB.lines]);
  
  // Save entity info to localStorage when it changes
  useEffect(() => {
    if (!currentEngagement?.id) return;
    if (entityType || entityName || businessType) {
      localStorage.setItem(`tb_entity_${currentEngagement.id}`, JSON.stringify({
        entityType,
        entityName,
        businessType
      }));
    }
  }, [currentEngagement?.id, entityType, entityName, businessType]);

  // Persist Actual TB per engagement
  useEffect(() => {
    if (!currentEngagement?.id) return;
    localStorage.setItem(`tb_actual_${currentEngagement.id}`, JSON.stringify(actualData));
  }, [actualData, currentEngagement?.id]);

  // Persist Classified TB per engagement
  useEffect(() => {
    if (!currentEngagement?.id) return;
    localStorage.setItem(`tb_classified_${currentEngagement.id}`, JSON.stringify(currentData));
  }, [currentData, currentEngagement?.id]);
  
  // Save stock data to localStorage when it changes
  useEffect(() => {
    if (!currentEngagement?.id) return;
    if (currentStockData.length > 0) {
      localStorage.setItem(`tb_stock_${currentEngagement.id}`, JSON.stringify(currentStockData));
    }
  }, [currentEngagement?.id, currentStockData]);
  
  // Auto-save currentData to database when it changes (debounced)
  useEffect(() => {
    if (!currentEngagement?.id || currentData.length === 0) return;
    
    // Skip if this is just loaded data (already in database)
    if (trialBalanceDB.loading) return;
    
    // Debounce the save operation
    let cancelled = false;
    const saveTimeout = setTimeout(async () => {
      if (cancelled) return;
      try {
        const dbLines: TrialBalanceLineInput[] = currentData.map(row => ({
          account_code: row['Composite Key'] || '',
          account_name: row['Ledger Name'] || '',
          ledger_parent: row['Parent Group'] || row['Primary Group'] || null,
          ledger_primary_group: row['Primary Group'] || null,
          opening_balance: row['Opening Balance'] || 0,
          debit: row['Debit'] || 0,
          credit: row['Credit'] || 0,
          closing_balance: row['Closing Balance'] || 0,
          balance_type: getActualBalanceSign(row),
          period_type: 'current',
          period_ending: toDate || null,
          face_group: row['H1'] || null,
          note_group: row['H2'] || null,
          sub_note: row['H3'] || null,
          level4_group: row['H4'] || null,
          level5_detail: row['H5'] || null,
        }));
        
        // Use upsert mode to avoid duplicates
        await trialBalanceDB.importLines(dbLines, true, false);
        console.log('Auto-saved trial balance data');
      } catch (error) {
        console.error('Failed to auto-save trial balance:', error);
      }
    }, 2000); // 2 second debounce
    
    return () => {
      cancelled = true;
      clearTimeout(saveTimeout);
    };
  }, [currentData, currentEngagement?.id, toDate]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Handle keyboard navigation based on active tab
      if (activeTab === 'actual-tb' && filteredData.length > 0) {
        // ACTUAL TB Navigation
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
      } else if (activeTab === 'classified-tb' && currentData.length > 0) {
        // CLASSIFIED TB Navigation with Spacebar support
        if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setFocusedClassifiedRowIndex(prev => {
            const current = prev !== null ? prev : -1;
            const next = Math.min(current + 1, currentData.length - 1);
            if (!e.shiftKey) {
              setSelectedRowIndices(new Set([next]));
            }
            return next;
          });
        } else if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setFocusedClassifiedRowIndex(prev => {
            const current = prev !== null ? prev : currentData.length;
            const next = Math.max(current - 1, 0);
            if (!e.shiftKey) {
              setSelectedRowIndices(new Set([next]));
            }
            return next;
          });
        } else if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          if (focusedClassifiedRowIndex !== null && focusedClassifiedRowIndex >= 0) {
            setSelectedRowIndices(prev => {
              const newSet = new Set(prev);
              if (newSet.has(focusedClassifiedRowIndex)) {
                newSet.delete(focusedClassifiedRowIndex);
              } else {
                newSet.add(focusedClassifiedRowIndex);
              }
              return newSet;
            });
          }
        } else if (e.key === 'Home' && e.ctrlKey) {
          e.preventDefault();
          setFocusedClassifiedRowIndex(0);
          setSelectedRowIndices(new Set([0]));
        } else if (e.key === 'End' && e.ctrlKey) {
          e.preventDefault();
          const lastIndex = currentData.length - 1;
          setFocusedClassifiedRowIndex(lastIndex);
          setSelectedRowIndices(new Set([lastIndex]));
        } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setSelectedRowIndices(new Set(currentData.map((_, i) => i)));
        } else if (e.key === 'Enter' && focusedClassifiedRowIndex !== null) {
          e.preventDefault();
          // Open single edit dialog for focused row
          const ledger = currentData[focusedClassifiedRowIndex];
          if (ledger) {
            setEditingLedger(ledger);
            setEditingLedgerIndex(focusedClassifiedRowIndex);
            setIsSingleEditDialogOpen(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredData, currentData, activeTab, focusedClassifiedRowIndex]);
  
  // Format number for display
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Export Template for Excel Import
  const handleExportTemplate = useCallback(() => {
    try {
      const templateData = [
        {
          'Ledger Name': 'Cash',
          'Primary Group': 'Cash-in-Hand',
          'Parent Group': 'Current Assets',
          'Opening Balance': 50000,
          'Debit': 200000,
          'Credit': 150000,
          'Closing Balance': 100000,
          'Is Revenue': 'No',
          'Sheet Name': 'TB CY'
        },
        {
          'Ledger Name': 'Sales',
          'Primary Group': 'Sales Accounts',
          'Parent Group': 'Primary',
          'Opening Balance': 0,
          'Debit': 0,
          'Credit': 500000,
          'Closing Balance': -500000,
          'Is Revenue': 'Yes',
          'Sheet Name': 'TB CY'
        },
        {
          'Ledger Name': 'Purchase',
          'Primary Group': 'Purchase Accounts',
          'Parent Group': 'Primary',
          'Opening Balance': 0,
          'Debit': 300000,
          'Credit': 0,
          'Closing Balance': 300000,
          'Is Revenue': 'No',
          'Sheet Name': 'TB CY'
        }
      ];
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 30 }, // Ledger Name
        { wch: 20 }, // Primary Group
        { wch: 20 }, // Parent Group
        { wch: 15 }, // Opening Balance
        { wch: 15 }, // Debit
        { wch: 15 }, // Credit
        { wch: 15 }, // Closing Balance
        { wch: 12 }, // Is Revenue
        { wch: 12 }  // Sheet Name
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance Template');
      
      // Add instructions sheet
      const instructions = [
        { 'Column Name': 'Ledger Name', 'Description': 'Name of the ledger account', 'Required': 'Yes', 'Example': 'Cash, Bank, Sales, Purchase' },
        { 'Column Name': 'Primary Group', 'Description': 'Primary group from Tally', 'Required': 'Yes', 'Example': 'Current Assets, Sales Accounts' },
        { 'Column Name': 'Parent Group', 'Description': 'Parent of the primary group', 'Required': 'No', 'Example': 'Primary, Current Assets' },
        { 'Column Name': 'Opening Balance', 'Description': 'Opening balance (numeric)', 'Required': 'Yes', 'Example': '50000, -20000' },
        { 'Column Name': 'Debit', 'Description': 'Total debit amount', 'Required': 'Yes', 'Example': '100000' },
        { 'Column Name': 'Credit', 'Description': 'Total credit amount', 'Required': 'Yes', 'Example': '50000' },
        { 'Column Name': 'Closing Balance', 'Description': 'Closing balance (numeric)', 'Required': 'Yes', 'Example': '100000, -75000' },
        { 'Column Name': 'Is Revenue', 'Description': 'Whether this is a revenue account', 'Required': 'No', 'Example': 'Yes, No' },
        { 'Column Name': 'Sheet Name', 'Description': 'Always use "TB CY" for current year', 'Required': 'Yes', 'Example': 'TB CY' }
      ];
      
      const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
      instructionsSheet['!cols'] = [
        { wch: 20 },
        { wch: 50 },
        { wch: 10 },
        { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
      
      XLSX.writeFile(workbook, 'Trial_Balance_Import_Template.xlsx');
      
      toast({
        title: 'Template Downloaded',
        description: 'Trial Balance import template has been downloaded. Fill it with your data and import.'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export template',
        variant: 'destructive'
      });
    }
  }, [toast]);
  
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
        
        const processedData: LedgerRow[] = jsonData
          .map((row: any) => ({
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
          }))
          .filter(row => {
            // Filter out rows where both opening and closing balances are 0
            return row['Opening Balance'] !== 0 || row['Closing Balance'] !== 0;
          });
        
        let classified = classifyDataframeBatch(processedData, savedMappings, businessType, constitution);
        
        // Apply automatic H1 and H2 classification
        classified = applyAutoH1H2Classification(classified);
        
        setCurrentData(classified);
        
        // Save to database
        if (currentEngagement?.id) {
          const dbLines: TrialBalanceLineInput[] = classified.map(row => ({
            account_code: row['Composite Key'] || '',
            account_name: row['Ledger Name'] || '',
            ledger_parent: row['Parent Group'] || row['Primary Group'] || null,
            ledger_primary_group: row['Primary Group'] || null,
            opening_balance: row['Opening Balance'] || 0,
            debit: row['Debit'] || 0,
            credit: row['Credit'] || 0,
            closing_balance: row['Closing Balance'] || 0,
            balance_type: getActualBalanceSign(row),
            period_type: 'current',
            period_ending: toDate || null,
            face_group: row.H1 || null,
            note_group: row.H2 || null,
            sub_note: row.H3 || null,
            level4_group: row.H4 || null,
            level5_detail: row.H5 || null,
          }));
          
          await trialBalanceDB.importLines(dbLines, false);
        }
        
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

  // Excel Export - Actual TB
  const handleExportActualTB = useCallback(() => {
    if (filteredActualData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No Actual TB data to export',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(filteredActualData);
      
      // Set column widths based on current widths
      worksheet['!cols'] = [
        { wch: actualTbColumnWidths['Ledger Name'] / 7 },
        { wch: actualTbColumnWidths['Primary Group'] / 7 },
        { wch: actualTbColumnWidths['Parent Group'] / 7 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];
      
      // Apply Calibri font size 10 to all cells
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = { c: C, r: R };
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          if (!worksheet[cell_ref]) continue;
          worksheet[cell_ref].s = {
            font: { name: 'Calibri', sz: 10 }
          };
        }
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Actual TB');
      
      // Generate filename with client name and timestamp
      const clientName = currentEngagement?.client_name || 'Unknown';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `TrialBalance_${clientName}_Actual_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: 'Export Successful',
        description: 'Actual TB exported to Excel'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive'
      });
    }
  }, [filteredActualData, actualTbColumnWidths, currentEngagement, toast]);
  
  // Excel Export - Classified TB
  const handleExportClassifiedTB = useCallback(() => {
    if (filteredData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No Classified TB data to export',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      
      // Set column widths based on current widths
      const colWidths = [
        { wch: classifiedTbColumnWidths['Ledger Name'] / 7 },
        { wch: classifiedTbColumnWidths['Primary Group'] / 7 },
        { wch: classifiedTbColumnWidths['Parent Group'] / 7 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
      ];
      worksheet['!cols'] = colWidths;
      
      // Apply Calibri font size 10 to all cells
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = { c: C, r: R };
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          if (!worksheet[cell_ref]) continue;
          worksheet[cell_ref].s = {
            font: { name: 'Calibri', sz: 10 }
          };
        }
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Classified TB');
      
      if (currentStockData.length > 0) {
        const stockWorksheet = XLSX.utils.json_to_sheet(currentStockData);
        // Apply same formatting to stock sheet
        const stockRange = XLSX.utils.decode_range(stockWorksheet['!ref'] || 'A1');
        for (let R = stockRange.s.r; R <= stockRange.e.r; ++R) {
          for (let C = stockRange.s.c; C <= stockRange.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (!stockWorksheet[cell_ref]) continue;
            stockWorksheet[cell_ref].s = {
              font: { name: 'Calibri', sz: 10 }
            };
          }
        }
        XLSX.utils.book_append_sheet(workbook, stockWorksheet, 'Stock Items');
      }
      
      // Generate filename with client name and timestamp
      const clientName = currentEngagement?.client_name || 'Unknown';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `TrialBalance_${clientName}_Classified_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: 'Export Successful',
        description: 'Classified TB exported to Excel'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive'
      });
    }
  }, [filteredData, currentStockData, classifiedTbColumnWidths, currentEngagement, toast]);

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

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setGroupFilter('all');
    setBalanceFilter('all');
  }, []);

  // Delete selected rows from the active grid (Actual or Classified)
  const handleDeleteSelected = useCallback(() => {
    if (selectedRowIndices.size === 0) {
      toast({ title: 'No selection', description: 'Select ledger rows to delete first.' });
      return;
    }

    const buildKey = (row: LedgerRow) => row['Composite Key'] || generateLedgerKey(row['Ledger Name'] || '', row['Parent Group'] || row['Primary Group'] || '');
    const source = activeTab === 'actual-tb' ? actualData : currentData;

    const selectedKeys = new Set(
      source
        .map((row, idx) => (selectedRowIndices.has(idx) ? buildKey(row) : null))
        .filter((key): key is string => Boolean(key))
    );

    if (selectedKeys.size === 0) {
      toast({ title: 'Nothing to delete', description: 'Could not resolve selected rows.' });
      return;
    }

    setActualData(prev => prev.filter(row => !selectedKeys.has(buildKey(row))));
    setCurrentData(prev => prev.filter(row => !selectedKeys.has(buildKey(row))));
    setSelectedRowIndices(new Set());

    toast({ title: 'Deleted', description: `${selectedKeys.size} row(s) removed from this engagement.` });
  }, [activeTab, actualData, currentData, selectedRowIndices, toast]);

  // Clear Data - clears both Actual TB and Classified TB
  const handleClear = useCallback(async () => {
    if (confirm('Are you sure you want to clear all data? This will clear both Actual TB and Classified TB.')) {
      try {
        // Delete from database if there are lines
        if (trialBalanceDB.lines && trialBalanceDB.lines.length > 0) {
          const lineIds = trialBalanceDB.lines.map(line => line.id);
          await trialBalanceDB.deleteLines(lineIds);
        }
        
        // Clear all state
        setActualData([]);
        setCurrentData([]);
        setCurrentStockData([]);
        setSelectedRowIndices(new Set());
        
        // Reset filters
        setSearchTerm('');
        setStatusFilter('all');
        setGroupFilter('all');
        setBalanceFilter('all');
        setActualTbColumnFilters({});
        setClassifiedTbColumnFilters({});

        // Clear engagement-scoped caches
        localStorage.removeItem(`tb_actual_${currentEngagement?.id}`);
        localStorage.removeItem(`tb_classified_${currentEngagement?.id}`);
        localStorage.removeItem(`tb_stock_${currentEngagement?.id}`);
        
        toast({
          title: 'Data Cleared',
          description: 'All Actual TB and Classified TB data has been cleared'
        });
      } catch (error) {
        console.error('Error clearing data:', error);
        toast({
          title: 'Error',
          description: 'Failed to clear data',
          variant: 'destructive'
        });
      }
    }
  }, [toast, trialBalanceDB]);
  
  // Rule Engine Handlers
  const handleAddRule = useCallback(() => {
    setEditingRuleKey(null);
    setRuleForm({
      conditionType: 'Primary Group',
      conditionValue: '',
      h1: '',
      h2: '',
      h3: '',
      h4: '',
      h5: ''
    });
    setIsRuleDialogOpen(true);
  }, []);
  
  const handleEditRule = useCallback((key: string, mapping: ClassificationResult) => {
    setEditingRuleKey(key);
    setRuleForm({
      conditionType: 'Primary Group',
      conditionValue: key.split('|')[1] || key,
      h1: mapping.h1 || '',
      h2: mapping.h2 || '',
      h3: mapping.h3 || '',
      h4: mapping.h4 || '',
      h5: mapping.h5 || ''
    });
    setIsRuleDialogOpen(true);
  }, []);
  
  const handleSaveRule = useCallback(() => {
    if (!ruleForm.conditionValue) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a condition value',
        variant: 'destructive'
      });
      return;
    }
    
    const key = `*|${ruleForm.conditionValue}`;
    const newMapping: ClassificationResult = {
      h1: ruleForm.h1,
      h2: ruleForm.h2,
      h3: ruleForm.h3,
      h4: ruleForm.h4,
      h5: ruleForm.h5,
      status: 'Mapped'
    };
    
    handleSaveMapping(key, newMapping);
    setIsRuleDialogOpen(false);
    
    toast({
      title: editingRuleKey ? 'Rule Updated' : 'Rule Added',
      description: `Classification rule ${editingRuleKey ? 'updated' : 'created'} successfully`
    });
  }, [ruleForm, editingRuleKey, handleSaveMapping, toast]);
  
  const handleImportRules = useCallback(() => {
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
        
        const newMappings: Record<string, ClassificationResult> = {};
        jsonData.forEach((row: any) => {
          const key = `*|${row['Condition Value'] || row['condition_value'] || ''}`;
          if (key !== '*|') {
            newMappings[key] = {
              h1: row['H1'] || '',
              h2: row['H2'] || '',
              h3: row['H3'] || '',
              h4: row['H4'] || '',
              h5: row['H5'] || '',
              status: 'Mapped'
            };
          }
        });
        
        setSavedMappings(prev => ({ ...prev, ...newMappings }));
        
        toast({
          title: 'Import Successful',
          description: `Imported ${Object.keys(newMappings).length} rules from Excel`
        });
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: error instanceof Error ? error.message : 'Failed to import rules',
          variant: 'destructive'
        });
      }
    };
    input.click();
  }, [toast]);
  
  const handleExportRules = useCallback(() => {
    if (Object.keys(savedMappings).length === 0) {
      toast({
        title: 'No Rules',
        description: 'No rules to export',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const rulesData = Object.entries(savedMappings).map(([key, mapping]) => ({
        'Condition Type': 'Primary Group',
        'Condition Value': key.split('|')[1] || key,
        'H1': mapping.h1 || '',
        'H2': mapping.h2 || '',
        'H3': mapping.h3 || '',
        'H4': mapping.h4 || '',
        'H5': mapping.h5 || ''
      }));
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rulesData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Classification Rules');
      XLSX.writeFile(workbook, `Classification_Rules_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: 'Export Successful',
        description: `Exported ${rulesData.length} rules to Excel`
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export rules',
        variant: 'destructive'
      });
    }
  }, [savedMappings, toast]);
  
  // Save Rule Template
  const handleSaveRuleTemplate = useCallback(() => {
    if (!ruleTemplateName.trim()) {
      toast({
        title: 'Template Name Required',
        description: 'Please enter a name for this rule template',
        variant: 'destructive'
      });
      return;
    }
    
    if (currentEngagement?.id) {
      try {
        const templateKey = `trialbalance_rules_${currentEngagement.id}`;
        localStorage.setItem(templateKey, JSON.stringify(savedMappings));
        
        // Save template metadata
        const metadataKey = `trialbalance_rules_metadata_${currentEngagement.id}`;
        const metadata = {
          name: ruleTemplateName,
          savedAt: new Date().toISOString(),
          engagementId: currentEngagement.id,
          engagementName: currentEngagement.client_name
        };
        localStorage.setItem(metadataKey, JSON.stringify(metadata));
        
        toast({
          title: 'Template Saved',
          description: `Rule template "${ruleTemplateName}" saved successfully`
        });
        
        setIsRuleTemplateDialogOpen(false);
        setRuleTemplateName('');
      } catch (error) {
        toast({
          title: 'Save Failed',
          description: error instanceof Error ? error.message : 'Failed to save rule template',
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: 'No Engagement',
        description: 'Please select an engagement first',
        variant: 'destructive'
      });
    }
  }, [ruleTemplateName, currentEngagement, savedMappings, toast]);
  
  // Modified handleClear to prompt for saving rules first
  const handleClearWithConfirmation = useCallback(() => {
    setIsResetConfirmDialogOpen(true);
  }, []);
  
  const handleConfirmReset = useCallback((saveTemplate: boolean) => {
    if (saveTemplate) {
      setIsResetConfirmDialogOpen(false);
      setIsRuleTemplateDialogOpen(true);
    } else {
      setCurrentData([]);
      setCurrentStockData([]);
      setIsResetConfirmDialogOpen(false);
      toast({
        title: 'Data Cleared',
        description: 'All data has been cleared'
      });
    }
  }, [toast]);

  // Helper function to safely format dates
  const formatDateRange = useCallback(() => {
    try {
      if (!fromDate || !toDate) return 'Set Date Range';
      
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      const fromStr = from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const toStr = to.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      
      return `${fromStr} - ${toStr}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date Range';
    }
  }, [fromDate, toDate]);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Consolidated Header - Two Compact Rows */}
      
      {/* Row 1: Actions + Date + Status */}
      <div className="flex items-center justify-between px-2 py-1 bg-white border-b" style={{ minHeight: '32px' }}>
        {/* Left: Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                <Upload className="w-3 h-3 mr-1.5" />
                Import
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleConnectTally} disabled={isFetching || odbcConnection.isConnecting}>
                <Database className="w-3 h-3 mr-2" />
                {isFetching || odbcConnection.isConnecting ? 'Connecting...' : 'From Tally (ODBC)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExcelImport}>
                <Upload className="w-3 h-3 mr-2" />
                From Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportTemplate}>
                <Download className="w-3 h-3 mr-2" />
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auto-Classify */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoClassify}
            disabled={currentData.length === 0}
            className="h-8"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Auto-Classify
          </Button>

          {/* Update (with count) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedFilteredCount === 0) {
                toast({
                  title: 'No Selection',
                  description: 'Please select visible filtered rows to update',
                  variant: 'destructive'
                });
                return;
              }
              setIsBulkUpdateDialogOpen(true);
            }}
            disabled={currentData.length === 0 || selectedFilteredCount === 0}
            className="h-8"
          >
            <Settings className="w-3 h-3 mr-1.5" />
            Update {selectedFilteredCount > 0 && `(${selectedFilteredCount})`}
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={currentData.length === 0}
                className="h-8"
              >
                <Download className="w-3 h-3 mr-1.5" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setIsSigningDialogOpen(true)}>
                <FileText className="w-3 h-3 mr-2" />
                Generate Financial Statements
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportActualTB}>
                <Download className="w-3 h-3 mr-2" />
                Export Actual TB to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportClassifiedTB}>
                <Download className="w-3 h-3 mr-2" />
                Export Classified TB to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center: Date Range */}
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded border text-sm">
          <Calendar className="w-3 h-3 text-gray-500" />
          <Dialog>
            <DialogTrigger asChild>
              <button className="font-medium text-gray-700 hover:text-blue-600">
                {formatDateRange()}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Financial Year Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Right: Tally Status + Settings */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium",
            odbcConnection.isConnected 
              ? "bg-green-50 text-green-700" 
              : "bg-gray-100 text-gray-500"
          )}>
            <Database className="w-3 h-3" />
            {odbcConnection.isConnected ? 'Tally Connected' : 'Not Connected'}
          </div>

          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsEntityDialogOpen(true)}>
                <Cog className="w-4 h-4 mr-2" />
                Configure Entity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsClassificationManagerOpen(true)} disabled={currentData.length === 0}>
                <Settings className="w-4 h-4 mr-2" />
                Classification Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSave} disabled={currentData.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                Save Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleClearWithConfirmation} 
                disabled={currentData.length === 0}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Filter Bar */}
        <div className="flex items-center gap-2 px-2 py-1 bg-white border-b" style={{ minHeight: '32px' }}>
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search ledgers, groups, classifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-6 pl-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchTerm('');
                }
              }}
            />
          </div>

          {/* Filter Button with Active Count */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterModalOpen(true)}
            className="h-9"
          >
            <Settings className="w-4 h-4 mr-2" />
            Filters
            {(() => {
              const activeCount = [
                statusFilter !== 'all',
                groupFilter !== 'all',
                balanceFilter !== 'all',
              ].filter(Boolean).length;
              return activeCount > 0 ? (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {activeCount}
                </Badge>
              ) : null;
            })()}
          </Button>

          {/* Active Filter Chips */}
          <div className="flex items-center gap-2 flex-1">
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>

          {/* Selection Info & Add Line */}
          <div className="flex items-center gap-2">
            {selectedFilteredCount > 0 && (
              <Badge variant="default" className="h-9 px-3">
                {selectedFilteredCount} of {filteredData.length} selected
              </Badge>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsAddLineDialogOpen(true)}
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-1" />
              {activeTab === 'stock-items' ? 'Add Item' : 'Add Ledger'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelected}
              className="h-9"
              disabled={selectedRowIndices.size === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </Button>
          </div>
        </div>
        
        {/* Totals Bar */}
        <div className="flex items-center justify-end gap-4 px-2 py-0.5 bg-gray-50 border-b text-[10px]" style={{ minHeight: '20px' }}>
          <span className="text-muted-foreground">Opening: <strong className="text-foreground font-semibold">{formatNumber(totals.opening)}</strong></span>
          <span className="text-muted-foreground">Debit: <strong className="text-foreground font-semibold">{formatNumber(totals.debit)}</strong></span>
          <span className="text-muted-foreground">Credit: <strong className="text-foreground font-semibold">{formatNumber(totals.credit)}</strong></span>
          <span className="text-muted-foreground">Closing: <strong className="text-foreground font-semibold">{formatNumber(totals.closing)}</strong></span>
        </div>
      
        {/* Modern Tabs Navigation */}
        <div className="bg-white border-b py-0.5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-6 bg-transparent border-b-0 px-2 gap-0 rounded-none justify-start">
              <TabsTrigger 
                value="actual-tb"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 px-2 py-0"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Actual TB
              </TabsTrigger>
              <TabsTrigger 
                value="classified-tb"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Classified TB
              </TabsTrigger>
              <TabsTrigger 
                value="stock-items"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
              >
                <Package className="w-3 h-3 mr-1" />
                Stock Items
                {stockItemCount.total > 0 && (
                  <span className="ml-1 text-[10px] text-gray-500">
                    ({stockItemCount.filtered}/{stockItemCount.total})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
              >
                <FileText className="w-3 h-3 mr-1" />
                Financial Statements
              </TabsTrigger>
              <TabsTrigger 
                value="exceptions"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Exception Report
              </TabsTrigger>
              <TabsTrigger 
                value="notes"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
              >
                <FileText className="w-3 h-3 mr-1" />
                Notes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area - Maximized for table display */}
        <div className="flex-1 overflow-auto" style={{ height: 'calc(100vh - 160px)' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            
            {/* ACTUAL TRIAL BALANCE TAB */}
            <TabsContent value="actual-tb" className="mt-0 p-1">
              <div className="border rounded overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-8 sticky top-0 bg-white" style={{ left: actualStickyOffsets.selection, zIndex: 20 }}>
                    <input
                      type="checkbox"
                      checked={selectedRowIndices.size === actualData.length && actualData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowIndices(new Set(actualData.map((_, i) => i)));
                        } else {
                          setSelectedRowIndices(new Set());
                        }
                      }}
                      title="Select All / Deselect All"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: 200, left: actualStickyOffsets.ledger, zIndex: 19 }}>
                    <div className="flex items-center gap-1">
                      Ledger Name
                      <ColumnFilter
                        column="Ledger Name"
                        values={getActualTbColumnValues('Ledger Name')}
                        selectedValues={actualTbColumnFilters['Ledger Name'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Ledger Name', values)}
                        sortDirection={actualTbSortColumn === 'Ledger Name' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Ledger Name', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Ledger Name', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="top-0 bg-white relative" style={{ width: actualTbColumnWidths['Parent Group'] }}>
                    <div className="flex items-center gap-1">
                      Parent Group
                      <ColumnFilter
                        column="Parent Group"
                        values={getActualTbColumnValues('Parent Group')}
                        selectedValues={actualTbColumnFilters['Parent Group'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Parent Group', values)}
                        sortDirection={actualTbSortColumn === 'Parent Group' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Parent Group', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Parent Group', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="top-0 bg-white relative" style={{ width: actualTbColumnWidths['Primary Group'] }}>
                    <div className="flex items-center gap-1">
                      Primary Group
                      <ColumnFilter
                        column="Primary Group"
                        values={getActualTbColumnValues('Primary Group')}
                        selectedValues={actualTbColumnFilters['Primary Group'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Primary Group', values)}
                        sortDirection={actualTbSortColumn === 'Primary Group' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Primary Group', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Primary Group', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: actualTbColumnWidths['Opening Balance'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Opening
                      <ColumnFilter
                        column="Opening Balance"
                        values={getActualTbColumnValues('Opening Balance')}
                        selectedValues={actualTbColumnFilters['Opening Balance'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Opening Balance', values)}
                        sortDirection={actualTbSortColumn === 'Opening Balance' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Opening Balance', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Opening Balance', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: actualTbColumnWidths['Debit'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Debit
                      <ColumnFilter
                        column="Debit"
                        values={getActualTbColumnValues('Debit')}
                        selectedValues={actualTbColumnFilters['Debit'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Debit', values)}
                        sortDirection={actualTbSortColumn === 'Debit' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Debit', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Debit', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: actualTbColumnWidths['Credit'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Credit
                      <ColumnFilter
                        column="Credit"
                        values={getActualTbColumnValues('Credit')}
                        selectedValues={actualTbColumnFilters['Credit'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Credit', values)}
                        sortDirection={actualTbSortColumn === 'Credit' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Credit', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Credit', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: actualTbColumnWidths['Closing Balance'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Closing
                      <ColumnFilter
                        column="Closing Balance"
                        values={getActualTbColumnValues('Closing Balance')}
                        selectedValues={actualTbColumnFilters['Closing Balance'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Closing Balance', values)}
                        sortDirection={actualTbSortColumn === 'Closing Balance' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Closing Balance', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Closing Balance', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: actualTbColumnWidths['Is Revenue'] }}>
                    <div className="flex items-center gap-1">
                      Is Revenue
                      <ColumnFilter
                        column="Is Revenue"
                        values={getActualTbColumnValues('Is Revenue')}
                        selectedValues={actualTbColumnFilters['Is Revenue'] || new Set()}
                        onFilterChange={(values) => handleActualTbFilterChange('Is Revenue', values)}
                        sortDirection={actualTbSortColumn === 'Is Revenue' ? actualTbSortDirection : null}
                        onSort={(dir) => handleActualTbSort('Is Revenue', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => actualTbHandleMouseDown('Is Revenue', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActualData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No data loaded. Import from Tally or Excel to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActualData.map((row, index) => {
                    const originalIndex = actualData.findIndex(r => 
                      r['Composite Key'] === row['Composite Key']
                    );
                    const isSelected = originalIndex !== -1 && selectedRowIndices.has(originalIndex);
                    
                    return (
                      <TableRow 
                        key={row['Composite Key'] || index}
                        className={cn(
                          isSelected && "bg-blue-100/50",
                          "cursor-pointer hover:bg-gray-50"
                        )}
                        onClick={(e) => toggleRowSelection(originalIndex, e)}
                      >
                        <TableCell className="sticky left-0 bg-white z-10" style={{ left: actualStickyOffsets.selection, width: 32 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowSelection(originalIndex, e as unknown as React.MouseEvent);
                            }}
                          />
                        </TableCell>
                        <TableCell
                          className="font-medium sticky bg-white z-10 max-w-[180px] truncate"
                          style={{ left: actualStickyOffsets.ledger }}
                          title={row['Ledger Name']}
                        >
                          {row['Ledger Name']}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[180px] truncate" title={row['Parent Group']}>{row['Parent Group']}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate" title={row['Primary Group']}>{row['Primary Group']}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(row['Opening Balance'])}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(row['Debit'])}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(row['Credit'])}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatNumber(row['Closing Balance'])}</TableCell>
                        <TableCell className="text-sm">{row['Is Revenue']}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
              </div>
            </TabsContent>

            {/* CLASSIFIED TRIAL BALANCE TAB */}
            <TabsContent value="classified-tb" className="mt-0 p-4">
              {/* Classification Status Banner */}
              {classificationStatus.unclassified > 0 && (
                <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Some ledgers are not yet classified</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white">
                    Classified: {classificationStatus.classified} / Total: {classificationStatus.total} ({classificationStatus.percentageComplete}%)
                  </Badge>
                </div>
              )}
              
              <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-8 sticky top-0 bg-white" style={{ left: classifiedStickyOffsets.selection, zIndex: 20 }}>
                    <input
                      type="checkbox"
                      checked={selectedFilteredCount === filteredData.length && filteredData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Select all VISIBLE FILTERED rows
                          const visibleIndices = filteredData.map(row => 
                            currentData.findIndex(r => r['Composite Key'] === row['Composite Key'])
                          ).filter(idx => idx !== -1);
                          setSelectedRowIndices(new Set(visibleIndices));
                        } else {
                          setSelectedRowIndices(new Set());
                        }
                      }}
                      title="Select All Visible / Deselect All"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: 200, left: classifiedStickyOffsets.ledger, zIndex: 19 }}>
                    <div className="flex items-center gap-1">
                      Ledger Name
                      <ColumnFilter
                        column="Ledger Name"
                        values={getClassifiedTbColumnValues('Ledger Name')}
                        selectedValues={classifiedTbColumnFilters['Ledger Name'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Ledger Name', values)}
                        sortDirection={classifiedTbSortColumn === 'Ledger Name' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Ledger Name', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Ledger Name', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['Parent Group'] }}>
                    <div className="flex items-center gap-1">
                      Parent Group
                      <ColumnFilter
                        column="Parent Group"
                        values={getClassifiedTbColumnValues('Parent Group')}
                        selectedValues={classifiedTbColumnFilters['Parent Group'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Parent Group', values)}
                        sortDirection={classifiedTbSortColumn === 'Parent Group' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Parent Group', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Parent Group', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['Primary Group'] }}>
                    <div className="flex items-center gap-1">
                      Primary Group
                      <ColumnFilter
                        column="Primary Group"
                        values={getClassifiedTbColumnValues('Primary Group')}
                        selectedValues={classifiedTbColumnFilters['Primary Group'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Primary Group', values)}
                        sortDirection={classifiedTbSortColumn === 'Primary Group' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Primary Group', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Primary Group', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['Opening Balance'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Opening
                      <ColumnFilter
                        column="Opening Balance"
                        values={getClassifiedTbColumnValues('Opening Balance')}
                        selectedValues={classifiedTbColumnFilters['Opening Balance'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Opening Balance', values)}
                        sortDirection={classifiedTbSortColumn === 'Opening Balance' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Opening Balance', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Opening Balance', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['Debit'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Debit
                      <ColumnFilter
                        column="Debit"
                        values={getClassifiedTbColumnValues('Debit')}
                        selectedValues={classifiedTbColumnFilters['Debit'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Debit', values)}
                        sortDirection={classifiedTbSortColumn === 'Debit' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Debit', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Debit', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['Credit'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Credit
                      <ColumnFilter
                        column="Credit"
                        values={getClassifiedTbColumnValues('Credit')}
                        selectedValues={classifiedTbColumnFilters['Credit'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Credit', values)}
                        sortDirection={classifiedTbSortColumn === 'Credit' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Credit', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Credit', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['Closing Balance'] }}>
                    <div className="flex items-center justify-end gap-1">
                      Closing
                      <ColumnFilter
                        column="Closing Balance"
                        values={getClassifiedTbColumnValues('Closing Balance')}
                        selectedValues={classifiedTbColumnFilters['Closing Balance'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Closing Balance', values)}
                        sortDirection={classifiedTbSortColumn === 'Closing Balance' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Closing Balance', dir)}
                        isNumeric
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Closing Balance', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['H1'] }}>
                    <div className="flex items-center gap-1">
                      H1
                      <ColumnFilter
                        column="H1"
                        values={getClassifiedTbColumnValues('H1')}
                        selectedValues={classifiedTbColumnFilters['H1'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('H1', values)}
                        sortDirection={classifiedTbSortColumn === 'H1' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('H1', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('H1', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['H2'] }}>
                    <div className="flex items-center gap-1">
                      H2
                      <ColumnFilter
                        column="H2"
                        values={getClassifiedTbColumnValues('H2')}
                        selectedValues={classifiedTbColumnFilters['H2'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('H2', values)}
                        sortDirection={classifiedTbSortColumn === 'H2' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('H2', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('H2', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['H3'] }}>
                    <div className="flex items-center gap-1">
                      H3
                      <ColumnFilter
                        column="H3"
                        values={getClassifiedTbColumnValues('H3')}
                        selectedValues={classifiedTbColumnFilters['H3'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('H3', values)}
                        sortDirection={classifiedTbSortColumn === 'H3' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('H3', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('H3', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['H4'] }}>
                    <div className="flex items-center gap-1">
                      H4
                      <ColumnFilter
                        column="H4"
                        values={getClassifiedTbColumnValues('H4')}
                        selectedValues={classifiedTbColumnFilters['H4'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('H4', values)}
                        sortDirection={classifiedTbSortColumn === 'H4' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('H4', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('H4', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['H5'] }}>
                    <div className="flex items-center gap-1">
                      H5
                      <ColumnFilter
                        column="H5"
                        values={getClassifiedTbColumnValues('H5')}
                        selectedValues={classifiedTbColumnFilters['H5'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('H5', values)}
                        sortDirection={classifiedTbSortColumn === 'H5' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('H5', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('H5', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: classifiedTbColumnWidths['Status'] }}>
                    <div className="flex items-center gap-1">
                      Status
                      <ColumnFilter
                        column="Status"
                        values={getClassifiedTbColumnValues('Status')}
                        selectedValues={classifiedTbColumnFilters['Status'] || new Set()}
                        onFilterChange={(values) => handleClassifiedTbFilterChange('Status', values)}
                        sortDirection={classifiedTbSortColumn === 'Status' ? classifiedTbSortDirection : null}
                        onSort={(dir) => handleClassifiedTbSort('Status', dir)}
                      />
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
                      onMouseDown={(e) => classifiedTbHandleMouseDown('Status', e)}
                      style={{ userSelect: 'none' }}
                      title="Drag to resize column"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                      {currentData.length === 0 
                        ? "No classified data. Import from Tally to get started."
                        : "No results match your search criteria."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, index) => {
                    // Find the original index in currentData for selection
                    const originalIndex = currentData.findIndex(r => 
                      r['Composite Key'] === row['Composite Key']
                    );
                    const isSelected = originalIndex !== -1 && selectedRowIndices.has(originalIndex);
                    const isFocused = focusedClassifiedRowIndex === originalIndex;
                    
                    return (
                      <TableRow 
                        key={row['Composite Key'] || index}
                        className={cn(
                          isSelected && "bg-blue-50",
                          isFocused && "ring-2 ring-blue-400 ring-inset",
                          "cursor-pointer hover:bg-gray-50 transition-colors"
                        )}
                        onClick={(e) => {
                          setFocusedClassifiedRowIndex(originalIndex);
                          toggleRowSelection(originalIndex, e);
                        }}
                        onDoubleClick={() => {
                          setEditingLedger(row);
                          setEditingLedgerIndex(originalIndex);
                          setIsSingleEditDialogOpen(true);
                        }}
                        tabIndex={0}
                        onFocus={() => setFocusedClassifiedRowIndex(originalIndex)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()} className="sticky left-0 bg-white z-10" style={{ left: classifiedStickyOffsets.selection, width: 32 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowSelection(originalIndex, e as unknown as React.MouseEvent);
                            }}
                          />
                        </TableCell>
                        <TableCell
                          className="font-medium text-sm sticky bg-white z-10 max-w-[180px] truncate"
                          style={{ left: classifiedStickyOffsets.ledger }}
                          title={row['Ledger Name']}
                        >
                          {row['Ledger Name']}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-[180px] truncate" title={row['Parent Group'] || row['Primary Group'] || '-'}>{row['Parent Group'] || row['Primary Group'] || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate" title={row['Primary Group']}>{row['Primary Group']}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(row['Opening Balance'])}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(row['Debit'])}</TableCell>
                        <TableCell className="text-right text-sm">{formatNumber(row['Credit'])}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatNumber(row['Closing Balance'])}</TableCell>
                        <TableCell className="text-xs">{row['H1'] || '-'}</TableCell>
                        <TableCell className="text-xs">{row['H2'] || '-'}</TableCell>
                        <TableCell className="text-xs">{row['H3'] || '-'}</TableCell>
                        <TableCell className="text-xs">{row['H4'] || '-'}</TableCell>
                        <TableCell className="text-xs">{row['H5'] || '-'}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
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
                businessType={businessType}
                searchTerm={searchTerm}
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
                signingDetails={signingDetails}
              />
            </TabsContent>
            
            <TabsContent value="notes" className="mt-0 p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Notes to Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Detailed notes grouped by Schedule III classifications from Rule Engine
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      try {
                        // Group data by H3 and H4 for detailed notes
                        const notesData = currentData.filter(row => row.H3 && row.H3.trim() !== '');
                        
                        const grouped = notesData.reduce((acc: any, row) => {
                          const noteSection = `${row.H2 || 'Unmapped'} - ${row.H3 || 'Unmapped'}`;
                          if (!acc[noteSection]) acc[noteSection] = [];
                          acc[noteSection].push({
                            'Ledger Name': row['Ledger Name'] || '',
                            'Parent': row['Primary Group'] || '',
                            'H2': row.H2 || '',
                            'H3': row.H3 || '',
                            'H4': row.H4 || '',
                            'H5': row.H5 || '',
                            'Opening Balance': row['Opening Balance'] || 0,
                            'Closing Balance': row['Closing Balance'] || 0
                          });
                          return acc;
                        }, {});
                        
                        const workbook = XLSX.utils.book_new();
                        
                        Object.entries(grouped).forEach(([section, rows]: [string, any]) => {
                          const worksheet = XLSX.utils.json_to_sheet(rows);
                          XLSX.utils.book_append_sheet(workbook, worksheet, section.substring(0, 31));
                        });
                        
                        XLSX.writeFile(workbook, `Notes_to_Account_${entityName}_${new Date().toISOString().split('T')[0]}.xlsx`);
                        
                        toast({
                          title: 'Downloaded',
                          description: 'Notes to Account exported successfully'
                        });
                      } catch (error) {
                        toast({
                          title: 'Export Failed',
                          description: error instanceof Error ? error.message : 'Failed to export Notes',
                          variant: 'destructive'
                        });
                      }
                    }}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Notes
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Note Category</TableHead>
                        <TableHead>Ledger Name</TableHead>
                        <TableHead>H3 Classification</TableHead>
                        <TableHead>H4 Classification</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Closing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.filter(row => row.H3 && row.H3.trim() !== '').length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No notes available. Ensure data is properly classified with H3 level in Rule Engine.
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentData
                          .filter(row => row.H3 && row.H3.trim() !== '')
                          .map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{row.H2 || '-'}</TableCell>
                              <TableCell>{row['Ledger Name']}</TableCell>
                              <TableCell>{row.H3}</TableCell>
                              <TableCell>{row.H4 || '-'}</TableCell>
                              <TableCell className="text-right">{formatNumber(row['Opening Balance'])}</TableCell>
                              <TableCell className="text-right">{formatNumber(row['Closing Balance'])}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="annexures" className="mt-0 p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Annexures to Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      Detailed annexures grouped by H4 and H5 classifications
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      try {
                        // Group data by H4 and H5 for annexures
                        const annexuresData = currentData.filter(row => row.H4 && row.H4.trim() !== '');
                        
                        const grouped = annexuresData.reduce((acc: any, row) => {
                          const annexureSection = `${row.H3 || 'Unmapped'} - ${row.H4 || 'Unmapped'}`;
                          if (!acc[annexureSection]) acc[annexureSection] = [];
                          acc[annexureSection].push({
                            'Ledger Name': row['Ledger Name'] || '',
                            'Parent': row['Primary Group'] || '',
                            'H3': row.H3 || '',
                            'H4': row.H4 || '',
                            'H5': row.H5 || '',
                            'Opening Balance': row['Opening Balance'] || 0,
                            'Closing Balance': row['Closing Balance'] || 0
                          });
                          return acc;
                        }, {});
                        
                        const workbook = XLSX.utils.book_new();
                        
                        Object.entries(grouped).forEach(([section, rows]: [string, any]) => {
                          const worksheet = XLSX.utils.json_to_sheet(rows);
                          XLSX.utils.book_append_sheet(workbook, worksheet, section.substring(0, 31));
                        });
                        
                        XLSX.writeFile(workbook, `Annexures_${entityName}_${new Date().toISOString().split('T')[0]}.xlsx`);
                        
                        toast({
                          title: 'Downloaded',
                          description: 'Annexures exported successfully'
                        });
                      } catch (error) {
                        toast({
                          title: 'Export Failed',
                          description: error instanceof Error ? error.message : 'Failed to export Annexures',
                          variant: 'destructive'
                        });
                      }
                    }}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Annexures
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Annexure Group</TableHead>
                        <TableHead>Ledger Name</TableHead>
                        <TableHead>H4 Classification</TableHead>
                        <TableHead>H5 Classification</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Closing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.filter(row => row.H4 && row.H4.trim() !== '').length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No annexures available. Ensure data is properly classified with H4 level in Rule Engine.
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentData
                          .filter(row => row.H4 && row.H4.trim() !== '')
                          .map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{row.H3 || '-'}</TableCell>
                              <TableCell>{row['Ledger Name']}</TableCell>
                              <TableCell>{row.H4}</TableCell>
                              <TableCell>{row.H5 || '-'}</TableCell>
                              <TableCell className="text-right">{formatNumber(row['Opening Balance'])}</TableCell>
                              <TableCell className="text-right">{formatNumber(row['Closing Balance'])}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="rule-engine" className="mt-0 p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Classification Rules</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage automatic classification rules for trial balance items
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Select value={selectedRuleSet} onValueChange={setSelectedRuleSet}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="schedule-iii">Schedule III (Corporate)</SelectItem>
                        <SelectItem value="non-corporate">Non-Corporate Entity (ICAI)</SelectItem>
                        <SelectItem value="custom">Custom Rules</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => setIsRuleTemplateDialogOpen(true)}>
                      <Save className="w-4 h-4 mr-2" />
                      Save as Template
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleImportRules}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Rules
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleExportRules}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Rules
                    </Button>
                    <Button onClick={handleAddRule}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Rule
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Condition Type</TableHead>
                        <TableHead>Condition Value</TableHead>
                        <TableHead>Mapped To</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(savedMappings).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No rules defined yet. Click "Add New Rule" or import from Excel to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        Object.entries(savedMappings).map(([key, mapping], index) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium">Rule {index + 1}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                Tally Primary Group
                              </span>
                            </TableCell>
                            <TableCell>{key.split('|')[1] || key}</TableCell>
                            <TableCell>
                              <div className="text-xs space-y-1">
                                <div><strong>H1:</strong> {mapping.h1}</div>
                                <div><strong>H2:</strong> {mapping.h2}</div>
                                <div><strong>H3:</strong> {mapping.h3}</div>
                                {mapping.h4 && <div><strong>H4:</strong> {mapping.h4}</div>}
                                {mapping.h5 && <div><strong>H5:</strong> {mapping.h5}</div>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleEditRule(key, mapping)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleDeleteMapping(key)}
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
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
      
      {/* Consolidated Setup Dialog - Entity Type + Business Type + Period + Stock Items */}
      <Dialog open={isEntityDialogOpen} onOpenChange={setIsEntityDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setup Trial Balance Import</DialogTitle>
            <DialogDescription>
              Configure entity details and import settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Entity Type - Override allowed */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type *</label>
              <Select value={entityTypeDraft} onValueChange={setEntityTypeDraft}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type} value={type} disabled={DISABLED_ENTITY_TYPES.includes(type)}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pulled from master client by default. You can override for this import and re-classify without reimporting.</p>
            </div>

            {/* Business Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Type *</label>
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
            </div>

            {/* Import Period Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Import Period *</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setImportPeriodType('current')}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all",
                    importPeriodType === 'current'
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-400"
                  )}
                >
                  <p className="font-semibold text-sm">Current Period</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fromDate && toDate ? `${fromDate} to ${toDate}` : 'Set date range first'}
                  </p>
                </div>
                <div
                  onClick={() => setImportPeriodType('previous')}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all",
                    importPeriodType === 'previous'
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-400"
                  )}
                >
                  <p className="font-semibold text-sm">Previous Period</p>
                  <p className="text-xs text-muted-foreground mt-1">For comparison</p>
                </div>
              </div>
            </div>

            {/* Stock Items Checkbox */}
            {(businessType === 'Trading - Wholesale and Retail' || businessType === 'Manufacturing') && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="includeStock"
                  checked={includeStockItems}
                  onChange={(e) => setIncludeStockItems(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="includeStock" className="text-sm font-medium cursor-pointer flex-1">
                  Import Stock Items from Tally
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEntityDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleSaveEntityType} disabled={!entityTypeDraft}>
                Save Entity Type
              </Button>
              <Button 
                onClick={() => handleFetchFromTally(entityTypeDraft || entityType)} 
                disabled={(!entityTypeDraft && !entityType) || !businessType || isFetching}
              >
                {isFetching ? 'Importing...' : 'Confirm & Import'}
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

      {/* Single Ledger Edit Dialog */}
      <Dialog open={isSingleEditDialogOpen} onOpenChange={setIsSingleEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Classification</DialogTitle>
            <DialogDescription>
              Update classification for: <strong>{editingLedger?.['Ledger Name']}</strong>
            </DialogDescription>
          </DialogHeader>
          {editingLedger && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Primary Group</Label>
                  <div className="text-sm font-medium">{editingLedger['Primary Group']}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Closing Balance</Label>
                  <div className="text-sm font-medium">{formatNumber(editingLedger['Closing Balance'])}</div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H1</Label>
                  <Select
                    value={editingLedger['H1'] || ''}
                    onValueChange={(val) => setEditingLedger({...editingLedger, 'H1': val, 'H2': '', 'H3': '', 'H4': ''})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select Statement Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {H1_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H2</Label>
                  <Select
                    value={editingLedger['H2'] || ''}
                    onValueChange={(val) => setEditingLedger({...editingLedger, 'H2': val, 'H3': '', 'H4': ''})}
                    disabled={!editingLedger['H1']}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={!editingLedger['H1'] ? "Select H1 first" : "Select Category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getH2Options(editingLedger['H1'] || '').map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H3</Label>
                  <Select
                    value={editingLedger['H3'] || ''}
                    onValueChange={(val) => setEditingLedger({...editingLedger, 'H3': val, 'H4': ''})}
                    disabled={!editingLedger['H2']}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={!editingLedger['H2'] ? "Select H2 first" : "Select Note/Section"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getH3Options(editingLedger['H2'] || '').map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H4</Label>
                  <Select
                    value={editingLedger['H4'] || ''}
                    onValueChange={(val) => setEditingLedger({...editingLedger, 'H4': val})}
                    disabled={!editingLedger['H3'] || getH4Options(editingLedger['H3'] || '').length === 0}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={
                        !editingLedger['H3'] ? "Select H3 first" : 
                        getH4Options(editingLedger['H3'] || '').length === 0 ? "No sub-items available" :
                        "Select Line Item"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {getH4Options(editingLedger['H3'] || '').map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H5</Label>
                  <Input
                    value={editingLedger['H5'] || ''}
                    onChange={(e) => setEditingLedger({...editingLedger, 'H5': e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Cash-in-Hand (optional detail)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setIsSingleEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (editingLedger && editingLedgerIndex >= 0) {
                    const updatedData = [...currentData];
                    updatedData[editingLedgerIndex] = editingLedger;
                    setCurrentData(updatedData);
                    toast({
                      title: 'Updated',
                      description: `Classification updated for "${editingLedger['Ledger Name']}"`
                    });
                    setIsSingleEditDialogOpen(false);
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <FilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        statusFilter={statusFilter}
        groupFilter={groupFilter}
        balanceFilter={balanceFilter}
        onStatusFilterChange={setStatusFilter}
        onGroupFilterChange={setGroupFilter}
        onBalanceFilterChange={setBalanceFilter}
        onResetFilters={handleResetFilters}
      />

      {/* Classification Manager Dialog */}
      <ClassificationManager
        open={isClassificationManagerOpen}
        onOpenChange={setIsClassificationManagerOpen}
        savedMappings={savedMappings}
        onSaveMapping={handleSaveMapping}
        onDeleteMapping={handleDeleteMapping}
      />

      {/* Rule Add/Edit Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRuleKey ? 'Edit Classification Rule' : 'Add New Classification Rule'}</DialogTitle>
            <DialogDescription>
              Define a rule to automatically classify trial balance items based on Tally Primary Group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Condition Type</label>
              <Select value={ruleForm.conditionType} onValueChange={(val) => setRuleForm(prev => ({ ...prev, conditionType: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primary Group">Tally Primary Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Condition Value *</label>
              <Input
                value={ruleForm.conditionValue}
                onChange={(e) => setRuleForm(prev => ({ ...prev, conditionValue: e.target.value }))}
                placeholder="e.g., Current Assets, Bank Accounts"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">H1 Classification</label>
                <Input
                  value={ruleForm.h1}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, h1: e.target.value }))}
                  placeholder="e.g., Balance Sheet"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">H2 Classification</label>
                <Input
                  value={ruleForm.h2}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, h2: e.target.value }))}
                  placeholder="e.g., Assets"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">H3 Classification</label>
                <Input
                  value={ruleForm.h3}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, h3: e.target.value }))}
                  placeholder="e.g., Current Assets"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">H4 Classification</label>
                <Input
                  value={ruleForm.h4}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, h4: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">H5 Classification</label>
                <Input
                  value={ruleForm.h5}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, h5: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRule}>
                {editingRuleKey ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Rule Template Save Dialog */}
      <Dialog open={isRuleTemplateDialogOpen} onOpenChange={setIsRuleTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Rule Template</DialogTitle>
            <DialogDescription>
              Save the current mapping rules as a named template for this engagement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name *</label>
              <Input
                value={ruleTemplateName}
                onChange={(e) => setRuleTemplateName(e.target.value)}
                placeholder="e.g., Manufacturing Company - Standard, Retail Business - Q1 2024"
              />
            </div>
            
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p>This template will be saved for engagement: <strong>{currentEngagement?.client_name}</strong></p>
              <p className="mt-1">Total rules: <strong>{Object.keys(savedMappings).length}</strong></p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsRuleTemplateDialogOpen(false);
                setRuleTemplateName('');
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveRuleTemplate}>
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetConfirmDialogOpen} onOpenChange={setIsResetConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Trial Balance Data</DialogTitle>
            <DialogDescription>
              Would you like to save the current mapping rules as a template before clearing the data?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="font-medium text-yellow-900">⚠️ Warning</p>
              <p className="mt-1 text-yellow-800">All trial balance data and stock items will be cleared. This action cannot be undone.</p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Current mapping rules: <strong>{Object.keys(savedMappings).length} rules</strong></p>
              <p>Ledger rows: <strong>{currentData.length} rows</strong></p>
              {currentStockData.length > 0 && (
                <p>Stock items: <strong>{currentStockData.length} items</strong></p>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsResetConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => handleConfirmReset(true)}>
                Save Template & Clear
              </Button>
              <Button variant="destructive" onClick={() => handleConfirmReset(false)}>
                Clear Without Saving
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      

      
      {/* Add New Line Item Dialog */}
      <Dialog open={isAddLineDialogOpen} onOpenChange={setIsAddLineDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Line Item</DialogTitle>
            <DialogDescription>
              Manually add a new ledger line item to the trial balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Ledger Name *</label>
                <Input
                  value={newLineForm.ledgerName}
                  onChange={(e) => setNewLineForm(prev => ({ ...prev, ledgerName: e.target.value }))}
                  placeholder="e.g., Cash in Hand"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Primary Group *</label>
                <Input
                  value={newLineForm.primaryGroup}
                  onChange={(e) => setNewLineForm(prev => ({ ...prev, primaryGroup: e.target.value }))}
                  placeholder="e.g., Cash-in-hand, Bank Accounts"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Opening Balance</label>
                <Input
                  type="number"
                  value={newLineForm.openingBalance}
                  onChange={(e) => setNewLineForm(prev => ({ ...prev, openingBalance: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Closing Balance</label>
                <Input
                  type="number"
                  value={newLineForm.closingBalance}
                  onChange={(e) => setNewLineForm(prev => ({ ...prev, closingBalance: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Debit</label>
                <Input
                  type="number"
                  value={newLineForm.debit}
                  onChange={(e) => setNewLineForm(prev => ({ ...prev, debit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Credit</label>
                <Input
                  type="number"
                  value={newLineForm.credit}
                  onChange={(e) => setNewLineForm(prev => ({ ...prev, credit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Period</label>
                <Select 
                  value={newLineForm.periodType} 
                  onValueChange={(value: 'current' | 'previous') => setNewLineForm(prev => ({ ...prev, periodType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Period</SelectItem>
                    <SelectItem value="previous">Previous Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddLineDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddLineItem}
                disabled={!newLineForm.ledgerName || !newLineForm.primaryGroup}
              >
                Add Line Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Signing Details Dialog */}
      <Dialog open={isSigningDialogOpen} onOpenChange={setIsSigningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Financial Statement Signing Details</DialogTitle>
            <DialogDescription>
              Optionally provide signing details to print on financial statement footer. All fields are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date (DD/MM/YYYY)</label>
                <Input
                  placeholder="DD/MM/YYYY"
                  value={signingDetails.date}
                  onChange={(e) => setSigningDetails(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Place</label>
                <Input
                  placeholder="City name"
                  value={signingDetails.place}
                  onChange={(e) => setSigningDetails(prev => ({ ...prev, place: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Signatory Partner Name</label>
              <Input
                placeholder="Partner name"
                value={signingDetails.partnerName}
                onChange={(e) => setSigningDetails(prev => ({ ...prev, partnerName: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Firm Name</label>
              <Input
                placeholder="Firm name"
                value={signingDetails.firmName}
                onChange={(e) => setSigningDetails(prev => ({ ...prev, firmName: e.target.value }))}
              />
            </div>
            
            <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 p-3 rounded">
              <p><strong>Note:</strong> All fields are optional. Leave blank to skip signing details on the report.</p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsSigningDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setIsSigningDialogOpen(false);
                toast({
                  title: 'Signing Details Saved',
                  description: 'Your signing details will be printed on financial statements'
                });
                // Navigate to reports tab
                setActiveTab('reports');
              }}>
                Save & Proceed to Reports
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

