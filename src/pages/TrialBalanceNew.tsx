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

export default function TrialBalanceNew() {
  const { currentEngagement } = useEngagement();
  const { toast } = useToast();
  const odbcConnection = useTallyODBC();
  const trialBalanceDB = useTrialBalance(currentEngagement?.id);
  
  // Entity and Business Info
  const [entityType, setEntityType] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('');
  const [includeStockItems, setIncludeStockItems] = useState<boolean>(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Derive constitution from entity type
  const constitution = useMemo(() => {
    const et = entityType.toLowerCase();
    if (et.includes('company') || et.includes('opc')) return 'company';
    if (et.includes('llp') || et.includes('limited liability')) return 'llp';
    if (et.includes('partnership')) return 'partnership';
    if (et.includes('proprietorship') || et.includes('sole') || et.includes('individual')) return 'proprietorship';
    if (et.includes('trust')) return 'trust';
    if (et.includes('society')) return 'society';
    return 'company'; // default
  }, [entityType]);
  
  // Data State
  const [actualData, setActualData] = useState<LedgerRow[]>([]); // NEW: Unclassified actual data
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [h1Filter, setH1Filter] = useState<string>('all');
  const [h2Filter, setH2Filter] = useState<string>('all');
  const [h3Filter, setH3Filter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<string>('all'); // all, positive, negative, zero
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>('2025-03-31');
  const [odbcPort, setOdbcPort] = useState<string>('9000');
  const [isFetching, setIsFetching] = useState(false);
  const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
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
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        (row['Ledger Name'] || '').toLowerCase().includes(searchLower) ||
        (row['Primary Group'] || '').toLowerCase().includes(searchLower) ||
        (row['Parent Group'] || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Group filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter(row => (row['Primary Group'] || '') === groupFilter);
    }
    
    // Balance filter
    if (balanceFilter !== 'all') {
      filtered = filtered.filter(row => {
        const balance = row['Closing Balance'] || 0;
        if (balanceFilter === 'positive') return balance > 0;
        if (balanceFilter === 'negative') return balance < 0;
        if (balanceFilter === 'zero') return balance === 0;
        return true;
      });
    }
    
    return filtered;
  }, [actualData, searchTerm, groupFilter, balanceFilter]);
  
  // Filtered data for Classified TB
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
    
    // H1 filter
    if (h1Filter !== 'all') {
      filtered = filtered.filter(row => (row['H1'] || '') === h1Filter);
    }
    
    // H2 filter
    if (h2Filter !== 'all') {
      filtered = filtered.filter(row => (row['H2'] || '') === h2Filter);
    }
    
    // H3 filter
    if (h3Filter !== 'all') {
      filtered = filtered.filter(row => (row['H3'] || '') === h3Filter);
    }
    
    return filtered;
  }, [currentData, searchTerm, statusFilter, h1Filter, h2Filter, h3Filter]);
  
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
  const handleFetchFromTally = useCallback(async () => {
    if (!entityType || !businessType) {
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
      
      // Convert to LedgerRow format - NEW LOGIC: show row only if NOT all 5 columns are zero
      const processedData: LedgerRow[] = lines
        .filter(line => {
          // Show row ONLY IF at least one column is non-zero
          const opening = line.openingBalance || 0;
          const debit = Math.abs(line.totalDebit || 0);
          const credit = Math.abs(line.totalCredit || 0);
          const closing = line.closingBalance || 0;
          
          // Hide only if ALL are zero
          return !(opening === 0 && debit === 0 && credit === 0 && closing === 0);
        })
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
        }));
      
      // Store actual data (unclassified)
      setActualData(processedData);
      
      // For classification: ONLY rows where Opening=0 AND Closing≠0
      const dataToClassify = processedData.filter(row => {
        const opening = row['Opening Balance'] || 0;
        const closing = row['Closing Balance'] || 0;
        return opening === 0 && closing !== 0;
      });
      
      // Auto-classify the filtered data
      let classified = classifyDataframeBatch(dataToClassify, savedMappings, businessType, constitution);
      
      // Apply automatic H1 and H2 classification based on Is Revenue and Closing Balance
      classified = applyAutoH1H2Classification(classified);
      
      // Import directly based on selected period type
      if (importPeriodType === 'current') {
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
  }, [entityType, businessType, fromDate, toDate, odbcConnection, savedMappings, constitution, importPeriodType, currentEngagement, trialBalanceDB, toast]);
  
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
        balance_type: (row['Closing Balance'] || 0) >= 0 ? 'Dr' : 'Cr',
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
            balance_type: (row['Closing Balance'] || 0) >= 0 ? 'Dr' : 'Cr',
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

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setH1Filter('all');
    setH2Filter('all');
    setH3Filter('all');
    setGroupFilter('all');
    setBalanceFilter('all');
  }, []);

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
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        {/* Left: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
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
            disabled={currentData.length === 0 || selectedRowIndices.size === 0}
            className="h-8"
          >
            <Settings className="w-3 h-3 mr-1.5" />
            Update {selectedRowIndices.size > 0 && `(${selectedRowIndices.size})`}
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
              <DropdownMenuItem onClick={handleExcelExport}>
                <Download className="w-3 h-3 mr-2" />
                Export to Excel
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

          {/* Settings */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Connection Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="odbc-port">Tally ODBC Port</Label>
                  <Input
                    id="odbc-port"
                    type="text"
                    value={odbcPort}
                    onChange={(e) => setOdbcPort(e.target.value)}
                    placeholder="9000"
                  />
                </div>
                <Button
                  onClick={handleConnectTally}
                  disabled={isFetching || odbcConnection.isConnecting}
                  className="w-full"
                >
                  {isFetching || odbcConnection.isConnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

      {/* Row 2: Company Info */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-50 to-white border-b">
        <div className="flex items-center gap-3">
          {/* Company Name - Large & Bold */}
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold text-gray-900">
              {entityName ? entityName.replace(/\s*\(from[^)]+\)/, '') : 'No Company Selected'}
            </h1>
            {entityName && entityName.includes('(from') && (
              <span className="text-xs text-gray-500 font-normal">
                {entityName.match(/\(from[^)]+\)/)?.[0] || ''}
              </span>
            )}
          </div>

          {/* Entity Type Badge */}
          {entityType && (
            <Badge variant="outline" className="text-xs font-normal">
              {entityType}
            </Badge>
          )}

          {/* Business Type Badge */}
          {businessType && (
            <Badge variant="secondary" className="text-xs">
              {businessType}
            </Badge>
          )}
        </div>

        {/* Right: FY Badge + Configure Button */}
        <div className="flex items-center gap-2">
          {fromDate && toDate && (
            <Badge variant="outline" className="text-xs font-medium">
              FY {new Date(fromDate).getFullYear()}-{new Date(toDate).getFullYear().toString().slice(-2)}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEntityDialogOpen(true)}
            className="h-7 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            Configure Entity
          </Button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Filter Bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ledgers, groups, classifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-sm"
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
                h1Filter !== 'all',
                h2Filter !== 'all',
                h3Filter !== 'all',
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
            {h1Filter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {h1Filter}
                <button
                  onClick={() => setH1Filter('all')}
                  className="hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {h2Filter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {h2Filter}
                <button
                  onClick={() => setH2Filter('all')}
                  className="hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {h3Filter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {h3Filter}
                <button
                  onClick={() => setH3Filter('all')}
                  className="hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>

          {/* Selection Info & Add Line */}
          <div className="flex items-center gap-2">
            {selectedRowIndices.size > 0 && (
              <Badge variant="default" className="h-9 px-3">
                {selectedRowIndices.size} selected
              </Badge>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsAddLineDialogOpen(true)}
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Line
            </Button>
          </div>
        </div>
        
        {/* Totals Bar */}
        <div className="flex items-center justify-end gap-6 px-4 py-1.5 bg-gray-50 border-b text-xs">
          <span className="text-muted-foreground">Opening: <strong className="text-foreground font-semibold">{formatNumber(totals.opening)}</strong></span>
          <span className="text-muted-foreground">Debit: <strong className="text-foreground font-semibold">{formatNumber(totals.debit)}</strong></span>
          <span className="text-muted-foreground">Credit: <strong className="text-foreground font-semibold">{formatNumber(totals.credit)}</strong></span>
          <span className="text-muted-foreground">Closing: <strong className="text-foreground font-semibold">{formatNumber(totals.closing)}</strong></span>
        </div>
      
        {/* Modern Tabs Navigation */}
        <div className="bg-white border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-10 bg-transparent border-b-0 px-4 gap-1 rounded-none justify-start">
              <TabsTrigger 
                value="actual-tb"
                className="relative data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-10 px-4"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Actual TB
              </TabsTrigger>
              <TabsTrigger 
                value="classified-tb"
                className="relative data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-10 px-4"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Classified TB
              </TabsTrigger>
              <TabsTrigger 
                value="stock-items"
                className="relative data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-10 px-4"
              >
                <Package className="w-4 h-4 mr-2" />
                Stock Items
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="relative data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-10 px-4"
              >
                <FileText className="w-4 h-4 mr-2" />
                Financial Statements
              </TabsTrigger>
              <TabsTrigger 
                value="notes"
                className="relative data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-10 px-4"
              >
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area - Increased to 75vh for better space usage */}
        <div className="flex-1 overflow-auto" style={{ minHeight: '75vh' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            
            {/* ACTUAL TRIAL BALANCE TAB */}
            <TabsContent value="actual-tb" className="mt-0 p-4">
              <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-12 sticky top-0 bg-white">
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
                  <TableHead className="sticky top-0 bg-white">Ledger Name</TableHead>
                  <TableHead className="sticky top-0 bg-white">Parent Group</TableHead>
                  <TableHead className="sticky top-0 bg-white">Primary Group</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Opening</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Debit</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Credit</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Closing</TableHead>
                  <TableHead className="sticky top-0 bg-white">Is Revenue</TableHead>
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
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            // Ctrl+Click: Toggle selection
                            const newSelection = new Set(selectedRowIndices);
                            if (isSelected) {
                              newSelection.delete(originalIndex);
                            } else {
                              newSelection.add(originalIndex);
                            }
                            setSelectedRowIndices(newSelection);
                          } else if (e.shiftKey && selectedRowIndices.size > 0) {
                            // Shift+Click: Range selection
                            const indices = Array.from(selectedRowIndices);
                            const lastSelected = Math.max(...indices);
                            const start = Math.min(lastSelected, originalIndex);
                            const end = Math.max(lastSelected, originalIndex);
                            const newSelection = new Set(selectedRowIndices);
                            for (let i = start; i <= end; i++) {
                              newSelection.add(i);
                            }
                            setSelectedRowIndices(newSelection);
                          } else {
                            // Regular click: Single selection
                            setSelectedRowIndices(new Set([originalIndex]));
                          }
                        }}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row['Ledger Name']}</TableCell>
                        <TableCell className="text-sm text-gray-600">{row['Parent Group']}</TableCell>
                        <TableCell className="text-sm">{row['Primary Group']}</TableCell>
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
              <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-12 sticky top-0 bg-white">
                    <input
                      type="checkbox"
                      checked={selectedRowIndices.size === currentData.length && currentData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Select all original indices
                          setSelectedRowIndices(new Set(currentData.map((_, i) => i)));
                        } else {
                          setSelectedRowIndices(new Set());
                        }
                      }}
                      title="Select All / Deselect All"
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white">Ledger Name</TableHead>
                  <TableHead className="sticky top-0 bg-white">Parent Group</TableHead>
                  <TableHead className="sticky top-0 bg-white">Primary Group</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Opening</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Debit</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Credit</TableHead>
                  <TableHead className="text-right sticky top-0 bg-white">Closing</TableHead>
                  <TableHead className="sticky top-0 bg-white">H1</TableHead>
                  <TableHead className="sticky top-0 bg-white">H2</TableHead>
                  <TableHead className="sticky top-0 bg-white">H3</TableHead>
                  <TableHead className="sticky top-0 bg-white">H4</TableHead>
                  <TableHead className="sticky top-0 bg-white">H5</TableHead>
                  <TableHead className="sticky top-0 bg-white">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                      No classified data. Import from Tally to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((row, index) => {
                    const isSelected = selectedRowIndices.has(index);
                    const isFocused = focusedClassifiedRowIndex === index;
                    
                    return (
                      <TableRow 
                        key={row['Composite Key'] || index}
                        className={cn(
                          isSelected && "bg-blue-50",
                          isFocused && "ring-2 ring-blue-400 ring-inset",
                          "cursor-pointer hover:bg-gray-50 transition-colors"
                        )}
                        onClick={(e) => {
                          setFocusedClassifiedRowIndex(index);
                          toggleRowSelection(index, e);
                        }}
                        onDoubleClick={() => {
                          setEditingLedger(row);
                          setEditingLedgerIndex(index);
                          setIsSingleEditDialogOpen(true);
                        }}
                        tabIndex={0}
                        onFocus={() => setFocusedClassifiedRowIndex(index)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{row['Ledger Name']}</TableCell>
                        <TableCell className="text-xs text-gray-600">{row['Parent Group'] || row['Primary Group'] || '-'}</TableCell>
                        <TableCell className="text-xs">{row['Primary Group']}</TableCell>
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
            {/* Entity Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type *</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem 
                      key={type} 
                      value={type}
                      disabled={DISABLED_ENTITY_TYPES.includes(type)}
                      className={DISABLED_ENTITY_TYPES.includes(type) ? "text-gray-400" : ""}
                    >
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button 
                onClick={handleFetchFromTally} 
                disabled={!entityType || !businessType || isFetching}
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
                  <Input
                    value={editingLedger['H1'] || ''}
                    onChange={(e) => setEditingLedger({...editingLedger, 'H1': e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Balance Sheet, Profit and Loss"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H2</Label>
                  <Input
                    value={editingLedger['H2'] || ''}
                    onChange={(e) => setEditingLedger({...editingLedger, 'H2': e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Assets, Liabilities, Income, Expenses"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H3</Label>
                  <Input
                    value={editingLedger['H3'] || ''}
                    onChange={(e) => setEditingLedger({...editingLedger, 'H3': e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Current Assets, Fixed Assets"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H4</Label>
                  <Input
                    value={editingLedger['H4'] || ''}
                    onChange={(e) => setEditingLedger({...editingLedger, 'H4': e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Cash and Bank Balance"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <Label className="text-sm font-medium">H5</Label>
                  <Input
                    value={editingLedger['H5'] || ''}
                    onChange={(e) => setEditingLedger({...editingLedger, 'H5': e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Cash-in-Hand"
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
        h1Filter={h1Filter}
        h2Filter={h2Filter}
        h3Filter={h3Filter}
        groupFilter={groupFilter}
        balanceFilter={balanceFilter}
        onStatusFilterChange={setStatusFilter}
        onH1FilterChange={setH1Filter}
        onH2FilterChange={setH2Filter}
        onH3FilterChange={setH3Filter}
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

