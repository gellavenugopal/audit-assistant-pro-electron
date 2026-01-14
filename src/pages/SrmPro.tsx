import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Search, FileText, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import { processAccountingData, summarizeData, deepClean } from '@/utils/srmProcessor';

const SRMPro = () => {
  const [activeTab, setActiveTab] = useState('upload');
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
        const processed = processAccountingData(wb);
        if (processed.length === 0) throw new Error('No ledgers found. Check Sheet 2 column headers.');

        setData(processed);
        const summarized = summarizeData(processed);
        setSummary(summarized);

        if (selectedPeriod === 'current') {
          setCurrentYearData(summarized);
        } else {
          setPreviousYearData(summarized);
        }

        setActiveTab('results');
        toast.success(`${selectedPeriod === 'current' ? 'Current' : 'Previous'} year data uploaded successfully`);
      } catch (err: any) {
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
  ];

  const plStructure = [
    { label: 'INCOME', h: true },
    { label: '(1) Revenue from operations', sub: true },
    { label: '(a) Sale of products', key: 'Sale of products' },
    { label: '(b) Sale of services', key: 'Sale of services' },
    { label: '(c) Other operating revenues', key: 'Other operating revenues' },
    { label: 'Uncategorised Revenue from operations', key: 'Uncategorised Revenue from operations', un: true },
    { label: '(2) Other Income', key: 'Other income' },
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
    { label: 'Uncategorised Other expenses', key: 'Uncategorised Other expenses', un: true },
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

  const renderStatement = (structure: any[], isPL = false) => {
    const scaleLabels: Record<string, string> = {
      '1': 'Rupees',
      '100': 'Hundreds',
      '1000': 'Thousands',
      '100000': 'Lakhs',
      '10000000': 'Crores',
    };

    let currentTotal = 0;
    let previousTotal = 0;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{companyName}</CardTitle>
            <p className="text-sm text-muted-foreground">CIN: {cin}</p>
            <CardTitle className="text-xl mt-2">{isPL ? 'Statement of Profit & Loss' : 'Balance Sheet as at 31 March ' + periodYear}</CardTitle>
            <p className="text-sm font-medium">(Amount in ₹ {scaleLabels[scale]})</p>
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

                    if (row.label === 'TOTAL' && !isPL) {
                      structure.forEach((r) => {
                        if (!r.h && !r.sub && r.key) {
                          currentTotal += currentYearData[deepClean(r.key)] || 0;
                          previousTotal += previousYearData[deepClean(r.key)] || 0;
                        }
                      });
                    }

                    let indent = '45px';
                    if (row.h) indent = '10px';
                    else if (row.sub && row.label.match(/^\([a-z]\)/)) indent = '50px';
                    else if (row.sub) indent = '25px';
                    else if (row.label.match(/^\([A-Z]\)/)) indent = '85px';
                    else if (row.label.match(/^\(i+v?\)/)) indent = '75px';

                    const showTotal = row.label === 'TOTAL';

                    return (
                      <tr
                        key={i}
                        className={`
                          ${row.h ? 'bg-slate-100 font-bold text-lg' : ''}
                          ${row.sub ? 'font-semibold bg-slate-50' : ''}
                          ${isAlert ? 'bg-red-50 text-red-700' : ''}
                          ${showTotal ? 'bg-blue-50 font-bold text-lg' : ''}
                        `}
                      >
                        <td style={{ paddingLeft: indent }} className={`px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
                          {row.label}
                        </td>
                        <td className={`text-center px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
                          {!row.h && !row.sub && !row.un ? row.note || '' : ''}
                        </td>
                        <td className={`text-right px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
                          {showTotal ? formatValue(currentTotal) : !row.h && !row.sub ? formatValue(currentVal) : ''}
                        </td>
                        <td className={`text-right px-3 py-2 border border-slate-200 ${isAlert ? 'text-red-700 text-xs' : ''}`}>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SRM Pro</h1>
          <p className="text-muted-foreground mt-1">Financial Statement Planner - Schedule III Format Generator</p>
        </div>
      </div>

      {activeTab !== 'upload' && (
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
              {(activeTab === 'balance-sheet' || activeTab === 'profit-loss' || activeTab === 'summary') && (
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
              )}
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
          <Card>
            <CardHeader>
              <CardTitle>Upload Tally Excel</CardTitle>
              <CardDescription>Required sheets: Mapping | Trial Balance | Hierarchy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="period-type">Period Type</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger id="period-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Year</SelectItem>
                    <SelectItem value="previous">Previous Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="financial-year">Financial Year (e.g., 2024)</Label>
                <Input
                  id="financial-year"
                  type="text"
                  placeholder="2024"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Excel File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Processing...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trial Balance Results</CardTitle>
              <CardDescription>Processed ledger data with category mappings</CardDescription>
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

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        {data[0] && Object.keys(data[0]).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data
                        .filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
                        .slice(0, 100)
                        .map((row, i) => (
                          <tr
                            key={i}
                            className={`border-b ${row['Mapped Category'] === 'NOT MAPPED' ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                          >
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap">
                                {val}
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
