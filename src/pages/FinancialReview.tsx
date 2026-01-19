import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTallyODBC } from '@/hooks/useTallyODBC';
import { useEngagement } from '@/contexts/EngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/hooks/useClient';
import { useTrialBalance, TrialBalanceLineInput } from '@/hooks/useTrialBalance';
import { LedgerRow, generateLedgerKey } from '@/services/trialBalanceNewClassification';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useExportedFileDialog } from '@/contexts/ExportedFileDialogContext';
import { Checkbox } from '@/components/ui/checkbox';
import { getActualBalanceSign } from '@/utils/naturalBalance';
import {
  DEFAULT_BSPL_HEADS,
  BsplHeadRow,
  buildBsplOptions,
  filterBsplHeadsByEntityType,
} from '@/utils/bsplHeads';
import { applyClassificationRules, ClassificationRule, RuleScope } from '@/utils/classificationRules';
import { TALLY_DEFAULT_GROUPS } from '@/utils/tallyGroupMaster';
import { buildNoteStructure, getNoteH2Options, getScaleFactor, isZeroAfterScale } from '@/utils/noteBuilder';
import { buildFaceFromNotes, buildPreparedNotes } from '@/utils/noteFaceBuilder';
import { detectFormulaCycles, evaluateFormula, extractRowRefs, extractVariableRefs } from '@/utils/statementFormula';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { buildSearchText } from '@/utils/financialReview/search';
import { filterActualRows, filterClassifiedRowsByFilters } from '@/utils/financialReview/filters';
import { filterClassifiedRows } from '@/utils/financialReview/rows';
import { computeTotals } from '@/utils/financialReview/totals';
import { buildKeyToIndexMap, computeSelectedFilteredCount } from '@/utils/financialReview/selection';
import { FinancialReviewToolbar } from '@/components/financial-review/FinancialReviewToolbar';
import { ClassificationRulesBot } from '@/components/trial-balance-new/ClassificationRulesBot';
import { ActualTBTable } from '@/components/financial-review/ActualTBTable';
import { ClassifiedTBTable } from '@/components/financial-review/ClassifiedTBTable';
import { TotalsBar } from '@/components/financial-review/TotalsBar';
import { BulkUpdateDialogComponent } from '@/components/financial-review/BulkUpdateDialog';
import { BsplHeadsManager } from '@/components/trial-balance-new/BsplHeadsManager';
import { LedgerAnnexureDialog, LedgerItem } from '@/components/trial-balance-new/LedgerAnnexureDialog';

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

const ACTUAL_SEARCH_FIELDS: Array<keyof LedgerRow> = [
  'Ledger Name',
  'Primary Group',
  'Parent Group',
  'Opening Balance',
  'Debit',
  'Credit',
  'Closing Balance',
];

const CLASSIFIED_SEARCH_FIELDS: Array<keyof LedgerRow> = [
  'Ledger Name',
  'Primary Group',
  'Parent Group',
  'Is Revenue',
  'H1',
  'H2',
  'H3',
  'Notes',
  'Opening Balance',
  'Debit',
  'Credit',
  'Closing Balance',
];

type ManualInventoryValues = {
  rawMaterials: { opening: number; closing: number };
  workInProgress: { opening: number; closing: number };
  finishedGoods: { opening: number; closing: number };
  stockInTrade: { opening: number; closing: number };
};

const EMPTY_MANUAL_INVENTORY: ManualInventoryValues = {
  rawMaterials: { opening: 0, closing: 0 },
  workInProgress: { opening: 0, closing: 0 },
  finishedGoods: { opening: 0, closing: 0 },
  stockInTrade: { opening: 0, closing: 0 },
};

const STOCK_DETAIL_NOTE = 'Stock Details';

const STOCK_DETAIL_CATEGORIES: Array<{
  key: keyof ManualInventoryValues;
  label: string;
}> = [
  { key: 'rawMaterials', label: 'Raw Materials' },
  { key: 'workInProgress', label: 'Work-in-Progress' },
  { key: 'finishedGoods', label: 'Finished Goods' },
  { key: 'stockInTrade', label: 'Stock-in-Trade' },
];

const normalizeStockDetailKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const createStockDetailCompositeKey = (label: string) =>
  `stock_detail_${normalizeStockDetailKey(label)}`;

const buildStockDetailRow = (params: {
  ledgerName: string;
  opening: number;
  closing: number;
  h1: string;
  h2: string;
  h3: string;
  isRevenue: boolean;
  parentGroup?: string;
}): LedgerRow => {
  const closingValue = Number(params.closing) || 0;
  const debit = Math.max(0, closingValue);
  const credit = Math.max(0, -closingValue);
  return {
    'Ledger Name': params.ledgerName,
    'Parent Group': params.parentGroup || 'Inventories',
    'Primary Group': 'Inventories',
    'Composite Key': createStockDetailCompositeKey(params.ledgerName),
    'Opening Balance': Number(params.opening) || 0,
    'Debit': debit,
    'Credit': credit,
    'Closing Balance': closingValue,
    'Is Revenue': params.isRevenue ? 'Yes' : 'No',
    'H1': params.h1,
    'H2': params.h2,
    'H3': params.h3,
    'Notes': STOCK_DETAIL_NOTE,
    'Auto': 'Manual',
  };
};

const buildStockDetailRows = (values: ManualInventoryValues): LedgerRow[] => {
  const rows = STOCK_DETAIL_CATEGORIES.map(category => {
    const opening = values[category.key].opening || 0;
    const closing = values[category.key].closing || 0;
    return buildStockDetailRow({
      ledgerName: `Closing Inventory [${category.label}]`,
      opening,
      closing,
      h1: 'Asset',
      h2: 'Inventories',
      h3: category.label,
      isRevenue: false,
    });
  });

  const totalOpening = STOCK_DETAIL_CATEGORIES.reduce(
    (acc, category) => acc + (values[category.key].opening || 0),
    0
  );
  const totalClosing = STOCK_DETAIL_CATEGORIES.reduce(
    (acc, category) => acc + (values[category.key].closing || 0),
    0
  );
  const changeValue = Number(totalOpening - totalClosing) || 0;

  rows.push(
    buildStockDetailRow({
      ledgerName: 'Change in Inventories',
      opening: 0,
      closing: changeValue,
      h1: 'Expense',
      h2: 'Change in Inventories',
      h3: 'Change in Inventories',
      isRevenue: true,
      parentGroup: 'Change in Inventories',
    })
  );

  return rows;
};

const isStockDetailRow = (row: LedgerRow) => (row['Notes'] || '') === STOCK_DETAIL_NOTE;

const stripStockDetailRows = (rows: LedgerRow[]) =>
  rows.filter(row => !isStockDetailRow(row));

const parseFinancialYearRange = (yearCode?: string | null) => {
  if (!yearCode) return null;
  const match = yearCode.trim().match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return null;
  const startYear = parseInt(match[1], 10);
  const endRaw = match[2];
  const endYear = endRaw.length === 2 ? parseInt(`${String(startYear).slice(0, 2)}${endRaw}`, 10) : parseInt(endRaw, 10);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
  return {
    fromDate: `${startYear}-04-01`,
    toDate: `${endYear}-03-31`,
  };
};

const shiftDateByYears = (dateStr: string, years: number) => {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const year = parseInt(match[1], 10);
  const month = match[2];
  const day = match[3];
  return `${year + years}-${month}-${day}`;
};

const mapConstitutionToEntityType = (constitution?: string | null) => {
  const normalized = (constitution || '').toLowerCase();
  switch (normalized) {
    case 'company':
      return 'Private Limited Company';
    case 'llp':
      return 'Limited Liability Partnership (LLP)';
    case 'partnership':
      return 'Partnership';
    case 'proprietorship':
      return 'Individual / Sole Proprietorship';
    case 'trust':
      return 'Trust';
    case 'society':
      return 'Society';
    default:
      return 'Others';
  }
};

const mapIndustryToBusinessType = (industry?: string | null) => {
  const normalized = (industry || '').toLowerCase();
  if (normalized.includes('manufactur')) return 'Manufacturing';
  if (normalized.includes('trading') || normalized.includes('retail') || normalized.includes('wholesale')) {
    return 'Trading - Wholesale and Retail';
  }
  if (normalized.includes('construct')) return 'Construction';
  if (normalized.includes('service')) return 'Service';
  return 'Others';
};

const formatDateIndianShort = (dateStr?: string) => {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const year = match[1];
  const month = parseInt(match[2], 10);
  const day = match[3];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = months[month - 1] || '';
  const yy = year.slice(-2);
  if (!mon) return '';
  return `${day}-${mon}-${yy}`;
};

const formatFyLabel = (yearCode?: string | null) => {
  if (!yearCode) return '';
  const match = yearCode.trim().match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return '';
  const startYear = parseInt(match[1], 10);
  const endRaw = match[2];
  const endYear = endRaw.length === 2 ? parseInt(`${String(startYear).slice(0, 2)}${endRaw}`, 10) : parseInt(endRaw, 10);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return '';
  const endShort = String(endYear).slice(-2);
  return `FY ${startYear}-${endShort}`;
};

type TableTabKey = 'actual' | 'classified';

type TableTabSettings = {
  rowHeight: number;
  widths: Record<string, number>;
  fonts: Record<string, number>;
};

type NoteRowOverride = {
  label?: string;
  labelWhenPartnership?: string;
  labelWhenOther?: string;
  useAltLabelForOthers?: boolean;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  indent?: number;
  isParent?: boolean;
  hidden?: boolean;
  manualParentId?: string;
  rowType?: 'INPUT' | 'CALC' | 'HEADER' | 'SUBTOTAL' | 'TOTAL' | 'CONDITIONAL';
  formula?: string;
  visibility?: 'always' | 'nonzero' | 'childNonZero' | 'enabled';
  enabled?: boolean;
  manualValue?: number;
  noteNoMode?: 'auto' | 'hide' | 'custom';
  noteNoOverride?: number;
  valueSource?: 'manual' | 'ledger' | 'user';
  allowNegative?: boolean;
  noteTarget?: string;
};

type NoteLayout = {
  order: string[];
  manualRows: Record<string, { label: string }>;
  overrides: Record<string, NoteRowOverride>;
  templateVersion?: number;
};

type FlatNoteRow = {
  id: string;
  label: string;
  amount: number;
  formattedAmount: string;
  type: 'parent' | 'child' | 'item';
  parentLabel?: string;
};

type DisplayNoteRow = {
  id: string;
  label: string;
  amount: number;
  formattedAmount: string;
  indent: number;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  isParent: boolean;
  isManual: boolean;
  autoType?: FlatNoteRow['type'];
  rowType?: NoteRowOverride['rowType'];
  parentId?: string;
  noteNo?: number;
  isSection?: boolean;
  noteTarget?: string;
  formulaWarning?: boolean;
  missingRowRefs?: string[];
  missingVariableRefs?: string[];
  hasCycle?: boolean;
};

const BS_FACE_TEMPLATE_VERSION = 1;
const PL_FACE_TEMPLATE_VERSION = 1;

