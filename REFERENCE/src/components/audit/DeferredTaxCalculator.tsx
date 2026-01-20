import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Plus, Edit2, Save, X, Trash2, FileDown } from 'lucide-react';
import { useEngagement } from '@/contexts/EngagementContext';
import { getSQLiteClient } from '@/integrations/sqlite/client';
const db = getSQLiteClient();

// =====================================================
// MASTER DATA - Exact conversion from Python
// =====================================================

interface DTMasterEntry {
  nature: string;
  type: 'DTA' | 'DTL';
}

const DT_MASTER: Record<string, DTMasterEntry> = {
  'Gratuity Provision': { nature: 'Deductible in future', type: 'DTA' },
  'Leave Encashment Provision': { nature: 'Deductible in future', type: 'DTA' },
  'Bonus / Ex-gratia Provision': { nature: 'Deductible in future', type: 'DTA' },
  'Disallowance u/s 43B': { nature: 'Deductible in future', type: 'DTA' },
  'Depreciation (IT > Books)': { nature: 'Taxable in future', type: 'DTL' },
  'Depreciation (Books > IT)': { nature: 'Deductible in future', type: 'DTA' },
  'Provision for Doubtful Debts': { nature: 'Deductible in future', type: 'DTA' },
  'Business Loss Carried Forward': { nature: 'Deductible in future', type: 'DTA' },
  'Unabsorbed Depreciation': { nature: 'Deductible in future', type: 'DTA' },
};

interface DTLRecord {
  Head: string;
  'Depreciation Basis': string;
  Accounts: number;
  Tax: number;
  Difference: number;
  'Tax Rate (%)': number;
  Type: 'DTA' | 'DTL';
  'Deferred Tax': number;
}

