import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Search, FileText, TrendingUp, Download, ArrowUpDown, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { processAccountingData, summarizeData, deepClean } from '@/utils/srmProcessor';

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

  // Load mapping file on mount
  useEffect(() => {
    const loadMappingFile = async () => {
      try {
        const response = await fetch('/SRM_Pro/Mapping.xlsx');
        if (!response.ok) {
          console.warn('Mapping file not found, will use default mapping');
          return;
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Skip header row
        const dataRows = jsonData.slice(1);
        setMappingData(dataRows);
        setMappingLoaded(true);
        console.log('Mapping file loaded successfully:', dataRows.length, 'mapping rules');
      } catch (error) {
        console.error('Error loading mapping file:', error);
        toast.error('Could not load mapping file. Using default mapping.');
      }
    };
    
    loadMappingFile();
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
    setData([]);
    setCurrentYearData({});
    setPreviousYearData({});
    setSummary({});
    setSearch('');
    setSortColumn('');
    setSortDirection('asc');
    setColumnFilters({});
    setSelectedPeriod('current');
    setSelectedYear('');
    setPeriodYear('');
    setActiveTab('upload');
    toast.success('All data cleared successfully');
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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
        
        // Process with mapping data and assessee type
        const processed = processAccountingData(wb, mappingData, assesseeType);
        
        console.log('Processed data:', processed.length, 'rows');
        console.log('Using assessee type:', assesseeType === '3' ? 'Corporate' : assesseeType === '4' ? 'Non-Corporate' : 'LLP');
        console.log('Mapping loaded:', mappingLoaded ? 'Yes' : 'No');
        if (processed.length > 0) {
          console.log('Sample row:', processed[0]);
        }
        
        if (processed.length === 0) {
          throw new Error('No ledgers found. Please check that your Excel file has the correct column headers (Name, Parent, OpeningBalance, Debit, Credit, ClosingBalance, IsDeemedPositive).');
        }

        setData(processed);
        const summarized = summarizeData(processed);
        setSummary(summarized);

        if (selectedPeriod === 'current') {
          setCurrentYearData(summarized);
        } else {
          setPreviousYearData(summarized);
        }

        const mappedCount = processed.filter(r => r['Mapped Category'] !== 'NOT MAPPED').length;
        const unmappedCount = processed.length - mappedCount;
        
        setActiveTab('results');
        toast.success(
          `${selectedPeriod === 'current' ? 'Current' : 'Previous'} year data uploaded successfully. ` +
          `${processed.length} ledgers imported (${mappedCount} mapped, ${unmappedCount} unmapped).`
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
    { label: 'Uncategorised Income', key: 'Uncategorised Income', un: true },
    { label: 'Total Revenue', sub: true },
    { label: 'EXPENSES', h: true },
    { label: '(3) Cost of materials consumed', key: 'Cost of materials consumed' },
    { label: '(4) Purchases of Stock-in-Trade', key: 'Purchases of Stock-in-Trade' },
    { label: '(5) Changes in inventories of finished goods, work-in-progress and Stock-in-Trade', key: 'Changes in inventories of finished goods, work-in-progress and Stock-in-Trade' },
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
    { label: 'Uncategorised expenses', key: 'Uncategorised expenses', un: true },
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
  const renderStatement = (structure: any[], isPL = false) => {
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
          const currentVal = currentYearData[deepClean(row.key)] || 0;
          const previousVal = previousYearData[deepClean(row.key)] || 0;
          
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
      structure.forEach((row) => {
        if (row.label === 'ASSETS') {
          isInAssetsSection = true;
        }
        
        if (row.label === 'TOTAL') {
          totalCount++;
        }
        
        if (!row.h && !row.sub && row.key) {
          const currentVal = currentYearData[deepClean(row.key)] || 0;
          const previousVal = previousYearData[deepClean(row.key)] || 0;
          
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
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{companyName}</CardTitle>
            <p className="text-sm text-muted-foreground">CIN: {cin}</p>
            <CardTitle className="text-xl mt-2">{isPL ? 'Statement of Profit & Loss' : 'Balance Sheet as at 31 March ' + periodYear}</CardTitle>
            <p className="text-sm font-medium">(Amount in ₹ {scaleLabels[scale]})</p>
            {hasDifference && (
              <p className="text-red-600 font-bold mt-2">
                ⚠️ Balance Sheet does not balance! Difference: Current Year: {formatValue(currentDifference)}, Previous Year: {formatValue(previousDifference)}
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
                    const currentVal = currentYearData[deepClean(row.key)] || 0;
                    const previousVal = previousYearData[deepClean(row.key)] || 0;
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
                          {!row.h && !row.sub && !row.un && !showPLTotal ? row.note || '' : ''}
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

      {(activeTab === 'balance-sheet' || activeTab === 'profit-loss') && (
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!data.length} className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={!data.length} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" disabled={!data.length} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="profit-loss" disabled={!data.length} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            P & L Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Upload Tally Excel</CardTitle>
                <CardDescription className="text-xs">Required sheets: Mapping | Trial Balance | Hierarchy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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

                <div className="space-y-1">
                  <Label htmlFor="assessee-type" className="text-sm">
                    Assessee Type
                    {mappingLoaded && <span className="ml-2 text-xs text-green-600">✓ Mapping Loaded</span>}
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

                <div className="space-y-1">
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

                {data.length > 0 && (
                  <Button
                    onClick={handleClearData}
                    variant="destructive"
                    className="w-full"
                    disabled={loading}
                  >
                    Clear All Data
                  </Button>
                )}

                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-xs text-muted-foreground">Processing...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {data.length > 0 && (
              <Card className="md:col-span-3">
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
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">{key}</p>
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
                    
                    <div className="overflow-x-auto border rounded-lg max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800 text-white sticky top-0">
                          <tr>
                            {data[0] && Object.keys(data[0]).filter(key => !key.toLowerCase().includes('amount')).map((key) => (
                              <th key={key} className="px-2 py-2 text-left font-medium whitespace-nowrap">
                                <div className="space-y-1">
                                  <button
                                    onClick={() => handleSort(key)}
                                    className="flex items-center gap-1 hover:text-blue-300"
                                    aria-label={`Sort by ${key}`}
                                  >
                                    {key}
                                    <ArrowUpDown className="h-3 w-3" />
                                  </button>
                                  <div className="relative">
                                    <details className="group">
                                      <summary className="h-6 text-xs bg-blue-600 text-white border border-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-700 list-none flex items-center justify-between">
                                        <span className="truncate">
                                          {columnFilters[key]?.length > 0 ? `${columnFilters[key].length} selected` : 'Filter...'}
                                        </span>
                                        <span className="ml-1">▾</span>
                                      </summary>
                                      <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-300 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
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
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedData.slice(0, 100).map((row, i) => (
                            <tr key={i} className={`border-b hover:bg-slate-50`}>
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {Object.entries(row).filter(([key]) => !key.toLowerCase().includes('amount')).map(([key, val]: [string, any], j) => (
                                <td key={j} className="px-2 py-1 whitespace-nowrap text-xs">
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
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trial Balance Results</CardTitle>
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
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">{key}</p>
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

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr>
                        {data[0] && Object.keys(data[0]).filter(key => !key.toLowerCase().includes('amount')).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            <div className="space-y-1">
                              <button
                                onClick={() => handleSort(key)}
                                className="flex items-center gap-1 hover:text-blue-300 w-full"
                                aria-label={`Sort by ${key}`}
                              >
                                {key}
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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData
                        .slice(0, 100)
                        .map((row, i) => (
                          <tr
                            key={i}
                            className={`border-b hover:bg-slate-50`}
                          >
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {Object.entries(row).filter(([key]) => !key.toLowerCase().includes('amount')).map(([key, val]: [string, any], j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap">
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
                              <td className="px-3 py-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="text-center py-8 text-muted-foreground">
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
                              <td className="px-3 py-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="text-center py-8 text-muted-foreground">
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
      </Tabs>
    </div>
  );
};

export default SRMPro;
