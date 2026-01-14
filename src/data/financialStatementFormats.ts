import * as XLSX from 'xlsx';

// Constitution type to format mapping
export type FSFormatType = 'corporate' | 'non_corporate' | 'llp';

export const CONSTITUTION_TO_FORMAT: Record<string, FSFormatType> = {
  company: 'corporate',
  llp: 'llp',
  partnership: 'non_corporate',
  proprietorship: 'non_corporate',
  trust: 'non_corporate',
  society: 'non_corporate',
  aop: 'non_corporate',
  huf: 'non_corporate',
  cooperative: 'non_corporate',
};

// Line item structure for financial statements
export interface FSLineItem {
  srNo?: string;
  particulars: string;
  noteNo?: string;
  level: number; // 0 = main header, 1 = section, 2 = sub-item, 3 = detail
  isTotal?: boolean;
  fsArea?: string; // Maps to trial balance fs_area
  noteKey?: string; // Key used for note lookup
}

// Corporate Balance Sheet Format (Schedule III)
export const CORPORATE_BS_FORMAT: FSLineItem[] = [
  { particulars: 'EQUITY AND LIABILITIES', level: 0 },
  { particulars: "(1) Shareholders' Funds", level: 1 },
  { srNo: '(a)', particulars: 'Share Capital', level: 2, fsArea: 'Equity', noteKey: 'equity' },
  { srNo: '(b)', particulars: 'Reserves and Surplus', level: 2, fsArea: 'Reserves', noteKey: 'reserves' },
  { srNo: '(c)', particulars: 'Money received against share warrants', level: 2, fsArea: 'Share Warrants', noteKey: 'shareWarrants' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: '(2) Share application money pending allotment', level: 1, fsArea: 'Share Application', noteKey: 'shareApplication' },
  { particulars: '(3) Non-Current liabilities', level: 1 },
  { srNo: '(a)', particulars: 'Long-term borrowings', level: 2, fsArea: 'Borrowings', noteKey: 'borrowings' },
  { srNo: '(b)', particulars: 'Deferred tax liabilities (Net)', level: 2, fsArea: 'Deferred Tax', noteKey: 'deferredTax' },
  { srNo: '(c)', particulars: 'Other long-term liabilities', level: 2, fsArea: 'Other Long Term', noteKey: 'otherLongTerm' },
  { srNo: '(d)', particulars: 'Long-term provisions', level: 2, fsArea: 'Provisions', noteKey: 'provisions' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: '(4) Current liabilities', level: 1 },
  { srNo: '(a)', particulars: 'Short-term borrowings', level: 2, fsArea: 'Short Term Borrowings', noteKey: 'shortTermBorrowings' },
  { srNo: '(b)', particulars: 'Trade payables', level: 2 },
  { particulars: '(A) Micro and Small Enterprises', level: 3, fsArea: 'Payables MSME', noteKey: 'payablesMSME' },
  { particulars: '(B) Others', level: 3, fsArea: 'Payables', noteKey: 'payables' },
  { srNo: '(c)', particulars: 'Other current liabilities', level: 2, fsArea: 'Other Current Liabilities', noteKey: 'otherCurrentLiabilities' },
  { srNo: '(d)', particulars: 'Short-term provisions', level: 2, fsArea: 'Provisions Current', noteKey: 'provisionsCurrent' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: 'TOTAL', level: 0, isTotal: true },
  { particulars: '', level: 0 },
  { particulars: 'ASSETS', level: 0 },
  { particulars: '(1) Non-Current Assets', level: 1 },
  { srNo: '(a)', particulars: 'Property, Plant & Equipment and Intangible Assets', level: 2 },
  { particulars: '(i) Property, Plant and Equipment', level: 3, fsArea: 'Fixed Assets', noteKey: 'fixedAssets' },
  { particulars: '(ii) Intangible assets', level: 3, fsArea: 'Intangible Assets', noteKey: 'intangibleAssets' },
  { particulars: '(iii) Capital work-in-progress', level: 3, fsArea: 'CWIP', noteKey: 'cwip' },
  { particulars: '(iv) Intangible assets under development', level: 3, fsArea: 'Intangible Under Dev', noteKey: 'intangibleUnderDev' },
  { srNo: '(b)', particulars: 'Non-current investments', level: 2, fsArea: 'Investments', noteKey: 'investments' },
  { srNo: '(c)', particulars: 'Deferred tax assets (Net)', level: 2, fsArea: 'Deferred Tax Asset', noteKey: 'deferredTaxAsset' },
  { srNo: '(d)', particulars: 'Long-term loans and advances', level: 2, fsArea: 'Other Non-Current', noteKey: 'otherNonCurrent' },
  { srNo: '(e)', particulars: 'Other non-current assets', level: 2, fsArea: 'Other Non-Current', noteKey: 'otherNonCurrent' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: '(2) Current assets', level: 1 },
  { srNo: '(a)', particulars: 'Current investments', level: 2, fsArea: 'Current Investments', noteKey: 'currentInvestments' },
  { srNo: '(b)', particulars: 'Inventories', level: 2, fsArea: 'Inventory', noteKey: 'inventory' },
  { srNo: '(c)', particulars: 'Trade receivables', level: 2, fsArea: 'Receivables', noteKey: 'receivables' },
  { srNo: '(d)', particulars: 'Cash and bank balances', level: 2, fsArea: 'Cash', noteKey: 'cash' },
  { srNo: '(e)', particulars: 'Short-term loans and advances', level: 2, fsArea: 'Other Current', noteKey: 'otherCurrent' },
  { srNo: '(f)', particulars: 'Other current assets', level: 2, fsArea: 'Other Current', noteKey: 'otherCurrent' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: 'TOTAL', level: 0, isTotal: true },
];

