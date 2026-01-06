import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TrialBalanceLineInput } from '@/hooks/useTrialBalance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onUpdate: (data: Partial<TrialBalanceLineInput>) => Promise<boolean>;
}

const AILE_OPTIONS = ['Asset', 'Income', 'Liability', 'Expense'] as const;
const FS_AREAS = ['Cash', 'Receivables', 'Inventory', 'Fixed Assets', 'Payables', 'Borrowings', 'Equity', 'Revenue', 'Expenses', 'Finance', 'Disclosure', 'Investments', 'Other Non-Current', 'Other Current', 'Reserves', 'Deferred Tax', 'Other Long Term', 'Short Term Borrowings', 'Other Current Liabilities', 'Provisions', 'Other Income'];

export function BulkUpdateDialog({ open, onOpenChange, selectedCount, onUpdate }: Props) {
  const [updating, setUpdating] = useState(false);
  const [updateAile, setUpdateAile] = useState(false);
  const [updateFsArea, setUpdateFsArea] = useState(false);
  const [updateNote, setUpdateNote] = useState(false);
  const [aile, setAile] = useState<string>('');
  const [fsArea, setFsArea] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    const updates: Partial<TrialBalanceLineInput> = {};
    if (updateAile && aile) updates.aile = aile;
    if (updateFsArea && fsArea) updates.fs_area = fsArea;
    if (updateNote) updates.note = note || null;
    
    if (Object.keys(updates).length === 0) {
      setUpdating(false);
      return;
    }
    
    const success = await onUpdate(updates);
    setUpdating(false);
    
    if (success) {
      resetState();
      onOpenChange(false);
    }
  };

  const resetState = () => {
    setUpdateAile(false);
    setUpdateFsArea(false);
    setUpdateNote(false);
    setAile('');
    setFsArea('');
    setNote('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Update {selectedCount} Items</DialogTitle>
          <DialogDescription>
            Select which fields to update for all selected trial balance lines.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AILE */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_aile"
                checked={updateAile}
                onCheckedChange={(checked) => setUpdateAile(checked === true)}
              />
              <Label htmlFor="update_aile">Update AILE</Label>
            </div>
            {updateAile && (
              <Select value={aile} onValueChange={setAile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AILE" />
                </SelectTrigger>
                <SelectContent>
                  {AILE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* FS Area */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_fs_area"
                checked={updateFsArea}
                onCheckedChange={(checked) => setUpdateFsArea(checked === true)}
              />
              <Label htmlFor="update_fs_area">Update FS Area</Label>
            </div>
            {updateFsArea && (
              <Select value={fsArea} onValueChange={setFsArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select FS Area" />
                </SelectTrigger>
                <SelectContent>
                  {FS_AREAS.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_note"
                checked={updateNote}
                onCheckedChange={(checked) => setUpdateNote(checked === true)}
              />
              <Label htmlFor="update_note">Update Note No.</Label>
            </div>
            {updateNote && (
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Note 12"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updating || (!updateAile && !updateFsArea && !updateNote)}
            >
              {updating ? 'Updating...' : 'Update All'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
