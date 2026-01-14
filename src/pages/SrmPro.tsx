import { useState, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Upload, FileSpreadsheet, FileText, BarChart3, Search } from 'lucide-react';
import { useEngagement } from '@/contexts/EngagementContext';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// Utility functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepClean = (val: any): string => {
  if (val === undefined || val === null) return '';
  let s = String(val);
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  s = s.replace(/[\u00A0\t\r\n]/g, ' ');
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const processAccountingData = (workbook: XLSX.WorkBook): any[] => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s1Raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[][];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s2Raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], { header: 1 }) as any[][];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s3Raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]], { header: 1 }) as any[][];

  const mappingMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s1Raw.forEach((row: any[]) => {
    const parentKey = deepClean(row[2]);
    if (parentKey) mappingMap[parentKey] = row[3];
  });

  const hierarchyMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s3Raw.forEach((row: any[]) => {
    if (!row || row.length < 2) return;
    const ledgerName = deepClean(row[0]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanRow = row.map((cell: any) => deepClean(cell));
    const pIdx = cleanRow.findIndex((cell: string) => cell.includes('primary'));
    if (pIdx > 0) {
      hierarchyMap[ledgerName] = cleanRow[pIdx - 1];
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let headerRowIdx = s2Raw.findIndex((row: any[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row.some((cell: any) => {
      const c = deepClean(cell);
      return c.includes('ledger') || c.includes('particulars') || c.includes('name') || c.includes('1-apr');
    })
  );
  if (headerRowIdx === -1) headerRowIdx = 0;

  const headers = s2Raw[headerRowIdx] || [];
  const dataRows = s2Raw.slice(headerRowIdx + 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ledgerIdx = headers.findIndex((h: any) => {
    const s = deepClean(h);
    return s.includes('ledger') || s.includes('particulars') || s.includes('name');
  }) || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amtIdx = headers.findIndex((h: any) => {
    const s = deepClean(h);
    return s.includes('amount') || s.includes('closing') || s.includes('31-mar') || s.includes('1-apr');
  });

  const results = dataRows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any[]) => {
      if (!row || row.length === 0 || !row[ledgerIdx]) return null;

      const cleanedName = deepClean(row[ledgerIdx]);
      const parent = hierarchyMap[cleanedName];
      const category = parent ? mappingMap[parent] || 'NOT MAPPED' : 'NOT MAPPED';

      const rawAmt = row[amtIdx !== -1 ? amtIdx : ledgerIdx + 1];
      let cleanAmt = 0;
      if (rawAmt !== undefined) {
        cleanAmt = parseFloat(String(rawAmt).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headers.forEach((h: any, i: number) => {
        obj[h || `Col_${i}`] = row[i];
      });
      obj['Mapped Category'] = category;
      obj['AmountValue'] = cleanAmt;
      obj['Logic Trace'] = parent ? `Parent: ${parent}` : 'Hierarchy Match Failed';

      return obj;
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => r !== null);

  return results;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summarizeData = (processedData: any[]) => {
  const summary: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processedData.forEach((row: any) => {
    const key = deepClean(row['Mapped Category']);
    summary[key] = (summary[key] || 0) + (row['AmountValue'] || 0);
  });
  return summary;
};

// Balance Sheet Structure
const bsStructure = [
  { label: 'EQUITY AND LIABILITIES', h: true },
  { label: "(1) Shareholders' funds", sub: true },
  { label: '(a) Share capital', key: "Share capital" },
  { label: '(b) Reserves and surplus', key: "Reserves and surplus" },
  { label: '(c) Money received against share warrants', key: "Money received against share warrants" },
  { label: "Uncategorised Shareholder's Funds", key: "Uncategorised Shareholder's Funds", un: true },
  { label: '(2) Share application money pending allotment', key: "Share application money pending allotment" },
  { label: '(3) Non-Current liabilities', sub: true },
  { label: '(a) Long-term borrowings', key: "Long-term borrowings" },
  { label: '(b) Deferred tax liabilities (Net)', key: "Deferred tax liabilities (Net)" },
  { label: '(c) Other long term liabilities', key: "Other long term liabilities" },
  { label: '(d) Long-term provisions', key: "Long-term provisions" },
  { label: 'Uncategorised Non-Current liabilities', key: "Uncategorised Non-Current liabilities", un: true },
  { label: '(4) Current liabilities', sub: true },
  { label: '(a) Short-term borrowings', key: "Short-term borrowings" },
  { label: '(b) Trade payables', key: "Trade payables" },
  { label: '(A) Micro and Small Enterprises', key: "(A) Micro and Small Enterprises" },
  { label: '(B) Others', key: "(B) Others" },
  { label: '(c) Other current liabilities', key: "Other current liabilities" },
  { label: '(d) Short-term provisions', key: "Short-term provisions" },
  { label: 'Uncategorised Current liabilities', key: "Uncategorised Current liabilities", un: true },
  { label: 'TOTAL', h: true },
  { label: 'ASSETS', h: true },
  { label: '(1) Non-Current Assets', sub: true },
  { label: '(a) Property, Plant & Equipment and Intangible Assets', sub: true },
  { label: '(i) Property, Plant & Equipment', key: "(i) Property, Plant & Equipment" },
  { label: '(ii) Intangible assets', key: "(ii) Intangible assets" },
  { label: '(iii) Capital work-in-Progress', key: "(iii) Capital work-in-Progress" },
  { label: '(iv) Intangible assets under development', key: "(iv) Intangible assets under development" },
  { label: '(b) Non-current investments', key: "Non-current investments" },
  { label: '(c) Deferred tax assets (Net)', key: "Deferred tax assets (Net)" },
  { label: '(d) Long-term loans and advances', key: "Long-term loans and advances" },
  { label: '(e) Other non-current Assets', key: "Other non-current Assets" },
  { label: 'Uncategorised Non-Current Assets', key: "Uncategorised Non-Current Assets", un: true },
  { label: '(2) Current assets', sub: true },
  { label: '(a) Current investments', key: "Current investments" },
  { label: '(b) Inventories', key: "Inventories" },
  { label: '(c) Trade receivables', key: "Trade receivables" },
  { label: '(d) Cash and bank balances', key: "Cash and bank balances" },
  { label: '(e) Short-term loans and advances', key: "Short-term loans and advances" },
  { label: '(f) Other current assets', key: "Other current assets" },
  { label: 'Uncategorised Current assets', key: "Uncategorised Current assets", un: true },
  { label: 'Suspense', key: "Suspense" },
];

// P&L Structure
const plStructure = [
  { label: 'INCOME', h: true },
  { label: '(1) Revenue from operations', sub: true },
  { label: '(a) Sale of products', key: "Sale of products" },
  { label: '(b) Sale of services', key: "Sale of services" },
  { label: '(c) Other operating revenues', key: "Other operating revenues" },
  { label: 'Uncategorised Revenue from operations', key: "Uncategorised Revenue from operations", un: true },
  { label: '(2) Other Income', key: "Other income" },
  { label: 'Total Revenue', sub: true },
  { label: 'EXPENSES', h: true },
  { label: '(3) Cost of materials consumed', key: "Cost of materials consumed" },
  { label: '(4) Purchases of Stock-in-Trade', key: "Purchases of Stock-in-Trade" },
  { label: '(5) Changes in inventories of finished goods, work-in-progress and Stock-in-Trade', key: "Changes in inventories of finished goods, work-in-progress and Stock-in-Trade" },
  { label: '(6) Employee benefit expense', sub: true },
  { label: '(a) Salaries and wages', key: "Salaries and wages" },
  { label: '(b) Contribution to provident and other funds', key: "Contribution to provident and other funds" },
  { label: '(c) Staff welfare expenses', key: "Staff welfare expenses" },
  { label: 'Uncategorised Employee benefit expense', key: "Uncategorised Employee benefit expense", un: true },
  { label: '(7) Finance costs', sub: true },
  { label: '(a) Interest expense', key: "Interest expense" },
  { label: '(b) Other borrowing costs', key: "Other borrowing costs" },
  { label: 'Uncategorised Finance costs', key: "Uncategorised Finance costs", un: true },
  { label: '(8) Depreciation and amortization expense', key: "Depreciation and amortization expense" },
  { label: '(9) Other expenses', sub: true },
  { label: '(a) Power and fuel', key: "Power and fuel" },
  { label: '(b) Rent', key: "Rent" },
  { label: '(c) Repairs and maintenance', key: "Repairs and maintenance" },
  { label: '(d) Insurance', key: "Insurance" },
  { label: '(e) Rates and taxes', key: "Rates and taxes" },
  { label: '(f) Legal and professional charges', key: "Legal and professional charges" },
  { label: '(g) Travelling and conveyance', key: "Travelling and conveyance" },
  { label: '(h) Communication costs', key: "Communication costs" },
  { label: '(i) Advertisement and sales promotion', key: "Advertisement and sales promotion" },
  { label: '(j) Bad debts written off', key: "Bad debts written off" },
  { label: '(k) Provision for doubtful debts', key: "Provision for doubtful debts" },
  { label: '(l) Miscellaneous expenses', key: "Miscellaneous expenses" },
  { label: 'Uncategorised Other expenses', key: "Uncategorised Other expenses", un: true },
  { label: 'Total Expenses', sub: true },
  { label: '(10) Prior period items', key: "Prior period items" },
  { label: 'Profit/(Loss) before tax', sub: true },
  { label: '(11) Tax expense', sub: true },
  { label: '(a) Current tax', key: "Current tax" },
  { label: '(b) Deferred tax', key: "Deferred tax" },
  { label: 'Profit/(Loss) for the period', sub: true },
];

export default function SrmPro() {
  const { currentEngagement } = useEngagement();
  const [activeTab, setActiveTab] = useState('upload');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [currentYearData, setCurrentYearData] = useState<Record<string, number>>({});
  const [previousYearData, setPreviousYearData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scale, setScale] = useState('1');
  const [companyName, setCompanyName] = useState(currentEngagement?.client_name || 'ABC PRIVATE LIMITED');
  const [cin, setCin] = useState('UXXXXXMH2023PTCXXX588');
  const [periodYear, setPeriodYear] = useState('');
  const [uploadPeriod, setUploadPeriod] = useState('current');

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!periodYear) {
      toast.error('Please enter the financial year (e.g., 2024)');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const processed = processAccountingData(wb);
        if (processed.length === 0) throw new Error('No ledgers found. Check Sheet 2 column headers.');

        setData(processed);
        const summarized = summarizeData(processed);

        if (uploadPeriod === 'current') {
          setCurrentYearData(summarized);
          toast.success('Current year data uploaded successfully');
        } else {
          setPreviousYearData(summarized);
          toast.success('Previous year data uploaded successfully');
        }

        setActiveTab('results');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        toast.error(err.message);
      }
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const formatValue = (val: number) => {
    if (!val) return '';
    const scaleFactor = parseFloat(scale);
    return (val / scaleFactor).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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

  const scaleLabels: Record<string, string> = {
    '1': 'Rupees',
    '100': 'Hundreds',
    '1000': 'Thousands',
    '100000': 'Lakhs',
    '10000000': 'Crores',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderStatement = (structure: any[], isPL = false) => {
    let currentTotal = 0;
    let previousTotal = 0;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{companyName}</CardTitle>
            <p className="text-sm text-muted-foreground">CIN: {cin}</p>
            <h3 className="text-xl font-semibold mt-2">
              {isPL ? 'Statement of Profit & Loss' : `Balance Sheet as at 31 March ${periodYear}`}
            </h3>
            <p className="text-sm font-medium">(Amount in ₹ {scaleLabels[scale]})</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 border border-border">Particulars</th>
                    <th className="w-24 p-3 border border-border">Note No.</th>
                    <th className="w-40 p-3 border border-border">{getColumnHeader(isPL, true)}</th>
                    <th className="w-40 p-3 border border-border">{getColumnHeader(isPL, false)}</th>
                  </tr>
                </thead>
                <tbody>
                  {structure.map((row, i) => {
                    const currentVal = currentYearData[deepClean(row.key)] || 0;
                    const previousVal = previousYearData[deepClean(row.key)] || 0;
                    const isAlert = row.un && (Math.abs(currentVal) > 0 || Math.abs(previousVal) > 0);

                    if (row.label === 'TOTAL' && !isPL) {
                      structure.forEach((r) => {
                        if (!r.h && !r.sub && r.key) {
                          currentTotal += currentYearData[deepClean(r.key)] || 0;
                          previousTotal += previousYearData[deepClean(r.key)] || 0;
                        }
                      });
                    }

                    let indent = 'pl-12';
                    if (row.h) indent = 'pl-3';
                    else if (row.sub && row.label.match(/^\([a-z]\)/)) indent = 'pl-14';
                    else if (row.sub) indent = 'pl-7';
                    else if (row.label.match(/^\([A-Z]\)/)) indent = 'pl-20';
                    else if (row.label.match(/^\(i+v?\)/)) indent = 'pl-16';

                    const showTotal = row.label === 'TOTAL';

                    return (
                      <tr
                        key={i}
                        className={`${row.h ? 'bg-muted font-bold text-lg' : ''} ${row.sub ? 'font-semibold bg-muted/50' : ''} ${
                          isAlert ? 'bg-red-50' : ''
                        } ${showTotal ? 'bg-blue-50 font-bold text-lg' : ''}`}
                      >
                        <td className={`p-3 border border-border ${indent} ${isAlert ? 'text-red-600 text-sm' : ''}`}>{row.label}</td>
                        <td className="text-center border border-border">{!row.h && !row.sub && !row.un ? row.note || '' : ''}</td>
                        <td className={`text-right p-3 border border-border ${isAlert ? 'text-red-600 text-sm' : ''}`}>
                          {showTotal ? formatValue(currentTotal) : !row.h && !row.sub ? formatValue(currentVal) : ''}
                        </td>
                        <td className={`text-right p-3 border border-border ${isAlert ? 'text-red-600 text-sm' : ''}`}>
                          {showTotal ? formatValue(previousTotal) : !row.h && !row.sub ? formatValue(previousVal) : ''}
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">SRM Pro</h1>
          <p className="text-muted-foreground">Financial Statement Planner - Schedule III Format</p>
        </div>
      </div>

      {/* Company Settings Bar */}
      {activeTab !== 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <Label>CIN</Label>
                <Input value={cin} onChange={(e) => setCin(e.target.value)} placeholder="UXXXXXMH2023PTCXXX588" />
              </div>
              {(activeTab === 'bs' || activeTab === 'pl' || activeTab === 'summary') && (
                <div>
                  <Label>Scale</Label>
                  <Select value={scale} onValueChange={setScale}>
                    <SelectTrigger>
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
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!data.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={!data.length}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="bs" disabled={!data.length}>
            <FileText className="mr-2 h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="pl" disabled={!data.length}>
            <FileText className="mr-2 h-4 w-4" />
            P & L Account
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Tally Excel</CardTitle>
              <p className="text-sm text-muted-foreground">Required: Mapping | Trial Balance | Hierarchy</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Period Type</Label>
                  <Select value={uploadPeriod} onValueChange={setUploadPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Year</SelectItem>
                      <SelectItem value="previous">Previous Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Financial Year (e.g., 2024)</Label>
                  <Input
                    type="text"
                    placeholder="2024"
                    value={periodYear}
                    onChange={(e) => setPeriodYear(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-center pt-6">
                <div className="text-center">
                  <input type="file" id="file-upload" hidden onChange={handleFileUpload} accept=".xlsx,.xls" />
                  <Button
                    size="lg"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={loading}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    {loading ? 'Processing...' : 'Select File'}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    Upload Excel file with 3 sheets: Mapping, Trial Balance, and Hierarchy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Ledger Data</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Ledgers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      {data[0] &&
                        Object.keys(data[0]).map((k) => (
                          <th key={k} className="p-2 text-left border border-border">
                            {k}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data
                      .filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
                      .slice(0, 100)
                      .map((r, i) => (
                        <tr
                          key={i}
                          className={r['Mapped Category'] === 'NOT MAPPED' ? 'bg-red-50' : 'hover:bg-muted/50'}
                        >
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {Object.values(r).map((v: any, j) => (
                            <td key={j} className="p-2 border border-border">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Year Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(currentYearData).length > 0 ? (
                        Object.entries(currentYearData)
                          .sort()
                          .map(([key, val]) => (
                            <tr key={key} className="border-b hover:bg-muted/50">
                              <td className="p-2">{key}</td>
                              <td className="p-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="text-center text-muted-foreground p-6">
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
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(previousYearData).length > 0 ? (
                        Object.entries(previousYearData)
                          .sort()
                          .map(([key, val]) => (
                            <tr key={key} className="border-b hover:bg-muted/50">
                              <td className="p-2">{key}</td>
                              <td className="p-2 text-right">{formatValue(val)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="text-center text-muted-foreground p-6">
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
            <Card className="mt-4 bg-red-50">
              <CardContent className="pt-6 text-center">
                <p className="text-red-600 font-semibold">
                  No data available. Please upload Trial Balance files for Current Year and/or Previous Year.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Balance Sheet Tab */}
        <TabsContent value="bs">{renderStatement(bsStructure, false)}</TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pl">{renderStatement(plStructure, true)}</TabsContent>
      </Tabs>
    </div>
  );
}
