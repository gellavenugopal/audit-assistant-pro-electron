import { useState } from "react";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTabShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEngagement } from "@/contexts/EngagementContext";
import { useTallyODBC } from "@/hooks/useTallyODBC";

// Type definitions (moved from TallyContext)
export interface TallyTrialBalanceLine {
  accountHead: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  accountCode: string;
  branch: string;
  primaryGroup: string;
  parent: string;
  isRevenue: boolean;
}

export interface TallyMonthWiseLine {
  accountName: string;
  primaryGroup: string;
  isRevenue: boolean;
  openingBalance: number;
  monthlyBalances: Record<string, number>;
}

export interface TallyGSTNotFeedLine {
  ledgerName: string;
  primaryGroup: string;
  partyGSTIN: string | null;
  registrationType: string;
  gstRegistrationType?: string; // Alias for compatibility
}

// Extend Window interface for Electron API
declare global {
  interface Window {
    electronAPI: {
      odbcCheckConnection: () => Promise<{ success: boolean; isConnected?: boolean; error?: string }>;
      odbcTestConnection: () => Promise<{ success: boolean; error?: string; driver?: string; sampleData?: any }>;
      odbcFetchTrialBalance: () => Promise<{ success: boolean; error?: string; data?: any[] }>;
      odbcDisconnect: () => Promise<{ success: boolean; error?: string }>;
      odbcFetchOldTallyLedgers: () => Promise<{ success: boolean; error?: string; data?: any[] }>;
      odbcFetchNewTallyLedgers: () => Promise<{ success: boolean; error?: string; data?: any[] }>;
      odbcCompareOpeningBalances: (data: { oldData: any[]; newData: any[] }) => Promise<{
        success: boolean;
        error?: string;
        comparison?: {
          balanceMismatches: any[];
          nameMismatches: any[];
        };
        xml?: string;
      }>;
      odbcFetchMonthWiseData: (data: { fyStartYear: number; targetMonth: string }) => Promise<{
        success: boolean;
        error?: string;
        lines?: any[];
        months?: string[];
      }>;
      odbcFetchGSTNotFeeded: () => Promise<{
        success: boolean;
        error?: string;
        lines?: any[];
      }>;
    };
  }
}

import { useOpeningBalanceMatching } from "@/hooks/useOpeningBalanceMatching";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import {
  Database,
  FileSpreadsheet,
  Building2,
  Receipt,
  FileText,
  Download,
  Upload,
  Search,
  RefreshCw,
  FileJson,
  FilePlus,
  Scissors,
  FileType,
  Table,
  Shield,
  AlertTriangle,
  AlertCircle,
  Bell,
  Users,
  CreditCard,
  Calculator,
  Merge,
  Eye,
  CheckCircle2,
  Loader2,
  Unplug,
  Scale,
  FileDown,
} from "lucide-react";

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: "available" | "coming-soon" | "beta";
  onClick?: () => void;
}

