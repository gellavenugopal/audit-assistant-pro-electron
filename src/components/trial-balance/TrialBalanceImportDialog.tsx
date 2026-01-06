import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSpreadsheet, AlertCircle, CheckCircle2, Download, Info } from 'lucide-react';
import { TrialBalanceLineInput } from '@/hooks/useTrialBalance';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: TrialBalanceLineInput[], upsertMode: boolean) => Promise<boolean>;
}

interface ParsedRow {
  branch_name?: string;
  account_code: string;
  account_name: string;
  ledger_parent?: string;
  ledger_primary_group?: string;
  opening_balance: number;
  debit: number;
  credit: number;
  closing_balance: number;
  balance_type?: string;
  aile?: 'Asset' | 'Income' | 'Liability' | 'Expense';
  fs_area?: string;
  note?: string;
  period_type?: string;
  period_ending?: string;
}

interface HierarchyRow {
  account_name: string;
  parents: string[];
}

// Download blank TB template with 2 sheets
// Sign convention: Debit = negative, Credit = positive (Tally convention)
export function downloadBlankTBTemplate() {
  // Sheet 1 - Trial Balance Data (Debit balances as negative, Credit as positive)
  const sheet1Data = [
    ['Account Head', 'Opening Balance', 'Total Debit', 'Total Credit', 'Closing Balance', 'Account Code', 'Branch'],
    ['Cash in Hand', -50000, 100000, 80000, -70000, 'CASH001', 'HO'],
    ['Bank Account - SBI', -200000, 500000, 450000, -250000, 'BANK001', 'HO'],
    ['Trade Receivables', -150000, 300000, 250000, -200000, 'TR001', 'Branch1'],
    ['Trade Payables', 100000, 80000, 120000, 140000, 'TP001', 'HO'],
    ['Share Capital', 500000, 0, 50000, 550000, 'SC001', 'HO'],
    ['Sales Revenue', 0, 0, 1000000, 1000000, 'REV001', 'HO'],
    ['Salary Expense', 0, 200000, 0, -200000, 'EXP001', 'HO'],
    ['', '', '', '', '', '', ''],
    ['[Add more accounts below...]', '', '', '', '', '', ''],
  ];

  // Sheet 2 - Hierarchy Data
  const sheet2Data = [
    ['Account Head', 'Parent 1', 'Parent 2', 'Parent 3', 'Parent 4', 'Parent 5'],
    ['Cash in Hand', 'Cash-in-hand', 'Cash and Cash Equivalents', 'Current Assets', 'Assets', ''],
    ['Bank Account - SBI', 'Bank Accounts', 'Cash and Cash Equivalents', 'Current Assets', 'Assets', ''],
    ['Trade Receivables', 'Sundry Debtors', 'Trade Receivables', 'Current Assets', 'Assets', ''],
    ['Trade Payables', 'Sundry Creditors', 'Trade Payables', 'Current Liabilities', 'Liabilities', ''],
    ['Share Capital', 'Share Capital', 'Equity', "Shareholders' Funds", 'Liabilities', ''],
    ['Sales Revenue', 'Sales Accounts', 'Revenue from Operations', 'Income', '', ''],
    ['Salary Expense', 'Salaries', 'Employee Benefit Expenses', 'Expenses', '', ''],
    ['', '', '', '', '', ''],
    ['[Add more accounts below...]', '', '', '', '', ''],
  ];

  // Sheet 3 - Instructions
  const sheet3Data = [
    ['TRIAL BALANCE IMPORT TEMPLATE - INSTRUCTIONS'],
    [''],
    ['SIGN CONVENTION (Tally Standard):'],
    ['- Debit Balance = NEGATIVE (e.g., Assets, Expenses)'],
    ['- Credit Balance = POSITIVE (e.g., Liabilities, Income, Equity)'],
    [''],
    ['SHEET 1: Trial Balance Data'],
    ['- Account Head: Name of the ledger account (REQUIRED)'],
    ['- Opening Balance: Balance at the beginning of the period (negative = Debit, positive = Credit)'],
    ['- Total Debit: Total debits during the period (always positive value)'],
    ['- Total Credit: Total credits during the period (always positive value)'],
    ['- Closing Balance: Balance at the end of the period (negative = Debit, positive = Credit)'],
    ['- Account Code: Unique code for the account (optional)'],
    ['- Branch: Branch name if multi-branch (optional)'],
    [''],
    ['EXAMPLES:'],
    ['- Cash in Hand (Asset): Opening = -50,000, Closing = -70,000 (Debit balances, shown as negative)'],
    ['- Trade Payables (Liability): Opening = 100,000, Closing = 140,000 (Credit balances, shown as positive)'],
    ['- Sales Revenue (Income): Closing = 1,000,000 (Credit balance, shown as positive)'],
    ['- Salary Expense (Expense): Closing = -200,000 (Debit balance, shown as negative)'],
    [''],
    ['SHEET 2: Hierarchy Data'],
    ['- Account Head: Must match EXACTLY with Sheet 1 (case-sensitive)'],
    ['- Parent 1 to Parent N: Parent groups from immediate parent to top-level group'],
    ['- Example: "Cash in Hand" -> "Cash-in-hand" -> "Current Assets" -> "Assets"'],
    [''],
    ['NOTES:'],
    ['- You can specify the starting row for data in each sheet during import'],
    ['- Delete sample rows before importing your actual data'],
    ['- Parent hierarchy helps in automatic classification to Schedule III format'],
  ];

  const workbook = XLSX.utils.book_new();
  
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 35 }, // Account Head
    { wch: 15 }, // Opening Balance
    { wch: 15 }, // Total Debit
    { wch: 15 }, // Total Credit
    { wch: 15 }, // Closing Balance
    { wch: 15 }, // Account Code
    { wch: 15 }, // Branch
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 35 }, // Account Head
    { wch: 25 }, // Parent 1
    { wch: 25 }, // Parent 2
    { wch: 25 }, // Parent 3
    { wch: 25 }, // Parent 4
    { wch: 25 }, // Parent 5
  ];
  
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [{ wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, ws1, 'Trial Balance');
  XLSX.utils.book_append_sheet(workbook, ws2, 'Hierarchy');
  XLSX.utils.book_append_sheet(workbook, ws3, 'Instructions');

  XLSX.writeFile(workbook, 'Trial_Balance_Template.xlsx');
}

