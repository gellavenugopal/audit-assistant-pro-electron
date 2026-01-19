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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, FileDown } from 'lucide-react';
import { useEngagement } from '@/contexts/EngagementContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { DTLRecord, DTLMaster, DTLSummary } from '@/types/deferredTax';
import ExcelJS from 'exceljs';
import { useToast } from '@/hooks/use-toast';

// Master data for deferred tax items
const DT_MASTER: DTLMaster = {
  "Gratuity Provision": { nature: "Deductible in future", type: "DTA" },
  "Leave Encashment Provision": { nature: "Deductible in future", type: "DTA" },
  "Bonus / Ex-gratia Provision": { nature: "Deductible in future", type: "DTA" },
  "Disallowance u/s 43B": { nature: "Deductible in future", type: "DTA" },
  "Depreciation (IT > Books)": { nature: "Taxable in future", type: "DTL" },
  "Depreciation (Books > IT)": { nature: "Deductible in future", type: "DTA" },
  "Provision for Doubtful Debts": { nature: "Deductible in future", type: "DTA" },
  "Business Loss Carried Forward": { nature: "Deductible in future", type: "DTA" },
  "Unabsorbed Depreciation": { nature: "Deductible in future", type: "DTA" },
};

export default function DeferredTax() {
  const { currentEngagement } = useEngagement();
  const { members } = useTeamMembers();
  const { toast } = useToast();

  // Form state
  const [entityName, setEntityName] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');
  
  const [openingDTA, setOpeningDTA] = useState(0);
  const [openingDTL, setOpeningDTL] = useState(0);
  
  const [selectedHead, setSelectedHead] = useState('');
  const [manualHead, setManualHead] = useState('');
  const [nature, setNature] = useState('');
  const [depreciationBasis, setDepreciationBasis] = useState('');
  const [accounts, setAccounts] = useState('');
  const [tax, setTax] = useState('');
  const [difference, setDifference] = useState('');
  const [dtType, setDtType] = useState<'DTA' | 'DTL' | ''>('');
  const [taxRate, setTaxRate] = useState('');
  const [dtAmount, setDtAmount] = useState('');
  
  const [records, setRecords] = useState<DTLRecord[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Auto-populate engagement details
  useEffect(() => {
    if (currentEngagement) {
      setEntityName(currentEngagement.client_name || '');
      setFinancialYear(currentEngagement.financial_year || '');
    }
  }, [currentEngagement]);

  // Handle head selection
  useEffect(() => {
    if (selectedHead && selectedHead !== '<Manual Entry>') {
      const masterItem = DT_MASTER[selectedHead];
      if (masterItem) {
        setNature(masterItem.nature);
        setDtType(masterItem.type);
      }
    } else {
      setNature('');
      if (!isEditMode) {
        setDtType('');
      }
    }
    
    // Clear manual head if not manual entry
    if (selectedHead !== '<Manual Entry>') {
      setManualHead('');
    }
  }, [selectedHead, isEditMode]);

  // Calculate difference and deferred tax
  useEffect(() => {
    const acct = parseFloat(accounts) || 0;
    const taxVal = parseFloat(tax) || 0;
    const diff = acct - taxVal;
    setDifference(diff.toFixed(2));

    const rate = parseFloat(taxRate) / 100 || 0;
    const dt = Math.abs(diff) * rate;
    setDtAmount(dt.toFixed(2));
  }, [accounts, tax, taxRate]);

  // Calculate summary
  const calculateSummary = (): DTLSummary => {
    const currentYearDTA = records
      .filter(r => r.type === 'DTA')
      .reduce((sum, r) => sum + r.deferredTax, 0);
    
    const currentYearDTL = records
      .filter(r => r.type === 'DTL')
      .reduce((sum, r) => sum + r.deferredTax, 0);
    
    const closingDTA = openingDTA + currentYearDTA;
    const closingDTL = openingDTL + currentYearDTL;
    const netPosition = closingDTA - closingDTL;
    const pnlImpact = currentYearDTA - currentYearDTL;

    return {
      openingDTA,
      openingDTL,
      currentYearDTA,
      currentYearDTL,
      closingDTA,
      closingDTL,
      netPosition,
      pnlImpact,
      pnlLabel: pnlImpact >= 0 ? 'Deferred Tax Income — Cr' : 'Deferred Tax Expense — Dr',
      bsLabel: netPosition >= 0 ? 'Deferred Tax Asset' : 'Deferred Tax Liability',
    };
  };

  const summary = calculateSummary();

  const clearForm = () => {
    setAccounts('');
    setTax('');
    setDifference('');
    setTaxRate('');
    setDtAmount('');
    setDepreciationBasis('');
    setSelectedRow(null);
    setIsEditMode(false);
  };

  const validateForm = (isEdit: boolean = false): boolean => {
    // For edit mode, skip head and dtType validation since they can't be changed
    if (!isEdit) {
      const head = selectedHead === '<Manual Entry>' ? manualHead.trim() : selectedHead;
      
      if (!head) {
        toast({
          title: 'Validation Error',
          description: 'Deferred Tax Head is mandatory.',
          variant: 'destructive',
        });
        return false;
      }

      if (!dtType) {
        toast({
          title: 'Validation Error',
          description: 'DTA/DTL type is mandatory.',
          variant: 'destructive',
        });
        return false;
      }

      if (head.includes('Depreciation') && !depreciationBasis) {
        toast({
          title: 'Validation Error',
          description: 'Please select depreciation basis.',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleAddEntry = () => {
    if (!validateForm()) return;

    const head = selectedHead === '<Manual Entry>' ? manualHead.trim() : selectedHead;
    
    const newRecord: DTLRecord = {
      id: Date.now().toString(),
      head,
      depreciationBasis,
      accounts: parseFloat(accounts) || 0,
      tax: parseFloat(tax) || 0,
      difference: parseFloat(difference) || 0,
      type: dtType as 'DTA' | 'DTL',
      deferredTax: parseFloat(dtAmount) || 0,
    };

    setRecords([...records, newRecord]);
    clearForm();
    
    toast({
      title: 'Entry Added',
      description: 'Deferred tax entry has been added successfully.',
    });
  };

  const handleEditEntry = () => {
    if (selectedRow === null || !validateForm(true)) return;

    const updatedRecords = [...records];
    updatedRecords[selectedRow] = {
      ...updatedRecords[selectedRow],
      accounts: parseFloat(accounts) || 0,
      tax: parseFloat(tax) || 0,
      difference: parseFloat(difference) || 0,
      deferredTax: parseFloat(dtAmount) || 0,
      depreciationBasis,
    };

    setRecords(updatedRecords);
    clearForm();
    
    toast({
      title: 'Entry Updated',
      description: 'Deferred tax entry has been updated successfully.',
    });
  };

  const handleDeleteEntry = () => {
    if (selectedRow === null) return;

    const updatedRecords = records.filter((_, index) => index !== selectedRow);
    setRecords(updatedRecords);
    clearForm();
    
    toast({
      title: 'Entry Deleted',
      description: 'Deferred tax entry has been deleted.',
    });
  };

  const handleRowClick = (index: number) => {
    setSelectedRow(index);
    setIsEditMode(true);
    const record = records[index];
    
    // Only populate the editable fields, not the head
    setAccounts(record.accounts.toString());
    setTax(record.tax.toString());
    setDifference(record.difference.toString());
    setDtAmount(record.deferredTax.toString());
    setDepreciationBasis(record.depreciationBasis);
  };

  const handleExportExcel = async () => {
    if (records.length === 0) {
      toast({
        title: 'No Data',
        description: 'Please add deferred tax entries before exporting.',
        variant: 'destructive',
      });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Deferred Tax Working');

    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1F4E78' } },
      alignment: { vertical: 'middle' as const, horizontal: 'left' as const },
    };

    // Entity details (Row 1 - header)
    const entityRow = worksheet.addRow(['Particulars', 'Details']);
    entityRow.font = headerStyle.font;
    entityRow.fill = headerStyle.fill;
    entityRow.alignment = headerStyle.alignment;
    
    worksheet.addRow(['Name of Entity', entityName]);
    worksheet.addRow(['Financial Year', financialYear]);
    worksheet.addRow(['Prepared By', preparedBy]);
    worksheet.addRow(['Reviewed By', reviewedBy]);
    worksheet.addRow(['Accounting Standard', 'AS-22']);
    worksheet.addRow([]);

    // Opening balances (Row 8 - header)
    const openingRow = worksheet.addRow(['Opening Deferred Tax', 'Amount']);
    openingRow.font = headerStyle.font;
    openingRow.fill = headerStyle.fill;
    openingRow.alignment = headerStyle.alignment;
    
    worksheet.addRow(['Opening Deferred Tax Asset (DTA)', openingDTA]);
    worksheet.addRow(['Opening Deferred Tax Liability (DTL)', openingDTL]);
    worksheet.addRow(['Net Opening Deferred Tax', openingDTA - openingDTL]);
    worksheet.addRow([]);

    // Current year entries (Row 14 - header)
    const entriesRow = worksheet.addRow(['Head', 'Depreciation Basis', 'Accounts', 'Tax', 'Difference', 'DTA / DTL', 'Deferred Tax']);
    entriesRow.font = headerStyle.font;
    entriesRow.fill = headerStyle.fill;
    entriesRow.alignment = headerStyle.alignment;

    records.forEach(record => {
      worksheet.addRow([
        record.head,
        record.depreciationBasis,
        record.accounts,
        record.tax,
        record.difference,
        record.type,
        record.deferredTax,
      ]);
    });
    worksheet.addRow([]);

    // Summary (Row 16 + len(records) - header)
    const summaryRow = worksheet.addRow(['Summary', 'Amount / Description']);
    summaryRow.font = headerStyle.font;
    summaryRow.fill = headerStyle.fill;
    summaryRow.alignment = headerStyle.alignment;
    
    worksheet.addRow(['Closing Deferred Tax Asset (DTA)', summary.closingDTA]);
    worksheet.addRow(['Closing Deferred Tax Liability (DTL)', summary.closingDTL]);
    worksheet.addRow(['Net Closing Deferred Tax', summary.netPosition]);
    worksheet.addRow(['Profit & Loss Impact', `${summary.pnlLabel} ${Math.abs(summary.pnlImpact).toFixed(2)}`]);
    worksheet.addRow(['Balance Sheet Presentation', `${summary.bsLabel} — ₹ ${Math.abs(summary.netPosition).toFixed(2)}`]);

    // Auto-resize columns
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, cell => {
        const cellValue = cell.value ? String(cell.value) : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 4, 50);
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Deferred_Tax_${entityName.replace(/\s+/g, '_')}_${financialYear}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: 'Excel file has been downloaded successfully.',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Entity & Engagement Details</CardTitle>
          <CardDescription>Audit working paper for deferred tax calculation (AS-22)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name of Entity</Label>
              <Input
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="Auto-populated from engagement"
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Input
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="Auto-populated from engagement"
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Prepared By</Label>
              <Select value={preparedBy} onValueChange={setPreparedBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.user_id} value={member.full_name}>
                      {member.full_name} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reviewed By</Label>
              <Select value={reviewedBy} onValueChange={setReviewedBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.user_id} value={member.full_name}>
                      {member.full_name} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opening Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Opening Deferred Tax (Carried Forward)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opening DTA</Label>
              <Input
                type="number"
                value={openingDTA}
                onChange={(e) => setOpeningDTA(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Opening DTL</Label>
              <Input
                type="number"
                value={openingDTL}
                onChange={(e) => setOpeningDTL(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle>Current Year Deferred Tax — Accounts vs Tax</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deferred Tax Head</Label>
              <Select value={selectedHead} onValueChange={setSelectedHead}>
                <SelectTrigger>
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DT_MASTER).map(head => (
                    <SelectItem key={head} value={head}>{head}</SelectItem>
                  ))}
                  <SelectItem value="<Manual Entry>">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manual Head (if any)</Label>
              <Input
                value={manualHead}
                onChange={(e) => setManualHead(e.target.value)}
                placeholder="Enter custom head"
              />
            </div>

            <div className="space-y-2">
              <Label>Nature</Label>
              <Input value={nature} readOnly className="bg-muted" />
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
              <Label>Amount as per Accounts</Label>
              <Input
                type="number"
                value={accounts}
                onChange={(e) => setAccounts(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Amount as per Tax</Label>
              <Input
                type="number"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Difference</Label>
              <Input value={difference} readOnly className="bg-muted" />
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
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="25.17"
              />
            </div>

            <div className="space-y-2">
              <Label>Deferred Tax Amount</Label>
              <Input value={dtAmount} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleAddEntry}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            <Button onClick={handleEditEntry} disabled={selectedRow === null}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Entry
            </Button>
            <Button variant="destructive" onClick={handleDeleteEntry} disabled={selectedRow === null}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deferred Tax Entries</CardTitle>
            <Button onClick={handleExportExcel} disabled={records.length === 0}>
              <FileDown className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Head</TableHead>
                  <TableHead>Depreciation Basis</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>DTA / DTL</TableHead>
                  <TableHead className="text-right">Deferred Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No entries added yet. Add your first deferred tax entry above.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow
                      key={record.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedRow === index ? 'bg-muted' : ''}`}
                      onClick={() => handleRowClick(index)}
                    >
                      <TableCell className="font-medium">{record.head}</TableCell>
                      <TableCell>{record.depreciationBasis || '—'}</TableCell>
                      <TableCell className="text-right">{record.accounts.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record.tax.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record.difference.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.type === 'DTA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {record.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{record.deferredTax.toFixed(2)}</TableCell>
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
          <CardTitle>Deferred Tax Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Opening DTA:</div>
              <div className="text-right font-medium">{formatCurrency(summary.openingDTA)}</div>
              
              <div>Opening DTL:</div>
              <div className="text-right font-medium">{formatCurrency(summary.openingDTL)}</div>
              
              <div className="border-t pt-2 font-medium">Current Year DTA:</div>
              <div className="border-t pt-2 text-right font-medium text-green-600">
                {formatCurrency(summary.currentYearDTA)}
              </div>
              
              <div className="font-medium">Current Year DTL:</div>
              <div className="text-right font-medium text-red-600">
                {formatCurrency(summary.currentYearDTL)}
              </div>
              
              <div className="border-t pt-2 font-semibold">Closing DTA:</div>
              <div className="border-t pt-2 text-right font-semibold">{formatCurrency(summary.closingDTA)}</div>
              
              <div className="font-semibold">Closing DTL:</div>
              <div className="text-right font-semibold">{formatCurrency(summary.closingDTL)}</div>
              
              <div className="border-t pt-2 font-bold text-base">Net Deferred Tax Position:</div>
              <div className="border-t pt-2 text-right font-bold text-base">
                {formatCurrency(summary.netPosition)}
              </div>
            </div>
            
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">P&L Impact:</span>
                <span className={`font-semibold ${summary.pnlImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.pnlLabel} {formatCurrency(Math.abs(summary.pnlImpact))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Balance Sheet Presentation:</span>
                <span className="font-semibold">
                  {summary.bsLabel} — {formatCurrency(Math.abs(summary.netPosition))}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
