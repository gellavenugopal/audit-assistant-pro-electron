import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Info } from 'lucide-react';
import { ScheduleIIIConfig } from '@/hooks/useScheduleIIIConfig';
import { buildNoteNumberMap } from '@/data/scheduleIIICodeStructure';

interface ScheduleIIIConfigPanelProps {
  config: ScheduleIIIConfig;
  onUpdate: (updates: Partial<Pick<ScheduleIIIConfig, 'startNoteNumber' | 'includeContingentLiabilities'>>) => Promise<boolean>;
}

export function ScheduleIIIConfigPanel({ config, onUpdate }: ScheduleIIIConfigPanelProps) {
  const [startNoteNumber, setStartNoteNumber] = useState(config.startNoteNumber);
  const [includeContingentLiabilities, setIncludeContingentLiabilities] = useState(config.includeContingentLiabilities);
  const [saving, setSaving] = useState(false);

  const hasChanges = startNoteNumber !== config.startNoteNumber || 
                     includeContingentLiabilities !== config.includeContingentLiabilities;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ startNoteNumber, includeContingentLiabilities });
    setSaving(false);
  };

  // Calculate note allocation preview
  const noteMap = buildNoteNumberMap(startNoteNumber, includeContingentLiabilities);
  const bsNotes = Array.from(noteMap.entries())
    .filter(([code]) => code.startsWith('EL-') || code.startsWith('AS-'))
    .sort((a, b) => a[1] - b[1]);
  const clNote = noteMap.get('CL');
  const plNotes = Array.from(noteMap.entries())
    .filter(([code]) => code.startsWith('INC-') || code.startsWith('EXP-'))
    .sort((a, b) => a[1] - b[1]);

  const bsRange = bsNotes.length > 0 
    ? `${bsNotes[0][1]} - ${bsNotes[bsNotes.length - 1][1]}` 
    : '-';
  const plRange = plNotes.length > 0 
    ? `${plNotes[0][1]} - ${plNotes[plNotes.length - 1][1]}` 
    : '-';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Note Number Configuration
          </CardTitle>
          <CardDescription>
            Configure how note numbers are assigned to Schedule III line items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startNoteNumber">Starting Note Number</Label>
                <Input
                  id="startNoteNumber"
                  type="number"
                  min={1}
                  max={100}
                  value={startNoteNumber}
                  onChange={e => setStartNoteNumber(Number(e.target.value) || 1)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  The first note number for Balance Sheet items
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="includeContingent">Include Contingent Liabilities</Label>
                  <p className="text-xs text-muted-foreground">
                    Add a note for contingent liabilities between BS and P&L
                  </p>
                </div>
                <Switch
                  id="includeContingent"
                  checked={includeContingentLiabilities}
                  onCheckedChange={setIncludeContingentLiabilities}
                />
              </div>

              {hasChanges && (
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Note Allocation Preview
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Balance Sheet Notes:</span>
                    <Badge variant="outline">{bsRange}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">
                    {bsNotes.length} notes for equity, liabilities, and assets
                  </p>
                </div>

                {includeContingentLiabilities && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Contingent Liabilities:</span>
                      <Badge variant="outline">{clNote || '-'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground pl-4">
                      Contingent liabilities and commitments
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Profit & Loss Notes:</span>
                    <Badge variant="outline">{plRange}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">
                    {plNotes.length} notes for income and expenses
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-sm">Total Notes:</span>
                    <Badge>{bsNotes.length + (includeContingentLiabilities ? 1 : 0) + plNotes.length}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule III Structure</CardTitle>
          <CardDescription>
            Overview of the financial statement hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Balance Sheet (Part I)</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>• Equity and Liabilities</p>
                <p className="pl-4">- Shareholders' Funds (Share Capital, Reserves)</p>
                <p className="pl-4">- Non-Current Liabilities (Borrowings, Provisions)</p>
                <p className="pl-4">- Current Liabilities (Trade Payables, Other)</p>
                <p>• Assets</p>
                <p className="pl-4">- Non-Current Assets (PPE, Investments, Loans)</p>
                <p className="pl-4">- Current Assets (Inventory, Receivables, Cash)</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Statement of Profit and Loss (Part II)</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>• Income</p>
                <p className="pl-4">- Revenue from Operations</p>
                <p className="pl-4">- Other Income</p>
                <p>• Expenses</p>
                <p className="pl-4">- Cost of Materials Consumed</p>
                <p className="pl-4">- Employee Benefits Expense</p>
                <p className="pl-4">- Finance Costs</p>
                <p className="pl-4">- Depreciation and Amortisation</p>
                <p className="pl-4">- Other Expenses</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
