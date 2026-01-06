import { useState } from "react";
import JSZip from "jszip";
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
import { useTallyConnection } from "@/hooks/useTallyConnection";
import { useTally, TallyTrialBalanceLine, TallyMonthWiseLine, TallyGSTNotFeedLine } from "@/contexts/TallyContext";
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
  Link2,
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

type ConnectionMode = "bridge" | "excel";

const TallyTools = () => {
  const { toast } = useToast();
  const { currentEngagement } = useEngagement();
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("bridge");
  const [sessionCode, setSessionCode] = useState("");
  const [tallyPort, setTallyPort] = useState("9000");
  
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
  
  // Direct connection (kept for fallback reference, but won't work due to CORS)
  const directConnection = useTallyConnection();
  
  // Bridge connection using global context (persists across navigation)
  const tallyConnection = useTally();
  
  // Use the active connection based on mode
  const isConnected = connectionMode === "bridge" ? tallyConnection.isConnected : directConnection.isConnected;
  const isConnecting = connectionMode === "bridge" ? tallyConnection.isConnecting : directConnection.isConnecting;
  const companyInfo = connectionMode === "bridge" ? tallyConnection.companyInfo : directConnection.companyInfo;

  const handleConnect = () => {
    if (isConnected) {
      if (connectionMode === "bridge") {
        tallyConnection.disconnect();
      } else {
        directConnection.disconnect();
      }
    } else {
      if (connectionMode === "bridge") {
        tallyConnection.connectWithSession(sessionCode);
      } else {
        directConnection.connectToTally(tallyPort);
      }
    }
  };

  const handleFetchTrialBalance = async () => {
    setIsFetchingTB(true);
    try {
      const result = await tallyConnection.fetchTrialBalance(tbFromDate, tbToDate);
      if (result && result.success) {
        setFetchedTBData(result.lines);
        toast({
          title: "Trial Balance Fetched",
          description: `Retrieved ${result.lines.length} ledger accounts from Tally`,
        });
      }
    } finally {
      setIsFetchingTB(false);
    }
  };

  const handleExportToExcel = () => {
    if (!fetchedTBData || fetchedTBData.length === 0) return;
    
    // Separate P&L and Balance Sheet items like Python code
    const plItems = fetchedTBData.filter(line => line.isRevenue);
    const bsItems = fetchedTBData.filter(line => !line.isRevenue);
    
    const formatRow = (line: TallyTrialBalanceLine) => ({
      "Account Name": line.accountName,
      "Primary Group": line.primaryGroup,
      "Parent": line.parentGroup,
      "Opening Dr": line.openingDr > 0 ? line.openingDr : "",
      "Opening Cr": line.openingCr > 0 ? line.openingCr : "",
      "Debit Totals": line.debitTotals > 0 ? line.debitTotals : "",
      "Credit Totals": line.creditTotals > 0 ? line.creditTotals : "",
      "Closing Dr": line.closingDr > 0 ? line.closingDr : "",
      "Closing Cr": line.closingCr > 0 ? line.closingCr : "",
    });
    
    const wb = XLSX.utils.book_new();
    
    // P&L Sheet
    if (plItems.length > 0) {
      const plData = plItems.map(formatRow);
      const plWs = XLSX.utils.json_to_sheet(plData);
      XLSX.utils.book_append_sheet(wb, plWs, "P&L Item");
    }
    
    // Balance Sheet
    if (bsItems.length > 0) {
      const bsData = bsItems.map(formatRow);
      const bsWs = XLSX.utils.json_to_sheet(bsData);
      XLSX.utils.book_append_sheet(wb, bsWs, "Balance Sheet");
    }
    
    const fileName = `Trial_Balance_${tbFromDate}_to_${tbToDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Export Complete",
      description: `Saved ${plItems.length} P&L and ${bsItems.length} Balance Sheet items to ${fileName}`,
    });
  };

  const handleFetchMonthWiseData = async () => {
    setIsFetchingMW(true);
    try {
      const result = await tallyConnection.fetchMonthWiseData(mwFyStartYear, mwTargetMonth);
      if (result && result.success) {
        setFetchedMWData({ lines: result.lines, months: result.months });
        toast({
          title: "Month wise Data Fetched",
          description: `Retrieved ${result.lines.length} ledger accounts for ${result.months.join(", ")}`,
        });
      }
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
    setIsFetchingGSTNotFeed(true);
    try {
      const result = await tallyConnection.fetchGSTNotFeeded();
      if (result && result.success) {
        setFetchedGSTNotFeedData(result.lines);
      }
    } finally {
      setIsFetchingGSTNotFeed(false);
    }
  };

  const handleExportGSTNotFeedToExcel = () => {
    if (!fetchedGSTNotFeedData || fetchedGSTNotFeedData.length === 0) return;
    
    const data = fetchedGSTNotFeedData.map(line => ({
      "Ledger Name": line.ledgerName,
      "GST Registration Type": line.gstRegistrationType,
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
    
    // Debtors should have Dr balance (positive), so Cr balance (negative/closingCr > 0) is opposite
    const debtors = fetchedTBData.filter(line => 
      line.primaryGroup === "Sundry Debtors" && line.closingCr > 0
    );
    
    // Creditors should have Cr balance (negative), so Dr balance (positive/closingDr > 0) is opposite
    const creditors = fetchedTBData.filter(line => 
      line.primaryGroup === "Sundry Creditors" && line.closingDr > 0
    );
    
    // Assets should have Dr balance, so Cr balance is opposite
    const assetGroups = ["Fixed Assets", "Current Assets", "Investments", "Bank Accounts", "Cash-in-Hand", "Deposits (Asset)", "Loans & Advances (Asset)", "Stock-in-Hand", "Bank OD Accounts"];
    const assets = fetchedTBData.filter(line => 
      assetGroups.includes(line.primaryGroup) && line.closingCr > 0
    );
    
    // Liabilities should have Cr balance, so Dr balance is opposite
    const liabilityGroups = ["Capital Account", "Reserves & Surplus", "Loans (Liability)", "Secured Loans", "Unsecured Loans", "Current Liabilities", "Provisions", "Duties & Taxes"];
    const liabilities = fetchedTBData.filter(line => 
      liabilityGroups.includes(line.primaryGroup) && line.closingDr > 0
    );
    
    return { debtors, creditors, assets, liabilities };
  };

  const handleExportNegativeLedgersToExcel = () => {
    const { debtors, creditors, assets, liabilities } = getNegativeLedgers();
    
    const formatRow = (line: TallyTrialBalanceLine, expectedNature: string) => ({
      "Account Name": line.accountName,
      "Primary Group": line.primaryGroup,
      "Parent": line.parentGroup,
      "Expected Nature": expectedNature,
      "Actual Balance": expectedNature === "Dr" ? `Cr ${formatCurrency(line.closingCr)}` : `Dr ${formatCurrency(line.closingDr)}`,
      "Amount": expectedNature === "Dr" ? line.closingCr : line.closingDr,
    });
    
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

  const totalClosingDr = fetchedTBData?.reduce((sum, line) => sum + line.closingDr, 0) || 0;
  const totalClosingCr = fetchedTBData?.reduce((sum, line) => sum + line.closingCr, 0) || 0;

  const handleDownloadBridgeApp = async () => {
    const zip = new JSZip();
    
    // package.json - no more ws dependency needed
    const packageJson = {
      name: "tally-bridge",
      version: "1.0.0",
      description: "Tally Bridge Desktop App for AuditPro",
      main: "main.js",
      scripts: {
        start: "electron ."
      },
      dependencies: {
        electron: "^28.0.0"
      }
    };
    zip.file("package.json", JSON.stringify(packageJson, null, 2));

    // main.js - HTTP polling based with proper error handling
    const mainJs = `const { app, BrowserWindow } = require('electron');

let mainWindow;
let sessionCode;
let heartbeatInterval;
let pollingInterval;
let isRunning = true;
let processingRequests = new Set(); // Track requests being processed

const API_URL = 'https://jrwfgfdxhlvwhzwqvwkl.supabase.co/functions/v1/tally-bridge';
const TALLY_URL = 'http://localhost:9000';
const HEARTBEAT_INTERVAL = 20000; // 20 seconds
const POLL_INTERVAL = 1000; // 1 second

function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function updateStatus(status, code) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', { status, sessionCode: code });
  }
}