export const CORPORATE_PL_FORMAT: FSLineItem[] = [
  { srNo: 'I', particulars: 'Revenue from operations', level: 1, fsArea: 'Revenue', noteKey: 'revenueFromOperations' },
  { srNo: 'II', particulars: 'Other Income', level: 1, fsArea: 'Other Income', noteKey: 'otherIncome' },
  { srNo: 'III', particulars: 'Total Income (I+II)', level: 1, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'IV', particulars: 'Expenses:', level: 1 },
  { srNo: '(a)', particulars: 'Cost of materials consumed', level: 2, fsArea: 'Cost of Materials', noteKey: 'costOfMaterialsConsumed' },
  { srNo: '(b)', particulars: 'Purchases of Stock-in-Trade', level: 2, fsArea: 'Purchases', noteKey: 'purchasesOfStockInTrade' },
  { srNo: '(c)', particulars: 'Changes in inventories of finished goods, WIP and Stock-in-Trade', level: 2, fsArea: 'Inventory Change', noteKey: 'changesInInventories' },
  { srNo: '(d)', particulars: 'Employee benefits expense', level: 2, fsArea: 'Employee Benefits', noteKey: 'employeeBenefits' },
  { srNo: '(e)', particulars: 'Finance costs', level: 2, fsArea: 'Finance', noteKey: 'financeCosts' },
  { srNo: '(f)', particulars: 'Depreciation and amortization expense', level: 2, fsArea: 'Depreciation', noteKey: 'depreciation' },
  { srNo: '(g)', particulars: 'Other expenses', level: 2, fsArea: 'Other Expenses', noteKey: 'otherExpenses' },
  { particulars: 'Total expenses', level: 1, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'V', particulars: 'Profit/(loss) before exceptional items and tax (III-IV)', level: 1 },
  { srNo: 'VI', particulars: 'Exceptional items', level: 1, fsArea: 'Exceptional', noteKey: 'exceptionalItems' },
  { srNo: 'VII', particulars: 'Profit/(loss) before tax (V-VI)', level: 1 },
  { srNo: 'VIII', particulars: 'Tax expense:', level: 1 },
  { srNo: '(a)', particulars: 'Current tax', level: 2, fsArea: 'Current Tax', noteKey: 'currentTax' },
  { srNo: '(b)', particulars: 'Deferred tax', level: 2, fsArea: 'Deferred Tax Expense', noteKey: 'deferredTaxExpense' },
  { srNo: 'IX', particulars: 'Profit/(Loss) for the period from continuing operations (VII-VIII)', level: 1 },
  { srNo: 'X', particulars: 'Profit/(loss) from discontinuing operations', level: 1 },
  { srNo: 'XI', particulars: 'Tax expense of discontinuing operations', level: 1 },
  { srNo: 'XII', particulars: 'Profit/(loss) from discontinuing operations (after tax) (X-XI)', level: 1 },
  { srNo: 'XIII', particulars: 'Profit/(Loss) for the period (IX+XII)', level: 1, isTotal: true },
  { srNo: 'XIV', particulars: 'Other Comprehensive Income', level: 1 },
  { srNo: 'XV', particulars: 'Total Comprehensive Income for the period (XIII+XIV)', level: 1, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'XVI', particulars: 'Earnings per equity share:', level: 1 },
  { srNo: '(a)', particulars: 'Basic', level: 2 },
  { srNo: '(b)', particulars: 'Diluted', level: 2 },
];

