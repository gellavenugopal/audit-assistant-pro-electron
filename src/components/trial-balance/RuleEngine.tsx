import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Trash2, Pencil, Upload, Download, RotateCcw, Copy, 
  Wand2, Settings2, FileText, PlayCircle, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  useAileMappingRules, 
  AileMappingRule, 
  AileMappingRuleInput,
  DEFAULT_MAPPING_RULES 
} from '@/hooks/useAileMappingRules';
import { TrialBalanceLine, TrialBalanceLineInput } from '@/hooks/useTrialBalance';

interface RuleEngineProps {
  lines: TrialBalanceLine[];
  onUpdateLines: (ids: string[], data: Partial<TrialBalanceLineInput>) => Promise<boolean>;
  reportingScale: string;
}

const AILE_OPTIONS = ['Asset', 'Income', 'Liability', 'Expense'];
const FS_AREA_OPTIONS = [
  // Assets
  'Fixed Assets', 'Investments', 'Other Non-Current', 'Inventory', 'Receivables', 'Cash', 'Other Current',
  // Liabilities
  'Equity', 'Reserves', 'Borrowings', 'Short Term Borrowings', 'Payables', 'Other Current Liabilities', 'Provisions', 'Deferred Tax', 'Other Long Term',
  // Income
  'Revenue', 'Other Income',
  // Expenses
  'Cost of Materials', 'Employee Benefits', 'Finance', 'Depreciation', 'Other Expenses',
];

const MATCH_FIELD_OPTIONS = [
  { value: 'ledger_primary_group', label: 'Ledger Primary Group' },
  { value: 'ledger_parent', label: 'Ledger Parent' },
  { value: 'account_name', label: 'Account Name' },
  { value: 'account_code', label: 'Account Code' },
];

const MATCH_TYPE_OPTIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'regex', label: 'Regex' },
];

