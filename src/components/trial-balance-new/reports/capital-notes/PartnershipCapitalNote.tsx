import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';

interface Partner {
  id: string;
  name: string;
  sharePercent: number;
  openingBalance: number;
  capitalIntroduced: number;
  remuneration: number;
  interest: number;
  withdrawal: number;
  profitLoss: number;
  closingBalance: number;
}

interface PartnershipCapitalNoteProps {
  lines: TrialBalanceLine[];
  currentYear: string;
  previousYear?: string;
  entityType: 'partnership' | 'llp';
}

export function PartnershipCapitalNote({ lines, currentYear, previousYear, entityType }: PartnershipCapitalNoteProps) {
  const [partners, setPartners] = useState<Partner[]>([
    createEmptyPartner(),
    createEmptyPartner(),
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  function createEmptyPartner(): Partner {
    return {
      id: crypto.randomUUID(),
      name: '',
      sharePercent: 0,
      openingBalance: 0,
      capitalIntroduced: 0,
      remuneration: 0,
      interest: 0,
      withdrawal: 0,
      profitLoss: 0,
      closingBalance: 0,
    };
  }

  // Calculate closing balance automatically
  const calculateClosingBalance = (partner: Omit<Partner, 'closingBalance'>): number => {
    return (
      partner.openingBalance +
      partner.capitalIntroduced +
      partner.remuneration +
      partner.interest +
      partner.profitLoss -
      partner.withdrawal
    );
  };

  // Get Capital group ledgers from TB for validation
  const capitalLedgers = useMemo(() => {
    return lines.filter(line => {
      const parent = (line.ledger_parent || '').toLowerCase();
      const primaryGroup = (line.ledger_primary_group || '').toLowerCase();
      return parent.includes('capital') || primaryGroup.includes('capital');
    });
  }, [lines]);

  const tbCapitalTotal = useMemo(() => {
    return capitalLedgers
      .filter(l => l.period_type !== 'previous')
      .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
  }, [capitalLedgers]);

  // Calculate totals
  const totals = useMemo(() => {
    return partners.reduce((acc, p) => ({
      sharePercent: acc.sharePercent + p.sharePercent,
      openingBalance: acc.openingBalance + p.openingBalance,
      capitalIntroduced: acc.capitalIntroduced + p.capitalIntroduced,
      remuneration: acc.remuneration + p.remuneration,
      interest: acc.interest + p.interest,
      withdrawal: acc.withdrawal + p.withdrawal,
      profitLoss: acc.profitLoss + p.profitLoss,
      closingBalance: acc.closingBalance + calculateClosingBalance(p),
    }), {
      sharePercent: 0,
      openingBalance: 0,
      capitalIntroduced: 0,
      remuneration: 0,
      interest: 0,
      withdrawal: 0,
      profitLoss: 0,
      closingBalance: 0,
    });
  }, [partners]);

  const handlePartnerChange = (id: string, field: keyof Partner, value: string | number) => {
    setPartners(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value };
      updated.closingBalance = calculateClosingBalance(updated);
      return updated;
    }));
  };

  const handleNameChange = (id: string, value: string) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, name: value } : p));
  };

  const addPartner = () => {
    setPartners(prev => [...prev, createEmptyPartner()]);
  };

  const removePartner = (id: string) => {
    if (partners.length <= 2) return; // Minimum 2 partners
    setPartners(prev => prev.filter(p => p.id !== id));
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    const sign = amount < 0 ? '-' : '';
    return `${sign}₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const isValidated = Math.abs(totals.closingBalance - tbCapitalTotal) < 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          {entityType === 'llp' ? "Partners' Capital Account (LLP)" : "Partners' Capital Account"}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addPartner}>
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
          <Button size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Validation Message */}
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
          isValidated
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        }`}>
          {!isValidated && <AlertCircle className="h-4 w-4" />}
          TB Capital Total: {formatCurrency(tbCapitalTotal)} | 
          Partners Closing Total: {formatCurrency(totals.closingBalance)}
          {!isValidated && (
            <span className="ml-2">(Difference: {formatCurrency(Math.abs(totals.closingBalance - tbCapitalTotal))})</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-yellow-100 dark:bg-yellow-900/30">
                <TableHead className="w-[180px] text-foreground font-semibold">Name of Partner</TableHead>
                <TableHead className="text-center w-[80px] text-foreground font-semibold">Share (%)</TableHead>
                <TableHead className="text-right w-[120px] text-foreground font-semibold bg-yellow-200 dark:bg-yellow-800/50">Opening Balance</TableHead>
                <TableHead className="text-right w-[120px] text-foreground font-semibold">Capital Introduced</TableHead>
                <TableHead className="text-right w-[100px] text-foreground font-semibold">Remuneration</TableHead>
                <TableHead className="text-right w-[100px] text-foreground font-semibold">Interest</TableHead>
                <TableHead className="text-right w-[100px] text-foreground font-semibold">Withdrawal</TableHead>
                <TableHead className="text-right w-[100px] text-foreground font-semibold">Profit/Loss</TableHead>
                <TableHead className="text-right w-[120px] text-foreground font-semibold">Closing Balance</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner, idx) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <Input
                      className="h-8"
                      placeholder={`Partner ${idx + 1}`}
                      value={partner.name}
                      onChange={(e) => handleNameChange(partner.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 text-center"
                      value={partner.sharePercent || ''}
                      onChange={(e) => handlePartnerChange(partner.id, 'sharePercent', e.target.value)}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="bg-yellow-50 dark:bg-yellow-900/20">
                    <Input
                      type="number"
                      className="h-8 text-right"
                      value={partner.openingBalance || ''}
                      onChange={(e) => handlePartnerChange(partner.id, 'openingBalance', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 text-right"
                      value={partner.capitalIntroduced || ''}
                      onChange={(e) => handlePartnerChange(partner.id, 'capitalIntroduced', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 text-right"
                      value={partner.remuneration || ''}
                      onChange={(e) => handlePartnerChange(partner.id, 'remuneration', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 text-right"
                      value={partner.interest || ''}
                      onChange={(e) => handlePartnerChange(partner.id, 'interest', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 text-right"
                      value={partner.withdrawal || ''}
                      onChange={(e) => handlePartnerChange(partner.id, 'withdrawal', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 text-right"
                      value={partner.profitLoss || ''}
                      onChange={(e) => handlePartnerChange(partner.id, 'profitLoss', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(calculateClosingBalance(partner))}
                  </TableCell>
                  <TableCell>
                    {partners.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removePartner(partner.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="bg-muted font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">{totals.sharePercent.toFixed(2)}%</TableCell>
                <TableCell className="text-right bg-yellow-100 dark:bg-yellow-900/30">{formatCurrency(totals.openingBalance)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.capitalIntroduced)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.remuneration)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.interest)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.withdrawal)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.profitLoss)}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.closingBalance)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Share % validation */}
        {totals.sharePercent !== 100 && totals.sharePercent > 0 && (
          <div className="mt-4 p-3 rounded-lg text-sm bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Total share percentage is {totals.sharePercent.toFixed(2)}% (should be 100%)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
