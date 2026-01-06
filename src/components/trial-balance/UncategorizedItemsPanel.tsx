import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Tags } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TrialBalanceLine, TrialBalanceLineInput } from '@/hooks/useTrialBalance';

interface Props {
  lines: TrialBalanceLine[];
  onUpdateLines: (ids: string[], data: Partial<TrialBalanceLineInput>) => Promise<boolean>;
  reportingScale: string;
}

const AILE_OPTIONS = ['Asset', 'Income', 'Liability', 'Expense'];
const FS_AREA_OPTIONS = [
  'Fixed Assets', 'Investments', 'Other Non-Current', 'Inventory', 'Receivables', 'Cash', 'Other Current',
  'Equity', 'Reserves', 'Borrowings', 'Short Term Borrowings', 'Payables', 'Other Current Liabilities', 'Provisions', 'Deferred Tax', 'Other Long Term',
  'Revenue', 'Other Income',
  'Cost of Materials', 'Employee Benefits', 'Finance', 'Depreciation', 'Other Expenses',
];

export function UncategorizedItemsPanel({ lines, onUpdateLines, reportingScale }: Props) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignAile, setAssignAile] = useState('Asset');
  const [assignFsArea, setAssignFsArea] = useState('Fixed Assets');
  const [isAssigning, setIsAssigning] = useState(false);

  const uncategorizedLines = useMemo(() => 
    lines.filter(l => !l.aile || !l.fs_area),
    [lines]
  );

  const totalUncategorizedValue = useMemo(() => 
    uncategorizedLines.reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0),
    [uncategorizedLines]
  );

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}₹${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'lakhs':
        return `${sign}₹${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'crores':
        return `${sign}₹${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'auto':
      default:
        if (absAmount >= 10000000) {
          return `${sign}₹${(absAmount / 10000000).toFixed(2)} Cr`;
        } else if (absAmount >= 100000) {
          return `${sign}₹${(absAmount / 100000).toFixed(2)} L`;
        }
        return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(uncategorizedLines.map(l => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectLine = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    
    setIsAssigning(true);
    try {
      const success = await onUpdateLines(Array.from(selectedIds), {
        aile: assignAile,
        fs_area: assignFsArea,
      });
      
      if (success) {
        toast({
          title: 'Items categorized',
          description: `${selectedIds.size} items assigned to ${assignAile} / ${assignFsArea}`,
        });
        setSelectedIds(new Set());
        setIsAssignDialogOpen(false);
      }
    } finally {
      setIsAssigning(false);
    }
  };

  if (uncategorizedLines.length === 0) {
    return (
      <div className="audit-card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
            <Tags className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="font-medium text-foreground">All Items Categorized</p>
            <p className="text-sm text-muted-foreground mt-1">
              All trial balance entries have been mapped to AILE and FS Area classifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div>
            <p className="font-medium">
              {uncategorizedLines.length} Uncategorized Items
            </p>
            <p className="text-sm text-muted-foreground">
              Total value: {formatCurrency(totalUncategorizedValue)}
            </p>
          </div>
        </div>
        
        {selectedIds.size > 0 && (
          <Button onClick={() => setIsAssignDialogOpen(true)} className="gap-2">
            <Tags className="h-4 w-4" />
            Assign AILE & FS Area ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="audit-card p-0 overflow-hidden">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={uncategorizedLines.length > 0 && selectedIds.size === uncategorizedLines.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Primary Group</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-right">Closing Balance</TableHead>
                <TableHead>Current AILE</TableHead>
                <TableHead>Current FS Area</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uncategorizedLines.map(line => (
                <TableRow 
                  key={line.id} 
                  className={cn(selectedIds.has(line.id) && 'bg-primary/5')}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(line.id)}
                      onCheckedChange={(checked) => handleSelectLine(line.id, checked === true)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{line.account_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {line.ledger_primary_group || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {line.ledger_parent || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Number(line.closing_balance))}
                  </TableCell>
                  <TableCell>
                    {line.aile ? (
                      <Badge variant="secondary">{line.aile}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning border-warning">Missing</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {line.fs_area ? (
                      <Badge variant="secondary">{line.fs_area}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning border-warning">Missing</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign AILE & FS Area</DialogTitle>
            <DialogDescription>
              Assign classification to {selectedIds.size} selected items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">AILE Classification</label>
              <Select value={assignAile} onValueChange={setAssignAile}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AILE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">FS Area</label>
              <Select value={assignFsArea} onValueChange={setAssignFsArea}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FS_AREA_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning}>
              {isAssigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
