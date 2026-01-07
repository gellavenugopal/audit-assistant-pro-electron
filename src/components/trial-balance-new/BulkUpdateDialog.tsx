import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LedgerRow } from '@/services/trialBalanceNewClassification';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: LedgerRow[];
  onUpdate: (updates: Partial<LedgerRow>) => void;
}

// H1 Options
const H1_OPTIONS = ['Balance Sheet', 'P&L Account'];

// H2 Options based on H1
const H2_OPTIONS: Record<string, string[]> = {
  'Balance Sheet': ['Assets', 'Liabilities', 'Equity'],
  'P&L Account': ['Income', 'Expenses'],
};

// H3 Options based on H2
const H3_OPTIONS: Record<string, string[]> = {
  'Assets': [
    'PPE & IA (Net)',
    'Investments',
    'Deferred Tax (Net)',
    'Loans and Advances',
    'Trade Receivables',
    'Cash and Bank Balance',
    'Other Current Assets',
    'Other Non-Current Assets',
  ],
  'Liabilities': [
    'Borrowings',
    'Deferred Tax (Net)',
    'Trade Payables',
    'Provisions',
    'Other Current Liabilities',
    'Other Non-Current Liabilities',
  ],
  'Equity': [
    'Share Capital',
    'Reserves and Surplus',
  ],
  'Income': [
    'Revenue from Operations',
    'Other Income',
  ],
  'Expenses': [
    'Cost of Goods Sold',
    'Employee Benefits Expenses',
    'Finance Costs',
    'Depreciation and Amortization Expense',
    'Other Expenses',
    'Other Profit and Loss Items',
  ],
};

// H4 Options based on H3 (simplified - full list would be very long)
const H4_OPTIONS: Record<string, string[]> = {
  'Trade Receivables': [
    'Secured Considered Good',
    'Unsecured Considered Good',
    'Doubtful',
  ],
  'Cash and Bank Balance': [
    'Cash on Hand',
    'Balances with Scheduled Banks in Current Account',
    'Balances with Scheduled Banks in Savings Account',
  ],
  'Borrowings': [
    'Secured Term Loans from Banks',
    'Unsecured Term Loans from Banks',
    'Working Capital Loan from Banks',
  ],
  'Trade Payables': [
    'MSME',
    'Non-MSME',
  ],
  'Share Capital': [
    'Equity Share Capital',
    'Preference Share Capital',
  ],
  'Reserves and Surplus': [
    'Capital Reserve',
    'Securities Premium',
    'General Reserve',
    'Retained Earnings',
  ],
  'Revenue from Operations': [
    'Sale of Products',
    'Sale of Services',
    'Other Operating Revenues (specify nature)',
  ],
  'Other Income': [
    'Interest Income',
    'Dividend Income',
    'Profit on Sale of Investments',
  ],
  'Other Expenses': [
    'Rent',
    'Rates and Taxes',
    'Repairs and Maintenance - Building',
    'Insurance',
    'Telephone and Internet',
    'Legal and Professional Fees',
    'Advertisement and Publicity',
    'Travelling and Conveyance',
    'Miscellaneous Expenses',
  ],
};

