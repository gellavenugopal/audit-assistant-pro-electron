import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  const handleApply = () => {
    if (!draft.h1.trim()) return;

    const rule: ClassificationRule = {
      ...draft,
      id: editingId || `rule_${Date.now()}`,
      primaryGroupContains: draft.primaryGroupContains?.trim() || '',
      parentGroupContains: draft.parentGroupContains?.trim() || '',
      ledgerNameContains: draft.ledgerNameContains?.trim() || '',
      h1: draft.h1.trim(),
      h2: draft.h2.trim(),
      h3: draft.h3.trim(),
    };

    setRows(prev => {
      if (editingId) {
        return prev.map(item => (item.id === editingId ? rule : item));
      }
      return [...prev, rule];
    });
    setEditingId(null);
    setDraft({ ...emptyDraft, scope: defaultScope });
  };

  const handleEdit = (rule: ClassificationRule) => {
    setEditingId(rule.id);
    setDraft({ ...rule });
  };

  const handleDelete = (id: string) => {
    setRows(prev => prev.filter(rule => rule.id !== id));
  };

  const handleSave = () => {
    onSave(rows);
    onOpenChange(false);
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
              <Input
                value={draft.ledgerNameContains || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, ledgerNameContains: e.target.value }))}
                placeholder="e.g. interest, rent"
              />
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
            {groupOptions.map(group => (
              <option key={group} value={group} />
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

        <div className="border rounded-md overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Scope</TableHead>
                <TableHead className="w-32">Ledger Contains</TableHead>
                <TableHead className="w-44">Primary Contains</TableHead>
                <TableHead className="w-44">Parent Contains</TableHead>
                <TableHead className="w-20">H1</TableHead>
                <TableHead className="w-28">H2</TableHead>
                <TableHead className="w-32">H3</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
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