// Non-Corporate Balance Sheet Format (ICAI)
export const NON_CORPORATE_BS_FORMAT: FSLineItem[] = [
  { srNo: 'I', particulars: 'EQUITY AND LIABILITIES', level: 0 },
  { srNo: '1', particulars: "Owners' Funds", level: 1 },
  { srNo: '(a)', particulars: "Owners' Capital Account", level: 2, fsArea: 'Equity' },
  { srNo: '(b)', particulars: 'Reserves and surplus', level: 2, fsArea: 'Reserves' },
  { particulars: '', level: 1, isTotal: true },
  { srNo: '2', particulars: 'Non-current liabilities', level: 1 },
  { srNo: '(a)', particulars: 'Long-term borrowings', level: 2, fsArea: 'Borrowings' },
  { srNo: '(b)', particulars: 'Deferred tax liabilities (Net)', level: 2, fsArea: 'Deferred Tax' },
  { srNo: '(c)', particulars: 'Other long-term liabilities', level: 2, fsArea: 'Other Long Term' },
  { srNo: '(d)', particulars: 'Long-term provisions', level: 2, fsArea: 'Provisions' },
  { particulars: '', level: 1, isTotal: true },
  { srNo: '3', particulars: 'Current liabilities', level: 1 },
  { srNo: '(a)', particulars: 'Short-term borrowings', level: 2, fsArea: 'Short Term Borrowings' },
  { srNo: '(b)', particulars: 'Trade payables', level: 2, fsArea: 'Payables' },
  { srNo: '(c)', particulars: 'Other current liabilities', level: 2, fsArea: 'Other Current Liabilities' },
  { srNo: '(d)', particulars: 'Short-term provisions', level: 2, fsArea: 'Provisions Current' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: 'Total', level: 0, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'II', particulars: 'ASSETS', level: 0 },
  { srNo: '1', particulars: 'Non-current assets', level: 1 },
  { srNo: '(a)', particulars: 'Property, Plant and Equipment and Intangible assets', level: 2 },
  { srNo: '(i)', particulars: 'Property, Plant and Equipment', level: 3, fsArea: 'Fixed Assets' },
  { srNo: '(ii)', particulars: 'Intangible assets', level: 3, fsArea: 'Intangible Assets' },
  { srNo: '(iii)', particulars: 'Capital work in progress', level: 3, fsArea: 'CWIP' },
  { srNo: '(iv)', particulars: 'Intangible asset under development', level: 3, fsArea: 'Intangible Under Dev' },
  { srNo: '(b)', particulars: 'Non-current investments', level: 2, fsArea: 'Investments' },
  { srNo: '(c)', particulars: 'Deferred tax assets (Net)', level: 2, fsArea: 'Deferred Tax Asset' },
  { srNo: '(d)', particulars: 'Long Term Loans and Advances', level: 2, fsArea: 'Other Non-Current' },
  { srNo: '(e)', particulars: 'Other non-current assets', level: 2, fsArea: 'Other Non-Current' },
  { particulars: '', level: 1, isTotal: true },
  { srNo: '2', particulars: 'Current assets', level: 1 },
  { srNo: '(a)', particulars: 'Current investments', level: 2, fsArea: 'Current Investments' },
  { srNo: '(b)', particulars: 'Inventories', level: 2, fsArea: 'Inventory' },
  { srNo: '(c)', particulars: 'Trade receivables', level: 2, fsArea: 'Receivables' },
  { srNo: '(d)', particulars: 'Cash and bank balances', level: 2, fsArea: 'Cash' },
  { srNo: '(e)', particulars: 'Short Term Loans and Advances', level: 2, fsArea: 'Other Current' },
  { srNo: '(f)', particulars: 'Other current assets', level: 2, fsArea: 'Other Current' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: 'Total', level: 0, isTotal: true },
];

