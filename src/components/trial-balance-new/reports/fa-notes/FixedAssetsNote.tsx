import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { formatIndianNumber } from '@/utils/formatNumber';

interface FixedAssetsNoteProps {
  data: LedgerRow[];
  noteNumber: string;
  reportingScale?: string;
}

interface AssetCategory {
  name: string;
  openingGross: number;
  additions: number;
  deductions: number;
  closingGross: number;
  openingDep: number;
  depForYear: number;
  depOnDeductions: number;
  closingDep: number;
  openingNet: number;
  closingNet: number;
}

export function FixedAssetsNote({ data, noteNumber, reportingScale = 'rupees' }: FixedAssetsNoteProps) {
  const scaleValue = useMemo(() => {
    switch (reportingScale) {
      case 'thousands': return 1000;
      case 'lakhs': return 100000;
      case 'crores': return 10000000;
      default: return 1;
    }
  }, [reportingScale]);

  const formatValue = (value: number) => {
    const scaled = value / scaleValue;
    return formatIndianNumber(scaled);
  };

  // Helper functions to safely access ledger properties
  const getLedgerName = (row: LedgerRow) => row['Ledger Name'] || (row as any).ledgerName || '';
  const getOpeningBalance = (row: LedgerRow) => row['Opening Balance'] ?? (row as any).openingBalance ?? 0;
  const getClosingBalance = (row: LedgerRow) => row['Closing Balance'] ?? (row as any).closingBalance ?? 0;

  const fixedAssetRows = useMemo(() => {
    if (!data || data.length === 0) return [] as LedgerRow[];
    return data.filter(row => {
      const h2 = (row.H2 || '').toLowerCase();
      const h3 = (row.H3 || '').toLowerCase();
      const h4 = (row.H4 || '').toLowerCase();
      const primary = (row['Primary Group'] || '').toLowerCase();
      const ledgerName = getLedgerName(row).toLowerCase();
      
      // Match by Primary Group "Fixed Assets"
      if (primary.includes('fixed asset')) return true;
      
      // Match by H3/H4 classification
      if (h3.includes('property') || h3.includes('plant') || h3.includes('equipment') || h3.includes('ppe')) return true;
      if (h4.includes('tangible') || h4.includes('intangible')) return true;
      
      // Match by ledger name patterns (common PPE items)
      const ppePatterns = [
        'land', 'building', 'plant', 'machinery', 'furniture', 'fixture',
        'vehicle', 'computer', 'electrical', 'office equipment',
        'goodwill', 'software', 'trademark', 'brand'
      ];
      if (ppePatterns.some(pattern => ledgerName.includes(pattern))) return true;
      
      return false;
    });
  }, [data]);

  // Asset categories mapping
  const assetCategories = useMemo(() => {
    const tangible: AssetCategory[] = [
      { name: 'Freehold Land', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Leasehold Land', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Buildings', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Leasehold Improvement', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Plant and Machinery', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Furniture and Fixtures', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Electrical Installations', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Office Equipment', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Computers', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Vehicles', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
    ];

    const intangible: AssetCategory[] = [
      { name: 'Goodwill', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Goodwill on Consolidation', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Computer Software', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Trademarks and Brands', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Technical Knowhow', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
      { name: 'Others', openingGross: 0, additions: 0, deductions: 0, closingGross: 0, openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0, openingNet: 0, closingNet: 0 },
    ];

    const resolveCategory = (row: LedgerRow): AssetCategory | null => {
      const h3 = (row.H3 || '').toLowerCase();
      const h4 = (row.H4 || '').toLowerCase();
      const ledgerName = getLedgerName(row).toLowerCase();

      const isIntangible = h3.includes('intangible') || h4.includes('intangible') ||
        ledgerName.includes('goodwill') || ledgerName.includes('software') || ledgerName.includes('trademark') || ledgerName.includes('brand');

      if (isIntangible) {
        if (ledgerName.includes('goodwill on consolidation')) return intangible.find(c => c.name === 'Goodwill on Consolidation') || null;
        if (ledgerName.includes('goodwill')) return intangible.find(c => c.name === 'Goodwill') || null;
        if (ledgerName.includes('software')) return intangible.find(c => c.name === 'Computer Software') || null;
        if (ledgerName.includes('trademark') || ledgerName.includes('brand')) return intangible.find(c => c.name === 'Trademarks and Brands') || null;
        if (ledgerName.includes('technical') || ledgerName.includes('knowhow')) return intangible.find(c => c.name === 'Technical Knowhow') || null;
        return intangible.find(c => c.name === 'Others') || null;
      }

      if (ledgerName.includes('freehold land')) return tangible.find(c => c.name === 'Freehold Land') || null;
      if (ledgerName.includes('leasehold land')) return tangible.find(c => c.name === 'Leasehold Land') || null;
      if (ledgerName.includes('building')) return tangible.find(c => c.name === 'Buildings') || null;
      if (ledgerName.includes('leasehold improvement')) return tangible.find(c => c.name === 'Leasehold Improvement') || null;
      if (ledgerName.includes('plant') || ledgerName.includes('machinery')) return tangible.find(c => c.name === 'Plant and Machinery') || null;
      if (ledgerName.includes('furniture') || ledgerName.includes('fixture')) return tangible.find(c => c.name === 'Furniture and Fixtures') || null;
      if (ledgerName.includes('electrical')) return tangible.find(c => c.name === 'Electrical Installations') || null;
      if (ledgerName.includes('office equipment')) return tangible.find(c => c.name === 'Office Equipment') || null;
      if (ledgerName.includes('computer')) return tangible.find(c => c.name === 'Computers') || null;
      if (ledgerName.includes('vehicle')) return tangible.find(c => c.name === 'Vehicles') || null;

      // Default bucket for tangible assets
      return tangible.find(c => c.name === 'Plant and Machinery') || null;
    };

    fixedAssetRows.forEach(row => {
      const category = resolveCategory(row);
      if (!category) return;

      const opening = Number(getOpeningBalance(row) || 0);
      const closing = Number(getClosingBalance(row) || 0);

      // Movement-based logic following Tally sign convention (Negative = Dr, Positive = Cr)
      // Assets are Dr balance (negative in Tally)
      // If Closing < Opening: Asset increased (more negative Dr) → Addition
      // If Closing > Opening: Asset decreased (less negative Dr) → Deduction
      const movement = closing - opening;
      
      const addition = movement < 0 ? Math.abs(movement) : 0;
      const deduction = movement > 0 ? Math.abs(movement) : 0;

      // Debug logging
      const ledgerName = getLedgerName(row);
      if (ledgerName.toLowerCase().includes('plant') || ledgerName.toLowerCase().includes('furniture')) {
        console.log(`FA Debug - ${ledgerName}:`, {
          opening,
          closing,
          movement,
          addition,
          deduction,
        });
      }

      // Gross Block uses absolute values
      category.openingGross += Math.abs(opening);
      category.additions += addition;
      category.deductions += deduction;
      category.closingGross += Math.abs(closing);

      // We don't have separate depreciation movement per asset here; treat net as gross for display
      category.openingNet += Math.abs(opening);
      category.closingNet += Math.abs(closing);
    });

    return { tangible, intangible };
  }, [fixedAssetRows]);

  // Calculate totals
  const tangibleTotal = useMemo(() => {
    return assetCategories.tangible.reduce((acc, cat) => ({
      openingGross: acc.openingGross + cat.openingGross,
      additions: acc.additions + cat.additions,
      deductions: acc.deductions + cat.deductions,
      closingGross: acc.closingGross + cat.closingGross,
      openingDep: acc.openingDep + cat.openingDep,
      depForYear: acc.depForYear + cat.depForYear,
      depOnDeductions: acc.depOnDeductions + cat.depOnDeductions,
      closingDep: acc.closingDep + cat.closingDep,
      openingNet: acc.openingNet + cat.openingNet,
      closingNet: acc.closingNet + cat.closingNet,
    }), {
      openingGross: 0, additions: 0, deductions: 0, closingGross: 0,
      openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0,
      openingNet: 0, closingNet: 0
    });
  }, [assetCategories.tangible]);

  const intangibleTotal = useMemo(() => {
    return assetCategories.intangible.reduce((acc, cat) => ({
      openingGross: acc.openingGross + cat.openingGross,
      additions: acc.additions + cat.additions,
      deductions: acc.deductions + cat.deductions,
      closingGross: acc.closingGross + cat.closingGross,
      openingDep: acc.openingDep + cat.openingDep,
      depForYear: acc.depForYear + cat.depForYear,
      depOnDeductions: acc.depOnDeductions + cat.depOnDeductions,
      closingDep: acc.closingDep + cat.closingDep,
      openingNet: acc.openingNet + cat.openingNet,
      closingNet: acc.closingNet + cat.closingNet,
    }), {
      openingGross: 0, additions: 0, deductions: 0, closingGross: 0,
      openingDep: 0, depForYear: 0, depOnDeductions: 0, closingDep: 0,
      openingNet: 0, closingNet: 0
    });
  }, [assetCategories.intangible]);

  const grandTotal = useMemo(() => ({
    openingGross: tangibleTotal.openingGross + intangibleTotal.openingGross,
    additions: tangibleTotal.additions + intangibleTotal.additions,
    deductions: tangibleTotal.deductions + intangibleTotal.deductions,
    closingGross: tangibleTotal.closingGross + intangibleTotal.closingGross,
    openingDep: tangibleTotal.openingDep + intangibleTotal.openingDep,
    depForYear: tangibleTotal.depForYear + intangibleTotal.depForYear,
    depOnDeductions: tangibleTotal.depOnDeductions + intangibleTotal.depOnDeductions,
    closingDep: tangibleTotal.closingDep + intangibleTotal.closingDep,
    openingNet: tangibleTotal.openingNet + intangibleTotal.openingNet,
    closingNet: tangibleTotal.closingNet + intangibleTotal.closingNet,
  }), [tangibleTotal, intangibleTotal]);

  // Debug logging
  console.log('FA Note Debug:', {
    fixedAssetRowsCount: fixedAssetRows.length,
    tangibleTotal,
    intangibleTotal,
    grandTotal,
  });

  // Don't render if no fixed asset data
  if (fixedAssetRows.length === 0 || (grandTotal.closingGross === 0 && grandTotal.openingGross === 0)) {
    return null;
  }

  const renderAssetRow = (category: AssetCategory) => {
    if (category.closingNet === 0) return null;
    
    return (
      <tr key={category.name} className="border-b">
        <td className="px-3 py-2 text-sm">{category.name}</td>
        <td className="px-3 py-2 text-sm text-right">{formatValue(category.openingGross)}</td>
        <td className="px-3 py-2 text-sm text-right">{formatValue(category.additions)}</td>
        <td className="px-3 py-2 text-sm text-right">{formatValue(category.deductions)}</td>
        <td className="px-3 py-2 text-sm text-right font-medium">{formatValue(category.closingGross)}</td>
        <td className="px-3 py-2 text-sm text-right">{formatValue(category.openingDep)}</td>
        <td className="px-3 py-2 text-sm text-right">{formatValue(category.depForYear)}</td>
        <td className="px-3 py-2 text-sm text-right">{formatValue(category.depOnDeductions)}</td>
        <td className="px-3 py-2 text-sm text-right font-medium">{formatValue(category.closingDep)}</td>
        <td className="px-3 py-2 text-sm text-right font-medium">{formatValue(category.openingNet)}</td>
        <td className="px-3 py-2 text-sm text-right font-semibold">{formatValue(category.closingNet)}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, total: any) => (
    <tr className="border-b bg-gray-50 font-semibold">
      <td className="px-3 py-2 text-sm">{label}</td>
      <td className="px-3 py-2 text-sm text-right">{formatValue(total.openingGross)}</td>
      <td className="px-3 py-2 text-sm text-right">{formatValue(total.additions)}</td>
      <td className="px-3 py-2 text-sm text-right">{formatValue(total.deductions)}</td>
      <td className="px-3 py-2 text-sm text-right font-bold">{formatValue(total.closingGross)}</td>
      <td className="px-3 py-2 text-sm text-right">{formatValue(total.openingDep)}</td>
      <td className="px-3 py-2 text-sm text-right">{formatValue(total.depForYear)}</td>
      <td className="px-3 py-2 text-sm text-right">{formatValue(total.depOnDeductions)}</td>
      <td className="px-3 py-2 text-sm text-right font-bold">{formatValue(total.closingDep)}</td>
      <td className="px-3 py-2 text-sm text-right font-bold">{formatValue(total.openingNet)}</td>
      <td className="px-3 py-2 text-sm text-right font-bold">{formatValue(total.closingNet)}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Note {noteNumber}: Property, Plant and Equipment</h3>
      </div>

      {/* Main Fixed Assets Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2">
            <tr>
              <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold border-r">Particulars</th>
              <th colSpan={4} className="px-3 py-2 text-center text-xs font-semibold border-r border-b">Gross Block</th>
              <th colSpan={4} className="px-3 py-2 text-center text-xs font-semibold border-r border-b">Depreciation and Amortisation</th>
              <th colSpan={2} className="px-3 py-2 text-center text-xs font-semibold border-b">Net Book Value</th>
            </tr>
            <tr>
              <th className="px-3 py-2 text-center text-xs font-semibold">Opening</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Additions</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Deductions</th>
              <th className="px-3 py-2 text-center text-xs font-semibold border-r">Closing</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Opening</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">For the year</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">On Deductions</th>
              <th className="px-3 py-2 text-center text-xs font-semibold border-r">Closing</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Opening Net</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Closing Net</th>
            </tr>
          </thead>
          <tbody>
            {/* Tangible Assets */}
            <tr className="bg-blue-50">
              <td colSpan={11} className="px-3 py-2 text-sm font-semibold">Tangible</td>
            </tr>
            {assetCategories.tangible.map(cat => renderAssetRow(cat))}
            {renderTotalRow('Total', tangibleTotal)}

            {/* Intangible Assets */}
            <tr className="bg-blue-50">
              <td colSpan={11} className="px-3 py-2 text-sm font-semibold">Intangible</td>
            </tr>
            {assetCategories.intangible.map(cat => renderAssetRow(cat))}
            {renderTotalRow('Total', intangibleTotal)}

            {/* Grand Total */}
            {renderTotalRow('Grand Total', grandTotal)}
          </tbody>
        </table>
      </div>

      {/* Additional Disclosures */}
      <div className="space-y-4 mt-6">
        {/* Revaluation */}
        <div className="border rounded-lg p-4 bg-yellow-50">
          <h4 className="text-sm font-semibold mb-2">Revaluation of Property, Plant and Equipment</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Relevant line item in the balance sheet</th>
                <th className="text-left py-2">Description of item of property</th>
                <th className="text-right py-2">Gross carrying value</th>
                <th className="text-left py-2">Title deeds held in the name of</th>
                <th className="text-left py-2">Held by director or promoter or their relative or their employee</th>
                <th className="text-left py-2">Property held since which date</th>
                <th className="text-right py-2">Revalued amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">No revaluation records</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ageing Schedule */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h4 className="text-sm font-semibold mb-2">Ageing schedule for Projects in progress</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th rowSpan={2} className="text-left py-2 border-r">Particulars</th>
                <th colSpan={4} className="text-center py-2 border-b">Projects in progress</th>
                <th colSpan={4} className="text-center py-2">Projects temporarily suspended</th>
              </tr>
              <tr className="border-b">
                <th className="text-center py-2">Less than 1 year</th>
                <th className="text-center py-2">1-2 years</th>
                <th className="text-center py-2">2-3 years</th>
                <th className="text-center py-2 border-r">More than 3 years</th>
                <th className="text-center py-2">Less than 1 year</th>
                <th className="text-center py-2">1-2 years</th>
                <th className="text-center py-2">2-3 years</th>
                <th className="text-center py-2">More than 3 years</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Capital work-in-progress</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2 border-r">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Completion Schedule */}
        <div className="border rounded-lg p-4 bg-green-50">
          <h4 className="text-sm font-semibold mb-2">Completion schedule for Projects whose completion is overdue or have exceeded their original plan cost</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th rowSpan={2} className="text-left py-2 border-r">Particulars</th>
                <th colSpan={4} className="text-center py-2 border-b">Projects in progress</th>
                <th colSpan={4} className="text-center py-2">Projects temporarily suspended</th>
              </tr>
              <tr className="border-b">
                <th className="text-center py-2">Less than 1 year</th>
                <th className="text-center py-2">1-2 years</th>
                <th className="text-center py-2">2-3 years</th>
                <th className="text-center py-2 border-r">More than 3 years</th>
                <th className="text-center py-2">Less than 1 year</th>
                <th className="text-center py-2">1-2 years</th>
                <th className="text-center py-2">2-3 years</th>
                <th className="text-center py-2">More than 3 years</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Capital work-in-progress</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2 border-r">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
                <td className="text-right py-2">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
