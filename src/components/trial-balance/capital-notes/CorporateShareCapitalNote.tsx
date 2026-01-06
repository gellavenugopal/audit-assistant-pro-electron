import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  // Authorized Share Capital
  const [authorizedShares, setAuthorizedShares] = useState<ShareClass[]>([
    { id: '1', description: '', numberOfShares: 0, faceValue: 10, amount: 0 }
  ]);

  // Issued, Subscribed and Fully Paid Up
  const [issuedShares, setIssuedShares] = useState<ShareClass[]>([
    { id: '1', description: '', numberOfShares: 0, faceValue: 10, amount: 0 }
  ]);

  // Reconciliation
  const [reconciliation, setReconciliation] = useState({
    openingNumber: 0,
    openingAmount: 0,
    movementNumber: 0,
    movementAmount: 0,
    closingNumber: 0,
    closingAmount: 0,
    previousOpeningNumber: 0,
    previousOpeningAmount: 0,
    previousMovementNumber: 0,
    previousMovementAmount: 0,
    previousClosingNumber: 0,
    previousClosingAmount: 0,
  });

  // Rights, preferences and restrictions text (template placeholder)
  const [rightsText, setRightsText] = useState(
    ''
  );

  // Shareholders holding more than 5%
  const [majorShareholders, setMajorShareholders] = useState<Shareholder[]>([
    { id: '1', name: '', currentShares: 0, currentPercent: 0, previousShares: 0, previousPercent: 0 }
  ]);

  // Holding Company
  const [holdingCompany, setHoldingCompany] = useState<Shareholder[]>([
    { id: '1', name: '', currentShares: 0, currentPercent: 0, previousShares: 0, previousPercent: 0 }
  ]);

  // Promoters
  const [promoters, setPromoters] = useState<Shareholder[]>([
    { id: '1', name: '', currentShares: 0, currentPercent: 0, previousShares: 0, previousPercent: 0 }
  ]);

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
    <div className="space-y-6">
      {/* Validation Banner */}
      <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
        isValidated
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      }`}>
        {!isValidated && <AlertCircle className="h-4 w-4" />}
        TB Share Capital: {formatCurrency(tbShareCapitalTotal)} | 
        Issued Capital: {formatCurrency(issuedTotal)}
        {!isValidated && (
          <span className="ml-2">(Difference: {formatCurrency(Math.abs(issuedTotal - tbShareCapitalTotal))})</span>
        )}
        <Button size="sm" className="ml-auto">
          <Save className="h-4 w-4 mr-2" />
          Save All
        </Button>
      </div>

      {/* Share Capital Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Share Capital</CardTitle>
          <CardDescription>(Amount in ₹)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authorized Shares */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Authorised Shares</Label>
              <Button variant="outline" size="sm" onClick={() => addShareClass(setAuthorizedShares)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <Table>
              <TableBody>
                {authorizedShares.map((share) => (
                  <TableRow key={share.id}>
                    <TableCell className="w-[400px]">
                      <Input
                        value={share.description}
                        onChange={(e) => handleShareChange(setAuthorizedShares, share.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold w-[150px]">
                      {formatCurrency(share.amount)}
                    </TableCell>
                    <TableCell className="text-right w-[150px]">
                      {formatCurrency(share.amount)}
                    </TableCell>
                    <TableCell className="w-[50px]">
                      {authorizedShares.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
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

          <Separator />

          {/* Issued Shares */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Issued, Subscribed and Fully Paid Up Shares</Label>
              <Button variant="outline" size="sm" onClick={() => addShareClass(setIssuedShares)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[100px]">No. of Shares</TableHead>
                  <TableHead className="text-right w-[80px]">Face Value</TableHead>
                  <TableHead className="text-right w-[120px]">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issuedShares.map((share) => (
                  <TableRow key={share.id}>
                    <TableCell>
                      <Input
                        value={share.description}
                        onChange={(e) => handleShareChange(setIssuedShares, share.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={share.numberOfShares || ''}
                        onChange={(e) => handleShareChange(setIssuedShares, share.id, 'numberOfShares', e.target.value)}
                        className="h-8 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={share.faceValue || ''}
                        onChange={(e) => handleShareChange(setIssuedShares, share.id, 'faceValue', e.target.value)}
                        className="h-8 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(share.amount)}
                    </TableCell>
                    <TableCell>
                      {issuedShares.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => removeShareClass(setIssuedShares, share.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{formatCurrency(issuedTotal)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Reconciliation of Shares Outstanding</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Particulars</TableHead>
                <TableHead className="text-center" colSpan={2}>As at {currentYear}</TableHead>
                {previousYear && <TableHead className="text-center" colSpan={2}>As at {previousYear}</TableHead>}
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Number</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {previousYear && (
                  <>
                    <TableHead className="text-right">Number</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Opening balance at the beginning of the year</TableCell>
                <TableCell>
                  <Input type="number" className="h-8 text-right" 
                    value={reconciliation.openingNumber || ''} 
                    onChange={(e) => setReconciliation(prev => ({ ...prev, openingNumber: parseFloat(e.target.value) || 0 }))}
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-8 text-right" 
                    value={reconciliation.openingAmount || ''} 
                    onChange={(e) => setReconciliation(prev => ({ ...prev, openingAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </TableCell>
                {previousYear && (
                  <>
                    <TableCell>
                      <Input type="number" className="h-8 text-right" 
                        value={reconciliation.previousOpeningNumber || ''} 
                        onChange={(e) => setReconciliation(prev => ({ ...prev, previousOpeningNumber: parseFloat(e.target.value) || 0 }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-8 text-right" 
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
                  <Input type="number" className="h-8 text-right" 
                    value={reconciliation.movementNumber || ''} 
                    onChange={(e) => setReconciliation(prev => ({ ...prev, movementNumber: parseFloat(e.target.value) || 0 }))}
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" className="h-8 text-right" 
                    value={reconciliation.movementAmount || ''} 
                    onChange={(e) => setReconciliation(prev => ({ ...prev, movementAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </TableCell>
                {previousYear && (
                  <>
                    <TableCell>
                      <Input type="number" className="h-8 text-right" 
                        value={reconciliation.previousMovementNumber || ''} 
                        onChange={(e) => setReconciliation(prev => ({ ...prev, previousMovementNumber: parseFloat(e.target.value) || 0 }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-8 text-right" 
                        value={reconciliation.previousMovementAmount || ''} 
                        onChange={(e) => setReconciliation(prev => ({ ...prev, previousMovementAmount: parseFloat(e.target.value) || 0 }))}
                      />
                    </TableCell>
                  </>
                )}
              </TableRow>
              <TableRow className="bg-muted font-semibold">
                <TableCell>Outstanding at the end of the year</TableCell>
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
        </CardContent>
      </Card>

      {/* Rights, Preferences and Restrictions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Rights, Preferences and Restrictions Attached to Equity Shares</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={rightsText}
            onChange={(e) => setRightsText(e.target.value)}
            className="min-h-[100px]"
            placeholder="Enter the rights, preferences and restrictions..."
          />
        </CardContent>
      </Card>

      {/* Shareholders holding >5% */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Particulars of Shareholders Holding More Than 5% Shares</CardTitle>
          <Button variant="outline" size="sm" onClick={() => addShareholder(setMajorShareholders)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead rowSpan={2}>Particulars</TableHead>
                <TableHead className="text-center" colSpan={2}>As at {currentYear}</TableHead>
                {previousYear && <TableHead className="text-center" colSpan={2}>As at {previousYear}</TableHead>}
              </TableRow>
              <TableRow>
                <TableHead className="text-right">No. of shares</TableHead>
                <TableHead className="text-right">% age of holding</TableHead>
                {previousYear && (
                  <>
                    <TableHead className="text-right">No. of shares</TableHead>
                    <TableHead className="text-right">% age of holding</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {majorShareholders.map((sh) => (
                <TableRow key={sh.id}>
                  <TableCell>
                    <Input className="h-8" value={sh.name} 
                      onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'name', e.target.value)} 
                      placeholder="Shareholder name" 
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right" value={sh.currentShares || ''} 
                      onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'currentShares', e.target.value)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right" value={sh.currentPercent || ''} 
                      onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'currentPercent', e.target.value)} 
                    />
                  </TableCell>
                  {previousYear && (
                    <>
                      <TableCell>
                        <Input type="number" className="h-8 text-right" value={sh.previousShares || ''} 
                          onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'previousShares', e.target.value)} 
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-right" value={sh.previousPercent || ''} 
                          onChange={(e) => handleShareholderChange(setMajorShareholders, sh.id, 'previousPercent', e.target.value)} 
                        />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Holding Company */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Shares Held by the Holding Company*</CardTitle>
            <CardDescription className="text-xs mt-1">
              *As per records of the company, including its register of shareholders/members and other declarations received from shareholders regarding beneficial interest, the above shareholding represents both legal and beneficial ownerships of shares.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => addShareholder(setHoldingCompany)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead rowSpan={2}>Particulars</TableHead>
                <TableHead className="text-center" colSpan={2}>As at {currentYear}</TableHead>
                {previousYear && <TableHead className="text-center" colSpan={2}>As at {previousYear}</TableHead>}
              </TableRow>
              <TableRow>
                <TableHead className="text-right">No. of shares</TableHead>
                <TableHead className="text-right">% age of holding</TableHead>
                {previousYear && (
                  <>
                    <TableHead className="text-right">No. of shares</TableHead>
                    <TableHead className="text-right">% age of holding</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdingCompany.map((sh) => (
                <TableRow key={sh.id}>
                  <TableCell>
                    <Input className="h-8" value={sh.name} 
                      onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'name', e.target.value)} 
                      placeholder="Company name" 
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right" value={sh.currentShares || ''} 
                      onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'currentShares', e.target.value)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right" value={sh.currentPercent || ''} 
                      onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'currentPercent', e.target.value)} 
                    />
                  </TableCell>
                  {previousYear && (
                    <>
                      <TableCell>
                        <Input type="number" className="h-8 text-right" value={sh.previousShares || ''} 
                          onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'previousShares', e.target.value)} 
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-right" value={sh.previousPercent || ''} 
                          onChange={(e) => handleShareholderChange(setHoldingCompany, sh.id, 'previousPercent', e.target.value)} 
                        />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Promoters Shareholding */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Promoters Shareholding</CardTitle>
          <Button variant="outline" size="sm" onClick={() => addShareholder(setPromoters)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead rowSpan={2}>Promoter Name</TableHead>
                <TableHead className="text-center" colSpan={2}>As at {currentYear}</TableHead>
                {previousYear && <TableHead className="text-center" colSpan={2}>As at {previousYear}</TableHead>}
                <TableHead className="text-right" rowSpan={2}>% Change</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-right">No. of Shares</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                {previousYear && (
                  <>
                    <TableHead className="text-right">No. of Shares</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoters.map((sh) => (
                <TableRow key={sh.id}>
                  <TableCell>
                    <Input className="h-8" value={sh.name} 
                      onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'name', e.target.value)} 
                      placeholder="Promoter name" 
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right" value={sh.currentShares || ''} 
                      onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'currentShares', e.target.value)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right" value={sh.currentPercent || ''} 
                      onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'currentPercent', e.target.value)} 
                    />
                  </TableCell>
                  {previousYear && (
                    <>
                      <TableCell>
                        <Input type="number" className="h-8 text-right" value={sh.previousShares || ''} 
                          onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'previousShares', e.target.value)} 
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-right" value={sh.previousPercent || ''} 
                          onChange={(e) => handleShareholderChange(setPromoters, sh.id, 'previousPercent', e.target.value)} 
                        />
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right font-medium">
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
        </CardContent>
      </Card>

      {/* Standard Disclosures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Standard Disclosures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>There are no shares reserved for issue under options and no contracts/commitments for the sale of shares/disinvestment.</p>
          <p>There are no shares issued pursuant to contract without payment being received in cash or allotted as fully paid up bonus shares or shares bought back for the period of five years immediately preceding the date of these financial statements.</p>
        </CardContent>
      </Card>
    </div>
  );
}