export default function DeferredTaxCalculator() {
  const { currentEngagement } = useEngagement();

  // State for header details
  const [entityName, setEntityName] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string }>>([]);

  // State for opening balances
  const [openingDTA, setOpeningDTA] = useState('0.00');
  const [openingDTL, setOpeningDTL] = useState('0.00');

  // State for current entry
  const [selectedHead, setSelectedHead] = useState('');
  const [manualHead, setManualHead] = useState('');
  const [nature, setNature] = useState('');
  const [depreciationBasis, setDepreciationBasis] = useState('');
  const [accounts, setAccounts] = useState('');
  const [tax, setTax] = useState('');
  const [difference, setDifference] = useState('');
  const [dtType, setDtType] = useState<'' | 'DTA' | 'DTL'>('');
  const [taxRate, setTaxRate] = useState('');
  const [deferredTaxAmount, setDeferredTaxAmount] = useState('');

  // State for records and editing
  const [records, setRecords] = useState<DTLRecord[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // =====================================================
  // FETCH ENGAGEMENT DETAILS AND TEAM MEMBERS
  // =====================================================

  useEffect(() => {
    // Auto-populate from engagement
    if (currentEngagement) {
      setEntityName(currentEngagement.client_name || '');
      setFinancialYear(currentEngagement.financial_year || '');
    }

    // Fetch team members
    const fetchTeamMembers = async () => {
      try {
        const { data, error } = await db
          .from('profiles')
          .select('user_id, full_name')
          .order('full_name')
          .execute();

        if (error) throw error;

        const members = (data || []).map((profile) => ({
          id: profile.user_id,
          name: profile.full_name || 'Unknown User',
        }));

        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    fetchTeamMembers();
  }, [currentEngagement]);

  // =====================================================
  // LOGIC - Exact conversion from Python
  // =====================================================

  // Handle head selection change
  const onHeadChange = (value: string) => {
    setSelectedHead(value);

    if (value === '<Manual Entry>') {
      setManualHead('');
    } else {
      setManualHead('');
    }

    if (value === '' || value === 'Select Deferred Tax Head') {
      setNature('');
      setDtType('');
      setDepreciationBasis('');
      return;
    }

    if (value in DT_MASTER) {
      setNature(DT_MASTER[value].nature);
      setDtType(DT_MASTER[value].type);
    } else {
      setNature('');
      setDtType('');
    }
  };

  // Recalculate difference and deferred tax amount
  const recalc = () => {
    try {
      const a = parseFloat(accounts);
      const t = parseFloat(tax);
      if (isNaN(a) || isNaN(t)) {
        setDifference('');
        setDeferredTaxAmount('');
        return;
      }

      const diff = a - t;
      setDifference(diff.toFixed(2));

      try {
        const rate = parseFloat(taxRate) / 100;
        if (!isNaN(rate)) {
          setDeferredTaxAmount((Math.abs(diff) * rate).toFixed(2));
        } else {
          setDeferredTaxAmount('');
        }
      } catch {
        setDeferredTaxAmount('');
      }
    } catch {
      setDifference('');
      setDeferredTaxAmount('');
    }
  };

  // Effect for recalculation
  useEffect(() => {
    recalc();
  }, [accounts, tax, taxRate]);

  // Collect entry data
  const collectEntryData = (): DTLRecord | null => {
    const head = selectedHead === '<Manual Entry>' ? manualHead.trim() : selectedHead;

    if (!head || head === 'Select Deferred Tax Head') {
      toast.error('Select or enter a Deferred Tax Head.');
      return null;
    }

    if (!dtType) {
      toast.error('Choose DTA or DTL.');
      return null;
    }

    if (head.includes('Depreciation') && !depreciationBasis) {
      toast.error('Select depreciation basis.');
      return null;
    }

    try {
      const accountsValue = parseFloat(accounts);
      const taxValue = parseFloat(tax);
      const rateValue = parseFloat(taxRate);

      if (isNaN(accountsValue) || isNaN(taxValue) || isNaN(rateValue)) {
        toast.error('Enter numeric values for Accounts, Tax, and Rate.');
        return null;
      }

      const differenceValue = accountsValue - taxValue;
      const dtAmount = Math.abs(differenceValue) * (rateValue / 100);

      return {
        Head: head,
        'Depreciation Basis': depreciationBasis,
        Accounts: accountsValue,
        Tax: taxValue,
        Difference: differenceValue,
        'Tax Rate (%)': rateValue,
        Type: dtType,
        'Deferred Tax': dtAmount,
      };
    } catch {
      toast.error('Enter numeric values for Accounts, Tax, and Rate.');
      return null;
    }
  };

  // Add entry
  const addEntry = () => {
    if (editIndex !== null) {
      toast.info('Finish the current edit before adding a new entry.');
      return;
    }

    const data = collectEntryData();
    if (!data) return;

    setRecords([...records, data]);
    clearEntry();
    toast.success('Entry added and form reset.');
  };

  // Start editing
  const startEdit = (index: number) => {
    if (editIndex !== null) {
      toast.info('Save or cancel the current edit first.');
      return;
    }

    setEditIndex(index);
    setSelectedRow(index);
    populateForm(records[index]);
    setIsEditMode(true);
    toast.info('Edit mode enabled. Update the details and press Save Changes.');
  };

  // Save edit
  const saveEdit = () => {
    if (editIndex === null) {
      toast.info('There is no entry in edit mode.');
      return;
    }

    const data = collectEntryData();
    if (!data) return;

    const newRecords = [...records];
    newRecords[editIndex] = data;
    setRecords(newRecords);
    exitEditMode('Entry updated and form reset.');
  };

  // Cancel edit
  const cancelEdit = () => {
    if (editIndex === null) return;
    exitEditMode('Edit cancelled and form cleared.');
  };

  // Exit edit mode
  const exitEditMode = (message: string) => {
    setEditIndex(null);
    setIsEditMode(false);
    clearEntry();
    toast.success(message);
  };

  // Delete entry
  const deleteEntry = () => {
    if (selectedRow === null) return;

    const deletingEditRow = editIndex !== null && selectedRow === editIndex;
    if (deletingEditRow) {
      setEditIndex(null);
      setIsEditMode(false);
    }

    const newRecords = records.filter((_, index) => index !== selectedRow);
    setRecords(newRecords);
    clearEntry();

    const msg = deletingEditRow ? 'Entry deleted and edit cancelled.' : 'Entry deleted.';
    toast.success(msg);
  };

  // Populate form with record data
  const populateForm = (record: DTLRecord) => {
    const headOptions = Object.keys(DT_MASTER);

    if (headOptions.includes(record.Head)) {
      setSelectedHead(record.Head);
      setManualHead('');
    } else {
      setSelectedHead('<Manual Entry>');
      setManualHead(record.Head);
    }

    setDepreciationBasis(record['Depreciation Basis']);
    setAccounts(record.Accounts.toFixed(2));
    setTax(record.Tax.toFixed(2));
    setDifference(record.Difference.toFixed(2));
    setTaxRate(record['Tax Rate (%)'].toFixed(2));
    setDeferredTaxAmount(record['Deferred Tax'].toFixed(2));
    setDtType(record.Type);

    if (record.Head in DT_MASTER) {
      setNature(DT_MASTER[record.Head].nature);
    } else {
      setNature('');
    }
  };

  // Clear entry form
  const clearEntry = () => {
    setSelectedRow(null);
    setSelectedHead('');
    setManualHead('');
    setNature('');
    setDepreciationBasis('');
    setAccounts('');
    setTax('');
    setDifference('');
    setTaxRate('');
    setDeferredTaxAmount('');
    setDtType('');
  };

  // Calculate summary
  const calculateSummary = () => {
    const odta = parseFloat(openingDTA) || 0;
    const odtl = parseFloat(openingDTL) || 0;
    const cdta = records.filter(r => r.Type === 'DTA').reduce((sum, r) => sum + r['Deferred Tax'], 0);
    const cdtl = records.filter(r => r.Type === 'DTL').reduce((sum, r) => sum + r['Deferred Tax'], 0);

    const clDta = odta + cdta;
    const clDtl = odtl + cdtl;
    const net = clDta - clDtl;
    const pnl = cdta - cdtl;

    const pnlLabel = pnl >= 0 ? 'Deferred Tax Income – Cr' : 'Deferred Tax Expense – Dr';
    const bsLabel = net >= 0 ? 'Deferred Tax Asset' : 'Deferred Tax Liability';

    return {
      odta,
      odtl,
      cdta,
      cdtl,
      clDta,
      clDtl,
      net,
      pnl,
      pnlLabel,
      bsLabel,
    };
  };

  const summary = calculateSummary();

  // =====================================================
  // EXCEL EXPORT - Exact conversion from Python
  // =====================================================

  const exportToExcel = () => {
    if (records.length === 0) {
      toast.error('No data to export.');
      return;
    }

    const summary = calculateSummary();

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Header Information
    const headerData = [
      ['Deferred Tax Calculator – Audit Working Paper (AS-22)'],
      [],
      ['Particulars', 'Details'],
      ['Name of Entity', entityName],
      ['Financial Year', financialYear],
      ['Prepared By', preparedBy],
      ['Reviewed By', reviewedBy],
      ['Accounting Standard', 'AS-22'],
      [],
      ['Opening Deferred Tax', 'Amount'],
      ['Opening Deferred Tax Asset (DTA)', summary.odta.toFixed(2)],
      ['Opening Deferred Tax Liability (DTL)', summary.odtl.toFixed(2)],
      ['Net Opening Deferred Tax', (summary.odta - summary.odtl).toFixed(2)],
      [],
      ['Head', 'Depreciation Basis', 'Accounts', 'Tax', 'Difference', 'Tax Rate (%)', 'Type', 'Deferred Tax'],
    ];

    // Add records
    records.forEach(record => {
      headerData.push([
        record.Head,
        record['Depreciation Basis'],
        record.Accounts.toFixed(2),
        record.Tax.toFixed(2),
        record.Difference.toFixed(2),
        record['Tax Rate (%)'].toFixed(2) + '%',
        record.Type,
        record['Deferred Tax'].toFixed(2),
      ]);
    });

    // Add summary
    headerData.push(
      [],
      ['Summary', 'Amount / Description'],
      ['Closing Deferred Tax Asset (DTA)', summary.clDta.toFixed(2)],
      ['Closing Deferred Tax Liability (DTL)', summary.clDtl.toFixed(2)],
      ['Net Closing Deferred Tax', summary.net.toFixed(2)],
      ['Profit & Loss Impact', `${summary.pnlLabel} ${Math.abs(summary.pnl).toFixed(2)}`],
      ['Balance Sheet Presentation', `${summary.bsLabel} – ₹ ${Math.abs(summary.net).toFixed(2)}`]
    );

    const ws = XLSX.utils.aoa_to_sheet(headerData);

    // Set column widths
    const colWidths = [
      { wch: 35 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Deferred Tax Working');

    // Generate file name
    const fileName = `Deferred_Tax_AS22_${entityName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);

    toast.success('Excel file exported successfully!');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deferred Tax Calculator – Audit Working Paper (AS-22)</CardTitle>
          <CardDescription>
            Calculate and track Deferred Tax Assets and Liabilities as per Accounting Standard AS-22
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Entity & Engagement Details */}
      <Card>
        <CardHeader>
          <CardTitle>Entity & Engagement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity">Name of Entity</Label>
              <Input
                id="entity"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="Auto-populated from engagement"
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fy">Financial Year</Label>
              <Input
                id="fy"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="Auto-populated from engagement"
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepared">Prepared By</Label>
              <Select value={preparedBy} onValueChange={setPreparedBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preparer" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewed">Reviewed By</Label>
              <Select value={reviewedBy} onValueChange={setReviewedBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opening Deferred Tax */}
      <Card>
        <CardHeader>
          <CardTitle>Opening Deferred Tax (Carried Forward)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openDta">Opening DTA</Label>
              <Input
                id="openDta"
                type="number"
                step="0.01"
                value={openingDTA}
                onChange={(e) => setOpeningDTA(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openDtl">Opening DTL</Label>
              <Input
                id="openDtl"
                type="number"
                step="0.01"
                value={openingDTL}
                onChange={(e) => setOpeningDTL(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Year Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Current Year Deferred Tax – Accounts vs Tax</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deferred Tax Head</Label>
              <Select value={selectedHead} onValueChange={onHeadChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Deferred Tax Head" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DT_MASTER).map((head) => (
                    <SelectItem key={head} value={head}>
                      {head}
                    </SelectItem>
                  ))}
                  <SelectItem value="<Manual Entry>">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualHead">Manual Head (if any)</Label>
              <Input
                id="manualHead"
                value={manualHead}
                onChange={(e) => setManualHead(e.target.value)}
                disabled={selectedHead !== '<Manual Entry>'}
                placeholder="Enter custom head"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nature">Nature</Label>
              <Input
                id="nature"
                value={nature}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Depreciation Basis</Label>
              <Select
                value={depreciationBasis}
                onValueChange={setDepreciationBasis}
                disabled={!selectedHead.includes('Depreciation')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select basis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WDV of Assets">WDV of Assets</SelectItem>
                  <SelectItem value="Expense / P&L Timing">Expense / P&L Timing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accounts">Amount as per Accounts</Label>
              <Input
                id="accounts"
                type="number"
                step="0.01"
                value={accounts}
                onChange={(e) => setAccounts(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Amount as per Tax</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diff">Difference</Label>
              <Input
                id="diff"
                value={difference}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>DTA / DTL</Label>
              <Select value={dtType} onValueChange={(value) => setDtType(value as 'DTA' | 'DTL')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DTA">DTA</SelectItem>
                  <SelectItem value="DTL">DTL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Tax Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="25.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dtAmt">Deferred Tax Amount</Label>
              <Input
                id="dtAmt"
                value={deferredTaxAmount}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap items-start">
            <Button onClick={addEntry} className="gap-2" disabled={isEditMode}>
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
            <Button
              onClick={() => selectedRow !== null && startEdit(selectedRow)}
              variant="outline"
              className="gap-2"
              disabled={isEditMode || selectedRow === null}
            >
              <Edit2 className="w-4 h-4" />
              Edit Entry
            </Button>
            <Button onClick={saveEdit} className="gap-2" disabled={!isEditMode}>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
            <Button onClick={cancelEdit} variant="outline" className="gap-2" disabled={!isEditMode}>
              <X className="w-4 h-4" />
              Cancel Edit
            </Button>
            <Button
              onClick={deleteEntry}
              variant="destructive"
              className="gap-2"
              disabled={isEditMode || selectedRow === null}
            >
              <Trash2 className="w-4 h-4" />
              Delete Entry
            </Button>
            <Button onClick={exportToExcel} variant="secondary" className="gap-2 ml-auto">
              <FileDown className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deferred Tax Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Head</TableHead>
                  <TableHead>Depreciation Basis</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">Tax Rate (%)</TableHead>
                  <TableHead>DTA / DTL</TableHead>
                  <TableHead className="text-right">Deferred Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No entries added yet. Add your first entry above.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow
                      key={index}
                      className={`cursor-pointer ${selectedRow === index ? 'bg-muted' : ''}`}
                      onClick={() => !isEditMode && setSelectedRow(index)}
                    >
                      <TableCell>{record.Head}</TableCell>
                      <TableCell>{record['Depreciation Basis']}</TableCell>
                      <TableCell className="text-right">{record.Accounts.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record.Difference.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record['Tax Rate (%)'].toFixed(2)}%</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${record.Type === 'DTA'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {record.Type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {record['Deferred Tax'].toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary & Financial Statement Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Opening DTA</div>
                <div className="text-2xl font-bold">₹ {summary.odta.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Opening DTL</div>
                <div className="text-2xl font-bold">₹ {summary.odtl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Current Year DTA</div>
                <div className="text-2xl font-bold text-green-600">₹ {summary.cdta.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Current Year DTL</div>
                <div className="text-2xl font-bold text-red-600">₹ {summary.cdtl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Closing DTA</span>
                <span className="text-lg font-bold">₹ {summary.clDta.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Closing DTL</span>
                <span className="text-lg font-bold">₹ {summary.clDtl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                <span className="font-semibold">Net Deferred Tax Position</span>
                <span className="text-xl font-bold">₹ {summary.net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-1">P&L Impact</div>
                <div className="text-lg font-bold text-blue-700">
                  {summary.pnlLabel} ₹ {Math.abs(summary.pnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-purple-900 mb-1">Balance Sheet Presentation</div>
                <div className="text-lg font-bold text-purple-700">
                  {summary.bsLabel} – ₹ {Math.abs(summary.net).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



