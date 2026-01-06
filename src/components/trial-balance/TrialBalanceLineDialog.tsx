import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrialBalanceLine, TrialBalanceLineInput } from '@/hooks/useTrialBalance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line?: TrialBalanceLine | null;
  onSave: (data: TrialBalanceLineInput) => Promise<any>;
}

const AILE_OPTIONS = ['Asset', 'Income', 'Liability', 'Expense'] as const;
const FS_AREAS = ['Cash', 'Receivables', 'Inventory', 'Fixed Assets', 'Payables', 'Borrowings', 'Equity', 'Revenue', 'Expenses', 'Finance', 'Disclosure', 'Investments', 'Other Non-Current', 'Other Current', 'Reserves', 'Deferred Tax', 'Other Long Term', 'Short Term Borrowings', 'Other Current Liabilities', 'Provisions', 'Other Income'];
const BALANCE_TYPES = ['Dr', 'Cr'] as const;
const PERIOD_TYPES = ['current', 'previous'] as const;

export function TrialBalanceLineDialog({ open, onOpenChange, line, onSave }: Props) {
  const [formData, setFormData] = useState<TrialBalanceLineInput>({
    branch_name: '',
    account_code: '',
    account_name: '',
    ledger_parent: '',
    ledger_primary_group: '',
    opening_balance: 0,
    debit: 0,
    credit: 0,
    closing_balance: 0,
    balance_type: null,
    aile: null,
    fs_area: '',
    note: '',
    period_type: 'current',
    period_ending: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (line) {
      setFormData({
        branch_name: line.branch_name || '',
        account_code: line.account_code,
        account_name: line.account_name,
        ledger_parent: line.ledger_parent || '',
        ledger_primary_group: line.ledger_primary_group || '',
        opening_balance: line.opening_balance,
        debit: line.debit,
        credit: line.credit,
        closing_balance: line.closing_balance,
        balance_type: line.balance_type,
        aile: line.aile,
        fs_area: line.fs_area || '',
        note: line.note || '',
        period_type: line.period_type || 'current',
        period_ending: line.period_ending || null,
      });
    } else {
      setFormData({
        branch_name: '',
        account_code: '',
        account_name: '',
        ledger_parent: '',
        ledger_primary_group: '',
        opening_balance: 0,
        debit: 0,
        credit: 0,
        closing_balance: 0,
        balance_type: null,
        aile: null,
        fs_area: '',
        note: '',
        period_type: 'current',
        period_ending: null,
      });
    }
  }, [line, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const result = await onSave({
      ...formData,
      branch_name: formData.branch_name || null,
      ledger_parent: formData.ledger_parent || null,
      ledger_primary_group: formData.ledger_primary_group || null,
      balance_type: formData.balance_type || null,
      fs_area: formData.fs_area || null,
      note: formData.note || null,
      period_ending: formData.period_ending || null,
    });
    
    setSaving(false);
    if (result) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{line ? 'Edit' : 'Add'} Trial Balance Line</DialogTitle>
          <DialogDescription>
            {line ? 'Update the trial balance line details.' : 'Add a new line to the trial balance.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch and Account */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch_name">Branch Name</Label>
              <Input
                id="branch_name"
                value={formData.branch_name || ''}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                placeholder="e.g., HQ, Branch-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_code">Account Code *</Label>
              <Input
                id="account_code"
                value={formData.account_code}
                onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ledger_parent">Ledger Parent</Label>
              <Input
                id="ledger_parent"
                value={formData.ledger_parent || ''}
                onChange={(e) => setFormData({ ...formData, ledger_parent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger_primary_group">Ledger Primary Group</Label>
              <Input
                id="ledger_primary_group"
                value={formData.ledger_primary_group || ''}
                onChange={(e) => setFormData({ ...formData, ledger_primary_group: e.target.value })}
              />
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opening_balance">Opening Balance</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debit">Debit</Label>
              <Input
                id="debit"
                type="number"
                step="0.01"
                value={formData.debit}
                onChange={(e) => setFormData({ ...formData, debit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit">Credit</Label>
              <Input
                id="credit"
                type="number"
                step="0.01"
                value={formData.credit}
                onChange={(e) => setFormData({ ...formData, credit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closing_balance">Closing Balance</Label>
              <Input
                id="closing_balance"
                type="number"
                step="0.01"
                value={formData.closing_balance}
                onChange={(e) => setFormData({ ...formData, closing_balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance_type">Balance Type</Label>
              <Select
                value={formData.balance_type || ''}
                onValueChange={(value) => setFormData({ ...formData, balance_type: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Dr/Cr" />
                </SelectTrigger>
                <SelectContent>
                  {BALANCE_TYPES.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Classification */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aile">AILE</Label>
              <Select
                value={formData.aile || ''}
                onValueChange={(value) => setFormData({ ...formData, aile: value as any || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {AILE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fs_area">FS Area</Label>
              <Select
                value={formData.fs_area || ''}
                onValueChange={(value) => setFormData({ ...formData, fs_area: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {FS_AREAS.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note No.</Label>
              <Input
                id="note"
                value={formData.note || ''}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="e.g., Note 12"
              />
            </div>
          </div>

          {/* Period Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_type">Period Type</Label>
              <Select
                value={formData.period_type || 'current'}
                onValueChange={(value) => setFormData({ ...formData, period_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map(option => (
                    <SelectItem key={option} value={option}>
                      {option === 'current' ? 'Current Period' : 'Previous Period'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_ending">Period Ending</Label>
              <Input
                id="period_ending"
                type="date"
                value={formData.period_ending || ''}
                onChange={(e) => setFormData({ ...formData, period_ending: e.target.value || null })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : line ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
