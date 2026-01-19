import * as XLSX from 'xlsx';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';
import {
  getBalanceSheetFormat,
  getProfitLossFormat,
  getFormatLabel,
  FSLineItem,
} from '@/data/financialStatementFormats';

interface ExportOptions {
  engagementName: string;
  clientName: string;
  financialYear: string;
  reportingScale: string;
  constitution?: string;
  startingNoteNumber?: number;
}

interface NoteSchedule {
  noteNo: number;
  title: string;
  fsArea: string;
  currentLines: { accountName: string; amount: number }[];
  previousLines: { accountName: string; amount: number }[];
  currentTotal: number;
  previousTotal: number;
}

const getScaleDivisor = (scale: string): number => {
  switch (scale) {
    case 'hundreds': return 100;
    case 'thousands': return 1000;
    case 'lakhs': return 100000;
    case 'millions': return 1000000;
    case 'crores': return 10000000;
    default: return 1;
  }
};

const getScaleLabel = (scale: string): string => {
  switch (scale) {
    case 'rupees': return 'Amount in ₹';
    case 'hundreds': return "Amount in 100's";
    case 'thousands': return "Amount in 1000's";
    case 'lakhs': return 'Amount in Lakhs';
    case 'millions': return 'Amount in Millions';
    case 'crores': return 'Amount in Crores';
    default: return 'Amount in ₹';
  }
};

const formatAmount = (amount: number, scale: string): number => {
  const divisor = getScaleDivisor(scale);
  return Number((amount / divisor).toFixed(2));
};

// Helper to get lines by fs_area
const getLinesByFsArea = (lines: TrialBalanceLine[], fsArea: string): TrialBalanceLine[] => {
  return lines.filter(l => l.fs_area === fsArea);
};

// Helper to get amount sum by fs_area
const getAmountByFsArea = (lines: TrialBalanceLine[], fsArea: string): number => {
  return lines
    .filter(l => l.fs_area === fsArea)
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
};

// Build note schedules from format and lines
function buildNoteSchedules(
  format: FSLineItem[],
  currentLines: TrialBalanceLine[],
  previousLines: TrialBalanceLine[],
  startingNoteNumber: number
): NoteSchedule[] {
  const schedules: NoteSchedule[] = [];
  let noteCounter = startingNoteNumber;

  // Get unique fsAreas that have amounts
  const fsAreasWithAmounts = new Set<string>();
  format.forEach(item => {
    if (item.fsArea) {
      const currentAmount = getAmountByFsArea(currentLines, item.fsArea);
      const previousAmount = getAmountByFsArea(previousLines, item.fsArea);
      if (currentAmount > 0 || previousAmount > 0) {
        fsAreasWithAmounts.add(item.fsArea);
      }
    }
  });

  format.forEach(item => {
    if (item.fsArea && fsAreasWithAmounts.has(item.fsArea)) {
      // Check if we already have this fsArea
      const existingSchedule = schedules.find(s => s.fsArea === item.fsArea);
      if (!existingSchedule) {
        const currentFsLines = getLinesByFsArea(currentLines, item.fsArea);
        const previousFsLines = getLinesByFsArea(previousLines, item.fsArea);

        const currentTotal = currentFsLines.reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
        const previousTotal = previousFsLines.reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);

        schedules.push({
          noteNo: noteCounter,
          title: item.particulars || item.fsArea,
          fsArea: item.fsArea,
          currentLines: currentFsLines.map(l => ({
            accountName: l.account_name,
            amount: Math.abs(Number(l.closing_balance))
          })),
          previousLines: previousFsLines.map(l => ({
            accountName: l.account_name,
            amount: Math.abs(Number(l.closing_balance))
          })),
          currentTotal,
          previousTotal
        });
        noteCounter++;
      }
    }
  });

  return schedules;
}

// Create a map of fsArea to note number
function buildNoteNumberMap(schedules: NoteSchedule[]): Map<string, number> {
  const map = new Map<string, number>();
  schedules.forEach(schedule => {
    map.set(schedule.fsArea, schedule.noteNo);
  });
  return map;
}

