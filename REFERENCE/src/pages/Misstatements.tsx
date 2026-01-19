import { useState } from 'react';
import { sampleMisstatements, sampleMateriality } from '@/data/sampleData';
import { Misstatement } from '@/types/audit';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Plus, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Misstatements() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalMisstatements = sampleMisstatements.reduce((sum, m) => sum + m.amount, 0);
  const adjustedAmount = sampleMisstatements
    .filter((m) => m.adjusted)
    .reduce((sum, m) => sum + m.amount, 0);
  const unadjustedAmount = sampleMisstatements
    .filter((m) => !m.adjusted)
    .reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const isBelowMateriality = unadjustedAmount < sampleMateriality.overallMateriality;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Misstatements</h1>
          <p className="text-muted-foreground mt-1">
            Track and evaluate audit misstatements
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Misstatement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Misstatement</DialogTitle>
              <DialogDescription>
                Record a misstatement identified during the audit.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the misstatement..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>FS Area</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Revenue">Revenue</SelectItem>
                      <SelectItem value="Inventory">Inventory</SelectItem>
                      <SelectItem value="Receivables">Receivables</SelectItem>
                      <SelectItem value="Fixed Assets">Fixed Assets</SelectItem>
                      <SelectItem value="Expenses">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="factual">Factual</SelectItem>
                      <SelectItem value="judgmental">Judgmental</SelectItem>
                      <SelectItem value="projected">Projected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Adjusted by Management</Label>
                  <p className="text-xs text-muted-foreground">
                    Has management corrected this misstatement?
                  </p>
                </div>
                <Switch />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Identified
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(totalMisstatements)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {sampleMisstatements.length} misstatements
          </p>
        </div>
        <div className="audit-card">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Adjusted
            </p>
            <TrendingDown className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-success mt-1">
            {formatCurrency(adjustedAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {sampleMisstatements.filter((m) => m.adjusted).length} corrected
          </p>
        </div>
        <div className="audit-card">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Unadjusted
            </p>
            <TrendingUp className="h-4 w-4 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning mt-1">
            {formatCurrency(unadjustedAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {sampleMisstatements.filter((m) => !m.adjusted).length} remaining
          </p>
        </div>
        <div className="audit-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            vs Materiality
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {((unadjustedAmount / sampleMateriality.overallMateriality) * 100).toFixed(1)}%
          </p>
          <div className="mt-2">
            {isBelowMateriality ? (
              <StatusBadge variant="success">
                Below Materiality
              </StatusBadge>
            ) : (
              <StatusBadge variant="danger">
                Exceeds Materiality
              </StatusBadge>
            )}
          </div>
        </div>
      </div>

      {/* Materiality Comparison */}
      <div className="audit-card">
        <h3 className="font-semibold text-foreground mb-4">Materiality Comparison</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unadjusted Misstatements</span>
              <span className="font-medium text-foreground">{formatCurrency(unadjustedAmount)}</span>
            </div>
            <div className="relative h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isBelowMateriality ? 'bg-success' : 'bg-destructive'
                )}
                style={{
                  width: `${Math.min((unadjustedAmount / sampleMateriality.overallMateriality) * 100, 100)}%`,
                }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground"
                style={{ left: '100%', transform: 'translateX(-100%)' }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>₹0</span>
              <span>OM: {formatCurrency(sampleMateriality.overallMateriality)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Trivial Threshold</p>
              <p className="font-medium text-foreground">
                {formatCurrency(sampleMateriality.trivialThreshold)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Performance Materiality</p>
              <p className="font-medium text-foreground">
                {formatCurrency(sampleMateriality.performanceMateriality)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Overall Materiality</p>
              <p className="font-medium text-foreground">
                {formatCurrency(sampleMateriality.overallMateriality)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Misstatements Table */}
      <div className="audit-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">FS Area</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-28 text-right">Amount</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="w-28">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleMisstatements.map((misstatement) => (
                <TableRow key={misstatement.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{misstatement.description}</p>
                      {misstatement.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {misstatement.reason}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
                      {misstatement.fsArea}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{misstatement.type}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(misstatement.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {misstatement.adjusted ? (
                      <div className="flex items-center justify-center gap-1 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Adjusted</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-warning">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Unadjusted</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(misstatement.createdAt), 'dd MMM yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