export const NON_CORPORATE_PL_FORMAT: FSLineItem[] = [
  { srNo: 'I', particulars: 'Revenue from operations', level: 1, fsArea: 'Revenue', noteKey: 'revenueFromOperations' },
  { srNo: 'II', particulars: 'Other Income', level: 1, fsArea: 'Other Income', noteKey: 'otherIncome' },
  { srNo: 'III', particulars: 'Total Income (I+II)', level: 1, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'IV', particulars: 'Expenses:', level: 1 },
  { srNo: '(a)', particulars: 'Cost of goods sold', level: 2, fsArea: 'Cost of Materials', noteKey: 'costOfMaterialsConsumed' },
  { srNo: '(b)', particulars: 'Employee benefits expense', level: 2, fsArea: 'Employee Benefits', noteKey: 'employeeBenefits' },
  { srNo: '(c)', particulars: 'Finance costs', level: 2, fsArea: 'Finance', noteKey: 'financeCosts' },
  { srNo: '(d)', particulars: 'Depreciation and amortization expense', level: 2, fsArea: 'Depreciation', noteKey: 'depreciation' },
  { srNo: '(e)', particulars: 'Other expenses', level: 2, fsArea: 'Other Expenses', noteKey: 'otherExpenses' },
  { particulars: 'Total expenses', level: 1, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'V', particulars: "Profit/(loss) before exceptional and extraordinary items, owners' remuneration and tax (III-IV)", level: 1 },
  { srNo: 'VI', particulars: 'Exceptional items', level: 1, fsArea: 'Exceptional', noteKey: 'exceptionalItems' },
  { srNo: 'VII', particulars: "Profit/(loss) before extraordinary items, owners' remuneration and tax (V-VI)", level: 1 },
  { srNo: 'VIII', particulars: 'Extraordinary Items', level: 1 },
  { srNo: 'IX', particulars: "Profit before owners' remuneration and tax (VII-VIII)", level: 1 },
  { srNo: 'X', particulars: "Owners' remuneration", level: 1, fsArea: 'Partners Remuneration', noteKey: 'partnersRemuneration' },
  { srNo: 'XI', particulars: 'Profit before tax (IX-X)', level: 1 },
  { srNo: 'XII', particulars: 'Tax expense:', level: 1 },
  { srNo: '(a)', particulars: 'Current tax', level: 2, fsArea: 'Current Tax', noteKey: 'currentTax' },
  { srNo: '(b)', particulars: 'Excess/Short provision of tax relating to earlier years', level: 2 },
  { srNo: '(c)', particulars: 'Deferred tax charge/(benefit)', level: 2, fsArea: 'Deferred Tax Expense' },
  { srNo: 'XIII', particulars: 'Profit/(Loss) for the period from continuing operations (XI-XII)', level: 1 },
  { srNo: 'XIV', particulars: 'Profit/(loss) from discontinuing operations', level: 1 },
  { srNo: 'XV', particulars: 'Tax expense of discontinuing operations', level: 1 },
  { srNo: 'XVI', particulars: 'Profit/(loss) from discontinuing operations (after tax) (XIV-XV)', level: 1 },
  { srNo: 'XVII', particulars: 'Profit/(Loss) for the year (XIII+XVI)', level: 1, isTotal: true },
];

