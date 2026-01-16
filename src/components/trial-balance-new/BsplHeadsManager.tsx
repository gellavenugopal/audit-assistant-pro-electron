import { useEffect, useRef, useState } from 'react';
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
import * as XLSX from 'xlsx';
import { BsplHeadRow } from '@/utils/bsplHeads';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heads: BsplHeadRow[];
  defaultHeads: BsplHeadRow[];
  onSave: (rows: BsplHeadRow[]) => void;
  onRestore: (rows: BsplHeadRow[]) => void;
}

const emptyDraft: BsplHeadRow = {
  H1: '',
  H2: '',
  H3: '',
  Condition: '',
};

export function BsplHeadsManager({ open, onOpenChange, heads, defaultHeads, onSave, onRestore }: Props) {
  const [rows, setRows] = useState<BsplHeadRow[]>(heads);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<BsplHeadRow>(emptyDraft);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setRows(heads);
      setEditingIndex(null);
      setDraft(emptyDraft);
    }
  }, [open, heads]);

  const startAdd = () => {
    setEditingIndex(null);
    setDraft(emptyDraft);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setDraft({
      H1: rows[index].H1,
      H2: rows[index].H2,
      H3: rows[index].H3,
      Condition: rows[index].Condition || '',
    });
  };

  const applyDraft = () => {
    if (!draft.H1.trim() || !draft.H2.trim() || !draft.H3.trim()) return;

    const cleaned: BsplHeadRow = {
      H1: draft.H1.trim(),
      H2: draft.H2.trim(),
      H3: draft.H3.trim(),
      Condition: draft.Condition?.trim() || undefined,
    };

    setRows(prev => {
      if (editingIndex === null) {
        return [...prev, cleaned];
      }
      return prev.map((row, idx) => (idx === editingIndex ? cleaned : row));
    });
    setEditingIndex(null);
    setDraft(emptyDraft);
  };

  const deleteRow = (index: number) => {
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BSPL_Heads');
    XLSX.writeFile(workbook, 'BSPL_Heads.xlsx');
  };

  const handleImport = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    const imported = json.map((row: any) => {
      const h1 = (row.H1 || row.h1 || '').toString().trim();
      const h2 = (row.H2 || row.h2 || '').toString().trim();
      const h3 = (row.H3 || row.h3 || '').toString().trim();
      const condition = (row.Condition || row.condition || '').toString().trim();
      if (!h1 || !h2 || !h3) return null;
      return {
        H1: h1,
        H2: h2,
        H3: h3,
        Condition: condition || undefined,
      } as BsplHeadRow;
    }).filter(Boolean) as BsplHeadRow[];

    if (imported.length > 0) {
      setRows(imported);
    }
  };

  const handleSave = () => {
    onSave(rows);
    onOpenChange(false);
  };

  const handleRestoreDefaults = () => {
    if (!window.confirm('Restore default BSPL heads? This will replace your current list.')) {
      return;
    }
    setRows(defaultHeads);
    onRestore(defaultHeads);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage BSPL Heads (H1 / H2 / H3)</DialogTitle>
          <DialogDescription>
            Add, edit, or import/export BSPL head mappings during development.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={startAdd}>
            Add Row
          </Button>
          <Button variant="outline" onClick={handleRestoreDefaults}>
            Restore Defaults
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Export to Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Import from Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.currentTarget.value = '';
            }}
          />
          <div className="ml-auto text-xs text-muted-foreground">
            {rows.length} rows
          </div>
        </div>

        <div className="border rounded-md p-3 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>H1</Label>
              <Input
                value={draft.H1}
                onChange={(e) => setDraft(prev => ({ ...prev, H1: e.target.value }))}
                placeholder="Assets / Liabilities / Income"
              />
            </div>
            <div className="space-y-1">
              <Label>H2</Label>
              <Input
                value={draft.H2}
                onChange={(e) => setDraft(prev => ({ ...prev, H2: e.target.value }))}
                placeholder="Share Capital / Reserves"
              />
            </div>
            <div className="space-y-1">
              <Label>H3</Label>
              <Input
                value={draft.H3}
                onChange={(e) => setDraft(prev => ({ ...prev, H3: e.target.value }))}
                placeholder="Equity - fully paid up"
              />
            </div>
            <div className="space-y-1">
              <Label>Condition</Label>
              <Input
                value={draft.Condition || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, Condition: e.target.value }))}
                placeholder="Optional applicability"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={applyDraft}>
              {editingIndex === null ? 'Add' : 'Update'}
            </Button>
            {editingIndex !== null && (
              <Button variant="ghost" onClick={startAdd}>
                Cancel Edit
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">H1</TableHead>
                <TableHead className="w-44">H2</TableHead>
                <TableHead className="w-60">H3</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No rows available. Import or add a row to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={`${row.H1}-${row.H2}-${row.H3}-${index}`}>
                    <TableCell className="truncate" title={row.H1}>{row.H1}</TableCell>
                    <TableCell className="truncate" title={row.H2}>{row.H2}</TableCell>
                    <TableCell className="truncate" title={row.H3}>{row.H3}</TableCell>
                    <TableCell className="text-xs truncate" title={row.Condition || ''}>
                      {row.Condition || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(index)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteRow(index)}>
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
            Save Heads
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
