import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Filter values
  statusFilter: string;
  h1Filter: string;
  h2Filter: string;
  h3Filter: string;
  groupFilter: string;
  balanceFilter: string;
  
  // Filter setters
  onStatusFilterChange: (value: string) => void;
  onH1FilterChange: (value: string) => void;
  onH2FilterChange: (value: string) => void;
  onH3FilterChange: (value: string) => void;
  onGroupFilterChange: (value: string) => void;
  onBalanceFilterChange: (value: string) => void;
  
  // Reset
  onResetFilters: () => void;
}

export function FilterModal({
  open,
  onOpenChange,
  statusFilter,
  h1Filter,
  h2Filter,
  h3Filter,
  groupFilter,
  balanceFilter,
  onStatusFilterChange,
  onH1FilterChange,
  onH2FilterChange,
  onH3FilterChange,
  onGroupFilterChange,
  onBalanceFilterChange,
  onResetFilters,
}: FilterModalProps) {
  const activeFiltersCount = [
    statusFilter !== 'all',
    h1Filter !== 'all',
    h2Filter !== 'all',
    h3Filter !== 'all',
    groupFilter !== 'all',
    balanceFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              disabled={activeFiltersCount === 0}
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Mapped">Mapped</SelectItem>
                <SelectItem value="Unmapped">Unmapped</SelectItem>
                <SelectItem value="Error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* H1 Filter */}
          <div className="space-y-2">
            <Label>H1 Classification</Label>
            <Select value={h1Filter} onValueChange={onH1FilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All H1</SelectItem>
                <SelectItem value="Balance Sheet">Balance Sheet</SelectItem>
                <SelectItem value="P&L Account">P&L Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* H2 Filter */}
          <div className="space-y-2">
            <Label>H2 Classification</Label>
            <Select value={h2Filter} onValueChange={onH2FilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All H2</SelectItem>
                <SelectItem value="Assets">Assets</SelectItem>
                <SelectItem value="Liabilities">Liabilities</SelectItem>
                <SelectItem value="Equity">Equity</SelectItem>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expenses">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* H3 Filter */}
          <div className="space-y-2">
            <Label>H3 Classification</Label>
            <Select value={h3Filter} onValueChange={onH3FilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All H3</SelectItem>
                <SelectItem value="Trade Receivables">Trade Receivables</SelectItem>
                <SelectItem value="Cash and Bank Balance">Cash & Bank</SelectItem>
                <SelectItem value="Inventories">Inventories</SelectItem>
                <SelectItem value="Trade Payables">Trade Payables</SelectItem>
                <SelectItem value="Borrowings">Borrowings</SelectItem>
                <SelectItem value="Revenue from Operations">Revenue</SelectItem>
                <SelectItem value="Other Income">Other Income</SelectItem>
                <SelectItem value="Other Expenses">Other Expenses</SelectItem>
                <SelectItem value="Employee Benefits Expenses">Employee Benefits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group Filter */}
          <div className="space-y-2">
            <Label>Tally Group</Label>
            <Select value={groupFilter} onValueChange={onGroupFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="Current Assets">Current Assets</SelectItem>
                <SelectItem value="Current Liabilities">Current Liabilities</SelectItem>
                <SelectItem value="Fixed Assets">Fixed Assets</SelectItem>
                <SelectItem value="Sundry Debtors">Sundry Debtors</SelectItem>
                <SelectItem value="Sundry Creditors">Sundry Creditors</SelectItem>
                <SelectItem value="Bank Accounts">Bank Accounts</SelectItem>
                <SelectItem value="Cash-in-hand">Cash-in-hand</SelectItem>
                <SelectItem value="Loans & Advances">Loans & Advances</SelectItem>
                <SelectItem value="Sales Accounts">Sales Accounts</SelectItem>
                <SelectItem value="Purchase Accounts">Purchase Accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Balance Filter */}
          <div className="space-y-2">
            <Label>Balance Type</Label>
            <Select value={balanceFilter} onValueChange={onBalanceFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balances</SelectItem>
                <SelectItem value="debit">Debit Only</SelectItem>
                <SelectItem value="credit">Credit Only</SelectItem>
                <SelectItem value="zero">Zero Balance</SelectItem>
                <SelectItem value="non-zero">Non-Zero</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