export function BulkUpdateDialog({ open, onOpenChange, selectedRows, onUpdate }: Props) {
  const [updateH1, setUpdateH1] = useState(false);
  const [updateH2, setUpdateH2] = useState(false);
  const [updateH3, setUpdateH3] = useState(false);
  const [updateH4, setUpdateH4] = useState(false);
  const [updateH5, setUpdateH5] = useState(false);
  
  const [h1, setH1] = useState<string>('');
  const [h2, setH2] = useState<string>('');
  const [h3, setH3] = useState<string>('');
  const [h4, setH4] = useState<string>('');
  const [h5, setH5] = useState<string>('');

  // Update available H2 options when H1 changes
  useEffect(() => {
    if (h1 && H2_OPTIONS[h1]) {
      if (!H2_OPTIONS[h1].includes(h2)) {
        setH2('');
      }
    } else {
      setH2('');
    }
  }, [h1, h2]);

  // Update available H3 options when H2 changes
  useEffect(() => {
    if (h2 && H3_OPTIONS[h2]) {
      if (!H3_OPTIONS[h2].includes(h3)) {
        setH3('');
      }
    } else {
      setH3('');
    }
  }, [h2, h3]);

  // Update available H4 options when H3 changes
  useEffect(() => {
    if (h3 && H4_OPTIONS[h3]) {
      if (!H4_OPTIONS[h3].includes(h4)) {
        setH4('');
      }
    } else {
      setH4('');
    }
  }, [h3, h4]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: Partial<LedgerRow> = {};
    if (updateH1 && h1) updates['H1'] = h1;
    if (updateH2 && h2) updates['H2'] = h2;
    if (updateH3 && h3) updates['H3'] = h3;
    if (updateH4 && h4) updates['H4'] = h4;
    if (updateH5 && h5) updates['H5'] = h5;
    
    if (Object.keys(updates).length === 0) {
      return;
    }
    
    onUpdate(updates);
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setUpdateH1(false);
    setUpdateH2(false);
    setUpdateH3(false);
    setUpdateH4(false);
    setUpdateH5(false);
    setH1('');
    setH2('');
    setH3('');
    setH4('');
    setH5('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const availableH2Options = h1 ? (H2_OPTIONS[h1] || []) : [];
  const availableH3Options = h2 ? (H3_OPTIONS[h2] || []) : [];
  const availableH4Options = h3 ? (H4_OPTIONS[h3] || []) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update {selectedRows.length} Items</DialogTitle>
          <DialogDescription>
            Select which classification fields to update for all selected ledgers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* H1 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h1"
                checked={updateH1}
                onCheckedChange={(checked) => setUpdateH1(checked === true)}
              />
              <Label htmlFor="update_h1">Update H1 (Statement)</Label>
            </div>
            {updateH1 && (
              <Select value={h1} onValueChange={setH1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select H1" />
                </SelectTrigger>
                <SelectContent>
                  {H1_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* H2 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h2"
                checked={updateH2}
                onCheckedChange={(checked) => setUpdateH2(checked === true)}
              />
              <Label htmlFor="update_h2">Update H2 (Category)</Label>
            </div>
            {updateH2 && (
              <Select 
                value={h2} 
                onValueChange={setH2}
                disabled={!h1 && updateH1}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!h1 && updateH1 ? "Select H1 first" : "Select H2"} />
                </SelectTrigger>
                <SelectContent>
                  {availableH2Options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* H3 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h3"
                checked={updateH3}
                onCheckedChange={(checked) => setUpdateH3(checked === true)}
              />
              <Label htmlFor="update_h3">Update H3 (Sub-Category)</Label>
            </div>
            {updateH3 && (
              <Select 
                value={h3} 
                onValueChange={setH3}
                disabled={!h2 && updateH2}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!h2 && updateH2 ? "Select H2 first" : "Select H3"} />
                </SelectTrigger>
                <SelectContent>
                  {availableH3Options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* H4 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h4"
                checked={updateH4}
                onCheckedChange={(checked) => setUpdateH4(checked === true)}
              />
              <Label htmlFor="update_h4">Update H4 (Line Item)</Label>
            </div>
            {updateH4 && (
              <Select 
                value={h4} 
                onValueChange={setH4}
                disabled={!h3 && updateH3}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!h3 && updateH3 ? "Select H3 first" : availableH4Options.length > 0 ? "Select H4" : "No H4 options available"} />
                </SelectTrigger>
                <SelectContent>
                  {availableH4Options.length > 0 ? (
                    availableH4Options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No options available for selected H3</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* H5 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h5"
                checked={updateH5}
                onCheckedChange={(checked) => setUpdateH5(checked === true)}
              />
              <Label htmlFor="update_h5">Update H5 (Detail)</Label>
            </div>
            {updateH5 && (
              <input
                type="text"
                value={h5}
                onChange={(e) => setH5(e.target.value)}
                placeholder="Enter detail if required"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!updateH1 && !updateH2 && !updateH3 && !updateH4 && !updateH5}
            >
              Update {selectedRows.length} Items
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