// LLP Balance Sheet Format (ICAI)
export const LLP_BS_FORMAT: FSLineItem[] = [
  { srNo: 'I', particulars: 'EQUITY AND LIABILITIES', level: 0 },
  { srNo: '1', particulars: "Partners' Funds", level: 1 },
  { srNo: '(a)', particulars: "Partners' Capital Account", level: 2 },
  { srNo: '(i)', particulars: "Partners' Contribution", level: 3, fsArea: 'Partners Contribution' },
  { srNo: '(ii)', particulars: "Partners' Current Account", level: 3, fsArea: 'Partners Current' },
  { srNo: '(b)', particulars: 'Reserves and surplus', level: 2, fsArea: 'Reserves' },
  { particulars: '', level: 1, isTotal: true },
  { srNo: '2', particulars: 'Non-current liabilities', level: 1 },
  { srNo: '(a)', particulars: 'Long-term borrowings', level: 2, fsArea: 'Borrowings' },
  { srNo: '(b)', particulars: 'Deferred tax liabilities (Net)', level: 2, fsArea: 'Deferred Tax' },
  { srNo: '(c)', particulars: 'Other long-term liabilities', level: 2, fsArea: 'Other Long Term' },
  { srNo: '(d)', particulars: 'Long-term provisions', level: 2, fsArea: 'Provisions' },
  { particulars: '', level: 1, isTotal: true },
  { srNo: '3', particulars: 'Current liabilities', level: 1 },
  { srNo: '(a)', particulars: 'Short-term borrowings', level: 2, fsArea: 'Short Term Borrowings' },
  { srNo: '(b)', particulars: 'Trade payables', level: 2, fsArea: 'Payables' },
  { srNo: '(c)', particulars: 'Other current liabilities', level: 2, fsArea: 'Other Current Liabilities' },
  { srNo: '(d)', particulars: 'Short-term provisions', level: 2, fsArea: 'Provisions Current' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: 'Total', level: 0, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'II', particulars: 'ASSETS', level: 0 },
  { srNo: '1', particulars: 'Non-current assets', level: 1 },
  { srNo: '(a)', particulars: 'Property, Plant and Equipment and Intangible assets', level: 2 },
  { srNo: '(i)', particulars: 'Property, Plant and Equipment', level: 3, fsArea: 'Fixed Assets' },
  { srNo: '(ii)', particulars: 'Intangible assets', level: 3, fsArea: 'Intangible Assets' },
  { srNo: '(iii)', particulars: 'Capital work in progress', level: 3, fsArea: 'CWIP' },
  { srNo: '(iv)', particulars: 'Intangible asset under development', level: 3, fsArea: 'Intangible Under Dev' },
  { srNo: '(b)', particulars: 'Non-current investments', level: 2, fsArea: 'Investments' },
  { srNo: '(c)', particulars: 'Deferred tax assets (Net)', level: 2, fsArea: 'Deferred Tax Asset' },
  { srNo: '(d)', particulars: 'Long Term Loans and Advances', level: 2, fsArea: 'Other Non-Current' },
  { srNo: '(e)', particulars: 'Other non-current assets', level: 2, fsArea: 'Other Non-Current' },
  { particulars: '', level: 1, isTotal: true },
  { srNo: '2', particulars: 'Current assets', level: 1 },
  { srNo: '(a)', particulars: 'Current investments', level: 2, fsArea: 'Current Investments' },
  { srNo: '(b)', particulars: 'Inventories', level: 2, fsArea: 'Inventory' },
  { srNo: '(c)', particulars: 'Trade receivables', level: 2, fsArea: 'Receivables' },
  { srNo: '(d)', particulars: 'Cash and bank balances', level: 2, fsArea: 'Cash' },
  { srNo: '(e)', particulars: 'Short Term Loans and Advances', level: 2, fsArea: 'Other Current' },
  { srNo: '(f)', particulars: 'Other current assets', level: 2, fsArea: 'Other Current' },
  { particulars: '', level: 1, isTotal: true },
  { particulars: 'Total', level: 0, isTotal: true },
];