export function TrialBalanceImportDialog({ open, onOpenChange, onImport }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [upsertMode, setUpsertMode] = useState(true);
  const [periodEnding, setPeriodEnding] = useState<string>('');
  const [periodType, setPeriodType] = useState<string>('current');
  const [sheet1StartRow, setSheet1StartRow] = useState<number>(2);
  const [sheet2StartRow, setSheet2StartRow] = useState<number>(2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setPeriodEnding('');
    setPeriodType('current');
    setSheet1StartRow(2);
    setSheet2StartRow(2);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setParsedData([]);
  };

  const parseFile = async () => {
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      
      // We need at least 1 sheet for trial balance data
      if (workbook.SheetNames.length === 0) {
        setError('The file appears to be empty');
        return;
      }

      // Parse Sheet 1 - Trial Balance Data
      const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
      const sheet1Json = XLSX.utils.sheet_to_json(sheet1, { 
        header: 1, 
        range: sheet1StartRow - 1 // Convert to 0-indexed
      }) as any[][];

      if (sheet1Json.length === 0) {
        setError('No data found in the first sheet');
        return;
      }

      // Parse Sheet 2 - Hierarchy Data (if exists)
      let hierarchyMap = new Map<string, HierarchyRow>();
      if (workbook.SheetNames.length >= 2) {
        const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
        const sheet2Json = XLSX.utils.sheet_to_json(sheet2, { 
          header: 1, 
          range: sheet2StartRow - 1 
        }) as any[][];

        // Build hierarchy map: Account Head -> Parents array
        for (const row of sheet2Json) {
          if (!row[0] || typeof row[0] !== 'string' || row[0].trim() === '') continue;
          
          const accountName = String(row[0]).trim();
          const parents: string[] = [];
          
          // Collect all parent columns (Parent 1, Parent 2, ...)
          for (let i = 1; i < row.length; i++) {
            if (row[i] && String(row[i]).trim() !== '') {
              parents.push(String(row[i]).trim());
            }
          }
          
          hierarchyMap.set(accountName.toLowerCase(), { account_name: accountName, parents });
        }
      }

      // Parse Sheet 1 data with expected columns:
      // Account Head, Opening Balance, Total Debit, Total Credit, Closing Balance, Account Code, Branch
      const rows: ParsedRow[] = [];
      
      for (const row of sheet1Json) {
        if (!row[0] || String(row[0]).trim() === '') continue;
        
        const accountName = String(row[0]).trim();
        const openingBalance = parseFloat(row[1]) || 0;
        const debit = parseFloat(row[2]) || 0;
        const credit = parseFloat(row[3]) || 0;
        const closingBalance = parseFloat(row[4]) || 0;
        const accountCode = row[5] ? String(row[5]).trim() : accountName.substring(0, 20).toUpperCase().replace(/\s+/g, '_');
        const branchName = row[6] ? String(row[6]).trim() : undefined;

        // Get hierarchy info
        const hierarchy = hierarchyMap.get(accountName.toLowerCase());
        // ledger_parent = immediate parent (e.g., "Indirect Expenses")
        const ledgerParent = hierarchy?.parents[0] || undefined;
        // ledger_primary_group = concatenate all parents for comprehensive rule matching
        // This allows rules to match "Indirect Expenses", "Expenses", or any level in the hierarchy
        // Format: "Indirect Expenses | Expenses" - rules can match any part
        const ledgerPrimaryGroup = hierarchy?.parents.join(' | ') || ledgerParent || undefined;

        rows.push({
          account_code: accountCode,
          account_name: accountName,
          branch_name: branchName,
          opening_balance: openingBalance,
          debit: debit,
          credit: credit,
          closing_balance: closingBalance,
          ledger_parent: ledgerParent,
          ledger_primary_group: ledgerPrimaryGroup,
        });
      }

      if (rows.length === 0) {
        setError('No valid data rows found. Check that data starts from the specified row.');
        return;
      }

      setParsedData(rows);
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Failed to parse the Excel file. Please check the format.');
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    
    // Apply period settings to all rows
    const dataWithPeriod = parsedData.map(row => ({
      ...row,
      period_type: periodType,
      period_ending: periodEnding || undefined,
    }));
    
    const success = await onImport(dataWithPeriod, upsertMode);
    setImporting(false);

    if (success) {
      resetState();
      onOpenChange(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Import Trial Balance
            <Button variant="outline" size="sm" onClick={downloadBlankTBTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with 2 sheets: Trial Balance data and Hierarchy mapping.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Period Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_type">Period Type</Label>
              <select
                id="period_type"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="current">Current Period</option>
                <option value="previous">Previous Period</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_ending">Period Ending Date</Label>
              <Input
                id="period_ending"
                type="date"
                value={periodEnding}
                onChange={(e) => setPeriodEnding(e.target.value)}
              />
            </div>
          </div>

          {/* Row Number Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="sheet1_row">Sheet 1 Data Starts From Row</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Row number where actual data begins (skip header rows)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="sheet1_row"
                type="number"
                min={1}
                value={sheet1StartRow}
                onChange={(e) => setSheet1StartRow(parseInt(e.target.value) || 2)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="sheet2_row">Sheet 2 Data Starts From Row</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Row number where hierarchy data begins (skip header rows)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="sheet2_row"
                type="number"
                min={1}
                value={sheet2StartRow}
                onChange={(e) => setSheet2StartRow(parseInt(e.target.value) || 2)}
              />
            </div>
          </div>

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-foreground font-medium mb-1">
                Drop your Excel file here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse (XLSX, XLS)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  Change
                </Button>
              </div>

              {parsedData.length === 0 && !error && (
                <Button onClick={parseFile} className="w-full">
                  Parse File
                </Button>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {parsedData.length > 0 && !error && (
                <div className="flex items-start gap-2 p-3 bg-success/10 text-success rounded-lg">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Ready to import {parsedData.length} lines</p>
                    <p className="text-xs opacity-80 mt-1">
                      Sheet 1: Trial Balance data | Sheet 2: Hierarchy mapping
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upsert Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="upsert_mode"
              checked={upsertMode}
              onCheckedChange={(checked) => setUpsertMode(checked === true)}
            />
            <Label htmlFor="upsert_mode" className="text-sm">
              Update existing lines if Branch + Account Code matches (recommended)
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedData.length === 0 || importing || !!error}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