async function apiCall(action, data = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, sessionCode, ...data })
  });
  const result = await response.json();
  if (!response.ok) {
    console.error('API error:', action, result);
  }
  return result;
}

async function registerSession() {
  sessionCode = generateSessionCode();
  updateStatus('connecting', sessionCode);
  
  try {
    const result = await apiCall('register-session');
    if (result.success) {
      console.log('Session registered:', sessionCode);
      updateStatus('connected', sessionCode);
      startHeartbeat();
      startPolling();
    } else {
      console.error('Failed to register:', result.error);
      updateStatus('error', sessionCode);
      setTimeout(registerSession, 3000);
    }
  } catch (err) {
    console.error('Registration error:', err.message);
    updateStatus('error', sessionCode);
    setTimeout(registerSession, 3000);
  }
}

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(async () => {
    try {
      await apiCall('heartbeat');
      console.log('Heartbeat sent');
    } catch (err) {
      console.error('Heartbeat failed:', err.message);
      updateStatus('disconnected', sessionCode);
      stopPolling();
      stopHeartbeat();
      setTimeout(registerSession, 3000);
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function completeRequest(requestId, responseData, errorMessage) {
  try {
    const payload = {
      action: 'complete-request',
      requestId: requestId
    };
    if (responseData) payload.responseData = responseData;
    if (errorMessage) payload.errorMessage = errorMessage;
    
    console.log('Completing request:', requestId);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Request completed successfully:', requestId);
      processingRequests.delete(requestId);
      return true;
    } else {
      console.error('Failed to complete request:', requestId, result.error);
      return false;
    }
  } catch (err) {
    console.error('Error completing request:', requestId, err.message);
    return false;
  }
}

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(async () => {
    if (!isRunning) return;
    
    try {
      const result = await apiCall('get-pending-requests');
      
      if (result.requests && result.requests.length > 0) {
        const request = result.requests[0];
        
        // Skip if already processing this request
        if (processingRequests.has(request.id)) {
          return;
        }
        
        // Mark as processing
        processingRequests.add(request.id);
        console.log('Processing request:', request.id);
        updateStatus('processing', sessionCode);
        
        try {
          const tallyResponse = await fetch(TALLY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/xml' },
            body: request.xml_request
          });
          
          const responseData = await tallyResponse.text();
          console.log('Tally response received, length:', responseData.length);
          
          const completed = await completeRequest(request.id, responseData, null);
          if (completed) {
            updateStatus('connected', sessionCode);
          }
        } catch (err) {
          console.error('Tally error:', err.message);
          await completeRequest(request.id, null, 'Tally connection failed: ' + err.message);
          updateStatus('tally-error', sessionCode);
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message);
    }
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function unregisterSession() {
  try {
    await apiCall('unregister-session');
  } catch (err) {
    console.error('Unregister error:', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 350,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  registerSession();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async () => {
  isRunning = false;
  stopHeartbeat();
  stopPolling();
  await unregisterSession();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
    zip.file("main.js", mainJs);

    // index.html
    const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tally Bridge - AuditPro</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { text-align: center; max-width: 400px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 30px; }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .status-connected { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .status-connecting { background: rgba(234, 179, 8, 0.2); color: #eab308; }
    .status-disconnected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .status-processing { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      animation: pulse 2s infinite;
    }
    .status-connected .dot { background: #22c55e; }
    .status-connecting .dot { background: #eab308; }
    .status-disconnected .dot { background: #ef4444; }
    .status-processing .dot { background: #3b82f6; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .session-code {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 48px;
      font-weight: bold;
      letter-spacing: 12px;
      margin: 20px 0;
      padding: 20px;
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      user-select: all;
    }
    .instructions {
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 Tally Bridge</h1>
    <p class="subtitle">Connect AuditPro to Tally ERP</p>
    
    <div id="status" class="status-indicator status-connecting">
      <span class="dot"></span>
      <span id="statusText">Connecting...</span>
    </div>
    
    <div id="sessionCode" class="session-code">------</div>
    
    <p class="instructions">
      Enter this code in AuditPro web app<br>
      under Audit Tools → Tally Bridge
    </p>
    
    <p class="footer">
      Make sure Tally ERP is running on port 9000
    </p>
  </div>
  
  <script>
    const { ipcRenderer } = require('electron');
    
    ipcRenderer.on('status-update', (event, data) => {
      const statusEl = document.getElementById('status');
      const statusText = document.getElementById('statusText');
      const codeEl = document.getElementById('sessionCode');
      
      codeEl.textContent = data.sessionCode || '------';
      
      statusEl.className = 'status-indicator';
      switch(data.status) {
        case 'connected':
          statusEl.classList.add('status-connected');
          statusText.textContent = 'Connected to Server';
          break;
        case 'connecting':
          statusEl.classList.add('status-connecting');
          statusText.textContent = 'Connecting...';
          break;
        case 'processing':
          statusEl.classList.add('status-processing');
          statusText.textContent = 'Processing Request...';
          break;
        case 'tally-error':
          statusEl.classList.add('status-disconnected');
          statusText.textContent = 'Tally Not Responding';
          break;
        default:
          statusEl.classList.add('status-disconnected');
          statusText.textContent = 'Disconnected';
      }
    });
  </script>
</body>
</html>
`;
    zip.file("index.html", indexHtml);

    // README.md
    const readme = `# Tally Bridge Desktop App

This app connects AuditPro web application to your local Tally ERP installation.

## Prerequisites

1. **Node.js** - Download from https://nodejs.org (v18 or higher)
2. **Tally ERP** - Must be running with ODBC/XML server enabled on port 9000

## Setup Instructions

1. Open a terminal/command prompt in this folder
2. Run: \`npm install\`
3. Run: \`npm start\`

## How It Works

1. The app connects to AuditPro's cloud server
2. A unique session code is displayed
3. Enter this code in AuditPro (Audit Tools → Tally Bridge)
4. AuditPro can now fetch data directly from your Tally

## Tally Configuration

Make sure Tally is configured to accept XML requests:
1. Open Tally Gateway of India > Configure
2. Set "Enable ODBC Server" to Yes
3. Set Port to 9000

## Troubleshooting

- **"Tally Not Responding"**: Check if Tally is running and ODBC server is enabled
- **"Disconnected"**: Check your internet connection
- **Session code changes**: This is normal after reconnection

## Support

For issues, contact your AuditPro administrator.
`;
    zip.file("README.md", readme);

    // Generate and download
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tally-bridge-app.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Extract the zip, run 'npm install' then 'npm start'",
    });
  };

  return (
    <div className="space-y-6">
      {/* Connection Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={connectionMode === "bridge" ? "default" : "outline"}
          size="sm"
          onClick={() => setConnectionMode("bridge")}
          disabled={isConnected}
        >
          <Link2 className="h-4 w-4 mr-2" />
          Tally Bridge (Recommended)
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

      {/* Bridge Mode UI */}
      {connectionMode === "bridge" && (
        <div className="bg-muted/50 rounded-lg p-4 border space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Using Tally Bridge Desktop App</p>
                <p>Download and run the Tally Bridge app on your machine where Tally is running. Enter the session code shown in the app below.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadBridgeApp}>
              <Download className="h-4 w-4 mr-2" />
              Download Bridge App
            </Button>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="sessionCode">Session Code:</Label>
              <Input 
                id="sessionCode" 
                value={sessionCode} 
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="w-28 uppercase font-mono text-center tracking-widest"
                maxLength={8}
                disabled={isConnected || isConnecting}
              />
            </div>
            
            {isConnected ? (
              <Button onClick={handleConnect} size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                Tally Connected
              </Button>
            ) : (
              <Button onClick={handleConnect} size="sm" disabled={isConnecting || !sessionCode}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect via Bridge
                  </>
                )}
              </Button>
            )}

            {/* Show company info when connected */}
            {isConnected && companyInfo && (
              <div className="flex items-center gap-4 ml-2 pl-4 border-l">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{companyInfo.companyName}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {companyInfo.financialYear}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => tallyConnection.disconnect()}
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
              toast({ title: "Not Connected", description: "Connect to Tally first using the Bridge app" });
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
              toast({ title: "Not Connected", description: "Connect to Tally first using the Bridge app" });
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
              toast({ title: "Not Connected", description: "Connect to Tally first using the Bridge app" });
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
                        <th className="text-left p-2 font-medium">Account Name</th>
                        <th className="text-left p-2 font-medium">Primary Group</th>
                        <th className="text-left p-2 font-medium">Parent</th>
                        <th className="text-center p-2 font-medium text-xs">Type</th>
                        <th className="text-right p-2 font-medium">Opening Dr</th>
                        <th className="text-right p-2 font-medium">Opening Cr</th>
                        <th className="text-right p-2 font-medium">Debit</th>
                        <th className="text-right p-2 font-medium">Credit</th>
                        <th className="text-right p-2 font-medium">Closing Dr</th>
                        <th className="text-right p-2 font-medium">Closing Cr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedTBData.map((line, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50">
                          <td className="p-2">{line.accountName}</td>
                          <td className="p-2 text-muted-foreground text-xs">{line.primaryGroup}</td>
                          <td className="p-2 text-muted-foreground text-xs">{line.parentGroup}</td>
                          <td className="p-2 text-center">
                            <Badge variant={line.isRevenue ? "secondary" : "outline"} className="text-[10px]">
                              {line.isRevenue ? "P&L" : "BS"}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono text-xs">{line.openingDr > 0 ? formatCurrency(line.openingDr) : '-'}</td>
                          <td className="p-2 text-right font-mono text-xs">{line.openingCr > 0 ? formatCurrency(line.openingCr) : '-'}</td>
                          <td className="p-2 text-right font-mono text-xs">{line.debitTotals > 0 ? formatCurrency(line.debitTotals) : '-'}</td>
                          <td className="p-2 text-right font-mono text-xs">{line.creditTotals > 0 ? formatCurrency(line.creditTotals) : '-'}</td>
                          <td className="p-2 text-right font-mono">{line.closingDr > 0 ? formatCurrency(line.closingDr) : '-'}</td>
                          <td className="p-2 text-right font-mono">{line.closingCr > 0 ? formatCurrency(line.closingCr) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted font-medium sticky bottom-0">
                      <tr className="border-t-2">
                        <td colSpan={8} className="p-2 text-right">Total Closing:</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(totalClosingDr)}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(totalClosingCr)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Summary & Save */}
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {fetchedTBData.length} accounts ({fetchedTBData.filter(l => l.isRevenue).length} P&L, {fetchedTBData.filter(l => !l.isRevenue).length} BS) • 
                    Difference: {formatCurrency(Math.abs(totalClosingDr - totalClosingCr))}
                    {totalClosingDr !== totalClosingCr && (
                      <Badge variant="destructive" className="ml-2 text-xs">Unbalanced</Badge>
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
                            <Badge variant="secondary">{line.gstRegistrationType}</Badge>
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
                            <td className="p-3 font-medium">{line.accountName}</td>
                            <td className="p-3 text-muted-foreground text-xs">{line.primaryGroup}</td>
                            <td className="p-3 text-muted-foreground text-xs">{line.parentGroup}</td>
                            <td className="p-3 text-right font-mono text-destructive">
                              {formatCurrency(expectedNature === "Dr" ? line.closingCr : line.closingDr)}
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