export function RuleEngine({ lines, onUpdateLines, reportingScale }: RuleEngineProps) {
  const { toast } = useToast();
  const {
    ruleSets,
    rules,
    activeRuleSetId,
    loading,
    selectRuleSet,
    createRuleSet,
    createDefaultRuleSet,
    duplicateRuleSet,
    deleteRuleSet,
    addRule,
    updateRule,
    deleteRule,
    importRulesFromData,
    resetToDefault,
  } = useAileMappingRules();

  const [activeTab, setActiveTab] = useState('preview');
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isRuleSetDialogOpen, setIsRuleSetDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<AileMappingRule | null>(null);
  const [deleteConfirmRuleSet, setDeleteConfirmRuleSet] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AileMappingRule | null>(null);
  const [applyingRules, setApplyingRules] = useState(false);

  const [newRuleSetName, setNewRuleSetName] = useState('');
  const [newRuleSetDescription, setNewRuleSetDescription] = useState('');
  const [duplicateRuleSetName, setDuplicateRuleSetName] = useState('');

  const [ruleForm, setRuleForm] = useState({
    priority: 50,
    match_field: 'ledger_primary_group',
    match_pattern: '',
    match_type: 'contains',
    target_aile: 'Asset',
    target_fs_area: 'Fixed Assets',
  });

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

  // Apply rules to lines and compute preview
  const previewMapping = useMemo(() => {
    if (!rules.length) return lines.map(l => ({ ...l, proposed_aile: null, proposed_fs_area: null, matched_rule: null }));

    return lines.map(line => {
      // Find first matching rule
      for (const rule of rules.filter(r => r.is_active)) {
        const fieldValue = line[rule.match_field as keyof TrialBalanceLine] as string || '';
        let matches = false;

        switch (rule.match_type) {
          case 'contains':
            matches = fieldValue.toLowerCase().includes(rule.match_pattern.toLowerCase());
            break;
          case 'starts_with':
            matches = fieldValue.toLowerCase().startsWith(rule.match_pattern.toLowerCase());
            break;
          case 'ends_with':
            matches = fieldValue.toLowerCase().endsWith(rule.match_pattern.toLowerCase());
            break;
          case 'exact':
            matches = fieldValue.toLowerCase() === rule.match_pattern.toLowerCase();
            break;
          case 'regex':
            try {
              matches = new RegExp(rule.match_pattern, 'i').test(fieldValue);
            } catch {
              matches = false;
            }
            break;
        }

        if (matches) {
          return {
            ...line,
            proposed_aile: rule.target_aile,
            proposed_fs_area: rule.target_fs_area,
            matched_rule: rule,
          };
        }
      }

      return { ...line, proposed_aile: null, proposed_fs_area: null, matched_rule: null };
    });
  }, [lines, rules]);

  const mappingSummary = useMemo(() => {
    const mapped = previewMapping.filter(l => l.proposed_aile);
    const unmapped = previewMapping.filter(l => !l.proposed_aile && !l.aile);
    const alreadyMapped = previewMapping.filter(l => l.aile && !l.proposed_aile);
    const willChange = previewMapping.filter(l => l.proposed_aile && (l.aile !== l.proposed_aile || l.fs_area !== l.proposed_fs_area));

    return { mapped: mapped.length, unmapped: unmapped.length, alreadyMapped: alreadyMapped.length, willChange: willChange.length };
  }, [previewMapping]);

  const handleCreateRuleSet = async () => {
    if (!newRuleSetName.trim()) return;
    await createRuleSet(newRuleSetName.trim(), newRuleSetDescription.trim() || undefined);
    setNewRuleSetName('');
    setNewRuleSetDescription('');
    setIsRuleSetDialogOpen(false);
  };

  const handleDuplicateRuleSet = async () => {
    if (!activeRuleSetId || !duplicateRuleSetName.trim()) return;
    await duplicateRuleSet(activeRuleSetId, duplicateRuleSetName.trim());
    setDuplicateRuleSetName('');
    setIsDuplicateDialogOpen(false);
  };

  const handleSaveRule = async () => {
    if (!activeRuleSetId || !ruleForm.match_pattern.trim()) return;

    if (editingRule) {
      await updateRule(editingRule.id, ruleForm);
    } else {
      await addRule({ ...ruleForm, rule_set_id: activeRuleSetId });
    }

    setIsRuleDialogOpen(false);
    setEditingRule(null);
    setRuleForm({
      priority: 50,
      match_field: 'ledger_primary_group',
      match_pattern: '',
      match_type: 'contains',
      target_aile: 'Asset',
      target_fs_area: 'Fixed Assets',
    });
  };

  const handleEditRule = (rule: AileMappingRule) => {
    setEditingRule(rule);
    setRuleForm({
      priority: rule.priority,
      match_field: rule.match_field,
      match_pattern: rule.match_pattern,
      match_type: rule.match_type,
      target_aile: rule.target_aile,
      target_fs_area: rule.target_fs_area,
    });
    setIsRuleDialogOpen(true);
  };

  const handleApplyRules = async () => {
    setApplyingRules(true);
    try {
      // Group lines by proposed AILE + FS Area
      const updates: Record<string, { ids: string[]; aile: string; fs_area: string }> = {};
      
      for (const line of previewMapping) {
        if (line.proposed_aile && line.proposed_fs_area) {
          const key = `${line.proposed_aile}|${line.proposed_fs_area}`;
          if (!updates[key]) {
            updates[key] = { ids: [], aile: line.proposed_aile, fs_area: line.proposed_fs_area };
          }
          updates[key].ids.push(line.id);
        }
      }

      let successCount = 0;
      for (const update of Object.values(updates)) {
        const success = await onUpdateLines(update.ids, { aile: update.aile, fs_area: update.fs_area });
        if (success) successCount += update.ids.length;
      }

      toast({
        title: 'Rules applied',
        description: `Updated AILE/FS Area for ${successCount} ledgers.`,
      });
    } catch (error) {
      toast({
        title: 'Error applying rules',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setApplyingRules(false);
    }
  };

  const handleExportRules = () => {
    if (!rules.length) return;

    const exportData = rules.map(rule => ({
      Priority: rule.priority,
      'Match Field': rule.match_field,
      'Match Pattern': rule.match_pattern,
      'Match Type': rule.match_type,
      'Target AILE': rule.target_aile,
      'Target FS Area': rule.target_fs_area,
      Active: rule.is_active ? 'Yes' : 'No',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rules');
    XLSX.writeFile(workbook, `AILE_Rules_${activeRuleSetId?.substring(0, 8)}.xlsx`);
  };

  const handleImportRules = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRuleSetId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const rulesData = jsonData.map((row: any) => ({
          priority: Number(row['Priority']) || 50,
          match_field: row['Match Field'] || 'ledger_primary_group',
          match_pattern: row['Match Pattern'] || '',
          match_type: row['Match Type'] || 'contains',
          target_aile: row['Target AILE'] || 'Asset',
          target_fs_area: row['Target FS Area'] || 'Fixed Assets',
          is_active: row['Active']?.toLowerCase() !== 'no',
        })).filter((r: any) => r.match_pattern);

        await importRulesFromData(activeRuleSetId, rulesData);
      } catch (error) {
        toast({
          title: 'Import failed',
          description: error instanceof Error ? error.message : 'Failed to parse file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const getAileColor = (aile: string | null) => {
    switch (aile) {
      case 'Asset': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Income': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Liability': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Expense': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Show prompt to create default rules if no rule sets exist
  if (ruleSets.length === 0) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader className="text-center">
          <Wand2 className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>No Rule Sets Found</CardTitle>
          <CardDescription>
            Create a default rule set to automatically map ledgers to AILE (Asset/Income/Liability/Expense) and FS Area classifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => createDefaultRuleSet()} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Create Schedule III Rules
          </Button>
          <Button variant="outline" onClick={() => setIsRuleSetDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Empty Rule Set
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={activeRuleSetId || ''} onValueChange={selectRuleSet}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select rule set" />
            </SelectTrigger>
            <SelectContent>
              {ruleSets.map(set => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name} {set.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setIsRuleSetDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsDuplicateDialogOpen(true)} disabled={!activeRuleSetId}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportRules} className="gap-2" disabled={!rules.length}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <label>
            <Button variant="outline" className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Import
              </span>
            </Button>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportRules} />
          </label>
          <Button 
            variant="outline" 
            onClick={() => activeRuleSetId && resetToDefault(activeRuleSetId)} 
            className="gap-2"
            disabled={!activeRuleSetId}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Rules Active</p>
            <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Will be Mapped</p>
            <p className="text-2xl font-bold text-success">{mappingSummary.mapped}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Unmapped</p>
            <p className="text-2xl font-bold text-warning">{mappingSummary.unmapped}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Will Change</p>
            <p className="text-2xl font-bold text-primary">{mappingSummary.willChange}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview" className="gap-2">
            <FileText className="h-4 w-4" />
            Preview Mapping
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Edit Rules
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Preview how rules will map your ledgers. Click "Apply Rules" to update the Trial Balance.
            </p>
            <Button onClick={handleApplyRules} disabled={applyingRules || !mappingSummary.mapped} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              {applyingRules ? 'Applying...' : 'Apply Rules'}
            </Button>
          </div>

          <div className="audit-card p-0 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Primary Group</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead>Current AILE</TableHead>
                    <TableHead>Current FS Area</TableHead>
                    <TableHead>→ Proposed AILE</TableHead>
                    <TableHead>→ Proposed FS Area</TableHead>
                    <TableHead>Matched Rule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewMapping.map(line => (
                    <TableRow key={line.id} className={cn(
                      line.proposed_aile && (line.aile !== line.proposed_aile || line.fs_area !== line.proposed_fs_area) && 'bg-primary/5'
                    )}>
                      <TableCell className="font-medium">{line.account_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.ledger_primary_group || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(line.closing_balance))}</TableCell>
                      <TableCell>
                        {line.aile ? (
                          <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", getAileColor(line.aile))}>
                            {line.aile}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{line.fs_area || '-'}</TableCell>
                      <TableCell>
                        {line.proposed_aile ? (
                          <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                            getAileColor(line.proposed_aile),
                            line.aile !== line.proposed_aile && 'ring-2 ring-primary'
                          )}>
                            {line.proposed_aile}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-sm",
                        line.fs_area !== line.proposed_fs_area && line.proposed_fs_area && 'font-medium text-primary'
                      )}>
                        {line.proposed_fs_area || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {line.matched_rule ? `${line.matched_rule.match_pattern} (P${line.matched_rule.priority})` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Rules are applied in priority order (highest first). First matching rule wins.
            </p>
            <Button onClick={() => setIsRuleDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>

          <div className="audit-card p-0 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Priority</TableHead>
                    <TableHead>Match Field</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>Target AILE</TableHead>
                    <TableHead>Target FS Area</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id} className={cn(!rule.is_active && 'opacity-50')}>
                      <TableCell className="font-mono font-bold">{rule.priority}</TableCell>
                      <TableCell className="text-sm">{MATCH_FIELD_OPTIONS.find(o => o.value === rule.match_field)?.label}</TableCell>
                      <TableCell className="font-mono text-sm">{rule.match_pattern}</TableCell>
                      <TableCell className="text-sm">{MATCH_TYPE_OPTIONS.find(o => o.value === rule.match_type)?.label}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", getAileColor(rule.target_aile))}>
                          {rule.target_aile}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{rule.target_fs_area}</TableCell>
                      <TableCell>
                        {rule.is_active ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditRule(rule)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirmRule(rule)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Rule'}</DialogTitle>
            <DialogDescription>
              Define a pattern to match ledgers and assign AILE/FS Area classifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority (Higher = First)</Label>
                <Input 
                  type="number" 
                  value={ruleForm.priority} 
                  onChange={e => setRuleForm(p => ({ ...p, priority: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Match Type</Label>
                <Select value={ruleForm.match_type} onValueChange={v => setRuleForm(p => ({ ...p, match_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Match Field</Label>
              <Select value={ruleForm.match_field} onValueChange={v => setRuleForm(p => ({ ...p, match_field: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATCH_FIELD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Match Pattern</Label>
              <Input 
                value={ruleForm.match_pattern} 
                onChange={e => setRuleForm(p => ({ ...p, match_pattern: e.target.value }))}
                placeholder="e.g., Fixed Assets, Bank Accounts"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target AILE</Label>
                <Select value={ruleForm.target_aile} onValueChange={v => setRuleForm(p => ({ ...p, target_aile: v }))}>
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
                <Label>Target FS Area</Label>
                <Select value={ruleForm.target_fs_area} onValueChange={v => setRuleForm(p => ({ ...p, target_fs_area: v }))}>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule}>{editingRule ? 'Save Changes' : 'Add Rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Rule Set Dialog */}
      <Dialog open={isRuleSetDialogOpen} onOpenChange={setIsRuleSetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Rule Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newRuleSetName} onChange={e => setNewRuleSetName(e.target.value)} placeholder="My Custom Rules" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={newRuleSetDescription} onChange={e => setNewRuleSetDescription(e.target.value)} placeholder="Description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleSetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRuleSet} disabled={!newRuleSetName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Rule Set Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Rule Set</DialogTitle>
            <DialogDescription>Create a copy of the current rule set with a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Name</Label>
              <Input value={duplicateRuleSetName} onChange={e => setDuplicateRuleSetName(e.target.value)} placeholder="My Custom Rules Copy" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDuplicateRuleSet} disabled={!duplicateRuleSetName.trim()}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation */}
      <AlertDialog open={!!deleteConfirmRule} onOpenChange={() => setDeleteConfirmRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { 
                if (deleteConfirmRule) deleteRule(deleteConfirmRule.id); 
                setDeleteConfirmRule(null); 
              }} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
