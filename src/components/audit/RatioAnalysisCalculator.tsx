import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTrialBalance, TrialBalanceLine } from '@/hooks/useTrialBalance';
import { useEngagement } from '@/contexts/EngagementContext';
import { AlertCircle, Info, Upload, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FinancialRatios {
  // Liquidity Ratios
  currentRatio: number | null;
  quickRatio: number | null;
  cashRatio: number | null;
  
  // Profitability Ratios
  grossProfitMargin: number | null;
  netProfitMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  operatingProfitMargin: number | null;
  
  // Solvency Ratios
  debtToEquity: number | null;
  debtRatio: number | null;
  equityRatio: number | null;
  
  // Activity Ratios
  assetTurnover: number | null;
  inventoryTurnover: number | null;
  receivablesTurnover: number | null;
}

interface FinancialSummary {
  currentAssets: number;
  currentLiabilities: number;
  quickAssets: number;
  cashAndEquivalents: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  netProfit: number;
  inventory: number;
  receivables: number;
}

function categorizeAccount(line: TrialBalanceLine): {
  isAsset: boolean;
  isLiability: boolean;
  isEquity: boolean;
  isRevenue: boolean;
  isExpense: boolean;
  isCurrentAsset: boolean;
  isCurrentLiability: boolean;
} {
  const primaryGroup = (line.ledger_primary_group || '').toLowerCase();
  const accountName = (line.account_name || '').toLowerCase();
  const balance = line.closing_balance;
  
  // Assets
  const assetGroups = ['assets', 'fixed assets', 'current assets', 'bank', 'cash', 'stock-in-hand', 'sundry debtors', 'loans and advances'];
  const isAsset = assetGroups.some(g => primaryGroup.includes(g)) || 
                  (balance < 0 && !primaryGroup.includes('liability') && !primaryGroup.includes('capital'));
  
  // Current Assets
  const currentAssetGroups = ['current assets', 'bank', 'cash', 'stock-in-hand', 'sundry debtors', 'loans and advances', 'investments'];
  const isCurrentAsset = currentAssetGroups.some(g => primaryGroup.includes(g)) ||
                         accountName.includes('current asset') ||
                         accountName.includes('bank') ||
                         accountName.includes('cash') ||
                         accountName.includes('debtor') ||
                         accountName.includes('receivable');
  
  // Liabilities
  const liabilityGroups = ['liabilities', 'current liabilities', 'sundry creditors', 'duties and taxes', 'provisions'];
  const isLiability = liabilityGroups.some(g => primaryGroup.includes(g)) ||
                      (balance > 0 && primaryGroup.includes('liability'));
  
  // Current Liabilities
  const currentLiabilityGroups = ['current liabilities', 'sundry creditors', 'duties and taxes', 'provisions', 'bank overdraft'];
  const isCurrentLiability = currentLiabilityGroups.some(g => primaryGroup.includes(g)) ||
                            accountName.includes('creditor') ||
                            accountName.includes('payable');
  
  // Equity
  const equityGroups = ['capital', 'reserves and surplus', 'retained earnings', 'share capital'];
  const isEquity = equityGroups.some(g => primaryGroup.includes(g)) ||
                   accountName.includes('capital') ||
                   accountName.includes('equity');
  
  // Revenue
  const revenueGroups = ['income', 'sales', 'revenue', 'other income'];
  const isRevenue = revenueGroups.some(g => primaryGroup.includes(g)) ||
                    accountName.includes('sales') ||
                    accountName.includes('income') ||
                    accountName.includes('revenue');
  
  // Expenses
  const expenseGroups = ['expenses', 'purchases', 'cost of goods sold', 'operating expenses'];
  const isExpense = expenseGroups.some(g => primaryGroup.includes(g)) ||
                    accountName.includes('expense') ||
                    accountName.includes('purchase') ||
                    accountName.includes('cost');
  
  return {
    isAsset,
    isLiability,
    isEquity,
    isRevenue,
    isExpense,
    isCurrentAsset,
    isCurrentLiability,
  };
}

function calculateFinancialSummary(lines: TrialBalanceLine[]): FinancialSummary {
  let currentAssets = 0;
  let currentLiabilities = 0;
  let quickAssets = 0;
  let cashAndEquivalents = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let revenue = 0;
  let costOfGoodsSold = 0;
  let operatingExpenses = 0;
  let inventory = 0;
  let receivables = 0;
  
  lines.forEach(line => {
    const balance = Math.abs(line.closing_balance);
    const category = categorizeAccount(line);
    const primaryGroup = (line.ledger_primary_group || '').toLowerCase();
    const accountName = (line.account_name || '').toLowerCase();
    
    if (category.isCurrentAsset) {
      currentAssets += balance;
      totalAssets += balance;
      
      // Quick assets (current assets minus inventory)
      if (primaryGroup.includes('stock') || accountName.includes('inventory') || accountName.includes('stock')) {
        inventory += balance;
      } else {
        quickAssets += balance;
      }
      
      // Cash and equivalents
      if (primaryGroup.includes('cash') || primaryGroup.includes('bank') || 
          accountName.includes('cash') || accountName.includes('bank')) {
        cashAndEquivalents += balance;
        quickAssets += balance;
      }
      
      // Receivables
      if (primaryGroup.includes('debtor') || primaryGroup.includes('receivable') ||
          accountName.includes('debtor') || accountName.includes('receivable')) {
        receivables += balance;
        quickAssets += balance;
      }
    } else if (category.isAsset) {
      totalAssets += balance;
    }
    
    if (category.isCurrentLiability) {
      currentLiabilities += balance;
      totalLiabilities += balance;
    } else if (category.isLiability) {
      totalLiabilities += balance;
    }
    
    if (category.isEquity) {
      totalEquity += balance;
    }
    
    if (category.isRevenue) {
      revenue += balance;
    }
    
    if (category.isExpense) {
      if (primaryGroup.includes('purchase') || accountName.includes('purchase') || 
          primaryGroup.includes('cost of goods') || accountName.includes('cost of goods')) {
        costOfGoodsSold += balance;
      } else {
        operatingExpenses += balance;
      }
    }
  });
  
  const grossProfit = revenue - costOfGoodsSold;
  const operatingProfit = grossProfit - operatingExpenses;
  const netProfit = operatingProfit; // Simplified - assuming no other income/expenses
  
  return {
    currentAssets,
    currentLiabilities,
    quickAssets,
    cashAndEquivalents,
    totalAssets,
    totalLiabilities,
    totalEquity,
    revenue,
    costOfGoodsSold,
    grossProfit,
    operatingExpenses,
    operatingProfit,
    netProfit,
    inventory,
    receivables,
  };
}

function calculateRatios(summary: FinancialSummary): FinancialRatios {
  const ratios: FinancialRatios = {
    currentRatio: null,
    quickRatio: null,
    cashRatio: null,
    grossProfitMargin: null,
    netProfitMargin: null,
    returnOnEquity: null,
    returnOnAssets: null,
    operatingProfitMargin: null,
    debtToEquity: null,
    debtRatio: null,
    equityRatio: null,
    assetTurnover: null,
    inventoryTurnover: null,
    receivablesTurnover: null,
  };
  
  // Liquidity Ratios
  if (summary.currentLiabilities > 0) {
    ratios.currentRatio = summary.currentAssets / summary.currentLiabilities;
    ratios.quickRatio = summary.quickAssets / summary.currentLiabilities;
    ratios.cashRatio = summary.cashAndEquivalents / summary.currentLiabilities;
  }
  
  // Profitability Ratios
  if (summary.revenue > 0) {
    ratios.grossProfitMargin = (summary.grossProfit / summary.revenue) * 100;
    ratios.netProfitMargin = (summary.netProfit / summary.revenue) * 100;
    ratios.operatingProfitMargin = (summary.operatingProfit / summary.revenue) * 100;
  }
  
  if (summary.totalEquity > 0) {
    ratios.returnOnEquity = (summary.netProfit / summary.totalEquity) * 100;
  }
  
  if (summary.totalAssets > 0) {
    ratios.returnOnAssets = (summary.netProfit / summary.totalAssets) * 100;
    ratios.assetTurnover = summary.revenue / summary.totalAssets;
  }
  
  // Solvency Ratios
  if (summary.totalEquity > 0) {
    ratios.debtToEquity = summary.totalLiabilities / summary.totalEquity;
  }
  
  if (summary.totalAssets > 0) {
    ratios.debtRatio = summary.totalLiabilities / summary.totalAssets;
    ratios.equityRatio = summary.totalEquity / summary.totalAssets;
  }
  
  // Activity Ratios
  if (summary.inventory > 0) {
    ratios.inventoryTurnover = summary.costOfGoodsSold / summary.inventory;
  }
  
  if (summary.receivables > 0) {
    ratios.receivablesTurnover = summary.revenue / summary.receivables;
  }
  
  return ratios;
}

export default function RatioAnalysisCalculator() {
  const { currentEngagement } = useEngagement();
  const { lines, loading } = useTrialBalance(currentEngagement?.id);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const summary = useMemo(() => {
    if (!lines || lines.length === 0) return null;
    return calculateFinancialSummary(lines);
  }, [lines]);
  
  const ratios = useMemo(() => {
    if (!summary) return null;
    return calculateRatios(summary);
  }, [summary]);
  
  const handleExport = () => {
    if (!summary || !ratios) {
      toast({
        title: "No Data",
        description: "No trial balance data available to export",
        variant: "destructive",
      });
      return;
    }
    
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
      ["Financial Summary"],
      ["Current Assets", summary.currentAssets],
      ["Current Liabilities", summary.currentLiabilities],
      ["Quick Assets", summary.quickAssets],
      ["Cash and Equivalents", summary.cashAndEquivalents],
      ["Total Assets", summary.totalAssets],
      ["Total Liabilities", summary.totalLiabilities],
      ["Total Equity", summary.totalEquity],
      ["Revenue", summary.revenue],
      ["Cost of Goods Sold", summary.costOfGoodsSold],
      ["Gross Profit", summary.grossProfit],
      ["Operating Expenses", summary.operatingExpenses],
      ["Operating Profit", summary.operatingProfit],
      ["Net Profit", summary.netProfit],
      ["Inventory", summary.inventory],
      ["Receivables", summary.receivables],
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Financial Summary");
    
    // Ratios Sheet
    const ratiosData = [
      ["Financial Ratios"],
      ["Liquidity Ratios"],
      ["Current Ratio", ratios.currentRatio?.toFixed(2) || "N/A"],
      ["Quick Ratio", ratios.quickRatio?.toFixed(2) || "N/A"],
      ["Cash Ratio", ratios.cashRatio?.toFixed(2) || "N/A"],
      [],
      ["Profitability Ratios"],
      ["Gross Profit Margin (%)", ratios.grossProfitMargin?.toFixed(2) || "N/A"],
      ["Net Profit Margin (%)", ratios.netProfitMargin?.toFixed(2) || "N/A"],
      ["Operating Profit Margin (%)", ratios.operatingProfitMargin?.toFixed(2) || "N/A"],
      ["Return on Equity (%)", ratios.returnOnEquity?.toFixed(2) || "N/A"],
      ["Return on Assets (%)", ratios.returnOnAssets?.toFixed(2) || "N/A"],
      [],
      ["Solvency Ratios"],
      ["Debt to Equity", ratios.debtToEquity?.toFixed(2) || "N/A"],
      ["Debt Ratio", ratios.debtRatio?.toFixed(2) || "N/A"],
      ["Equity Ratio", ratios.equityRatio?.toFixed(2) || "N/A"],
      [],
      ["Activity Ratios"],
      ["Asset Turnover", ratios.assetTurnover?.toFixed(2) || "N/A"],
      ["Inventory Turnover", ratios.inventoryTurnover?.toFixed(2) || "N/A"],
      ["Receivables Turnover", ratios.receivablesTurnover?.toFixed(2) || "N/A"],
    ];
    
    const ratiosWs = XLSX.utils.aoa_to_sheet(ratiosData);
    XLSX.utils.book_append_sheet(wb, ratiosWs, "Financial Ratios");
    
    const fileName = `Ratio_Analysis_${currentEngagement?.client_name || 'Company'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Export Complete",
      description: `Ratio analysis exported to ${fileName}`,
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading trial balance data...</p>
      </div>
    );
  }
  
  if (!lines || lines.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No trial balance data found for this engagement. Please import trial balance data to calculate financial ratios.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>How to Import Trial Balance Data</CardTitle>
            <CardDescription>Follow these steps to import your trial balance data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Option 1: Import from Tally (Recommended)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to <strong>VERA Tools → Tally</strong> tab, connect to Tally, and fetch Trial Balance. 
                    Then use the "Use in Trial Balance" button to save it to your engagement.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Option 2: Import from Excel</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to <strong>Trial Balance</strong> page and use the Import Excel button to upload your trial balance file.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Option 3: Manual Entry</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to <strong>Trial Balance</strong> page and manually add trial balance lines.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={() => navigate('/trial-balance')} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Go to Trial Balance Page
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={() => navigate('/audit-tools')} variant="outline" className="flex-1">
                Go to VERA Tools
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!summary || !ratios) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to calculate ratios. Please ensure trial balance data is properly categorized.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Financial Ratio Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Calculated from trial balance data for {currentEngagement?.client_name || 'the company'}
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Ratios are calculated based on account categorization. Please verify the categorization of accounts in your trial balance.
        </AlertDescription>
      </Alert>
      
      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>Key financial figures from trial balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Assets</p>
              <p className="text-lg font-semibold">{summary.currentAssets.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Liabilities</p>
              <p className="text-lg font-semibold">{summary.currentLiabilities.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-lg font-semibold">{summary.totalAssets.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Equity</p>
              <p className="text-lg font-semibold">{summary.totalEquity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-lg font-semibold">{summary.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gross Profit</p>
              <p className="text-lg font-semibold">{summary.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className="text-lg font-semibold">{summary.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inventory</p>
              <p className="text-lg font-semibold">{summary.inventory.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Liquidity Ratios */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Ratios</CardTitle>
          <CardDescription>Measure the company's ability to meet short-term obligations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ratio</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Interpretation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Current Ratio</TableCell>
                <TableCell>{ratios.currentRatio?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.currentRatio !== null && (
                    <Badge variant={ratios.currentRatio >= 1 ? "default" : "destructive"}>
                      {ratios.currentRatio >= 2 ? "Excellent" : ratios.currentRatio >= 1 ? "Good" : "Poor"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Quick Ratio</TableCell>
                <TableCell>{ratios.quickRatio?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.quickRatio !== null && (
                    <Badge variant={ratios.quickRatio >= 1 ? "default" : "destructive"}>
                      {ratios.quickRatio >= 1 ? "Good" : "Poor"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cash Ratio</TableCell>
                <TableCell>{ratios.cashRatio?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.cashRatio !== null && (
                    <Badge variant={ratios.cashRatio >= 0.2 ? "default" : "secondary"}>
                      {ratios.cashRatio >= 0.2 ? "Adequate" : "Low"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Profitability Ratios */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Ratios</CardTitle>
          <CardDescription>Measure the company's ability to generate profits</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ratio</TableHead>
                <TableHead>Value (%)</TableHead>
                <TableHead>Interpretation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Gross Profit Margin</TableCell>
                <TableCell>{ratios.grossProfitMargin?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.grossProfitMargin !== null && (
                    <Badge variant={ratios.grossProfitMargin > 20 ? "default" : ratios.grossProfitMargin > 10 ? "secondary" : "destructive"}>
                      {ratios.grossProfitMargin > 20 ? "Strong" : ratios.grossProfitMargin > 10 ? "Moderate" : "Weak"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Net Profit Margin</TableCell>
                <TableCell>{ratios.netProfitMargin?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.netProfitMargin !== null && (
                    <Badge variant={ratios.netProfitMargin > 10 ? "default" : ratios.netProfitMargin > 5 ? "secondary" : "destructive"}>
                      {ratios.netProfitMargin > 10 ? "Strong" : ratios.netProfitMargin > 5 ? "Moderate" : "Weak"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Operating Profit Margin</TableCell>
                <TableCell>{ratios.operatingProfitMargin?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.operatingProfitMargin !== null && (
                    <Badge variant={ratios.operatingProfitMargin > 15 ? "default" : ratios.operatingProfitMargin > 8 ? "secondary" : "destructive"}>
                      {ratios.operatingProfitMargin > 15 ? "Strong" : ratios.operatingProfitMargin > 8 ? "Moderate" : "Weak"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Return on Equity (ROE)</TableCell>
                <TableCell>{ratios.returnOnEquity?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.returnOnEquity !== null && (
                    <Badge variant={ratios.returnOnEquity > 15 ? "default" : ratios.returnOnEquity > 10 ? "secondary" : "destructive"}>
                      {ratios.returnOnEquity > 15 ? "Excellent" : ratios.returnOnEquity > 10 ? "Good" : "Poor"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Return on Assets (ROA)</TableCell>
                <TableCell>{ratios.returnOnAssets?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.returnOnAssets !== null && (
                    <Badge variant={ratios.returnOnAssets > 5 ? "default" : ratios.returnOnAssets > 3 ? "secondary" : "destructive"}>
                      {ratios.returnOnAssets > 5 ? "Good" : ratios.returnOnAssets > 3 ? "Moderate" : "Poor"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Solvency Ratios */}
      <Card>
        <CardHeader>
          <CardTitle>Solvency Ratios</CardTitle>
          <CardDescription>Measure the company's long-term financial stability</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ratio</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Interpretation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Debt to Equity</TableCell>
                <TableCell>{ratios.debtToEquity?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.debtToEquity !== null && (
                    <Badge variant={ratios.debtToEquity < 1 ? "default" : ratios.debtToEquity < 2 ? "secondary" : "destructive"}>
                      {ratios.debtToEquity < 1 ? "Low Risk" : ratios.debtToEquity < 2 ? "Moderate" : "High Risk"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Debt Ratio</TableCell>
                <TableCell>{ratios.debtRatio?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.debtRatio !== null && (
                    <Badge variant={ratios.debtRatio < 0.5 ? "default" : ratios.debtRatio < 0.7 ? "secondary" : "destructive"}>
                      {ratios.debtRatio < 0.5 ? "Low" : ratios.debtRatio < 0.7 ? "Moderate" : "High"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Equity Ratio</TableCell>
                <TableCell>{ratios.equityRatio?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.equityRatio !== null && (
                    <Badge variant={ratios.equityRatio > 0.5 ? "default" : ratios.equityRatio > 0.3 ? "secondary" : "destructive"}>
                      {ratios.equityRatio > 0.5 ? "Strong" : ratios.equityRatio > 0.3 ? "Moderate" : "Weak"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Activity Ratios */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Ratios</CardTitle>
          <CardDescription>Measure how efficiently the company uses its assets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ratio</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Interpretation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Asset Turnover</TableCell>
                <TableCell>{ratios.assetTurnover?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.assetTurnover !== null && (
                    <Badge variant={ratios.assetTurnover > 1 ? "default" : "secondary"}>
                      {ratios.assetTurnover > 1 ? "Efficient" : "Low"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Inventory Turnover</TableCell>
                <TableCell>{ratios.inventoryTurnover?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.inventoryTurnover !== null && (
                    <Badge variant={ratios.inventoryTurnover > 4 ? "default" : ratios.inventoryTurnover > 2 ? "secondary" : "destructive"}>
                      {ratios.inventoryTurnover > 4 ? "Fast" : ratios.inventoryTurnover > 2 ? "Moderate" : "Slow"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Receivables Turnover</TableCell>
                <TableCell>{ratios.receivablesTurnover?.toFixed(2) || "N/A"}</TableCell>
                <TableCell>
                  {ratios.receivablesTurnover !== null && (
                    <Badge variant={ratios.receivablesTurnover > 6 ? "default" : ratios.receivablesTurnover > 4 ? "secondary" : "destructive"}>
                      {ratios.receivablesTurnover > 6 ? "Fast" : ratios.receivablesTurnover > 4 ? "Moderate" : "Slow"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
