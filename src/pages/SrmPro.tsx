import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileUp, Search, FileText, TrendingUp, Download, ArrowUpDown, CheckCircle, XCircle, Package, Upload, Trash2, Save, Plus, Settings, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { processAccountingData, summarizeData, deepClean } from '@/utils/srmProcessor';
import { processLastMileMapping } from '@/utils/lastMileMapper';

const SRMPro = () => {
  const [activeTab, setActiveTab] = useState('upload');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [currentYearData, setCurrentYearData] = useState<Record<string, number>>({});
  const [previousYearData, setPreviousYearData] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scale, setScale] = useState('1');
  const [companyName, setCompanyName] = useState('ABC PRIVATE LIMITED');
  const [cin, setCin] = useState('UXXXXXMH2023PTCXXX588');
  const [periodYear, setPeriodYear] = useState('');
  const [uploadPeriod, setUploadPeriod] = useState('current');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [filterSearches, setFilterSearches] = useState<Record<string, string>>({});
  const [assesseeType, setAssesseeType] = useState<'3' | '4' | '5'>('3'); // 3=Corporate, 4=Non-Corporate, 5=LLP
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mappingData, setMappingData] = useState<any[]>([]);
  const [mappingLoaded, setMappingLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mappingData2, setMappingData2] = useState<any[]>([]);
  const [mappingLoaded2, setMappingLoaded2] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data2, setData2] = useState<any[]>([]);
  const [currentYearData2, setCurrentYearData2] = useState<Record<string, number>>({});
  const [previousYearData2, setPreviousYearData2] = useState<Record<string, number>>({});
  const [summary2, setSummary2] = useState<Record<string, number>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rowNotes, setRowNotes] = useState<Record<number, string>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rowEvidence, setRowEvidence] = useState<Record<number, File[]>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [stockDetailsOpen, setStockDetailsOpen] = useState(false);
  const [stockDetails, setStockDetails] = useState({
    rawMaterialOpening: '',
    rawMaterialClosing: '',
    finishedGoodsOpening: '',
    finishedGoodsClosing: '',
    wipOpening: '',
    wipClosing: '',
    stockInTradeOpening: '',
    stockInTradeClosing: '',
  });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  
  // Configuration and Note Numbers
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedTBData, setSavedTBData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedMappings, setSavedMappings] = useState<Array<{
    id: string;
    name: string;
    clientName: string;
    assignment: string;
    dateCreated: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mappingData: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mappingData2: any[];
    assesseeType: '3' | '4' | '5';
  }>>([]);
  const [selectedMappingConfig, setSelectedMappingConfig] = useState<string>('default');
  const [noteNumberDialogOpen, setNoteNumberDialogOpen] = useState(false);
  const [startingNoteNumber, setStartingNoteNumber] = useState('1');
  const [noteNumbers, setNoteNumbers] = useState<Record<string, string>>({});
  const [skipEmptyNoteNumbers, setSkipEmptyNoteNumbers] = useState(true);
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeMapped, setPageSizeMapped] = useState(50);
  const [currentPageMapped, setCurrentPageMapped] = useState(1);
  const [pageSizeMapped2, setPageSizeMapped2] = useState(50);
  const [currentPageMapped2, setCurrentPageMapped2] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastMileMappingData, setLastMileMappingData] = useState<any[]>([]);
  const [pageSizeLastMile, setPageSizeLastMile] = useState(50);
  const [currentPageLastMile, setCurrentPageLastMile] = useState(1);
  const [sortColumnLastMile, setSortColumnLastMile] = useState<string>('');
  const [sortDirectionLastMile, setSortDirectionLastMile] = useState<'asc' | 'desc'>('asc');
  const [columnFiltersLastMile, setColumnFiltersLastMile] = useState<Record<string, string[]>>({});
  const [filterSearchesLastMile, setFilterSearchesLastMile] = useState<Record<string, string>>({});
  const [openFilterColumnLastMile, setOpenFilterColumnLastMile] = useState<string | null>(null);

  const scaleLabels: Record<string, string> = {
    '1': 'Rupees',
    '100': 'Hundreds',
    '1000': 'Thousands',
    '100000': 'Lakhs',
    '10000000': 'Crores',
  };

  // Load mapping files on mount
  useEffect(() => {
    const loadMappingFiles = async () => {
      // Load Mapping.xlsx
      try {
        const response = await fetch('/SRM_Pro/Mapping.xlsx');
        if (!response.ok) {
          console.warn('Mapping file not found, will use default mapping');
        } else {
          const arrayBuffer = await response.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          // Skip header row
          const dataRows = jsonData.slice(1);
          setMappingData(dataRows);
          setMappingLoaded(true);
          console.log('Mapping.xlsx loaded successfully:', dataRows.length, 'mapping rules');
        }
      } catch (error) {
        console.error('Error loading Mapping.xlsx:', error);
        toast.error('Could not load Mapping.xlsx. Using default mapping.');
      }

      // Load Mapping2.xlsx (with priority and keyword-based matching)
      try {
        const response2 = await fetch('/SRM_Pro/Mapping2.xlsx');
        if (!response2.ok) {
          console.warn('Mapping2 file not found');
        } else {
          const arrayBuffer2 = await response2.arrayBuffer();
          const workbook2 = XLSX.read(arrayBuffer2, { type: 'array' });
          const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jsonData2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 }) as any[][];
          
          // Skip header row (row 1: Constitution, Level 1, Level 2, ...)
          const dataRows2 = jsonData2.slice(1);
          setMappingData2(dataRows2);
          setMappingLoaded2(true);
          console.log('Mapping2.xlsx loaded successfully:', dataRows2.length, 'keyword-based mapping rules with priority');
        }
      } catch (error) {
        console.error('Error loading Mapping2.xlsx:', error);
        toast.error('Could not load Mapping2.xlsx.');
      }
    };
    
    loadMappingFiles();
  }, []);

  // Load saved TB data and mappings from localStorage
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const saved = localStorage.getItem('srmPro_savedTBData');
        if (saved) {
          setSavedTBData(JSON.parse(saved));
        }
        
        const savedMaps = localStorage.getItem('srmPro_savedMappings');
        if (savedMaps) {
          setSavedMappings(JSON.parse(savedMaps));
        }
        
        const savedNotes = localStorage.getItem('srmPro_noteNumbers');
        if (savedNotes) {
          setNoteNumbers(JSON.parse(savedNotes));
        }
        
        const skipEmpty = localStorage.getItem('srmPro_skipEmptyNoteNumbers');
        if (skipEmpty !== null) {
          setSkipEmptyNoteNumbers(JSON.parse(skipEmpty));
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    };
    
    loadSavedData();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search ledgers..."]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
      // Ctrl/Cmd + 1-5 for tab navigation
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const tabs = ['upload', 'results', 'summary', 'balance-sheet', 'profit-loss'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex === 0 || data.length > 0) {
          setActiveTab(tabs[tabIndex]);
        }
      }
      // Ctrl/Cmd + Shift + C to clear data
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C' && data.length > 0) {
        e.preventDefault();
        handleClearData();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [data, activeTab]);

  const handleClearData = () => {
    // Clear all data from both mapping systems
    setData([]);
    setData2([]);
    setCurrentYearData({});
    setPreviousYearData({});
    setCurrentYearData2({});
    setPreviousYearData2({});
    setSummary({});
    setSummary2({});
    
    // Clear UI state
    setSearch('');
    setSortColumn('');
    setSortDirection('asc');
    setColumnFilters({});
    setFilterSearches({});
    
    // Clear notes, evidence, and selections
    setRowNotes({});
    setRowEvidence({});
    setSelectedRows(new Set());
    
    // Clear stock details
    setStockDetails({
      rawMaterialOpening: '',
      rawMaterialClosing: '',
      finishedGoodsOpening: '',
      finishedGoodsClosing: '',
      wipOpening: '',
      wipClosing: '',
      stockInTradeOpening: '',
      stockInTradeClosing: ''
    });
    
    // Reset form state
    setSelectedPeriod('current');
    setSelectedYear('');
    setPeriodYear('');
    setCompanyName('');
    setCin('');
    setScale('1');
    setHasUnsavedChanges(false);
    
    // Reset to upload tab
    setActiveTab('upload');
    
    toast.success('All data cleared successfully from all tabs');
    
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleExportToExcel = (type: 'tb' | 'bs' | 'pl' | 'tb2' | 'bs2' | 'pl2') => {
    try {
      let wb: XLSX.WorkBook;
      let fileName = '';

      if (type === 'tb') {
        // Export Mapped Trial Balance
        fileName = `Mapped_TB_${companyName}_${periodYear}.xlsx`;
        wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Mapped TB');
      } else if (type === 'tb2') {
        // Export Mapped Trial Balance 2 (Both mappings comparison)
        fileName = `Mapped_TB2_Comparison_${companyName}_${periodYear}.xlsx`;
        wb = XLSX.utils.book_new();
        
        // Combine data from both mappings
        const combinedData = data.map((row, i) => {
          const baseRow = { ...row };
          // Add Mapped Category 2 from data2
          if (data2[i]) {
            baseRow['Mapped Category 2'] = data2[i]['Mapped Category'] || '-';
          } else {
            baseRow['Mapped Category 2'] = '-';
          }
          return baseRow;
        });
        
        const ws = XLSX.utils.json_to_sheet(combinedData);
        XLSX.utils.book_append_sheet(wb, ws, 'Mapped TB2 Comparison');
      } else if (type === 'bs' || type === 'bs2') {
        // Export Balance Sheet (BS or BS2)
        const useData2 = type === 'bs2';
        const activeCurrentYearData = useData2 ? currentYearData2 : currentYearData;
        const activePreviousYearData = useData2 ? previousYearData2 : previousYearData;
        fileName = `Balance_Sheet${useData2 ? '_2' : ''}_${companyName}_${periodYear}.xlsx`;
        
        wb = XLSX.utils.book_new();
        
        // Create formatted data matching screen display
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bsExportData: any[] = [];
        
        // Add header rows
        bsExportData.push({
          'Particulars': companyName,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        bsExportData.push({
          'Particulars': `CIN: ${cin}`,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        bsExportData.push({
          'Particulars': `Balance Sheet as at 31 March ${periodYear}`,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        bsExportData.push({
          'Particulars': `(Amount in ₹ ${scaleLabels[scale]})`,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        bsExportData.push({
          'Particulars': '',
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        
        // Add data rows with serial numbers
        bsStructure.forEach((row, index) => {
          let currentVal = activeCurrentYearData[deepClean(row.key)] || 0;
          let previousVal = activePreviousYearData[deepClean(row.key)] || 0;
          
          // Calculate profit and add to Reserves & Surplus (same logic as screen)
          if (deepClean(row.key) === deepClean('Reserves and surplus') || deepClean(row.key) === deepClean('Uncategorised Reserves and Surplus')) {
            let currentProfit = 0;
            let previousProfit = 0;
            let currentPLRevenueTotal = 0;
            let previousPLRevenueTotal = 0;
            let currentPLExpensesTotal = 0;
            let previousPLExpensesTotal = 0;
            let currentPLTaxExpense = 0;
            let previousPLTaxExpense = 0;
            let isInPLExpensesSection = false;
            let isInPLTaxSection = false;
            
            plStructure.forEach((plRow) => {
              if (plRow.label === 'EXPENSES') isInPLExpensesSection = true;
              if (plRow.label === '(11) Tax expense') isInPLTaxSection = true;
              if (plRow.label === 'Profit/(Loss) for the period') isInPLTaxSection = false;
              
              if (!plRow.h && !plRow.sub && plRow.key) {
                const cVal = activeCurrentYearData[deepClean(plRow.key)] || 0;
                const pVal = activePreviousYearData[deepClean(plRow.key)] || 0;
                
                if (isInPLTaxSection) {
                  currentPLTaxExpense += cVal;
                  previousPLTaxExpense += pVal;
                } else if (isInPLExpensesSection) {
                  currentPLExpensesTotal += cVal;
                  previousPLExpensesTotal += pVal;
                } else {
                  currentPLRevenueTotal += cVal;
                  previousPLRevenueTotal += pVal;
                }
              }
            });
            
            currentProfit = currentPLRevenueTotal - currentPLExpensesTotal - currentPLTaxExpense;
            previousProfit = previousPLRevenueTotal - previousPLExpensesTotal - previousPLTaxExpense;
            currentVal += currentProfit;
            previousVal += previousProfit;
          }
          
          let particularsText = row.label;
          // Add serial numbers for main sections
          if (row.label && row.label.match(/^\(\d+\)/)) {
            particularsText = row.label;
          }
          
          // Get dynamic note number from state
          let noteNumber = '';
          if (!row.h && !row.sub && !row.un && row.key) {
            const prefix = useData2 ? 'bs2_' : 'bs_';
            noteNumber = noteNumbers[`${prefix}${row.key}`] || '';
          }
          
          bsExportData.push({
            'Particulars': particularsText,
            'Note No.': noteNumber,
            [periodYear]: row.key ? formatValue(currentVal) : (row.label === 'TOTAL' ? formatValue(0) : ''),
            [String(parseInt(periodYear) - 1)]: row.key ? formatValue(previousVal) : (row.label === 'TOTAL' ? formatValue(0) : '')
          });
        });
        
        const ws = XLSX.utils.json_to_sheet(bsExportData);
        XLSX.utils.book_append_sheet(wb, ws, useData2 ? 'Balance Sheet 2' : 'Balance Sheet');
      } else {
        // Export P&L (PL or PL2)
        const useData2 = type === 'pl2';
        const activeCurrentYearData = useData2 ? currentYearData2 : currentYearData;
        const activePreviousYearData = useData2 ? previousYearData2 : previousYearData;
        fileName = `Profit_Loss${useData2 ? '_2' : ''}_${companyName}_${periodYear}.xlsx`;
        
        wb = XLSX.utils.book_new();
        
        // Create formatted data matching screen display
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plExportData: any[] = [];
        
        // Add header rows
        plExportData.push({
          'Particulars': companyName,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        plExportData.push({
          'Particulars': `CIN: ${cin}`,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        plExportData.push({
          'Particulars': `Statement of Profit & Loss`,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        plExportData.push({
          'Particulars': `(Amount in ₹ ${scaleLabels[scale]})`,
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        plExportData.push({
          'Particulars': '',
          'Note No.': '',
          [periodYear]: '',
          [String(parseInt(periodYear) - 1)]: ''
        });
        
        // Add data rows with serial numbers
        plStructure.forEach((row) => {
          const currentVal = activeCurrentYearData[deepClean(row.key)] || 0;
          const previousVal = activePreviousYearData[deepClean(row.key)] || 0;
          
          const particularsText = row.label;
          
          // Get dynamic note number from state
          let noteNumber = '';
          if (!row.h && !row.sub && !row.un && row.key) {
            const prefix = useData2 ? 'pl2_' : 'pl_';
            noteNumber = noteNumbers[`${prefix}${row.key}`] || '';
          }
          
          plExportData.push({
            'Particulars': particularsText,
            'Note No.': noteNumber,
            [periodYear]: row.key ? formatValue(currentVal) : '',
            [String(parseInt(periodYear) - 1)]: row.key ? formatValue(previousVal) : ''
          });
        });
        
        const ws = XLSX.utils.json_to_sheet(plExportData);
        XLSX.utils.book_append_sheet(wb, ws, useData2 ? 'P&L Statement 2' : 'P&L Statement');
      }

      XLSX.writeFile(wb, fileName);
      toast.success(`${type.toUpperCase()} exported to Excel successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to Excel');
    }
  };

  const handleAddNote = (rowIndex: number, note: string) => {
    setRowNotes(prev => ({ ...prev, [rowIndex]: note }));
    setHasUnsavedChanges(true);
  };

  const handleUploadEvidence = (rowIndex: number, files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setRowEvidence(prev => ({ ...prev, [rowIndex]: [...(prev[rowIndex] || []), ...fileArray] }));
      setHasUnsavedChanges(true);
      toast.success(`${files.length} file(s) uploaded for row ${rowIndex + 1}`);
    }
  };

  const handleSelectRow = (rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((_, i) => i)));
    }
  };

  const handleEditRow = (rowIndex: number) => {
    setEditingRow({ ...data[rowIndex], originalIndex: rowIndex });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingRow && editingRow.originalIndex !== undefined) {
      const newData = [...data];
      const { originalIndex, ...rowData } = editingRow;
      newData[originalIndex] = rowData;
      setData(newData);
      
      // Recalculate summary from updated data
      const summarized = summarizeData(newData);
      setSummary(summarized);
      if (uploadPeriod === 'current') {
        setCurrentYearData(summarized);
      } else {
        setPreviousYearData(summarized);
      }
      
      setEditDialogOpen(false);
      setEditingRow(null);
      setHasUnsavedChanges(true);
      toast.success('Row updated successfully');
    }
  };

  const handleDeleteConfirm = () => {
    if (rowToDelete !== null) {
      handleDeleteRow(rowToDelete);
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const handleBulkAddNote = () => {
    const note = prompt('Enter note to add to all selected rows:');
    if (note) {
      const newNotes = { ...rowNotes };
      selectedRows.forEach(rowIndex => {
        newNotes[rowIndex] = note;
      });
      setRowNotes(newNotes);
      setHasUnsavedChanges(true);
      toast.success(`Note added to ${selectedRows.size} row(s)`);
    }
  };

  const handleBulkUploadEvidence = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const newEvidence = { ...rowEvidence };
      selectedRows.forEach(rowIndex => {
        newEvidence[rowIndex] = [...(newEvidence[rowIndex] || []), ...fileArray];
      });
      setRowEvidence(newEvidence);
      setHasUnsavedChanges(true);
      toast.success(`${files.length} file(s) uploaded to ${selectedRows.size} row(s)`);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedRows.size} row(s)?`)) {
      const newData = data.filter((_, i) => !selectedRows.has(i));
      setData(newData);
      
      // Recalculate summary from updated data
      const summarized = summarizeData(newData);
      setSummary(summarized);
      if (uploadPeriod === 'current') {
        setCurrentYearData(summarized);
      } else {
        setPreviousYearData(summarized);
      }
      
      setSelectedRows(new Set());
      setHasUnsavedChanges(true);
      toast.success(`${selectedRows.size} row(s) deleted`);
    }
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, i) => i !== rowIndex);
    setData(newData);
    
    // Recalculate summary from updated data
    const summarized = summarizeData(newData);
    setSummary(summarized);
    if (uploadPeriod === 'current') {
      setCurrentYearData(summarized);
    } else {
      setPreviousYearData(summarized);
    }
    
    setHasUnsavedChanges(true);
    toast.success('Row deleted');
  };

  const handleSaveChanges = () => {
    // In a real application, this would save to a database
    setHasUnsavedChanges(false);
    toast.success('Changes saved successfully');
  };

  const handleSaveStockDetails = () => {
    // Validate that at least some data is entered
    const hasData = Object.values(stockDetails).some(val => val !== '');
    if (!hasData) {
      toast.error('Please enter at least one value');
      return;
    }
    
    // Calculate totals
    const totalOpeningInventories = 
      parseFloat(stockDetails.rawMaterialOpening || '0') +
      parseFloat(stockDetails.finishedGoodsOpening || '0') +
      parseFloat(stockDetails.wipOpening || '0') +
      parseFloat(stockDetails.stockInTradeOpening || '0');
    
    const totalClosingInventories = 
      parseFloat(stockDetails.rawMaterialClosing || '0') +
      parseFloat(stockDetails.finishedGoodsClosing || '0') +
      parseFloat(stockDetails.wipClosing || '0') +
      parseFloat(stockDetails.stockInTradeClosing || '0');
    
    // Remove any existing inventory adjustment entries
    const filteredData = data.filter(row => 
      row.Name !== 'Opening Inventories' && 
      row.Name !== 'Closing Inventories' && 
      row.Name !== 'Closing Inventories (PL)'
    );
    
    // Add inventory adjustment line items
    const inventoryAdjustments = [];
    
    // Create a template row from existing data to get all column structure
    const templateRow = data[0] || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createInventoryRow = (overrides: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRow: any = {};
      // Copy all columns from template and set to empty/zero
      Object.keys(templateRow).forEach(key => {
        if (key.includes('Group') && key.includes('Parent')) {
          newRow[key] = ''; // Clear all Group.$Parent columns
        } else {
          newRow[key] = '';
        }
      });
      // Apply specific values
      Object.assign(newRow, overrides);
      return newRow;
    };
    
    // 1. Opening Inventories (negative value, mapped to Uncategorised Purchase Accounts)
    if (totalOpeningInventories > 0) {
      inventoryAdjustments.push(createInventoryRow({
        Period: data[0]?.Period || '',
        Branch: data[0]?.Branch || '',
        'Ledger Code': '',
        Name: 'Opening Inventories',
        OpeningBalance: -totalOpeningInventories,
        Debit: 0,
        Credit: 0,
        ClosingBalance: -totalOpeningInventories,
        IsRevenue: false,
        IsDeemedPositive: false,
        TrailBalance: -totalOpeningInventories,
        Ledger: 'Opening Inventories',
        'Ledger Parent': '',
        Group: '',
        Parent: '',
        'Mapped Category': 'Uncategorised Purchase Accounts',
        AmountValue: totalOpeningInventories,
        '2nd Parent After Primary': '',
        'Logic Trace': 'Stock Details - Opening Inventories'
      }));
    }
    
    // 2. Closing Inventories (positive value, for Balance Sheet)
    if (totalClosingInventories > 0) {
      inventoryAdjustments.push(createInventoryRow({
        Period: data[0]?.Period || '',
        Branch: data[0]?.Branch || '',
        'Ledger Code': '',
        Name: 'Closing Inventories',
        OpeningBalance: 0,
        Debit: 0,
        Credit: 0,
        ClosingBalance: totalClosingInventories,
        IsRevenue: false,
        IsDeemedPositive: false,
        TrailBalance: totalClosingInventories,
        Ledger: 'Closing Inventories',
        'Ledger Parent': '',
        Group: '',
        Parent: '',
        'Mapped Category': 'Inventories',
        AmountValue: totalClosingInventories,
        '2nd Parent After Primary': '',
        'Logic Trace': 'Stock Details - Closing Inventories (BS)'
      }));
      
      // 3. Closing Inventories (PL) (negative value, mapped to Uncategorised Purchase Accounts)
      inventoryAdjustments.push(createInventoryRow({
        Period: data[0]?.Period || '',
        Branch: data[0]?.Branch || '',
        'Ledger Code': '',
        Name: 'Closing Inventories (PL)',
        OpeningBalance: 0,
        Debit: 0,
        Credit: 0,
        ClosingBalance: -totalClosingInventories,
        IsRevenue: false,
        IsDeemedPositive: false,
        TrailBalance: -totalClosingInventories,
        Ledger: 'Closing Inventories (PL)',
        'Ledger Parent': '',
        Group: '',
        Parent: '',
        'Mapped Category': 'Uncategorised Purchase Accounts',
        AmountValue: -totalClosingInventories,
        '2nd Parent After Primary': '',
        'Logic Trace': 'Stock Details - Closing Inventories (PL)'
      }));
    }
    
    // Update data with inventory adjustments
    const updatedData = [...filteredData, ...inventoryAdjustments];
    setData(updatedData);
    
    // Recalculate summary from updated data
    const summarized = summarizeData(updatedData);
    setSummary(summarized);
    if (uploadPeriod === 'current') {
      setCurrentYearData(summarized);
    } else {
      setPreviousYearData(summarized);
    }
    
    setHasUnsavedChanges(true);
    setStockDetailsOpen(false);
    toast.success('Stock details saved and trial balance adjusted');
  };

  const handleSaveMappingConfiguration = () => {
    const configName = prompt('Enter a name for this mapping configuration:');
    if (!configName) return;
    
    const clientNameInput = prompt('Enter client name:');
    if (!clientNameInput) return;
    
    const assignmentInput = prompt('Enter assignment name:');
    if (!assignmentInput) return;
    
    const newConfig = {
      id: Date.now().toString(),
      name: configName,
      clientName: clientNameInput,
      assignment: assignmentInput,
      dateCreated: new Date().toISOString(),
      mappingData,
      mappingData2,
      assesseeType
    };
    
    const updated = [...savedMappings, newConfig];
    setSavedMappings(updated);
    localStorage.setItem('srmPro_savedMappings', JSON.stringify(updated));
    toast.success(`Mapping configuration "${configName}" saved successfully`);
  };

  const handleLoadMappingConfiguration = (configId: string) => {
    if (configId === 'default') {
      // Reload default mappings
      toast.info('Using system default mappings');
      setSelectedMappingConfig('default');
      return;
    }
    
    const config = savedMappings.find(m => m.id === configId);
    if (config) {
      setMappingData(config.mappingData);
      setMappingData2(config.mappingData2);
      setAssesseeType(config.assesseeType);
      setSelectedMappingConfig(configId);
      toast.success(`Loaded mapping configuration: ${config.name}`);
    }
  };

  const handleDeleteMappingConfiguration = (configId: string) => {
    if (confirm('Are you sure you want to delete this mapping configuration?')) {
      const updated = savedMappings.filter(m => m.id !== configId);
      setSavedMappings(updated);
      localStorage.setItem('srmPro_savedMappings', JSON.stringify(updated));
      if (selectedMappingConfig === configId) {
        setSelectedMappingConfig('default');
      }
      toast.success('Mapping configuration deleted');
    }
  };

  const handleClearSavedTBData = () => {
    if (confirm('Are you sure you want to clear all saved trial balance data? This cannot be undone.')) {
      setSavedTBData([]);
      localStorage.removeItem('srmPro_savedTBData');
      toast.success('Saved trial balance data cleared');
    }
  };

  const handleGenerateNoteNumbers = () => {
    const startNum = parseInt(startingNoteNumber);
    if (isNaN(startNum) || startNum < 1) {
      toast.error('Please enter a valid starting note number (1 or greater)');
      return;
    }
    
    const newNoteNumbers: Record<string, string> = {};
    let currentNoteNum = startNum;
    
    // Generate for BS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bsStructure.forEach((row: any) => {
      if (!row.h && !row.sub && row.key) {
        const currentVal = currentYearData[deepClean(row.key)] || 0;
        const previousVal = previousYearData[deepClean(row.key)] || 0;
        
        // Assign note number based on skipEmptyNoteNumbers setting
        const hasValue = currentVal !== 0 || previousVal !== 0;
        if (!skipEmptyNoteNumbers || hasValue) {
          newNoteNumbers[`bs_${row.key}`] = currentNoteNum.toString();
          currentNoteNum++;
        }
      }
    });
    
    // Generate for PL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plStructure.forEach((row: any) => {
      if (!row.h && !row.sub && row.key) {
        const currentVal = currentYearData[deepClean(row.key)] || 0;
        const previousVal = previousYearData[deepClean(row.key)] || 0;
        
        // Assign note number based on skipEmptyNoteNumbers setting
        const hasValue = currentVal !== 0 || previousVal !== 0;
        if (!skipEmptyNoteNumbers || hasValue) {
          newNoteNumbers[`pl_${row.key}`] = currentNoteNum.toString();
          currentNoteNum++;
        }
      }
    });
    
    // Generate for BS2 (restart from starting number)
    currentNoteNum = startNum; // Reset to starting number for BS2/PL2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bsStructure.forEach((row: any) => {
      if (!row.h && !row.sub && row.key) {
        const currentVal = currentYearData2[deepClean(row.key)] || 0;
        const previousVal = previousYearData2[deepClean(row.key)] || 0;
        
        // Assign note number based on skipEmptyNoteNumbers setting
        const hasValue = currentVal !== 0 || previousVal !== 0;
        if (!skipEmptyNoteNumbers || hasValue) {
          newNoteNumbers[`bs2_${row.key}`] = currentNoteNum.toString();
          currentNoteNum++;
        }
      }
    });
    
    // Generate for PL2 (continues from BS2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plStructure.forEach((row: any) => {
      if (!row.h && !row.sub && row.key) {
        const currentVal = currentYearData2[deepClean(row.key)] || 0;
        const previousVal = previousYearData2[deepClean(row.key)] || 0;
        
        // Assign note number based on skipEmptyNoteNumbers setting
        const hasValue = currentVal !== 0 || previousVal !== 0;
        if (!skipEmptyNoteNumbers || hasValue) {
          newNoteNumbers[`pl2_${row.key}`] = currentNoteNum.toString();
          currentNoteNum++;
        }
      }
    });
    
    setNoteNumbers(newNoteNumbers);
    localStorage.setItem('srmPro_noteNumbers', JSON.stringify(newNoteNumbers));
    setNoteNumberDialogOpen(false);
    toast.success(`Note numbers generated: ${startNum} to ${currentNoteNum - 1}`, { duration: 4000 });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedYear) {
      toast.error('Please enter the financial year (e.g., 2024)');
      return;
    }

    setLoading(true);
    setUploadPeriod(selectedPeriod);
    setPeriodYear(selectedYear);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        
        console.log('Workbook loaded. Sheet names:', wb.SheetNames);
        console.log('Number of sheets:', wb.SheetNames.length);
        
        // Process with mapping data and assessee type (for BS/PL) - using OLD exact-match logic
        const processed = processAccountingData(wb, mappingData, assesseeType, false);
        
        console.log('Processed data (Mapping 1):', processed.length, 'rows');
        console.log('Using assessee type:', assesseeType === '3' ? 'Corporate' : assesseeType === '4' ? 'Non-Corporate' : 'LLP');
        console.log('Mapping loaded:', mappingLoaded ? 'Yes' : 'No');
        if (processed.length > 0) {
          console.log('Sample row:', processed[0]);
        }
        
        if (processed.length === 0) {
          throw new Error('No ledgers found. Please check that your Excel file has the correct column headers (Name, Parent, OpeningBalance, Debit, Credit, ClosingBalance, IsDeemedPositive).');
        }

        // Check for duplicates and merge with existing data
        if (savedTBData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const duplicates: any[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newItems: any[] = [];
          
          processed.forEach(newRow => {
            // Check if row already exists (by Name + Parent combination)
            const isDuplicate = savedTBData.some(existingRow => 
              existingRow.Name === newRow.Name && existingRow.Parent === newRow.Parent
            );
            
            if (isDuplicate) {
              duplicates.push(newRow);
            } else {
              newItems.push(newRow);
            }
          });
          
          // Append only new items
          const mergedData = [...savedTBData, ...newItems];
          setData(mergedData);
          setSavedTBData(mergedData);
          localStorage.setItem('srmPro_savedTBData', JSON.stringify(mergedData));
          
          // Summarize merged data
          const summarized = summarizeData(mergedData);
          setSummary(summarized);
          
          if (selectedPeriod === 'current') {
            setCurrentYearData(summarized);
          } else {
            setPreviousYearData(summarized);
          }
          
          // Show merge results
          if (newItems.length > 0 || duplicates.length > 0) {
            toast.success(
              `Import complete: ${newItems.length} new items added, ${duplicates.length} duplicates skipped`,
              { duration: 5000 }
            );
          }
        } else {
          // First import - save as new
          setData(processed);
          setSavedTBData(processed);
          localStorage.setItem('srmPro_savedTBData', JSON.stringify(processed));
          
          const summarized = summarizeData(processed);
          setSummary(summarized);

          if (selectedPeriod === 'current') {
            setCurrentYearData(summarized);
          } else {
            setPreviousYearData(summarized);
          }
          
          toast.success(`Trial Balance loaded: ${processed.length} items`, { duration: 3000 });
        }

        // Process with mapping data 2 (with priority) for BS2/PL2
        const processed2 = processAccountingData(wb, mappingData2, assesseeType, true);
        console.log('Processed data (Mapping 2 with priority):', processed2.length, 'rows');
        
        setData2(processed2);
        
        // Create merged dataset for Summary2/BS2/PL2:
        // Use Mapped Category 2 when present, otherwise use Mapped Category from original
        const mergedData = processed.map((row, index) => {
          const row2 = processed2[index];
          const mappedCategory2 = row2?.['Mapped Category'];
          
          // If Mapped Category 2 exists and is not 'NOT MAPPED', use it; otherwise use original
          if (mappedCategory2 && mappedCategory2 !== 'NOT MAPPED') {
            return { ...row, 'Mapped Category': mappedCategory2 };
          }
          return row;
        });
        
        const summarized2 = summarizeData(mergedData);
        setSummary2(summarized2);

        if (selectedPeriod === 'current') {
          setCurrentYearData2(summarized2);
        } else {
          setPreviousYearData2(summarized2);
        }

        const mappedCount = processed.filter(r => r['Mapped Category'] !== 'NOT MAPPED').length;
        const unmappedCount = processed.length - mappedCount;
        const mappedCount2 = processed2.filter(r => r['Mapped Category'] !== 'NOT MAPPED').length;
        const unmappedCount2 = processed2.length - mappedCount2;
        
        // Last Mile Mapping: Process TB to Schedule III hierarchy
        try {
          // Load required sheets for Last Mile Mapping
          const map1Sheet = wb.Sheets['Map1'];
          const map2Sheet = wb.Sheets['Map2'];
          const sch3Sheet = wb.Sheets['Sch3'];
          const tbSheet = wb.Sheets['TrialBalance'];

          if (map1Sheet && map2Sheet && sch3Sheet && tbSheet) {
            const map1Data = XLSX.utils.sheet_to_json(map1Sheet);
            const map2Data = XLSX.utils.sheet_to_json(map2Sheet);
            const sch3Data = XLSX.utils.sheet_to_json(sch3Sheet);
            const tbData = XLSX.utils.sheet_to_json(tbSheet);

            console.log('Processing Last Mile Mapping...');
            const lastMileResults = processLastMileMapping(tbData, sch3Data, map1Data, map2Data);
            setLastMileMappingData(lastMileResults);

            const okCount = lastMileResults.filter(r => r.MappingStatus === 'OK').length;
            const partialCount = lastMileResults.filter(r => r.MappingStatus === 'PARTIAL').length;
            const errorCount = lastMileResults.filter(r => r.MappingStatus === 'ERROR').length;

            console.log(`Last Mile Mapping: OK=${okCount}, PARTIAL=${partialCount}, ERROR=${errorCount}`);
            toast.success(
              `Last Mile Mapping: ${okCount} OK (${((okCount/lastMileResults.length)*100).toFixed(1)}%), ` +
              `${partialCount} PARTIAL, ${errorCount} ERROR`,
              { duration: 5000 }
            );
          } else {
            console.warn('Last Mile Mapping skipped: Missing required sheets (Map1, Map2, Sch3, or TrialBalance)');
            setLastMileMappingData([]);
          }
        } catch (lmErr) {
          console.error('Last Mile Mapping error:', lmErr);
          setLastMileMappingData([]);
        }
        
        setActiveTab('results');
        toast.success(
          `${selectedPeriod === 'current' ? 'Current' : 'Previous'} year data uploaded successfully. ` +
          `Mapping 1: ${processed.length} ledgers (${mappedCount} mapped, ${unmappedCount} unmapped). ` +
          `Mapping 2: ${processed2.length} ledgers (${mappedCount2} mapped, ${unmappedCount2} unmapped).`
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('File processing error:', err);
        toast.error(err.message || 'Error processing file');
      }
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const bsStructure = [
    { label: 'EQUITY AND LIABILITIES', h: true },
    { label: "(1) Shareholders' funds", sub: true },
    { label: '(a) Share capital', key: 'Share capital' },
    { label: '(b) Reserves and surplus', key: 'Reserves and surplus' },
    { label: '(c) Money received against share warrants', key: 'Money received against share warrants' },
    { label: "Uncategorised Shareholder's Funds", key: "Uncategorised Shareholder's Funds", un: true },
    { label: '(2) Share application money pending allotment', key: 'Share application money pending allotment' },
    { label: '(3) Non-Current liabilities', sub: true },
    { label: '(a) Long-term borrowings', key: 'Long-term borrowings' },
    { label: '(b) Deferred tax liabilities (Net)', key: 'Deferred tax liabilities (Net)' },
    { label: '(c) Other long term liabilities', key: 'Other long term liabilities' },
    { label: '(d) Long-term provisions', key: 'Long-term provisions' },
    { label: 'Uncategorised Non-Current liabilities', key: 'Uncategorised Non-Current liabilities', un: true },
    { label: '(4) Current liabilities', sub: true },
    { label: '(a) Short-term borrowings', key: 'Short-term borrowings' },
    { label: '(b) Trade payables', key: 'Trade payables' },
    { label: '(A) Micro and Small Enterprises', key: '(A) Micro and Small Enterprises' },
    { label: '(B) Others', key: '(B) Others' },
    { label: '(c) Other current liabilities', key: 'Other current liabilities' },
    { label: '(d) Short-term provisions', key: 'Short-term provisions' },
    { label: 'Uncategorised Current liabilities', key: 'Uncategorised Current liabilities', un: true },
    { label: 'TOTAL', h: true },
    { label: 'ASSETS', h: true },
    { label: '(1) Non-Current Assets', sub: true },
    { label: '(a) Property, Plant & Equipment and Intangible Assets', sub: true },
    { label: '(i) Property, Plant & Equipment', key: '(i) Property, Plant & Equipment' },
    { label: '(ii) Intangible assets', key: '(ii) Intangible assets' },
    { label: '(iii) Capital work-in-Progress', key: '(iii) Capital work-in-Progress' },
    { label: '(iv) Intangible assets under development', key: '(iv) Intangible assets under development' },
    { label: '(b) Non-current investments', key: 'Non-current investments' },
    { label: '(c) Deferred tax assets (Net)', key: 'Deferred tax assets (Net)' },
    { label: '(d) Long-term loans and advances', key: 'Long-term loans and advances' },
    { label: '(e) Other non-current Assets', key: 'Other non-current Assets' },
    { label: 'Uncategorised Non-Current Assets', key: 'Uncategorised Non-Current Assets', un: true },
    { label: '(2) Current assets', sub: true },
    { label: '(a) Current investments', key: 'Current investments' },
    { label: '(b) Inventories', key: 'Inventories' },
    { label: '(c) Trade receivables', key: 'Trade receivables' },
    { label: '(d) Cash and bank balances', key: 'Cash and bank balances' },
    { label: '(e) Short-term loans and advances', key: 'Short-term loans and advances' },
    { label: '(f) Other current assets', key: 'Other current assets' },
    { label: 'Uncategorised Current assets', key: 'Uncategorised Current assets', un: true },
    { label: 'Suspense', key: 'Suspense' },
    { label: 'TOTAL', h: true },
  ];

  const plStructure = [
    { label: 'INCOME', h: true },
    { label: '(1) Revenue from operations', sub: true },
    { label: '(a) Sale of products', key: 'Sale of products' },
    { label: '(b) Sale of services', key: 'Sale of services' },
    { label: '(c) Other operating revenues', key: 'Other operating revenues' },
    { label: 'Uncategorised Revenue from operations', key: 'Uncategorised Revenue from operations', un: true },
    { label: '(2) Other Income', key: 'Other income' },
    { label: 'Uncategorised Other Income', key: 'Uncategorised Other Income', un: true },
    { label: 'Total Revenue', sub: true },
    { label: 'EXPENSES', h: true },
    { label: '(3) Cost of materials consumed', key: 'Cost of materials consumed' },
    { label: '(4) Purchases of Stock-in-Trade', key: 'Purchases of Stock-in-Trade' },
    { label: '(5) Changes in inventories of finished goods, work-in-progress and Stock-in-Trade', key: 'Changes in inventories of finished goods, work-in-progress and Stock-in-Trade' },
    { label: 'Uncategorised Purchase Accounts', key: 'Uncategorised Purchase Accounts', un: true },
    { label: '(6) Employee benefit expense', sub: true },
    { label: '(a) Salaries and wages', key: 'Salaries and wages' },
    { label: '(b) Contribution to provident and other funds', key: 'Contribution to provident and other funds' },
    { label: '(c) Staff welfare expenses', key: 'Staff welfare expenses' },
    { label: 'Uncategorised Employee benefit expense', key: 'Uncategorised Employee benefit expense', un: true },
    { label: '(7) Finance costs', sub: true },
    { label: '(a) Interest expense', key: 'Interest expense' },
    { label: '(b) Other borrowing costs', key: 'Other borrowing costs' },
    { label: 'Uncategorised Finance costs', key: 'Uncategorised Finance costs', un: true },
    { label: '(8) Depreciation and amortization expense', key: 'Depreciation and amortization expense' },
    { label: '(9) Other expenses', sub: true },
    { label: '(a) Power and fuel', key: 'Power and fuel' },
    { label: '(b) Rent', key: 'Rent' },
    { label: '(c) Repairs and maintenance', key: 'Repairs and maintenance' },
    { label: '(d) Insurance', key: 'Insurance' },
    { label: '(e) Rates and taxes', key: 'Rates and taxes' },
    { label: '(f) Legal and professional charges', key: 'Legal and professional charges' },
    { label: '(g) Travelling and conveyance', key: 'Travelling and conveyance' },
    { label: '(h) Communication costs', key: 'Communication costs' },
    { label: '(i) Advertisement and sales promotion', key: 'Advertisement and sales promotion' },
    { label: '(j) Bad debts written off', key: 'Bad debts written off' },
    { label: '(k) Provision for doubtful debts', key: 'Provision for doubtful debts' },
    { label: '(l) Miscellaneous expenses', key: 'Miscellaneous expenses' },
    { label: 'Uncategorised Other Expenses', key: 'Uncategorised Other Expenses', un: true },
    { label: 'Total Expenses', sub: true },
    { label: '(10) Prior period items', key: 'Prior period items' },
    { label: 'Profit/(Loss) before tax', sub: true },
    { label: '(11) Tax expense', sub: true },
    { label: '(a) Current tax', key: 'Current tax' },
    { label: '(b) Deferred tax', key: 'Deferred tax' },
    { label: 'Profit/(Loss) for the period', sub: true },
  ];

  const formatValue = (val: number) => {
    if (!val) return '';
    const scaleFactor = parseFloat(scale);
    return (val / scaleFactor).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Determine placement of category (BS, PL, or BS-PL)
  const getPlacement = (category: string): string => {
    const bsKeys = bsStructure.filter(item => item.key).map(item => item.key);
    const plKeys = plStructure.filter(item => item.key).map(item => item.key);
    
    // Case-insensitive comparison
    const categoryLower = category.toLowerCase().trim();
    const inBS = bsKeys.some(key => key.toLowerCase().trim() === categoryLower);
    const inPL = plKeys.some(key => key.toLowerCase().trim() === categoryLower);
    
    if (inBS && inPL) return 'BS-PL';
    if (inBS) return 'BS';
    if (inPL) return 'PL';
    return '';
  };

  // Mapped and Unmapped counters
  const mappedCount = useMemo(() => {
    return data.filter((row) => row['Mapped Category'] && row['Mapped Category'] !== 'NOT MAPPED').length;
  }, [data]);

  const unmappedCount = useMemo(() => {
    return data.filter((row) => row['Mapped Category'] === 'NOT MAPPED').length;
  }, [data]);

  // Sorting and filtering logic
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters((prev) => {
      const currentFilters = prev[column] || [];
      if (currentFilters.includes(value)) {
        // Remove if already selected
        const newFilters = currentFilters.filter(v => v !== value);
        return newFilters.length > 0 ? { ...prev, [column]: newFilters } : { ...prev, [column]: [] };
      } else {
        // Add to selected
        return { ...prev, [column]: [...currentFilters, value] };
      }
    });
  };

  // Get unique values for each column for dropdown filters
  const getUniqueColumnValues = useMemo(() => {
    const uniqueValues: Record<string, string[]> = {};
    if (data.length > 0) {
      Object.keys(data[0]).forEach((key) => {
        const values = new Set<string>();
        data.forEach((row) => {
          const val = String(row[key] || '').trim();
          if (val) values.add(val);
        });
        uniqueValues[key] = Array.from(values).sort();
      });
    }
    return uniqueValues;
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply column filters (array-based multi-selection)
    Object.entries(columnFilters).forEach(([column, selectedValues]) => {
      if (selectedValues && selectedValues.length > 0) {
        result = result.filter((row) => {
          const cellValue = String(row[column] || '');
          // Match if cell value is in the selected values
          return selectedValues.includes(cellValue);
        });
      }
    });

    // Apply search filter
    if (search) {
      result = result.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, columnFilters, search, sortColumn, sortDirection]);

  // LastMileMapping: Sorting and filtering logic
  const handleSortLastMile = (column: string) => {
    if (sortColumnLastMile === column) {
      setSortDirectionLastMile(sortDirectionLastMile === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumnLastMile(column);
      setSortDirectionLastMile('asc');
    }
  };

  const handleFilterChangeLastMile = (column: string, value: string) => {
    setColumnFiltersLastMile((prev) => {
      const currentFilters = prev[column] || [];
      if (currentFilters.includes(value)) {
        const newFilters = currentFilters.filter(v => v !== value);
        return newFilters.length > 0 ? { ...prev, [column]: newFilters } : { ...prev, [column]: [] };
      } else {
        return { ...prev, [column]: [...currentFilters, value] };
      }
    });
  };

  const getUniqueColumnValuesLastMile = useMemo(() => {
    const uniqueValues: Record<string, string[]> = {};
    if (lastMileMappingData.length > 0) {
      Object.keys(lastMileMappingData[0]).forEach((key) => {
        const values = new Set<string>();
        lastMileMappingData.forEach((row) => {
          const val = String(row[key] || '').trim();
          if (val) values.add(val);
        });
        uniqueValues[key] = Array.from(values).sort();
      });
    }
    return uniqueValues;
  }, [lastMileMappingData]);

  const filteredAndSortedLastMileData = useMemo(() => {
    let result = [...lastMileMappingData];

    // Apply column filters
    Object.entries(columnFiltersLastMile).forEach(([column, selectedValues]) => {
      if (selectedValues && selectedValues.length > 0) {
        result = result.filter((row) => {
          const cellValue = String(row[column] || '');
          return selectedValues.includes(cellValue);
        });
      }
    });

    // Apply search filter
    if (search) {
      result = result.filter((row) => {
        const searchLower = search.toLowerCase();
        return (
          (row.Name || '').toLowerCase().includes(searchLower) ||
          (row['Face Note'] || '').toLowerCase().includes(searchLower) ||
          (row['Face Item'] || '').toLowerCase().includes(searchLower) ||
          (row.SubNote || '').toLowerCase().includes(searchLower) ||
          (row.MappingError || '').toLowerCase().includes(searchLower) ||
          (row.MappingStatus || '').toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    if (sortColumnLastMile) {
      result.sort((a, b) => {
        const aVal = a[sortColumnLastMile];
        const bVal = b[sortColumnLastMile];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirectionLastMile === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return sortDirectionLastMile === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [lastMileMappingData, columnFiltersLastMile, search, sortColumnLastMile, sortDirectionLastMile]);

  // Calculate totals for trial balance
  const trialBalanceTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    if (data.length > 0) {
      Object.keys(data[0]).forEach((key) => {
        // Try to parse as number for any column that might contain numeric values
        const firstVal = data[0][key];
        const testNum = typeof firstVal === 'number' ? firstVal : parseFloat(String(firstVal || '').replace(/,/g, ''));
        
        if (!isNaN(testNum)) {
          totals[key] = data.reduce((sum, row) => {
            const val = typeof row[key] === 'number' ? row[key] : parseFloat(String(row[key] || '').replace(/,/g, ''));
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
        }
      });
    }
    
    return totals;
  }, [data]);

  const getColumnHeader = (isPL: boolean, isCurrent: boolean) => {
    if (isPL) {
      if (isCurrent) {
        const currentYr = parseInt(periodYear);
        return `Figures for the year ended 31st March, ${(currentYr - 1).toString().slice(-2)}-${currentYr.toString().slice(-2)}`;
      } else {
        const currentYr = parseInt(periodYear);
        return `Figures for the year ended 31st March, ${(currentYr - 2).toString().slice(-2)}-${(currentYr - 1).toString().slice(-2)}`;
      }
    } else {
      return isCurrent ? 'Figures as at the end of Current Reporting Period' : 'Figures as at the end of Previous Reporting Period';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderStatement = (structure: any[], isPL = false, currYearData?: Record<string, number>, prevYearData?: Record<string, number>) => {
    // Use provided data sources or default to original data
    const activeCurrentYearData = currYearData || currentYearData;
    const activePreviousYearData = prevYearData || previousYearData;
    // Determine if this is data2 (BS2/PL2) based on whether custom data was provided
    const isData2 = currYearData !== undefined && prevYearData !== undefined;
    const scaleLabels: Record<string, string> = {
      '1': 'Rupees',
      '100': 'Hundreds',
      '1000': 'Thousands',
      '100000': 'Lakhs',
      '10000000': 'Crores',
    };

    let currentLiabilitiesTotal = 0;
    let previousLiabilitiesTotal = 0;
    let currentAssetsTotal = 0;
    let previousAssetsTotal = 0;
    let isInAssetsSection = false;
    let totalCount = 0;

    // Pre-calculate totals for P&L
    let currentRevenueTotal = 0;
    let previousRevenueTotal = 0;
    let currentExpensesTotal = 0;
    let previousExpensesTotal = 0;
    let currentTaxExpense = 0;
    let previousTaxExpense = 0;
    let isInExpensesSection = false;
    let isInTaxSection = false;

    if (isPL) {
      structure.forEach((row) => {
        if (row.label === 'EXPENSES') {
          isInExpensesSection = true;
        }
        if (row.label === '(11) Tax expense') {
          isInTaxSection = true;
        }
        if (row.label === 'Profit/(Loss) for the period') {
          isInTaxSection = false;
        }
        
        if (!row.h && !row.sub && row.key) {
          const currentVal = activeCurrentYearData[deepClean(row.key)] || 0;
          const previousVal = activePreviousYearData[deepClean(row.key)] || 0;
          
          if (isInTaxSection) {
            currentTaxExpense += currentVal;
            previousTaxExpense += previousVal;
          } else if (isInExpensesSection) {
            currentExpensesTotal += currentVal;
            previousExpensesTotal += previousVal;
          } else {
            // Income section
            currentRevenueTotal += currentVal;
            previousRevenueTotal += previousVal;
          }
        }
      });
    }

    // Pre-calculate totals for Balance Sheet
    if (!isPL) {
      // First calculate P&L profit to add to Reserves & Surplus
      let currentPLRevenueTotal = 0;
      let previousPLRevenueTotal = 0;
      let currentPLExpensesTotal = 0;
      let previousPLExpensesTotal = 0;
      let currentPLTaxExpense = 0;
      let previousPLTaxExpense = 0;
      let isInPLExpensesSection = false;
      let isInPLTaxSection = false;
      
      plStructure.forEach((row) => {
        if (row.label === 'EXPENSES') {
          isInPLExpensesSection = true;
        }
        if (row.label === '(11) Tax expense') {
          isInPLTaxSection = true;
        }
        if (row.label === 'Profit/(Loss) for the period') {
          isInPLTaxSection = false;
        }
        
        if (!row.h && !row.sub && row.key) {
          const currentVal = activeCurrentYearData[deepClean(row.key)] || 0;
          const previousVal = activePreviousYearData[deepClean(row.key)] || 0;
          
          if (isInPLTaxSection) {
            currentPLTaxExpense += currentVal;
            previousPLTaxExpense += previousVal;
          } else if (isInPLExpensesSection) {
            currentPLExpensesTotal += currentVal;
            previousPLExpensesTotal += previousVal;
          } else {
            currentPLRevenueTotal += currentVal;
            previousPLRevenueTotal += previousVal;
          }
        }
      });
      
      const currentProfit = currentPLRevenueTotal - currentPLExpensesTotal - currentPLTaxExpense;
      const previousProfit = previousPLRevenueTotal - previousPLExpensesTotal - previousPLTaxExpense;
      
      structure.forEach((row) => {
        if (row.label === 'ASSETS') {
          isInAssetsSection = true;
        }
        
        if (row.label === 'TOTAL') {
          totalCount++;
        }
        
        if (!row.h && !row.sub && row.key) {
          let currentVal = activeCurrentYearData[deepClean(row.key)] || 0;
          let previousVal = activePreviousYearData[deepClean(row.key)] || 0;
          
          // Add profit to Reserves & Surplus
          if (deepClean(row.key) === deepClean('Reserves and surplus') || deepClean(row.key) === deepClean('Uncategorised Reserves and Surplus')) {
            currentVal += currentProfit;
            previousVal += previousProfit;
          }
          
          if (isInAssetsSection) {
            currentAssetsTotal += currentVal;
            previousAssetsTotal += previousVal;
          } else if (totalCount === 0) {
            currentLiabilitiesTotal += currentVal;
            previousLiabilitiesTotal += previousVal;
          }
        }
      });
    }

    const currentDifference = Math.abs(currentAssetsTotal - currentLiabilitiesTotal);
    const previousDifference = Math.abs(previousAssetsTotal - previousLiabilitiesTotal);
    const hasDifference = !isPL && (currentDifference > 0.01 || previousDifference > 0.01);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center relative">
            <Button 
              onClick={() => {
                if (isData2) {
                  handleExportToExcel(isPL ? 'pl2' : 'bs2');
                } else {
                  handleExportToExcel(isPL ? 'pl' : 'bs');
                }
              }} 
              variant="outline" 
              size="sm"
              className="absolute top-4 right-4 gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            <CardTitle className="text-2xl">{companyName}</CardTitle>
            <p className="text-sm text-muted-foreground">CIN: {cin}</p>
            <CardTitle className="text-xl mt-2">{isPL ? 'Statement of Profit & Loss' : 'Balance Sheet as at 31 March ' + periodYear}</CardTitle>
            <p className="text-sm font-medium">(Amount in ₹ {scaleLabels[scale]})</p>
            {hasDifference && (
              <p className="text-red-600 font-bold mt-2">
                ⚠️ Balance Sheet does not match! Difference: Current Year: {formatValue(currentDifference)}, Previous Year: {formatValue(previousDifference)}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-slate-800">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-3 py-3 border border-slate-800">Particulars</th>
                    <th className="px-3 py-3 border border-slate-800 w-24">Note No.</th>
                    <th className="px-3 py-3 border border-slate-800 w-40">{getColumnHeader(isPL, true)}</th>
                    <th className="px-3 py-3 border border-slate-800 w-40">{getColumnHeader(isPL, false)}</th>
                  </tr>
                </thead>
                <tbody>
                  {structure.map((row, i) => {
                    let currentVal = activeCurrentYearData[deepClean(row.key)] || 0;
                    let previousVal = activePreviousYearData[deepClean(row.key)] || 0;
                    
                    // Add profit to Reserves & Surplus for Balance Sheet
                    if (!isPL && (deepClean(row.key) === deepClean('Reserves and surplus') || deepClean(row.key) === deepClean('Uncategorised Reserves and Surplus'))) {
                      // Calculate profit from P&L
                      let currentPLRevenueTotal = 0;
                      let previousPLRevenueTotal = 0;
                      let currentPLExpensesTotal = 0;
                      let previousPLExpensesTotal = 0;
                      let currentPLTaxExpense = 0;
                      let previousPLTaxExpense = 0;
                      let isInPLExpensesSection = false;
                      let isInPLTaxSection = false;
                      
                      plStructure.forEach((plRow) => {
                        if (plRow.label === 'EXPENSES') {
                          isInPLExpensesSection = true;
                        }
                        if (plRow.label === '(11) Tax expense') {
                          isInPLTaxSection = true;
                        }
                        if (plRow.label === 'Profit/(Loss) for the period') {
                          isInPLTaxSection = false;
                        }
                        
                        if (!plRow.h && !plRow.sub && plRow.key) {
                          const cVal = activeCurrentYearData[deepClean(plRow.key)] || 0;
                          const pVal = activePreviousYearData[deepClean(plRow.key)] || 0;
                          
                          if (isInPLTaxSection) {
                            currentPLTaxExpense += cVal;
                            previousPLTaxExpense += pVal;
                          } else if (isInPLExpensesSection) {
                            currentPLExpensesTotal += cVal;
                            previousPLExpensesTotal += pVal;
                          } else {
                            currentPLRevenueTotal += cVal;
                            previousPLRevenueTotal += pVal;
                          }
                        }
                      });
                      
                      const currentProfit = currentPLRevenueTotal - currentPLExpensesTotal - currentPLTaxExpense;
                      const previousProfit = previousPLRevenueTotal - previousPLExpensesTotal - previousPLTaxExpense;
                      
                      currentVal += currentProfit;
                      previousVal += previousProfit;
                    }
                    
                    const isAlert = row.un && (Math.abs(currentVal) > 0 || Math.abs(previousVal) > 0);

                    let indent = '45px';
                    if (row.h) indent = '10px';
                    else if (row.sub && row.label.match(/^\([a-z]\)/)) indent = '50px';
                    else if (row.sub) indent = '25px';
                    else if (row.label.match(/^\([A-Z]\)/)) indent = '85px';
                    else if (row.label.match(/^\(i+v?\)/)) indent = '75px';

                    const showTotal = row.label === 'TOTAL';
                    let displayCurrentTotal = 0;
                    let displayPreviousTotal = 0;
                    let isAssetTotal = false;
                    
                    // Handle P&L totals
                    let showPLTotal = false;
                    if (isPL) {
                      if (row.label === 'Total Revenue') {
                        showPLTotal = true;
                        displayCurrentTotal = currentRevenueTotal;
                        displayPreviousTotal = previousRevenueTotal;
                      } else if (row.label === 'Total Expenses') {
                        showPLTotal = true;
                        displayCurrentTotal = currentExpensesTotal;
                        displayPreviousTotal = previousExpensesTotal;
                      } else if (row.label === 'Profit/(Loss) before tax') {
                        showPLTotal = true;
                        displayCurrentTotal = currentRevenueTotal - currentExpensesTotal;
                        displayPreviousTotal = previousRevenueTotal - previousExpensesTotal;
                      } else if (row.label === 'Profit/(Loss) for the period') {
                        showPLTotal = true;
                        const currentPBT = currentRevenueTotal - currentExpensesTotal;
                        const previousPBT = previousRevenueTotal - previousExpensesTotal;
                        displayCurrentTotal = currentPBT - currentTaxExpense;
                        displayPreviousTotal = previousPBT - previousTaxExpense;
                      }
                    }

                    if (showTotal && !isPL) {
                      // Check if this is Assets total (second TOTAL) or Liabilities total (first TOTAL)
                      const totalIndex = structure.indexOf(row);
                      const assetsIndex = structure.findIndex(r => r.label === 'ASSETS');
                      isAssetTotal = totalIndex > assetsIndex;
                      
                      if (isAssetTotal) {
                        displayCurrentTotal = currentAssetsTotal;
                        displayPreviousTotal = previousAssetsTotal;
                      } else {
                        displayCurrentTotal = currentLiabilitiesTotal;
                        displayPreviousTotal = previousLiabilitiesTotal;
                      }
                    }

                    return (
                      <tr
                        key={i}
                        className={`
                          ${row.h ? 'bg-slate-100 font-bold text-lg' : ''}
                          ${row.sub ? 'font-semibold bg-slate-50' : ''}
                          ${showTotal ? 'bg-blue-50 font-bold text-lg' : ''}
                          ${showPLTotal ? 'bg-blue-50 font-bold text-lg' : ''}
                        `}
                      >
                        <td style={{ paddingLeft: indent }} className={`px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
                          {row.label}
                        </td>
                        <td className={`text-center px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
                          {!row.h && !row.sub && !row.un && !showPLTotal && row.key ? (
                            (() => {
                              const prefix = isPL ? (isData2 ? 'pl2_' : 'pl_') : (isData2 ? 'bs2_' : 'bs_');
                              return noteNumbers[`${prefix}${row.key}`] || '';
                            })()
                          ) : ''}
                        </td>
                        <td className={`text-right px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
                          {showTotal || showPLTotal ? formatValue(displayCurrentTotal) : !row.h && !row.sub ? formatValue(currentVal) : ''}
                        </td>
                        <td className={`text-right px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
                          {showTotal || showPLTotal ? formatValue(displayPreviousTotal) : !row.h && !row.sub ? formatValue(previousVal) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SRM Pro</h1>
        </div>
      </div>

      {(activeTab === 'balance-sheet' || activeTab === 'profit-loss' || activeTab === 'balance-sheet-2' || activeTab === 'profit-loss-2') && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label htmlFor="cin">CIN</Label>
                <Input
                  id="cin"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  placeholder="UXXXXXMH2023PTCXXX588"
                />
              </div>
              <div>
                <Label htmlFor="scale">Display Scale</Label>
                <Select value={scale} onValueChange={setScale}>
                  <SelectTrigger id="scale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Rupees</SelectItem>
                    <SelectItem value="100">Hundreds</SelectItem>
                    <SelectItem value="1000">Thousands</SelectItem>
                    <SelectItem value="100000">Lakhs</SelectItem>
                    <SelectItem value="10000000">Crores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-10 bg-white border-b-2 border-gray-200 shadow-sm">
          <TabsTrigger 
            value="upload" 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 transition-all duration-200"
          >
            <FileUp className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger 
            value="results" 
            disabled={!data.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Search className="h-4 w-4" />
            Mapped TB
          </TabsTrigger>
          <TabsTrigger 
            value="summary" 
            disabled={!data.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger 
            value="balance-sheet" 
            disabled={!data.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <FileText className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger 
            value="profit-loss" 
            disabled={!data.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <TrendingUp className="h-4 w-4" />
            P & L Account
          </TabsTrigger>
          <TabsTrigger 
            value="results-2" 
            disabled={!data2.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Search className="h-4 w-4" />
            Mapped TB2
          </TabsTrigger>
          <TabsTrigger 
            value="summary-2" 
            disabled={!data2.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <FileText className="h-4 w-4" />
            Summary2
          </TabsTrigger>
          <TabsTrigger 
            value="balance-sheet-2" 
            disabled={!data2.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <FileText className="h-4 w-4" />
            BS2
          </TabsTrigger>
          <TabsTrigger 
            value="profit-loss-2" 
            disabled={!data2.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <TrendingUp className="h-4 w-4" />
            PL2
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            disabled={!data.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger 
            value="last-mile-mapping" 
            disabled={!lastMileMappingData.length} 
            className="flex items-center gap-2 text-gray-700 font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            <CheckCircle className="h-4 w-4" />
            LastMileMapping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {/* Horizontal Upload Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upload Tally Excel</CardTitle>
              <CardDescription className="text-xs">Required sheets: Mapping | Trial Balance | Hierarchy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                {/* Period Type */}
                <div className="space-y-1">
                  <Label htmlFor="period-type" className="text-sm">Period Type</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger id="period-type" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Year</SelectItem>
                      <SelectItem value="previous">Previous Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Financial Year */}
                <div className="space-y-1">
                  <Label htmlFor="financial-year" className="text-sm">Financial Year</Label>
                  <Input
                    id="financial-year"
                    type="text"
                    placeholder="2024"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Assessee Type */}
                <div className="space-y-1">
                  <Label htmlFor="assessee-type" className="text-sm">
                    Assessee Type
                    {mappingLoaded && <span className="ml-2 text-xs text-green-600">✓</span>}
                  </Label>
                  <Select value={assesseeType} onValueChange={(value: '3' | '4' | '5') => setAssesseeType(value)}>
                    <SelectTrigger id="assessee-type" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Corporate</SelectItem>
                      <SelectItem value="4">Non-Corporate</SelectItem>
                      <SelectItem value="5">LLP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload */}
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="file-upload" className="text-sm">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setConfigDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="h-9"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Config
                  </Button>

                  {data.length > 0 && (
                    <Button
                      onClick={handleClearData}
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                      className="h-9"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-4 mt-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-xs text-muted-foreground">Processing...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trial Balance Preview - Full Width */}
          {data.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Trial Balance Preview</CardTitle>
                    <CardDescription>Click on column headers to sort</CardDescription>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">{mappedCount} Mapped</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-semibold">{unmappedCount} Unmapped</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search all columns..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="max-w-sm"
                    />
                    
                    {/* Totals Summary - Opening Balance, Debit, Credit, Closing Balance */}
                    {data.length > 0 && (
                      <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border justify-center flex-wrap">
                        {Object.keys(data[0]).map((key) => {
                          const keyLower = key.toLowerCase();
                          const isTargetColumn = keyLower.includes('opening') || 
                                               keyLower.includes('debit') || 
                                               keyLower.includes('credit') || 
                                               keyLower.includes('closing');
                          if (isTargetColumn && trialBalanceTotals[key] !== undefined) {
                            return (
                              <div key={key} className="text-center px-3">
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">{key === 'TrailBalance' ? 'AILE' : key}</p>
                                <p className="text-sm font-bold text-slate-800">
                                  {trialBalanceTotals[key].toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                    
                    <div className="overflow-x-auto border rounded-lg max-h-[600px]">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white sticky top-0 z-10">
                          <tr>
                            {data[0] && Object.keys(data[0]).filter(key => {
                              const excludeColumns = ['IsRevenue', 'IsDeemedPositive', 'Ledger', 'Ledger Parent', 'Group', 'AmountValue', '2nd Parent After Primary', 'Logic Trace'];
                              return !key.toLowerCase().includes('amount') && !excludeColumns.includes(key);
                            }).map((key) => (
                              <th key={key} className="px-3 py-3 text-left font-semibold whitespace-nowrap border-r border-slate-600 last:border-r-0 relative">
                                <div className="relative">
                                  <button
                                    onClick={() => setOpenFilterColumn(openFilterColumn === key ? null : key)}
                                    className="flex items-center gap-2 hover:text-blue-300 transition-colors w-full"
                                    aria-label={`Filter and sort by ${key}`}
                                  >
                                    <span className="font-semibold">{key === 'TrailBalance' ? 'AILE' : key}</span>
                                    <div className="flex items-center gap-1 ml-auto">
                                      {columnFilters[key]?.length > 0 && (
                                        <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                          {columnFilters[key].length}
                                        </span>
                                      )}
                                      <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
                                    </div>
                                  </button>
                                  
                                  {openFilterColumn === key && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-20" 
                                        onClick={() => setOpenFilterColumn(null)}
                                      />
                                      <div className="absolute left-0 top-full mt-2 w-72 bg-white border-2 border-slate-300 rounded-lg shadow-2xl z-30" onClick={(e) => e.stopPropagation()}>
                                        {/* Sort Options */}
                                        <div className="border-b border-slate-200 p-2 bg-slate-50">
                                          <div className="text-xs font-semibold text-slate-700 mb-2">SORT</div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => {
                                                handleSort(key);
                                                if (sortDirection === 'desc') setOpenFilterColumn(null);
                                              }}
                                              className={`flex-1 px-3 py-2 text-xs rounded ${sortColumn === key && sortDirection === 'asc' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                                            >
                                              ↑ A → Z
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (sortColumn !== key || sortDirection === 'asc') {
                                                  handleSort(key);
                                                  if (sortColumn === key) handleSort(key);
                                                }
                                                setOpenFilterColumn(null);
                                              }}
                                              className={`flex-1 px-3 py-2 text-xs rounded ${sortColumn === key && sortDirection === 'desc' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                                            >
                                              ↓ Z → A
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {/* Filter Options */}
                                        <div className="p-2">
                                          <div className="text-xs font-semibold text-slate-700 mb-2">FILTER</div>
                                          <Input
                                            placeholder="Search values..."
                                            value={filterSearches[key] || ''}
                                            onChange={(e) => setFilterSearches(prev => ({ ...prev, [key]: e.target.value }))}
                                            className="h-8 text-xs mb-2"
                                            autoFocus
                                          />
                                          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded">
                                            {getUniqueColumnValues[key]
                                              ?.filter(value => !filterSearches[key] || value.toLowerCase().includes(filterSearches[key].toLowerCase()))
                                              .slice(0, 200)
                                              .map((value) => (
                                              <label key={value} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-slate-900 border-b border-slate-100 last:border-b-0">
                                                <input
                                                  type="checkbox"
                                                  checked={columnFilters[key]?.includes(value) || false}
                                                  onChange={() => handleFilterChange(key, value)}
                                                  className="rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs flex-1 truncate">{value}</span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="border-t border-slate-200 p-2 flex gap-2 bg-slate-50">
                                          {columnFilters[key]?.length > 0 && (
                                            <button
                                              onClick={() => {
                                                setColumnFilters(prev => ({ ...prev, [key]: [] }));
                                                setOpenFilterColumn(null);
                                              }}
                                              className="flex-1 px-3 py-2 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
                                            >
                                              Clear
                                            </button>
                                          )}
                                          <button
                                            onClick={() => {
                                              const allValues = getUniqueColumnValues[key]?.filter(value => 
                                                !filterSearches[key] || value.toLowerCase().includes(filterSearches[key].toLowerCase())
                                              ) || [];
                                              setColumnFilters(prev => ({ ...prev, [key]: allValues }));
                                            }}
                                            className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50"
                                          >
                                            Select All
                                          </button>
                                          <button
                                            onClick={() => setOpenFilterColumn(null)}
                                            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                                          >
                                            Apply
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedData.map((row, i) => (
                            <tr key={i} className={`border-b border-slate-200 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              {Object.entries(row).filter(([key]) => {
                                const excludeColumns = ['IsRevenue', 'IsDeemedPositive', 'Ledger', 'Ledger Parent', 'Group', 'AmountValue', '2nd Parent After Primary', 'Logic Trace'];
                                return !key.toLowerCase().includes('amount') && !excludeColumns.includes(key);
                              }).map(([key, val]: [string, any], j) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                                <td key={j} className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                                  {typeof val === 'number' ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mapped Trial Balance</CardTitle>
                  <CardDescription>Processed ledger data with category mappings</CardDescription>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">{mappedCount} Mapped</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">{unmappedCount} Unmapped</span>
                  </div>
                  <Button 
                    onClick={() => handleExportToExcel('tb')} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                  <Dialog open={stockDetailsOpen} onOpenChange={setStockDetailsOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Stock Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Stock Details</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-x-auto">
                        <table className="w-full border-2 border-slate-800">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="text-left px-4 py-3 border border-slate-800 font-semibold">Category</th>
                              <th className="text-left px-4 py-3 border border-slate-800 font-semibold bg-amber-100">Opening Inventories</th>
                              <th className="text-left px-4 py-3 border border-slate-800 font-semibold bg-blue-100">Closing Inventories</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-3 border border-slate-800 font-medium">Raw Material</td>
                              <td className="px-2 py-2 border border-slate-800 bg-amber-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.rawMaterialOpening}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, rawMaterialOpening: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-2 py-2 border border-slate-800 bg-blue-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.rawMaterialClosing}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, rawMaterialClosing: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 border border-slate-800 font-medium">Finished Goods</td>
                              <td className="px-2 py-2 border border-slate-800 bg-amber-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.finishedGoodsOpening}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, finishedGoodsOpening: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-2 py-2 border border-slate-800 bg-blue-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.finishedGoodsClosing}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, finishedGoodsClosing: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 border border-slate-800 font-medium">Work-in-progress</td>
                              <td className="px-2 py-2 border border-slate-800 bg-amber-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.wipOpening}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, wipOpening: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-2 py-2 border border-slate-800 bg-blue-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.wipClosing}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, wipClosing: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 border border-slate-800 font-medium">Stock-in-trade</td>
                              <td className="px-2 py-2 border border-slate-800 bg-amber-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.stockInTradeOpening}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, stockInTradeOpening: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-2 py-2 border border-slate-800 bg-blue-50">
                                <Input
                                  type="number"
                                  step="any"
                                  value={stockDetails.stockInTradeClosing}
                                  onChange={(e) => setStockDetails(prev => ({ ...prev, stockInTradeClosing: e.target.value }))}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                              <td className="px-4 py-3 border border-slate-800">Total</td>
                              <td className="px-4 py-3 border border-slate-800 bg-amber-50 text-right">
                                {(
                                  parseFloat(stockDetails.rawMaterialOpening || '0') +
                                  parseFloat(stockDetails.finishedGoodsOpening || '0') +
                                  parseFloat(stockDetails.wipOpening || '0') +
                                  parseFloat(stockDetails.stockInTradeOpening || '0')
                                ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 border border-slate-800 bg-blue-50 text-right">
                                {(
                                  parseFloat(stockDetails.rawMaterialClosing || '0') +
                                  parseFloat(stockDetails.finishedGoodsClosing || '0') +
                                  parseFloat(stockDetails.wipClosing || '0') +
                                  parseFloat(stockDetails.stockInTradeClosing || '0')
                                ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setStockDetailsOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveStockDetails}>
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search ledgers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {/* Totals Summary - Opening Balance, Debit, Credit, Closing Balance */}
                {data.length > 0 && (
                  <div className="flex gap-6 p-4 bg-slate-50 rounded-lg border justify-center">
                    {Object.keys(data[0]).map((key) => {
                      const keyLower = key.toLowerCase();
                      const isTargetColumn = keyLower.includes('opening') || 
                                           keyLower.includes('debit') || 
                                           keyLower.includes('credit') || 
                                           keyLower.includes('closing');
                      // Check if column has numeric total
                      if (isTargetColumn && trialBalanceTotals[key] !== undefined) {
                        return (
                          <div key={key} className="text-center px-4">
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">{key === 'TrailBalance' ? 'AILE' : key}</p>
                            <p className="text-base font-bold text-slate-800">
                              {trialBalanceTotals[key].toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedRows.size > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg flex items-center gap-4 border border-blue-200 mb-4">
                    <span className="text-sm font-medium text-blue-900">{selectedRows.size} row(s) selected</span>
                    <Button size="sm" variant="outline" onClick={handleBulkAddNote} className="bg-white">
                      Add Note to Selected
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.onchange = (e) => handleBulkUploadEvidence((e.target as HTMLInputElement).files);
                      input.click();
                    }} className="bg-white">
                      Upload Evidence to Selected
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      Delete Selected
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRows(new Set())}>
                      Clear Selection
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        {data[0] && Object.keys(data[0]).filter(key => {
                          const excludeColumns = ['IsRevenue', 'IsDeemedPositive', 'Ledger', 'Ledger Parent', 'Group', 'AmountValue', '2nd Parent After Primary', 'Logic Trace'];
                          return !key.toLowerCase().includes('amount') && !excludeColumns.includes(key);
                        }).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            <div className="space-y-1">
                              <button
                                onClick={() => handleSort(key)}
                                className="flex items-center gap-1 hover:text-blue-300 w-full"
                                aria-label={`Sort by ${key}`}
                              >
                                {key === 'TrailBalance' ? 'AILE' : key}
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                              <div className="relative">
                                <details className="group">
                                  <summary className="h-7 text-xs bg-blue-600 text-white border border-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-700 list-none flex items-center justify-between">
                                    <span className="truncate">
                                      {columnFilters[key]?.length > 0 ? `${columnFilters[key].length} selected` : 'Filter...'}
                                    </span>
                                    <span className="ml-1">▾</span>
                                  </summary>
                                  <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-300 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
                                    {/* Sort Options */}
                                    <div className="border-b bg-slate-50">
                                      <button
                                        onClick={() => {
                                          setSortColumn(key);
                                          setSortDirection('asc');
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2"
                                      >
                                        <span className="text-green-600">↑</span>
                                        <span>{getUniqueColumnValues[key]?.some(v => !isNaN(parseFloat(v))) ? 'Sort Smallest to Largest' : 'Sort A to Z'}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSortColumn(key);
                                          setSortDirection('desc');
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2 border-t"
                                      >
                                        <span className="text-red-600">↓</span>
                                        <span>{getUniqueColumnValues[key]?.some(v => !isNaN(parseFloat(v))) ? 'Sort Largest to Smallest' : 'Sort Z to A'}</span>
                                      </button>
                                    </div>
                                    <div className="sticky top-0 bg-white border-b p-2">
                                      <Input
                                        placeholder="Search..."
                                        value={filterSearches[key] || ''}
                                        onChange={(e) => setFilterSearches(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="h-7 text-xs"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                      {getUniqueColumnValues[key]
                                        ?.filter(value => !filterSearches[key] || value.toLowerCase().includes(filterSearches[key].toLowerCase()))
                                        .slice(0, 200)
                                        .map((value) => (
                                        <label key={value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-900">
                                          <input
                                            type="checkbox"
                                            checked={columnFilters[key]?.includes(value) || false}
                                            onChange={() => handleFilterChange(key, value)}
                                            className="rounded border-slate-300"
                                          />
                                          <span className="text-xs truncate">{value}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <div className="sticky bottom-0 bg-white border-t flex">
                                      {columnFilters[key]?.length > 0 && (
                                        <button
                                          onClick={() => setColumnFilters(prev => ({ ...prev, [key]: [] }))}
                                          className="flex-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                        >
                                          Clear All
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          const allValues = getUniqueColumnValues[key]?.filter(value => 
                                            !filterSearches[key] || value.toLowerCase().includes(filterSearches[key].toLowerCase())
                                          ) || [];
                                          setColumnFilters(prev => ({ ...prev, [key]: allValues }));
                                        }}
                                        className="flex-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border-l"
                                      >
                                        Select All
                                      </button>
                                    </div>
                                  </div>
                                </details>
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Notes</th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Evidence</th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData
                        .slice((currentPageMapped - 1) * pageSizeMapped, currentPageMapped * pageSizeMapped)
                        .map((row, i) => {
                          const originalIndex = data.findIndex(dataRow => dataRow === row);
                          return (
                            <tr
                              key={i}
                              className={`border-b hover:bg-slate-50 ${selectedRows.has(originalIndex) ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(originalIndex)}
                                  onChange={() => handleSelectRow(originalIndex)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                            {data[0] && Object.keys(data[0]).filter(key => {
                              const excludeColumns = ['IsRevenue', 'IsDeemedPositive', 'Ledger', 'Ledger Parent', 'Group', 'AmountValue', '2nd Parent After Primary', 'Logic Trace'];
                              return !key.toLowerCase().includes('amount') && !excludeColumns.includes(key);
                            }).map((key, j) => {
                              const val = row[key];
                              return (
                                <td key={j} className="px-3 py-2 whitespace-nowrap">
                                  {typeof val === 'number' ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (val || '')}
                                </td>
                              );
                            })}
                              <td className="px-3 py-2">
                                <Input
                                  type="text"
                                  placeholder="Add note..."
                                  value={rowNotes[originalIndex] || ''}
                                  onChange={(e) => handleAddNote(originalIndex, e.target.value)}
                                  className="min-w-[150px] h-8 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => handleUploadEvidence(originalIndex, e.target.files)}
                                    className="hidden"
                                    id={`evidence-${originalIndex}`}
                                  />
                                  <label htmlFor={`evidence-${originalIndex}`}>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 h-8 text-xs cursor-pointer"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(`evidence-${originalIndex}`)?.click();
                                      }}
                                    >
                                      <Upload className="h-3 w-3" />
                                      Upload
                                    </Button>
                                  </label>
                                  {rowEvidence[originalIndex] && rowEvidence[originalIndex].length > 0 && (
                                    <span className="text-xs text-green-600">
                                      {rowEvidence[originalIndex].length} file(s)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex gap-1 flex-nowrap">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 h-8 text-xs px-2"
                                    onClick={() => handleEditRow(originalIndex)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-1 h-8 text-xs px-2"
                                    onClick={() => {
                                      setRowToDelete(originalIndex);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </Button>
                                </div>
                              </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls for Mapped TB */}
                <div className="flex items-center justify-between mt-4 px-4 py-3 border-t bg-slate-50 rounded-b-lg">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredAndSortedData.length === 0 ? 0 : ((currentPageMapped - 1) * pageSizeMapped) + 1} to {Math.min(currentPageMapped * pageSizeMapped, filteredAndSortedData.length)} of {filteredAndSortedData.length} rows
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={pageSizeMapped}
                      onChange={(e) => {
                        setPageSizeMapped(Number(e.target.value));
                        setCurrentPageMapped(1);
                      }}
                      className="h-8 px-2 border border-slate-300 rounded text-sm"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                      <option value={filteredAndSortedData.length}>All</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageMapped(currentPageMapped - 1)}
                        disabled={currentPageMapped === 1}
                        className="h-8 px-3"
                      >
                        Previous
                      </Button>
                      <span className="text-sm font-medium">
                        Page {currentPageMapped} of {Math.ceil(filteredAndSortedData.length / pageSizeMapped)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageMapped(currentPageMapped + 1)}
                        disabled={currentPageMapped >= Math.ceil(filteredAndSortedData.length / pageSizeMapped)}
                        className="h-8 px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Year Data</CardTitle>
                <CardDescription>Mapped category summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Category</th>
                        <th className="px-3 py-2 text-center font-medium">Placement</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(currentYearData).length > 0 ? (
                        Object.entries(currentYearData)
                          .sort()
                          .map(([key, val]) => (
                            <tr key={key} className="border-b hover:bg-slate-50">
                              <td className="px-3 py-2">{key}</td>
                              <td className="px-3 py-2 text-center font-medium">{getPlacement(key)}</td>
                              <td className="px-3 py-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-muted-foreground">
                            No current year data uploaded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Previous Year Data</CardTitle>
                <CardDescription>Mapped category summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Category</th>
                        <th className="px-3 py-2 text-center font-medium">Placement</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(previousYearData).length > 0 ? (
                        Object.entries(previousYearData)
                          .sort()
                          .map(([key, val]) => (
                            <tr key={key} className="border-b hover:bg-slate-50">
                              <td className="px-3 py-2">{key}</td>
                              <td className="px-3 py-2 text-center font-medium">{getPlacement(key)}</td>
                              <td className="px-3 py-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-muted-foreground">
                            No previous year data uploaded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {Object.keys(currentYearData).length === 0 && Object.keys(previousYearData).length === 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <p className="text-center text-red-700 font-medium">
                  No data available. Please upload Trial Balance files for Current Year and/or Previous Year.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balance-sheet">{renderStatement(bsStructure, false)}</TabsContent>
        <TabsContent value="profit-loss">{renderStatement(plStructure, true)}</TabsContent>

        {/* Mapped TB2 Tab - Comparison of Both Mappings */}
        <TabsContent value="results-2" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mapped Trial Balance 2 (Mapping Comparison)</CardTitle>
                  <CardDescription>Compare original mapping vs priority-based mapping side-by-side</CardDescription>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-semibold text-sm">Category 1: {mappedCount} Mapped</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="font-semibold text-sm">Category 1: {unmappedCount} Unmapped</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-semibold text-sm">Category 2: {data2.filter(r => r['Mapped Category'] !== 'NOT MAPPED').length} Mapped</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="font-semibold text-sm">Category 2: {data2.filter(r => r['Mapped Category'] === 'NOT MAPPED').length} Unmapped</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleExportToExcel('tb2')} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search ledgers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {/* Totals Summary - Opening Balance, Debit, Credit, Closing Balance */}
                {data.length > 0 && (
                  <div className="flex gap-6 p-4 bg-slate-50 rounded-lg border justify-center">
                    {Object.keys(data[0]).map((key) => {
                      const keyLower = key.toLowerCase();
                      const isTargetColumn = keyLower.includes('opening') || 
                                           keyLower.includes('debit') || 
                                           keyLower.includes('credit') || 
                                           keyLower.includes('closing');
                      // Check if column has numeric total
                      if (isTargetColumn && trialBalanceTotals[key] !== undefined) {
                        return (
                          <div key={key} className="text-center px-4">
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">{key === 'TrailBalance' ? 'AILE' : key}</p>
                            <p className="text-base font-bold text-slate-800">
                              {trialBalanceTotals[key].toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedRows.size > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg flex items-center gap-4 border border-blue-200 mb-4">
                    <span className="text-sm font-medium text-blue-900">{selectedRows.size} row(s) selected</span>
                    <Button size="sm" variant="outline" onClick={handleBulkAddNote} className="bg-white">
                      Add Note to Selected
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.onchange = (e) => handleBulkUploadEvidence((e.target as HTMLInputElement).files);
                      input.click();
                    }} className="bg-white">
                      Upload Evidence to Selected
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      Delete Selected
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRows(new Set())}>
                      Clear Selection
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        {data[0] && Object.keys(data[0]).filter(key => {
                          const excludeColumns = ['IsRevenue', 'IsDeemedPositive', 'Ledger', 'Ledger Parent', 'Group', 'AmountValue', '2nd Parent After Primary', 'Logic Trace'];
                          return !key.toLowerCase().includes('amount') && !excludeColumns.includes(key);
                        }).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            <div className="space-y-1">
                              <button
                                onClick={() => handleSort(key)}
                                className="flex items-center gap-1 hover:text-blue-300 w-full"
                                aria-label={`Sort by ${key}`}
                              >
                                {key === 'TrailBalance' ? 'AILE' : key}
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                              <div className="relative">
                                <details className="group">
                                  <summary className="h-7 text-xs bg-blue-600 text-white border border-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-700 list-none flex items-center justify-between">
                                    <span className="truncate">
                                      {columnFilters[key]?.length > 0 ? `${columnFilters[key].length} selected` : 'Filter...'}
                                    </span>
                                    <span className="ml-1">▾</span>
                                  </summary>
                                  <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-300 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
                                    {/* Sort Options */}
                                    <div className="border-b bg-slate-50">
                                      <button
                                        onClick={() => {
                                          setSortColumn(key);
                                          setSortDirection('asc');
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2"
                                      >
                                        <span className="text-green-600">↑</span>
                                        <span>{getUniqueColumnValues[key]?.some(v => !isNaN(parseFloat(v))) ? 'Sort Smallest to Largest' : 'Sort A to Z'}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSortColumn(key);
                                          setSortDirection('desc');
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2 border-t"
                                      >
                                        <span className="text-red-600">↓</span>
                                        <span>{getUniqueColumnValues[key]?.some(v => !isNaN(parseFloat(v))) ? 'Sort Largest to Smallest' : 'Sort Z to A'}</span>
                                      </button>
                                    </div>
                                    <div className="sticky top-0 bg-white border-b p-2">
                                      <Input
                                        placeholder="Search..."
                                        value={filterSearches[key] || ''}
                                        onChange={(e) => setFilterSearches(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="h-7 text-xs"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                      {getUniqueColumnValues[key]
                                        ?.filter(value => !filterSearches[key] || value.toLowerCase().includes(filterSearches[key].toLowerCase()))
                                        .slice(0, 200)
                                        .map((value) => (
                                        <label key={value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-900">
                                          <input
                                            type="checkbox"
                                            checked={columnFilters[key]?.includes(value) || false}
                                            onChange={() => handleFilterChange(key, value)}
                                            className="rounded border-slate-300"
                                          />
                                          <span className="text-xs truncate">{value}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <div className="sticky bottom-0 bg-white border-t flex">
                                      {columnFilters[key]?.length > 0 && (
                                        <button
                                          onClick={() => setColumnFilters(prev => ({ ...prev, [key]: [] }))}
                                          className="flex-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                        >
                                          Clear All
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          const allValues = getUniqueColumnValues[key]?.filter(value => 
                                            !filterSearches[key] || value.toLowerCase().includes(filterSearches[key].toLowerCase())
                                          ) || [];
                                          setColumnFilters(prev => ({ ...prev, [key]: allValues }));
                                        }}
                                        className="flex-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border-l"
                                      >
                                        Select All
                                      </button>
                                    </div>
                                  </div>
                                </details>
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap bg-blue-700">
                          <div className="space-y-1">
                            <button
                              onClick={() => handleSort('Mapped Category')}
                              className="flex items-center gap-1 hover:text-blue-300 w-full"
                              aria-label="Sort by Mapped Category 2"
                            >
                              Mapped Category 2
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                            <div className="relative">
                              <details className="group">
                                <summary className="h-7 text-xs bg-blue-600 text-white border border-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-700 list-none flex items-center justify-between">
                                  <span className="truncate">
                                    {columnFilters['Mapped Category']?.length > 0 ? `${columnFilters['Mapped Category'].length} selected` : 'Filter...'}
                                  </span>
                                  <span className="ml-1">▾</span>
                                </summary>
                                <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-300 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
                                  <div className="sticky top-0 bg-white border-b p-2">
                                    <Input
                                      placeholder="Search..."
                                      value={filterSearches['Mapped Category'] || ''}
                                      onChange={(e) => setFilterSearches(prev => ({ ...prev, 'Mapped Category': e.target.value }))}
                                      className="h-7 text-xs"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {getUniqueColumnValues['Mapped Category']
                                      ?.filter(value => !filterSearches['Mapped Category'] || value.toLowerCase().includes(filterSearches['Mapped Category'].toLowerCase()))
                                      .slice(0, 200)
                                      .map((value) => (
                                      <label key={value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-900">
                                        <input
                                          type="checkbox"
                                          checked={columnFilters['Mapped Category']?.includes(value) || false}
                                          onChange={() => handleFilterChange('Mapped Category', value)}
                                          className="rounded border-slate-300"
                                        />
                                        <span className="text-xs truncate">{value}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <div className="sticky bottom-0 bg-white border-t flex">
                                    {columnFilters['Mapped Category']?.length > 0 && (
                                      <button
                                        onClick={() => setColumnFilters(prev => ({ ...prev, 'Mapped Category': [] }))}
                                        className="flex-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                      >
                                        Clear All
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        const allValues = getUniqueColumnValues['Mapped Category']?.filter(value => 
                                          !filterSearches['Mapped Category'] || value.toLowerCase().includes(filterSearches['Mapped Category'].toLowerCase())
                                        ) || [];
                                        setColumnFilters(prev => ({ ...prev, 'Mapped Category': allValues }));
                                      }}
                                      className="flex-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border-l"
                                    >
                                      Select All
                                    </button>
                                  </div>
                                </div>
                              </details>
                            </div>
                          </div>
                        </th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Notes</th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Evidence</th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData
                        .slice((currentPageMapped2 - 1) * pageSizeMapped2, currentPageMapped2 * pageSizeMapped2)
                        .map((row, i) => {
                          const originalIndex = data.findIndex(dataRow => dataRow === row);
                          return (
                            <tr
                              key={i}
                              className={`border-b hover:bg-slate-50 ${selectedRows.has(originalIndex) ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(originalIndex)}
                                  onChange={() => handleSelectRow(originalIndex)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                            {data[0] && Object.keys(data[0]).filter(key => {
                              const excludeColumns = ['IsRevenue', 'IsDeemedPositive', 'Ledger', 'Ledger Parent', 'Group', 'AmountValue', '2nd Parent After Primary', 'Logic Trace'];
                              return !key.toLowerCase().includes('amount') && !excludeColumns.includes(key);
                            }).map((key, j) => {
                              const val = row[key];
                              return (
                                <td key={j} className="px-3 py-2 whitespace-nowrap">
                                  {typeof val === 'number' ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (val || '')}
                                </td>
                              );
                            })}
                              <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                                {data2[originalIndex] ? data2[originalIndex]['Mapped Category'] || '-' : '-'}
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="text"
                                  placeholder="Add note..."
                                  value={rowNotes[originalIndex] || ''}
                                  onChange={(e) => handleAddNote(originalIndex, e.target.value)}
                                  className="min-w-[150px] h-8 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => handleUploadEvidence(originalIndex, e.target.files)}
                                    className="hidden"
                                    id={`evidence-2-${originalIndex}`}
                                  />
                                  <label htmlFor={`evidence-2-${originalIndex}`}>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 h-8 text-xs cursor-pointer"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(`evidence-2-${originalIndex}`)?.click();
                                      }}
                                    >
                                      <Upload className="h-3 w-3" />
                                      Upload
                                    </Button>
                                  </label>
                                  {rowEvidence[originalIndex] && rowEvidence[originalIndex].length > 0 && (
                                    <span className="text-xs text-green-600">
                                      {rowEvidence[originalIndex].length} file(s)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex gap-1 flex-nowrap">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 h-8 text-xs px-2"
                                    onClick={() => handleEditRow(originalIndex)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-1 h-8 text-xs px-2"
                                    onClick={() => {
                                      setRowToDelete(originalIndex);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </Button>
                                </div>
                              </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls for Mapped TB2 */}
                <div className="flex items-center justify-between mt-4 px-4 py-3 border-t bg-slate-50 rounded-b-lg">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredAndSortedData.length === 0 ? 0 : ((currentPageMapped2 - 1) * pageSizeMapped2) + 1} to {Math.min(currentPageMapped2 * pageSizeMapped2, filteredAndSortedData.length)} of {filteredAndSortedData.length} rows
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={pageSizeMapped2}
                      onChange={(e) => {
                        setPageSizeMapped2(Number(e.target.value));
                        setCurrentPageMapped2(1);
                      }}
                      className="h-8 px-2 border border-slate-300 rounded text-sm"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                      <option value={filteredAndSortedData.length}>All</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageMapped2(currentPageMapped2 - 1)}
                        disabled={currentPageMapped2 === 1}
                        className="h-8 px-3"
                      >
                        Previous
                      </Button>
                      <span className="text-sm font-medium">
                        Page {currentPageMapped2} of {Math.ceil(filteredAndSortedData.length / pageSizeMapped2)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageMapped2(currentPageMapped2 + 1)}
                        disabled={currentPageMapped2 >= Math.ceil(filteredAndSortedData.length / pageSizeMapped2)}
                        className="h-8 px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary2 Tab - Using Priority-based Mapping */}
        <TabsContent value="summary-2" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Year Data (Priority-based)</CardTitle>
                <CardDescription>Mapped category summary using Mapping2.xlsx</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Category</th>
                        <th className="px-3 py-2 text-center font-medium">Placement</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(currentYearData2).length > 0 ? (
                        Object.entries(currentYearData2)
                          .sort()
                          .map(([key, val]) => (
                            <tr key={key} className="border-b hover:bg-slate-50">
                              <td className="px-3 py-2">{key}</td>
                              <td className="px-3 py-2 text-center font-medium">{getPlacement(key)}</td>
                              <td className="px-3 py-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-muted-foreground">
                            No current year data uploaded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Previous Year Data (Priority-based)</CardTitle>
                <CardDescription>Mapped category summary using Mapping2.xlsx</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Category</th>
                        <th className="px-3 py-2 text-center font-medium">Placement</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(previousYearData2).length > 0 ? (
                        Object.entries(previousYearData2)
                          .sort()
                          .map(([key, val]) => (
                            <tr key={key} className="border-b hover:bg-slate-50">
                              <td className="px-3 py-2">{key}</td>
                              <td className="px-3 py-2 text-center font-medium">{getPlacement(key)}</td>
                              <td className="px-3 py-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-muted-foreground">
                            No previous year data uploaded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {Object.keys(currentYearData2).length === 0 && Object.keys(previousYearData2).length === 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <p className="text-center text-red-700 font-medium">
                  No data available. Please upload Trial Balance files for Current Year and/or Previous Year.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balance-sheet-2">{renderStatement(bsStructure, false, currentYearData2, previousYearData2)}</TabsContent>
        <TabsContent value="profit-loss-2">{renderStatement(plStructure, true, currentYearData2, previousYearData2)}</TabsContent>
        
        <TabsContent value="notes" className="mt-0 p-4">
          <Tabs defaultValue="capital-notes" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="capital-notes">Capital Notes</TabsTrigger>
              <TabsTrigger value="liability-notes">Liability Notes</TabsTrigger>
              <TabsTrigger value="fa-notes">FA Notes</TabsTrigger>
              <TabsTrigger value="additional-disclosures">Additional Disclosures</TabsTrigger>
            </TabsList>

            {/* Capital Notes Sub-Tab */}
            <TabsContent value="capital-notes" className="space-y-4">
              <div className="space-y-4">
                {/* Note Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Note: Share Capital</h3>
                  <div className="flex items-center gap-4">
                    <Button size="sm" onClick={() => toast.success('Save functionality coming soon')}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Export functionality coming soon')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Authorized Share Capital */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th colSpan={4} className="px-3 py-2 text-left font-semibold">
                          Authorised Share Capital
                        </th>
                      </tr>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium w-[400px]">Description</th>
                        <th className="px-3 py-2 text-right font-medium w-[150px]">As at Current Year</th>
                        <th className="px-3 py-2 text-right font-medium w-[150px]">As at Previous Year</th>
                        <th className="px-3 py-2 w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input
                            placeholder="e.g., 10,000 Equity Shares of Rs. 10 each"
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-center">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Issued Share Capital */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th colSpan={4} className="px-3 py-2 text-left font-semibold">
                          Issued, Subscribed and Fully Paid-up Share Capital
                        </th>
                      </tr>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-right font-medium">Number of Shares</th>
                        <th className="px-3 py-2 text-right font-medium">Face Value</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="Description" className="h-8 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" placeholder="0" className="h-8 text-right text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" placeholder="10" className="h-8 text-right text-sm" />
                        </td>
                        <td className="px-3 py-2 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Reconciliation */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th colSpan={5} className="px-3 py-2 text-left font-semibold">Reconciliation of Shares Outstanding</th>
                      </tr>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium">Particulars</th>
                        <th className="px-3 py-2 text-right font-medium">Number</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-right font-medium">Number (PY)</th>
                        <th className="px-3 py-2 text-right font-medium">Amount (PY)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">Opening balance</td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">Movement during the year</td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2">Outstanding at the end</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Rights, Preferences and Restrictions */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2">Rights, Preferences and Restrictions Attached to Equity Shares</h4>
                  <Textarea
                    className="min-h-[80px] text-sm"
                    placeholder="Enter the rights, preferences and restrictions..."
                  />
                </div>

                {/* Shareholders holding >5% */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th colSpan={5} className="px-3 py-2 text-left font-semibold">
                          Shareholders Holding More Than 5%
                        </th>
                      </tr>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-right font-medium">No. of Shares</th>
                        <th className="px-3 py-2 text-right font-medium">% Holding</th>
                        <th className="px-3 py-2 text-right font-medium">No. (PY)</th>
                        <th className="px-3 py-2 text-right font-medium">% (PY)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input className="h-8 text-sm" placeholder="Shareholder name" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Liability Notes Sub-Tab */}
            <TabsContent value="liability-notes" className="space-y-4">
              <div className="space-y-4">
                {/* Note Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Note: Borrowings</h3>
                  <div className="flex items-center gap-4">
                    <Button size="sm" onClick={() => toast.success('Save functionality coming soon')}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Export functionality coming soon')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Long-term Borrowings */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th colSpan={3} className="px-3 py-2 text-left font-semibold">
                          Long-term Borrowings
                        </th>
                      </tr>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium">Particulars</th>
                        <th className="px-3 py-2 text-right font-medium">As at Current Year</th>
                        <th className="px-3 py-2 text-right font-medium">As at Previous Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Term Loans from Banks" className="h-8 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Deferred Payment Liabilities" className="h-8 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Short-term Borrowings */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th colSpan={3} className="px-3 py-2 text-left font-semibold">
                          Short-term Borrowings
                        </th>
                      </tr>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium">Particulars</th>
                        <th className="px-3 py-2 text-right font-medium">As at Current Year</th>
                        <th className="px-3 py-2 text-right font-medium">As at Previous Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Loans repayable on demand from banks" className="h-8 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Cash Credit from banks" className="h-8 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" className="h-8 text-right text-sm" placeholder="0.00" />
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Security Details */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2">Nature of Security</h4>
                  <Textarea
                    className="min-h-[80px] text-sm"
                    placeholder="Enter details of security provided for borrowings..."
                  />
                </div>
              </div>
            </TabsContent>

            {/* FA Notes Sub-Tab */}
            <TabsContent value="fa-notes" className="space-y-4">
              <div className="space-y-4">
                {/* Note Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Note: Property, Plant & Equipment</h3>
                  <div className="flex items-center gap-4">
                    <Select defaultValue="current">
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current Year</SelectItem>
                        <SelectItem value="previous">Previous Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => toast.success('Save functionality coming soon')}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Export functionality coming soon')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Fixed Assets Table */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="px-3 py-2 text-left font-semibold" rowSpan={2}>Particulars</th>
                        <th className="px-3 py-2 text-center font-semibold" colSpan={3}>Gross Block</th>
                        <th className="px-3 py-2 text-center font-semibold" colSpan={3}>Depreciation</th>
                        <th className="px-3 py-2 text-center font-semibold" colSpan={2}>Net Block</th>
                      </tr>
                      <tr className="bg-slate-700 text-white text-xs">
                        <th className="px-2 py-1 text-right">As at 01.04</th>
                        <th className="px-2 py-1 text-right">Additions</th>
                        <th className="px-2 py-1 text-right">As at 31.03</th>
                        <th className="px-2 py-1 text-right">As at 01.04</th>
                        <th className="px-2 py-1 text-right">For the year</th>
                        <th className="px-2 py-1 text-right">As at 31.03</th>
                        <th className="px-2 py-1 text-right">As at 31.03 (CY)</th>
                        <th className="px-2 py-1 text-right">As at 31.03 (PY)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Buildings" className="h-8 text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Plant and Machinery" className="h-8 text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Furniture and Fixtures" className="h-8 text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                      </tr>
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Intangible Assets */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="px-3 py-2 text-left font-semibold" colSpan={9}>Intangible Assets</th>
                      </tr>
                      <tr className="bg-slate-700 text-white text-xs">
                        <th className="px-3 py-2 text-left">Particulars</th>
                        <th className="px-2 py-1 text-right">As at 01.04</th>
                        <th className="px-2 py-1 text-right">Additions</th>
                        <th className="px-2 py-1 text-right">As at 31.03</th>
                        <th className="px-2 py-1 text-right">As at 01.04</th>
                        <th className="px-2 py-1 text-right">For the year</th>
                        <th className="px-2 py-1 text-right">As at 31.03</th>
                        <th className="px-2 py-1 text-right">As at 31.03 (CY)</th>
                        <th className="px-2 py-1 text-right">As at 31.03 (PY)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Input placeholder="e.g., Computer Software" className="h-8 text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                      </tr>
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                        <td className="px-2 py-2 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Depreciation Method */}
                <div className="border rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2">Depreciation Method & Rates</h4>
                  <Textarea
                    className="min-h-[80px] text-sm"
                    placeholder="Enter depreciation method and rates applied..."
                  />
                </div>
              </div>
            </TabsContent>

            {/* Additional Disclosures Sub-Tab */}
            <TabsContent value="additional-disclosures" className="space-y-4">
              <div className="space-y-4">
                {/* Note Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Additional Disclosures (Schedule III)</h3>
                  <div className="flex items-center gap-4">
                    <Button size="sm" onClick={() => toast.success('Save functionality coming soon')}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Export functionality coming soon')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Share Capital Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="text-base font-semibold mb-4 text-slate-800">1. Share Capital</h4>
                  
                  <div className="space-y-6">
                    {/* Authorised Share Capital */}
                    <div>
                      <h5 className="text-sm font-medium mb-3 text-slate-700">Authorised Share Capital</h5>
                      <div className="overflow-x-auto border rounded">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-700 text-white">
                              <th className="px-3 py-2 text-left font-medium">Particulars</th>
                              <th className="px-3 py-2 text-right font-medium">Number of Shares</th>
                              <th className="px-3 py-2 text-right font-medium">Value per Share (₹)</th>
                              <th className="px-3 py-2 text-right font-medium">Amount (₹ in '00)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-white">
                              <td className="px-3 py-2">
                                <Input placeholder="Equity Shares of Rs. 10 each" className="h-8 text-xs" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" className="h-8 text-right text-xs" placeholder="10" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Issued, Subscribed and Fully Paid Up Share Capital */}
                    <div>
                      <h5 className="text-sm font-medium mb-3 text-slate-700">Issued, Subscribed and Fully Paid Up Share Capital</h5>
                      <div className="overflow-x-auto border rounded">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-700 text-white">
                              <th className="px-3 py-2 text-left font-medium">Particulars</th>
                              <th className="px-3 py-2 text-right font-medium">31-March-2025</th>
                              <th className="px-3 py-2 text-right font-medium">31-March-2024</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-white">
                              <td className="px-3 py-2">Equity Shares, of Rs. 10 each, No. of Equity Shares</td>
                              <td className="px-3 py-2">
                                <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-white">
                              <td className="px-3 py-2">Amount (₹ in '00)</td>
                              <td className="px-3 py-2">
                                <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                              </td>
                            </tr>
                            <tr className="bg-slate-100 font-medium">
                              <td className="px-3 py-2">Total</td>
                              <td className="px-3 py-2 text-right">-</td>
                              <td className="px-3 py-2 text-right">-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reserves and Surplus Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="text-base font-semibold mb-4 text-slate-800">2. Reserves and Surplus</h4>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-600">Capital Reserves</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Securities Premium</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">General Reserve</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Revaluation Reserve</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600">Statement of Profit and Loss</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600">Other Reserves</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trade Payables Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="text-base font-semibold mb-4 text-slate-800">3. Trade Payables Ageing Schedule</h4>
                  
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-700 text-white">
                          <th className="px-2 py-2 text-left">Particulars</th>
                          <th className="px-2 py-2 text-right">Less than 1 year</th>
                          <th className="px-2 py-2 text-right">1-2 years</th>
                          <th className="px-2 py-2 text-right">2-3 years</th>
                          <th className="px-2 py-2 text-right">More than 3 years</th>
                          <th className="px-2 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-white">
                          <td className="px-2 py-2">MSME</td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-2 py-2">Others</td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="bg-slate-100 font-medium">
                          <td className="px-2 py-2">Total</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Trade Receivables Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="text-base font-semibold mb-4 text-slate-800">4. Trade Receivables Ageing Schedule</h4>
                  
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-700 text-white">
                          <th className="px-2 py-2 text-left">Particulars</th>
                          <th className="px-2 py-2 text-right">Less than 6 months</th>
                          <th className="px-2 py-2 text-right">6 months - 1 year</th>
                          <th className="px-2 py-2 text-right">1-2 years</th>
                          <th className="px-2 py-2 text-right">2-3 years</th>
                          <th className="px-2 py-2 text-right">More than 3 years</th>
                          <th className="px-2 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-white">
                          <td className="px-2 py-2">Undisputed (Good)</td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-2 py-2">Undisputed (Doubtful)</td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2"><Input type="number" className="h-6 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-2 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="bg-slate-100 font-medium">
                          <td className="px-2 py-2">Total</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                          <td className="px-2 py-2 text-right">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Auditor Remuneration Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="text-base font-semibold mb-4 text-slate-800">5. Auditor's Remuneration</h4>
                  
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-700 text-white">
                          <th className="px-3 py-2 text-left font-medium">Particulars</th>
                          <th className="px-3 py-2 text-right font-medium">Current Year (₹)</th>
                          <th className="px-3 py-2 text-right font-medium">Previous Year (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">Auditor Fee</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">For Taxation Matters</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">For Other Services</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">Reimbursement of Expenses</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" /></td>
                        </tr>
                        <tr className="bg-slate-100 font-medium">
                          <td className="px-3 py-2">Total</td>
                          <td className="px-3 py-2 text-right">-</td>
                          <td className="px-3 py-2 text-right">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Related Party Transactions Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="text-base font-semibold mb-4 text-slate-800">6. Related Party Transactions</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Nature of Transaction</label>
                      <Input placeholder="e.g., Director Remuneration, Loan Taken" className="h-8 text-xs" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600">Name of Related Party</label>
                        <Input placeholder="Enter name" className="h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Current Year Amount</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Previous Year Amount</label>
                        <Input type="number" className="h-8 text-right text-xs" placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ratio Analysis Section */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="text-base font-semibold mb-4 text-slate-800">7. Key Ratio Analysis</h4>
                  
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-700 text-white">
                          <th className="px-3 py-2 text-left font-medium">Ratio</th>
                          <th className="px-3 py-2 text-right font-medium">Current Year</th>
                          <th className="px-3 py-2 text-right font-medium">Previous Year</th>
                          <th className="px-3 py-2 text-right font-medium">Change %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">Current Ratio</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">Debt-Equity Ratio</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">Return on Equity</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="border-b hover:bg-white">
                          <td className="px-3 py-2">Net Profit Ratio</td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-right text-xs" placeholder="0.00" step="0.01" /></td>
                          <td className="px-3 py-2 text-right text-xs">-</td>
                        </tr>
                        <tr className="bg-slate-100">
                          <td colSpan={4} className="px-3 py-2">
                            <Textarea placeholder="Enter reasons for significant variances..." className="text-xs" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Last Mile Mapping Tab */}
        <TabsContent value="last-mile-mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Last Mile Mapping - Schedule III Classification</CardTitle>
                  <CardDescription>
                    Trial Balance ledgers mapped to Schedule III hierarchy (Face Item, Face Note, SubNote levels)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">{lastMileMappingData.filter(r => r.MappingStatus === 'OK').length} OK</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-600">
                    <span className="text-xl">⚠</span>
                    <span className="font-semibold">{lastMileMappingData.filter(r => r.MappingStatus === 'PARTIAL').length} Partial</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">{lastMileMappingData.filter(r => r.MappingStatus === 'ERROR').length} Errors</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {lastMileMappingData.length > 0 ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search ledgers, face notes, or errors..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="max-w-md"
                        />
                      </div>
                      <Select
                        value={String(pageSizeLastMile)}
                        onValueChange={(val) => {
                          setPageSizeLastMile(Number(val));
                          setCurrentPageLastMile(1);
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25 rows</SelectItem>
                          <SelectItem value="50">50 rows</SelectItem>
                          <SelectItem value="100">100 rows</SelectItem>
                          <SelectItem value="200">200 rows</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const ws = XLSX.utils.json_to_sheet(lastMileMappingData);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, 'LastMileMapping');
                          XLSX.writeFile(wb, `LastMileMapping_${new Date().toISOString().split('T')[0]}.xlsx`);
                          toast.success('Last Mile Mapping exported to Excel');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800 text-white sticky top-0">
                          <tr>
                            {[
                              { key: 'MappingStatus', label: 'Status' },
                              { key: 'Name', label: 'Ledger Name' },
                              { key: 'Opening Balance', label: 'Opening' },
                              { key: 'Debit', label: 'Debit' },
                              { key: 'Credit', label: 'Credit' },
                              { key: 'Closing Balance', label: 'Closing' },
                              { key: 'Face Note', label: 'Face Note' },
                              { key: 'Face Item', label: 'Face Item' },
                              { key: 'SubNote', label: 'SubNote' },
                              { key: 'SubNote1', label: 'SubNote1' },
                              { key: 'SubNote2', label: 'SubNote2' },
                              { key: 'SubNote3', label: 'SubNote3' },
                              { key: 'UsedKeyword', label: 'Keyword Used' },
                              { key: 'MappingError', label: 'Error Details' }
                            ].map(({ key, label }) => (
                              <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                <div className="space-y-1">
                                  <button
                                    onClick={() => handleSortLastMile(key)}
                                    className="flex items-center gap-1 hover:text-blue-300 w-full"
                                    aria-label={`Sort by ${key}`}
                                  >
                                    {label}
                                    <ArrowUpDown className="h-3 w-3" />
                                  </button>
                                  <div className="relative">
                                    <details className="group">
                                      <summary className="h-7 text-xs bg-blue-600 text-white border border-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-700 list-none flex items-center justify-between">
                                        <span className="truncate">
                                          {columnFiltersLastMile[key]?.length > 0 ? `${columnFiltersLastMile[key].length} selected` : 'Filter...'}
                                        </span>
                                        <span className="ml-1">▾</span>
                                      </summary>
                                    <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-300 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
                                      {/* Sort Options */}
                                      <div className="border-b bg-slate-50">
                                        <button
                                          onClick={() => {
                                            setSortColumnLastMile(key);
                                            setSortDirectionLastMile('asc');
                                          }}
                                          className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2"
                                        >
                                          <span className="text-green-600">↑</span>
                                          <span>{getUniqueColumnValuesLastMile[key]?.some(v => !isNaN(parseFloat(v))) ? 'Sort Smallest to Largest' : 'Sort A to Z'}</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSortColumnLastMile(key);
                                            setSortDirectionLastMile('desc');
                                          }}
                                          className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2 border-t"
                                        >
                                          <span className="text-red-600">↓</span>
                                          <span>{getUniqueColumnValuesLastMile[key]?.some(v => !isNaN(parseFloat(v))) ? 'Sort Largest to Smallest' : 'Sort Z to A'}</span>
                                        </button>
                                      </div>
                                      <div className="sticky top-0 bg-white border-b p-2">
                                        <Input
                                          placeholder="Search..."
                                          value={filterSearchesLastMile[key] || ''}
                                          onChange={(e) => setFilterSearchesLastMile(prev => ({ ...prev, [key]: e.target.value }))}
                                          className="h-7 text-xs"
                                          autoFocus
                                        />
                                      </div>
                                      <div className="max-h-60 overflow-y-auto">
                                        {getUniqueColumnValuesLastMile[key]
                                          ?.filter(value => !filterSearchesLastMile[key] || value.toLowerCase().includes(filterSearchesLastMile[key].toLowerCase()))
                                          .slice(0, 200)
                                          .map((value) => (
                                          <label key={value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-900">
                                            <input
                                              type="checkbox"
                                              checked={columnFiltersLastMile[key]?.includes(value) || false}
                                              onChange={() => handleFilterChangeLastMile(key, value)}
                                              className="rounded border-slate-300"
                                            />
                                            <span className="text-xs truncate">{value}</span>
                                          </label>
                                        ))}
                                      </div>
                                      <div className="sticky bottom-0 bg-white border-t flex">
                                        {columnFiltersLastMile[key]?.length > 0 && (
                                          <button
                                            onClick={() => setColumnFiltersLastMile(prev => ({ ...prev, [key]: [] }))}
                                            className="flex-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                          >
                                            Clear All
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            const allValues = getUniqueColumnValuesLastMile[key]?.filter(value => 
                                              !filterSearchesLastMile[key] || value.toLowerCase().includes(filterSearchesLastMile[key].toLowerCase())
                                            ) || [];
                                            setColumnFiltersLastMile(prev => ({ ...prev, [key]: allValues }));
                                          }}
                                          className="flex-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border-l"
                                        >
                                          Select All
                                        </button>
                                      </div>
                                    </div>
                                  </details>
                                </div>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedLastMileData
                            .slice((currentPageLastMile - 1) * pageSizeLastMile, currentPageLastMile * pageSizeLastMile)
                            .map((row, idx) => (
                              <tr
                                key={idx}
                                className={`border-b hover:bg-opacity-70 transition-colors ${
                                  row.MappingStatus === 'OK'
                                    ? 'bg-green-50'
                                    : row.MappingStatus === 'PARTIAL'
                                    ? 'bg-yellow-50'
                                    : 'bg-red-50'
                                }`}
                              >
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {row.MappingStatus === 'OK' && (
                                      <>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-xs font-medium text-green-700">OK</span>
                                      </>
                                    )}
                                    {row.MappingStatus === 'PARTIAL' && (
                                      <>
                                        <span className="text-yellow-600 text-lg">⚠</span>
                                        <span className="text-xs font-medium text-yellow-700">PARTIAL</span>
                                      </>
                                    )}
                                    {row.MappingStatus === 'ERROR' && (
                                      <>
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        <span className="text-xs font-medium text-red-700">ERROR</span>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 font-medium">{row.Name || ''}</td>
                                <td className="px-3 py-2 text-right">{typeof row['Opening Balance'] === 'number' ? row['Opening Balance'].toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (row['Opening Balance'] || '')}</td>
                                <td className="px-3 py-2 text-right">{typeof row.Debit === 'number' ? row.Debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (row.Debit || '')}</td>
                                <td className="px-3 py-2 text-right">{typeof row.Credit === 'number' ? row.Credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (row.Credit || '')}</td>
                                <td className="px-3 py-2 text-right">{typeof row['Closing Balance'] === 'number' ? row['Closing Balance'].toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (row['Closing Balance'] || '')}</td>
                                <td className="px-3 py-2">{row['Face Note'] || ''}</td>
                                <td className="px-3 py-2">{row['Face Item'] || ''}</td>
                                <td className="px-3 py-2">{row.SubNote || ''}</td>
                                <td className="px-3 py-2">{row.SubNote1 || ''}</td>
                                <td className="px-3 py-2">{row.SubNote2 || ''}</td>
                                <td className="px-3 py-2">{row.SubNote3 || ''}</td>
                                <td className="px-3 py-2 text-xs text-blue-600">{row.UsedKeyword || ''}</td>
                                <td className="px-3 py-2 text-xs text-red-600">{row.MappingError || ''}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls for Last Mile Mapping */}
                    <div className="flex items-center justify-between mt-4 px-4 py-3 border-t bg-slate-50 rounded-b-lg">
                      <div className="text-sm text-muted-foreground">
                        Showing {filteredAndSortedLastMileData.length === 0 ? 0 : ((currentPageLastMile - 1) * pageSizeLastMile) + 1} to {Math.min(currentPageLastMile * pageSizeLastMile, filteredAndSortedLastMileData.length)} of {filteredAndSortedLastMileData.length} rows
                        rows
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageLastMile(currentPageLastMile - 1)}
                          disabled={currentPageLastMile === 1}
                          className="h-8 px-3"
                        >
                          Previous
                        </Button>
                        <span className="text-sm font-medium">
                          Page {currentPageLastMile} of {Math.ceil(filteredAndSortedLastMileData.length / pageSizeLastMile)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageLastMile(currentPageLastMile + 1)}
                          disabled={currentPageLastMile >= Math.ceil(filteredAndSortedLastMileData.length / pageSizeLastMile)}
                          className="h-8 px-3"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No Last Mile Mapping data. Please upload a trial balance with Map1, Map2, Sch3, and TrialBalance sheets.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Row Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Row</DialogTitle>
          </DialogHeader>
          {editingRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(editingRow)
                  .filter(key => key !== 'originalIndex')
                  .map(key => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{key}</Label>
                      <Input
                        id={key}
                        type={typeof editingRow[key] === 'number' ? 'number' : 'text'}
                        step="any"
                        value={editingRow[key] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          setEditingRow((prev: any) => ({
                            ...prev,
                            [key]: typeof prev[key] === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
                          }));
                        }}
                      />
                    </div>
                  ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this row? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Saved TB Data Section */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-2">Trial Balance Data</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {savedTBData.length > 0 ? `${savedTBData.length} items saved in memory` : 'No saved data'}
                  </p>
                  {savedTBData.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      New imports will automatically merge with existing data, skipping duplicates.
                    </p>
                  )}
                </div>
                {savedTBData.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleClearSavedTBData}>
                    Clear Saved Data
                  </Button>
                )}
              </div>
            </div>

            {/* Mapping Configurations Section */}
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Mapping Configurations</h3>
                <Button size="sm" onClick={handleSaveMappingConfiguration}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Current Config
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Select Mapping Configuration</Label>
                <Select value={selectedMappingConfig} onValueChange={handleLoadMappingConfiguration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose configuration..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">System Default</SelectItem>
                    {savedMappings.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name} - {config.clientName} ({config.assignment})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {savedMappings.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Saved Configurations:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {savedMappings.map((config) => (
                      <div key={config.id} className="flex items-center justify-between p-3 border rounded bg-slate-50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{config.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Client: {config.clientName} | Assignment: {config.assignment}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Type: {config.assesseeType === '3' ? 'Corporate' : config.assesseeType === '4' ? 'Non-Corporate' : 'LLP'} | 
                            Created: {new Date(config.dateCreated).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMappingConfiguration(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Note Numbers Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Note Numbers</h3>
                <Button size="sm" onClick={() => setNoteNumberDialogOpen(true)}>
                  Generate Note Numbers
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 border rounded bg-slate-50">
                  <input
                    type="checkbox"
                    id="skip-empty-notes"
                    checked={skipEmptyNoteNumbers}
                    onChange={(e) => {
                      setSkipEmptyNoteNumbers(e.target.checked);
                      localStorage.setItem('srmPro_skipEmptyNoteNumbers', JSON.stringify(e.target.checked));
                      toast.success(`Empty items will ${e.target.checked ? 'be skipped' : 'have note numbers'}`);
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="skip-empty-notes" className="text-sm cursor-pointer">
                    Skip note numbers for items with zero values in both years (Recommended)
                  </Label>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {Object.keys(noteNumbers).length > 0 
                    ? `${Object.keys(noteNumbers).length} note numbers assigned` 
                    : 'No note numbers generated yet'}
                </p>
                
                {Object.keys(noteNumbers).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNoteNumbers({});
                      localStorage.removeItem('srmPro_noteNumbers');
                      toast.success('Note numbers cleared');
                    }}
                  >
                    Clear Note Numbers
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Number Generation Dialog */}
      <Dialog open={noteNumberDialogOpen} onOpenChange={setNoteNumberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Note Numbers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Note numbers will be assigned continuously to items in BS, PL, BS2, and PL2 that have values. 
              Items with zero values in both current and previous year will be skipped.
            </p>
            <div className="space-y-2">
              <Label htmlFor="starting-note">Starting Note Number</Label>
              <Input
                id="starting-note"
                type="number"
                min="1"
                value={startingNoteNumber}
                onChange={(e) => setStartingNoteNumber(e.target.value)}
                placeholder="e.g., 1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteNumberDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateNoteNumbers}>
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SRMPro;