export function exportBalanceSheet(
  currentLines: TrialBalanceLine[],
  previousLines: TrialBalanceLine[],
  options: ExportOptions
) {
  const scale = options.reportingScale;
  const hasPrevious = previousLines.length > 0;
  const constitution = options.constitution || 'company';
  const startingNoteNumber = options.startingNoteNumber || 3;
  
  const bsFormat = getBalanceSheetFormat(constitution);
  const formatLabel = getFormatLabel(constitution);

  // Build note schedules
  const schedules = buildNoteSchedules(bsFormat, currentLines, previousLines, startingNoteNumber);
  const noteNumberMap = buildNoteNumberMap(schedules);

  // Build Balance Sheet summary data
  const summaryData: (string | number | undefined)[][] = [];
  
  summaryData.push(['BALANCE SHEET']);
  summaryData.push([options.clientName]);
  summaryData.push([`As at ${options.financialYear}`]);
  summaryData.push([formatLabel]);
  summaryData.push([getScaleLabel(scale)]);
  summaryData.push([]);
  summaryData.push(['Sr. No.', 'Particulars', 'Note No.', 'Current Year', hasPrevious ? 'Previous Year' : '']);
  summaryData.push([]);

  // Build items with note numbers
  bsFormat.forEach(item => {
    const currentAmount = item.fsArea 
      ? getAmountByFsArea(currentLines, item.fsArea) 
      : 0;
    const previousAmount = item.fsArea 
      ? getAmountByFsArea(previousLines, item.fsArea) 
      : 0;

    const noteNo = item.fsArea && noteNumberMap.has(item.fsArea) 
      ? noteNumberMap.get(item.fsArea) 
      : undefined;

    const indent = '    '.repeat(item.level);
    const showAmount = item.fsArea || item.isTotal;

    // Calculate totals for total rows
    let displayCurrent = showAmount ? formatAmount(currentAmount, scale) : '';
    let displayPrevious = showAmount ? formatAmount(previousAmount, scale) : '';

    if (item.isTotal && item.particulars === 'TOTAL') {
      // Calculate grand total based on position
      const totalAssets = currentLines
        .filter(l => l.aile === 'Asset')
        .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
      const totalLiabilities = currentLines
        .filter(l => l.aile === 'Liability')
        .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
      const prevTotalAssets = previousLines
        .filter(l => l.aile === 'Asset')
        .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
      const prevTotalLiabilities = previousLines
        .filter(l => l.aile === 'Liability')
        .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
      
      // Use total from context (assets or liabilities based on previous items)
      displayCurrent = formatAmount(totalAssets, scale);
      displayPrevious = formatAmount(prevTotalAssets, scale);
    }

    summaryData.push([
      item.srNo || '',
      indent + item.particulars,
      noteNo || '',
      displayCurrent,
      displayPrevious
    ]);
  });

  const workbook = XLSX.utils.book_new();

  // Create Balance Sheet summary worksheet
  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [{ wch: 10 }, { wch: 55 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Balance Sheet');

  // Create Notes to Accounts sheet with all schedules
  const notesData: (string | number | undefined)[][] = [];
  notesData.push(['NOTES TO FINANCIAL STATEMENTS']);
  notesData.push([options.clientName]);
  notesData.push([`As at ${options.financialYear}`]);
  notesData.push([getScaleLabel(scale)]);
  notesData.push([]);

  schedules.forEach(schedule => {
    notesData.push([]);
    notesData.push([`Note ${schedule.noteNo}: ${schedule.title}`]);
    notesData.push(['Particulars', '', 'Current Year', hasPrevious ? 'Previous Year' : '']);
    
    // Combine current and previous lines by account name
    const allAccountNames = new Set<string>();
    schedule.currentLines.forEach(l => allAccountNames.add(l.accountName));
    schedule.previousLines.forEach(l => allAccountNames.add(l.accountName));

    Array.from(allAccountNames).sort().forEach(accountName => {
      const currentLine = schedule.currentLines.find(l => l.accountName === accountName);
      const previousLine = schedule.previousLines.find(l => l.accountName === accountName);
      
      notesData.push([
        accountName,
        '',
        currentLine ? formatAmount(currentLine.amount, scale) : '-',
        previousLine ? formatAmount(previousLine.amount, scale) : '-'
      ]);
    });

    notesData.push([
      'Total',
      '',
      formatAmount(schedule.currentTotal, scale),
      formatAmount(schedule.previousTotal, scale)
    ]);
  });

  const notesWorksheet = XLSX.utils.aoa_to_sheet(notesData);
  notesWorksheet['!cols'] = [{ wch: 50 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, notesWorksheet, 'Notes to BS');

  XLSX.writeFile(workbook, `BalanceSheet_${options.engagementName.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
}

export function exportProfitLoss(
  currentLines: TrialBalanceLine[],
  previousLines: TrialBalanceLine[],
  options: ExportOptions
) {
  const scale = options.reportingScale;
  const hasPrevious = previousLines.length > 0;
  const constitution = options.constitution || 'company';
  // P&L notes start after BS notes - estimate BS uses about 20 notes
  const startingNoteNumber = (options.startingNoteNumber || 3) + 20;
  
  const plFormat = getProfitLossFormat(constitution);
  const formatLabel = getFormatLabel(constitution);

  // Build note schedules
  const schedules = buildNoteSchedules(plFormat, currentLines, previousLines, startingNoteNumber);
  const noteNumberMap = buildNoteNumberMap(schedules);

  // Calculate totals for computed rows
  const revenue = getAmountByFsArea(currentLines, 'Revenue');
  const otherIncome = getAmountByFsArea(currentLines, 'Other Income');
  const totalIncome = revenue + otherIncome;

  const costOfMaterials = getAmountByFsArea(currentLines, 'Cost of Materials');
  const purchases = getAmountByFsArea(currentLines, 'Purchases');
  const inventoryChange = getAmountByFsArea(currentLines, 'Inventory Change');
  const employeeBenefit = getAmountByFsArea(currentLines, 'Employee Benefits');
  const financeCharges = getAmountByFsArea(currentLines, 'Finance');
  const depreciation = getAmountByFsArea(currentLines, 'Depreciation');
  const otherExpenses = getAmountByFsArea(currentLines, 'Other Expenses');
  const totalExpenses = costOfMaterials + purchases + inventoryChange + employeeBenefit + financeCharges + depreciation + otherExpenses;

  const profitBeforeTax = totalIncome - totalExpenses;
  const currentTax = getAmountByFsArea(currentLines, 'Current Tax');
  const deferredTax = getAmountByFsArea(currentLines, 'Deferred Tax Expense');
  const totalTax = currentTax + deferredTax;
  const profitAfterTax = profitBeforeTax - totalTax;

  // Previous period
  const prevRevenue = getAmountByFsArea(previousLines, 'Revenue');
  const prevOtherIncome = getAmountByFsArea(previousLines, 'Other Income');
  const prevTotalIncome = prevRevenue + prevOtherIncome;

  const prevCostOfMaterials = getAmountByFsArea(previousLines, 'Cost of Materials');
  const prevPurchases = getAmountByFsArea(previousLines, 'Purchases');
  const prevInventoryChange = getAmountByFsArea(previousLines, 'Inventory Change');
  const prevEmployeeBenefit = getAmountByFsArea(previousLines, 'Employee Benefits');
  const prevFinanceCharges = getAmountByFsArea(previousLines, 'Finance');
  const prevDepreciation = getAmountByFsArea(previousLines, 'Depreciation');
  const prevOtherExpenses = getAmountByFsArea(previousLines, 'Other Expenses');
  const prevTotalExpenses = prevCostOfMaterials + prevPurchases + prevInventoryChange + prevEmployeeBenefit + prevFinanceCharges + prevDepreciation + prevOtherExpenses;

  const prevProfitBeforeTax = prevTotalIncome - prevTotalExpenses;
  const prevCurrentTax = getAmountByFsArea(previousLines, 'Current Tax');
  const prevDeferredTax = getAmountByFsArea(previousLines, 'Deferred Tax Expense');
  const prevTotalTax = prevCurrentTax + prevDeferredTax;
  const prevProfitAfterTax = prevProfitBeforeTax - prevTotalTax;

  // Build P&L summary data
  const summaryData: (string | number | undefined)[][] = [];
  
  summaryData.push(['STATEMENT OF PROFIT AND LOSS']);
  summaryData.push([options.clientName]);
  summaryData.push([`For the year ended ${options.financialYear}`]);
  summaryData.push([formatLabel]);
  summaryData.push([getScaleLabel(scale)]);
  summaryData.push([]);
  summaryData.push(['Sr. No.', 'Particulars', 'Note No.', 'Current Year', hasPrevious ? 'Previous Year' : '']);
  summaryData.push([]);

  // Map for computed values
  const computedValues: Record<string, { current: number; previous: number }> = {
    'Total Income (I+II)': { current: totalIncome, previous: prevTotalIncome },
    'Total expenses': { current: totalExpenses, previous: prevTotalExpenses },
    "Profit/(loss) before exceptional items and tax (III-IV)": { current: profitBeforeTax, previous: prevProfitBeforeTax },
    "Profit/(loss) before tax (V-VI)": { current: profitBeforeTax, previous: prevProfitBeforeTax },
    "Profit/(Loss) for the period from continuing operations (VII-VIII)": { current: profitAfterTax, previous: prevProfitAfterTax },
    "Profit/(Loss) for the period (IX+XII)": { current: profitAfterTax, previous: prevProfitAfterTax },
    "Total Comprehensive Income for the period (XIII+XIV)": { current: profitAfterTax, previous: prevProfitAfterTax },
  };

  plFormat.forEach(item => {
    const currentAmount = item.fsArea 
      ? getAmountByFsArea(currentLines, item.fsArea) 
      : 0;
    const previousAmount = item.fsArea 
      ? getAmountByFsArea(previousLines, item.fsArea) 
      : 0;

    const noteNo = item.fsArea && noteNumberMap.has(item.fsArea) 
      ? noteNumberMap.get(item.fsArea) 
      : undefined;

    const indent = '    '.repeat(item.level);
    const showAmount = item.fsArea || item.isTotal;

    let displayCurrent: number | string = showAmount ? formatAmount(currentAmount, scale) : '';
    let displayPrevious: number | string = showAmount ? formatAmount(previousAmount, scale) : '';

    // Handle computed rows
    const computed = computedValues[item.particulars];
    if (computed) {
      displayCurrent = formatAmount(computed.current, scale);
      displayPrevious = formatAmount(computed.previous, scale);
    }

    summaryData.push([
      item.srNo || '',
      indent + item.particulars,
      noteNo || '',
      displayCurrent,
      displayPrevious
    ]);
  });

  const workbook = XLSX.utils.book_new();

  // Create P&L summary worksheet
  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [{ wch: 10 }, { wch: 65 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Profit and Loss');

  // Create Notes to Accounts sheet with all schedules
  const notesData: (string | number | undefined)[][] = [];
  notesData.push(['NOTES TO FINANCIAL STATEMENTS']);
  notesData.push([options.clientName]);
  notesData.push([`For the year ended ${options.financialYear}`]);
  notesData.push([getScaleLabel(scale)]);
  notesData.push([]);

  schedules.forEach(schedule => {
    notesData.push([]);
    notesData.push([`Note ${schedule.noteNo}: ${schedule.title}`]);
    notesData.push(['Particulars', '', 'Current Year', hasPrevious ? 'Previous Year' : '']);
    
    // Combine current and previous lines by account name
    const allAccountNames = new Set<string>();
    schedule.currentLines.forEach(l => allAccountNames.add(l.accountName));
    schedule.previousLines.forEach(l => allAccountNames.add(l.accountName));

    Array.from(allAccountNames).sort().forEach(accountName => {
      const currentLine = schedule.currentLines.find(l => l.accountName === accountName);
      const previousLine = schedule.previousLines.find(l => l.accountName === accountName);
      
      notesData.push([
        accountName,
        '',
        currentLine ? formatAmount(currentLine.amount, scale) : '-',
        previousLine ? formatAmount(previousLine.amount, scale) : '-'
      ]);
    });

    notesData.push([
      'Total',
      '',
      formatAmount(schedule.currentTotal, scale),
      formatAmount(schedule.previousTotal, scale)
    ]);
  });

  const notesWorksheet = XLSX.utils.aoa_to_sheet(notesData);
  notesWorksheet['!cols'] = [{ wch: 50 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, notesWorksheet, 'Notes to PL');

  XLSX.writeFile(workbook, `ProfitLoss_${options.engagementName.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
}

export function exportCashFlowStatement(
  lines: TrialBalanceLine[],
  options: ExportOptions
) {
  const scale = options.reportingScale;

  const getMovement = (fsArea: string) => {
    return lines
      .filter(l => l.fs_area === fsArea)
      .reduce((sum, l) => {
        const opening = Number(l.opening_balance);
        const closing = Number(l.closing_balance);
        return sum + (closing - opening);
      }, 0);
  };

  // Operating Activities
  const revenueFromOperations = getAmountByFsArea(lines, 'Revenue');
  const totalExpenses = Math.abs(lines
    .filter(l => l.aile === 'Expense')
    .reduce((sum, l) => sum + Number(l.closing_balance), 0));
  
  const depreciation = lines
    .filter(l => l.account_name.toLowerCase().includes('depreciation'))
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);

  const profitBeforeTax = revenueFromOperations - totalExpenses;
  
  const receivablesChange = -getMovement('Receivables');
  const inventoryChange = -getMovement('Inventory');
  const payablesChange = getMovement('Payables');
  
  const cashFromOperations = profitBeforeTax + depreciation + receivablesChange + inventoryChange + payablesChange;
  
  const taxPaid = lines
    .filter(l => l.account_name.toLowerCase().includes('tax'))
    .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);

  const netCashFromOperating = cashFromOperations - taxPaid;

  // Investing Activities
  const fixedAssetsPurchase = -getMovement('Fixed Assets');
  const investmentsChange = -getMovement('Investments');
  const netCashFromInvesting = fixedAssetsPurchase + investmentsChange;

  // Financing Activities  
  const borrowingsChange = getMovement('Borrowings');
  const equityChange = getMovement('Equity');
  const financeCharges = -getAmountByFsArea(lines, 'Finance');
  const netCashFromFinancing = borrowingsChange + equityChange + financeCharges;

  const netChange = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

  const openingCash = lines
    .filter(l => l.fs_area === 'Cash')
    .reduce((sum, l) => sum + Number(l.opening_balance), 0);
  
  const closingCash = lines
    .filter(l => l.fs_area === 'Cash')
    .reduce((sum, l) => sum + Number(l.closing_balance), 0);

  const data = [
    ['CASH FLOW STATEMENT'],
    [options.clientName],
    [`For the year ended ${options.financialYear}`],
    [getScaleLabel(scale)],
    [],
    ['Particulars', 'Amount'],
    [],
    ['A. CASH FLOW FROM OPERATING ACTIVITIES'],
    ['    Profit Before Tax', formatAmount(profitBeforeTax, scale)],
    ['    Adjustments for:'],
    ['        Depreciation', formatAmount(depreciation, scale)],
    ['    Operating Profit Before Working Capital Changes', formatAmount(profitBeforeTax + depreciation, scale)],
    ['    Changes in Working Capital:'],
    ['        (Increase)/Decrease in Trade Receivables', formatAmount(receivablesChange, scale)],
    ['        (Increase)/Decrease in Inventories', formatAmount(inventoryChange, scale)],
    ['        Increase/(Decrease) in Trade Payables', formatAmount(payablesChange, scale)],
    ['    Cash Generated from Operations', formatAmount(cashFromOperations, scale)],
    ['    Less: Income Tax Paid', formatAmount(-taxPaid, scale)],
    ['    Net Cash from Operating Activities (A)', formatAmount(netCashFromOperating, scale)],
    [],
    ['B. CASH FLOW FROM INVESTING ACTIVITIES'],
    ['    Purchase of Fixed Assets', formatAmount(fixedAssetsPurchase, scale)],
    ['    (Purchase)/Sale of Investments', formatAmount(investmentsChange, scale)],
    ['    Net Cash from Investing Activities (B)', formatAmount(netCashFromInvesting, scale)],
    [],
    ['C. CASH FLOW FROM FINANCING ACTIVITIES'],
    ['    Proceeds/(Repayment) of Borrowings', formatAmount(borrowingsChange, scale)],
    ['    Proceeds from Issue of Share Capital', formatAmount(equityChange, scale)],
    ['    Finance Costs Paid', formatAmount(financeCharges, scale)],
    ['    Net Cash from Financing Activities (C)', formatAmount(netCashFromFinancing, scale)],
    [],
    ['Net Increase/(Decrease) in Cash (A+B+C)', formatAmount(netChange, scale)],
    ['Cash and Cash Equivalents at Beginning', formatAmount(openingCash, scale)],
    ['Cash and Cash Equivalents at End', formatAmount(closingCash, scale)],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [{ wch: 50 }, { wch: 18 }];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Flow Statement');
  
  XLSX.writeFile(workbook, `CashFlow_${options.engagementName.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
}

export function exportAuditReport(options: ExportOptions) {
  const data = [
    ['INDEPENDENT AUDITOR\'S REPORT'],
    [],
    [`To the Members of ${options.clientName}`],
    [],
    ['Report on the Audit of the Standalone Financial Statements'],
    [],
    ['Opinion'],
    ['We have audited the accompanying financial statements of ' + options.clientName + ','],
    ['which comprise the Balance Sheet as at ' + options.financialYear + ','],
    ['the Statement of Profit and Loss, the Statement of Changes in Equity and'],
    ['the Statement of Cash Flows for the year then ended, and notes to the'],
    ['financial statements, including a summary of significant accounting policies'],
    ['and other explanatory information.'],
    [],
    ['In our opinion and to the best of our information and according to the'],
    ['explanations given to us, the aforesaid financial statements give the'],
    ['information required by the Companies Act, 2013 in the manner so required'],
    ['and give a true and fair view in conformity with the accounting principles'],
    ['generally accepted in India, of the state of affairs of the Company as at'],
    [options.financialYear + ' and its profit and its cash flows for the year ended on that date.'],
    [],
    ['Basis for Opinion'],
    ['We conducted our audit in accordance with the Standards on Auditing (SAs)'],
    ['specified under section 143(10) of the Companies Act, 2013.'],
    [],
    ['For [Firm Name]'],
    ['Chartered Accountants'],
    ["Firm's Registration Number: XXXXXX"],
    [],
    ['[Partner Name]'],
    ['Partner'],
    ['Membership Number: XXXXXX'],
    ['UDIN: XXXXXX'],
    [],
    ['Place:'],
    ['Date:'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [{ wch: 80 }];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Report');
  
  XLSX.writeFile(workbook, `AuditReport_${options.engagementName.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
}

// Export all financial statements in a single workbook with notes
export function exportFinancialStatements(
  currentLines: TrialBalanceLine[],
  previousLines: TrialBalanceLine[],
  options: ExportOptions
) {
  const scale = options.reportingScale;
  const hasPrevious = previousLines.length > 0;
  const constitution = options.constitution || 'company';
  const startingNoteNumber = options.startingNoteNumber || 3;
  
  const bsFormat = getBalanceSheetFormat(constitution);
  const plFormat = getProfitLossFormat(constitution);
  const formatLabel = getFormatLabel(constitution);

  const workbook = XLSX.utils.book_new();

  // Build BS note schedules
  const bsSchedules = buildNoteSchedules(bsFormat, currentLines, previousLines, startingNoteNumber);
  const bsNoteNumberMap = buildNoteNumberMap(bsSchedules);
  
  // P&L notes start after BS notes
  const plStartNoteNumber = startingNoteNumber + bsSchedules.length;
  const plSchedules = buildNoteSchedules(plFormat, currentLines, previousLines, plStartNoteNumber);
  const plNoteNumberMap = buildNoteNumberMap(plSchedules);

  // === Balance Sheet Sheet ===
  const bsData: (string | number | undefined)[][] = [];
  bsData.push(['BALANCE SHEET']);
  bsData.push([options.clientName]);
  bsData.push([`As at ${options.financialYear}`]);
  bsData.push([formatLabel]);
  bsData.push([getScaleLabel(scale)]);
  bsData.push([]);
  bsData.push(['Sr. No.', 'Particulars', 'Note No.', 'Current Year', hasPrevious ? 'Previous Year' : '']);
  bsData.push([]);

  bsFormat.forEach(item => {
    const currentAmount = item.fsArea ? getAmountByFsArea(currentLines, item.fsArea) : 0;
    const previousAmount = item.fsArea ? getAmountByFsArea(previousLines, item.fsArea) : 0;
    const noteNo = item.fsArea && bsNoteNumberMap.has(item.fsArea) ? bsNoteNumberMap.get(item.fsArea) : undefined;
    const indent = '    '.repeat(item.level);
    const showAmount = item.fsArea || item.isTotal;

    let displayCurrent: number | string = showAmount ? formatAmount(currentAmount, scale) : '';
    let displayPrevious: number | string = showAmount ? formatAmount(previousAmount, scale) : '';

    if (item.isTotal && item.particulars === 'TOTAL') {
      const totalAssets = currentLines.filter(l => l.aile === 'Asset').reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
      const prevTotalAssets = previousLines.filter(l => l.aile === 'Asset').reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
      displayCurrent = formatAmount(totalAssets, scale);
      displayPrevious = formatAmount(prevTotalAssets, scale);
    }

    bsData.push([item.srNo || '', indent + item.particulars, noteNo || '', displayCurrent, displayPrevious]);
  });

  const bsWorksheet = XLSX.utils.aoa_to_sheet(bsData);
  bsWorksheet['!cols'] = [{ wch: 10 }, { wch: 55 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, bsWorksheet, 'Balance Sheet');

  // === Profit & Loss Sheet ===
  const plData: (string | number | undefined)[][] = [];
  plData.push(['STATEMENT OF PROFIT AND LOSS']);
  plData.push([options.clientName]);
  plData.push([`For the year ended ${options.financialYear}`]);
  plData.push([formatLabel]);
  plData.push([getScaleLabel(scale)]);
  plData.push([]);
  plData.push(['Sr. No.', 'Particulars', 'Note No.', 'Current Year', hasPrevious ? 'Previous Year' : '']);
  plData.push([]);

  // Calculate P&L totals
  const revenue = getAmountByFsArea(currentLines, 'Revenue');
  const otherIncome = getAmountByFsArea(currentLines, 'Other Income');
  const totalIncome = revenue + otherIncome;
  const costOfMaterials = getAmountByFsArea(currentLines, 'Cost of Materials');
  const purchases = getAmountByFsArea(currentLines, 'Purchases');
  const inventoryChangePL = getAmountByFsArea(currentLines, 'Inventory Change');
  const employeeBenefit = getAmountByFsArea(currentLines, 'Employee Benefits');
  const financeCharges = getAmountByFsArea(currentLines, 'Finance');
  const depreciation = getAmountByFsArea(currentLines, 'Depreciation');
  const otherExpenses = getAmountByFsArea(currentLines, 'Other Expenses');
  const totalExpensesPL = costOfMaterials + purchases + inventoryChangePL + employeeBenefit + financeCharges + depreciation + otherExpenses;
  const profitBeforeTax = totalIncome - totalExpensesPL;
  const currentTax = getAmountByFsArea(currentLines, 'Current Tax');
  const deferredTax = getAmountByFsArea(currentLines, 'Deferred Tax Expense');
  const profitAfterTax = profitBeforeTax - currentTax - deferredTax;

  const prevRevenue = getAmountByFsArea(previousLines, 'Revenue');
  const prevOtherIncome = getAmountByFsArea(previousLines, 'Other Income');
  const prevTotalIncome = prevRevenue + prevOtherIncome;
  const prevCostOfMaterials = getAmountByFsArea(previousLines, 'Cost of Materials');
  const prevPurchases = getAmountByFsArea(previousLines, 'Purchases');
  const prevInventoryChangePL = getAmountByFsArea(previousLines, 'Inventory Change');
  const prevEmployeeBenefit = getAmountByFsArea(previousLines, 'Employee Benefits');
  const prevFinanceCharges = getAmountByFsArea(previousLines, 'Finance');
  const prevDepreciation = getAmountByFsArea(previousLines, 'Depreciation');
  const prevOtherExpenses = getAmountByFsArea(previousLines, 'Other Expenses');
  const prevTotalExpensesPL = prevCostOfMaterials + prevPurchases + prevInventoryChangePL + prevEmployeeBenefit + prevFinanceCharges + prevDepreciation + prevOtherExpenses;
  const prevProfitBeforeTax = prevTotalIncome - prevTotalExpensesPL;
  const prevCurrentTax = getAmountByFsArea(previousLines, 'Current Tax');
  const prevDeferredTax = getAmountByFsArea(previousLines, 'Deferred Tax Expense');
  const prevProfitAfterTax = prevProfitBeforeTax - prevCurrentTax - prevDeferredTax;

  const computedPL: Record<string, { current: number; previous: number }> = {
    'Total Income (I+II)': { current: totalIncome, previous: prevTotalIncome },
    'Total expenses': { current: totalExpensesPL, previous: prevTotalExpensesPL },
    "Profit/(loss) before exceptional items and tax (III-IV)": { current: profitBeforeTax, previous: prevProfitBeforeTax },
    "Profit/(loss) before tax (V-VI)": { current: profitBeforeTax, previous: prevProfitBeforeTax },
    "Profit/(Loss) for the period from continuing operations (VII-VIII)": { current: profitAfterTax, previous: prevProfitAfterTax },
    "Profit/(Loss) for the period (IX+XII)": { current: profitAfterTax, previous: prevProfitAfterTax },
    "Total Comprehensive Income for the period (XIII+XIV)": { current: profitAfterTax, previous: prevProfitAfterTax },
  };

  plFormat.forEach(item => {
    const currentAmount = item.fsArea ? getAmountByFsArea(currentLines, item.fsArea) : 0;
    const previousAmount = item.fsArea ? getAmountByFsArea(previousLines, item.fsArea) : 0;
    const noteNo = item.fsArea && plNoteNumberMap.has(item.fsArea) ? plNoteNumberMap.get(item.fsArea) : undefined;
    const indent = '    '.repeat(item.level);
    const showAmount = item.fsArea || item.isTotal;

    let displayCurrent: number | string = showAmount ? formatAmount(currentAmount, scale) : '';
    let displayPrevious: number | string = showAmount ? formatAmount(previousAmount, scale) : '';

    const computed = computedPL[item.particulars];
    if (computed) {
      displayCurrent = formatAmount(computed.current, scale);
      displayPrevious = formatAmount(computed.previous, scale);
    }

    plData.push([item.srNo || '', indent + item.particulars, noteNo || '', displayCurrent, displayPrevious]);
  });

  const plWorksheet = XLSX.utils.aoa_to_sheet(plData);
  plWorksheet['!cols'] = [{ wch: 10 }, { wch: 65 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, plWorksheet, 'Profit and Loss');

  // === Notes to Financial Statements ===
  const notesData: (string | number | undefined)[][] = [];
  notesData.push(['NOTES TO FINANCIAL STATEMENTS']);
  notesData.push([options.clientName]);
  notesData.push([options.financialYear]);
  notesData.push([getScaleLabel(scale)]);
  notesData.push([]);

  // Add all BS schedules
  bsSchedules.forEach(schedule => {
    notesData.push([]);
    notesData.push([`Note ${schedule.noteNo}: ${schedule.title}`]);
    notesData.push(['Particulars', '', 'Current Year', hasPrevious ? 'Previous Year' : '']);
    
    const allAccountNames = new Set<string>();
    schedule.currentLines.forEach(l => allAccountNames.add(l.accountName));
    schedule.previousLines.forEach(l => allAccountNames.add(l.accountName));

    Array.from(allAccountNames).sort().forEach(accountName => {
      const currentLine = schedule.currentLines.find(l => l.accountName === accountName);
      const previousLine = schedule.previousLines.find(l => l.accountName === accountName);
      notesData.push([
        accountName,
        '',
        currentLine ? formatAmount(currentLine.amount, scale) : '-',
        previousLine ? formatAmount(previousLine.amount, scale) : '-'
      ]);
    });

    notesData.push(['Total', '', formatAmount(schedule.currentTotal, scale), formatAmount(schedule.previousTotal, scale)]);
  });

  // Add all PL schedules
  plSchedules.forEach(schedule => {
    notesData.push([]);
    notesData.push([`Note ${schedule.noteNo}: ${schedule.title}`]);
    notesData.push(['Particulars', '', 'Current Year', hasPrevious ? 'Previous Year' : '']);
    
    const allAccountNames = new Set<string>();
    schedule.currentLines.forEach(l => allAccountNames.add(l.accountName));
    schedule.previousLines.forEach(l => allAccountNames.add(l.accountName));

    Array.from(allAccountNames).sort().forEach(accountName => {
      const currentLine = schedule.currentLines.find(l => l.accountName === accountName);
      const previousLine = schedule.previousLines.find(l => l.accountName === accountName);
      notesData.push([
        accountName,
        '',
        currentLine ? formatAmount(currentLine.amount, scale) : '-',
        previousLine ? formatAmount(previousLine.amount, scale) : '-'
      ]);
    });

    notesData.push(['Total', '', formatAmount(schedule.currentTotal, scale), formatAmount(schedule.previousTotal, scale)]);
  });

  const notesWorksheet = XLSX.utils.aoa_to_sheet(notesData);
  notesWorksheet['!cols'] = [{ wch: 50 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, notesWorksheet, 'Notes');

  XLSX.writeFile(workbook, `FinancialStatements_${options.engagementName.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
}
