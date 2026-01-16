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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  Save,
  Trash2,
  Settings,
  Package,
  Cog,
  Plus,
  ChevronDown,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTallyODBC } from '@/hooks/useTallyODBC';
import { useEngagement } from '@/contexts/EngagementContext';
import { useTrialBalance, TrialBalanceLineInput } from '@/hooks/useTrialBalance';
import { LedgerRow, generateLedgerKey } from '@/services/trialBalanceNewClassification';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { StockItemsTab } from '@/components/trial-balance-new/StockItemsTab';
import { BulkUpdateDialog } from '@/components/trial-balance-new/BulkUpdateDialog';
import { FilterModal } from '@/components/trial-balance-new/FilterModal';
import { getActualBalanceSign } from '@/utils/naturalBalance';
import { BsplHeadsManager } from '@/components/trial-balance-new/BsplHeadsManager';
import {
  DEFAULT_BSPL_HEADS,
  BsplHeadRow,
  buildBsplOptions,
  filterBsplHeadsByEntityType,
} from '@/utils/bsplHeads';
import { ClassificationRulesBot } from '@/components/trial-balance-new/ClassificationRulesBot';
import { applyClassificationRules, ClassificationRule } from '@/utils/classificationRules';
import { TALLY_DEFAULT_GROUPS } from '@/utils/tallyGroupMaster';

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

type InlineComboboxProps = {
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
  inputStyle?: React.CSSProperties;
};

type TableTabKey = 'actual' | 'classified' | 'stock';

type TableTabSettings = {
  rowHeight: number;
  widths: Record<string, number>;
  fonts: Record<string, number>;
};

const DEFAULT_TABLE_SETTINGS: Record<TableTabKey, TableTabSettings> = {
  actual: {
    rowHeight: 28,
    widths: {
      'Ledger Name': 160,
      'Parent Group': 120,
      'Primary Group': 120,
      'Opening Balance': 100,
      'Debit': 100,
      'Credit': 100,
      'Closing Balance': 100,
      'Is Revenue': 80,
    },
    fonts: {
      'Ledger Name': 10,
      'Parent Group': 10,
      'Primary Group': 10,
      'Opening Balance': 10,
      'Debit': 10,
      'Credit': 10,
      'Closing Balance': 10,
      'Is Revenue': 10,
    },
  },
  classified: {
    rowHeight: 28,
    widths: {
      'Ledger Name': 120,
      'Parent Group': 100,
      'Primary Group': 65,
      'Opening Balance': 70,
      'Closing Balance': 70,
      'H1': 80,
      'H2': 85,
      'H3': 119,
      'Auto': 60,
    },
    fonts: {
      'Ledger Name': 10,
      'Parent Group': 10,
      'Primary Group': 10,
      'Opening Balance': 10,
      'Closing Balance': 10,
      'H1': 11,
      'H2': 11,
      'H3': 11,
      'Auto': 10,
    },
  },
  stock: {
    rowHeight: 28,
    widths: {
      'Item Name': 180,
      'Stock Group': 120,
      'Primary Group': 120,
      'Opening Value': 100,
      'Closing Value': 100,
      'Stock Category': 140,
      'Actions': 80,
    },
    fonts: {
      'Item Name': 10,
      'Stock Group': 10,
      'Primary Group': 10,
      'Opening Value': 10,
      'Closing Value': 10,
      'Stock Category': 10,
      'Actions': 10,
    },
  },
};