export const LLP_PL_FORMAT: FSLineItem[] = [
  { srNo: 'I', particulars: 'Revenue from operations', level: 1, fsArea: 'Revenue' },
  { srNo: 'II', particulars: 'Other Income', level: 1, fsArea: 'Other Income' },
  { srNo: 'III', particulars: 'Total Income (I+II)', level: 1, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'IV', particulars: 'Expenses:', level: 1 },
  { srNo: '(a)', particulars: 'Cost of goods sold', level: 2, fsArea: 'Cost of Materials' },
  { srNo: '(b)', particulars: 'Employee benefits expense', level: 2, fsArea: 'Employee Benefits' },
  { srNo: '(c)', particulars: 'Finance costs', level: 2, fsArea: 'Finance' },
  { srNo: '(d)', particulars: 'Depreciation and amortization expense', level: 2, fsArea: 'Depreciation' },
  { srNo: '(e)', particulars: 'Other expenses', level: 2, fsArea: 'Other Expenses' },
  { particulars: 'Total expenses', level: 1, isTotal: true },
  { particulars: '', level: 0 },
  { srNo: 'V', particulars: "Profit/(loss) before exceptional and extraordinary items, partners' remuneration and tax (III-IV)", level: 1 },
  { srNo: 'VI', particulars: 'Exceptional items', level: 1, fsArea: 'Exceptional' },
  { srNo: 'VII', particulars: "Profit/(loss) before extraordinary items, partners' remuneration and tax (V-VI)", level: 1 },
  { srNo: 'VIII', particulars: 'Extraordinary Items', level: 1 },
  { srNo: 'IX', particulars: "Profit before Partners' Remuneration and tax (VII-VIII)", level: 1 },
  { srNo: 'X', particulars: "Partners' Remuneration", level: 1, fsArea: 'Partners Remuneration' },
  { srNo: 'XI', particulars: 'Profit before Tax (IX-X)', level: 1 },
  { srNo: 'XII', particulars: 'Tax expense:', level: 1 },
  { srNo: '(a)', particulars: 'Current tax', level: 2, fsArea: 'Current Tax' },
  { srNo: '(b)', particulars: 'Excess/Short provision of tax relating to earlier years', level: 2 },
  { srNo: '(c)', particulars: 'Deferred tax charge/(benefit)', level: 2, fsArea: 'Deferred Tax Expense' },
  { srNo: 'XIII', particulars: 'Profit/(Loss) for the period from continuing operations (XI-XII)', level: 1 },
  { srNo: 'XIV', particulars: 'Profit/(loss) from discontinuing operations', level: 1 },
  { srNo: 'XV', particulars: 'Tax expense of discontinuing operations', level: 1 },
  { srNo: 'XVI', particulars: 'Profit/(loss) from discontinuing operations (after tax) (XIV-XV)', level: 1 },
  { srNo: 'XVII', particulars: 'Profit/(Loss) for the year (XIII+XVI)', level: 1, isTotal: true },
];

