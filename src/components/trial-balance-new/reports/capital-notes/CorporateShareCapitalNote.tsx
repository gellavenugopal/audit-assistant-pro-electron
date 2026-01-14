import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';

interface ShareClass {
  id: string;
  description: string;
  numberOfShares: number;
  faceValue: number;
  amount: number;
}

interface Shareholder {
  id: string;
  name: string;
  currentShares: number;
  currentPercent: number;
  previousShares: number;
  previousPercent: number;
}

interface CorporateShareCapitalNoteProps {
  lines: TrialBalanceLine[];
  currentYear: string;
  previousYear?: string;
}

export function CorporateShareCapitalNote({ lines, currentYear, previousYear }: CorporateShareCapitalNoteProps) {
  const storageKey = useMemo(() => {
    const engagementId = lines?.[0]?.engagement_id || 'local';
    return `capital-note-corporate-${engagementId}`;
  }, [lines]);

  const createShareClass = () => ({ id: crypto.randomUUID(), description: '', numberOfShares: 0, faceValue: 10, amount: 0 });

  const [authorizedShares, setAuthorizedShares] = useState<ShareClass[]>([createShareClass()]);
  const [issuedShares, setIssuedShares] = useState<ShareClass[]>([createShareClass()]);
  const [reconciliation, setReconciliation] = useState({
    openingNumber: 0,
    openingAmount: 0,
    movementNumber: 0,
    movementAmount: 0,
    previousOpeningNumber: 0,
    previousOpeningAmount: 0,
    previousMovementNumber: 0,
    previousMovementAmount: 0,
  });
  const [rightsText, setRightsText] = useState('');
  const [majorShareholders, setMajorShareholders] = useState<Shareholder[]>([
    { id: '1', name: '', currentShares: 0, currentPercent: 0, previousShares: 0, previousPercent: 0 }
  ]);
  const [holdingCompany, setHoldingCompany] = useState<Shareholder[]>([
    { id: '1', name: '', currentShares: 0, currentPercent: 0, previousShares: 0, previousPercent: 0 }
  ]);
  const [promoters, setPromoters] = useState<Shareholder[]>([
    { id: '1', name: '', currentShares: 0, currentPercent: 0, previousShares: 0, previousPercent: 0 }
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.authorizedShares) setAuthorizedShares(parsed.authorizedShares);
      if (parsed.issuedShares) setIssuedShares(parsed.issuedShares);
      if (parsed.reconciliation) setReconciliation(parsed.reconciliation);
      if (parsed.rightsText !== undefined) setRightsText(parsed.rightsText);
      if (parsed.majorShareholders) setMajorShareholders(parsed.majorShareholders);
      if (parsed.holdingCompany) setHoldingCompany(parsed.holdingCompany);
      if (parsed.promoters) setPromoters(parsed.promoters);
    } catch (error) {
      console.error('Failed to load saved capital note data', error);
    }
  }, [storageKey]);

  const handleSaveAll = () => {
    if (typeof window === 'undefined') return;
    const payload = {
      authorizedShares,
      issuedShares,
      reconciliation,
      rightsText,
      majorShareholders,
      holdingCompany,
      promoters,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  };

  // Get Share Capital ledgers from TB for validation
  const shareCapitalLedgers = useMemo(() => {
    return lines.filter(line => {
      const parent = (line.ledger_parent || '').toLowerCase();
      const primaryGroup = (line.ledger_primary_group || '').toLowerCase();
      const name = line.account_name.toLowerCase();
      return parent.includes('share capital') || primaryGroup.includes('share capital') || name.includes('share capital');
    });
  }, [lines]);

  const tbShareCapitalTotal = useMemo(() => {
    return shareCapitalLedgers
      .filter(l => l.period_type !== 'previous')
      .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
  }, [shareCapitalLedgers]);

  const issuedTotal = useMemo(() => {
    return issuedShares.reduce((sum, s) => sum + s.amount, 0);
  }, [issuedShares]);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number) => {
    if (num === 0) return '-';
    return num.toLocaleString('en-IN');
  };

  const handleShareChange = (
    setter: React.Dispatch<React.SetStateAction<ShareClass[]>>,
    id: string,
    field: keyof ShareClass,
    value: string
  ) => {
    setter(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: field === 'description' ? value : (parseFloat(value) || 0) };
      if (field === 'numberOfShares' || field === 'faceValue') {
        updated.amount = updated.numberOfShares * updated.faceValue;
      }
      return updated;
    }));
  };

  const addShareClass = (setter: React.Dispatch<React.SetStateAction<ShareClass[]>>) => {
    setter(prev => [...prev, {
      id: crypto.randomUUID(),
      description: '',
      numberOfShares: 0,
      faceValue: 10,
      amount: 0
    }]);
  };

  const removeShareClass = (setter: React.Dispatch<React.SetStateAction<ShareClass[]>>, id: string) => {
    setter(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(s => s.id !== id);
    });
  };

  const addShareholder = (setter: React.Dispatch<React.SetStateAction<Shareholder[]>>) => {
    setter(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      currentShares: 0,
      currentPercent: 0,
      previousShares: 0,
      previousPercent: 0
    }]);
  };

  const handleShareholderChange = (
    setter: React.Dispatch<React.SetStateAction<Shareholder[]>>,
    id: string,
    field: keyof Shareholder,
    value: string
  ) => {
    setter(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, [field]: field === 'name' ? value : (parseFloat(value) || 0) };
    }));
  };

  const isValidated = Math.abs(issuedTotal - tbShareCapitalTotal) < 1;

  return (
    <div className="space-y-4">
      {/* Note Header with Validation */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Note: Share Capital</h3>
        <div className="flex items-center gap-4">
          <div className={`text-sm px-3 py-1 rounded-md ${
            isValidated
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
          }`}>
            {!isValidated && <AlertCircle className="h-3 w-3 inline mr-1" />}
            TB: {formatCurrency(tbShareCapitalTotal)} | Issued: {formatCurrency(issuedTotal)}
          </div>
          <Button size="sm" onClick={handleSaveAll}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Authorized Share Capital */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead colSpan={4} className="font-semibold">
                Authorised Share Capital
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => addShareClass(setAuthorizedShares)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="w-[400px]">Description</TableHead>
              <TableHead className="text-right w-[150px]">As at {currentYear}</TableHead>
              <TableHead className="text-right w-[150px]">As at {previousYear || 'Previous Year'}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {authorizedShares.map((share) => (
              <TableRow key={share.id}>
                <TableCell>
                  <Input
                    value={share.description}
                    onChange={(e) => handleShareChange(setAuthorizedShares, share.id, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-7 text-sm"
                  />
                </TableCell>
                <TableCell className="text-right font-medium text-sm">{formatCurrency(share.amount)}</TableCell>
                <TableCell className="text-right font-medium text-sm">{formatCurrency(share.amount)}</TableCell>
                <TableCell>
                  {authorizedShares.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                      onClick={() => removeShareClass(setAuthorizedShares, share.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reconciliation */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead colSpan={previousYear ? 5 : 3} className="font-semibold">Reconciliation of Shares Outstanding</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>Particulars</TableHead>
              <TableHead className="text-right">Number</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {previousYear && (
                <>
                  <TableHead className="text-right">Number (PY)</TableHead>
                  <TableHead className="text-right">Amount (PY)</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Opening balance</TableCell>
              <TableCell>
                <Input type="number" className="h-7 text-right text-sm" 
                  value={reconciliation.openingNumber || ''} 
                  onChange={(e) => setReconciliation(prev => ({ ...prev, openingNumber: parseFloat(e.target.value) || 0 }))}
                />
              </TableCell>
              <TableCell>
                <Input type="number" className="h-7 text-right text-sm" 
                  value={reconciliation.openingAmount || ''} 
                  onChange={(e) => setReconciliation(prev => ({ ...prev, openingAmount: parseFloat(e.target.value) || 0 }))}
                />
              </TableCell>
              {previousYear && (
                <>
                  <TableCell>
                    <Input type="number" className="h-7 text-right text-sm" 
                      value={reconciliation.previousOpeningNumber || ''} 
                      onChange={(e) => setReconciliation(prev => ({ ...prev, previousOpeningNumber: parseFloat(e.target.value) || 0 }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-7 text-right text-sm" 
                      value={reconciliation.previousOpeningAmount || ''} 
                      onChange={(e) => setReconciliation(prev => ({ ...prev, previousOpeningAmount: parseFloat(e.target.value) || 0 }))}
                    />
                  </TableCell>
                </>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Movement during the year</TableCell>
              <TableCell>
                <Input type="number" className="h-7 text-right text-sm" 
                  value={reconciliation.movementNumber || ''} 
                  onChange={(e) => setReconciliation(prev => ({ ...prev, movementNumber: parseFloat(e.target.value) || 0 }))}
                />
              </TableCell>
              <TableCell>
                <Input type="number" className="h-7 text-right text-sm" 
                  value={reconciliation.movementAmount || ''} 
                  onChange={(e) => setReconciliation(prev => ({ ...prev, movementAmount: parseFloat(e.target.value) || 0 }))}
                />
              </TableCell>
              {previousYear && (
                <>
                  <TableCell>
                    <Input type="number" className="h-7 text-right text-sm" 
                      value={reconciliation.previousMovementNumber || ''} 
                      onChange={(e) => setReconciliation(prev => ({ ...prev, previousMovementNumber: parseFloat(e.target.value) || 0 }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-7 text-right text-sm" 
                      value={reconciliation.previousMovementAmount || ''} 
                      onChange={(e) => setReconciliation(prev => ({ ...prev, previousMovementAmount: parseFloat(e.target.value) || 0 }))}
                    />
                  </TableCell>
                </>
              )}
            </TableRow>
            <TableRow className="bg-muted font-semibold">
              <TableCell>Outstanding at the end</TableCell>
              <TableCell className="text-right">{formatNumber(reconciliation.openingNumber + reconciliation.movementNumber)}</TableCell>
              <TableCell className="text-right">{formatCurrency(reconciliation.openingAmount + reconciliation.movementAmount)}</TableCell>
              {previousYear && (
                <>
                  <TableCell className="text-right">{formatNumber(reconciliation.previousOpeningNumber + reconciliation.previousMovementNumber)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(reconciliation.previousOpeningAmount + reconciliation.previousMovementAmount)}</TableCell>
                </>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Rights, Preferences and Restrictions */}
      <div className="border rounded-lg p-3">
        <h4 className="text-sm font-semibold mb-2">Rights, Preferences and Restrictions Attached to Equity Shares</h4>
        <Textarea
          value={rightsText}
          onChange={(e) => setRightsText(e.target.value)}
          className="min-h-[80px] text-sm"
          placeholder="Enter the rights, preferences and restrictions..."
        />
      </div>

      {/* Shareholders holding >5% */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead colSpan={previousYear ? 5 : 3} className="font-semibold">
                Shareholders Holding More Than 5%
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => addShareholder(setMajorShareholders)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">No. of Shares</TableHead>
              <TableHead className="text-right">% Holding</TableHead>
              {previousYear && (
                <>
                  <TableHead className="text-right">No. (PY)</TableHead>
                  <TableHead className="text-right">% (PY)</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {majorShareholders.map((sh) => (
              <TableRow key={sh.id}>
                <TableCell>
                  <Input className="h-7 text-sm" value={sh.name} 
                    onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'name', e.target.value)} 
                    placeholder="Shareholder name" 
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-7 text-right text-sm" value={sh.currentShares || ''} 
                    onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'currentShares', e.target.value)} 
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-7 text-right text-sm" value={sh.currentPercent || ''} 
                    onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'currentPercent', e.target.value)} 
                  />
                </TableCell>
                {previousYear && (
                  <>
                    <TableCell>
                      <Input type="number" className="h-7 text-right text-sm" value={sh.previousShares || ''} 
                        onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'previousShares', e.target.value)} 
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-7 text-right text-sm" value={sh.previousPercent || ''} 
                        onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'previousPercent', e.target.value)} 
                      />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Holding Company */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead colSpan={previousYear ? 5 : 3} className="font-semibold">
                Shares Held by the Holding Company*
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => addShareholder(setHoldingCompany)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead className="text-right">No. of Shares</TableHead>
              <TableHead className="text-right">% Holding</TableHead>
              {previousYear && (
                <>
                  <TableHead className="text-right">No. (PY)</TableHead>
                  <TableHead className="text-right">% (PY)</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdingCompany.map((sh) => (
              <TableRow key={sh.id}>
                <TableCell>
                  <Input className="h-7 text-sm" value={sh.name} 
                    onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'name', e.target.value)} 
                    placeholder="Company name" 
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-7 text-right text-sm" value={sh.currentShares || ''} 
                    onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'currentShares', e.target.value)} 
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-7 text-right text-sm" value={sh.currentPercent || ''} 
                    onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'currentPercent', e.target.value)} 
                  />
                </TableCell>
                {previousYear && (
                  <>
                    <TableCell>
                      <Input type="number" className="h-7 text-right text-sm" value={sh.previousShares || ''} 
                        onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'previousShares', e.target.value)} 
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-7 text-right text-sm" value={sh.previousPercent || ''} 
                        onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'previousPercent', e.target.value)} 
                      />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Promoters Shareholding */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead colSpan={previousYear ? 6 : 4} className="font-semibold">
                Promoters Shareholding
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => addShareholder(setPromoters)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead>Promoter Name</TableHead>
              <TableHead className="text-right">No. of Shares</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
              {previousYear && (
                <>
                  <TableHead className="text-right">No. (PY)</TableHead>
                  <TableHead className="text-right">% (PY)</TableHead>
                </>
              )}
              <TableHead className="text-right">% Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promoters.map((sh) => (
              <TableRow key={sh.id}>
                <TableCell>
                  <Input className="h-7 text-sm" value={sh.name} 
                    onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'name', e.target.value)} 
                    placeholder="Promoter name" 
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-7 text-right text-sm" value={sh.currentShares || ''} 
                    onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'currentShares', e.target.value)} 
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-7 text-right text-sm" value={sh.currentPercent || ''} 
                    onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'currentPercent', e.target.value)} 
                  />
                </TableCell>
                {previousYear && (
                  <>
                    <TableCell>
                      <Input type="number" className="h-7 text-right text-sm" value={sh.previousShares || ''} 
                        onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'previousShares', e.target.value)} 
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-7 text-right text-sm" value={sh.previousPercent || ''} 
                        onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'previousPercent', e.target.value)} 
                      />
                    </TableCell>
                  </>
                )}
                <TableCell className="text-right font-medium text-sm">
                  {sh.currentPercent !== 0 || sh.previousPercent !== 0 
                    ? `${(sh.currentPercent - sh.previousPercent).toFixed(2)}%` 
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatNumber(promoters.reduce((s, p) => s + p.currentShares, 0))}</TableCell>
              <TableCell className="text-right">{promoters.reduce((s, p) => s + p.currentPercent, 0).toFixed(2)}%</TableCell>
              {previousYear && (
                <>
                  <TableCell className="text-right">{formatNumber(promoters.reduce((s, p) => s + p.previousShares, 0))}</TableCell>
                  <TableCell className="text-right">{promoters.reduce((s, p) => s + p.previousPercent, 0).toFixed(2)}%</TableCell>
                </>
              )}
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Standard Disclosures */}
      <div className="border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Standard Disclosures:</p>
        <p>• There are no shares reserved for issue under options and no contracts/commitments for the sale of shares/disinvestment.</p>
        <p>• There are no shares issued pursuant to contract without payment being received in cash or allotted as fully paid up bonus shares or shares bought back for the period of five years immediately preceding the date of these financial statements.</p>
      </div>
    </div>
  );
}