const DEFAULT_TABLE_SETTINGS: Record<TableTabKey, TableTabSettings> = {
  actual: {
    rowHeight: 26,
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
      'Ledger Name': 12,
      'Parent Group': 12,
      'Primary Group': 12,
      'Opening Balance': 12,
      'Debit': 12,
      'Credit': 12,
      'Closing Balance': 12,
      'Is Revenue': 12,
    },
  },
  classified: {
    rowHeight: 26,
    widths: {
      'Ledger Name': 120,
      'Parent Group': 100,
      'Primary Group': 65,
      'Opening Balance': 70,
      'Closing Balance': 70,
      'H1': 80,
      'H2': 85,
      'H3': 119,
      'Status': 140,
    },
    fonts: {
      'Ledger Name': 12,
      'Parent Group': 12,
      'Primary Group': 12,
      'Opening Balance': 12,
      'Closing Balance': 12,
      'H1': 12,
      'H2': 12,
      'H3': 12,
      'Status': 12,
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

export default function FinancialReview() {
  const { currentEngagement } = useEngagement();
  const { toast } = useToast();
  const { confirmExportedFile } = useExportedFileDialog();
  const { role } = useAuth();
  const isProUser = role === 'partner' || role === 'manager';
  const odbcConnection = useTallyODBC();
  const trialBalanceDB = useTrialBalance(currentEngagement?.id);
  const { client } = useClient(currentEngagement?.client_id || null);
  
  // Entity and Business Info
  const [entityType, setEntityType] = useState<string>('');
  const [entityTypeDraft, setEntityTypeDraft] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('');
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Data State
  const [actualData, setActualData] = useState<LedgerRow[]>([]); // Unclassified actual data
  const [currentData, setCurrentData] = useState<LedgerRow[]>([]); // Classified data
  const [previousData, setPreviousData] = useState<LedgerRow[]>([]);
  const [currentStockData, setCurrentStockData] = useState<any[]>([]);
  const [stockSelectedCount, setStockSelectedCount] = useState(0);
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
    'Primary Group': 156,
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
    'Primary Group': 143,
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
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
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
  const [isNoteNumberDialogOpen, setIsNoteNumberDialogOpen] = useState(false);
  const [tableSettings, setTableSettings] = useState(DEFAULT_TABLE_SETTINGS);
  const [externalConfigActive, setExternalConfigActive] = useState(false);
  const [userDefinedExpenseThreshold, setUserDefinedExpenseThreshold] = useState(5000);
  const [numberScale, setNumberScale] = useState<'actual' | 'tens' | 'hundreds' | 'thousands' | 'lakhs' | 'millions' | 'crores'>('actual');
  const [noteStatementType, setNoteStatementType] = useState<'BS' | 'PL'>('PL');
  const [selectedNoteH2, setSelectedNoteH2] = useState('');
  const showParentNoteTotals = true;
  const [noteTableSettings, setNoteTableSettings] = useState({
    rowHeight: 28,
    particularsWidth: 420,
    amountWidth: 160,
    fontSize: 12,
  });
  const [notePreviewZoom, setNotePreviewZoom] = useState(1);
  const [inventorySource, setInventorySource] = useState<"imported" | "manual">("imported");
  const [manualInventoryValues, setManualInventoryValues] = useState<ManualInventoryValues | null>(null);
  const [manualInventoryDraft, setManualInventoryDraft] = useState<ManualInventoryValues>(EMPTY_MANUAL_INVENTORY);
  const [isManualInventoryDialogOpen, setIsManualInventoryDialogOpen] = useState(false);
  const [stockDetailsCollapsed, setStockDetailsCollapsed] = useState(false);
  const [isInventoryImportPromptOpen, setIsInventoryImportPromptOpen] = useState(false);
  const [pendingInventoryImport, setPendingInventoryImport] = useState<{ rows: LedgerRow[]; isPrevious: boolean } | null>(null);
  const [showNoteSettings, setShowNoteSettings] = useState(false);
  const [showFaceSettings, setShowFaceSettings] = useState(false);
  const [isNoteLedgerDialogOpen, setIsNoteLedgerDialogOpen] = useState(false);
  const [useHierarchicalNoteView, setUseHierarchicalNoteView] = useState(false);
  const [noteNewRowLabel, setNoteNewRowLabel] = useState('');
  const [noteSelectedLabel, setNoteSelectedLabel] = useState('');
  const [noteParentAnchorId, setNoteParentAnchorId] = useState<string | null>(null);
  const [notePreviewDefaults, setNotePreviewDefaults] = useState({
    rowHeight: 28,
    particularsWidth: 420,
    amountWidth: 160,
    fontSize: 12,
    zoom: 1,
  });
  const manualInventoryKey = useMemo(() => {
    return currentEngagement?.id ? `tb_inventory_manual_${currentEngagement.id}` : null;
  }, [currentEngagement?.id]);
  const [noteLayouts, setNoteLayouts] = useState<Record<string, NoteLayout>>({});
  const [noteLayoutPayload, setNoteLayoutPayload] = useState<Record<string, unknown>>({});
  const [noteLayoutLoaded, setNoteLayoutLoaded] = useState(false);
  const [noteEditMode, setNoteEditMode] = useState(false);
  const [selectedNoteRowId, setSelectedNoteRowId] = useState<string | null>(null);
  const noteListRef = useRef<HTMLDivElement | null>(null);
  const saveNoteLayoutsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataLoadedToastRef = useRef<string | null>(null);
  const [noteNumberStart, setNoteNumberStart] = useState(3);
  const [noteNumberStartDraft, setNoteNumberStartDraft] = useState('3');
  const [statementVariables, setStatementVariables] = useState<Record<string, { type: 'number' | 'percent' | 'text'; value: string }>>({});
  const [isVariablesDialogOpen, setIsVariablesDialogOpen] = useState(false);
  const [newVariableName, setNewVariableName] = useState('');
  const [newVariableType, setNewVariableType] = useState<'number' | 'percent' | 'text'>('number');

  const stockColumns = useMemo(() => ([
    'Item Name',
    'Stock Group',
    'Primary Group',
    'Opening Value',
    'Closing Value',
    'Stock Category',
    'Actions',
  ]), []);

  // Define enrichRowsWithStockDetails first (needed by refreshTablesWithStockDetails)
  const enrichRowsWithStockDetails = useCallback(
    (rows: LedgerRow[], overrideValues?: ManualInventoryValues | null, overrideSource?: 'manual' | 'imported') => {
      const base = stripStockDetailRows(rows);
      const source = overrideSource ?? inventorySource;
      const values = overrideValues ?? manualInventoryValues;
      if (source === 'manual' && values) {
        return [...base, ...buildStockDetailRows(values)];
      }
      return base;
    },
    [inventorySource, manualInventoryValues]
  );

  // Define refreshTablesWithStockDetails (used by manual inventory handlers)
  const refreshTablesWithStockDetails = useCallback(
    (overrideValues?: ManualInventoryValues | null, overrideSource?: 'manual' | 'imported') => {
      setActualData(prev => enrichRowsWithStockDetails(prev, overrideValues, overrideSource));
      setCurrentData(prev => enrichRowsWithStockDetails(prev, overrideValues, overrideSource));
    },
    [enrichRowsWithStockDetails]
  );

  useEffect(() => {
    if (!manualInventoryKey) {
      setManualInventoryValues(null);
      setInventorySource('imported');
      return;
    }
    const raw = localStorage.getItem(manualInventoryKey);
    if (!raw) {
      setManualInventoryValues(null);
      setInventorySource('imported');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as ManualInventoryValues;
      setManualInventoryValues(parsed);
      setInventorySource('manual');
      refreshTablesWithStockDetails(parsed, 'manual');
    } catch {
      setManualInventoryValues(null);
      setInventorySource('imported');
    }
  }, [manualInventoryKey]);

  useEffect(() => {
    if (isManualInventoryDialogOpen) {
      setManualInventoryDraft(manualInventoryValues || EMPTY_MANUAL_INVENTORY);
    }
  }, [isManualInventoryDialogOpen, manualInventoryValues]);

  useEffect(() => {
    setManualInventoryDraft(manualInventoryValues || EMPTY_MANUAL_INVENTORY);
  }, [manualInventoryValues]);
  
  useEffect(() => {
    dataLoadedToastRef.current = null;
  }, [currentEngagement?.id]);
  const persistManualInventoryValues = useCallback((values: ManualInventoryValues) => {
    if (!manualInventoryKey) {
      return false;
    }
    setManualInventoryValues(values);
    setInventorySource('manual');
    localStorage.setItem(manualInventoryKey, JSON.stringify(values));
    toast({
      title: 'Manual inventory saved',
      description: 'Inventory values will be used for notes and face statements.'
    });
    refreshTablesWithStockDetails(values, 'manual');
    return true;
  }, [manualInventoryKey, toast, refreshTablesWithStockDetails]);

  const handleManualInventorySave = useCallback(() => {
    persistManualInventoryValues(manualInventoryDraft);
  }, [manualInventoryDraft, persistManualInventoryValues]);

  const resetManualInventoryDraft = useCallback(() => {
    setManualInventoryDraft(manualInventoryValues || EMPTY_MANUAL_INVENTORY);
  }, [manualInventoryValues]);

  const handleSaveManualInventory = useCallback(() => {
    persistManualInventoryValues(manualInventoryDraft);
    setIsManualInventoryDialogOpen(false);
  }, [manualInventoryDraft, persistManualInventoryValues]);

  const manualInventoryTotals = useMemo(() => {
    const opening = STOCK_DETAIL_CATEGORIES.reduce(
      (acc, category) => acc + (manualInventoryDraft[category.key].opening || 0),
      0
    );
    const closing = STOCK_DETAIL_CATEGORIES.reduce(
      (acc, category) => acc + (manualInventoryDraft[category.key].closing || 0),
      0
    );
    return { opening, closing };
  }, [manualInventoryDraft]);

  const handleClearManualInventory = useCallback((closePrompt?: boolean) => {
    if (manualInventoryKey) {
      localStorage.removeItem(manualInventoryKey);
    }
    setManualInventoryValues(null);
    setInventorySource('imported');
    refreshTablesWithStockDetails(null, 'imported');
    if (closePrompt) {
      setIsInventoryImportPromptOpen(false);
    }
  }, [manualInventoryKey, refreshTablesWithStockDetails]);

  const handleKeepManualInventory = useCallback(() => {
    setIsInventoryImportPromptOpen(false);
  }, []);
  const toggleStockDetails = useCallback(() => {
    setStockDetailsCollapsed(prev => !prev);
  }, []);
  const updateManualInventoryDraftValue = useCallback((
    key: keyof ManualInventoryValues,
    field: 'opening' | 'closing',
    value: string
  ) => {
    const parsed = value === '' ? 0 : Number(value);
    setManualInventoryDraft(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  }, []);
  useEffect(() => {
    if (!isProUser) {
      if (noteEditMode) setNoteEditMode(false);
      if (showNoteSettings) setShowNoteSettings(false);
      if (showFaceSettings) setShowFaceSettings(false);
    }
  }, [isProUser, noteEditMode, showNoteSettings, showFaceSettings]);
  const [newVariableValue, setNewVariableValue] = useState('');
  const [selectedFaceRowId, setSelectedFaceRowId] = useState<string | null>(null);
  const [faceNewRowLabel, setFaceNewRowLabel] = useState('');
  const [faceSelectedLabel, setFaceSelectedLabel] = useState('');
  const [faceParentAnchorId, setFaceParentAnchorId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'notes-pl' || activeTab === 'face-pl') {
      setNoteStatementType('PL');
    } else if (activeTab === 'notes-bs' || activeTab === 'face-bs') {
      setNoteStatementType('BS');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isProUser && (activeTab === 'face-bs' || activeTab === 'face-pl')) {
      setActiveTab(noteStatementType === 'PL' ? 'notes-pl' : 'notes-bs');
    }
  }, [activeTab, isProUser, noteStatementType]);
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
    'Status',
  ]), []);
  const [bsplHeads, setBsplHeads] = useState(DEFAULT_BSPL_HEADS);
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>([]);
  const [tallyGroups, setTallyGroups] = useState<string[]>(TALLY_DEFAULT_GROUPS);
  const previousFromDate = useMemo(() => shiftDateByYears(fromDate, -1), [fromDate]);
  const previousToDate = useMemo(() => shiftDateByYears(toDate, -1), [toDate]);
  const currentFyLabel = useMemo(() => formatFyLabel(currentEngagement?.financial_year), [currentEngagement?.financial_year]);
  const previousFyLabel = useMemo(() => {
    if (!currentEngagement?.financial_year) return '';
    const match = currentEngagement.financial_year.trim().match(/^(\d{4})-(\d{2}|\d{4})$/);
    if (!match) return '';
    const startYear = parseInt(match[1], 10);
    const endRaw = match[2];
    const endYear = endRaw.length === 2 ? parseInt(`${String(startYear).slice(0, 2)}${endRaw}`, 10) : parseInt(endRaw, 10);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return '';
    const prevStart = startYear - 1;
    const prevEndShort = String(endYear - 1).slice(-2);
    return `FY ${prevStart}-${prevEndShort}`;
  }, [currentEngagement?.financial_year]);
  const visiblePeriodLabel = useMemo(() => {
    const isPrevious = importPeriodType === 'previous';
    const prefix = isPrevious ? 'Previous' : 'Current';
    const fyLabel = isPrevious ? previousFyLabel : currentFyLabel;
    if (fyLabel) return `${prefix} ${fyLabel}`;
    return `${prefix} Period`;
  }, [
    activeTab,
    importPeriodType,
    currentFyLabel,
    previousFyLabel,
  ]);

  // Keep draft entity type in sync when dialog opens
  useEffect(() => {
    if (isEntityDialogOpen) {
      setEntityTypeDraft(entityType);
    }
  }, [isEntityDialogOpen, entityType]);

  useEffect(() => {
    const range = parseFinancialYearRange(currentEngagement?.financial_year);
    if (!range) return;
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setImportPeriodType('current');
  }, [currentEngagement?.financial_year]);

  useEffect(() => {
    if (!client) return;
    const mappedEntityType = mapConstitutionToEntityType(client.constitution);
    const mappedBusinessType = mapIndustryToBusinessType(client.industry);
    if (mappedEntityType) setEntityType(mappedEntityType);
    if (mappedBusinessType) setBusinessType(mappedBusinessType);
  }, [client?.id, client?.constitution, client?.industry]);

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
    const savedThreshold = localStorage.getItem('tb_user_defined_expense_threshold');
    if (savedThreshold) {
      const parsed = parseFloat(savedThreshold);
      if (!Number.isNaN(parsed)) {
        setUserDefinedExpenseThreshold(parsed);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tb_user_defined_expense_threshold', String(userDefinedExpenseThreshold));
  }, [userDefinedExpenseThreshold]);

  useEffect(() => {
    const savedScale = localStorage.getItem('tb_number_scale');
    if (savedScale) {
      setNumberScale(savedScale as typeof numberScale);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tb_number_scale', numberScale);
  }, [numberScale]);

  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem('statement_layout_config');
      let payload: Record<string, unknown> = {};
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = {};
        }
      }

      const layouts = (payload.noteLayouts && typeof payload.noteLayouts === 'object')
        ? payload.noteLayouts as Record<string, NoteLayout>
        : {};
      const previewSettings = payload.notePreviewSettings && typeof payload.notePreviewSettings === 'object'
        ? payload.notePreviewSettings as Record<string, unknown>
        : null;
      const variables = payload.variables && typeof payload.variables === 'object'
        ? payload.variables as Record<string, { type: 'number' | 'percent' | 'text'; value: string }>
        : {};

      if (!cancelled) {
        const payloadNoteStart = typeof payload.noteNumberStart === 'number' ? payload.noteNumberStart : 3;
        setNoteLayouts(layouts);
        setNoteLayoutPayload({ ...payload, noteNumberStart: payloadNoteStart, variables });
        setNoteNumberStart(payloadNoteStart);
        setNoteNumberStartDraft(String(payloadNoteStart));
        setStatementVariables(variables);
        if (previewSettings) {
          const nextDefaults = {
            rowHeight: typeof previewSettings.rowHeight === 'number' ? previewSettings.rowHeight : notePreviewDefaults.rowHeight,
            particularsWidth: typeof previewSettings.particularsWidth === 'number' ? previewSettings.particularsWidth : notePreviewDefaults.particularsWidth,
            amountWidth: typeof previewSettings.amountWidth === 'number' ? previewSettings.amountWidth : notePreviewDefaults.amountWidth,
            fontSize: typeof previewSettings.fontSize === 'number' ? previewSettings.fontSize : notePreviewDefaults.fontSize,
            zoom: typeof previewSettings.zoom === 'number' ? previewSettings.zoom : notePreviewDefaults.zoom,
          };
          setNotePreviewDefaults(nextDefaults);
          setNoteTableSettings((prev) => ({
            rowHeight: nextDefaults.rowHeight,
            particularsWidth: nextDefaults.particularsWidth,
            amountWidth: nextDefaults.amountWidth,
            fontSize: nextDefaults.fontSize,
          }));
          setNotePreviewZoom(nextDefaults.zoom);
        }
        setNoteLayoutLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load statement layout config:', error);
      if (!cancelled) {
        setNoteLayouts({});
        setNoteLayoutPayload({});
        setStatementVariables({});
        setNoteLayoutLoaded(true);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!noteLayoutLoaded) return;
    if (saveNoteLayoutsRef.current) {
      clearTimeout(saveNoteLayoutsRef.current);
    }
    saveNoteLayoutsRef.current = setTimeout(async () => {
      try {
        const payload = { ...noteLayoutPayload, noteLayouts, variables: statementVariables };
        localStorage.setItem('statement_layout_config', JSON.stringify(payload));
      } catch (error) {
        console.error('Failed to save statement layout config:', error);
      }
    }, 800);

    return () => {
      if (saveNoteLayoutsRef.current) {
        clearTimeout(saveNoteLayoutsRef.current);
      }
    };
  }, [noteLayouts, noteLayoutPayload, noteLayoutLoaded, statementVariables]);

  useEffect(() => {
    let cancelled = false;
    const loadExternalConfig = async () => {
      try {
        const response = await fetch('/classification_logics.xlsx', { cache: 'no-store' });
        if (!response.ok) return;
        const buffer = await response.arrayBuffer();
        const XLSX = await import('xlsx');
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

  const handleSaveManualRules = useCallback(() => {
    let scope: RuleScope = currentEngagement?.id ? 'client' : 'global';
    if (currentEngagement?.id) {
      const saveForAll = window.confirm('Save manual rules for all clients? Click OK for All Clients, Cancel for This Client.');
      scope = saveForAll ? 'global' : 'client';
    }

    const sourceRows = selectedRowIndices.size > 0
      ? Array.from(selectedRowIndices).map(index => currentData[index]).filter(Boolean)
      : currentData.filter(row => row?.Auto === 'Manual');

    if (sourceRows.length === 0) {
      toast({
        title: 'No Manual Rows',
        description: 'Edit at least one row manually or select rows to save rules.',
        variant: 'destructive',
      });
      return;
    }

    const existingKeys = new Set(
      classificationRules.map(rule => [
        rule.scope,
        rule.ledgerNameContains || '',
        rule.primaryGroupContains || '',
        rule.parentGroupContains || '',
        rule.h1,
        rule.h2,
        rule.h3,
      ].join('|').toLowerCase())
    );

    const newRules = sourceRows
      .filter(row => row['H1'] && row['H2'] && row['H3'])
      .map(row => {
        const rule = {
          id: `rule_${Date.now()}_${row['Composite Key'] || row['Ledger Name']}`,
          scope,
          ledgerNameContains: String(row['Ledger Name'] || '').trim(),
          primaryGroupContains: String(row['Primary Group'] || '').trim(),
          parentGroupContains: String(row['Parent Group'] || '').trim(),
          h1: String(row['H1'] || '').trim(),
          h2: String(row['H2'] || '').trim(),
          h3: String(row['H3'] || '').trim(),
        };
        return rule;
      })
      .filter(rule => {
        const key = [
          rule.scope,
          rule.ledgerNameContains || '',
          rule.primaryGroupContains || '',
          rule.parentGroupContains || '',
          rule.h1,
          rule.h2,
          rule.h3,
        ].join('|').toLowerCase();
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

    if (newRules.length === 0) {
      toast({
        title: 'Nothing to Save',
        description: 'Selected rows must have H1, H2, and H3 filled.',
        variant: 'destructive',
      });
      return;
    }

    const merged = [...classificationRules, ...newRules];
    handleSaveClassificationRules(merged);
    toast({
      title: 'Rules Saved',
      description: `Saved ${newRules.length} manual rule${newRules.length !== 1 ? 's' : ''}.`,
    });
  }, [classificationRules, selectedRowIndices, currentData, handleSaveClassificationRules, toast, currentEngagement?.id]);

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
    return 12;
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
    return 12;
  }, [tableSettings]);

  const getActualRowHeight = useCallback(() => {
    return tableSettings.actual.rowHeight || 28;
  }, [tableSettings]);

  const getClassifiedRowHeight = useCallback(() => {
    return tableSettings.classified.rowHeight || 28;
  }, [tableSettings]);

  const hasManualRows = useMemo(() => {
    return currentData.some(row => row?.Auto === 'Manual');
  }, [currentData]);

  const handleApplyClassificationRules = useCallback((rules: ClassificationRule[]) => {
    setClassificationRules(rules);
    setCurrentData(prev =>
      enrichRowsWithStockDetails(
        prev.map(row => applyClassificationRules(row, rules, { businessType, entityType, userDefinedExpenseThreshold }))
      )
    );
  }, [businessType, entityType, enrichRowsWithStockDetails]);

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
    setCurrentData(prev => enrichRowsWithStockDetails(
      prev.map(row => {
        if (row.Auto === 'Manual') {
          return row;
        }
        const cleared = { ...row, Auto: undefined, 'Auto Reason': undefined };
        return applyClassificationRules(cleared, classificationRules, { businessType, entityType, force: true, userDefinedExpenseThreshold });
      })
    ));
    toast({
      title: 'Auto classification updated',
      description: 'Reapplied auto rules to classified rows.',
    });
  }, [classificationRules, businessType, entityType, toast, userDefinedExpenseThreshold]);

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
      const updated = applyClassificationRules(
        { ...row, Auto: undefined, 'Auto Reason': undefined },
        classificationRules,
        { businessType, entityType, force: true, userDefinedExpenseThreshold }
      );
      if (row['H1'] !== updated['H1'] || row['H2'] !== updated['H2'] || row['H3'] !== updated['H3'] || row['Auto'] !== updated['Auto']) {
        changed = true;
      }
      return updated;
    });
    if (changed) {
      setCurrentData(enrichRowsWithStockDetails(next));
    }
  }, [currentData, classificationRules, businessType, entityType, userDefinedExpenseThreshold]);
  
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

  const isCompanyEntityType = useMemo(() => {
    const normalized = (entityType || '').toLowerCase();
    return normalized.includes('private limited') ||
      normalized.includes('public limited') ||
      normalized.includes('one person company') ||
      normalized.includes('opc');
  }, [entityType]);

  const isPartnershipEntityType = useMemo(() => {
    const normalized = (entityType || '').toLowerCase();
    return normalized.includes('partnership') ||
      normalized.includes('limited liability partnership') ||
      normalized.includes('llp');
  }, [entityType]);

  const isNonCompanyEntityType = useMemo(() => !isCompanyEntityType, [isCompanyEntityType]);

  const applyManualInventoryRows = useCallback((rows: LedgerRow[]) => {
    if (inventorySource !== 'manual' || !manualInventoryValues) return rows;
    const hasStockDetails = rows.some(isStockDetailRow);
    if (hasStockDetails) return rows;
    return [...rows, ...buildStockDetailRows(manualInventoryValues)];
  }, [inventorySource, manualInventoryValues]);

  const hasInventoryInRows = useCallback((rows: LedgerRow[]) => {
    return rows.some(row =>
      String(row['H2'] || '') === 'Inventories' ||
      String(row['Primary Group'] || '').toLowerCase().includes('stock') ||
      String(row['Parent Group'] || '').toLowerCase().includes('stock')
    );
  }, []);

    const normalizeOption = useCallback((value: string) => {
    return (value || '')
      .toLowerCase()
      .replace(/[��`]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const getFilteredH2Options = useCallback((row: LedgerRow) => {
    const base = bsplOptions.h2Options[row['H1'] || ''] || [];
    const primary = normalizeOption(String(row['Primary Group'] || ''));
    const h1 = normalizeOption(String(row['H1'] || ''));
    const isCapitalAccount = primary.includes('capital account') && h1 === 'liability';
    if (!isCapitalAccount) return base;

    const companyHidden = [
      "partners' capital account",
      "owners' capital account",
      "partners' current account",
      "owners' current account",
    ];
    const partnershipHidden = [
      'share capital',
      "owners' capital account",
    ];
    const otherHidden = [
      "partners' capital account",
      'share capital',
    ];

    const hidden = isCompanyEntityType
      ? companyHidden
      : (isPartnershipEntityType ? partnershipHidden : otherHidden);
    const hiddenSet = new Set(hidden.map(normalizeOption));
    return base.filter(option => !hiddenSet.has(normalizeOption(option)));
  }, [bsplOptions.h2Options, isCompanyEntityType, isPartnershipEntityType, normalizeOption]);

  const getFilteredH3Options = useCallback((row: LedgerRow, options: string[]) => {
    const primary = normalizeOption(String(row['Primary Group'] || ''));
    const h1 = normalizeOption(String(row['H1'] || ''));
    const isCapitalAccount = primary.includes('capital account') && h1 === 'liability';
    if (!isCapitalAccount || !isCompanyEntityType) return options;

    const hidden = new Set([
      "partners' capital account",
      "owners' capital account",
      "partners' current account",
      "owners' current account",
    ].map(normalizeOption));
    return options.filter(option => !hidden.has(normalizeOption(option)));
  }, [isCompanyEntityType, normalizeOption]);

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

  // Column filters and sorting state for Actual TB
  const [actualTbColumnFilters, setActualTbColumnFilters] = useState<Record<string, Set<string | number>>>({});
  const [actualTbSortColumn, setActualTbSortColumn] = useState<string | null>(null);
  const [actualTbSortDirection, setActualTbSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  // Column filters and sorting state for Classified TB
  const [classifiedTbColumnFilters, setClassifiedTbColumnFilters] = useState<Record<string, Set<string | number>>>({});
  const [classifiedTbSortColumn, setClassifiedTbSortColumn] = useState<string | null>(null);
  const [classifiedTbSortDirection, setClassifiedTbSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  const actualDataWithSearch = useMemo(() => {
    return actualData.map((row) => ({
      ...row,
      __searchText: buildSearchText(row, ACTUAL_SEARCH_FIELDS),
    }));
  }, [actualData]);

  const baseClassifiedData = useMemo(() => filterClassifiedRows(currentData), [currentData]);

  const classifiedDataWithSearch = useMemo(() => {
    return baseClassifiedData.map((row) => ({
      ...row,
      __searchText: buildSearchText(row, CLASSIFIED_SEARCH_FIELDS),
    }));
  }, [baseClassifiedData]);

  // Filtered data for Actual TB
  const filteredActualData = useMemo(() => {
    const actualSearch = activeTab === 'actual-tb' ? debouncedSearchTerm : '';
    return filterActualRows({
      rows: actualDataWithSearch,
      searchTerm: actualSearch,
      groupFilter: activeTab === 'actual-tb' ? groupFilter : 'all',
      balanceFilter: activeTab === 'actual-tb' ? balanceFilter : 'all',
      columnFilters: actualTbColumnFilters,
      sortColumn: actualTbSortColumn,
      sortDirection: actualTbSortDirection,
    });
  }, [
    actualDataWithSearch,
    debouncedSearchTerm,
    groupFilter,
    balanceFilter,
    actualTbColumnFilters,
    actualTbSortColumn,
    actualTbSortDirection,
    activeTab,
  ]);

  const normalizeMappingValue = useCallback((value?: string) => {
    return (value || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
  }, []);

  const isMappingPlaceholder = useCallback((value?: string) => {
    const normalized = normalizeMappingValue(value);
    if (!normalized) return true;
    return normalized === 'h2' ||
      normalized === 'h3' ||
      normalized === 'select h1' ||
      normalized === 'select h1/h2' ||
      normalized === 'select h1 h2';
  }, [normalizeMappingValue]);

  const getMappingStatus = useCallback((row: LedgerRow) => {
    const h1 = normalizeMappingValue(row['H1']);
    const h2 = normalizeMappingValue(row['H2']);
    const h3 = normalizeMappingValue(row['H3']);
    const hasH1 = !!h1;
    const hasH2 = !!h2 && !isMappingPlaceholder(row['H2']);
    const hasH3 = !!h3 && !isMappingPlaceholder(row['H3']);
    if (hasH1 && hasH2 && hasH3) return 'Mapped';
    if (hasH1 && hasH2) return 'Partial';
    if (hasH1) return 'Unmapped';
    return 'Unmapped';
  }, [isMappingPlaceholder, normalizeMappingValue]);

  const getConfidenceStatus = useCallback((row: LedgerRow) => {
    if (row.Auto === 'Manual') return 'Manual';
    if (row.Auto === 'Yes') {
      const mapping = getMappingStatus(row);
      return mapping === 'Mapped' ? 'Confident Auto' : 'Review Auto';
    }
    return 'Unmapped';
  }, [getMappingStatus]);

  const getStatusLabel = useCallback((row: LedgerRow) => {
    const mapping = getMappingStatus(row);
    const confidence = getConfidenceStatus(row);
    if (confidence === 'Unmapped') return mapping;
    return `${mapping} · ${confidence}`;
  }, [getConfidenceStatus, getMappingStatus]);

  const defaultH2Order = useMemo(() => ([
    'Share Capital',
    "Owners' Capital Account",
    "Partners' Capital Account",
    'Reserves and Surplus',
    'Long-term Borrowings',
    'Short-term Borrowings',
    'Trade Payables',
    'Other Long-term Liabilities',
    'Other Current Liabilities',
    'Unclassified Liabilities',
    'Long-term Provisions',
    'Short-term Provisions',
    'Deferred Tax Liabilities (Net)',
    'Share Application Money Pending Allotment',
    'Minority Interest',
    'Property, Plant and Equipment',
    'Intangible Assets',
    'Non-current Investments',
    'Current Investments',
    'Trade Receivables',
    'Inventories',
    'Cash and Bank Balances',
    'Long-term Loans and Advances',
    'Short-term Loans and Advances',
    'Other Non-current Assets',
    'Other Current Assets',
    'Unclassified Assets',
    'Deferred Tax Assets (Net)',
    'Revenue from Operations',
    'Other Income',
    'Cost of Materials Consumed',
    'Purchases of Stock in Trade',
    'Change in Inventories',
    'Employee Benefits Expense',
    'Finance Costs',
    'Depreciation and Amortisation Expense',
    'Other Expenses',
    'User_Defined_Expense - 1',
    'Prior Period Items',
    'Exceptional Items',
    'Extraordinary Items',
    "Partners' Remuneration",
    'Tax Expenses',
    'Share of Profit & Loss in Consolidation',
  ]), []);

  const defaultH2Rank = useMemo(() => new Map(defaultH2Order.map((value, index) => [value, index])), [defaultH2Order]);

  const sortClassifiedByDefaultH2 = useCallback((rows: LedgerRow[]) => {
    const getRank = (value?: string) => {
      if (!value) return Number.MAX_SAFE_INTEGER;
      return defaultH2Rank.get(value) ?? Number.MAX_SAFE_INTEGER;
    };
    return [...rows].sort((a, b) => {
      const aRank = getRank(a['H2'] as string | undefined);
      const bRank = getRank(b['H2'] as string | undefined);
      if (aRank !== bRank) return aRank - bRank;
      const aLedger = String(a['Ledger Name'] || '');
      const bLedger = String(b['Ledger Name'] || '');
      return aLedger.localeCompare(bLedger);
    });
  }, [defaultH2Rank]);

  // Filtered data for Classified TB
  const filteredData = useMemo(() => {
    const classifiedSearch = activeTab === 'classified-tb' ? debouncedSearchTerm : '';
    return filterClassifiedRowsByFilters({
      rows: classifiedDataWithSearch,
      searchTerm: classifiedSearch,
      columnFilters: classifiedTbColumnFilters,
      sortColumn: classifiedTbSortColumn,
      sortDirection: classifiedTbSortDirection,
      getStatusLabel,
    });
  }, [
    classifiedDataWithSearch,
    debouncedSearchTerm,
    classifiedTbColumnFilters,
    classifiedTbSortColumn,
    classifiedTbSortDirection,
    activeTab,
    getStatusLabel,
  ]);

  const actualKeyToIndexMap = useMemo(() => buildKeyToIndexMap(actualData), [actualData]);
  const currentKeyToIndexMap = useMemo(() => buildKeyToIndexMap(currentData), [currentData]);

  // Selected rows that are in filtered view (for accurate bulk action count)
  const selectedFilteredCount = useMemo(() => {
    return computeSelectedFilteredCount(selectedRowIndices, filteredData, currentKeyToIndexMap);
  }, [selectedRowIndices, filteredData, currentKeyToIndexMap]);

  // Totals calculation - based on active tab
  const totals = useMemo(() => {
    if (activeTab === 'actual-tb') {
      return computeTotals(filteredActualData);
    }
    return computeTotals(filteredData);
  }, [activeTab, filteredActualData, filteredData]);
  
  // Helper to get unique column values for filters
  const getActualTbColumnValues = useCallback((column: string) => {
    return actualData.map(row => row[column as keyof LedgerRow]).filter(v => v !== null && v !== undefined) as (string | number)[];
  }, [actualData]);

  const getClassifiedTbColumnValues = useCallback((column: string) => {
    if (column === 'Status') {
      return baseClassifiedData.map(getStatusLabel);
    }
    return baseClassifiedData.map(row => row[column as keyof LedgerRow]).filter(v => v !== null && v !== undefined) as (string | number)[];
  }, [baseClassifiedData, getStatusLabel]);
  
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
    const effectiveFromDate = importPeriodType === 'previous' ? previousFromDate : fromDate;
    const effectiveToDate = importPeriodType === 'previous' ? previousToDate : toDate;
    if (!effectiveFromDate || !effectiveToDate) {
      toast({
        title: 'Period required',
        description: 'Please set a valid financial year period before importing.',
        variant: 'destructive'
      });
      setIsFetching(false);
      return;
    }

    const { data: lines, companyName } = await odbcConnection.fetchTrialBalance(effectiveFromDate, effectiveToDate);
      
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
        .map(row => {
          const baseRow: LedgerRow = {
            ...row,
            'H1': row['H1'] || deriveH1FromRevenueAndBalance(row),
            'H2': row['H2'] || '',
            'H3': row['H3'] || '',
          };
          return applyClassificationRules(baseRow, classificationRules, { businessType, entityType, userDefinedExpenseThreshold });
        });
      
      // Store actual data (unclassified) - NO BALANCE FILTERS (all ledgers included, including Opening=0 and Closing=0)
      setActualData(enrichRowsWithStockDetails(processedData));
      
            // Import directly based on selected period type
      const classifiedRows = filterClassifiedRows(processedData);
      const sortedClassifiedRows = sortClassifiedByDefaultH2(classifiedRows);
      const isPreviousImport = importPeriodType === 'previous';

      if (manualInventoryValues && inventorySource === 'manual' && hasInventoryInRows(sortedClassifiedRows)) {
        setIsInventoryImportPromptOpen(true);
      }

      if (isPreviousImport) {
        setPreviousData(sortedClassifiedRows);
        setCurrentData(enrichRowsWithStockDetails(sortedClassifiedRows));
      } else {
        setCurrentData(enrichRowsWithStockDetails(sortedClassifiedRows));
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
          period_end_date: effectiveToDate,
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
  }, [entityType, businessType, fromDate, toDate, previousFromDate, previousToDate, odbcConnection, importPeriodType, currentEngagement, trialBalanceDB, toast, classificationRules, deriveH1FromRevenueAndBalance, filterClassifiedRows, sortClassifiedByDefaultH2, userDefinedExpenseThreshold]);

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
    
        const classifiedRows = filterClassifiedRows(pendingImportData);
    const sortedClassifiedRows = sortClassifiedByDefaultH2(classifiedRows);
    const isPreviousImport = importPeriodType === 'previous';

    if (manualInventoryValues && inventorySource === 'manual' && hasInventoryInRows(sortedClassifiedRows)) {
      setIsInventoryImportPromptOpen(true);
    }

    if (isPreviousImport) {
      setPreviousData(sortedClassifiedRows);
      setCurrentData(enrichRowsWithStockDetails(sortedClassifiedRows));
    } else {
      setCurrentData(enrichRowsWithStockDetails(sortedClassifiedRows));
    }
    
    // Save to database
    if (currentEngagement?.id) {
      const effectiveToDate = importPeriodType === 'previous' ? previousToDate : toDate;
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
        period_ending: effectiveToDate || null,
      }));
      
      await trialBalanceDB.importLines(dbLines, false);
    }
    
    toast({
      title: 'Success',
      description: `Imported ${pendingImportData.length} ledgers as ${importPeriodType === 'current' ? 'Current' : 'Previous'} Period`
    });
    
    setPendingImportData(null);
    setIsPeriodDialogOpen(false);
  }, [pendingImportData, importPeriodType, currentEngagement?.id, toDate, previousToDate, odbcConnection, trialBalanceDB, toast, filterClassifiedRows, sortClassifiedByDefaultH2]);
  
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
    }, classificationRules, { businessType, entityType, userDefinedExpenseThreshold })];
    
    if (newLineForm.periodType === 'current') {
      setCurrentData(prev => enrichRowsWithStockDetails([...prev, classified[0]]));
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
  }, [newLineForm, toast, classificationRules, deriveH1FromRevenueAndBalance, businessType, entityType, userDefinedExpenseThreshold]);

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
    const isUpdatingH1 = 'H1' in updates;
    const isUpdatingH2 = 'H2' in updates;
    const isUpdatingH3 = 'H3' in updates;
    const firstSelectedIndex = Array.from(selectedRowIndices)[0];
    const baseRowForPrompt = typeof firstSelectedIndex === 'number' ? updatedData[firstSelectedIndex] : undefined;

    if (isUpdatingH1 || isUpdatingH2 || isUpdatingH3) {
      finalUpdates['Auto'] = 'Manual';
      finalUpdates['Auto Reason'] = undefined;
    }
    if (isUpdatingH1 && !isUpdatingH2) {
      finalUpdates['H2'] = '';
    }
    if (isUpdatingH1 && !isUpdatingH3) {
      finalUpdates['H3'] = '';
    }
    if (isUpdatingH2 && !isUpdatingH3) {
      finalUpdates['H3'] = '';
    }
    if (isUserDefinedValue(finalUpdates['H2']) || isUserDefinedValue(finalUpdates['H3'])) {
      finalUpdates['H2'] = isUserDefinedValue(finalUpdates['H2']) ? '' : finalUpdates['H2'];
      finalUpdates['H3'] = isUserDefinedValue(finalUpdates['H3']) ? '' : finalUpdates['H3'];
      const note = window.prompt(
        'Enter note for User_Defined classification:',
        baseRowForPrompt?.['Notes'] ?? ''
      );
      finalUpdates['Notes'] = note && note.trim().length > 0 ? note.trim() : 'User_Defined - set H2/H3 manually';
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

    setCurrentData(enrichRowsWithStockDetails(updatedData));
    if (updatedKeys.size > 0) {
      setActualData(prev =>
        enrichRowsWithStockDetails(
          prev.map(row =>
            row['Composite Key'] && updatedKeys.has(row['Composite Key'] as string)
              ? { ...row, ...finalUpdates }
              : row
          )
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
      return enrichRowsWithStockDetails(next);
    });

    const compositeKey = baseRow['Composite Key'];
    if (compositeKey) {
      setActualData(prev =>
        enrichRowsWithStockDetails(
          prev.map(row =>
            row['Composite Key'] === compositeKey ? { ...row, ...finalUpdates } : row
          )
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

    // Note: Disabled localStorage loading for Actual TB and Classified TB
    // Database is now the only source of truth to prevent stale cache issues after deletion
    let hydrated = false;
    let cachedActualCount = 0;
    let cachedClassifiedCount = 0;

    // Prefer database when available to avoid stale local cache
    if (trialBalanceDB.lines && trialBalanceDB.lines.length > 0) {
      const dbCount = trialBalanceDB.lines.length;
      if (!hydrated || dbCount >= cachedClassifiedCount || dbCount >= cachedActualCount) {
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
        return applyClassificationRules(row, classificationRules, { businessType, entityType, userDefinedExpenseThreshold });
      });
      
      setActualData(enrichRowsWithStockDetails(loadedData));
      setCurrentData(enrichRowsWithStockDetails(filterClassifiedRows(loadedData)));
      
      const engagementId = currentEngagement?.id || '';
      if (dataLoadedToastRef.current !== engagementId) {
        toast({
          title: 'Data Loaded',
          description: `Loaded ${loadedData.length} ledgers from saved data`,
        });
        dataLoadedToastRef.current = engagementId;
      }
      }
    }
  }, [currentEngagement?.id, trialBalanceDB.lines, classificationRules, deriveH1FromRevenueAndBalance]);
  
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

  // Note: Disabled localStorage persistence for Actual TB
  // Reason: Database is the source of truth. localStorage caching caused stale data to reload after deletion.
  // useEffect(() => {
  //   if (!currentEngagement?.id) return;
  //   localStorage.setItem(`tb_actual_${currentEngagement.id}`, JSON.stringify(actualData));
  // }, [actualData, currentEngagement?.id]);

  // Note: Disabled localStorage persistence for Classified TB
  // Reason: Database is the source of truth. localStorage caching caused stale data to reload after deletion.
  // useEffect(() => {
  //   if (!currentEngagement?.id) return;
  //   localStorage.setItem(`tb_classified_${currentEngagement.id}`, JSON.stringify(currentData));
  // }, [currentData, currentEngagement?.id]);
  
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
    const scaleFactor = numberScale === 'tens'
      ? 10
      : numberScale === 'hundreds'
        ? 100
        : numberScale === 'thousands'
          ? 1000
          : numberScale === 'lakhs'
            ? 100000
            : numberScale === 'millions'
              ? 1000000
              : numberScale === 'crores'
                ? 10000000
                : 1;
    const scaled = num / scaleFactor;
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(scaled);
  };

  const noteSourceData = useMemo(() => {
    return applyManualInventoryRows(currentData);
  }, [currentData, applyManualInventoryRows]);

  const availableNoteH2 = useMemo(() => {
    if (noteEditMode) {
      const allowedH1 = noteStatementType === 'BS'
        ? new Set(['Asset', 'Liability'])
        : new Set(['Income', 'Expense']);
      const ordered: string[] = [];
      mergedBsplHeads.forEach((row) => {
        if (!allowedH1.has(row.H1)) return;
        if (!ordered.includes(row.H2)) ordered.push(row.H2);
      });
      return ordered;
    }
    return getNoteH2Options(noteStatementType, noteSourceData, numberScale);
  }, [noteStatementType, noteSourceData, numberScale, noteEditMode, mergedBsplHeads]);

  const noteTolerance = useMemo(() => getScaleFactor(numberScale) * 0.005, [numberScale]);

  const bsNoteH2Order = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    filteredBsplHeads.forEach((row) => {
      if (!row?.H2) return;
      if (row.H1 !== 'Asset' && row.H1 !== 'Liability') return;
      if (seen.has(row.H2)) return;
      seen.add(row.H2);
      order.push(row.H2);
    });
    return order;
  }, [filteredBsplHeads]);

  const plNoteH2Order = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    filteredBsplHeads.forEach((row) => {
      if (!row?.H2) return;
      if (row.H1 !== 'Income' && row.H1 !== 'Expense') return;
      if (seen.has(row.H2)) return;
      seen.add(row.H2);
      order.push(row.H2);
    });
    return order;
  }, [filteredBsplHeads]);

  const applyNoteNumberOffset = useCallback((notes: ReturnType<typeof buildPreparedNotes>, startAt: number) => {
    return notes.map((note, idx) => ({
      ...note,
      noteNo: startAt + idx,
    }));
  }, []);

  const preparedNotesBSRaw = useMemo(() => {
    return buildPreparedNotes({
      classifiedRows: noteSourceData,
      statementType: 'BS',
      tolerance: noteTolerance,
      h2Order: bsNoteH2Order,
    });
  }, [noteSourceData, noteTolerance, bsNoteH2Order]);

  const preparedNotesPLRaw = useMemo(() => {
    return buildPreparedNotes({
      classifiedRows: noteSourceData,
      statementType: 'PL',
      tolerance: noteTolerance,
      h2Order: plNoteH2Order,
    });
  }, [noteSourceData, noteTolerance, plNoteH2Order]);

  const preparedNotesBS = useMemo(() => {
    return applyNoteNumberOffset(preparedNotesBSRaw, noteNumberStart);
  }, [applyNoteNumberOffset, preparedNotesBSRaw, noteNumberStart]);

  const preparedNotesPL = useMemo(() => {
    const plStart = noteNumberStart + preparedNotesBSRaw.length;
    return applyNoteNumberOffset(preparedNotesPLRaw, plStart);
  }, [applyNoteNumberOffset, preparedNotesPLRaw, noteNumberStart, preparedNotesBSRaw.length]);

  const preparedNotes = useMemo(() => {
    return noteStatementType === 'PL' ? preparedNotesPL : preparedNotesBS;
  }, [noteStatementType, preparedNotesPL, preparedNotesBS]);

  const noteNumberMap = useMemo(() => {
    return new Map(preparedNotes.map((note) => [note.H2, note.noteNo]));
  }, [preparedNotes]);

  const noteReportingScale = useMemo(() => {
    switch (numberScale) {
      case 'actual':
        return 'rupees';
      case 'thousands':
        return 'thousands';
      case 'lakhs':
        return 'lakhs';
      case 'crores':
        return 'crores';
      default:
        return 'auto';
    }
  }, [numberScale]);

  const noteLedgerItems = useMemo<LedgerItem[]>(() => {
    if (!selectedNoteH2) return [];
    const allowedH1 = noteStatementType === 'PL' ? new Set(['Income', 'Expense']) : new Set(['Asset', 'Liability']);
    return noteSourceData
      .filter(row => allowedH1.has(String(row['H1'] || '')) && String(row['H2'] || '') === selectedNoteH2)
      .map(row => ({
        ledgerName: String(row['Ledger Name'] || ''),
        groupName: String(row['Parent Group'] || row['Primary Group'] || ''),
        openingBalance: Number(row['Opening Balance'] || 0),
        closingBalance: Number(row['Closing Balance'] || 0),
        classification: String(row['H3'] || ''),
      }));
  }, [noteSourceData, selectedNoteH2, noteStatementType]);

  const hierarchicalNoteLedgerItems = useMemo<LedgerItem[]>(() => {
    if (!selectedNoteH2) return [];
    const allowedH1 = noteStatementType === 'PL' ? new Set(['Income', 'Expense']) : new Set(['Asset', 'Liability']);
    const itemsByH3 = new Map<string, LedgerItem[]>();
    
    noteSourceData
      .filter(row => allowedH1.has(String(row['H1'] || '')) && String(row['H2'] || '') === selectedNoteH2)
      .forEach(row => {
        const h3 = String(row['H3'] || '(Unclassified)');
        const item: LedgerItem = {
          ledgerName: String(row['Ledger Name'] || ''),
          groupName: String(row['Parent Group'] || row['Primary Group'] || ''),
          openingBalance: Number(row['Opening Balance'] || 0),
          closingBalance: Number(row['Closing Balance'] || 0),
          classification: h3,
        };
        if (!itemsByH3.has(h3)) {
          itemsByH3.set(h3, []);
        }
        itemsByH3.get(h3)!.push(item);
      });

    // Flatten with hierarchical structure markers
    const result: LedgerItem[] = [];
    let sortedH3Keys = Array.from(itemsByH3.keys()).sort();
    sortedH3Keys.forEach(h3 => {
      // Add H3 header row (special marker)
      result.push({
        ledgerName: `[H3] ${h3}`,
        groupName: '',
        openingBalance: 0,
        closingBalance: 0,
        classification: h3,
      });
      // Add ledgers under this H3
      itemsByH3.get(h3)!.forEach(item => {
        result.push(item);
      });
    });
    return result;
  }, [noteSourceData, selectedNoteH2, noteStatementType]);

  const faceSummaryBS = useMemo(() => buildFaceFromNotes(preparedNotesBS, 'BS'), [preparedNotesBS]);
  const faceSummaryPL = useMemo(() => buildFaceFromNotes(preparedNotesPL, 'PL'), [preparedNotesPL]);
  const faceNoteMetaMapBS = useMemo(() => {
    return new Map(preparedNotesBS.map((note) => [note.H2, { total: note.total, noteNo: note.noteNo }]));
  }, [preparedNotesBS]);
  const faceNoteMetaMapPL = useMemo(() => {
    return new Map(preparedNotesPL.map((note) => [note.H2, { total: note.total, noteNo: note.noteNo }]));
  }, [preparedNotesPL]);
  const faceH2OptionsBS = useMemo(() => {
    const options: string[] = [];
    const seen = new Set<string>();
    mergedBsplHeads.forEach((row) => {
      if (row.H1 !== 'Asset' && row.H1 !== 'Liability') return;
      if (!row.H2) return;
      if (seen.has(row.H2)) return;
      seen.add(row.H2);
      options.push(row.H2);
    });
    return options;
  }, [mergedBsplHeads]);
  const faceH2OptionsPL = useMemo(() => {
    const options: string[] = [];
    const seen = new Set<string>();
    mergedBsplHeads.forEach((row) => {
      if (row.H1 !== 'Income' && row.H1 !== 'Expense') return;
      if (!row.H2) return;
      if (seen.has(row.H2)) return;
      seen.add(row.H2);
      options.push(row.H2);
    });
    return options;
  }, [mergedBsplHeads]);

  const buildBsFaceTemplateLayout = useCallback((h2Options: string[]) => {
    const manualRows: Record<string, { label: string }> = {
      'manual:bs-face:equity-liabilities': { label: 'EQUITY AND LIABILITIES' },
      'manual:bs-face:shareholders-funds': { label: "Shareholders' funds" },
      'manual:bs-face:blank-liability-break': { label: '' },
      'manual:bs-face:non-current-liabilities': { label: 'Non-current liabilities' },
      'manual:bs-face:current-liabilities': { label: 'Current liabilities' },
      'manual:bs-face:blank-before-assets': { label: '' },
      'manual:bs-face:assets': { label: 'ASSETS' },
      'manual:bs-face:non-current-assets': { label: 'Non-current assets' },
      'manual:bs-face:ppe-intangible-parent': { label: 'Property, Plant and Equipment Property and Intangible assets' },
      'manual:bs-face:current-assets': { label: 'Current assets' },
    };

    const overrides: Record<string, NoteRowOverride> = {
      'manual:bs-face:equity-liabilities': { rowType: 'HEADER', isParent: true, visibility: 'always', bold: true },
      'manual:bs-face:shareholders-funds': {
        rowType: 'HEADER',
        isParent: true,
        visibility: 'childNonZero',
        bold: true,
        labelWhenOther: "Owners' funds",
        useAltLabelForOthers: true,
      },
      'manual:bs-face:blank-liability-break': { rowType: 'HEADER', visibility: 'always' },
      'manual:bs-face:non-current-liabilities': { rowType: 'HEADER', isParent: true, visibility: 'childNonZero', bold: true },
      'manual:bs-face:current-liabilities': { rowType: 'HEADER', isParent: true, visibility: 'childNonZero', bold: true },
      'manual:bs-face:blank-before-assets': { rowType: 'HEADER', visibility: 'always' },
      'manual:bs-face:assets': { rowType: 'HEADER', isParent: true, visibility: 'always', bold: true },
      'manual:bs-face:non-current-assets': { rowType: 'HEADER', isParent: true, visibility: 'childNonZero', bold: true },
      'manual:bs-face:ppe-intangible-parent': { rowType: 'HEADER', isParent: true, visibility: 'childNonZero', bold: true },
      'manual:bs-face:current-assets': { rowType: 'HEADER', isParent: true, visibility: 'childNonZero', bold: true },
      'face-section:Liabilities': { hidden: true },
      'face-section:Assets': { hidden: true },
      'face-total:Liabilities': { bold: true },
      'face-total:Assets': { bold: true },
    };

    const hasH2 = (h2: string) => h2Options.includes(h2);
    const order: string[] = [];

    order.push('manual:bs-face:equity-liabilities');
    order.push('manual:bs-face:shareholders-funds');
    [
      'Share Capital',
      'Owners� Capital Account',
      "Owners' Capital Account",
      'Partners� Capital Account',
      "Partners' Capital Account",
      'Reserves and Surplus',
    ].forEach((h2) => {
      if (hasH2(h2)) order.push(`face:Liability:${h2}`);
    });
    order.push('manual:bs-face:blank-liability-break');
    ['Share Application Money Pending Allotment', 'Minority Interest'].forEach((h2) => {
      if (hasH2(h2)) order.push(`face:Liability:${h2}`);
    });
    order.push('manual:bs-face:non-current-liabilities');
    [
      'Long-term Borrowings',
      'Deferred Tax Liabilities (Net)',
      'Other Long-term Liabilities',
      'Long-term Provisions',
    ].forEach((h2) => {
      if (hasH2(h2)) order.push(`face:Liability:${h2}`);
    });
    order.push('manual:bs-face:current-liabilities');
    [
      'Short-term Borrowings',
      'Trade Payables',
      'Other Current Liabilities',
      'Unclassified Liabilities',
      'Short-term Provisions',
    ].forEach((h2) => {
      if (hasH2(h2)) order.push(`face:Liability:${h2}`);
    });
    order.push('face-total:Liabilities');

    order.push('manual:bs-face:blank-before-assets');
    order.push('manual:bs-face:assets');
    order.push('manual:bs-face:non-current-assets');
    order.push('manual:bs-face:ppe-intangible-parent');
    [
      'Property, Plant and Equipment',
      'Intangible Assets',
    ].forEach((h2) => {
      if (hasH2(h2)) order.push(`face:Asset:${h2}`);
      if (hasH2(h2)) {
        overrides[`face:Asset:${h2}`] = { ...overrides[`face:Asset:${h2}`], indent: 2 };
      }
    });
    [
      'Non-current Investments',
      'Deferred Tax Assets (Net)',
      'Long-term Loans and Advances',
      'Other Non-current Assets',
    ].forEach((h2) => {
      if (hasH2(h2)) order.push(`face:Asset:${h2}`);
    });
    order.push('manual:bs-face:current-assets');
    [
      'Current Investments',
      'Inventories',
      'Trade Receivables',
      'Cash and Bank Balances',
      'Short-term Loans and Advances',
      'Other Current Assets',
      'Unclassified Assets',
    ].forEach((h2) => {
      if (hasH2(h2)) order.push(`face:Asset:${h2}`);
    });
    order.push('face-total:Assets');

    return {
      order,
      manualRows,
      overrides,
      templateVersion: BS_FACE_TEMPLATE_VERSION,
    };
  }, []);

  const buildPlFaceTemplateLayout = useCallback((h2Options: string[]) => {
    const h2ToH1 = new Map<string, string>();
    mergedBsplHeads.forEach((row) => {
      if (!row.H2 || !row.H1) return;
      if (!h2ToH1.has(row.H2)) h2ToH1.set(row.H2, row.H1);
    });
    const manualRows: Record<string, { label: string }> = {
      'manual:pl-face:income': { label: 'Income:' },
      'manual:pl-face:expenses': { label: 'Expenses:' },
      'manual:pl-face:profit-before-exceptional': { label: 'Profit/(loss) before exceptional and extraordinary items and tax' },
      'manual:pl-face:exceptional-header': { label: 'Exceptional Items' },
      'manual:pl-face:exceptional-items': { label: 'Exceptional items' },
      'manual:pl-face:prior-period-items': { label: 'Prior Period Items' },
      'manual:pl-face:profit-before-extraordinary': { label: "Profit/(loss) before extraordinary items and tax" },
      'manual:pl-face:extraordinary-header': { label: 'Extraordinary Items' },
      'manual:pl-face:extraordinary-items': { label: 'Extraordinary Items' },
      'manual:pl-face:profit-before-partners': { label: "Profit before, partners' remuneration and tax" },
      'manual:pl-face:partners-remuneration': { label: "Partners' Remuneration" },
      'manual:pl-face:profit-before-tax': { label: 'Profit before tax' },
      'manual:pl-face:profit-continuing': { label: 'Profit/(Loss) for the period from continuing operations' },
      'manual:pl-face:discontinuing-ops': { label: 'Profit/(loss) from discontinuing operations' },
      'manual:pl-face:profit-for-year': { label: 'Profit/(Loss) for the year' },
      'manual:pl-face:share-consolidation': { label: 'Share of Profit & Loss in Consolidation' },
    };

    const overrides: Record<string, NoteRowOverride> = {
      'manual:pl-face:income': { rowType: 'HEADER', isParent: true, visibility: 'always', bold: true },
      'manual:pl-face:expenses': { rowType: 'HEADER', isParent: true, visibility: 'always', bold: true },
      'face-total:Income': { bold: true },
      'face-total:Expenses': { bold: true },
      'manual:pl-face:profit-before-exceptional': {
        rowType: 'CALC',
        bold: true,
        visibility: 'nonzero',
        formula: 'DIFF(ROW("face-total:Income"), ROW("face-total:Expenses"))',
        labelWhenPartnership: "Profit/(loss) before exceptional and extraordinary items, partners' remuneration and tax",
      },
      'manual:pl-face:exceptional-header': { rowType: 'HEADER', isParent: true, visibility: 'childNonZero', bold: false },
      'manual:pl-face:exceptional-items': { rowType: 'INPUT', visibility: 'nonzero', indent: 1 },
      'manual:pl-face:prior-period-items': { rowType: 'INPUT', visibility: 'nonzero', indent: 1 },
      'manual:pl-face:profit-before-extraordinary': {
        rowType: 'CALC',
        bold: true,
        visibility: 'nonzero',
        formula: 'DIFF(ROW("manual:pl-face:profit-before-exceptional"), SUM(ROW("manual:pl-face:exceptional-items"), ROW("manual:pl-face:prior-period-items")))',
        labelWhenPartnership: "Profit/(loss) before extraordinary items, partners' remuneration and tax",
      },
      'manual:pl-face:extraordinary-header': { rowType: 'HEADER', isParent: true, visibility: 'childNonZero', bold: false },
      'manual:pl-face:extraordinary-items': { rowType: 'INPUT', visibility: 'nonzero', indent: 1 },
      'manual:pl-face:profit-before-partners': {
        rowType: 'CALC',
        bold: true,
        visibility: 'nonzero',
        formula: 'DIFF(ROW("manual:pl-face:profit-before-extraordinary"), ROW("manual:pl-face:extraordinary-items"))',
      },
      'manual:pl-face:partners-remuneration': { rowType: 'INPUT', visibility: 'nonzero', indent: 1 },
      'manual:pl-face:profit-before-tax': {
        rowType: 'CALC',
        bold: true,
        visibility: 'nonzero',
        formula: 'DIFF(ROW("manual:pl-face:profit-before-partners"), ROW("manual:pl-face:partners-remuneration"))',
      },
      'manual:pl-face:profit-continuing': {
        rowType: 'CALC',
        bold: true,
        visibility: 'nonzero',
        formula: 'DIFF(ROW("manual:pl-face:profit-before-tax"), ROW("face:Expense:Tax Expenses"))',
      },
      'manual:pl-face:discontinuing-ops': { rowType: 'INPUT', visibility: 'nonzero', indent: 1 },
      'manual:pl-face:profit-for-year': {
        rowType: 'CALC',
        bold: true,
        visibility: 'nonzero',
        formula: 'SUM(ROW("manual:pl-face:profit-continuing"), ROW("manual:pl-face:discontinuing-ops"))',
      },
      'manual:pl-face:share-consolidation': { rowType: 'INPUT', visibility: 'nonzero', indent: 1 },
    };

    const order: string[] = [];
    const used = new Set<string>();
    const hasH2 = (h2: string) => h2Options.includes(h2);
    const isIncome = (h2: string) => h2ToH1.get(h2) === 'Income';
    const isExpense = (h2: string) => h2ToH1.get(h2) === 'Expense';

    order.push('manual:pl-face:income');
    [
      'Revenue from Operations',
      'Other Income',
    ].forEach((h2) => {
      if (hasH2(h2)) {
        order.push(`face:Income:${h2}`);
        used.add(h2);
      }
    });
    h2Options.forEach((h2) => {
      if (used.has(h2)) return;
      if (!isIncome(h2)) return;
      order.push(`face:Income:${h2}`);
      used.add(h2);
    });
    order.push('face-total:Income');

    order.push('manual:pl-face:expenses');
    const expenseOrder = [
      'Cost of Materials Consumed',
      'Purchases of Stock in Trade',
      'Change in Inventories',
      'User_Defined_Expense - 1',
      'Employee Benefits Expense',
      'Finance Costs',
      'Depreciation and Amortisation Expense',
      'Other Expenses',
    ];
    expenseOrder.forEach((h2) => {
      if (hasH2(h2)) {
        order.push(`face:Expense:${h2}`);
        used.add(h2);
      }
    });
    h2Options.forEach((h2) => {
      if (used.has(h2)) return;
      if (!isExpense(h2)) return;
      if (h2 === 'Tax Expenses') return;
      order.push(`face:Expense:${h2}`);
      used.add(h2);
    });
    order.push('face-total:Expenses');

    order.push('manual:pl-face:profit-before-exceptional');
    order.push('manual:pl-face:exceptional-header');
    order.push('manual:pl-face:exceptional-items');
    order.push('manual:pl-face:prior-period-items');
    order.push('manual:pl-face:profit-before-extraordinary');
    order.push('manual:pl-face:extraordinary-header');
    order.push('manual:pl-face:extraordinary-items');
    order.push('manual:pl-face:profit-before-partners');
    order.push('manual:pl-face:partners-remuneration');
    order.push('manual:pl-face:profit-before-tax');
    if (hasH2('Tax Expenses')) {
      order.push('face:Expense:Tax Expenses');
      overrides['face:Expense:Tax Expenses'] = { indent: 1 };
    }
    order.push('manual:pl-face:profit-continuing');
    order.push('manual:pl-face:discontinuing-ops');
    order.push('manual:pl-face:profit-for-year');
    order.push('manual:pl-face:share-consolidation');

    return {
      order,
      manualRows,
      overrides,
      templateVersion: PL_FACE_TEMPLATE_VERSION,
    };
  }, [mergedBsplHeads]);

  const faceAutoRowsBS = useMemo<DisplayNoteRow[]>(() => {
    const rows: DisplayNoteRow[] = [];
    const liabilities = faceSummaryBS.sections.find((section) => section.title === 'Liabilities');
    const assets = faceSummaryBS.sections.find((section) => section.title === 'Assets');
    const h2ToH1 = new Map<string, string>();
    mergedBsplHeads.forEach((row) => {
      if (!row.H2 || !row.H1) return;
      if (!h2ToH1.has(row.H2)) h2ToH1.set(row.H2, row.H1);
    });
    const liabilityH2List = noteEditMode
      ? faceH2OptionsBS.filter((h2) => h2ToH1.get(h2) === 'Liability')
      : (liabilities?.rows.map((row) => row.H2) || []);
    const assetH2List = noteEditMode
      ? faceH2OptionsBS.filter((h2) => h2ToH1.get(h2) === 'Asset')
      : (assets?.rows.map((row) => row.H2) || []);

    if (liabilities || noteEditMode) {
      rows.push({
        id: 'face-section:Liabilities',
        label: 'Liabilities',
        amount: 0,
        formattedAmount: '',
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: true,
        isManual: false,
        rowType: 'HEADER',
        isSection: true,
      });
      liabilityH2List.forEach((h2) => {
        const meta = faceNoteMetaMapBS.get(h2);
        const amount = meta?.total ?? 0;
        const isUnclassifiedLiability = h2 === 'Unclassified Liabilities';
        rows.push({
          id: `face:Liability:${h2}`,
          label: h2,
          amount,
          formattedAmount: formatNumber(amount),
          indent: 1,
          bold: false,
          italic: isUnclassifiedLiability,
          align: 'left',
          isParent: false,
          isManual: false,
          noteNo: meta?.noteNo,
          noteTarget: h2,
        });
      });
      rows.push({
        id: 'face-total:Liabilities',
        label: 'Total Liabilities',
        amount: liabilities?.total ?? 0,
        formattedAmount: formatNumber(liabilities?.total ?? 0),
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: false,
        isManual: false,
        rowType: 'TOTAL',
      });
    }
    if (assets || noteEditMode) {
      rows.push({
        id: 'face-section:Assets',
        label: 'Assets',
        amount: 0,
        formattedAmount: '',
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: true,
        isManual: false,
        rowType: 'HEADER',
        isSection: true,
      });
      assetH2List.forEach((h2) => {
        const meta = faceNoteMetaMapBS.get(h2);
        const amount = meta?.total ?? 0;
        const isUnclassifiedAsset = h2 === 'Unclassified Assets';
        rows.push({
          id: `face:Asset:${h2}`,
          label: h2,
          amount,
          formattedAmount: formatNumber(amount),
          indent: 1,
          bold: false,
          italic: isUnclassifiedAsset,
          align: 'left',
          isParent: false,
          isManual: false,
          noteNo: meta?.noteNo,
          noteTarget: h2,
        });
      });
      rows.push({
        id: 'face-total:Assets',
        label: 'Total Assets',
        amount: assets?.total ?? 0,
        formattedAmount: formatNumber(assets?.total ?? 0),
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: false,
        isManual: false,
        rowType: 'TOTAL',
      });
    }
    return rows;
  }, [faceSummaryBS, formatNumber, mergedBsplHeads, noteEditMode, faceH2OptionsBS, faceNoteMetaMapBS]);

  const faceAutoRowsPL = useMemo<DisplayNoteRow[]>(() => {
    const rows: DisplayNoteRow[] = [];
    const income = faceSummaryPL.sections.find((section) => section.title === 'Income');
    const expenses = faceSummaryPL.sections.find((section) => section.title === 'Expenses');
    const h2ToH1 = new Map<string, string>();
    mergedBsplHeads.forEach((row) => {
      if (!row.H2 || !row.H1) return;
      if (!h2ToH1.has(row.H2)) h2ToH1.set(row.H2, row.H1);
    });
    const incomeH2List = noteEditMode
      ? faceH2OptionsPL.filter((h2) => h2ToH1.get(h2) === 'Income')
      : (income?.rows.map((row) => row.H2) || []);
    const expenseH2List = noteEditMode
      ? faceH2OptionsPL.filter((h2) => h2ToH1.get(h2) === 'Expense')
      : (expenses?.rows.map((row) => row.H2) || []);

    if (income || noteEditMode) {
      rows.push({
        id: 'face-section:Income',
        label: 'Income',
        amount: 0,
        formattedAmount: '',
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: true,
        isManual: false,
        rowType: 'HEADER',
        isSection: true,
      });
      incomeH2List.forEach((h2) => {
        const meta = faceNoteMetaMapPL.get(h2);
        const amount = meta?.total ?? 0;
        rows.push({
          id: `face:Income:${h2}`,
          label: h2,
          amount,
          formattedAmount: formatNumber(amount),
          indent: 1,
          bold: false,
          italic: false,
          align: 'left',
          isParent: false,
          isManual: false,
          noteNo: meta?.noteNo,
          noteTarget: h2,
        });
      });
      rows.push({
        id: 'face-total:Income',
        label: 'Total Income',
        amount: income?.total ?? 0,
        formattedAmount: formatNumber(income?.total ?? 0),
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: false,
        isManual: false,
        rowType: 'TOTAL',
      });
    }
    if (expenses || noteEditMode) {
      rows.push({
        id: 'face-section:Expenses',
        label: 'Expenses',
        amount: 0,
        formattedAmount: '',
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: true,
        isManual: false,
        rowType: 'HEADER',
        isSection: true,
      });
      expenseH2List.forEach((h2) => {
        const meta = faceNoteMetaMapPL.get(h2);
        const amount = meta?.total ?? 0;
        rows.push({
          id: `face:Expense:${h2}`,
          label: h2,
          amount,
          formattedAmount: formatNumber(amount),
          indent: 1,
          bold: false,
          italic: false,
          align: 'left',
          isParent: false,
          isManual: false,
          noteNo: meta?.noteNo,
          noteTarget: h2,
        });
      });
      rows.push({
        id: 'face-total:Expenses',
        label: 'Total Expenses',
        amount: expenses?.total ?? 0,
        formattedAmount: formatNumber(expenses?.total ?? 0),
        indent: 0,
        bold: true,
        italic: false,
        align: 'left',
        isParent: false,
        isManual: false,
        rowType: 'TOTAL',
      });
    }
    return rows;
  }, [faceSummaryPL, formatNumber, mergedBsplHeads, noteEditMode, faceH2OptionsPL, faceNoteMetaMapPL]);

  useEffect(() => {
    if (!noteLayoutLoaded) return;
    if (faceH2OptionsBS.length === 0) return;
    setNoteLayouts((prev) => {
      const existing = prev['face|BS'];
      if (existing?.templateVersion === BS_FACE_TEMPLATE_VERSION) return prev;
      return {
        ...prev,
        ['face|BS']: buildBsFaceTemplateLayout(faceH2OptionsBS),
      };
    });
  }, [noteLayoutLoaded, faceH2OptionsBS, buildBsFaceTemplateLayout]);

  useEffect(() => {
    if (!noteLayoutLoaded) return;
    if (faceH2OptionsPL.length === 0) return;
    setNoteLayouts((prev) => {
      const existing = prev['face|PL'];
      if (existing?.templateVersion === PL_FACE_TEMPLATE_VERSION) return prev;
      return {
        ...prev,
        ['face|PL']: buildPlFaceTemplateLayout(faceH2OptionsPL),
      };
    });
  }, [noteLayoutLoaded, faceH2OptionsPL, buildPlFaceTemplateLayout]);

  const noteH3Order = useMemo(() => {
    if (!selectedNoteH2) return [];
    const allowedH1 = noteStatementType === 'BS'
      ? new Set(['Asset', 'Liability'])
      : new Set(['Income', 'Expense']);
    const ordered: string[] = [];
    const sourceRows = noteEditMode ? mergedBsplHeads : filteredBsplHeads;
    sourceRows.forEach((row) => {
      if (!allowedH1.has(row.H1)) return;
      if (row.H2 !== selectedNoteH2) return;
      if (!ordered.includes(row.H3)) {
        ordered.push(row.H3);
      }
    });
    return ordered;
  }, [filteredBsplHeads, mergedBsplHeads, noteStatementType, selectedNoteH2, noteEditMode]);

  useEffect(() => {
    if (availableNoteH2.length === 0) {
      if (selectedNoteH2) setSelectedNoteH2('');
      return;
    }
    if (!availableNoteH2.includes(selectedNoteH2)) {
      setSelectedNoteH2(availableNoteH2[0]);
    }
  }, [availableNoteH2, selectedNoteH2]);

  const buildLayoutRows = useCallback((
    autoRows: DisplayNoteRow[],
    layout?: NoteLayout
  ): DisplayNoteRow[] => {
    const overrides = layout?.overrides || {};
    const manualRows = layout?.manualRows || {};
    const autoMap = new Map(autoRows.map((row) => [row.id, row]));
    const autoIds = autoRows.map((row) => row.id);

    if (!layout) {
      return autoRows.map((row) => ({
        ...row,
        label: overrides[row.id]?.label ?? row.label,
        indent: typeof overrides[row.id]?.indent === 'number' ? (overrides[row.id]?.indent as number) : row.indent,
        bold: overrides[row.id]?.bold ?? row.bold,
        italic: overrides[row.id]?.italic ?? row.italic,
        align: overrides[row.id]?.align ?? row.align,
      }));
    }

    const order = layout.order.filter((id) => manualRows[id] || autoMap.has(id));
    autoIds.forEach((id) => {
      if (!order.includes(id)) order.push(id);
    });

    const rows: DisplayNoteRow[] = [];
    const manualChildrenMap = new Map<string, string[]>();
    const isManualChild = (rowId: string) => {
      return Boolean(overrides[rowId]?.manualParentId);
    };

    order.forEach((rowId) => {
      const override = overrides[rowId];
      if (override?.hidden) return;
      if (override?.manualParentId) {
        if (!manualChildrenMap.has(override.manualParentId)) {
          manualChildrenMap.set(override.manualParentId, []);
        }
        manualChildrenMap.get(override.manualParentId)?.push(rowId);
        return;
      }
      if (manualRows[rowId]) return;
      if (autoMap.has(rowId)) return;
    });

    const resolveLabelOverride = (rowId: string, fallback: string) => {
      const override = overrides[rowId] || {};
      if (isPartnershipEntityType && override.labelWhenPartnership) {
        return override.labelWhenPartnership;
      }
      if (isNonCompanyEntityType && override.useAltLabelForOthers && override.labelWhenOther) {
        return override.labelWhenOther;
      }
      return override.label ?? fallback;
    };

    order.forEach((rowId) => {
      if (overrides[rowId]?.hidden) return;
      if (isManualChild(rowId)) return;
      if (manualRows[rowId]) {
        const manualRow = manualRows[rowId];
        rows.push({
          id: rowId,
          label: resolveLabelOverride(rowId, manualRow.label),
          amount: 0,
          formattedAmount: '',
          indent: overrides[rowId]?.indent ?? 0,
          bold: Boolean(overrides[rowId]?.bold),
          italic: Boolean(overrides[rowId]?.italic),
          align: overrides[rowId]?.align || 'left',
          isParent: Boolean(overrides[rowId]?.isParent),
          isManual: true,
          rowType: overrides[rowId]?.rowType,
          noteNo: overrides[rowId]?.noteNoOverride,
          isSection: Boolean(overrides[rowId]?.isParent),
          noteTarget: overrides[rowId]?.noteTarget,
        });
      } else {
        const autoRow = autoMap.get(rowId);
        if (autoRow) {
          const override = overrides[rowId] || {};
          rows.push({
            ...autoRow,
            label: resolveLabelOverride(rowId, autoRow.label),
            indent: typeof override.indent === 'number' ? override.indent : autoRow.indent,
            bold: override.bold ?? autoRow.bold,
            italic: override.italic ?? autoRow.italic,
            align: override.align ?? autoRow.align,
            rowType: override.rowType ?? autoRow.rowType,
            noteNo: override.noteNoOverride ?? autoRow.noteNo,
            isParent: override.isParent ?? autoRow.isParent,
            isSection: autoRow.isSection,
            noteTarget: autoRow.noteTarget,
          });
        }
      }

      const childIds = manualChildrenMap.get(rowId) || [];
      childIds.forEach((childId) => {
        if (overrides[childId]?.hidden) return;
        if (manualRows[childId]) {
          const manualRow = manualRows[childId];
          rows.push({
            id: childId,
            label: resolveLabelOverride(childId, manualRow.label),
            amount: 0,
            formattedAmount: '',
            indent: overrides[childId]?.indent ?? 1,
            bold: Boolean(overrides[childId]?.bold),
            italic: Boolean(overrides[childId]?.italic),
            align: overrides[childId]?.align || 'left',
            isParent: Boolean(overrides[childId]?.isParent),
            isManual: true,
            rowType: overrides[childId]?.rowType,
            noteNo: overrides[childId]?.noteNoOverride,
            isSection: false,
            noteTarget: overrides[childId]?.noteTarget,
          });
        } else {
          const autoRow = autoMap.get(childId);
          if (autoRow) {
            const override = overrides[childId] || {};
            rows.push({
              ...autoRow,
              label: resolveLabelOverride(childId, autoRow.label),
              indent: typeof override.indent === 'number' ? override.indent : autoRow.indent,
              bold: override.bold ?? autoRow.bold,
              italic: override.italic ?? autoRow.italic,
              align: override.align ?? autoRow.align,
              rowType: override.rowType ?? autoRow.rowType,
              noteNo: override.noteNoOverride ?? autoRow.noteNo,
              isParent: override.isParent ?? autoRow.isParent,
              isSection: autoRow.isSection,
              noteTarget: autoRow.noteTarget,
            });
          }
        }
      });
    });

    return rows;
  }, []);

  const computeRowState = useCallback((
    rows: DisplayNoteRow[],
    layout: NoteLayout | undefined,
    tolerance: number,
    noteMetaMap?: Map<string, { total: number; noteNo: number }>,
    noteRowValueMap?: Map<string, number>
  ) => {
    const overrides = layout?.overrides || {};
    const formulaMap = new Map<string, string>();
    const rowValues = new Map<string, number>();
    const rowOrder = rows.map((row) => row.id);
    const parentMap = new Map<string, string[]>();

    const rowTypes = new Map<string, NoteRowOverride['rowType']>();

    const getParentByIndent = (index: number, indent: number) => {
      for (let i = index - 1; i >= 0; i -= 1) {
        const candidate = rows[i];
        if (candidate.indent < indent) {
          return candidate.id;
        }
      }
      return null;
    };

    rows.forEach((row, index) => {
      const override = overrides[row.id] || {};
      const rowType = override.rowType ?? (row.isSection ? 'HEADER' : 'INPUT');
      rowTypes.set(row.id, rowType);
      let value = row.amount;
      if (override.noteTarget) {
        if (noteMetaMap?.has(override.noteTarget)) {
          value = noteMetaMap.get(override.noteTarget)?.total ?? value;
        } else if (noteRowValueMap?.has(override.noteTarget)) {
          value = noteRowValueMap.get(override.noteTarget) ?? value;
        }
      }
      if (row.isManual && typeof override.manualValue === 'number') {
        value = override.manualValue;
      }
      if (rowType === 'HEADER') {
        value = 0;
      }
      if (override.allowNegative === false && value < 0) {
        value = Math.abs(value);
      }
      rowValues.set(row.id, value);

      const parentId = override.manualParentId || (row.indent > 0 ? getParentByIndent(index, row.indent) : null);
      if (parentId) {
        if (!parentMap.has(parentId)) parentMap.set(parentId, []);
        parentMap.get(parentId)?.push(row.id);
      }
    });

    rows.forEach((row) => {
      const override = overrides[row.id] || {};
      const rowType = rowTypes.get(row.id);
      if (!rowType) return;
      if (!['CALC', 'TOTAL', 'SUBTOTAL'].includes(rowType)) return;
      if (!override.formula) return;
      formulaMap.set(row.id, override.formula);
    });

    for (let iter = 0; iter < 5; iter += 1) {
      let changed = false;
      rows.forEach((row) => {
        const override = overrides[row.id] || {};
        const rowType = rowTypes.get(row.id);
        if (!rowType) return;
        if (!['CALC', 'TOTAL', 'SUBTOTAL'].includes(rowType)) return;
        if (!override.formula) return;
        const nextValue = evaluateFormula(override.formula, {
          rowValues,
          rowOrder,
          parentMap,
          variables: statementVariables,
        });
        if (rowValues.get(row.id) !== nextValue) {
          rowValues.set(row.id, nextValue);
          changed = true;
        }
      });
      if (!changed) break;
    }

    const visibilityMap = new Map<string, boolean>();
    rows.forEach((row) => {
      const override = overrides[row.id] || {};
      const visibility = override.visibility || 'always';
      const enabled = override.enabled ?? true;
      let visible = true;
      if (visibility === 'enabled') {
        visible = enabled;
      } else if (visibility === 'nonzero') {
        visible = Math.abs(rowValues.get(row.id) || 0) > tolerance;
      } else if (visibility === 'childNonZero') {
        const children = parentMap.get(row.id) || [];
        visible = children.some((childId) => Math.abs(rowValues.get(childId) || 0) > tolerance);
      }
      visibilityMap.set(row.id, visible);
    });

    const computedRows = rows.map((row) => {
      const override = overrides[row.id] || {};
      const rowType = rowTypes.get(row.id) ?? row.rowType;
      let amount = rowValues.get(row.id) || 0;
      if (rowType === 'HEADER') {
        amount = 0;
      }
      let noteNo = row.noteNo;
      if (override.noteTarget && noteMetaMap?.has(override.noteTarget)) {
        noteNo = noteMetaMap.get(override.noteTarget)?.noteNo ?? noteNo;
      }
      const noteMode = override.noteNoMode || 'auto';
      if (noteMode === 'hide') {
        noteNo = undefined;
      } else if (noteMode === 'custom' && typeof override.noteNoOverride === 'number') {
        noteNo = override.noteNoOverride;
      }
      return {
        ...row,
        amount,
        formattedAmount: rowType === 'HEADER' ? '' : formatNumber(amount),
        rowType,
        noteNo,
      };
    });

    return { rows: computedRows, visibilityMap, parentMap, formulaMap, rowTypes };
  }, [formatNumber, statementVariables]);

  useEffect(() => {
    if (!selectedNoteH2 || !noteListRef.current) return;
    const target = noteListRef.current.querySelector(`[data-note-h2="${CSS.escape(selectedNoteH2)}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedNoteH2, noteStatementType]);

  useEffect(() => {
    if (!noteEditMode) return;
    if (activeTab === 'face-bs' && faceAutoRowsBS.length > 0) {
      const layoutKey = 'face|BS';
      setNoteLayouts((prev) => {
        if (prev[layoutKey]) return prev;
        return {
          ...prev,
          [layoutKey]: {
            order: faceAutoRowsBS.map((row) => row.id),
            manualRows: {},
            overrides: {},
          },
        };
      });
    }
    if (activeTab === 'face-pl' && faceAutoRowsPL.length > 0) {
      const layoutKey = 'face|PL';
      setNoteLayouts((prev) => {
        if (prev[layoutKey]) return prev;
        return {
          ...prev,
          [layoutKey]: {
            order: faceAutoRowsPL.map((row) => row.id),
            manualRows: {},
            overrides: {},
          },
        };
      });
    }
  }, [noteEditMode, activeTab, faceAutoRowsBS, faceAutoRowsPL]);

  useEffect(() => {
    if (!noteEditMode) return;
    if (activeTab !== 'face-bs' && activeTab !== 'face-pl') return;
    const layoutKey = activeTab === 'face-pl' ? 'face|PL' : 'face|BS';
    const autoRows = activeTab === 'face-pl' ? faceAutoRowsPL : faceAutoRowsBS;
    if (autoRows.length === 0) return;
    setNoteLayouts((prev) => {
      const layout = prev[layoutKey];
      if (!layout) return prev;
      const order = layout.order.filter((id) => layout.manualRows[id] || autoRows.some((row) => row.id === id));
      autoRows.forEach((row) => {
        if (!order.includes(row.id)) order.push(row.id);
      });
      if (order.length === layout.order.length && order.every((id, idx) => id === layout.order[idx])) {
        return prev;
      }
      return {
        ...prev,
        [layoutKey]: {
          ...layout,
          order,
        },
      };
    });
  }, [noteEditMode, activeTab, faceAutoRowsBS, faceAutoRowsPL]);

  const activeNote = useMemo(() => {
    if (!selectedNoteH2) return null;
    return buildNoteStructure({
      statementType: noteStatementType,
      selectedH2: selectedNoteH2,
      rows: noteSourceData,
      numberScale,
      formatNumber,
      hideEmpty: !noteEditMode,
      h3Order: noteH3Order,
      includeParentTotals: showParentNoteTotals,
      includeZeroRows: noteEditMode,
    });
  }, [noteStatementType, selectedNoteH2, noteSourceData, numberScale, formatNumber, noteH3Order, showParentNoteTotals, noteEditMode]);

  const noteKey = useMemo(() => {
    if (!selectedNoteH2) return '';
    return `${noteStatementType}|${selectedNoteH2}`;
  }, [noteStatementType, selectedNoteH2]);

  const autoFlatRows = useMemo<FlatNoteRow[]>(() => {
    if (!activeNote) return [];
    const flattened: FlatNoteRow[] = [];
    activeNote.rows.forEach((row) => {
      if (row.type === 'parent' && row.children && row.children.length > 0) {
        flattened.push({
          id: row.id,
          label: row.label,
          amount: row.amount,
          formattedAmount: row.formattedAmount,
          type: row.type,
        });
        row.children.forEach((child) => {
          flattened.push({
            id: child.id,
            label: child.label,
            amount: child.amount,
            formattedAmount: child.formattedAmount,
            type: child.type,
            parentLabel: row.label,
          });
        });
      } else {
        flattened.push({
          id: row.id,
          label: row.label,
          amount: row.amount,
          formattedAmount: row.formattedAmount,
          type: row.type,
        });
      }
    });
    return flattened;
  }, [activeNote]);

  const noteLayout = useMemo(() => {
    if (!noteKey) return undefined;
    return noteLayouts[noteKey];
  }, [noteKey, noteLayouts]);

  const resolveRowLabel = useCallback((rowId: string) => {
    const layout = noteLayout;
    if (!layout) return '';
    if (layout.manualRows[rowId]) return layout.manualRows[rowId].label;
    if (layout.overrides[rowId]?.label) return layout.overrides[rowId].label as string;
    const autoRow = autoFlatRows.find((row) => row.id === rowId);
    return autoRow?.label || '';
  }, [noteLayout, autoFlatRows]);

  useEffect(() => {
    if (!selectedNoteRowId) {
      setNoteSelectedLabel('');
      return;
    }
    setNoteSelectedLabel(resolveRowLabel(selectedNoteRowId));
  }, [selectedNoteRowId, resolveRowLabel]);

  const ensureNoteLayout = useCallback(() => {
    if (!noteKey || !activeNote) return;
    setNoteLayouts((prev) => {
      if (prev[noteKey]) return prev;
      const layout: NoteLayout = {
        order: autoFlatRows.map((row) => row.id),
        manualRows: {},
        overrides: {},
      };
      return { ...prev, [noteKey]: layout };
    });
  }, [noteKey, activeNote, autoFlatRows]);

  const updateNoteLayout = useCallback((updater: (layout: NoteLayout) => NoteLayout) => {
    if (!noteKey) return;
    setNoteLayouts((prev) => {
      const baseLayout = prev[noteKey] || {
        order: autoFlatRows.map((row) => row.id),
        manualRows: {},
        overrides: {},
      };
      const nextLayout = updater(baseLayout);
      return { ...prev, [noteKey]: nextLayout };
    });
  }, [noteKey, autoFlatRows]);

  useEffect(() => {
    setSelectedNoteRowId(null);
    setNoteParentAnchorId(null);
  }, [noteKey]);

  useEffect(() => {
    if (noteEditMode) {
      ensureNoteLayout();
    }
  }, [noteEditMode, noteKey, ensureNoteLayout]);

  useEffect(() => {
    if (!noteEditMode || !noteKey) return;
    setNoteLayouts((prev) => {
      const layout = prev[noteKey];
      if (!layout) return prev;
      const autoIds = autoFlatRows.map((row) => row.id);
      const autoMap = new Map(autoFlatRows.map((row) => [row.id, row]));
      const baseOrder = layout.order.filter((id) => layout.manualRows[id] || autoIds.includes(id));
      const nextOrder = [...baseOrder];
      const resolveLabel = (id: string) => {
        return layout.manualRows[id]?.label
          || layout.overrides[id]?.label
          || autoMap.get(id)?.label
          || '';
      };
      const isParentRow = (id: string) => {
        const override = layout.overrides[id];
        if (override && override.isParent) return true;
        const autoRow = autoMap.get(id);
        return Boolean(autoRow && autoRow.type === 'parent');
      };

      autoIds.forEach((id) => {
        if (nextOrder.includes(id)) return;
        const autoRow = autoMap.get(id);
        if (!autoRow?.parentLabel) {
          nextOrder.push(id);
          return;
        }
        const parentIndex = nextOrder.findIndex((orderId) => {
          if (!isParentRow(orderId)) return false;
          return resolveLabel(orderId) === autoRow.parentLabel;
        });
        if (parentIndex === -1) {
          nextOrder.push(id);
          return;
        }
        let insertAt = parentIndex + 1;
        while (insertAt < nextOrder.length) {
          const candidateId = nextOrder[insertAt];
          const candidateRow = autoMap.get(candidateId);
          const candidateLabel = resolveLabel(candidateId);
          if (candidateRow?.parentLabel === autoRow.parentLabel) {
            insertAt += 1;
            continue;
          }
          if (candidateLabel === autoRow.parentLabel && isParentRow(candidateId)) {
            break;
          }
          if (candidateRow && candidateRow.parentLabel && candidateRow.parentLabel === autoRow.parentLabel) {
            insertAt += 1;
            continue;
          }
          break;
        }
        nextOrder.splice(insertAt, 0, id);
      });
      if (nextOrder.length === layout.order.length && nextOrder.every((id, idx) => id === layout.order[idx])) {
        return prev;
      }
      return {
        ...prev,
        [noteKey]: {
          ...layout,
          order: nextOrder,
        },
      };
    });
  }, [noteEditMode, noteKey, autoFlatRows]);

  const displayNoteRows = useMemo<DisplayNoteRow[]>(() => {
    if (!activeNote) return [];
    const layout = noteLayout;
    const overrides = layout?.overrides || {};
    const manualRows = layout?.manualRows || {};
    const scaleFactor = getScaleFactor(numberScale);

    const autoMap = new Map(autoFlatRows.map((row) => [row.id, row]));
    const autoIds = autoFlatRows.map((row) => row.id);

    const resolveLabel = (rowId: string, fallback: string) => {
      const override = overrides[rowId] || {};
      if (isPartnershipEntityType && override.labelWhenPartnership) {
        return override.labelWhenPartnership;
      }
      if (isNonCompanyEntityType && override.useAltLabelForOthers && override.labelWhenOther) {
        return override.labelWhenOther;
      }
      return override.label ?? fallback;
    };
    const buildDisplayRow = (row: FlatNoteRow, isManual: boolean, manualLabel?: string): DisplayNoteRow => {
      const override = overrides[row.id] || {};
      const label = resolveLabel(row.id, isManual ? (manualLabel || row.label) : row.label);
      const isManualChild = Boolean(override.manualParentId);
      const indent = typeof override.indent === 'number'
        ? override.indent
        : (isManualChild || row.type === 'child' ? 1 : 0);
      return {
        id: row.id,
        label,
        amount: row.amount,
        formattedAmount: row.formattedAmount,
        indent,
        bold: Boolean(override.bold),
        italic: Boolean(override.italic),
        align: override.align || 'left',
        isParent: Boolean(override.isParent) || row.type === 'parent',
        isManual,
        autoType: isManual ? undefined : row.type,
      };
    };

    if (!layout) {
      return autoFlatRows.map((row) => buildDisplayRow(row, false));
    }

    const order = layout.order.filter((id) => manualRows[id] || autoMap.has(id));
    autoIds.forEach((id) => {
      if (!order.includes(id)) order.push(id);
    });

    const rows: DisplayNoteRow[] = [];
    const manualChildrenMap = new Map<string, string[]>();
    const isManualChild = (rowId: string) => {
      return Boolean(overrides[rowId]?.manualParentId);
    };

    order.forEach((rowId) => {
      const override = overrides[rowId];
      if (override?.hidden) return;
      if (override?.manualParentId) {
        if (!manualChildrenMap.has(override.manualParentId)) {
          manualChildrenMap.set(override.manualParentId, []);
        }
        manualChildrenMap.get(override.manualParentId)?.push(rowId);
        return;
      }
      if (manualRows[rowId]) {
        return;
      }
      if (autoMap.has(rowId)) {
        return;
      }
    });

    order.forEach((rowId) => {
      if (overrides[rowId]?.hidden) return;
      if (isManualChild(rowId)) return;
      if (manualRows[rowId]) {
        const manualRow = manualRows[rowId];
        rows.push(buildDisplayRow({
          id: rowId,
          label: manualRow.label,
          amount: 0,
          formattedAmount: '',
          type: 'item',
        }, true, manualRow.label));
      } else {
        const autoRow = autoMap.get(rowId);
        if (autoRow) {
          rows.push(buildDisplayRow(autoRow, false));
        }
      }

      const childIds = manualChildrenMap.get(rowId) || [];
      childIds.forEach((childId) => {
        if (overrides[childId]?.hidden) return;
        if (manualRows[childId]) {
          const manualRow = manualRows[childId];
          rows.push(buildDisplayRow({
            id: childId,
            label: manualRow.label,
            amount: 0,
            formattedAmount: '',
            type: 'item',
          }, true, manualRow.label));
        } else {
          const autoRow = autoMap.get(childId);
          if (autoRow) {
            rows.push(buildDisplayRow(autoRow, false));
          }
        }
      });
    });

    const noteRowValueMap = new Map<string, number>();
    autoFlatRows.forEach((row) => {
      if (row.type === 'parent') return;
      noteRowValueMap.set(row.label, row.amount);
    });
    const computedState = computeRowState(rows, noteLayout, noteTolerance, undefined, noteRowValueMap);
    const computedRows = computedState.rows;
    const visibilityMap = computedState.visibilityMap;
    const formulaMap = computedState.formulaMap;
    const rowTypes = computedState.rowTypes;
    const missingRowRefs = new Map<string, string[]>();
    const missingVariableRefs = new Map<string, string[]>();
    formulaMap.forEach((formula, rowId) => {
      const refs = Array.from(extractRowRefs(formula)).filter((ref) => !rowTypes.has(ref));
      const vars = Array.from(extractVariableRefs(formula)).filter((name) => !statementVariables[name]);
      if (refs.length) missingRowRefs.set(rowId, refs);
      if (vars.length) missingVariableRefs.set(rowId, vars);
    });
    const hasCycle = detectFormulaCycles(formulaMap);

    if (noteEditMode) {
      return computedRows.map((row) => ({
        ...row,
        formulaWarning: Boolean(missingRowRefs.get(row.id)?.length || missingVariableRefs.get(row.id)?.length || hasCycle),
        missingRowRefs: missingRowRefs.get(row.id),
        missingVariableRefs: missingVariableRefs.get(row.id),
        hasCycle,
      }) as DisplayNoteRow & { formulaWarning?: boolean; missingRowRefs?: string[]; missingVariableRefs?: string[]; hasCycle?: boolean; });
    }

    const isNonZero = (value: number) => !isZeroAfterScale(value, scaleFactor);
    const isManualHeader = (row: DisplayNoteRow) => row.isManual;
    const isAutoParentHeader = (row: DisplayNoteRow) => row.autoType === 'parent';
    const isIndentHeader = (row: DisplayNoteRow, index: number) => {
      const nextRow = computedRows[index + 1];
      return row.indent === 0 && nextRow && nextRow.indent > row.indent;
    };
    const isHeaderRow = (row: DisplayNoteRow, index: number) => {
      return isManualHeader(row) || isAutoParentHeader(row) || isIndentHeader(row, index);
    };
    const filtered: DisplayNoteRow[] = [];
    let i = 0;
    while (i < computedRows.length) {
      const row = computedRows[i];
      if (overrides[row.id]?.hidden) {
        i += 1;
        continue;
      }

      const isGroupHeader = isHeaderRow(row, i);

      if (!isGroupHeader) {
        if ((visibilityMap.get(row.id) ?? true) && isNonZero(row.amount)) {
          filtered.push(row);
        }
        i += 1;
        continue;
      }

      const group: DisplayNoteRow[] = [];
      let j = i + 1;
      const useIndentGrouping = !isManualHeader(row) && (isAutoParentHeader(row) || isIndentHeader(row, i));
      if (useIndentGrouping) {
        while (j < computedRows.length && computedRows[j].indent > row.indent) {
          if (!overrides[computedRows[j].id]?.hidden) {
            group.push(computedRows[j]);
          }
          j += 1;
        }
      } else {
        while (j < computedRows.length) {
          if (isHeaderRow(computedRows[j], j)) {
            break;
          }
          if (!overrides[computedRows[j].id]?.hidden) {
            group.push(computedRows[j]);
          }
          j += 1;
        }
      }

      const visibleGroup = group.filter((child) => visibilityMap.get(child.id) ?? true);
      const groupSum = visibleGroup.reduce((sum, child) => sum + Math.abs(child.amount), 0);
      if ((visibilityMap.get(row.id) ?? true) && groupSum > 0) {
        filtered.push(row);
        visibleGroup.forEach((child) => {
          if (isNonZero(child.amount)) {
            filtered.push(child);
          }
        });
      }
      i = j;
    }

    return filtered;
  }, [activeNote, autoFlatRows, noteLayout, noteEditMode, numberScale, computeRowState, noteTolerance, isPartnershipEntityType, isNonCompanyEntityType]);

  const handleAddManualRow = useCallback((position: 'above' | 'below' | 'top' | 'bottom', labelOverride?: string) => {
    if (!noteKey || !activeNote) {
      toast({ title: 'Select a note before adding rows' });
      return;
    }
    const label = (labelOverride ?? noteNewRowLabel).trim();
    if (!label && labelOverride === undefined) {
      toast({ title: 'Enter a row label first' });
      return;
    }

    ensureNoteLayout();
    const newId = `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    updateNoteLayout((layout) => {
      const order = [...layout.order];
      let index = 0;
      if (position === 'top') {
        index = 0;
      } else if (position === 'bottom') {
        index = order.length;
      } else {
        const currentIndex = selectedNoteRowId ? order.indexOf(selectedNoteRowId) : -1;
        if (currentIndex === -1) {
          index = position === 'above' ? 0 : order.length;
        } else {
          index = position === 'above' ? currentIndex : currentIndex + 1;
        }
      }
      order.splice(index, 0, newId);
      const nextOverrides = { ...layout.overrides };
      if (!label) {
        nextOverrides[newId] = { ...nextOverrides[newId], rowType: 'HEADER', visibility: 'always' };
      }
      return {
        ...layout,
        order,
        manualRows: { ...layout.manualRows, [newId]: { label } },
        overrides: nextOverrides,
      };
    });
    setSelectedNoteRowId(newId);
    if (labelOverride === undefined) {
      setNoteNewRowLabel('');
    }
  }, [noteKey, activeNote, ensureNoteLayout, updateNoteLayout, selectedNoteRowId, noteNewRowLabel, toast]);

  const handleAddEmptyNoteRow = useCallback((position: 'above' | 'below' | 'top' | 'bottom') => {
    handleAddManualRow(position, '');
  }, [handleAddManualRow]);

  const handleMoveSelectedRow = useCallback((direction: 'up' | 'down') => {
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const order = [...layout.order];
      const index = order.indexOf(selectedNoteRowId);
      if (index === -1) return layout;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return layout;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...layout, order };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleDeleteSelectedRow = useCallback(() => {
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const isManual = Boolean(layout.manualRows[selectedNoteRowId]);
      const order = layout.order.filter((id) => id !== selectedNoteRowId);
      const manualRows = { ...layout.manualRows };
      const overrides = { ...layout.overrides };

      if (isManual) {
        delete manualRows[selectedNoteRowId];
        delete overrides[selectedNoteRowId];
      } else {
        overrides[selectedNoteRowId] = { ...overrides[selectedNoteRowId], hidden: true };
      }

      return { ...layout, order, manualRows, overrides };
    });
    setSelectedNoteRowId(null);
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleRenameSelectedRow = useCallback(() => {
    if (!selectedNoteRowId) return;
    const label = window.prompt('Row label');
    if (!label || !label.trim()) return;
    updateNoteLayout((layout) => {
      const manualRows = { ...layout.manualRows };
      const overrides = { ...layout.overrides };
      if (manualRows[selectedNoteRowId]) {
        manualRows[selectedNoteRowId] = { label: label.trim() };
      } else {
        overrides[selectedNoteRowId] = { ...overrides[selectedNoteRowId], label: label.trim() };
      }
      return { ...layout, manualRows, overrides };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleToggleStyle = useCallback((field: 'bold' | 'italic') => {
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedNoteRowId] || {};
      overrides[selectedNoteRowId] = { ...current, [field]: !current[field] };
      return { ...layout, overrides };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleAlignSelectedRow = useCallback((align: 'left' | 'center' | 'right') => {
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedNoteRowId] || {};
      overrides[selectedNoteRowId] = { ...current, align };
      return { ...layout, overrides };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleSelectedLabelChange = useCallback((value: string) => {
    setNoteSelectedLabel(value);
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const manualRows = { ...layout.manualRows };
      const overrides = { ...layout.overrides };
      const nextLabel = value.trim();
      if (!nextLabel) return layout;
      if (manualRows[selectedNoteRowId]) {
        manualRows[selectedNoteRowId] = { label: nextLabel };
      } else {
        overrides[selectedNoteRowId] = { ...overrides[selectedNoteRowId], label: nextLabel };
      }
      return { ...layout, manualRows, overrides };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleSetParentState = useCallback((isParent: boolean) => {
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedNoteRowId] || {};
      overrides[selectedNoteRowId] = { ...current, isParent, indent: isParent ? 0 : 1 };
      if (!isParent) {
        return { ...layout, overrides };
      }

      const autoMap = new Map(autoFlatRows.map((row) => [row.id, row]));
      const manualRows = layout.manualRows || {};
      const rowLabel = manualRows[selectedNoteRowId]?.label
        || overrides[selectedNoteRowId]?.label
        || autoMap.get(selectedNoteRowId)?.label
        || '';

      if (!rowLabel) {
        return { ...layout, overrides };
      }

      const currentIndex = layout.order.indexOf(selectedNoteRowId);
      const order = layout.order.filter((id) => id !== selectedNoteRowId);
      const children = autoFlatRows
        .filter((row) => row.parentLabel === rowLabel)
        .map((row) => row.id);
      const orderWithoutChildren = order.filter((id) => !children.includes(id));
      const insertIndex = currentIndex === -1 ? -1 : Math.min(currentIndex, orderWithoutChildren.length);
      const finalOrder = [...orderWithoutChildren];
      if (insertIndex === -1) {
        finalOrder.push(selectedNoteRowId, ...children);
      } else {
        finalOrder.splice(insertIndex + 1, 0, ...children);
      }

      return { ...layout, overrides, order: finalOrder };
    });
  }, [selectedNoteRowId, updateNoteLayout, autoFlatRows]);

  const handleSetParentAnchor = useCallback(() => {
    if (!selectedNoteRowId) return;
    setNoteParentAnchorId(selectedNoteRowId);
    updateNoteLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedNoteRowId] || {};
      overrides[selectedNoteRowId] = { ...current, isParent: true, indent: 0 };
      return { ...layout, overrides };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleAttachToParent = useCallback(() => {
    if (!selectedNoteRowId || !noteParentAnchorId) return;
    if (selectedNoteRowId === noteParentAnchorId) return;
    updateNoteLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedNoteRowId] || {};
      overrides[selectedNoteRowId] = { ...current, manualParentId: noteParentAnchorId, indent: current.indent ?? 1 };
      return { ...layout, overrides };
    });
  }, [selectedNoteRowId, noteParentAnchorId, updateNoteLayout]);

  const handleClearParentLink = useCallback(() => {
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedNoteRowId] || {};
      const next = { ...current };
      delete next.manualParentId;
      overrides[selectedNoteRowId] = next;
      return { ...layout, overrides };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleAdjustIndent = useCallback((delta: number) => {
    if (!selectedNoteRowId) return;
    updateNoteLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedNoteRowId] || {};
      const nextIndent = Math.max(0, Math.min(4, (current.indent ?? 0) + delta));
      overrides[selectedNoteRowId] = { ...current, indent: nextIndent };
      return { ...layout, overrides };
    });
  }, [selectedNoteRowId, updateNoteLayout]);

  const handleSaveNotePreviewDefaults = useCallback(() => {
    setNoteLayoutPayload((prev) => ({
      ...prev,
      notePreviewSettings: {
        rowHeight: noteTableSettings.rowHeight,
        particularsWidth: noteTableSettings.particularsWidth,
        amountWidth: noteTableSettings.amountWidth,
        fontSize: noteTableSettings.fontSize,
        zoom: notePreviewZoom,
      },
    }));
    setNotePreviewDefaults({
      rowHeight: noteTableSettings.rowHeight,
      particularsWidth: noteTableSettings.particularsWidth,
      amountWidth: noteTableSettings.amountWidth,
      fontSize: noteTableSettings.fontSize,
      zoom: notePreviewZoom,
    });
    toast({ title: 'Note preview defaults saved' });
  }, [noteTableSettings, notePreviewZoom, toast]);

  const handleSaveNoteNumberStart = useCallback(() => {
    const parsed = parseInt(noteNumberStartDraft, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast({ title: 'Invalid note start', description: 'Enter a positive number.' });
      return;
    }
    setNoteNumberStart(parsed);
    setNoteLayoutPayload((prev) => ({
      ...prev,
      noteNumberStart: parsed,
    }));
    setIsNoteNumberDialogOpen(false);
    toast({ title: 'Note numbering updated' });
  }, [noteNumberStartDraft, toast]);

  const handleSaveVariables = useCallback(() => {
    setNoteLayoutPayload((prev) => ({
      ...prev,
      variables: statementVariables,
    }));
    setIsVariablesDialogOpen(false);
    toast({ title: 'Variables saved' });
  }, [statementVariables, toast]);

  const handleResetNotePreview = useCallback(() => {
    setNoteTableSettings({
      rowHeight: notePreviewDefaults.rowHeight,
      particularsWidth: notePreviewDefaults.particularsWidth,
      amountWidth: notePreviewDefaults.amountWidth,
      fontSize: notePreviewDefaults.fontSize,
    });
    setNotePreviewZoom(notePreviewDefaults.zoom);
  }, [notePreviewDefaults]);

  const faceLayoutKey = useMemo(() => {
    return noteStatementType === 'PL' ? 'face|PL' : 'face|BS';
  }, [noteStatementType]);

  const faceLayout = useMemo(() => {
    return noteLayouts[faceLayoutKey];
  }, [noteLayouts, faceLayoutKey]);

  const faceAutoRows = useMemo(() => {
    return noteStatementType === 'PL' ? faceAutoRowsPL : faceAutoRowsBS;
  }, [noteStatementType, faceAutoRowsPL, faceAutoRowsBS]);

  const displayFaceRows = useMemo(() => {
    const rows = buildLayoutRows(faceAutoRows, faceLayout);
    const noteMetaMap = noteStatementType === 'PL' ? faceNoteMetaMapPL : faceNoteMetaMapBS;
    const computedState = computeRowState(rows, faceLayout, noteTolerance, noteMetaMap);
    const formulaMap = computedState.formulaMap;
    const rowTypes = computedState.rowTypes;
    const missingRowRefs = new Map<string, string[]>();
    const missingVariableRefs = new Map<string, string[]>();
    formulaMap.forEach((formula, rowId) => {
      const refs = Array.from(extractRowRefs(formula)).filter((ref) => !rowTypes.has(ref));
      const vars = Array.from(extractVariableRefs(formula)).filter((name) => !statementVariables[name]);
      if (refs.length) missingRowRefs.set(rowId, refs);
      if (vars.length) missingVariableRefs.set(rowId, vars);
    });
    const hasCycle = detectFormulaCycles(formulaMap);
    if (noteEditMode) {
      return computedState.rows.map((row) => ({
        ...row,
        formulaWarning: Boolean(missingRowRefs.get(row.id)?.length || missingVariableRefs.get(row.id)?.length || hasCycle),
        missingRowRefs: missingRowRefs.get(row.id),
        missingVariableRefs: missingVariableRefs.get(row.id),
        hasCycle,
      }));
    }
    return computedState.rows.filter((row) => {
      const visible = computedState.visibilityMap.get(row.id) ?? true;
      if (row.rowType === 'TOTAL') return true;
      if (row.isSection || row.rowType === 'HEADER') return visible;
      return visible && Math.abs(row.amount) > noteTolerance;
    });
  }, [buildLayoutRows, faceAutoRows, faceLayout, noteEditMode, computeRowState, noteTolerance]);

  const selectedNoteDisplayRow = useMemo(() => {
    if (!selectedNoteRowId) return null;
    return displayNoteRows.find((row) => row.id === selectedNoteRowId) || null;
  }, [displayNoteRows, selectedNoteRowId]);

  const selectedFaceDisplayRow = useMemo(() => {
    if (!selectedFaceRowId) return null;
    return displayFaceRows.find((row) => row.id === selectedFaceRowId) || null;
  }, [displayFaceRows, selectedFaceRowId]);

  const handleNoteLinkClick = useCallback((statementType: 'BS' | 'PL', h2: string) => {
    setActiveTab(statementType === 'PL' ? 'notes-pl' : 'notes-bs');
    setSelectedNoteH2(h2);
  }, [setActiveTab, setSelectedNoteH2]);

  const resolveFaceRowLabel = useCallback((rowId: string) => {
    if (!rowId) return '';
    const layout = noteLayouts[faceLayoutKey];
    if (layout?.manualRows[rowId]) {
      return layout.manualRows[rowId].label;
    }
    const overrideLabel = layout?.overrides[rowId]?.label;
    if (overrideLabel) return overrideLabel;
    const autoRow = faceAutoRows.find((row) => row.id === rowId);
    return autoRow?.label || '';
  }, [noteLayouts, faceLayoutKey, faceAutoRows]);

  const ensureFaceLayout = useCallback(() => {
    setNoteLayouts((prev) => {
      if (prev[faceLayoutKey]) return prev;
      return {
        ...prev,
        [faceLayoutKey]: {
          order: faceAutoRows.map((row) => row.id),
          manualRows: {},
          overrides: {},
        },
      };
    });
  }, [faceLayoutKey, faceAutoRows]);

  useEffect(() => {
    if (!selectedFaceRowId) {
      setFaceSelectedLabel('');
      return;
    }
    setFaceSelectedLabel(resolveFaceRowLabel(selectedFaceRowId));
  }, [selectedFaceRowId, resolveFaceRowLabel]);

  const updateFaceLayout = useCallback((updater: (layout: NoteLayout) => NoteLayout) => {
    setNoteLayouts((prev) => {
      const existing = prev[faceLayoutKey];
      if (!existing) return prev;
      return {
        ...prev,
        [faceLayoutKey]: updater(existing),
      };
    });
  }, [faceLayoutKey]);

  const handleAddFaceRow = useCallback((position: 'above' | 'below' | 'top' | 'bottom') => {
    ensureFaceLayout();
    if (!faceNewRowLabel.trim()) {
      toast({ title: 'Enter a row label first' });
      return;
    }
    const label = faceNewRowLabel.trim();
    const newId = `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    updateFaceLayout((layout) => {
      const order = [...layout.order];
      let index = 0;
      if (position === 'top') {
        index = 0;
      } else if (position === 'bottom') {
        index = order.length;
      } else {
        const currentIndex = selectedFaceRowId ? order.indexOf(selectedFaceRowId) : -1;
        if (currentIndex === -1) {
          index = position === 'above' ? 0 : order.length;
        } else {
          index = position === 'above' ? currentIndex : currentIndex + 1;
        }
      }
      order.splice(index, 0, newId);
      return {
        ...layout,
        order,
        manualRows: { ...layout.manualRows, [newId]: { label } },
      };
    });
    setSelectedFaceRowId(newId);
    setFaceNewRowLabel('');
  }, [ensureFaceLayout, faceNewRowLabel, selectedFaceRowId, updateFaceLayout, toast]);

  const handleMoveFaceRow = useCallback((direction: 'up' | 'down') => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const order = [...layout.order];
      const index = order.indexOf(selectedFaceRowId);
      if (index === -1) return layout;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return layout;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...layout, order };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleDeleteFaceRow = useCallback(() => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const isManual = Boolean(layout.manualRows[selectedFaceRowId]);
      const order = layout.order.filter((id) => id !== selectedFaceRowId);
      const manualRows = { ...layout.manualRows };
      const overrides = { ...layout.overrides };

      if (isManual) {
        delete manualRows[selectedFaceRowId];
        delete overrides[selectedFaceRowId];
      } else {
        overrides[selectedFaceRowId] = { ...overrides[selectedFaceRowId], hidden: true };
      }

      return { ...layout, order, manualRows, overrides };
    });
    setSelectedFaceRowId(null);
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleFaceLabelChange = useCallback((value: string) => {
    ensureFaceLayout();
    setFaceSelectedLabel(value);
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const manualRows = { ...layout.manualRows };
      const overrides = { ...layout.overrides };
      const nextLabel = value.trim();
      if (manualRows[selectedFaceRowId]) {
        manualRows[selectedFaceRowId] = { label: nextLabel };
      } else {
        overrides[selectedFaceRowId] = { ...overrides[selectedFaceRowId], label: nextLabel };
      }
      return { ...layout, manualRows, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleFaceToggleStyle = useCallback((field: 'bold' | 'italic') => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedFaceRowId] || {};
      overrides[selectedFaceRowId] = { ...current, [field]: !current[field] };
      return { ...layout, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleFaceAlign = useCallback((align: 'left' | 'center' | 'right') => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedFaceRowId] || {};
      overrides[selectedFaceRowId] = { ...current, align };
      return { ...layout, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleFaceIndent = useCallback((delta: number) => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedFaceRowId] || {};
      const nextIndent = Math.max(0, (current.indent ?? 0) + delta);
      overrides[selectedFaceRowId] = { ...current, indent: nextIndent };
      return { ...layout, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleFaceSetParentAnchor = useCallback(() => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    setFaceParentAnchorId(selectedFaceRowId);
    updateFaceLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedFaceRowId] || {};
      overrides[selectedFaceRowId] = { ...current, isParent: true, indent: 0 };
      return { ...layout, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleFaceAttachToParent = useCallback(() => {
    ensureFaceLayout();
    if (!selectedFaceRowId || !faceParentAnchorId) return;
    if (selectedFaceRowId === faceParentAnchorId) return;
    updateFaceLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedFaceRowId] || {};
      overrides[selectedFaceRowId] = { ...current, manualParentId: faceParentAnchorId, indent: current.indent ?? 1 };
      return { ...layout, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, faceParentAnchorId, updateFaceLayout]);

  const handleFaceClearParent = useCallback(() => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedFaceRowId] || {};
      const next = { ...current };
      delete next.manualParentId;
      overrides[selectedFaceRowId] = next;
      return { ...layout, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleFaceMakeParent = useCallback((isParent: boolean) => {
    ensureFaceLayout();
    if (!selectedFaceRowId) return;
    updateFaceLayout((layout) => {
      const overrides = { ...layout.overrides };
      const current = overrides[selectedFaceRowId] || {};
      overrides[selectedFaceRowId] = { ...current, isParent, indent: isParent ? 0 : 1 };
      return { ...layout, overrides };
    });
  }, [ensureFaceLayout, selectedFaceRowId, updateFaceLayout]);

  const handleSaveNoteEdits = useCallback(() => {
    try {
      const payload = { ...noteLayoutPayload, noteLayouts, variables: statementVariables };
      localStorage.setItem('statement_layout_config', JSON.stringify(payload));
      toast({ title: 'Layout saved' });
    } catch (error) {
      console.error('Failed to save layout:', error);
      toast({ title: 'Failed to save layout', variant: 'destructive' });
    }
  }, [noteLayoutPayload, noteLayouts, statementVariables, toast]);

  // Export Template for Excel Import
  const handleExportTemplate = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
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
      await confirmExportedFile('Trial_Balance_Import_Template.xlsx');
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
        const XLSX = await import('xlsx');
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
            return applyClassificationRules(mapped, classificationRules, { businessType, entityType, userDefinedExpenseThreshold });
          })
          .filter(row => {
            // Filter out rows where both opening and closing balances are 0
            return row['Opening Balance'] !== 0 || row['Closing Balance'] !== 0;
          });
        
        setActualData(enrichRowsWithStockDetails(processedData));
        const classifiedRows = filterClassifiedRows(processedData);
        setCurrentData(enrichRowsWithStockDetails(sortClassifiedByDefaultH2(classifiedRows)));
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
  }, [toast, entityType, classificationRules, businessType, userDefinedExpenseThreshold, deriveH1FromRevenueAndBalance, currentEngagement?.id, toDate, trialBalanceDB, filterClassifiedRows, sortClassifiedByDefaultH2]);

  // Excel Export - Actual TB
  const handleExportActualTB = useCallback(async () => {
    if (filteredActualData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No Actual TB data to export',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const XLSX = await import('xlsx');
      const exportRows = filteredActualData.map((row) => {
        const { __searchText, ...rest } = row as LedgerRow & { __searchText?: string };
        return rest;
      });
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      
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
      await confirmExportedFile(filename);
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive'
      });
    }
  }, [filteredActualData, actualTbColumnWidths, currentEngagement, toast]);
  
  // Excel Export - Classified TB
  const handleExportClassifiedTB = useCallback(async () => {
    if (filteredData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No Classified TB data to export',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const XLSX = await import('xlsx');
      const exportRows = filteredData.map((row) => {
        const { __searchText, ...rest } = row as LedgerRow & { __searchText?: string };
        return rest;
      });
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      
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
      await confirmExportedFile(filename);
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive'
      });
    }
  }, [filteredData, currentStockData, classifiedTbColumnWidths, currentEngagement, toast]);

  // Save Session
  const handleSave = useCallback(async () => {
    if (!currentEngagement?.id) {
      toast({ title: 'No engagement selected', variant: 'destructive' });
      return;
    }
    if (currentData.length === 0) {
      toast({ title: 'No classified data to save', variant: 'destructive' });
      return;
    }

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
        face_group: row['H1'] || null,
        note_group: row['H2'] || null,
        sub_note: row['H3'] || null,
      }));

      const ok = await trialBalanceDB.importLines(dbLines, true, true);
      if (!ok) {
        toast({ title: 'Save failed', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: `Saved ${dbLines.length} lines.` });
    } catch (error) {
      console.error('Save failed:', error);
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  }, [currentEngagement?.id, currentData, toDate, trialBalanceDB, toast]);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setGroupFilter('all');
    setBalanceFilter('all');
  }, []);

  // Delete selected rows from the active grid (Actual or Classified)
  const handleDeleteSelected = useCallback(async () => {
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

    try {
      // Delete from database first
      const linesToDelete = trialBalanceDB.lines.filter(line => selectedKeys.has(line.account_code));
      const lineIds = linesToDelete.map(line => line.id);
      
      if (lineIds.length > 0) {
        await trialBalanceDB.deleteLines(lineIds);
      }
      
      // Then clear from UI state
      setActualData(prev =>
        enrichRowsWithStockDetails(prev.filter(row => !selectedKeys.has(buildKey(row))))
      );
      setCurrentData(prev =>
        enrichRowsWithStockDetails(prev.filter(row => !selectedKeys.has(buildKey(row))))
      );
      setSelectedRowIndices(new Set());

      toast({ title: 'Deleted', description: `${selectedKeys.size} row(s) permanently removed from this engagement.` });
    } catch (error) {
      console.error('Error deleting rows:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete selected rows from database',
        variant: 'destructive'
      });
    }
  }, [activeTab, actualData, currentData, selectedRowIndices, trialBalanceDB, toast]);

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

      const fromStr = formatDateIndianShort(fromDate);
      const toStr = formatDateIndianShort(toDate);

      return `${fromStr} - ${toStr}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date Range';
    }
  }, [fromDate, toDate]);

  const notesTabBody = currentData.length === 0 ? (
    <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
      Import classified trial balance data to view notes.
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold">
          {noteStatementType === 'PL' ? 'Profit & Loss Notes' : 'Balance Sheet Notes'}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => setIsNoteLedgerDialogOpen(true)}
            disabled={!selectedNoteH2}
          >
            Ledger Details
          </Button>
          <Button
            size="sm"
            variant={useHierarchicalNoteView ? "default" : "outline"}
            className="h-7 text-xs px-2"
            onClick={() => setUseHierarchicalNoteView(!useHierarchicalNoteView)}
            disabled={!selectedNoteH2}
            title="Toggle between flat list and hierarchical H2-H3-Ledger view"
          >
            {useHierarchicalNoteView ? 'Hierarchical View' : 'Flat List'}
          </Button>
          {isProUser && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setActiveTab(noteStatementType === 'PL' ? 'face-pl' : 'face-bs')}
            >
              Back to {noteStatementType === 'PL' ? 'Profit & Loss' : 'Balance Sheet'}
            </Button>
          )}
          {isProUser && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setShowNoteSettings(prev => !prev)}
            >
              {showNoteSettings ? 'Hide Settings' : 'Notes Settings'}
            </Button>
          )}
        </div>
      </div>

      {noteStatementType === 'BS' && selectedNoteH2 === 'Inventories' && (
        <div className="flex flex-wrap items-center gap-2 border rounded-md px-2 py-1 text-xs">
          <span className="text-muted-foreground">Inventory Source:</span>
          <Button
            size="sm"
            variant={inventorySource === 'imported' ? 'default' : 'outline'}
            className="h-7 text-xs px-2"
            onClick={() => setInventorySource('imported')}
          >
            Fetch from Tally
          </Button>
          <Button
            size="sm"
            variant={inventorySource === 'manual' ? 'default' : 'outline'}
            className="h-7 text-xs px-2"
            onClick={() => setIsManualInventoryDialogOpen(true)}
          >
            Enter manually
          </Button>
          <Badge variant="secondary">{inventorySource === 'manual' ? 'Manual' : 'Imported'}</Badge>
          {inventorySource === 'manual' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setIsManualInventoryDialogOpen(true)}
            >
              Edit values
            </Button>
          )}
        </div>
      )}
      {isProUser && showNoteSettings && (
        <div className="flex flex-wrap items-center gap-4 border rounded-md p-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-notes-layout"
              checked={noteEditMode}
              onCheckedChange={(value) => {
                const nextValue = Boolean(value);
                setNoteEditMode(nextValue);
                if (nextValue) {
                  ensureNoteLayout();
                } else {
                  setSelectedNoteRowId(null);
                }
              }}
            />
            <Label htmlFor="edit-notes-layout" className="text-xs">
              Edit notes
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Row Height</Label>
            <Input
              type="number"
              min={18}
              max={80}
              value={noteTableSettings.rowHeight}
              onChange={(e) => setNoteTableSettings(prev => ({
                ...prev,
                rowHeight: Math.max(18, Math.min(80, parseInt(e.target.value, 10) || prev.rowHeight)),
              }))}
              className="h-8 w-20 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Particulars Width</Label>
            <Input
              type="number"
              min={200}
              max={900}
              value={noteTableSettings.particularsWidth}
              onChange={(e) => setNoteTableSettings(prev => ({
                ...prev,
                particularsWidth: Math.max(200, Math.min(900, parseInt(e.target.value, 10) || prev.particularsWidth)),
              }))}
              className="h-8 w-24 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Amount Width</Label>
            <Input
              type="number"
              min={120}
              max={400}
              value={noteTableSettings.amountWidth}
              onChange={(e) => setNoteTableSettings(prev => ({
                ...prev,
                amountWidth: Math.max(120, Math.min(400, parseInt(e.target.value, 10) || prev.amountWidth)),
              }))}
              className="h-8 w-24 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Font Size</Label>
            <Input
              type="number"
              min={10}
              max={18}
              value={noteTableSettings.fontSize}
              onChange={(e) => setNoteTableSettings(prev => ({
                ...prev,
                fontSize: Math.max(10, Math.min(18, parseInt(e.target.value, 10) || prev.fontSize)),
              }))}
              className="h-8 w-20 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Zoom</Label>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setNotePreviewZoom((prev) => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10))}
            >
              -
            </Button>
            <div className="text-xs w-10 text-center">{Math.round(notePreviewZoom * 100)}%</div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setNotePreviewZoom((prev) => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10))}
            >
              +
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setNotePreviewZoom(1)}
            >
              Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={handleResetNotePreview}
            >
              Reset Preview
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        <div className="border rounded-md p-2 max-h-[520px] overflow-auto">
          {noteEditMode && (
            <div className="flex flex-col gap-2 mb-3">
              <Input
                value={noteNewRowLabel}
                onChange={(e) => setNoteNewRowLabel(e.target.value)}
                placeholder="New row label"
                className="h-7 text-xs"
              />
              <Input
                value={noteSelectedLabel}
                onChange={(e) => handleSelectedLabelChange(e.target.value)}
                placeholder="Selected row label"
                className="h-7 text-xs"
                disabled={!selectedNoteRowId}
              />
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddManualRow('top')}>
                    Add Top
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddEmptyNoteRow('top')}>
                    Add Empty
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddManualRow('above')} disabled={!selectedNoteRowId}>
                    Add Above
                  </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddManualRow('below')} disabled={!selectedNoteRowId}>
                  Add Below
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddManualRow('bottom')}>
                  Add Bottom
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleMoveSelectedRow('up')} disabled={!selectedNoteRowId}>
                  Move Up
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleMoveSelectedRow('down')} disabled={!selectedNoteRowId}>
                  Move Down
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleSetParentAnchor} disabled={!selectedNoteRowId}>
                  Set Parent
                </Button>
                {noteParentAnchorId && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    Parent: {resolveRowLabel(noteParentAnchorId) || 'Selected'}
                  </span>
                )}
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleAttachToParent} disabled={!selectedNoteRowId || !noteParentAnchorId}>
                  Attach to Parent
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleClearParentLink} disabled={!selectedNoteRowId}>
                  Clear Parent
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleSetParentState(false)} disabled={!selectedNoteRowId}>
                  Make Child
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleSetParentState(true)} disabled={!selectedNoteRowId}>
                  Make Parent
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAdjustIndent(-1)} disabled={!selectedNoteRowId}>
                  Indent -
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAdjustIndent(1)} disabled={!selectedNoteRowId}>
                  Indent +
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleToggleStyle('bold')} disabled={!selectedNoteRowId}>
                  Bold
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleToggleStyle('italic')} disabled={!selectedNoteRowId}>
                  Italic
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAlignSelectedRow('left')} disabled={!selectedNoteRowId}>
                  Align Left
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAlignSelectedRow('center')} disabled={!selectedNoteRowId}>
                  Align Center
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAlignSelectedRow('right')} disabled={!selectedNoteRowId}>
                  Align Right
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={handleDeleteSelectedRow} disabled={!selectedNoteRowId}>
                  Delete
                </Button>
                <Button size="sm" variant="default" className="h-7 text-[11px]" onClick={handleSaveNoteEdits}>
                  Save Layout
                </Button>
              </div>
                {selectedNoteRowId && (
                  <div className="border rounded-md p-2 text-[11px] flex flex-col gap-2">
                  <div className="font-semibold">Row Properties</div>
                  <div className="text-[10px] text-muted-foreground break-all">
                    Row ID: <span className="font-mono">{selectedNoteRowId}</span>
                  </div>
                  {!selectedNoteDisplayRow?.isManual && (
                    <div className="text-[10px] text-muted-foreground">
                      Source: Auto (SUMIFS from classified TB)
                    </div>
                  )}
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Row Type</Label>
                    <Select
                      value={noteLayout?.overrides[selectedNoteRowId]?.rowType || selectedNoteDisplayRow?.rowType || 'INPUT'}
                      onValueChange={(value) => {
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, rowType: value as NoteRowOverride['rowType'] };
                          return { ...layout, overrides };
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Row Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INPUT">INPUT</SelectItem>
                        <SelectItem value="CALC">CALC</SelectItem>
                        <SelectItem value="HEADER">HEADER</SelectItem>
                        <SelectItem value="SUBTOTAL">SUBTOTAL</SelectItem>
                        <SelectItem value="TOTAL">TOTAL</SelectItem>
                        <SelectItem value="CONDITIONAL">CONDITIONAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {['CALC', 'SUBTOTAL', 'TOTAL'].includes(noteLayout?.overrides[selectedNoteRowId]?.rowType || selectedNoteDisplayRow?.rowType || '') && (
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Formula</Label>
                      <Input
                        value={noteLayout?.overrides[selectedNoteRowId]?.formula || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateNoteLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedNoteRowId] || {};
                            overrides[selectedNoteRowId] = { ...current, formula: value };
                            return { ...layout, overrides };
                          });
                        }}
                        className="h-7 text-xs flex-1"
                        placeholder={'SUM(ROW("a"), ROW("b"))'}
                      />
                    </div>
                  )}
                  {['CALC', 'SUBTOTAL', 'TOTAL'].includes(noteLayout?.overrides[selectedNoteRowId]?.rowType || selectedNoteDisplayRow?.rowType || '') && (
                    <div className="text-[10px] text-muted-foreground">
                      Example: DIFF(ROW("total_income"), ROW("total_expenses"))
                    </div>
                  )}
                  {(selectedNoteDisplayRow?.formulaWarning || selectedNoteDisplayRow?.hasCycle) && (
                    <div className="text-[10px] text-red-600">
                      {selectedNoteDisplayRow?.hasCycle && <div>Formula cycle detected.</div>}
                      {selectedNoteDisplayRow?.missingRowRefs && selectedNoteDisplayRow.missingRowRefs.length > 0 && (
                        <div>Missing rows: {selectedNoteDisplayRow.missingRowRefs.join(', ')}</div>
                      )}
                      {selectedNoteDisplayRow?.missingVariableRefs && selectedNoteDisplayRow.missingVariableRefs.length > 0 && (
                        <div>Missing variables: {selectedNoteDisplayRow.missingVariableRefs.join(', ')}</div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="w-20 text-[11px]">Manual</Label>
                    <Input
                      type="number"
                      value={noteLayout?.overrides[selectedNoteRowId]?.manualValue ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, manualValue: value === '' ? undefined : Number(value) };
                          return { ...layout, overrides };
                        });
                      }}
                      className="h-7 text-xs w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-20 text-[11px]">Visibility</Label>
                    <Select
                      value={noteLayout?.overrides[selectedNoteRowId]?.visibility || 'always'}
                      onValueChange={(value) => {
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, visibility: value as NoteRowOverride['visibility'] };
                          return { ...layout, overrides };
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always show</SelectItem>
                        <SelectItem value="nonzero">Show if non-zero</SelectItem>
                        <SelectItem value="childNonZero">Show if child has value</SelectItem>
                        <SelectItem value="enabled">Show if enabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Checkbox
                      checked={noteLayout?.overrides[selectedNoteRowId]?.enabled ?? true}
                      onCheckedChange={(value) => {
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, enabled: Boolean(value) };
                          return { ...layout, overrides };
                        });
                      }}
                    />
                    <span className="text-[11px]">Enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={noteLayout?.overrides[selectedNoteRowId]?.allowNegative ?? true}
                      onCheckedChange={(value) => {
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, allowNegative: Boolean(value) };
                          return { ...layout, overrides };
                        });
                      }}
                    />
                    <span className="text-[11px]">Allow negative</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-20 text-[11px]">Alt label</Label>
                    <Input
                      value={noteLayout?.overrides[selectedNoteRowId]?.labelWhenPartnership || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, labelWhenPartnership: value || undefined };
                          return { ...layout, overrides };
                        });
                      }}
                      className="h-7 text-xs flex-1"
                      placeholder="Partnership/LLP label"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={noteLayout?.overrides[selectedNoteRowId]?.useAltLabelForOthers ?? false}
                      onCheckedChange={(value) => {
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, useAltLabelForOthers: Boolean(value) };
                          return { ...layout, overrides };
                        });
                      }}
                    />
                    <span className="text-[11px]">Use alt label for non-company</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-20 text-[11px]">Alt label</Label>
                    <Input
                      value={noteLayout?.overrides[selectedNoteRowId]?.labelWhenOther || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = { ...current, labelWhenOther: value || undefined };
                          return { ...layout, overrides };
                        });
                      }}
                      className="h-7 text-xs flex-1"
                      placeholder="Non-company label"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-20 text-[11px]">H3 Map</Label>
                    <Select
                      value={noteLayout?.overrides[selectedNoteRowId]?.noteTarget || ''}
                      onValueChange={(value) => {
                        updateNoteLayout((layout) => {
                          const overrides = { ...layout.overrides };
                          const current = overrides[selectedNoteRowId] || {};
                          overrides[selectedNoteRowId] = {
                            ...current,
                            noteTarget: value === '__none__' ? undefined : value || undefined,
                          };
                          return { ...layout, overrides };
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-48">
                        <SelectValue placeholder="Select H3" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {noteH3Order.map((h3) => (
                          <SelectItem key={h3} value={h3}>
                            {h3}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
          {availableNoteH2.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes available for this statement type.</p>
          ) : (
            <div className="flex flex-col gap-1" ref={noteListRef}>
              {availableNoteH2.map((h2) => (
                <Button
                  key={h2}
                  size="sm"
                  variant={selectedNoteH2 === h2 ? 'secondary' : 'ghost'}
                  className="justify-start h-7 text-xs"
                  data-note-h2={h2}
                  onClick={() => setSelectedNoteH2(h2)}
                >
                  {h2}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="border rounded-md p-2 overflow-auto">
          {!activeNote ? (
            <div className="text-xs text-muted-foreground">
              Select a note to view details.
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${notePreviewZoom})`,
                transformOrigin: 'top left',
                width: `${100 / notePreviewZoom}%`,
              }}
            >
              <Table key={`${noteTableSettings.rowHeight}-${noteTableSettings.particularsWidth}-${noteTableSettings.amountWidth}-${noteTableSettings.fontSize}`}>
                <TableHeader>
                  <TableRow style={{ height: `${noteTableSettings.rowHeight}px` }}>
                    <TableHead
                      style={{ width: noteTableSettings.particularsWidth, fontSize: `${noteTableSettings.fontSize}px` }}
                    >
                      Particulars
                    </TableHead>
                    <TableHead
                      className="text-right"
                      style={{ width: noteTableSettings.amountWidth, fontSize: `${noteTableSettings.fontSize}px` }}
                    >
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-semibold" style={{ height: `${noteTableSettings.rowHeight}px` }}>
                    <TableCell
                      style={{ width: noteTableSettings.particularsWidth, fontSize: `${noteTableSettings.fontSize}px` }}
                    >
                      {(() => {
                        const noteNo = noteNumberMap.get(selectedNoteH2);
                        return noteNo ? `Note ${noteNo}: ${activeNote.header}` : activeNote.header;
                      })()}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      style={{ width: noteTableSettings.amountWidth, fontSize: `${noteTableSettings.fontSize}px` }}
                    ></TableCell>
                  </TableRow>
                  {displayNoteRows.map((row) => {
                    const isSelected = noteEditMode && selectedNoteRowId === row.id;
                    const alignClass = row.align === 'center'
                      ? 'text-center'
                      : row.align === 'right'
                        ? 'text-right'
                        : 'text-left';
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          isSelected && 'bg-blue-50',
                          noteEditMode && 'cursor-pointer'
                        )}
                        style={{ height: `${noteTableSettings.rowHeight}px` }}
                        onClick={() => {
                          if (noteEditMode) {
                            setSelectedNoteRowId(row.id);
                          }
                        }}
                      >
                        <TableCell
                          className={cn(
                            alignClass,
                            row.bold && 'font-semibold',
                            row.italic && 'italic'
                          )}
                          style={{
                            width: noteTableSettings.particularsWidth,
                            fontSize: `${noteTableSettings.fontSize}px`,
                            paddingLeft: `${row.indent * 24}px`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                          <span>{row.label || ' '}</span>
                            {noteEditMode && row.formulaWarning && (
                              <span className="text-red-600 text-[10px]">!</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium',
                            row.italic && 'italic'
                          )}
                          style={{ width: noteTableSettings.amountWidth, fontSize: `${noteTableSettings.fontSize}px` }}
                        >
                          {noteEditMode && row.rowType === 'INPUT' ? (
                            <Input
                              type="number"
                              value={noteLayout?.overrides[row.id]?.manualValue ?? row.amount}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateNoteLayout((layout) => {
                                  const overrides = { ...layout.overrides };
                                  const current = overrides[row.id] || {};
                                  overrides[row.id] = { ...current, manualValue: value === '' ? undefined : Number(value) };
                                  return { ...layout, overrides };
                                });
                              }}
                              className="h-7 text-xs text-right"
                            />
                          ) : (
                            row.formattedAmount
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-semibold border-t" style={{ height: `${noteTableSettings.rowHeight}px` }}>
                    <TableCell
                      style={{ width: noteTableSettings.particularsWidth, fontSize: `${noteTableSettings.fontSize}px` }}
                    >
                      Total
                    </TableCell>
                    <TableCell
                      className="text-right font-mono"
                      style={{ width: noteTableSettings.amountWidth, fontSize: `${noteTableSettings.fontSize}px` }}
                    >
                      {activeNote.formattedTotal}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderFaceTab = (statementType: 'BS' | 'PL') => {
    if (currentData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Import classified trial balance data to view face reports.
        </div>
      );
    }

    const summary = statementType === 'BS' ? faceSummaryBS : faceSummaryPL;
    const totals = summary.totals || {};
    const diff = statementType === 'BS' ? (totals.difference || 0) : 0;
    const profitLoss = statementType === 'PL' ? (totals.profitLoss || 0) : 0;
    const warnDiff = statementType === 'BS' && Math.abs(diff) > noteTolerance;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold">
            {statementType === 'PL' ? 'Profit & Loss' : 'Balance Sheet'}
          </div>
          {isProUser && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setShowFaceSettings(prev => !prev)}
            >
              {showFaceSettings ? 'Hide Settings' : 'Face Settings'}
            </Button>
          )}
        </div>

        {isProUser && showFaceSettings && (
          <div className="flex flex-wrap items-center gap-4 border rounded-md p-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`face-edit-notes-${statementType}`}
                checked={noteEditMode}
                onCheckedChange={(value) => {
                  const nextValue = Boolean(value);
                  setNoteEditMode(nextValue);
                  if (!nextValue) {
                    setSelectedFaceRowId(null);
                  }
                }}
              />
              <Label htmlFor={`face-edit-notes-${statementType}`} className="text-xs">
                Edit notes
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Row Height</Label>
              <Input
                type="number"
                min={18}
                max={80}
                value={noteTableSettings.rowHeight}
                onChange={(e) => setNoteTableSettings(prev => ({
                  ...prev,
                  rowHeight: Math.max(18, Math.min(80, parseInt(e.target.value, 10) || prev.rowHeight)),
                }))}
                className="h-8 w-20 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Particulars Width</Label>
              <Input
                type="number"
                min={200}
                max={900}
                value={noteTableSettings.particularsWidth}
                onChange={(e) => setNoteTableSettings(prev => ({
                  ...prev,
                  particularsWidth: Math.max(200, Math.min(900, parseInt(e.target.value, 10) || prev.particularsWidth)),
                }))}
                className="h-8 w-24 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Amount Width</Label>
              <Input
                type="number"
                min={120}
                max={400}
                value={noteTableSettings.amountWidth}
                onChange={(e) => setNoteTableSettings(prev => ({
                  ...prev,
                  amountWidth: Math.max(120, Math.min(400, parseInt(e.target.value, 10) || prev.amountWidth)),
                }))}
                className="h-8 w-24 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Font Size</Label>
              <Input
                type="number"
                min={10}
                max={18}
                value={noteTableSettings.fontSize}
                onChange={(e) => setNoteTableSettings(prev => ({
                  ...prev,
                  fontSize: Math.max(10, Math.min(18, parseInt(e.target.value, 10) || prev.fontSize)),
                }))}
                className="h-8 w-20 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Zoom</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() => setNotePreviewZoom((prev) => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10))}
              >
                -
              </Button>
              <div className="text-xs w-10 text-center">{Math.round(notePreviewZoom * 100)}%</div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() => setNotePreviewZoom((prev) => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10))}
              >
                +
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() => setNotePreviewZoom(1)}
              >
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={handleResetNotePreview}
              >
                Reset Preview
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          <div className="border rounded-md p-2 max-h-[520px] overflow-auto">
            {noteEditMode && (
              <div className="flex flex-col gap-2 mb-3">
                <Input
                  value={faceNewRowLabel}
                  onChange={(e) => setFaceNewRowLabel(e.target.value)}
                  placeholder="New row label"
                  className="h-7 text-xs"
                />
                <Input
                  value={faceSelectedLabel}
                  onChange={(e) => handleFaceLabelChange(e.target.value)}
                  placeholder="Selected row label"
                  className="h-7 text-xs"
                  disabled={!selectedFaceRowId}
                />
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddFaceRow('top')}>
                    Add Top
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddFaceRow('above')} disabled={!selectedFaceRowId}>
                    Add Above
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddFaceRow('below')} disabled={!selectedFaceRowId}>
                    Add Below
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleAddFaceRow('bottom')}>
                    Add Bottom
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleMoveFaceRow('up')} disabled={!selectedFaceRowId}>
                    Move Up
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleMoveFaceRow('down')} disabled={!selectedFaceRowId}>
                    Move Down
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleFaceSetParentAnchor} disabled={!selectedFaceRowId}>
                    Set Parent
                  </Button>
                  {faceParentAnchorId && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      Parent: {resolveFaceRowLabel(faceParentAnchorId) || 'Selected'}
                    </span>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleFaceAttachToParent} disabled={!selectedFaceRowId || !faceParentAnchorId}>
                    Attach to Parent
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleFaceClearParent} disabled={!selectedFaceRowId}>
                    Clear Parent
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceMakeParent(false)} disabled={!selectedFaceRowId}>
                    Make Child
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceMakeParent(true)} disabled={!selectedFaceRowId}>
                    Make Parent
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceIndent(-1)} disabled={!selectedFaceRowId}>
                    Indent -
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceIndent(1)} disabled={!selectedFaceRowId}>
                    Indent +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceToggleStyle('bold')} disabled={!selectedFaceRowId}>
                    Bold
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceToggleStyle('italic')} disabled={!selectedFaceRowId}>
                    Italic
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceAlign('left')} disabled={!selectedFaceRowId}>
                    Align Left
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceAlign('center')} disabled={!selectedFaceRowId}>
                    Align Center
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleFaceAlign('right')} disabled={!selectedFaceRowId}>
                    Align Right
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={handleDeleteFaceRow} disabled={!selectedFaceRowId}>
                    Delete
                  </Button>
                  <Button size="sm" variant="default" className="h-7 text-[11px]" onClick={handleSaveNoteEdits}>
                    Save Layout
                  </Button>
                </div>
                {selectedFaceRowId && (
                  <div className="border rounded-md p-2 text-[11px] flex flex-col gap-2">
                    <div className="font-semibold">Row Properties</div>
                    <div className="text-[10px] text-muted-foreground break-all">
                      Row ID: <span className="font-mono">{selectedFaceRowId}</span>
                    </div>
                    {!selectedFaceDisplayRow?.isManual && (
                      <div className="text-[10px] text-muted-foreground">
                        Source: Auto (note total for selected H2)
                      </div>
                    )}
                    {selectedFaceDisplayRow?.noteTarget && (
                      <div className="text-[10px] text-muted-foreground">
                        Linked H2: {selectedFaceDisplayRow.noteTarget}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Row Type</Label>
                      <Select
                        value={faceLayout?.overrides[selectedFaceRowId]?.rowType || selectedFaceDisplayRow?.rowType || 'INPUT'}
                        onValueChange={(value) => {
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, rowType: value as NoteRowOverride['rowType'] };
                            return { ...layout, overrides };
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Row Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INPUT">INPUT</SelectItem>
                          <SelectItem value="CALC">CALC</SelectItem>
                          <SelectItem value="HEADER">HEADER</SelectItem>
                          <SelectItem value="SUBTOTAL">SUBTOTAL</SelectItem>
                          <SelectItem value="TOTAL">TOTAL</SelectItem>
                          <SelectItem value="CONDITIONAL">CONDITIONAL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {['CALC', 'SUBTOTAL', 'TOTAL'].includes(faceLayout?.overrides[selectedFaceRowId]?.rowType || selectedFaceDisplayRow?.rowType || '') && (
                      <div className="flex items-center gap-2">
                        <Label className="w-20 text-[11px]">Formula</Label>
                        <Input
                          value={faceLayout?.overrides[selectedFaceRowId]?.formula || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateFaceLayout((layout) => {
                              const overrides = { ...layout.overrides };
                              const current = overrides[selectedFaceRowId] || {};
                              overrides[selectedFaceRowId] = { ...current, formula: value };
                              return { ...layout, overrides };
                            });
                          }}
                          className="h-7 text-xs flex-1"
                          placeholder={'SUM(ROW("a"), ROW("b"))'}
                        />
                      </div>
                    )}
                    {['CALC', 'SUBTOTAL', 'TOTAL'].includes(faceLayout?.overrides[selectedFaceRowId]?.rowType || selectedFaceDisplayRow?.rowType || '') && (
                      <div className="text-[10px] text-muted-foreground">
                        Example: DIFF(ROW("face-total:Income"), ROW("face-total:Expenses"))
                      </div>
                    )}
                    {(selectedFaceDisplayRow?.formulaWarning || selectedFaceDisplayRow?.hasCycle) && (
                      <div className="text-[10px] text-red-600">
                        {selectedFaceDisplayRow?.hasCycle && <div>Formula cycle detected.</div>}
                        {selectedFaceDisplayRow?.missingRowRefs && selectedFaceDisplayRow.missingRowRefs.length > 0 && (
                          <div>Missing rows: {selectedFaceDisplayRow.missingRowRefs.join(', ')}</div>
                        )}
                        {selectedFaceDisplayRow?.missingVariableRefs && selectedFaceDisplayRow.missingVariableRefs.length > 0 && (
                          <div>Missing variables: {selectedFaceDisplayRow.missingVariableRefs.join(', ')}</div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Manual</Label>
                      <Input
                        type="number"
                        value={faceLayout?.overrides[selectedFaceRowId]?.manualValue ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, manualValue: value === '' ? undefined : Number(value) };
                            return { ...layout, overrides };
                          });
                        }}
                        className="h-7 text-xs w-28"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Visibility</Label>
                      <Select
                        value={faceLayout?.overrides[selectedFaceRowId]?.visibility || 'always'}
                        onValueChange={(value) => {
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, visibility: value as NoteRowOverride['visibility'] };
                            return { ...layout, overrides };
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="always">Always show</SelectItem>
                          <SelectItem value="nonzero">Show if non-zero</SelectItem>
                          <SelectItem value="childNonZero">Show if child has value</SelectItem>
                          <SelectItem value="enabled">Show if enabled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Checkbox
                        checked={faceLayout?.overrides[selectedFaceRowId]?.enabled ?? true}
                        onCheckedChange={(value) => {
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, enabled: Boolean(value) };
                            return { ...layout, overrides };
                          });
                        }}
                      />
                      <span className="text-[11px]">Enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={faceLayout?.overrides[selectedFaceRowId]?.allowNegative ?? true}
                        onCheckedChange={(value) => {
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, allowNegative: Boolean(value) };
                            return { ...layout, overrides };
                          });
                        }}
                      />
                      <span className="text-[11px]">Allow negative</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Alt label</Label>
                      <Input
                        value={faceLayout?.overrides[selectedFaceRowId]?.labelWhenPartnership || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, labelWhenPartnership: value || undefined };
                            return { ...layout, overrides };
                          });
                        }}
                        className="h-7 text-xs flex-1"
                        placeholder="Partnership/LLP label"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={faceLayout?.overrides[selectedFaceRowId]?.useAltLabelForOthers ?? false}
                        onCheckedChange={(value) => {
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, useAltLabelForOthers: Boolean(value) };
                            return { ...layout, overrides };
                          });
                        }}
                      />
                    <span className="text-[11px]">Use alt label for non-company</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Alt label</Label>
                      <Input
                        value={faceLayout?.overrides[selectedFaceRowId]?.labelWhenOther || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, labelWhenOther: value || undefined };
                            return { ...layout, overrides };
                          });
                        }}
                        className="h-7 text-xs flex-1"
                        placeholder="Non-company label"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">Note No</Label>
                      <Select
                        value={faceLayout?.overrides[selectedFaceRowId]?.noteNoMode || 'auto'}
                        onValueChange={(value) => {
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, noteNoMode: value as NoteRowOverride['noteNoMode'] };
                            return { ...layout, overrides };
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="hide">Hide</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      {faceLayout?.overrides[selectedFaceRowId]?.noteNoMode === 'custom' && (
                        <Input
                          type="number"
                          value={faceLayout?.overrides[selectedFaceRowId]?.noteNoOverride ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateFaceLayout((layout) => {
                              const overrides = { ...layout.overrides };
                              const current = overrides[selectedFaceRowId] || {};
                              overrides[selectedFaceRowId] = {
                                ...current,
                                noteNoOverride: value === '' ? undefined : Number(value),
                              };
                              return { ...layout, overrides };
                            });
                          }}
                          className="h-7 text-xs w-20"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-20 text-[11px]">H2 Map</Label>
                      <Select
                        value={faceLayout?.overrides[selectedFaceRowId]?.noteTarget || selectedFaceDisplayRow?.noteTarget || ''}
                        onValueChange={(value) => {
                          updateFaceLayout((layout) => {
                            const overrides = { ...layout.overrides };
                            const current = overrides[selectedFaceRowId] || {};
                            overrides[selectedFaceRowId] = { ...current, noteTarget: value || undefined };
                            return { ...layout, overrides };
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-48">
                          <SelectValue placeholder="Select H2" />
                        </SelectTrigger>
                        <SelectContent>
                          {(statementType === 'PL' ? faceH2OptionsPL : faceH2OptionsBS).map((h2) => (
                            <SelectItem key={h2} value={h2}>
                              {h2}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {noteEditMode ? 'Select a row in the table to edit.' : 'Enable Edit notes to change layout.'}
            </p>
          </div>
          <div className="border rounded-md p-2 max-h-[520px] overflow-auto">
            <div
              style={{
                transform: `scale(${notePreviewZoom})`,
                transformOrigin: 'top left',
                width: `${100 / notePreviewZoom}%`,
              }}
            >
              <Table>
                <TableHeader>
                  <TableRow style={{ height: `${noteTableSettings.rowHeight}px` }}>
                    <TableHead style={{ width: noteTableSettings.particularsWidth, fontSize: `${noteTableSettings.fontSize}px` }}>
                      Particulars
                    </TableHead>
                    <TableHead className="text-center" style={{ width: 90, fontSize: `${noteTableSettings.fontSize}px` }}>
                      Note No
                    </TableHead>
                    <TableHead className="text-right" style={{ width: noteTableSettings.amountWidth, fontSize: `${noteTableSettings.fontSize}px` }}>
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayFaceRows.map((row) => {
                    const isSelected = noteEditMode && selectedFaceRowId === row.id;
                    const alignClass = row.align === 'center'
                      ? 'text-center'
                      : row.align === 'right'
                        ? 'text-right'
                        : 'text-left';
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          isSelected && 'bg-blue-50',
                          noteEditMode && 'cursor-pointer'
                        )}
                        style={{ height: `${noteTableSettings.rowHeight}px` }}
                        onClick={() => {
                          if (noteEditMode) {
                            setSelectedFaceRowId(row.id);
                          }
                        }}
                      >
                      <TableCell
                        className={cn(
                          alignClass,
                          row.bold && 'font-semibold',
                          row.italic && 'italic'
                        )}
                        style={{
                          width: noteTableSettings.particularsWidth,
                          fontSize: `${noteTableSettings.fontSize}px`,
                          paddingLeft: `${row.indent * 24}px`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span>{row.label || ' '}</span>
                          {noteEditMode && row.formulaWarning && (
                            <span className="text-red-600 text-[10px]">!</span>
                          )}
                        </div>
                      </TableCell>
                        <TableCell className={cn("text-center", row.bold && 'font-semibold')} style={{ fontSize: `${noteTableSettings.fontSize}px` }}>
                          {row.noteNo ? (
                            noteEditMode ? (
                              `Note ${row.noteNo}`
                            ) : (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto px-0 text-xs"
                                onClick={() => {
                                  if (row.noteTarget) {
                                    handleNoteLinkClick(statementType, row.noteTarget);
                                  }
                                }}
                              >
                                Note {row.noteNo}
                              </Button>
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono", row.bold && 'font-semibold')} style={{ fontSize: `${noteTableSettings.fontSize}px` }}>
                          {noteEditMode && row.rowType === 'INPUT' ? (
                            <Input
                              type="number"
                              value={faceLayout?.overrides[row.id]?.manualValue ?? row.amount}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateFaceLayout((layout) => {
                                  const overrides = { ...layout.overrides };
                                  const current = overrides[row.id] || {};
                                  overrides[row.id] = { ...current, manualValue: value === '' ? undefined : Number(value) };
                                  return { ...layout, overrides };
                                });
                              }}
                              className="h-7 text-xs text-right"
                            />
                          ) : (
                            row.formattedAmount
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-xs">
          {statementType === 'BS' ? (
            <>
              <div>Total Assets: <span className="font-semibold">{formatNumber(totals.totalAssets || 0)}</span></div>
              <div>Total Liabilities: <span className="font-semibold">{formatNumber(totals.totalLiabilities || 0)}</span></div>
              <div className={cn(warnDiff && 'text-red-600')}>
                Difference: <span className="font-semibold">{formatNumber(diff)}</span>
              </div>
            </>
          ) : (
            <>
              <div>Total Income: <span className="font-semibold">{formatNumber(totals.totalIncome || 0)}</span></div>
              <div>Total Expenses: <span className="font-semibold">{formatNumber(totals.totalExpenses || 0)}</span></div>
              <div>
                {profitLoss >= 0 ? 'Profit' : 'Loss'}: <span className="font-semibold">{formatNumber(Math.abs(profitLoss))}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };
  
  const handleToolbarBulkUpdate = useCallback(() => {
    if (activeTab === 'stock-items') {
      setStockBulkUpdateRequestId((prev) => prev + 1);
    } else {
      setIsBulkUpdateDialogOpen(true);
    }
  }, [activeTab]);

  const handleToolbarDeleteSelected = useCallback(() => {
    if (activeTab === 'stock-items') {
      setStockDeleteRequestId((prev) => prev + 1);
    } else {
      handleDeleteSelected();
    }
  }, [activeTab, handleDeleteSelected]);

  const handleOpenFilterModal = useCallback(() => {
    setIsFilterModalOpen(true);
  }, []);

  const handleOpenRulesBot = useCallback(() => {
    setIsRulesBotOpen(true);
  }, []);

  const handleOpenEntityDialog = useCallback(() => {
    setIsEntityDialogOpen(true);
  }, []);

  const handleOpenOdbcDialog = useCallback(() => {
    setIsOdbcDialogOpen(true);
  }, []);

  const handleOpenBsplHeads = useCallback(() => {
    setIsBsplHeadsOpen(true);
  }, []);

  const handleOpenTableSettings = useCallback(() => {
    setIsTableSettingsOpen(true);
  }, []);

  const handleOpenVariablesDialog = useCallback(() => {
    setIsVariablesDialogOpen(true);
  }, []);

  const handleOpenAddLineDialog = useCallback(() => {
    setIsAddLineDialogOpen(true);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleOpenNoteNumberDialog = useCallback(() => {
    setNoteNumberStartDraft(String(noteNumberStart));
    setIsNoteNumberDialogOpen(true);
  }, [noteNumberStart]);

  const handleSetNumberScale = useCallback((value: string) => {
    setNumberScale(value as typeof numberScale);
  }, [numberScale]);

  const handleSetImportPeriodType = useCallback((value: 'current' | 'previous') => {
    setImportPeriodType(value);
  }, []);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Consolidated Header - Two Compact Rows */}
      <FinancialReviewToolbar
        activeTab={activeTab}
        isFetching={isFetching}
        isConnecting={odbcConnection.isConnecting}
        isConnected={odbcConnection.isConnected}
        importPeriodType={importPeriodType}
        visiblePeriodLabel={visiblePeriodLabel}
        classificationRulesCount={classificationRules.length}
        selectedFilteredCount={selectedFilteredCount}
        stockSelectedCount={stockSelectedCount}
        selectedRowIndicesSize={selectedRowIndices.size}
        currentDataLength={currentData.length}
        filteredDataLength={filteredData.length}
        actualDataLength={actualData.length}
        currentStockDataLength={currentStockData.length}
        searchTerm={searchTerm}
        groupFilter={groupFilter}
        balanceFilter={balanceFilter}
        numberScale={numberScale}
        onSearchChange={handleSearchChange}
        onOpenFilterModal={handleOpenFilterModal}
        onOpenRulesBot={handleOpenRulesBot}
        onOpenEntityDialog={handleOpenEntityDialog}
        onOpenOdbcDialog={handleOpenOdbcDialog}
        onOpenBsplHeads={handleOpenBsplHeads}
        onOpenTableSettings={handleOpenTableSettings}
        onOpenNoteNumberDialog={handleOpenNoteNumberDialog}
        onOpenVariablesDialog={handleOpenVariablesDialog}
        onOpenAddLineDialog={handleOpenAddLineDialog}
        onDeleteSelected={handleToolbarDeleteSelected}
        onConnectTally={handleConnectTally}
        onExcelImport={handleExcelImport}
        onExportTemplate={handleExportTemplate}
        onExportActualTB={handleExportActualTB}
        onExportClassifiedTB={handleExportClassifiedTB}
        onBulkUpdate={handleToolbarBulkUpdate}
        onSave={handleSave}
        onSaveNotePreviewDefaults={handleSaveNotePreviewDefaults}
        onClearAll={handleClearWithConfirmation}
        onSetImportPeriodType={handleSetImportPeriodType}
        onReapplyAutoClassification={handleReapplyAutoClassification}
        onSaveManualRules={handleSaveManualRules}
        hasManualRows={hasManualRows}
        onSetNumberScale={handleSetNumberScale}
        toast={toast}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TotalsBar totals={totals} formatNumber={formatNumber} />
      
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
              {isProUser && (
                <TabsTrigger 
                  value="face-bs"
                  className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
                >
                  <FileSpreadsheet className="w-3 h-3 mr-1" />
                  Balance Sheet
                </TabsTrigger>
              )}
              {isProUser && (
                <TabsTrigger 
                  value="face-pl"
                  className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
                >
                  <FileSpreadsheet className="w-3 h-3 mr-1" />
                  Profit & Loss
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="notes-bs"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Notes (BS)
              </TabsTrigger>
              <TabsTrigger 
                value="notes-pl"
                className="relative text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600 rounded-none border-0 h-6 py-0 px-2"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Notes (PL)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area - Maximized for table display */}
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            
            {/* ACTUAL TRIAL BALANCE TAB */}
            <TabsContent value="actual-tb" className="mt-0 p-1">
              <div className="h-full w-full" style={{ height: 'calc(100vh - 180px)' }}>
                <ActualTBTable
                  rows={filteredActualData}
                  allRows={actualData}
                  keyToIndexMap={actualKeyToIndexMap}
                  selectedRowIndices={selectedRowIndices}
                  setSelectedRowIndices={setSelectedRowIndices}
                  toggleRowSelection={toggleRowSelection}
                  actualStickyOffsets={actualStickyOffsets}
                  getActualColumnWidth={getActualColumnWidth}
                  getActualFontSize={getActualFontSize}
                  getActualRowHeight={getActualRowHeight}
                  getActualTbColumnValues={getActualTbColumnValues}
                  actualTbColumnFilters={actualTbColumnFilters}
                  actualTbSortColumn={actualTbSortColumn}
                  actualTbSortDirection={actualTbSortDirection}
                  handleActualTbFilterChange={handleActualTbFilterChange}
                  handleActualTbSort={handleActualTbSort}
                  actualTbHandleMouseDown={actualTbHandleMouseDown}
                  formatNumber={formatNumber}
                  cn={cn}
                />
              </div>
            </TabsContent>

            {/* CLASSIFIED TRIAL BALANCE TAB */}
            <TabsContent value="classified-tb" className="mt-0 p-1">
              <div className="h-full w-full flex flex-col gap-2" style={{ height: 'calc(100vh - 180px)' }}>
                <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm space-y-2">
                  <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Stock Details</p>
                      <p className="text-xs text-muted-foreground">
                        Enter opening and closing values for each inventory bucket. Saving will add closing inventory rows and the Change in Inventories line automatically.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Button size="sm" variant="outline" onClick={resetManualInventoryDraft}>
                        Reset
                      </Button>
                      <Button size="sm" onClick={handleManualInventorySave}>
                        Save
                      </Button>
                      <button
                        type="button"
                        onClick={toggleStockDetails}
                        className="inline-flex items-center gap-1 rounded border border-transparent px-3 py-1 text-xs font-medium text-blue-600 shadow-sm hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {stockDetailsCollapsed ? 'Expand' : 'Collapse'}
                        {stockDetailsCollapsed ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronUp className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  {!stockDetailsCollapsed ? (
                    <>
                      <div className="grid grid-cols-[2fr_1fr_1fr] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-dashed pb-2">
                        <div>Category</div>
                        <div className="text-right">Opening Inventories</div>
                        <div className="text-right">Closing Inventories</div>
                      </div>
                      {STOCK_DETAIL_CATEGORIES.map(category => (
                        <div
                          key={category.key}
                          className="grid grid-cols-[2fr_1fr_1fr] items-center border-dashed border-b last:border-b-0 py-1.5"
                        >
                          <div className="text-sm font-medium text-gray-800">{category.label}</div>
                          <Input
                            type="number"
                            value={manualInventoryDraft[category.key].opening}
                            onChange={(e) => updateManualInventoryDraftValue(category.key, 'opening', e.target.value)}
                            className="h-8 text-xs text-right px-2"
                          />
                          <Input
                            type="number"
                            value={manualInventoryDraft[category.key].closing}
                            onChange={(e) => updateManualInventoryDraftValue(category.key, 'closing', e.target.value)}
                            className="h-8 text-xs text-right px-2"
                          />
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="py-1 text-xs text-muted-foreground">
                      Enter values to show the rows. Totals shown below.
                    </div>
                  )}
                  <div className="grid grid-cols-[2fr_1fr_1fr] items-center text-sm font-semibold text-gray-900 pt-1">
                    <div>Total</div>
                    <div className="text-right">{formatNumber(manualInventoryTotals.opening)}</div>
                    <div className="text-right">{formatNumber(manualInventoryTotals.closing)}</div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full w-full">
                    <ClassifiedTBTable
                      rows={filteredData}
                      allRows={currentData}
                      keyToIndexMap={currentKeyToIndexMap}
                      selectedRowIndices={selectedRowIndices}
                      selectedFilteredCount={selectedFilteredCount}
                      setSelectedRowIndices={setSelectedRowIndices}
                      toggleRowSelection={toggleRowSelection}
                      getColumnWidth={getColumnWidth}
                      getColumnFontSize={getColumnFontSize}
                      getClassifiedRowHeight={getClassifiedRowHeight}
                      getClassifiedTbColumnValues={getClassifiedTbColumnValues}
                      classifiedTbColumnFilters={classifiedTbColumnFilters}
                      classifiedTbSortColumn={classifiedTbSortColumn}
                      classifiedTbSortDirection={classifiedTbSortDirection}
                      handleClassifiedTbFilterChange={handleClassifiedTbFilterChange}
                      handleClassifiedTbSort={handleClassifiedTbSort}
                      updateRowAtIndex={updateRowAtIndex}
                      getFilteredH2Options={getFilteredH2Options}
                      getFilteredH3Options={getFilteredH3Options}
                      resolveH2Key={resolveH2Key}
                      bsplOptions={bsplOptions}
                      getMappingStatus={getMappingStatus}
                      getConfidenceStatus={getConfidenceStatus}
                      getStatusLabel={getStatusLabel}
                      focusedClassifiedRowIndex={focusedClassifiedRowIndex}
                      setFocusedClassifiedRowIndex={setFocusedClassifiedRowIndex}
                      formatNumber={formatNumber}
                      cn={cn}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

              {/* BALANCE SHEET TAB */}
            <TabsContent value="face-bs" className="mt-0 p-2">
              {renderFaceTab('BS')}
            </TabsContent>

            {/* PROFIT & LOSS FACE TAB */}
            <TabsContent value="face-pl" className="mt-0 p-2">
              {renderFaceTab('PL')}
            </TabsContent>

            {/* NOTES TAB - BALANCE SHEET */}
            <TabsContent value="notes-bs" className="mt-0 p-2">
              {notesTabBody}
            </TabsContent>

            {/* NOTES TAB - PROFIT & LOSS */}
            <TabsContent value="notes-pl" className="mt-0 p-2">
              {notesTabBody}
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
    
      <Dialog open={isManualInventoryDialogOpen} onOpenChange={setIsManualInventoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual Inventory Entry</DialogTitle>
            <DialogDescription>
              Enter opening and closing inventory values. Blank fields will be saved as 0.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-[1fr_120px_120px] items-center gap-2">
              <div className="text-xs font-medium">Particulars</div>
              <div className="text-xs font-medium text-right">Opening</div>
              <div className="text-xs font-medium text-right">Closing</div>
            </div>
            <div className="grid grid-cols-[1fr_120px_120px] items-center gap-2">
              <div>Raw Materials</div>
              <Input type="number" value={manualInventoryDraft.rawMaterials.opening} onChange={(e) => updateManualInventoryDraftValue('rawMaterials', 'opening', e.target.value)} className="h-8 text-xs text-right" />
              <Input type="number" value={manualInventoryDraft.rawMaterials.closing} onChange={(e) => updateManualInventoryDraftValue('rawMaterials', 'closing', e.target.value)} className="h-8 text-xs text-right" />
            </div>
            <div className="grid grid-cols-[1fr_120px_120px] items-center gap-2">
              <div>Work-in-Progress</div>
              <Input type="number" value={manualInventoryDraft.workInProgress.opening} onChange={(e) => updateManualInventoryDraftValue('workInProgress', 'opening', e.target.value)} className="h-8 text-xs text-right" />
              <Input type="number" value={manualInventoryDraft.workInProgress.closing} onChange={(e) => updateManualInventoryDraftValue('workInProgress', 'closing', e.target.value)} className="h-8 text-xs text-right" />
            </div>
            <div className="grid grid-cols-[1fr_120px_120px] items-center gap-2">
              <div>Finished Goods</div>
              <Input type="number" value={manualInventoryDraft.finishedGoods.opening} onChange={(e) => updateManualInventoryDraftValue('finishedGoods', 'opening', e.target.value)} className="h-8 text-xs text-right" />
              <Input type="number" value={manualInventoryDraft.finishedGoods.closing} onChange={(e) => updateManualInventoryDraftValue('finishedGoods', 'closing', e.target.value)} className="h-8 text-xs text-right" />
            </div>
            <div className="grid grid-cols-[1fr_120px_120px] items-center gap-2">
              <div>Stock-in-Trade</div>
              <Input type="number" value={manualInventoryDraft.stockInTrade.opening} onChange={(e) => updateManualInventoryDraftValue('stockInTrade', 'opening', e.target.value)} className="h-8 text-xs text-right" />
              <Input type="number" value={manualInventoryDraft.stockInTrade.closing} onChange={(e) => updateManualInventoryDraftValue('stockInTrade', 'closing', e.target.value)} className="h-8 text-xs text-right" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualInventoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveManualInventory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInventoryImportPromptOpen} onOpenChange={setIsInventoryImportPromptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manual Inventory Values Found</DialogTitle>
            <DialogDescription>
              Manual inventory values are saved for this engagement. Do you want to clear them and use imported inventory values?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleKeepManualInventory}>No, keep manual</Button>
            <Button onClick={() => handleClearManualInventory(true)}>Yes, clear & replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              <div className="flex items-center gap-2 mb-2">
                <span className="w-24">User Defined</span>
                <input
                  type="number"
                  min="0"
                  value={userDefinedExpenseThreshold}
                  onChange={(e) => setUserDefinedExpenseThreshold(parseFloat(e.target.value) || 0)}
                  className="h-6 w-20 rounded border px-2"
                />
                <span>threshold</span>
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

      {/* Note Number Start Dialog */}
      <Dialog open={isNoteNumberDialogOpen} onOpenChange={setIsNoteNumberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Note Number Start</DialogTitle>
            <DialogDescription>
              Set the starting note number for Balance Sheet notes. P&amp;L notes will continue after the last BS note.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 text-xs">
            <Label className="w-32">Start Number</Label>
            <Input
              type="number"
              min={1}
              value={noteNumberStartDraft}
              onChange={(e) => setNoteNumberStartDraft(e.target.value)}
              className="h-8 w-24 text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteNumberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNoteNumberStart}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statement Variables Dialog */}
      <Dialog open={isVariablesDialogOpen} onOpenChange={setIsVariablesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Statement Variables</DialogTitle>
            <DialogDescription>
              Define reusable variables for formula rows.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs">
            <div className="grid grid-cols-[1fr_110px_120px_80px] gap-2 items-center">
              <Input
                value={newVariableName}
                onChange={(e) => setNewVariableName(e.target.value)}
                placeholder="variable_name"
                className="h-8 text-xs"
              />
              <Select value={newVariableType} onValueChange={(value) => setNewVariableType(value as 'number' | 'percent' | 'text')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newVariableValue}
                onChange={(e) => setNewVariableValue(e.target.value)}
                placeholder="Value"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  const name = newVariableName.trim();
                  if (!name) return;
                  setStatementVariables((prev) => ({
                    ...prev,
                    [name]: { type: newVariableType, value: newVariableValue },
                  }));
                  setNewVariableName('');
                  setNewVariableValue('');
                  setNewVariableType('number');
                }}
              >
                Add
              </Button>
            </div>
            <div className="border rounded-md max-h-64 overflow-auto">
              {Object.keys(statementVariables).length === 0 ? (
                <div className="p-3 text-muted-foreground">No variables defined.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(statementVariables).map(([name, variable]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell>{variable.type}</TableCell>
                        <TableCell>
                          <Input
                            value={variable.value}
                            onChange={(e) =>
                              setStatementVariables((prev) => ({
                                ...prev,
                                [name]: { ...prev[name], value: e.target.value },
                              }))
                            }
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-[11px]"
                            onClick={() => {
                              setStatementVariables((prev) => {
                                const next = { ...prev };
                                delete next[name];
                                return next;
                              });
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariablesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVariables}>
              Save
            </Button>
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
              {(currentFyLabel || previousFyLabel) && (
                <div className="text-xs text-muted-foreground">
                  {currentFyLabel}{currentFyLabel && previousFyLabel ? ' / ' : ''}{previousFyLabel}
                </div>
              )}
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
                    {fromDate && toDate ? `${formatDateIndianShort(fromDate)} to ${formatDateIndianShort(toDate)}` : 'Set date range first'}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {previousFromDate && previousToDate ? `${formatDateIndianShort(previousFromDate)} to ${formatDateIndianShort(previousToDate)}` : 'For comparison'}
                  </p>
                </div>
              </div>
            </div>

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
      


      


      {/* Consolidated Setup Dialog - Entity Type + Business Type + Period + Stock Items */}
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

      {/* Bulk Update Dialog with Auto-Population */}
      <BulkUpdateDialogComponent
        open={isBulkUpdateDialogOpen}
        onOpenChange={setIsBulkUpdateDialogOpen}
        selectedRowIndices={selectedRowIndices}
        currentData={currentData}
        onApply={handleBulkUpdate}
        bsplOptions={bsplOptions}
      />

      {/* Classification Rules Bot Dialog - Full-Featured Component */}
      <ClassificationRulesBot
        open={isRulesBotOpen}
        onOpenChange={setIsRulesBotOpen}
        rules={classificationRules}
        onSave={handleSaveClassificationRules}
        bsplOptions={bsplOptions}
        defaultScope={currentEngagement?.id ? 'client' : 'global'}
        groupOptions={TALLY_DEFAULT_GROUPS.map(g => g['Primary Group Name']).filter((v, i, a) => a.indexOf(v) === i)}
        onAddGroup={(value: string, scope: 'client' | 'global') => console.log('Group added:', value, scope)}
      />

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Trial Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-filter">Group Filter</Label>
              <Select value={groupFilter} onValueChange={(value) => setGroupFilter(value)}>
                <SelectTrigger id="group-filter">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="Asset">Assets</SelectItem>
                  <SelectItem value="Liability">Liabilities</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance-filter">Balance Filter</Label>
              <Select value={balanceFilter} onValueChange={(value) => setBalanceFilter(value)}>
                <SelectTrigger id="balance-filter">
                  <SelectValue placeholder="Select balance type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Balances</SelectItem>
                  <SelectItem value="positive">Positive Balances</SelectItem>
                  <SelectItem value="negative">Negative Balances</SelectItem>
                  <SelectItem value="zero">Zero Balances</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(groupFilter !== 'all' || balanceFilter !== 'all') && (
              <div className="p-2 bg-blue-50 rounded text-xs">
                Showing {selectedFilteredCount} of {currentData.length} ledgers
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setGroupFilter('all');
                setBalanceFilter('all');
              }}>
                Reset
              </Button>
              <Button onClick={() => setIsFilterModalOpen(false)}>Apply Filters</Button>
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

      {/* BSPL Heads Manager */}
      <BsplHeadsManager
        open={isBsplHeadsOpen}
        onOpenChange={setIsBsplHeadsOpen}
        heads={bsplHeads}
        defaultHeads={DEFAULT_BSPL_HEADS}
        onSave={handleSaveBsplHeads}
        onRestore={handleRestoreBsplHeads}
      />

      <LedgerAnnexureDialog
        open={isNoteLedgerDialogOpen}
        onOpenChange={setIsNoteLedgerDialogOpen}
        noteKey={selectedNoteH2 || null}
        ledgers={useHierarchicalNoteView ? hierarchicalNoteLedgerItems : noteLedgerItems}
        reportingScale={noteReportingScale}
      />
      
    </div>
  );
}



