const ToolCard = ({ title, description, icon, status = "available", onClick }: ToolCardProps) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
        status === "coming-soon" ? "opacity-60" : ""
      }`}
      onClick={status !== "coming-soon" ? onClick : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          {status === "coming-soon" && (
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          )}
          {status === "beta" && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Beta</Badge>
          )}
        </div>
        <CardTitle className="text-base mt-3">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  );
};

type ConnectionMode = "odbc" | "excel";

const TallyTools = () => {
  const { toast } = useToast();
  const { currentEngagement } = useEngagement();
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("odbc");
  
  // Trial Balance fetch state
  const [showTBDialog, setShowTBDialog] = useState(false);
  const [tbFromDate, setTbFromDate] = useState("2024-04-01");
  const [tbToDate, setTbToDate] = useState("2025-03-31");
  const [isFetchingTB, setIsFetchingTB] = useState(false);
  const [fetchedTBData, setFetchedTBData] = useState<TallyTrialBalanceLine[] | null>(null);
  
  // Month wise data fetch state
  const [showMonthWiseDialog, setShowMonthWiseDialog] = useState(false);
  const [mwFyStartYear, setMwFyStartYear] = useState(new Date().getFullYear());
  const [mwTargetMonth, setMwTargetMonth] = useState("Mar");
  const [isFetchingMW, setIsFetchingMW] = useState(false);
  const [fetchedMWData, setFetchedMWData] = useState<{ lines: TallyMonthWiseLine[]; months: string[] } | null>(null);
  
  // GST Not Feeded state
  const [showGSTNotFeedDialog, setShowGSTNotFeedDialog] = useState(false);
  const [isFetchingGSTNotFeed, setIsFetchingGSTNotFeed] = useState(false);
  const [fetchedGSTNotFeedData, setFetchedGSTNotFeedData] = useState<TallyGSTNotFeedLine[] | null>(null);
  
  // Negative Ledgers state
  const [showNegativeLedgersDialog, setShowNegativeLedgersDialog] = useState(false);
  const [negativeLedgersTab, setNegativeLedgersTab] = useState("debtors");
  
  // ODBC Info Dialog state
  const [showODBCInfoDialog, setShowODBCInfoDialog] = useState(false);
  
  // Opening Balance Matching state
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const openingBalanceMatching = useOpeningBalanceMatching();
  
  // ODBC connection (only connection method)
  const odbcConnection = useTallyODBC();
  
  // Use ODBC connection
  const isConnected = odbcConnection.isConnected;
  const isConnecting = odbcConnection.isConnecting;
  const companyInfo = odbcConnection.companyInfo;

  const handleConnect = () => {
    if (isConnected) {
      odbcConnection.disconnect();
    } else {
      odbcConnection.testConnection();
    }
  };

  const handleFetchTrialBalance = async () => {
    setIsFetchingTB(true);
    try {
      const lines = await odbcConnection.fetchTrialBalance(tbFromDate, tbToDate);
      if (lines && lines.length > 0) {
        setFetchedTBData(lines);
        toast({
          title: "Trial Balance Fetched",
          description: `Retrieved ${lines.length} ledger accounts from Tally`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Fetch Trial Balance",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsFetchingTB(false);
    }
  };

  const handleExportToExcel = () => {
    if (!fetchedTBData || fetchedTBData.length === 0) return;

    // Function to build hierarchy levels
    const buildHierarchy = (data: TallyTrialBalanceLine[]) => {
      return data.map(line => {
        const hierarchy = [line.accountHead];
        
        // Build hierarchy based on primary group and revenue type
        if (line.isRevenue) {
          // Revenue accounts
          hierarchy.push(line.parent || 'Revenue Accounts');
          hierarchy.push('Revenue from Operations');
          hierarchy.push('Income');
          hierarchy.push(''); // Level 5
        } else {
          // Balance sheet accounts
          hierarchy.push(line.parent || line.primaryGroup);
          
          // Determine main category based on primary group
          if (['Bank Accounts', 'Cash-in-hand', 'Deposits', 'Loans & Advances', 'Sundry Debtors'].includes(line.primaryGroup)) {
            hierarchy.push('Current Assets');
            hierarchy.push('Assets');
            hierarchy.push('');
          } else if (['Sundry Creditors', 'Duties & Taxes', 'Provisions'].includes(line.primaryGroup)) {
            hierarchy.push('Current Liabilities');
            hierarchy.push('Liabilities');
            hierarchy.push('');
          } else if (['Share Capital', 'Reserves & Surplus'].includes(line.primaryGroup)) {
            hierarchy.push('Shareholders\' Funds');
            hierarchy.push('Liabilities');
            hierarchy.push('');
          } else if (['Fixed Assets', 'Investments'].includes(line.primaryGroup)) {
            hierarchy.push('Non-Current Assets');
            hierarchy.push('Assets');
            hierarchy.push('');
          } else {
            // Default categorization
            hierarchy.push(line.primaryGroup);
            hierarchy.push('Assets'); // Default to assets
            hierarchy.push('');
          }
        }
        
        return {
          "Account Head": hierarchy[0],
          "Parent 1": hierarchy[1],
          "Parent 2": hierarchy[2],
          "Parent 3": hierarchy[3],
          "Parent 4": hierarchy[4],
          "Parent 5": hierarchy[5] || '',
        };
      });
    };

    const wb = XLSX.utils.book_new();

    // Sheet 1: Trial Balance Data
    const trialBalanceData = fetchedTBData.map(line => ({
      "Account Head": line.accountHead,
      "Opening Balance": line.openingBalance,
      "Total Debit": line.totalDebit,
      "Total Credit": line.totalCredit,
      "Closing Balance": line.closingBalance,
      "Account Code": line.accountCode,
      "Branch": line.branch,
    }));

    const trialBalanceWs = XLSX.utils.json_to_sheet(trialBalanceData);
    const colWidths = [
      { wch: 30 }, // Account Head
      { wch: 15 }, // Opening Balance
      { wch: 12 }, // Total Debit
      { wch: 12 }, // Total Credit
      { wch: 15 }, // Closing Balance
      { wch: 15 }, // Account Code
      { wch: 10 }, // Branch
    ];
    trialBalanceWs['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, trialBalanceWs, "Trial Balance");

    // Sheet 2: Hierarchy
    const hierarchyData = buildHierarchy(fetchedTBData);
    const hierarchyWs = XLSX.utils.json_to_sheet(hierarchyData);
    const hierarchyColWidths = [
      { wch: 30 }, // Account Head
      { wch: 25 }, // Parent 1
      { wch: 25 }, // Parent 2
      { wch: 20 }, // Parent 3
      { wch: 20 }, // Parent 4
      { wch: 20 }, // Parent 5
    ];
    hierarchyWs['!cols'] = hierarchyColWidths;
    XLSX.utils.book_append_sheet(wb, hierarchyWs, "Hierarchy");

    const fileName = `Trial_Balance_${tbFromDate}_to_${tbToDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    const plCount = fetchedTBData.filter(line => line.isRevenue).length;
    const bsCount = fetchedTBData.filter(line => !line.isRevenue).length;
    
    toast({
      title: "Export Complete",
      description: `Saved ${plCount} P&L and ${bsCount} Balance Sheet items to ${fileName}`,
    });
  };

  const handleFetchMonthWiseData = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Connect to Tally first using ODBC",
        variant: "destructive",
      });
      return;
    }
    
    setIsFetchingMW(true);
    try {
      if (!window.electronAPI || typeof window.electronAPI.odbcFetchMonthWiseData !== 'function') {
        throw new Error('Electron API not available. Please restart the application.');
      }
      
      const result = await window.electronAPI.odbcFetchMonthWiseData({
        fyStartYear: mwFyStartYear,
        targetMonth: mwTargetMonth,
      });
      
      if (result && result.success) {
        setFetchedMWData({ lines: result.lines, months: result.months });
        toast({
          title: "Month wise Data Fetched",
          description: `Retrieved ${result.lines.length} ledger accounts for ${result.months.join(", ")}`,
        });
      } else {
        throw new Error(result?.error || "Failed to fetch month wise data");
      }
    } catch (error) {
      toast({
        title: "Failed to Fetch Month Wise Data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsFetchingMW(false);
    }
  };

  const handleExportMonthWiseToExcel = () => {
    if (!fetchedMWData || fetchedMWData.lines.length === 0) return;
    
    const { lines, months } = fetchedMWData;
    
    // Separate P&L and Balance Sheet items
    const plItems = lines.filter(line => line.isRevenue);
    const bsItems = lines.filter(line => !line.isRevenue);
    
    const formatRow = (line: TallyMonthWiseLine, isPL: boolean) => {
      const row: Record<string, string | number> = {
        "Ledger Name": line.accountName,
        "Primary Group": line.primaryGroup,
      };
      
      // For P&L, calculate movement (current - previous)
      // For BS, show absolute closing balances
      if (isPL) {
        months.forEach((month, idx) => {
          if (idx === 0) {
            // Movement for first month = closing - opening
            row[month] = (line.monthlyBalances[month] || 0) - line.openingBalance;
          } else {
            // Movement = current - previous month
            const prevMonth = months[idx - 1];
            row[month] = (line.monthlyBalances[month] || 0) - (line.monthlyBalances[prevMonth] || 0);
          }
        });
      } else {
        months.forEach(month => {
          row[month] = line.monthlyBalances[month] || 0;
        });
      }
      
      return row;
    };
    
    const wb = XLSX.utils.book_new();
    
    // P&L Sheet
    if (plItems.length > 0) {
      const plData = plItems.map(line => formatRow(line, true));
      // Add grand total row
      const plTotals: Record<string, string | number> = { "Ledger Name": "GRAND TOTAL", "Primary Group": "" };
      months.forEach(month => {
        plTotals[month] = plData.reduce((sum, row) => sum + (Number(row[month]) || 0), 0);
      });
      plData.push(plTotals);
      
      const plWs = XLSX.utils.json_to_sheet(plData);
      XLSX.utils.book_append_sheet(wb, plWs, "Profit_Loss");
    }
    
    // Balance Sheet
    if (bsItems.length > 0) {
      const bsData = bsItems.map(line => formatRow(line, false));
      // Add grand total row
      const bsTotals: Record<string, string | number> = { "Ledger Name": "GRAND TOTAL", "Primary Group": "" };
      months.forEach(month => {
        bsTotals[month] = bsData.reduce((sum, row) => sum + (Number(row[month]) || 0), 0);
      });
      bsData.push(bsTotals);
      
      const bsWs = XLSX.utils.json_to_sheet(bsData);
      XLSX.utils.book_append_sheet(wb, bsWs, "Balance_Sheet");
    }
    
    const fileName = `Financial_Report_${mwFyStartYear}_${mwTargetMonth}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Export Complete",
      description: `Saved month wise data to ${fileName}`,
    });
  };

  const handleFetchGSTNotFeed = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Connect to Tally first using ODBC",
        variant: "destructive",
      });
      return;
    }
    
    setIsFetchingGSTNotFeed(true);
    try {
      if (!window.electronAPI || typeof window.electronAPI.odbcFetchGSTNotFeeded !== 'function') {
        throw new Error('Electron API not available. Please restart the application.');
      }
      
      const result = await window.electronAPI.odbcFetchGSTNotFeeded();
      
      if (result && result.success) {
        setFetchedGSTNotFeedData(result.lines);
        toast({
          title: "GST Not Feeded Data Fetched",
          description: `Found ${result.lines.length} ledgers with missing GSTIN`,
        });
      } else {
        throw new Error(result?.error || "Failed to fetch GST not feeded data");
      }
    } catch (error) {
      toast({
        title: "Failed to Fetch GST Not Feeded Data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsFetchingGSTNotFeed(false);
    }
  };

  const handleExportGSTNotFeedToExcel = () => {
    if (!fetchedGSTNotFeedData || fetchedGSTNotFeedData.length === 0) return;
    
    const data = fetchedGSTNotFeedData.map(line => ({
      "Ledger Name": line.ledgerName,
      "GST Registration Type": line.registrationType || line.gstRegistrationType || "Unknown",
      "Party GSTIN": line.partyGSTIN || "(Not Feeded)",
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "GST_Not_Feeded");
    
    const fileName = `GST_Not_Feeded_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Export Complete",
      description: `Saved ${fetchedGSTNotFeedData.length} ledgers to ${fileName}`,
    });
  };

  // Negative Ledgers - accounts with opposite balances
  const getNegativeLedgers = () => {
    if (!fetchedTBData) return { debtors: [], creditors: [], assets: [], liabilities: [] };
    
    // Debtors should have Dr balance (positive), so Cr balance (negative/closingBalance < 0) is opposite
    const debtors = fetchedTBData.filter(line => 
      line.primaryGroup === "Sundry Debtors" && line.closingBalance < 0
    );
    
    // Creditors should have Cr balance (negative), so Dr balance (positive/closingBalance > 0) is opposite
    const creditors = fetchedTBData.filter(line => 
      line.primaryGroup === "Sundry Creditors" && line.closingBalance > 0
    );
    
    // Assets should have Dr balance (positive), so Cr balance (negative) is opposite
    const assetGroups = ["Fixed Assets", "Current Assets", "Investments", "Bank Accounts", "Cash-in-Hand", "Deposits (Asset)", "Loans & Advances (Asset)", "Stock-in-Hand", "Bank OD Accounts"];
    const assets = fetchedTBData.filter(line => 
      assetGroups.includes(line.primaryGroup) && line.closingBalance < 0
    );
    
    // Liabilities should have Cr balance (negative), so Dr balance (positive) is opposite
    const liabilityGroups = ["Capital Account", "Reserves & Surplus", "Loans (Liability)", "Secured Loans", "Unsecured Loans", "Current Liabilities", "Provisions", "Duties & Taxes"];
    const liabilities = fetchedTBData.filter(line => 
      liabilityGroups.includes(line.primaryGroup) && line.closingBalance > 0
    );
    
    return { debtors, creditors, assets, liabilities };
  };

  const handleExportNegativeLedgersToExcel = () => {
    const { debtors, creditors, assets, liabilities } = getNegativeLedgers();
    
    const formatRow = (line: TallyTrialBalanceLine, expectedNature: string) => {
      const closingCr = line.closingBalance < 0 ? Math.abs(line.closingBalance) : 0;
      const closingDr = line.closingBalance > 0 ? line.closingBalance : 0;
      return {
        "Account Name": line.accountHead,
        "Primary Group": line.primaryGroup,
        "Parent": line.parent,
        "Expected Nature": expectedNature,
        "Actual Balance": expectedNature === "Dr" ? `Cr ${formatCurrency(closingCr)}` : `Dr ${formatCurrency(closingDr)}`,
        "Amount": expectedNature === "Dr" ? closingCr : closingDr,
      };
    };
    
    const wb = XLSX.utils.book_new();
    
    if (debtors.length > 0) {
      const ws = XLSX.utils.json_to_sheet(debtors.map(l => formatRow(l, "Dr")));
      XLSX.utils.book_append_sheet(wb, ws, "Debtors_Cr_Bal");
    }
    
    if (creditors.length > 0) {
      const ws = XLSX.utils.json_to_sheet(creditors.map(l => formatRow(l, "Cr")));
      XLSX.utils.book_append_sheet(wb, ws, "Creditors_Dr_Bal");
    }
    
    if (assets.length > 0) {
      const ws = XLSX.utils.json_to_sheet(assets.map(l => formatRow(l, "Dr")));
      XLSX.utils.book_append_sheet(wb, ws, "Assets_Cr_Bal");
    }
    
    if (liabilities.length > 0) {
      const ws = XLSX.utils.json_to_sheet(liabilities.map(l => formatRow(l, "Cr")));
      XLSX.utils.book_append_sheet(wb, ws, "Liabilities_Dr_Bal");
    }
    
    const fileName = `Negative_Ledgers_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Export Complete",
      description: `Saved negative ledgers to ${fileName}`,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const totalClosingBalance = fetchedTBData?.reduce((sum, line) => sum + line.closingBalance, 0) || 0;


  return (
    <div className="space-y-6">
      {/* Connection Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={connectionMode === "odbc" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowODBCInfoDialog(true);
          }}
          disabled={isConnected}
        >
          <Database className="h-4 w-4 mr-2" />
          ODBC Direct
        </Button>
        <Button
          variant={connectionMode === "excel" ? "default" : "outline"}
          size="sm"
          onClick={() => setConnectionMode("excel")}
          disabled={isConnected}
        >
          <Upload className="h-4 w-4 mr-2" />
          Excel Import
        </Button>
      </div>

      {/* ODBC Mode UI */}
      {connectionMode === "odbc" && (
        <div className="bg-muted/50 rounded-lg p-4 border space-y-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Direct ODBC Connection to Tally</p>
              <p>Connect directly to Tally using ODBC. Ensure Tally is running with ODBC enabled.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {isConnected ? (
              <Button onClick={handleConnect} size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ODBC Connected
              </Button>
            ) : (
              <Button onClick={handleConnect} size="sm" disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Test ODBC Connection
                  </>
                )}
              </Button>
            )}

            {/* Show connection status */}
            {isConnected && (
              <div className="flex items-center gap-4 ml-2 pl-4 border-l">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">ODBC Connection Active</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => odbcConnection.disconnect()}
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Excel Import Mode UI */}
      {connectionMode === "excel" && (
        <div className="bg-muted/50 rounded-lg p-4 border space-y-4">
          <div className="flex items-start gap-3">
            <Upload className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Excel/CSV Import from Tally</p>
              <p>Export your Trial Balance from Tally as Excel/CSV and import it into the system. This is a manual process but works reliably.</p>
            </div>
          </div>
          
          <Button size="sm" onClick={() => toast({ title: "Coming Soon", description: "Use Trial Balance > Import button to import Excel files" })}>
            <Upload className="h-4 w-4 mr-2" />
            Import Trial Balance
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          title="Get Trial Balance from Tally"
          description="Extract Trial Balance directly from Tally ERP for the selected period. Automatically maps to audit worksheet format."
          icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
          status={isConnected ? "available" : "beta"}
          onClick={() => {
            if (!isConnected) {
              const modeName = connectionMode === "odbc" ? "ODBC" : "selected method";
              toast({ title: "Not Connected", description: `Connect to Tally first using the ${modeName}` });
            } else {
              setShowTBDialog(true);
            }
          }}
        />
        <ToolCard
          title="Query on Transactions"
          description="Run custom queries on Tally ledger transactions. Filter by date, voucher type, party name, and amount range."
          icon={<Search className="h-5 w-5 text-primary" />}
          status="beta"
          onClick={() => toast({ title: "Feature in beta", description: "Transaction query is being tested" })}
        />
        <ToolCard
          title="Ledger Extraction"
          description="Extract specific ledger accounts with all transaction details for verification and vouching."
          icon={<Database className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Daybook Export"
          description="Export daybook/journal register for any period with party details and narrations."
          icon={<Table className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Get Month wise Data"
          description="Extract month wise data for analysis. Get P&L movement and Balance Sheet snapshots."
          icon={<Calendar className="h-5 w-5 text-primary" />}
          status={isConnected ? "available" : "beta"}
          onClick={() => {
            if (!isConnected) {
              toast({ title: "Not Connected", description: "Connect to Tally first using ODBC" });
            } else {
              setShowMonthWiseDialog(true);
            }
          }}
        />
        <ToolCard
          title="GST Number Not Feeded"
          description="Find parties with Regular GST registration but missing GSTIN. Identifies data entry gaps."
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          status={isConnected ? "available" : "beta"}
          onClick={() => {
            if (!isConnected) {
              toast({ title: "Not Connected", description: "Connect to Tally first using ODBC" });
            } else {
              setShowGSTNotFeedDialog(true);
            }
          }}
        />
        <ToolCard
          title="Negative Ledgers"
          description="Find accounts with opposite balances - Debtors with Cr, Creditors with Dr, Assets with Cr, Liabilities with Dr."
          icon={<AlertCircle className="h-5 w-5 text-primary" />}
          status={fetchedTBData ? "available" : "beta"}
          onClick={() => {
            if (!fetchedTBData) {
              toast({ title: "Fetch Trial Balance First", description: "Use 'Get Trial Balance from Tally' to fetch data first" });
            } else {
              setShowNegativeLedgersDialog(true);
            }
          }}
        />
        <ToolCard
          title="Opening Balance Matching"
          description="Compare opening balances between Old and New Tally instances. Generate XML to import old balances into new Tally."
          icon={<Scale className="h-5 w-5 text-primary" />}
          status={isConnected ? "available" : "beta"}
          onClick={() => {
            if (!isConnected) {
              const modeName = connectionMode === "odbc" ? "ODBC" : "selected method";
              toast({ title: "Not Connected", description: `Connect to Tally first using the ${modeName}` });
            } else {
              setShowOpeningBalanceDialog(true);
            }
          }}
        />
      </div>

      {/* Trial Balance Fetch Dialog */}
      <Dialog open={showTBDialog} onOpenChange={setShowTBDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Fetch Trial Balance from Tally
            </DialogTitle>
            <DialogDescription>
              Select the period and fetch Trial Balance data directly from Tally ERP
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Period Selection */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="tbFromDate">From:</Label>
                <Input
                  id="tbFromDate"
                  type="date"
                  value={tbFromDate}
                  onChange={(e) => setTbFromDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="tbToDate">To:</Label>
                <Input
                  id="tbToDate"
                  type="date"
                  value={tbToDate}
                  onChange={(e) => setTbToDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={handleFetchTrialBalance} disabled={isFetchingTB}>
                {isFetchingTB ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch from Tally
                  </>
                )}
              </Button>
            </div>

            {/* Results Table */}
            {fetchedTBData && fetchedTBData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Account Head</th>
                        <th className="text-right p-2 font-medium">Opening Balance</th>
                        <th className="text-right p-2 font-medium">Total Debit</th>
                        <th className="text-right p-2 font-medium">Total Credit</th>
                        <th className="text-right p-2 font-medium">Closing Balance</th>
                        <th className="text-left p-2 font-medium">Account Code</th>
                        <th className="text-left p-2 font-medium">Branch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedTBData.map((line, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50">
                          <td className="p-2">{line.accountHead}</td>
                          <td className="p-2 text-right font-mono text-xs">{formatCurrency(line.openingBalance)}</td>
                          <td className="p-2 text-right font-mono text-xs">{formatCurrency(line.totalDebit)}</td>
                          <td className="p-2 text-right font-mono text-xs">{formatCurrency(line.totalCredit)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(line.closingBalance)}</td>
                          <td className="p-2 text-muted-foreground text-xs">{line.accountCode}</td>
                          <td className="p-2 text-muted-foreground text-xs">{line.branch}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted font-medium sticky bottom-0">
                      <tr className="border-t-2">
                        <td colSpan={4} className="p-2 text-right">Total Closing Balance:</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(totalClosingBalance)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Summary & Save */}
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {fetchedTBData.length} accounts • 
                    Total Closing Balance: {formatCurrency(totalClosingBalance)}
                    {Math.abs(totalClosingBalance) > 0.01 && (
                      <Badge variant="destructive" className="ml-2 text-xs">Out of Balance</Badge>
                    )}
                    {Math.abs(totalClosingBalance) <= 0.01 && (
                      <Badge variant="default" className="ml-2 text-xs bg-green-500">Balanced</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFetchedTBData(null)}>
                      Clear
                    </Button>
                    <Button variant="outline" onClick={handleExportToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!currentEngagement) {
                          toast({ title: "No Engagement", description: "Select an engagement first to save Trial Balance", variant: "destructive" });
                          return;
                        }
                        toast({ 
                          title: "Save to Trial Balance", 
                          description: "Navigate to Trial Balance page and use Import to save this data" 
                        });
                        setShowTBDialog(false);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Use in Trial Balance
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {fetchedTBData && fetchedTBData.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No Trial Balance data found for the selected period. Make sure Tally has data for this date range.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Month wise Data Dialog */}
      <Dialog open={showMonthWiseDialog} onOpenChange={setShowMonthWiseDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Get Month wise Data from Tally
            </DialogTitle>
            <DialogDescription>
              Extract month wise data for analysis. P&L shows movement, Balance Sheet shows closing balances.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Period Selection */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg flex-wrap">
              <div className="flex items-center gap-2">
                <Label htmlFor="mwFyStartYear">FY Starting Year:</Label>
                <Select 
                  value={String(mwFyStartYear)} 
                  onValueChange={(v) => setMwFyStartYear(Number(v))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="mwTargetMonth">Target Month:</Label>
                <Select value={mwTargetMonth} onValueChange={setMwTargetMonth}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                FY {mwFyStartYear}-{String(mwFyStartYear + 1).slice(-2)} → Apr to {mwTargetMonth}
              </div>
              <Button onClick={handleFetchMonthWiseData} disabled={isFetchingMW}>
                {isFetchingMW ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch from Tally
                  </>
                )}
              </Button>
            </div>

            {/* Results Table */}
            {fetchedMWData && fetchedMWData.lines.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium min-w-[200px]">Ledger Name</th>
                        <th className="text-left p-2 font-medium min-w-[120px]">Primary Group</th>
                        <th className="text-center p-2 font-medium text-xs">Type</th>
                        {fetchedMWData.months.map(month => (
                          <th key={month} className="text-right p-2 font-medium min-w-[80px]">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedMWData.lines.slice(0, 100).map((line, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50">
                          <td className="p-2">{line.accountName}</td>
                          <td className="p-2 text-muted-foreground text-xs">{line.primaryGroup}</td>
                          <td className="p-2 text-center">
                            <Badge variant={line.isRevenue ? "secondary" : "outline"} className="text-[10px]">
                              {line.isRevenue ? "P&L" : "BS"}
                            </Badge>
                          </td>
                          {fetchedMWData.months.map(month => (
                            <td key={month} className="p-2 text-right font-mono text-xs">
                              {line.monthlyBalances[month] !== 0 
                                ? formatCurrency(line.monthlyBalances[month] || 0) 
                                : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Export */}
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {fetchedMWData.lines.length} accounts ({fetchedMWData.lines.filter(l => l.isRevenue).length} P&L, {fetchedMWData.lines.filter(l => !l.isRevenue).length} BS)
                    {fetchedMWData.lines.length > 100 && (
                      <span className="ml-2 text-amber-600">(showing first 100)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFetchedMWData(null)}>
                      Clear
                    </Button>
                    <Button variant="outline" onClick={handleExportMonthWiseToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {fetchedMWData && fetchedMWData.lines.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No month wise data found. Make sure Tally has data for FY {mwFyStartYear}-{mwFyStartYear + 1}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* GST Not Feeded Dialog */}
      <Dialog open={showGSTNotFeedDialog} onOpenChange={setShowGSTNotFeedDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              GST Number Not Feeded
            </DialogTitle>
            <DialogDescription>
              Find parties where GST Registration Type is Regular but Party GSTIN is not entered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Fetch Button */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Button onClick={handleFetchGSTNotFeed} disabled={isFetchingGSTNotFeed}>
                {isFetchingGSTNotFeed ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch from Tally
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Fetches all ledgers and filters where GST Type = Regular but GSTIN is blank
              </span>
            </div>

            {/* Results Table */}
            {fetchedGSTNotFeedData && fetchedGSTNotFeedData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">#</th>
                        <th className="text-left p-3 font-medium">Ledger Name</th>
                        <th className="text-left p-3 font-medium">GST Registration Type</th>
                        <th className="text-left p-3 font-medium">Party GSTIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedGSTNotFeedData.map((line, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50">
                          <td className="p-3 text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-medium">{line.ledgerName}</td>
                          <td className="p-3">
                            <Badge variant="secondary">{line.registrationType || line.gstRegistrationType || "Unknown"}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="destructive">Not Feeded</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Export */}
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Found {fetchedGSTNotFeedData.length} ledgers with missing GSTIN
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFetchedGSTNotFeedData(null)}>
                      Clear
                    </Button>
                    <Button variant="outline" onClick={handleExportGSTNotFeedToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {fetchedGSTNotFeedData && fetchedGSTNotFeedData.length === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  All ledgers with Regular GST registration have GSTIN entered. No data gaps found!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Negative Ledgers Dialog */}
      <Dialog open={showNegativeLedgersDialog} onOpenChange={setShowNegativeLedgersDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Negative Ledgers - Opposite Balances
            </DialogTitle>
            <DialogDescription>
              Accounts with balances opposite to their expected nature (e.g., Debtors with Credit balance)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(() => {
              const { debtors, creditors, assets, liabilities } = getNegativeLedgers();
              const totalCount = debtors.length + creditors.length + assets.length + liabilities.length;
              
              const renderTable = (data: TallyTrialBalanceLine[], expectedNature: string, oppositeNature: string) => (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[350px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Account Name</th>
                          <th className="text-left p-3 font-medium">Primary Group</th>
                          <th className="text-left p-3 font-medium">Parent</th>
                          <th className="text-right p-3 font-medium">Opposite Balance ({oppositeNature})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((line, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/50">
                            <td className="p-3 text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-medium">{line.accountHead}</td>
                            <td className="p-3 text-muted-foreground text-xs">{line.primaryGroup}</td>
                            <td className="p-3 text-muted-foreground text-xs">{line.parent}</td>
                            <td className="p-3 text-right font-mono text-destructive">
                              {(() => {
                                const closingCr = line.closingBalance < 0 ? Math.abs(line.closingBalance) : 0;
                                const closingDr = line.closingBalance > 0 ? line.closingBalance : 0;
                                return formatCurrency(expectedNature === "Dr" ? closingCr : closingDr);
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );

              return (
                <>
                  {totalCount === 0 ? (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        No ledgers with opposite balances found. All accounts have balances matching their expected nature.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Tabs value={negativeLedgersTab} onValueChange={setNegativeLedgersTab}>
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="debtors" className="text-xs">
                            Debtors (Cr) <Badge variant="secondary" className="ml-1 text-[10px]">{debtors.length}</Badge>
                          </TabsTrigger>
                          <TabsTrigger value="creditors" className="text-xs">
                            Creditors (Dr) <Badge variant="secondary" className="ml-1 text-[10px]">{creditors.length}</Badge>
                          </TabsTrigger>
                          <TabsTrigger value="assets" className="text-xs">
                            Assets (Cr) <Badge variant="secondary" className="ml-1 text-[10px]">{assets.length}</Badge>
                          </TabsTrigger>
                          <TabsTrigger value="liabilities" className="text-xs">
                            Liabilities (Dr) <Badge variant="secondary" className="ml-1 text-[10px]">{liabilities.length}</Badge>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="debtors" className="mt-4">
                          {debtors.length > 0 ? (
                            renderTable(debtors, "Dr", "Cr")
                          ) : (
                            <Alert><AlertDescription>No Debtors with Credit balance found.</AlertDescription></Alert>
                          )}
                        </TabsContent>

                        <TabsContent value="creditors" className="mt-4">
                          {creditors.length > 0 ? (
                            renderTable(creditors, "Cr", "Dr")
                          ) : (
                            <Alert><AlertDescription>No Creditors with Debit balance found.</AlertDescription></Alert>
                          )}
                        </TabsContent>

                        <TabsContent value="assets" className="mt-4">
                          {assets.length > 0 ? (
                            renderTable(assets, "Dr", "Cr")
                          ) : (
                            <Alert><AlertDescription>No Assets with Credit balance found.</AlertDescription></Alert>
                          )}
                        </TabsContent>

                        <TabsContent value="liabilities" className="mt-4">
                          {liabilities.length > 0 ? (
                            renderTable(liabilities, "Cr", "Dr")
                          ) : (
                            <Alert><AlertDescription>No Liabilities with Debit balance found.</AlertDescription></Alert>
                          )}
                        </TabsContent>
                      </Tabs>

                      {/* Summary & Export */}
                      <div className="p-4 border rounded-lg bg-muted/30 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Total: {totalCount} accounts with opposite balances
                          (Debtors: {debtors.length}, Creditors: {creditors.length}, Assets: {assets.length}, Liabilities: {liabilities.length})
                        </div>
                        <Button variant="outline" onClick={handleExportNegativeLedgersToExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export All to Excel
                        </Button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ODBC Info Dialog */}
      <Dialog open={showODBCInfoDialog} onOpenChange={setShowODBCInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              ODBC Direct Connection Requirements
            </DialogTitle>
            <DialogDescription>
              Please ensure the following requirements are met before using ODBC Direct connection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Run Tally as Administrator</p>
                  <p className="text-sm text-muted-foreground">
                    Tally must be running with administrator privileges for ODBC connections to work properly.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Configure Tally ODBC</p>
                  <p className="text-sm text-muted-foreground">
                    Ensure Tally ODBC is properly configured in your system settings before attempting to connect.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowODBCInfoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowODBCInfoDialog(false);
              setConnectionMode("odbc");
            }}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Opening Balance Matching Dialog */}
      <Dialog open={showOpeningBalanceDialog} onOpenChange={setShowOpeningBalanceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Opening Balance Matching
            </DialogTitle>
            <DialogDescription>
              Compare opening balances between Old and New Tally instances. Generate XML to import old balances into new Tally.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Step 1: Fetch Old Tally Data */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">Step 1: Fetch Old Tally Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Load the Old Tally instance in TallyPrime, then click to fetch closing balances.
                  </p>
                </div>
                <Button
                  onClick={openingBalanceMatching.fetchOldTallyLedgers}
                  disabled={openingBalanceMatching.isLoading || !!openingBalanceMatching.oldTallyData}
                  size="sm"
                >
                  {openingBalanceMatching.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : openingBalanceMatching.oldTallyData ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Fetched ({openingBalanceMatching.oldTallyData.length} ledgers)
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Fetch Old Tally Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Step 2: Fetch New Tally Data */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">Step 2: Fetch New Tally Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Load the New Tally instance in TallyPrime, then click to fetch opening balances.
                  </p>
                </div>
                <Button
                  onClick={openingBalanceMatching.fetchNewTallyLedgers}
                  disabled={openingBalanceMatching.isLoading || !!openingBalanceMatching.newTallyData || !openingBalanceMatching.oldTallyData}
                  size="sm"
                >
                  {openingBalanceMatching.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : openingBalanceMatching.newTallyData ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Fetched ({openingBalanceMatching.newTallyData.length} ledgers)
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Fetch New Tally Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Step 3: Compare Balances */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">Step 3: Compare Balances</h3>
                  <p className="text-sm text-muted-foreground">
                    Compare the balances and generate comparison report with XML for import.
                  </p>
                </div>
                <Button
                  onClick={openingBalanceMatching.compareBalances}
                  disabled={openingBalanceMatching.isLoading || !openingBalanceMatching.oldTallyData || !openingBalanceMatching.newTallyData}
                  size="sm"
                >
                  {openingBalanceMatching.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4 mr-2" />
                      Compare Balances
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Comparison Results */}
            {openingBalanceMatching.comparisonResult && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Balance Mismatches</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{openingBalanceMatching.comparisonResult.balanceMismatches.length}</div>
                      <p className="text-xs text-muted-foreground">Ledgers with different balances</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Name Mismatches</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{openingBalanceMatching.comparisonResult.nameMismatches.length}</div>
                      <p className="text-xs text-muted-foreground">Ledgers not found in one instance</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Balance Mismatches Table */}
                {openingBalanceMatching.comparisonResult.balanceMismatches.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Balance Mismatches</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Ledger Name</th>
                              <th className="p-2 text-right">Old Dr</th>
                              <th className="p-2 text-right">Old Cr</th>
                              <th className="p-2 text-right">New Dr</th>
                              <th className="p-2 text-right">New Cr</th>
                            </tr>
                          </thead>
                          <tbody>
                            {openingBalanceMatching.comparisonResult.balanceMismatches.slice(0, 10).map((mismatch, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">{mismatch.$Name}</td>
                                <td className="p-2 text-right">{mismatch.Old_Dr_Balance.toFixed(2)}</td>
                                <td className="p-2 text-right">{mismatch.Old_Cr_Balance.toFixed(2)}</td>
                                <td className="p-2 text-right">{mismatch.New_Dr_Balance.toFixed(2)}</td>
                                <td className="p-2 text-right">{mismatch.New_Cr_Balance.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {openingBalanceMatching.comparisonResult.balanceMismatches.length > 10 && (
                        <div className="p-2 text-xs text-muted-foreground text-center border-t">
                          Showing first 10 of {openingBalanceMatching.comparisonResult.balanceMismatches.length} mismatches
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Download XML Button */}
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={openingBalanceMatching.downloadXML}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Download XML for Import
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    To import the XML to Tally: Go to Gateway of Tally &gt; Import &gt; Masters &gt; Select the downloaded XML file &gt; Choose "Modify with new data" &gt; Press Enter. Backup your Tally data before importing!
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Reset Button */}
            {(openingBalanceMatching.oldTallyData || openingBalanceMatching.newTallyData || openingBalanceMatching.comparisonResult) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    openingBalanceMatching.reset();
                  }}
                  size="sm"
                >
                  Reset
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowOpeningBalanceDialog(false);
              openingBalanceMatching.reset();
            }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const GSTTools = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">GST Portal Integration</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              To use GST tools, you'll need to authenticate with the GST portal using your credentials or API access.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          title="Get GSTR-1, 3B & 2A"
          description="Download GST returns (GSTR-1, GSTR-3B, GSTR-2A/2B) directly from the GST portal for reconciliation."
          icon={<Download className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Reconcile with Books"
          description="Compare GST returns with books of accounts. Identify mismatches in sales, purchases, and ITC claims."
          icon={<Calculator className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="JSON to Excel Converter"
          description="Convert GST JSON files to Excel format for easy analysis and documentation."
          icon={<FileJson className="h-5 w-5 text-primary" />}
          onClick={() => toast({ title: "JSON Converter", description: "Upload a GST JSON file to convert" })}
        />
        <ToolCard
          title="ITC Reconciliation"
          description="Match GSTR-2A/2B with purchase register to identify eligible and ineligible ITC claims."
          icon={<Receipt className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="E-Way Bill Tracker"
          description="Track and validate e-way bills for goods movement verification."
          icon={<FileText className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
      </div>
    </div>
  );
};

const MCATools = () => {
  const { toast } = useToast();
  const [cinNumber, setCinNumber] = useState("");

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Label htmlFor="cin">CIN Number:</Label>
            <Input 
              id="cin" 
              value={cinNumber}
              onChange={(e) => setCinNumber(e.target.value)}
              placeholder="Enter CIN/LLPIN"
              className="flex-1"
            />
          </div>
          <Button size="sm" onClick={() => toast({ title: "Searching MCA...", description: `Looking up ${cinNumber}` })}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          title="Get Company Master Data"
          description="Retrieve complete company master data including registered address, authorized capital, paid-up capital, and company status."
          icon={<Building2 className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Download Financials / AOC-4 / MGT-7"
          description="Download filed financial statements (AOC-4) and annual returns (MGT-7) directly from MCA."
          icon={<Download className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="DIR-3 KYC / DIN Status"
          description="Check Director Identification Number (DIN) status and DIR-3 KYC compliance for directors."
          icon={<Users className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Charges & Signatories"
          description="View registered charges on company assets and list of authorized signatories."
          icon={<CreditCard className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Company Documents"
          description="Access MOA, AOA, and other incorporation documents filed with MCA."
          icon={<FileText className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Related Party Check"
          description="Identify common directors and potential related parties across companies."
          icon={<Shield className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
      </div>
    </div>
  );
};

const IncomeTaxTools = () => {
  const { toast } = useToast();
  const [pan, setPan] = useState("");

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Label htmlFor="pan">PAN Number:</Label>
            <Input 
              id="pan" 
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="Enter PAN"
              className="flex-1 uppercase"
              maxLength={10}
            />
          </div>
          <Button size="sm" onClick={() => toast({ title: "Income Tax Portal", description: "Authentication required" })}>
            <Search className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          title="Get 26AS"
          description="Download Form 26AS containing TDS/TCS credits, advance tax, self-assessment tax details for verification."
          icon={<FileText className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Check Notices on IT Website"
          description="View pending notices and communications from the Income Tax department for the assessee."
          icon={<Bell className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Check TDS Related Notices"
          description="Review TDS default notices, demand notices, and challan correction requirements."
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="AIS (Annual Information Statement)"
          description="Access Annual Information Statement showing all financial transactions reported to IT department."
          icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="TIS (Taxpayer Information Summary)"
          description="View Taxpayer Information Summary with pre-filled income details and high-value transactions."
          icon={<Table className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="ITR Status & History"
          description="Check ITR filing status, refund status, and filing history for previous assessment years."
          icon={<Search className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
      </div>
    </div>
  );
};

const PDFTools = () => {
  const { toast } = useToast();

  const handleFileUpload = (toolName: string) => {
    toast({
      title: toolName,
      description: "Please select files to process",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          title="Merge PDF Documents"
          description="Combine multiple PDF files into a single document. Useful for consolidating audit evidence."
          icon={<Merge className="h-5 w-5 text-primary" />}
          onClick={() => handleFileUpload("Merge PDFs")}
        />
        <ToolCard
          title="Split PDF File"
          description="Split a PDF into multiple files by page range or extract specific pages."
          icon={<Scissors className="h-5 w-5 text-primary" />}
          onClick={() => handleFileUpload("Split PDF")}
        />
        <ToolCard
          title="Convert Word to PDF"
          description="Convert Microsoft Word documents (.doc, .docx) to PDF format."
          icon={<FileType className="h-5 w-5 text-primary" />}
          onClick={() => handleFileUpload("Word to PDF")}
        />
        <ToolCard
          title="Convert Excel to PDF"
          description="Convert Microsoft Excel spreadsheets (.xls, .xlsx) to PDF format."
          icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
          onClick={() => handleFileUpload("Excel to PDF")}
        />
        <ToolCard
          title="Redact Personal Information"
          description="Automatically detect and redact PII like Aadhaar, PAN, bank account numbers from documents."
          icon={<Eye className="h-5 w-5 text-primary" />}
          status="beta"
          onClick={() => handleFileUpload("Redact PII")}
        />
        <ToolCard
          title="OCR - Extract Text from PDF"
          description="Extract text from scanned PDFs using optical character recognition."
          icon={<FileText className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Compress PDF"
          description="Reduce PDF file size while maintaining quality for easier sharing and storage."
          icon={<FilePlus className="h-5 w-5 text-primary" />}
          onClick={() => handleFileUpload("Compress PDF")}
        />
        <ToolCard
          title="Add Watermark"
          description="Add 'Draft', 'Confidential', or custom watermarks to PDF documents."
          icon={<Shield className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
      </div>
    </div>
  );
};

const AnalyticsTools = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          title="Ratio Analysis Calculator"
          description="Calculate key financial ratios including liquidity, profitability, and solvency ratios from trial balance."
          icon={<Calculator className="h-5 w-5 text-primary" />}
          onClick={() => toast({ title: "Ratio Analysis", description: "Import trial balance first" })}
        />
        <ToolCard
          title="Benford's Law Analysis"
          description="Apply Benford's Law to detect anomalies in financial data that may indicate fraud or errors."
          icon={<Search className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Duplicate Transaction Finder"
          description="Identify potential duplicate transactions based on amount, date, and party matching."
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Bank Statement Analyzer"
          description="Parse and analyze bank statements for reconciliation and unusual transaction detection."
          icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
        <ToolCard
          title="Sampling Calculator"
          description="Calculate sample sizes using statistical sampling methods (MUS, random, stratified)."
          icon={<Calculator className="h-5 w-5 text-primary" />}
          onClick={() => toast({ title: "Sampling Calculator", description: "Feature available" })}
        />
        <ToolCard
          title="Trend Analysis"
          description="Perform month-on-month and year-on-year trend analysis on key financial metrics."
          icon={<Table className="h-5 w-5 text-primary" />}
          status="coming-soon"
        />
      </div>
    </div>
  );
};

const AUDIT_TOOLS_TABS = ['tally', 'gst', 'mca', 'incometax', 'pdf', 'analytics'];

export default function AuditTools() {
  const { currentEngagement } = useEngagement();
  const [activeTab, setActiveTab] = useState('tally');

  // Enable tab keyboard shortcuts (Ctrl+1-6, Alt+Arrow)
  useTabShortcuts(AUDIT_TOOLS_TABS, activeTab, setActiveTab);

  if (!currentEngagement) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Tools</h1>
          <p className="text-muted-foreground">
            Productivity tools to streamline your audit workflow
          </p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an engagement from the sidebar to use audit tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Tools</h1>
        <p className="text-muted-foreground">
          {currentEngagement.client_name} - {currentEngagement.name}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="tally" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Tally Tools
          </TabsTrigger>
          <TabsTrigger value="gst" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            GST Related
          </TabsTrigger>
          <TabsTrigger value="mca" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            MCA Data
          </TabsTrigger>
          <TabsTrigger value="incometax" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Income Tax
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileType className="h-4 w-4" />
            PDF Tools
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tally">
          <TallyTools />
        </TabsContent>

        <TabsContent value="gst">
          <GSTTools />
        </TabsContent>

        <TabsContent value="mca">
          <MCATools />
        </TabsContent>

        <TabsContent value="incometax">
          <IncomeTaxTools />
        </TabsContent>

        <TabsContent value="pdf">
          <PDFTools />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTools />
        </TabsContent>
      </Tabs>
    </div>
  );
}
