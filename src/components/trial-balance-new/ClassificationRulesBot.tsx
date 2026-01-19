import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BsplOptions } from '@/utils/bsplHeads';
import { ClassificationRule, RuleScope } from '@/utils/classificationRules';
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: ClassificationRule[];
  onSave: (rules: ClassificationRule[]) => void;
  bsplOptions: BsplOptions;
  defaultScope: RuleScope;
  groupOptions: string[];
  onAddGroup: (value: string, scope: RuleScope) => void;
}

const emptyDraft = {
  id: '',
  primaryGroupContains: '',
  parentGroupContains: '',
  ledgerNameContains: '',
  matchLedger: true,
  matchParent: true,
  matchPrimary: false,
  h1: '',
  h2: '',
  h3: '',
  scope: 'client' as RuleScope,
};

export function ClassificationRulesBot({
  open,
  onOpenChange,
  rules,
  onSave,
  bsplOptions,
  defaultScope,
  groupOptions,
  onAddGroup,
}: Props) {
  const [rows, setRows] = useState<ClassificationRule[]>(rules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<ClassificationRule>({
    ...emptyDraft,
    scope: defaultScope,
  });

  useEffect(() => {
    if (open) {
      setRows(rules);
      setEditingId(null);
      setDraft({ ...emptyDraft, scope: defaultScope });
    }
  }, [open, rules, defaultScope]);

  const h2Options = useMemo(() => {
    return bsplOptions.h2Options[draft.h1] || [];
  }, [bsplOptions.h2Options, draft.h1]);

  const h3Options = useMemo(() => {
    return (bsplOptions.h3Options[draft.h1] || {})[draft.h2] || [];
  }, [bsplOptions.h3Options, draft.h1, draft.h2]);

  const splitKeywords = (value?: string) => {
    return (value || '')
      .split(/[\n,;]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  };

  const buildRulesFromDraft = () => {
    if (!draft.h1.trim()) return null;
    const keywords = splitKeywords(draft.ledgerNameContains);
    const primaryValue = draft.primaryGroupContains?.trim() || '';
    const parentValue = draft.parentGroupContains?.trim() || '';
    const baseRule = {
      ...draft,
      primaryGroupContains: primaryValue,
      parentGroupContains: parentValue,
      ledgerNameContains: '',
      h1: draft.h1.trim(),
      h2: draft.h2.trim(),
      h3: draft.h3.trim(),
      matchLedger: Boolean(draft.matchLedger),
      matchParent: Boolean(draft.matchParent),
      matchPrimary: Boolean(draft.matchPrimary),
    } as ClassificationRule;

    if (keywords.length === 0) {
      return [{
        ...baseRule,
        id: editingId || `rule_${Date.now()}`,
        ledgerNameContains: '',
      }];
    }

    return keywords.map((keyword, index) => ({
      ...baseRule,
      id: `${editingId || `rule_${Date.now()}`}_${index}`,
      ledgerNameContains: keyword,
    }));
  };

  const handleApply = () => {
    const nextRules = buildRulesFromDraft();
    if (!nextRules) return;

    const nextRows = editingId
      ? [...rows.filter(item => item.id !== editingId), ...nextRules]
      : [...rows, ...nextRules];

    setRows(nextRows);
    onSave(nextRows);
    setEditingId(null);
    setDraft({ ...emptyDraft, scope: defaultScope });
  };

  const handleEdit = (rule: ClassificationRule) => {
    setEditingId(rule.id);
    setDraft({ ...rule });
  };

  const handleDelete = (id: string) => {
    const nextRows = rows.filter(rule => rule.id !== id);
    setRows(nextRows);
    onSave(nextRows);
  };

  const handleSave = () => {
    const nextRules = buildRulesFromDraft();
    const nextRows = nextRules
      ? (editingId
          ? [...rows.filter(item => item.id !== editingId), ...nextRules]
          : [...rows, ...nextRules])
      : rows;
    setRows(nextRows);
    onSave(nextRows);
    onOpenChange(false);
  };

  const handleExportRules = () => {
    const exportRows = rows.map(rule => ({
      Scope: rule.scope,
      'Ledger Contains': rule.ledgerNameContains || '',
      'Primary Contains': rule.primaryGroupContains || '',
      'Parent Contains': rule.parentGroupContains || '',
      'Match Ledger': rule.matchLedger ? 'Yes' : 'No',
      'Match Parent': rule.matchParent ? 'Yes' : 'No',
      'Match Primary': rule.matchPrimary ? 'Yes' : 'No',
      H1: rule.h1,
      H2: rule.h2,
      H3: rule.h3,
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rules');
    XLSX.writeFile(workbook, 'classification_rules.xlsx');
  };

  const handleImportRules = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet);

    const imported: ClassificationRule[] = jsonRows
      .map((row: any, index: number) => {
        const scopeValue = String(row.Scope || row.scope || defaultScope).toLowerCase();
        const scope: RuleScope = scopeValue === 'global' ? 'global' : 'client';
        const h1 = String(row.H1 || row.h1 || '').trim();
        const h2 = String(row.H2 || row.h2 || '').trim();
        const h3 = String(row.H3 || row.h3 || '').trim();
        if (!h1) return null;
        const matchLedger = String(row['Match Ledger'] || row.matchLedger || 'Yes').toLowerCase() === 'yes';
        const matchParent = String(row['Match Parent'] || row.matchParent || 'Yes').toLowerCase() === 'yes';
        const matchPrimary = String(row['Match Primary'] || row.matchPrimary || 'No').toLowerCase() === 'yes';
        return {
          id: `rule_${Date.now()}_${index}`,
          scope,
          ledgerNameContains: String(row['Ledger Contains'] || row.ledgerContains || row.ledger || '').trim(),
          primaryGroupContains: String(row['Primary Contains'] || row.primaryContains || row.primary || '').trim(),
          parentGroupContains: String(row['Parent Contains'] || row.parentContains || row.parent || '').trim(),
          matchLedger,
          matchParent,
          matchPrimary,
          h1,
          h2,
          h3,
        } as ClassificationRule;
      })
      .filter(Boolean) as ClassificationRule[];

    if (imported.length === 0) return;
    setRows(imported);
    onSave(imported);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Classification Rules Bot</DialogTitle>
          <DialogDescription>
            Define rules to auto-fill H1/H2/H3 based on Primary and Parent Groups.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-md p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select
                value={draft.scope}
                onValueChange={(value) => setDraft(prev => ({ ...prev, scope: value as RuleScope }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  <SelectItem value="client">This Client</SelectItem>
                  <SelectItem value="global">All Clients</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ledger Name Contains</Label>
              <Textarea
                value={draft.ledgerNameContains || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, ledgerNameContains: e.target.value }))}
                placeholder="One keyword per line (e.g. interest)"
                className="min-h-[72px]"
              />
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Match in:</span>
                <label className="flex items-center gap-1">
                  <Checkbox
                    checked={Boolean(draft.matchLedger)}
                    onCheckedChange={(value) => setDraft(prev => ({ ...prev, matchLedger: Boolean(value) }))}
                  />
                  Ledger
                </label>
                <label className="flex items-center gap-1">
                  <Checkbox
                    checked={Boolean(draft.matchParent)}
                    onCheckedChange={(value) => setDraft(prev => ({ ...prev, matchParent: Boolean(value) }))}
                  />
                  Parent
                </label>
                <label className="flex items-center gap-1">
                  <Checkbox
                    checked={Boolean(draft.matchPrimary)}
                    onCheckedChange={(value) => setDraft(prev => ({ ...prev, matchPrimary: Boolean(value) }))}
                  />
                  Primary
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Primary Group Contains</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={draft.primaryGroupContains || ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, primaryGroupContains: e.target.value }))}
                  list="tally-group-options"
                  placeholder="e.g. Sundry Debtors"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const value = window.prompt('Add Primary Group:', draft.primaryGroupContains || '');
                    if (value && value.trim()) {
                      onAddGroup(value.trim(), draft.scope);
                      setDraft(prev => ({ ...prev, primaryGroupContains: value.trim() }));
                    }
                  }}
                >
                  Add New
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Parent Group Contains</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={draft.parentGroupContains || ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, parentGroupContains: e.target.value }))}
                  list="tally-group-options"
                  placeholder="e.g. Current Assets"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const value = window.prompt('Add Parent Group:', draft.parentGroupContains || '');
                    if (value && value.trim()) {
                      onAddGroup(value.trim(), draft.scope);
                      setDraft(prev => ({ ...prev, parentGroupContains: value.trim() }));
                    }
                  }}
                >
                  Add New
                </Button>
              </div>
            </div>
          </div>

          <datalist id="tally-group-options">
            {groupOptions.map((group, index) => (
              <option key={`${group}-${index}`} value={group} />
            ))}
          </datalist>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>H1</Label>
              <Select
                value={draft.h1}
                onValueChange={(value) => {
                  setDraft(prev => ({ ...prev, h1: value, h2: '', h3: '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select H1" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  {bsplOptions.h1Options.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>H2</Label>
              <Select
                value={draft.h2}
                onValueChange={(value) => setDraft(prev => ({ ...prev, h2: value, h3: '' }))}
                disabled={!draft.h1}
              >
                <SelectTrigger>
                  <SelectValue placeholder={draft.h1 ? 'Select H2' : 'Select H1 first'} />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  {h2Options.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                  <SelectItem value="User_Defined">User_Defined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>H3</Label>
              <Select
                value={draft.h3}
                onValueChange={(value) => setDraft(prev => ({ ...prev, h3: value }))}
                disabled={!draft.h1 || !draft.h2}
              >
                <SelectTrigger>
                  <SelectValue placeholder={draft.h1 && draft.h2 ? 'Select H3' : 'Select H1 and H2 first'} />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  {h3Options.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                  <SelectItem value="User_Defined">User_Defined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleApply}>
              {editingId ? 'Update Rule' : 'Add Rule'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={() => setEditingId(null)}>
                Cancel Edit
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Saved Rules: {rows.length}</span>
          <div className="flex items-center gap-2">
            {rows.length === 0 && <span>Add a rule above to see it here.</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (rows.length === 0) return;
                if (!window.confirm('Delete all saved rules? This cannot be undone.')) return;
                setRows([]);
                onSave([]);
              }}
              disabled={rows.length === 0}
            >
              Delete All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportRules}>
              Export Rules
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Import Rules
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                handleImportRules(file);
                e.currentTarget.value = '';
              }}
            />
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Scope</TableHead>
                <TableHead className="w-32">Ledger Contains</TableHead>
                <TableHead className="w-44">Primary Contains</TableHead>
                <TableHead className="w-44">Parent Contains</TableHead>
                <TableHead className="w-24">Match In</TableHead>
                <TableHead className="w-20">H1</TableHead>
                <TableHead className="w-28">H2</TableHead>
                <TableHead className="w-32">H3</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                    No rules defined yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="text-xs">{rule.scope === 'global' ? 'All' : 'Client'}</TableCell>
                    <TableCell className="truncate" title={rule.ledgerNameContains || ''}>
                      {rule.ledgerNameContains || '-'}
                    </TableCell>
                    <TableCell className="truncate" title={rule.primaryGroupContains || ''}>
                      {rule.primaryGroupContains || '-'}
                    </TableCell>
                    <TableCell className="truncate" title={rule.parentGroupContains || ''}>
                      {rule.parentGroupContains || '-'}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {[rule.matchLedger ? 'L' : null, rule.matchParent ? 'P' : null, rule.matchPrimary ? 'Pr' : null]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </TableCell>
                    <TableCell className="text-xs">{rule.h1}</TableCell>
                    <TableCell className="text-xs">{rule.h2}</TableCell>
                    <TableCell className="text-xs">{rule.h3}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(rule.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave}>
            Save Rules
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
