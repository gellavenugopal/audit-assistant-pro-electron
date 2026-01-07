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
  Cog,
  Plus,
  Edit,
  Trash,
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
  const [includeStockItems, setIncludeStockItems] = useState<boolean>(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isStockPreferenceDialogOpen, setIsStockPreferenceDialogOpen] = useState(false);
  
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
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
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
    
    // For Trading/Manufacturing, ask about stock items preference
    if ((businessType === 'Trading' || businessType === 'Manufacturing')) {
      setIsStockPreferenceDialogOpen(true);
      return;
    }
    
    // If all checks passed, entity dialog should trigger the fetch
    setIsEntityDialogOpen(true);
  }, [odbcConnection, entityType, businessType]);
  
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
      
      // Convert to LedgerRow format and filter out zero balance rows
      const processedData: LedgerRow[] = lines
        .filter(line => {
          // Filter out rows where both opening and closing balances are 0
          const opening = line.openingBalance || 0;
          const closing = line.closingBalance || 0;
          return opening !== 0 || closing !== 0;
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
      
      // Auto-classify
      const classified = classifyDataframeBatch(processedData, savedMappings);
      setCurrentData(classified);
      
      // Fetch stock items if required
      if (includeStockItems && (businessType === 'Trading' || businessType === 'Manufacturing')) {
        try {
          const stockItems = await odbcConnection.fetchStockItems();
          
          // Transform stock items to match the expected format
          const transformedStockItems = stockItems.map((item: any) => ({
            'Item Name': item['Item Name'] || '',
            'Stock Group': item['Stock Group'] || '',
            'Opening Value': parseFloat(item['Opening Value'] || 0),
            'Closing Value': parseFloat(item['Closing Value'] || 0),
            'Stock Category': item['Stock Category'] || '',
            'Key': item['Key'] || ''
          }));
          
          setCurrentStockData(transformedStockItems);
        } catch (error) {
          console.error('Failed to fetch stock items:', error);
          toast({
            title: 'Stock Items Error',
            description: 'Failed to fetch stock items from Tally',
            variant: 'destructive'
          });
        }
      }
      
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
        onClear={handleClearWithConfirmation}
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
            <TabsList className="bg-gray-100 h-8 p-0 gap-0 border-b">
              <TabsTrigger 
                value="trial-balance"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 rounded-none h-8 px-4"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1.5" />
                Trial Balance
              </TabsTrigger>
              <TabsTrigger 
                value="stock-items"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 rounded-none h-8 px-4"
              >
                <Package className="w-3 h-3 mr-1.5" />
                Stock Items
              </TabsTrigger>
              <TabsTrigger 
                value="hierarchy"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 rounded-none h-8 px-4"
              >
                <Layers className="w-3 h-3 mr-1.5" />
                Hierarchy
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 rounded-none h-8 px-4"
              >
                <FileText className="w-3 h-3 mr-1.5" />
                Reports
              </TabsTrigger>
              <TabsTrigger 
                value="notes"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 rounded-none h-8 px-4"
              >
                <FileText className="w-3 h-3 mr-1.5" />
                Notes to Account
              </TabsTrigger>
              <TabsTrigger 
                value="annexures"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 rounded-none h-8 px-4"
              >
                <FileText className="w-3 h-3 mr-1.5" />
                Annexures
              </TabsTrigger>
              <TabsTrigger 
                value="rule-engine"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 rounded-none h-8 px-4"
              >
                <Cog className="w-3 h-3 mr-1.5" />
                Rule Engine
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
                  <TableHead>Parent</TableHead>
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
                  <div className="flex gap-2">
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
              <Button onClick={() => {
                setIsBusinessDialogOpen(false);
                // If Trading or Manufacturing, show stock preference dialog
                if (businessType === 'Trading' || businessType === 'Manufacturing') {
                  setIsStockPreferenceDialogOpen(true);
                } else {
                  handleFetchFromTally();
                }
              }} disabled={!businessType}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Items Preference Dialog */}
      <Dialog open={isStockPreferenceDialogOpen} onOpenChange={setIsStockPreferenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Items Handling</DialogTitle>
            <DialogDescription>
              How would you like to handle stock items for Financial Statement verification?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="stockPreference"
                  checked={includeStockItems}
                  onChange={() => setIncludeStockItems(true)}
                  className="w-4 h-4"
                />
                <span>Import stock items from Tally and include in FS verification</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="stockPreference"
                  checked={!includeStockItems}
                  onChange={() => setIncludeStockItems(false)}
                  className="w-4 h-4"
                />
                <span>I will manually enter stock items later</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsStockPreferenceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setIsStockPreferenceDialogOpen(false);
                handleFetchFromTally();
              }}>
                Confirm & Fetch
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
    </div>
  );
}