function InlineCombobox({
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
  className,
  inputStyle,
}: InlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open, value]);

  const filteredOptions = useMemo(() => {
    const needle = search.toLowerCase().trim();
    if (!needle) return options;
    return options.filter(option => option.toLowerCase().includes(needle));
  }, [options, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) {
          setOpen(false);
          return;
        }
        setOpen(next);
        if (next) {
          setSearch('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => {
            const nextValue = e.target.value;
            onChange(nextValue);
            setSearch(nextValue);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} truncate whitespace-nowrap overflow-hidden`}
          style={inputStyle}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[9999]" align="start" sideOffset={4}>
        <Command>
          <CommandList className="max-h-56 overflow-auto" onWheel={(e) => e.stopPropagation()}>
            {filteredOptions.length === 0 && (
              <CommandEmpty>No matches found.</CommandEmpty>
            )}
            <CommandGroup>
              {filteredOptions.map(option => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  
  // Data State
  const [actualData, setActualData] = useState<LedgerRow[]>([]); // Unclassified actual data
  const [currentData, setCurrentData] = useState<LedgerRow[]>([]); // Classified data
  const [previousData, setPreviousData] = useState<LedgerRow[]>([]);
  const [currentStockData, setCurrentStockData] = useState<any[]>([]);
  const [importPeriodType, setImportPeriodType] = useState<'current' | 'previous'>('current');
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);
  const [isAddLineDialogOpen, setIsAddLineDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<LedgerRow[] | null>(null);
  const [newLineForm, setNewLineForm] = useState({
    ledgerName: '',
    primaryGroup: '',
    openingBalance: 0,
    debit: 0,
    credit: 0,
    closingBalance: 0,
    periodType: 'current' as 'current' | 'previous'
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState('actual-tb'); // Start with Actual TB tab

  // Column widths for resizable columns - Actual TB
  const {
    columnWidths: actualTbColumnWidths,
    handleMouseDown: actualTbHandleMouseDown,
    isResizing: actualTbIsResizing,
    resizingColumn: actualTbResizingColumn
  } = useResizableColumns({
    'Ledger Name': 160,
    'Parent Group': 120,
    'Primary Group': 120,
    'Opening Balance': 100,
    'Debit': 100,
    'Credit': 100,
    'Closing Balance': 100,
    'Is Revenue': 80
  });
  
  // Column widths for resizable columns - Classified TB
  const {
    columnWidths: classifiedTbColumnWidths,
    handleMouseDown: classifiedTbHandleMouseDown,
    isResizing: classifiedTbIsResizing,
    resizingColumn: classifiedTbResizingColumn
  } = useResizableColumns({
    'Ledger Name': 120,
    'Parent Group': 100,
    'Primary Group': 110,
    'Opening Balance': 85,
    'Debit': 85,
    'Credit': 85,
    'Closing Balance': 85,
    'Is Revenue': 80,
    'H1': 80,
    'H2': 85,
    'H3': 85,
    'Auto': 60
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
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<string>('all'); // all, positive, negative, zero
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>('2025-03-31');
  const [odbcPort, setOdbcPort] = useState<string>('9000');
  const [isFetching, setIsFetching] = useState(false);
  const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false);
  const [isOdbcDialogOpen, setIsOdbcDialogOpen] = useState(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1); // For shift+click range selection
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isResetConfirmDialogOpen, setIsResetConfirmDialogOpen] = useState(false);
  const [isBsplHeadsOpen, setIsBsplHeadsOpen] = useState(false);
  const [isRulesBotOpen, setIsRulesBotOpen] = useState(false);
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
  const [tableSettings, setTableSettings] = useState(DEFAULT_TABLE_SETTINGS);
  const [externalConfigActive, setExternalConfigActive] = useState(false);
  const actualColumns = useMemo(() => ([
    'Ledger Name',
    'Parent Group',
    'Primary Group',
    'Opening Balance',
    'Debit',
    'Credit',
    'Closing Balance',
    'Is Revenue',
  ]), []);
  const classifiedColumns = useMemo(() => ([
    'Ledger Name',
    'Parent Group',
    'Primary Group',
    'Opening Balance',
    'Closing Balance',
    'H1',
    'H2',
    'H3',
    'Auto',
  ]), []);
  const stockColumns = useMemo(() => ([
    'Item Name',
    'Stock Group',
    'Primary Group',
    'Opening Value',
    'Closing Value',
    'Stock Category',
    'Actions',
  ]), []);
  
  const [bsplHeads, setBsplHeads] = useState(DEFAULT_BSPL_HEADS);
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>([]);
  const [tallyGroups, setTallyGroups] = useState<string[]>(TALLY_DEFAULT_GROUPS);
  const [stockSelectedCount, setStockSelectedCount] = useState(0);
  const [stockBulkUpdateRequestId, setStockBulkUpdateRequestId] = useState(0);
  const [stockDeleteRequestId, setStockDeleteRequestId] = useState(0);
  // Keep draft entity type in sync when dialog opens
  useEffect(() => {
    if (isEntityDialogOpen) {
      setEntityTypeDraft(entityType);
    }
  }, [isEntityDialogOpen, entityType]);

  useEffect(() => {
    const savedPort = localStorage.getItem('tb_odbc_port');
    if (savedPort) {
      setOdbcPort(savedPort);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tb_odbc_port', odbcPort);
  }, [odbcPort]);

  useEffect(() => {
    let cancelled = false;
    const loadExternalConfig = async () => {
      try {
        const response = await fetch('/classification_logics.xlsx', { cache: 'no-store' });
        if (!response.ok) return;
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const bsplSheet = workbook.Sheets['BSPL Heads'];
        const tallySheet = workbook.Sheets['Tally Default Groups'];

        let nextBspl: BsplHeadRow[] | null = null;
        let nextTally: string[] | null = null;

        if (bsplSheet) {
          const rows = XLSX.utils.sheet_to_json(bsplSheet);
          const mapped = rows
            .map((row: any) => ({
              H1: String(row.H1 || '').trim(),
              H2: String(row.H2 || '').trim(),
              H3: String(row.H3 || '').trim(),
              Condition: row.Condition ? String(row.Condition).trim() : undefined,
            }))
            .filter((row: BsplHeadRow) => row.H1 && row.H2 && row.H3);
          if (mapped.length > 0) nextBspl = mapped;
        }

        if (tallySheet) {
          const rows = XLSX.utils.sheet_to_json(tallySheet, { header: 1 }) as any[];
          const flat = rows.flat().map((cell: any) => String(cell || '').trim()).filter((value: string) => value);
          if (flat.length > 0) nextTally = Array.from(new Set(flat));
        }

        if (cancelled) return;
        if (nextBspl || nextTally) {
          if (nextBspl) setBsplHeads(nextBspl);
          if (nextTally) setTallyGroups(nextTally);
          setExternalConfigActive(true);
        }
      } catch {
        // Ignore external config errors
      }
    };
    loadExternalConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (externalConfigActive) return;
    const clientKey = currentEngagement?.id ? `tb_bspl_heads_${currentEngagement.id}` : null;
    const clientValue = clientKey ? localStorage.getItem(clientKey) : null;
    const globalValue = localStorage.getItem('tb_bspl_heads_global');
    const fallback = DEFAULT_BSPL_HEADS;
    const loadValue = clientValue || globalValue;

    if (loadValue) {
      try {
        const parsed = JSON.parse(loadValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBsplHeads(parsed);
          return;
        }
      } catch {
        // Ignore invalid data
      }
    }
    setBsplHeads(fallback);
  }, [currentEngagement?.id, externalConfigActive]);

  useEffect(() => {
    if (externalConfigActive) return;
    const clientKey = currentEngagement?.id ? `tb_tally_groups_${currentEngagement.id}` : null;
    const clientValue = clientKey ? localStorage.getItem(clientKey) : null;
    const globalValue = localStorage.getItem('tb_tally_groups_global');
    const loadValue = clientValue || globalValue;

    if (loadValue) {
      try {
        const parsed = JSON.parse(loadValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTallyGroups(parsed);
          return;
        }
      } catch {
        // Ignore invalid data
      }
    }
    setTallyGroups(TALLY_DEFAULT_GROUPS);
  }, [currentEngagement?.id, externalConfigActive]);

  const handleSaveBsplHeads = useCallback((rows: BsplHeadRow[]) => {
    const applyGlobal = window.confirm('Apply BSPL Heads for all clients?\n\nOK = All Clients\nCancel = This Client Only');
    if (applyGlobal) {
      localStorage.setItem('tb_bspl_heads_global', JSON.stringify(rows));
    } else if (currentEngagement?.id) {
      localStorage.setItem(`tb_bspl_heads_${currentEngagement.id}`, JSON.stringify(rows));
    }
    setBsplHeads(rows);
  }, [currentEngagement?.id, businessType]);

  const handleRestoreBsplHeads = useCallback((rows: BsplHeadRow[]) => {
    const applyGlobal = window.confirm('Restore default BSPL Heads for all clients?\n\nOK = All Clients\nCancel = This Client Only');
    if (applyGlobal) {
      localStorage.removeItem('tb_bspl_heads_global');
    } else if (currentEngagement?.id) {
      localStorage.removeItem(`tb_bspl_heads_${currentEngagement.id}`);
    }
    setBsplHeads(rows);
  }, [currentEngagement?.id]);

  useEffect(() => {
    const globalRules = localStorage.getItem('tb_classification_rules_global');
    const clientKey = currentEngagement?.id ? `tb_classification_rules_${currentEngagement.id}` : null;
    const clientRules = clientKey ? localStorage.getItem(clientKey) : null;

    let parsedGlobal: ClassificationRule[] = [];
    let parsedClient: ClassificationRule[] = [];
    try {
      parsedGlobal = globalRules ? JSON.parse(globalRules) : [];
    } catch {
      parsedGlobal = [];
    }
    try {
      parsedClient = clientRules ? JSON.parse(clientRules) : [];
    } catch {
      parsedClient = [];
    }

    const combined = [
      ...(Array.isArray(parsedClient) ? parsedClient : []),
      ...(Array.isArray(parsedGlobal) ? parsedGlobal : []),
    ].map((rule) => ({
      ...rule,
      scope: rule.scope || (currentEngagement?.id ? 'client' : 'global'),
    }));
    setClassificationRules(combined);
  }, [currentEngagement?.id]);

  const handleSaveClassificationRules = useCallback((rules: ClassificationRule[]) => {
    const global = rules.filter(rule => rule.scope === 'global');
    const client = rules.filter(rule => rule.scope === 'client');
    localStorage.setItem('tb_classification_rules_global', JSON.stringify(global));
    if (currentEngagement?.id) {
      localStorage.setItem(`tb_classification_rules_${currentEngagement.id}`, JSON.stringify(client));
    }
    setClassificationRules(rules);
  }, [currentEngagement?.id]);

  // Helper to get safe column settings with defaults
  const getColumnWidth = useCallback((columnName: string) => {
    const locked = tableSettings.classified.widths[columnName];
    if (typeof locked === 'number') {
      return locked;
    }
    const value = classifiedTbColumnWidths[columnName];
    return typeof value === 'number' ? value : 80;
  }, [tableSettings, classifiedTbColumnWidths]);

  const getColumnFontSize = useCallback((columnName: string) => {
    const locked = tableSettings.classified.fonts[columnName];
    if (typeof locked === 'number') {
      return locked;
    }
    return 10;
  }, [tableSettings]);

  const getActualColumnWidth = useCallback((columnName: string) => {
    const override = tableSettings.actual.widths[columnName];
    if (typeof override === 'number') {
      return override;
    }
    const value = actualTbColumnWidths[columnName];
    return typeof value === 'number' ? value : 100;
  }, [tableSettings, actualTbColumnWidths]);

  const getActualFontSize = useCallback((columnName: string) => {
    const override = tableSettings.actual.fonts[columnName];
    if (typeof override === 'number') {
      return override;
    }
    return 10;
  }, [tableSettings]);

  const getActualRowHeight = useCallback(() => {
    return tableSettings.actual.rowHeight || 28;
  }, [tableSettings]);

  const getClassifiedRowHeight = useCallback(() => {
    return tableSettings.classified.rowHeight || 28;
  }, [tableSettings]);

  const handleApplyClassificationRules = useCallback((rules: ClassificationRule[]) => {
    setClassificationRules(rules);
    setCurrentData(prev =>
      prev.map(row => applyClassificationRules(row, rules, { businessType, entityType }))
    );
  }, [businessType, entityType]);

  const handleAddTallyGroup = useCallback((value: string, scope: 'client' | 'global') => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setTallyGroups(prev => {
      const next = [trimmed, ...prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase())];
      const applyGlobal = scope === 'global';
      if (applyGlobal) {
        localStorage.setItem('tb_tally_groups_global', JSON.stringify(next));
      } else if (currentEngagement?.id) {
        localStorage.setItem(`tb_tally_groups_${currentEngagement.id}`, JSON.stringify(next));
      }
      return next;
    });
  }, [currentEngagement?.id]);

  const handleReapplyAutoClassification = useCallback(() => {
    const isPlaceholderValue = (value?: string) => {
      const normalized = (value || '').toLowerCase().trim();
      return !normalized ||
        normalized === 'h2' ||
        normalized === 'h3' ||
        normalized === 'select h1' ||
        normalized === 'select h1/h2' ||
        normalized === 'select h1 h2';
    };
    const isGenericOtherExpense = (value?: string) => {
      const normalized = (value || '').toLowerCase().trim();
      return normalized.startsWith('other exp');
    };

    setCurrentData(prev => prev.map(row => {
      if (row.Auto === 'Manual') {
        return row;
      }
      const primary = (row['Primary Group'] || '').toLowerCase();
      const parent = (row['Parent Group'] || '').toLowerCase();
      const group = primary || parent;
      const forceClear = group.includes('indirect expenses') || group.includes('direct expenses');
      const shouldClear = forceClear ||
        isPlaceholderValue(row['H2']) ||
        isPlaceholderValue(row['H3']) ||
        isGenericOtherExpense(row['H2']);
      const cleared = shouldClear
        ? { ...row, 'H2': '', 'H3': '', Auto: undefined, 'Auto Reason': undefined }
        : { ...row, Auto: undefined, 'Auto Reason': undefined };
      return applyClassificationRules(cleared, classificationRules, { businessType, entityType, force: true });
    }));
    toast({
      title: 'Auto classification updated',
      description: 'Reapplied auto rules to classified rows.',
    });
  }, [classificationRules, businessType, entityType, toast]);

  useEffect(() => {
    if (currentData.length === 0) return;
    const normalizeValue = (value?: string) => (value || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
    const isPlaceholder = (value?: string) => {
      const normalized = normalizeValue(value);
      return !normalized || normalized === 'h2' || normalized === 'h3' || normalized === 'select h1/h2' || normalized === 'select h1 h2';
    };
    const isGeneric = (value?: string) => normalizeValue(value).startsWith('other exp');

    let changed = false;
    const next = currentData.map(row => {
      if (row.Auto === 'Manual') {
        return row;
      }
      const primary = normalizeValue(row['Primary Group']);
      const parent = normalizeValue(row['Parent Group']);
      const group = primary || parent;
      const shouldAuto = (group.includes('indirect expenses') || group.includes('direct expenses')) &&
        (isPlaceholder(row['H3']) || isGeneric(row['H2']));
      if (!shouldAuto) return row;
      const updated = applyClassificationRules({ ...row, Auto: undefined, 'Auto Reason': undefined }, classificationRules, { businessType, entityType, force: true });
      if (row['H1'] !== updated['H1'] || row['H2'] !== updated['H2'] || row['H3'] !== updated['H3'] || row['Auto'] !== updated['Auto']) {
        changed = true;
      }
      return updated;
    });
    if (changed) {
      setCurrentData(next);
    }
  }, [currentData, classificationRules, businessType, entityType]);
  
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

  const filteredBsplHeads = useMemo(() => {
    return filterBsplHeadsByEntityType(bsplHeads, entityType);
  }, [bsplHeads, entityType]);

  const mergedBsplHeads = useMemo(() => {
    const combined = [...DEFAULT_BSPL_HEADS];
    bsplHeads.forEach(row => {
      const exists = combined.some(existing =>
        existing.H1 === row.H1 &&
        existing.H2 === row.H2 &&
        existing.H3 === row.H3 &&
        (existing.Condition || '') === (row.Condition || '')
      );
      if (!exists) combined.push(row);
    });
    return combined;
  }, [bsplHeads]);

  const bsplOptions = useMemo(() => {
    return buildBsplOptions(mergedBsplHeads);
  }, [mergedBsplHeads]);

  const resolveH2Key = useCallback((h1: string | undefined, h2: string | undefined) => {
    if (!h1 || !h2) return h2 || '';
    const options = bsplOptions.h2Options[h1] || [];
    const direct = options.find(option => option === h2);
    if (direct) return direct;
    const lower = h2.toLowerCase().trim();
    const ciMatch = options.find(option => option.toLowerCase() === lower);
    if (ciMatch) return ciMatch;
    const withoutS = lower.endsWith('s') ? lower.slice(0, -1) : lower;
    const withS = lower.endsWith('s') ? lower : `${lower}s`;
    const singularMatch = options.find(option => option.toLowerCase() === withoutS);
    if (singularMatch) return singularMatch;
    const pluralMatch = options.find(option => option.toLowerCase() === withS);
    if (pluralMatch) return pluralMatch;
    return h2;
  }, [bsplOptions.h2Options]);

  const getBalanceSignValue = useCallback((row: LedgerRow) => {
    const closing = row['Closing Balance'] || 0;
    const opening = row['Opening Balance'] || 0;
    return closing !== 0 ? closing : opening;
  }, []);

  const deriveH1FromRevenueAndBalance = useCallback((row: LedgerRow) => {
    const primaryGroup = (row['Primary Group'] || '').toLowerCase();
    if (primaryGroup.includes('sales accounts')) {
      return 'Income';
    }
    const isRevenue = row['Is Revenue'] === 'Yes';
    const signValue = getBalanceSignValue(row);
    const isDebit = signValue < 0;

    if (isRevenue) {
      return isDebit ? 'Expense' : 'Income';
    }
    return isDebit ? 'Asset' : 'Liability';
  }, [getBalanceSignValue]);

  const isUserDefinedValue = useCallback((value?: string) => {
    return (value || '').toLowerCase().replace(/\s+/g, '_') === 'user_defined';
  }, []);

  const filterClassifiedRows = useCallback((rows: LedgerRow[]) => {
    return rows.filter(row => {
      const opening = row['Opening Balance'] || 0;
      const closing = row['Closing Balance'] || 0;
      return opening !== 0 || closing !== 0;
    });
  }, []);
  
  // Column filters and sorting state for Actual TB
  const [actualTbColumnFilters, setActualTbColumnFilters] = useState<Record<string, Set<string | number>>>({});
  const [actualTbSortColumn, setActualTbSortColumn] = useState<string | null>(null);
  const [actualTbSortDirection, setActualTbSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  // Column filters and sorting state for Classified TB
  const [classifiedTbColumnFilters, setClassifiedTbColumnFilters] = useState<Record<string, Set<string | number>>>({});
  const [classifiedTbSortColumn, setClassifiedTbSortColumn] = useState<string | null>(null);
  const [classifiedTbSortDirection, setClassifiedTbSortDirection] = useState<'asc' | 'desc' | null>(null);
  
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
  
  const baseClassifiedData = useMemo(() => {
    return currentData.filter(row => {
      const opening = row['Opening Balance'] || 0;
      const closing = row['Closing Balance'] || 0;
      return opening !== 0 || closing !== 0;
    });
  }, [currentData]);

  // Filtered data for Classified TB
  const filteredData = useMemo(() => {
    let filtered = baseClassifiedData;
    
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
          row['Is Revenue'] || '',
          row['H1'] || '',
          row['H2'] || '',
          row['H3'] || '',
          row['Notes'] || '',
          // Include numeric columns as formatted strings
          (row['Opening Balance'] || 0).toString(),
          (row['Debit'] || 0).toString(),
          (row['Credit'] || 0).toString(),
          (row['Closing Balance'] || 0).toString()
        ].join('|').toLowerCase();
        
        return searchableString.includes(searchLower);
      });
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
  }, [baseClassifiedData, searchTerm, classifiedTbColumnFilters, classifiedTbSortColumn, classifiedTbSortDirection, activeTab]);
  
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
    return baseClassifiedData.map(row => row[column as keyof LedgerRow]).filter(v => v !== null && v !== undefined) as (string | number)[];
  }, [baseClassifiedData]);
  
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
      const connected = await odbcConnection.testConnection(odbcPort);
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
  }, [odbcConnection, entityType, businessType, odbcPort]);
  
  // Fetch data from Tally after entity selection
  const handleFetchFromTally = useCallback(async (overrideEntityType?: string) => {
    const effectiveEntityType = overrideEntityType || entityType;

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
          'ABS Opening Balance': Math.abs(line.openingBalance || 0),
          'ABS Closing Balance': Math.abs(line.closingBalance || 0),
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
        })
        .map(row => {
          const baseRow: LedgerRow = {
            ...row,
            'H1': row['H1'] || deriveH1FromRevenueAndBalance(row),
            'H2': row['H2'] || '',
            'H3': row['H3'] || '',
          };
          return applyClassificationRules(baseRow, classificationRules, { businessType, entityType });
        });
      
      // Store actual data (unclassified) - FILTERED DATA (no completely inactive ledgers)
      setActualData(processedData);
      
      // Import directly based on selected period type
      if (importPeriodType === 'current') {
        setActualData(processedData);
        const classifiedRows = filterClassifiedRows(processedData);
        setCurrentData(classifiedRows);
        const userDefinedCount = classifiedRows.filter(row => (row['Notes'] || '').toLowerCase().includes('user_defined')).length;
      } else {
        setPreviousData(processedData);
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
        const dbLines: TrialBalanceLineInput[] = processedData.map(row => ({
          account_code: row['Composite Key'] || '',
          account_name: row['Ledger Name'] || '',
          ledger_parent: row['Parent Group'] || row['Primary Group'] || null,
          ledger_primary_group: row['Primary Group'] || null,
          opening_balance: row['Opening Balance'] || 0,
          debit: row['Debit'] || 0,
          credit: row['Credit'] || 0,
          closing_balance: row['Closing Balance'] || 0,
          is_revenue: row['Is Revenue'] === 'Yes',
          note: row['Notes'] || null,
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

      const userDefinedCount = filterClassifiedRows(processedData)
        .filter(row => (row['Notes'] || '').toLowerCase().includes('user_defined')).length;
      
      toast({
        title: 'Import Successful',
        description: `Imported ${processedData.length} ledgers as ${importPeriodType} period`,
      });
      if (userDefinedCount > 0) {
        toast({
          title: 'Manual Classification Needed',
          description: `${userDefinedCount} row(s) need manual H2/H3. Check Notes column.`,
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch from Tally',
        variant: 'destructive'
      });
      setIsFetching(false);
      setIsEntityDialogOpen(false);
    }
  }, [entityType, businessType, fromDate, toDate, odbcConnection, importPeriodType, currentEngagement, trialBalanceDB, toast, classificationRules, deriveH1FromRevenueAndBalance, filterClassifiedRows]);

  // Save only entity type override
  const handleSaveEntityType = useCallback(async () => {
    if (!entityTypeDraft) {
      toast({
        title: 'Entity type required',
        description: 'Please select an entity type to continue',
        variant: 'destructive',
      });
      return;
    }

    setEntityType(entityTypeDraft);
    toast({
      title: 'Entity updated',
      description: 'Entity type overridden.',
    });

    setIsEntityDialogOpen(false);
  }, [entityTypeDraft, toast]);
  
  // Handle period selection confirmation
  const handlePeriodConfirm = useCallback(async () => {
    if (!pendingImportData) return;
    
    if (importPeriodType === 'current') {
      setCurrentData(filterClassifiedRows(pendingImportData));
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
        note: row['Notes'] || null,
        period_type: importPeriodType,
        period_ending: toDate || null,
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
  }, [pendingImportData, importPeriodType, currentEngagement?.id, toDate, includeStockItems, businessType, odbcConnection, trialBalanceDB, toast, filterClassifiedRows]);
  
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
      'ABS Opening Balance': Math.abs(newLineForm.openingBalance),
      'ABS Closing Balance': Math.abs(newLineForm.closingBalance),
      'Is Revenue': 'No',
      'H1': '',
      'H2': '',
      'H3': '',
      'Sheet Name': newLineForm.periodType === 'current' ? 'TB CY' : 'TB PY'
    };
    const classified = [applyClassificationRules({
      ...newLine,
      'H1': deriveH1FromRevenueAndBalance(newLine),
    }, classificationRules, { businessType, entityType })];
    
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
  }, [newLineForm, toast, classificationRules, deriveH1FromRevenueAndBalance, businessType, entityType]);

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
    const updatedKeys = new Set<string>();
    
    const shouldRecalcH1 = 'Is Revenue' in updates && !('H1' in updates);
    const finalUpdates: Partial<LedgerRow> = { ...updates };

    if ('H1' in updates) {
      finalUpdates['H2'] = '';
      finalUpdates['H3'] = '';
    }
    if ('H2' in updates) {
      finalUpdates['H3'] = '';
    }
    if (isUserDefinedValue(finalUpdates['H2']) || isUserDefinedValue(finalUpdates['H3'])) {
      finalUpdates['H2'] = isUserDefinedValue(finalUpdates['H2']) ? '' : finalUpdates['H2'];
      finalUpdates['H3'] = isUserDefinedValue(finalUpdates['H3']) ? '' : finalUpdates['H3'];
      const note = window.prompt('Enter note for User_Defined classification:', baseRow['Notes'] || '');
      finalUpdates['Notes'] = note && note.trim().length > 0 ? note.trim() : 'User_Defined - set H2/H3 manually';
    }
    if (isUserDefinedValue(finalUpdates['H2']) || isUserDefinedValue(finalUpdates['H3'])) {
      finalUpdates['H2'] = isUserDefinedValue(finalUpdates['H2']) ? '' : finalUpdates['H2'];
      finalUpdates['H3'] = isUserDefinedValue(finalUpdates['H3']) ? '' : finalUpdates['H3'];
      finalUpdates['Notes'] = 'User_Defined - set H2/H3 manually';
    }
    
    selectedRowIndices.forEach(index => {
      if (updatedData[index]) {
        const nextRow = {
          ...updatedData[index],
          ...finalUpdates,
        };
        if (shouldRecalcH1) {
          nextRow['H1'] = deriveH1FromRevenueAndBalance(nextRow);
        }
        updatedData[index] = nextRow;
        if (updatedData[index]['Composite Key']) {
          updatedKeys.add(updatedData[index]['Composite Key'] as string);
        }
      }
    });

    setCurrentData(updatedData);
    if (updatedKeys.size > 0) {
      setActualData(prev =>
        prev.map(row =>
          row['Composite Key'] && updatedKeys.has(row['Composite Key'] as string)
            ? { ...row, ...finalUpdates }
            : row
        )
      );
    }
    setSelectedRowIndices(new Set());
    
    toast({
      title: 'Bulk Update Complete',
      description: `Updated ${updateCount} ledger${updateCount !== 1 ? 's' : ''}`
    });
  }, [currentData, selectedRowIndices, toast, deriveH1FromRevenueAndBalance, isUserDefinedValue]);

  const updateRowAtIndex = useCallback((index: number, updates: Partial<LedgerRow>) => {
    const baseRow = currentData[index];
    if (!baseRow) return;

    const finalUpdates: Partial<LedgerRow> = { ...updates };
    if ('H1' in updates || 'H2' in updates || 'H3' in updates) {
      finalUpdates['Auto'] = 'Manual';
      finalUpdates['Auto Reason'] = undefined;
    }
    if ('H1' in updates) {
      finalUpdates['H2'] = '';
      finalUpdates['H3'] = '';
    }
    if ('H2' in updates) {
      finalUpdates['H3'] = '';
    }
    if ('Is Revenue' in updates && !('H1' in updates)) {
      finalUpdates['H1'] = deriveH1FromRevenueAndBalance({ ...baseRow, ...finalUpdates } as LedgerRow);
    }
    if ('H2' in updates || 'H3' in updates) {
      if ((baseRow.Notes || '').toLowerCase().includes('user_defined')) {
        finalUpdates['Notes'] = '';
      }
    }

    setCurrentData(prev => {
      if (!prev[index]) return prev;
      const updatedRow = { ...prev[index], ...finalUpdates };
      const next = [...prev];
      next[index] = updatedRow;
      return next;
    });

    const compositeKey = baseRow['Composite Key'];
    if (compositeKey) {
      setActualData(prev =>
        prev.map(row =>
          row['Composite Key'] === compositeKey ? { ...row, ...finalUpdates } : row
        )
      );
    }
  }, [currentData, deriveH1FromRevenueAndBalance, isUserDefinedValue]);

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
      const loadedData: LedgerRow[] = trialBalanceDB.lines.map(line => {
        const row: LedgerRow = {
          'Ledger Name': line.account_name,
          'Primary Group': line.ledger_primary_group || '',
          'Parent Group': line.ledger_parent || '',
          'Composite Key': line.account_code,
          'Opening Balance': line.opening_balance,
          'Debit': line.debit,
          'Credit': line.credit,
          'Closing Balance': line.closing_balance,
          'ABS Opening Balance': Math.abs(line.opening_balance || 0),
          'ABS Closing Balance': Math.abs(line.closing_balance || 0),
          'Is Revenue': (line as any).is_revenue ? 'Yes' : 'No',
          'H1': '',
          'H2': '',
          'H3': '',
          'Notes': line.note || '',
          'Sheet Name': 'TB CY'
        };
        row['H1'] = deriveH1FromRevenueAndBalance(row);
        return applyClassificationRules(row, classificationRules, { businessType, entityType });
      });
      
      setActualData(loadedData);
      setCurrentData(filterClassifiedRows(loadedData));
      
      toast({
        title: 'Data Loaded',
        description: `Loaded ${loadedData.length} ledgers from saved data`,
      });
    }
  }, [currentEngagement?.id, trialBalanceDB.lines, classificationRules, deriveH1FromRevenueAndBalance, filterClassifiedRows]);
  
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
          note: row['Notes'] || null,
          period_type: 'current',
          period_ending: toDate || null,
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
          'H1': 'Asset',
          'H2': 'Current Assets',
          'H3': 'Cash and Bank Balance',
          'Notes': '',
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
          'H1': 'Income',
          'H2': 'Revenue from Operations',
          'H3': 'Sale of Products',
          'Notes': '',
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
          'H1': 'Expense',
          'H2': 'Cost of Materials Consumed',
          'H3': 'Purchases of Raw Materials',
          'Notes': '',
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
        { wch: 12 }, // H1
        { wch: 20 }, // H2
        { wch: 25 }, // H3
        { wch: 25 }, // Notes
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
        { 'Column Name': 'H1', 'Description': 'Classification level H1', 'Required': 'No', 'Example': 'Asset, Liability, Income, Expense' },
        { 'Column Name': 'H2', 'Description': 'Classification level H2', 'Required': 'No', 'Example': 'Current Assets, Revenue from Operations' },
        { 'Column Name': 'H3', 'Description': 'Classification level H3', 'Required': 'No', 'Example': 'Cash and Bank Balance' },
        { 'Column Name': 'Notes', 'Description': 'Notes for manual classification', 'Required': 'No', 'Example': 'User_Defined - fill H2/H3' },
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
  }, [toast, entityType, classificationRules, deriveH1FromRevenueAndBalance, currentEngagement?.id, toDate, trialBalanceDB, filterClassifiedRows]);
  
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
        
        if (!entityType) {
          toast({
            title: 'Entity Type Required',
            description: 'Set the entity type before importing so conditions can be applied.',
            variant: 'destructive'
          });
          setIsEntityDialogOpen(true);
          return;
        }

        const processedData: LedgerRow[] = jsonData
          .map((row: any) => {
            const mapped: LedgerRow = {
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
              'ABS Opening Balance': Math.abs(parseFloat(row['Opening Balance'] || row['opening_balance'] || 0)),
              'ABS Closing Balance': Math.abs(parseFloat(row['Closing Balance'] || row['closing_balance'] || 0)),
              'Is Revenue': row['Is Revenue'] || row['is_revenue'] || 'No',
              'H1': row['H1'] || row['h1'] || '',
              'H2': row['H2'] || row['h2'] || '',
              'H3': row['H3'] || row['h3'] || '',
              'Notes': row['Notes'] || row['notes'] || '',
              'Sheet Name': 'TB CY'
            };
            if (!mapped['H1']) {
              mapped['H1'] = deriveH1FromRevenueAndBalance(mapped);
            }
            return applyClassificationRules(mapped, classificationRules, { businessType, entityType });
          })
          .filter(row => {
            // Filter out rows where both opening and closing balances are 0
            return row['Opening Balance'] !== 0 || row['Closing Balance'] !== 0;
          });
        
        setActualData(processedData);
        const classifiedRows = filterClassifiedRows(processedData);
        setCurrentData(classifiedRows);
        const userDefinedCount = classifiedRows.filter(row => (row['Notes'] || '').toLowerCase().includes('user_defined')).length;
        
        // Save to database
        if (currentEngagement?.id) {
          const dbLines: TrialBalanceLineInput[] = processedData.map(row => ({
            account_code: row['Composite Key'] || '',
            account_name: row['Ledger Name'] || '',
            ledger_parent: row['Parent Group'] || row['Primary Group'] || null,
            ledger_primary_group: row['Primary Group'] || null,
            opening_balance: row['Opening Balance'] || 0,
            debit: row['Debit'] || 0,
            credit: row['Credit'] || 0,
            closing_balance: row['Closing Balance'] || 0,
            balance_type: getActualBalanceSign(row),
            note: row['Notes'] || null,
            period_type: 'current',
            period_ending: toDate || null,
          }));
          
          await trialBalanceDB.importLines(dbLines, false);
        }
        
        toast({
          title: 'Import Successful',
          description: `Imported ${processedData.length} ledgers from Excel`
        });
        if (userDefinedCount > 0) {
          toast({
            title: 'Manual Classification Needed',
            description: `${userDefinedCount} row(s) need manual H2/H3. Check Notes column.`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: error instanceof Error ? error.message : 'Failed to import Excel file',
          variant: 'destructive'
        });
      }
    };
    input.click();
  }, [toast]);

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
        { wch: classifiedTbColumnWidths['Parent Group'] / 7 },
        { wch: classifiedTbColumnWidths['Primary Group'] / 7 },
        { wch: classifiedTbColumnWidths['Opening Balance'] / 7 },
        { wch: classifiedTbColumnWidths['Closing Balance'] / 7 },
        { wch: classifiedTbColumnWidths['H1'] / 7 },
        { wch: classifiedTbColumnWidths['H2'] / 7 },
        { wch: classifiedTbColumnWidths['H3'] / 7 },
        { wch: classifiedTbColumnWidths['Notes'] / 7 }
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

  // Clear Data - clears Actual TB, Classified TB, and Stock Items
  const handleClear = useCallback(async () => {
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
        description: 'All Actual TB, Classified TB, and Stock Items data has been cleared'
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear data',
        variant: 'destructive'
      });
    }
  }, [toast, trialBalanceDB, currentEngagement?.id]);
  
  // Modified handleClear to confirm before clearing data
  const handleClearWithConfirmation = useCallback(() => {
    setIsResetConfirmDialogOpen(true);
  }, []);
  
  const handleConfirmReset = useCallback(async () => {
    await handleClear();
    setIsResetConfirmDialogOpen(false);
  }, [handleClear]);

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
      <div className="flex items-center justify-between px-1 py-0.5 bg-white border-b" style={{ minHeight: '28px' }}>
        {/* Left: Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2">
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

          {/* Bulk Update (with count) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const activeSelectionCount = activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount;
              if (activeSelectionCount === 0) {
                toast({
                  title: 'No Selection',
                  description: activeTab === 'stock-items'
                    ? 'Please select stock items to update'
                    : 'Please select visible filtered rows to update',
                  variant: 'destructive'
                });
                return;
              }
              if (activeTab === 'stock-items') {
                setStockBulkUpdateRequestId(prev => prev + 1);
              } else {
                setIsBulkUpdateDialogOpen(true);
              }
            }}
            disabled={activeTab === 'stock-items' ? stockSelectedCount === 0 : (currentData.length === 0 || selectedFilteredCount === 0)}
            className="h-7 text-xs px-2"
          >
            <Settings className="w-3 h-3 mr-1.5" />
            {(() => {
              if (activeTab === 'stock-items') {
                return stockSelectedCount === 1 ? 'Update Stock' : 'Bulk Update Stock';
              }
              return selectedFilteredCount === 1 ? 'Update Ledger' : 'Bulk Update Ledgers';
            })()} {(activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount) > 0 &&
              `(${activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount})`}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRulesBotOpen(true)}
            className="h-8"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Rules Bot {classificationRules.length > 0 ? `(${classificationRules.length})` : ''}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReapplyAutoClassification}
            disabled={currentData.length === 0}
            className="h-8"
          >
            Auto Apply
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={currentData.length === 0}
                className="h-7 text-xs px-2"
              >
                <Download className="w-3 h-3 mr-1.5" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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
        <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-50 rounded border text-xs">
          <Calendar className="w-3 h-3 text-gray-500" />
          <Dialog>
            <DialogTrigger asChild>
              <button className="font-medium text-gray-700 hover:text-blue-600 text-xs">
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
            "flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
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
              <DropdownMenuItem onClick={() => setIsOdbcDialogOpen(true)}>
                <Database className="w-4 h-4 mr-2" />
                ODBC Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsBsplHeadsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Manage BSPL Heads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTableSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Table Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSave} disabled={currentData.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                Save Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleClearWithConfirmation} 
                disabled={currentData.length === 0 && actualData.length === 0 && currentStockData.length === 0}
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
      <div className="flex items-center gap-2 px-1 py-0.5 bg-white border-b" style={{ minHeight: '28px' }}>
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search ledgers, groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 pl-7 text-xs"
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
            className="h-7 text-xs px-2"
          >
            <Settings className="w-4 h-4 mr-2" />
            Filters
            {(() => {
              const activeCount = [
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
          </div>

          {/* Selection Info & Add Line */}
          <div className="flex items-center gap-2">
            {(activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount) > 0 && (
              <Badge variant="default" className="h-7 px-2 text-xs">
                {activeTab === 'stock-items'
                  ? `${stockSelectedCount} selected`
                  : `${selectedFilteredCount} of ${filteredData.length} selected`}
              </Badge>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsAddLineDialogOpen(true)}
              className="h-7 text-xs px-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              {activeTab === 'stock-items' ? 'Add Item' : 'Add Ledger'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (activeTab === 'stock-items') {
                  setStockDeleteRequestId(prev => prev + 1);
                } else {
                  handleDeleteSelected();
                }
              }}
              className="h-7 text-xs px-2"
              disabled={activeTab === 'stock-items' ? stockSelectedCount === 0 : selectedRowIndices.size === 0}
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
            <TabsList className="h-6 bg-transparent border-b-0 px-1 gap-0 rounded-none justify-start">
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
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area - Maximized for table display */}
        <div className="flex-1 overflow-auto" style={{ height: 'calc(100vh - 160px)' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            
            {/* ACTUAL TRIAL BALANCE TAB */}
            <TabsContent value="actual-tb" className="mt-0 p-1">
              <div className="border rounded overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-8 sticky top-0 bg-white p-0" style={{ left: actualStickyOffsets.selection, zIndex: 20 }}>
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
                  <TableHead
                    className="sticky top-0 bg-white relative"
                    style={{ width: getActualColumnWidth('Ledger Name'), left: actualStickyOffsets.ledger, zIndex: 19 }}
                  >
                    <div className="flex items-center gap-1" style={{ fontSize: `${getActualFontSize('Ledger Name')}px` }}>
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
                  <TableHead className="top-0 bg-white relative" style={{ width: getActualColumnWidth('Parent Group') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getActualFontSize('Parent Group')}px` }}>
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
                  <TableHead className="top-0 bg-white relative" style={{ width: getActualColumnWidth('Primary Group') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getActualFontSize('Primary Group')}px` }}>
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
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: getActualColumnWidth('Opening Balance') }}>
                    <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getActualFontSize('Opening Balance')}px` }}>
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
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: getActualColumnWidth('Debit') }}>
                    <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getActualFontSize('Debit')}px` }}>
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
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: getActualColumnWidth('Credit') }}>
                    <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getActualFontSize('Credit')}px` }}>
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
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: getActualColumnWidth('Closing Balance') }}>
                    <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getActualFontSize('Closing Balance')}px` }}>
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
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: getActualColumnWidth('Is Revenue') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getActualFontSize('Is Revenue')}px` }}>
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
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
                        style={{ height: `${getActualRowHeight()}px` }}
                        onClick={(e) => toggleRowSelection(originalIndex, e)}
                      >
                        <TableCell className="sticky left-0 bg-white z-10 p-0" style={{ left: actualStickyOffsets.selection, width: 32 }}>
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
                          className="font-medium sticky bg-white z-10 truncate"
                          style={{ left: actualStickyOffsets.ledger, width: getActualColumnWidth('Ledger Name'), fontSize: `${getActualFontSize('Ledger Name')}px` }}
                          title={row['Ledger Name']}
                        >
                          {row['Ledger Name']}
                        </TableCell>
                        <TableCell
                          className="text-gray-600 max-w-[180px] truncate"
                          style={{ width: getActualColumnWidth('Parent Group'), fontSize: `${getActualFontSize('Parent Group')}px` }}
                          title={row['Parent Group']}
                        >
                          {row['Parent Group']}
                        </TableCell>
                        <TableCell
                          className="max-w-[180px] truncate"
                          style={{ width: getActualColumnWidth('Primary Group'), fontSize: `${getActualFontSize('Primary Group')}px` }}
                          title={row['Primary Group']}
                        >
                          {row['Primary Group']}
                        </TableCell>
                        <TableCell className="text-right" style={{ width: getActualColumnWidth('Opening Balance'), fontSize: `${getActualFontSize('Opening Balance')}px` }}>
                          {formatNumber(row['Opening Balance'])}
                        </TableCell>
                        <TableCell className="text-right" style={{ width: getActualColumnWidth('Debit'), fontSize: `${getActualFontSize('Debit')}px` }}>
                          {formatNumber(row['Debit'])}
                        </TableCell>
                        <TableCell className="text-right" style={{ width: getActualColumnWidth('Credit'), fontSize: `${getActualFontSize('Credit')}px` }}>
                          {formatNumber(row['Credit'])}
                        </TableCell>
                        <TableCell className="text-right font-medium" style={{ width: getActualColumnWidth('Closing Balance'), fontSize: `${getActualFontSize('Closing Balance')}px` }}>
                          {formatNumber(row['Closing Balance'])}
                        </TableCell>
                        <TableCell style={{ width: getActualColumnWidth('Is Revenue'), fontSize: `${getActualFontSize('Is Revenue')}px` }}>
                          {row['Is Revenue']}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
              </div>
            </TabsContent>

            {/* CLASSIFIED TRIAL BALANCE TAB */}
            <TabsContent value="classified-tb" className="mt-0 p-1">
              <div className="border rounded-lg overflow-x-auto h-[calc(100vh-300px)]">
            <Table className="table-fixed w-full border-collapse">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-8 sticky top-0 bg-white p-0" style={{ left: classifiedStickyOffsets.selection, zIndex: 20 }}>
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
                  <TableHead
                    className="sticky top-0 bg-white relative"
                    style={{ width: getColumnWidth('Ledger Name'), left: classifiedStickyOffsets.ledger, zIndex: 19 }}
                  >
                    <div className="flex items-center gap-1" style={{ fontSize: `${getColumnFontSize('Ledger Name')}px` }}>
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
                  </TableHead>
                  <TableHead className="top-0 bg-white relative" style={{ width: getColumnWidth('Parent Group') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getColumnFontSize('Parent Group')}px` }}>
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
                  </TableHead>
                  <TableHead className="top-0 bg-white relative" style={{ width: getColumnWidth('Primary Group') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getColumnFontSize('Primary Group')}px` }}>
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
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: getColumnWidth('Opening Balance') }}>
                    <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getColumnFontSize('Opening Balance')}px` }}>
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
                  </TableHead>
                  <TableHead className="text-right top-0 bg-white relative" style={{ width: getColumnWidth('Closing Balance') }}>
                    <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getColumnFontSize('Closing Balance')}px` }}>
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
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: getColumnWidth('H1') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getColumnFontSize('H1')}px` }}>
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
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: getColumnWidth('H2') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getColumnFontSize('H2')}px` }}>
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
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: getColumnWidth('H3') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getColumnFontSize('H3')}px` }}>
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
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white relative" style={{ width: getColumnWidth('Auto') }}>
                    <div className="flex items-center gap-1" style={{ fontSize: `${getColumnFontSize('Auto')}px` }}>
                      Auto
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
                        style={{ height: `${getClassifiedRowHeight()}px` }}
                        onClick={(e) => {
                          setFocusedClassifiedRowIndex(originalIndex);
                          toggleRowSelection(originalIndex, e);
                        }}
                        tabIndex={0}
                        onFocus={() => setFocusedClassifiedRowIndex(originalIndex)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()} className="sticky left-0 bg-white z-10 p-0" style={{ left: classifiedStickyOffsets.selection, width: 28 }}>
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
                          className="font-medium sticky bg-white z-10 truncate px-2 py-1"
                          style={{ left: classifiedStickyOffsets.ledger, width: getColumnWidth('Ledger Name'), fontSize: `${getColumnFontSize('Ledger Name')}px` }}
                          title={row['Ledger Name']}
                        >
                          {row['Ledger Name']}
                        </TableCell>
                        <TableCell
                          className="text-gray-600 truncate px-2 py-1"
                          style={{ width: getColumnWidth('Parent Group'), fontSize: `${getColumnFontSize('Parent Group')}px` }}
                          title={row['Parent Group'] || row['Primary Group'] || '-'}
                        >
                          {row['Parent Group'] || row['Primary Group'] || '-'}
                        </TableCell>
                        <TableCell
                          className="truncate px-2 py-1"
                          style={{ width: getColumnWidth('Primary Group'), fontSize: `${getColumnFontSize('Primary Group')}px` }}
                          title={row['Primary Group']}
                        >
                          {row['Primary Group']}
                        </TableCell>
                        <TableCell className="text-right px-2 py-1" style={{ width: getColumnWidth('Opening Balance'), fontSize: `${getColumnFontSize('Opening Balance')}px` }}>
                          {formatNumber(row['Opening Balance'])}
                        </TableCell>
                        <TableCell className="text-right font-medium px-2 py-1" style={{ width: getColumnWidth('Closing Balance'), fontSize: `${getColumnFontSize('Closing Balance')}px` }}>
                          {formatNumber(row['Closing Balance'])}
                        </TableCell>
                        <TableCell className="px-2 py-1" style={{ width: getColumnWidth('H1'), fontSize: `${getColumnFontSize('H1')}px` }}>
                          <Select
                            value={row['H1'] || ''}
                            onValueChange={(value) => updateRowAtIndex(originalIndex, { 'H1': value, 'H2': '', 'H3': '' })}
                          >
                            <SelectTrigger className="h-4 px-1" style={{ fontSize: `${getColumnFontSize('H1')}px` }}>
                              <SelectValue placeholder="Select H1" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                              {bsplOptions.h1Options.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-2 py-1 truncate text-left" style={{ width: getColumnWidth('H2'), fontSize: `${getColumnFontSize('H2')}px` }}>
                          <InlineCombobox
                            value={row['H2'] || ''}
                            options={[
                              ...(bsplOptions.h2Options[row['H1'] || ''] || []),
                              'User_Defined',
                            ]}
                            placeholder={row['H1'] ? 'H2' : 'Select H1'}
                            disabled={!row['H1']}
                            onChange={(value) => updateRowAtIndex(originalIndex, { 'H2': value })}
                            className="h-4 px-1 w-full text-gray-900 leading-none py-0"
                            inputStyle={{ fontSize: `${getColumnFontSize('H2')}px`, textAlign: 'left' }}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1 truncate text-left" style={{ width: getColumnWidth('H3'), fontSize: `${getColumnFontSize('H3')}px` }}>
                          {(() => {
                            const resolvedH2 = resolveH2Key(row['H1'], row['H2']);
                            const options = (bsplOptions.h3Options[row['H1'] || ''] || {})[resolvedH2 || row['H2'] || ''] || [];
                            return (
                              <>
                                <InlineCombobox
                                  value={row['H3'] || ''}
                                  options={[...options, 'User_Defined']}
                                  placeholder={row['H1'] && row['H2'] ? 'H3' : 'Select H1/H2'}
                                  disabled={!row['H1'] || !row['H2']}
                                  onChange={(value) => updateRowAtIndex(originalIndex, { 'H3': value })}
                                  className="h-4 px-1 w-full text-gray-900 leading-none py-0"
                                  inputStyle={{ fontSize: `${getColumnFontSize('H3')}px`, textAlign: 'left' }}
                                />
                              </>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-2 py-1" style={{ width: getColumnWidth('Auto'), fontSize: `${getColumnFontSize('Auto')}px` }}>
                          {row['Auto'] === 'Yes' ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="secondary" title="Auto classified" className="h-4 px-1 text-[10px]">
                                Auto
                              </Badge>
                            </div>
                          ) : row['Auto'] === 'Manual' ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" title="Manually classified" className="h-4 px-1 text-[10px]">
                                Manual
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="stock-items" className="mt-0 p-1">
              <StockItemsTab 
                stockData={currentStockData} 
                onUpdateStockData={setCurrentStockData}
                businessType={businessType}
                searchTerm={searchTerm}
                onSelectionChange={setStockSelectedCount}
                bulkUpdateRequestId={stockBulkUpdateRequestId}
                deleteSelectedRequestId={stockDeleteRequestId}
                tableSettings={tableSettings.stock}
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
                <span>|</span>
                <span>{currentData.length} Ledger{currentData.length !== 1 ? 's' : ''}</span>
                <span>|</span>
                <span>{selectedRowIndices.size} Selected</span>
                <span>|</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded">Ctrl+/</kbd>
          <span>for shortcuts</span>
        </div>
      </div>
    </div>
    
      {/* Table Settings Dialog */}
      <Dialog open={isTableSettingsOpen} onOpenChange={setIsTableSettingsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Table Settings</DialogTitle>
            <DialogDescription>
              Adjust column widths, font sizes, and row heights for each tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="rounded-md border p-3">
              <div className="mb-2 font-semibold">Actual TB</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-24">Row Height</span>
                <input
                  type="number"
                  min="20"
                  max="40"
                  value={tableSettings.actual.rowHeight}
                  onChange={(e) =>
                    setTableSettings((prev) => ({
                      ...prev,
                      actual: { ...prev.actual, rowHeight: parseInt(e.target.value, 10) || prev.actual.rowHeight },
                    }))
                  }
                  className="h-6 w-20 rounded border px-2"
                />
                <span>px</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {actualColumns.map((column) => (
                  <div key={column} className="flex items-center gap-2">
                    <span className="w-24 truncate" title={column}>{column}</span>
                    <label className="flex items-center gap-1">
                      <span>W</span>
                      <input
                        type="number"
                        min="40"
                        max="260"
                        value={tableSettings.actual.widths[column] ?? getActualColumnWidth(column)}
                        onChange={(e) =>
                          setTableSettings((prev) => ({
                            ...prev,
                            actual: {
                              ...prev.actual,
                              widths: {
                                ...prev.actual.widths,
                                [column]: parseInt(e.target.value, 10) || prev.actual.widths[column],
                              },
                            },
                          }))
                        }
                        className="h-6 w-16 rounded border px-2"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>F</span>
                      <input
                        type="number"
                        min="8"
                        max="14"
                        value={tableSettings.actual.fonts[column] ?? getActualFontSize(column)}
                        onChange={(e) =>
                          setTableSettings((prev) => ({
                            ...prev,
                            actual: {
                              ...prev.actual,
                              fonts: {
                                ...prev.actual.fonts,
                                [column]: parseInt(e.target.value, 10) || prev.actual.fonts[column],
                              },
                            },
                          }))
                        }
                        className="h-6 w-12 rounded border px-2"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="mb-2 font-semibold">Classified TB</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-24">Row Height</span>
                <input
                  type="number"
                  min="20"
                  max="40"
                  value={tableSettings.classified.rowHeight}
                  onChange={(e) =>
                    setTableSettings((prev) => ({
                      ...prev,
                      classified: { ...prev.classified, rowHeight: parseInt(e.target.value, 10) || prev.classified.rowHeight },
                    }))
                  }
                  className="h-6 w-20 rounded border px-2"
                />
                <span>px</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {classifiedColumns.map((column) => (
                  <div key={column} className="flex items-center gap-2">
                    <span className="w-24 truncate" title={column}>{column}</span>
                    <label className="flex items-center gap-1">
                      <span>W</span>
                      <input
                        type="number"
                        min="40"
                        max="260"
                        value={tableSettings.classified.widths[column] ?? getColumnWidth(column)}
                        onChange={(e) =>
                          setTableSettings((prev) => ({
                            ...prev,
                            classified: {
                              ...prev.classified,
                              widths: {
                                ...prev.classified.widths,
                                [column]: parseInt(e.target.value, 10) || prev.classified.widths[column],
                              },
                            },
                          }))
                        }
                        className="h-6 w-16 rounded border px-2"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>F</span>
                      <input
                        type="number"
                        min="8"
                        max="14"
                        value={tableSettings.classified.fonts[column] ?? getColumnFontSize(column)}
                        onChange={(e) =>
                          setTableSettings((prev) => ({
                            ...prev,
                            classified: {
                              ...prev.classified,
                              fonts: {
                                ...prev.classified.fonts,
                                [column]: parseInt(e.target.value, 10) || prev.classified.fonts[column],
                              },
                            },
                          }))
                        }
                        className="h-6 w-12 rounded border px-2"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="mb-2 font-semibold">Stock Items</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-24">Row Height</span>
                <input
                  type="number"
                  min="20"
                  max="40"
                  value={tableSettings.stock.rowHeight}
                  onChange={(e) =>
                    setTableSettings((prev) => ({
                      ...prev,
                      stock: { ...prev.stock, rowHeight: parseInt(e.target.value, 10) || prev.stock.rowHeight },
                    }))
                  }
                  className="h-6 w-20 rounded border px-2"
                />
                <span>px</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {stockColumns.map((column) => (
                  <div key={column} className="flex items-center gap-2">
                    <span className="w-24 truncate" title={column}>{column}</span>
                    <label className="flex items-center gap-1">
                      <span>W</span>
                      <input
                        type="number"
                        min="40"
                        max="260"
                        value={tableSettings.stock.widths[column] ?? DEFAULT_TABLE_SETTINGS.stock.widths[column]}
                        onChange={(e) =>
                          setTableSettings((prev) => ({
                            ...prev,
                            stock: {
                              ...prev.stock,
                              widths: {
                                ...prev.stock.widths,
                                [column]: parseInt(e.target.value, 10) || prev.stock.widths[column],
                              },
                            },
                          }))
                        }
                        className="h-6 w-16 rounded border px-2"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>F</span>
                      <input
                        type="number"
                        min="8"
                        max="14"
                        value={tableSettings.stock.fonts[column] ?? DEFAULT_TABLE_SETTINGS.stock.fonts[column]}
                        onChange={(e) =>
                          setTableSettings((prev) => ({
                            ...prev,
                            stock: {
                              ...prev.stock,
                              fonts: {
                                ...prev.stock.fonts,
                                [column]: parseInt(e.target.value, 10) || prev.stock.fonts[column],
                              },
                            },
                          }))
                        }
                        className="h-6 w-12 rounded border px-2"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTableSettingsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
              <p className="text-xs text-muted-foreground">Pulled from master client by default. You can override for this import without reimporting.</p>
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
        bsplOptions={bsplOptions}
      />

      {/* BSPL Heads Manager */}
      <BsplHeadsManager
        open={isBsplHeadsOpen}
        onOpenChange={setIsBsplHeadsOpen}
        heads={bsplHeads}
        defaultHeads={DEFAULT_BSPL_HEADS}
        onSave={handleSaveBsplHeads}
        onRestore={handleRestoreBsplHeads}
      />

      <ClassificationRulesBot
        open={isRulesBotOpen}
        onOpenChange={setIsRulesBotOpen}
        rules={classificationRules}
        onSave={handleSaveClassificationRules}
        bsplOptions={bsplOptions}
        defaultScope={currentEngagement?.id ? 'client' : 'global'}
        groupOptions={tallyGroups}
        onAddGroup={handleAddTallyGroup}
      />

      {/* ODBC Settings Dialog */}
      <Dialog open={isOdbcDialogOpen} onOpenChange={setIsOdbcDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ODBC Settings</DialogTitle>
            <DialogDescription>
              Set the Tally ODBC port used for connection checks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="odbc-port">Tally ODBC Port</Label>
            <Input
              id="odbc-port"
              value={odbcPort}
              onChange={(e) => setOdbcPort(e.target.value)}
              placeholder="9000"
            />
            <div className="text-xs text-muted-foreground">
              Default port is 9000. Ensure Tally is running with ODBC enabled.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOdbcDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <FilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        groupFilter={groupFilter}
        balanceFilter={balanceFilter}
        onGroupFilterChange={setGroupFilter}
        onBalanceFilterChange={setBalanceFilter}
        onResetFilters={handleResetFilters}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetConfirmDialogOpen} onOpenChange={setIsResetConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Trial Balance Data</DialogTitle>
            <DialogDescription>
              This will clear all trial balance data and stock items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="font-medium text-yellow-900">Warning</p>
              <p className="mt-1 text-yellow-800">All trial balance data and stock items will be cleared. This action cannot be undone.</p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Ledger rows: <strong>{currentData.length} rows</strong></p>
              {currentStockData.length > 0 && (
                <p>Stock items: <strong>{currentStockData.length} items</strong></p>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsResetConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmReset}>
                Clear Data
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
      
    </div>
  );
}