// Get format based on constitution
export function getBalanceSheetFormat(constitution: string): FSLineItem[] {
  const formatType = CONSTITUTION_TO_FORMAT[constitution] || 'corporate';
  switch (formatType) {
    case 'llp': return LLP_BS_FORMAT;
    case 'non_corporate': return NON_CORPORATE_BS_FORMAT;
    default: return CORPORATE_BS_FORMAT;
  }
}

export function getProfitLossFormat(constitution: string): FSLineItem[] {
  const formatType = CONSTITUTION_TO_FORMAT[constitution] || 'corporate';
  switch (formatType) {
    case 'llp': return LLP_PL_FORMAT;
    case 'non_corporate': return NON_CORPORATE_PL_FORMAT;
    default: return CORPORATE_PL_FORMAT;
  }
}

export function getFormatLabel(constitution: string): string {
  const formatType = CONSTITUTION_TO_FORMAT[constitution] || 'corporate';
  switch (formatType) {
    case 'llp': return 'LLP (ICAI Guidance Note)';
    case 'non_corporate': return 'Non-Corporate Entity (ICAI Guidance Note)';
    default: return 'Schedule III - Companies Act, 2013';
  }
}

// Download blank format template
export function downloadFormatTemplate(type: 'balance_sheet' | 'profit_loss', constitution: string, entityName: string = '') {
  const formatType = CONSTITUTION_TO_FORMAT[constitution] || 'corporate';
  const isBS = type === 'balance_sheet';
  const format = isBS 
    ? getBalanceSheetFormat(constitution) 
    : getProfitLossFormat(constitution);
  const formatLabel = getFormatLabel(constitution);

  const data: (string | number | undefined)[][] = [];
  
  // Header
  data.push([entityName || 'Name of Entity']);
  data.push([isBS ? 'Balance Sheet as at ………………………' : 'Statement of Profit and Loss for the year ended ………………………']);
  data.push(['']);
  data.push(['', '', '', '(Amount in Rs. XX)']);
  data.push([
    'Sr. No.',
    'Particulars',
    'Note No.',
    'Current Year',
    'Previous Year'
  ]);
  data.push(['']);

  // Format items
  format.forEach(item => {
    const indent = '    '.repeat(item.level);
    const srNo = item.srNo || '';
    data.push([
      srNo,
      indent + item.particulars,
      item.fsArea ? '' : '', // Note number placeholder
      item.isTotal ? '-' : '',
      item.isTotal ? '-' : ''
    ]);
  });

  // Footer
  data.push(['']);
  data.push(['Summary of significant accounting policies']);
  data.push(['The accompanying notes are an integral part of the financial statements']);

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 60 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 }
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = isBS ? 'Balance Sheet' : 'Profit and Loss';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const fileName = `${isBS ? 'BalanceSheet' : 'ProfitLoss'}_Format_${formatType}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// Additional rules from the comprehensive rule set
export const COMPREHENSIVE_LEDGER_RULES = [
  // Income Rules
  { priority: 10, match_field: 'account_name', match_pattern: 'Sales', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Domestic Sales', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Export Sales', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Service Income', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Professional Income', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Consultancy Income', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Commission Income', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Revenue' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Brokerage', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Interest Received', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Interest on FD', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Discount Received', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Rent Received', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Dividend Income', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Scrap Sales', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Forex Gain', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  { priority: 10, match_field: 'account_name', match_pattern: 'Exchange Gain', match_type: 'contains', target_aile: 'Income', target_fs_area: 'Other Income' },
  
  // Expense Rules
  { priority: 20, match_field: 'account_name', match_pattern: 'Salary', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Wages', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Bonus', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Incentive', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Employer PF', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Employer ESI', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Staff Welfare', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Directors Remuneration', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Employee Benefits' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Rent', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Lease Rent', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Electricity', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Power', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Fuel', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Water Charges', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Telephone', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Mobile', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Internet', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Travelling', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Conveyance', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Hotel Expenses', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Vehicle Running', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Repairs', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Maintenance', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Office Expenses', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Printing', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Stationery', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Postage', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Courier', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Professional Fees', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Legal Fees', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Consultancy Charges', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Audit Fees', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Bank Charges', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Finance' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Interest Paid', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Finance' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Interest on Loan', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Finance' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Interest on OD', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Finance' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Depreciation', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Depreciation' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Amortisation', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Depreciation' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Bad Debts', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Provision for Doubtful Debts', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Rates and Taxes', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Insurance', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Advertisement', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Sales Promotion', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Commission Paid', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Packing Charges', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Freight', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Cartage', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  { priority: 20, match_field: 'account_name', match_pattern: 'Loading Charges', match_type: 'contains', target_aile: 'Expense', target_fs_area: 'Other Expenses' },
  
  // Asset Rules
  { priority: 30, match_field: 'account_name', match_pattern: 'Cash', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Petty Cash', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Bank', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 30, match_field: 'account_name', match_pattern: 'HDFC Bank', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 30, match_field: 'account_name', match_pattern: 'ICICI Bank', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 30, match_field: 'account_name', match_pattern: 'SBI', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Cash' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Trade Receivable', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Receivables' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Debtors', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Receivables' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Bills Receivable', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Receivables' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Inventory', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Inventory' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Stock', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Inventory' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Raw Material', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Inventory' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Work in Progress', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Inventory' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Finished Goods', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Inventory' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Advance', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Advance to Supplier', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Prepaid', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },
  { priority: 30, match_field: 'account_name', match_pattern: 'GST Input', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },
  { priority: 30, match_field: 'account_name', match_pattern: 'TDS Receivable', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Current' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Security Deposit', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Non-Current' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Fixed Asset', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Land', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Building', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Plant', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Machinery', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Furniture', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Vehicle', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Computer', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Office Equipment', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Fixed Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Software', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Intangible Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Website Development', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Intangible Assets' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Investment', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Investments' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Mutual Fund', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Investments' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Shares', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Investments' },
  { priority: 30, match_field: 'account_name', match_pattern: 'Bonds', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Investments' },
  { priority: 30, match_field: 'account_name', match_pattern: 'FD', match_type: 'contains', target_aile: 'Asset', target_fs_area: 'Other Non-Current' },
  
  // Liability Rules
  { priority: 40, match_field: 'account_name', match_pattern: 'Trade Payable', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Payables' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Creditors', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Payables' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Bills Payable', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Payables' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Outstanding Expenses', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Accrued Expenses', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'GST Payable', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'TDS Payable', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'PF Payable', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'ESI Payable', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Professional Tax Payable', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Advance from Customer', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Unearned Revenue', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Current Liabilities' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Loan', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Term Loan', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Vehicle Loan', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Home Loan', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Education Loan', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'OD', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Short Term Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'CC', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Short Term Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Bank Overdraft', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Short Term Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Unsecured Loan', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Loan from Director', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Loan from Partner', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Borrowings' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Provision', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Provisions' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Provision for Tax', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Provisions' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Provision for Gratuity', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Provisions' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Deferred Tax Liability', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Deferred Tax' },
  { priority: 40, match_field: 'account_name', match_pattern: 'Security Deposit Received', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Other Long Term' },
  
  // Equity Rules
  { priority: 5, match_field: 'account_name', match_pattern: 'Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Proprietor Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Partner Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Partners Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Current Account Partner', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Partners Current' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Partners Current Account', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Partners Current' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Share Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Equity Share Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Preference Share Capital', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Reserves', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 5, match_field: 'account_name', match_pattern: 'General Reserve', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Capital Reserve', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Securities Premium', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Surplus', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Retained Earnings', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Reserves' },
  { priority: 5, match_field: 'account_name', match_pattern: 'Drawings', match_type: 'contains', target_aile: 'Liability', target_fs_area: 'Equity' },
];
