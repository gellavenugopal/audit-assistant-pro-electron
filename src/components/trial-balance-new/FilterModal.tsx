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
  groupFilter: string;
  balanceFilter: string;
  
  // Filter setters
  onGroupFilterChange: (value: string) => void;
  onBalanceFilterChange: (value: string) => void;
  
  // Reset
  onResetFilters: () => void;
}

export function FilterModal({
  open,
  onOpenChange,
  groupFilter,
  balanceFilter,
  onGroupFilterChange,
  onBalanceFilterChange,
  onResetFilters,
}: FilterModalProps) {
  const activeFiltersCount = [
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
                <SelectItem value="positive">Debit/Natural Dr (Positive)</SelectItem>
                <SelectItem value="negative">Credit/Natural Cr (Negative)</SelectItem>
                <SelectItem value="zero">Zero Balance</SelectItem>
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
