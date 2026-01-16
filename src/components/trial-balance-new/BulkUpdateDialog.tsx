import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { BsplOptions } from '@/utils/bsplHeads';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: LedgerRow[];
  onUpdate: (updates: Partial<LedgerRow>) => void;
  bsplOptions: BsplOptions;
}

export function BulkUpdateDialog({ open, onOpenChange, selectedRows, onUpdate, bsplOptions }: Props) {
  const [updateParentGroup, setUpdateParentGroup] = useState(false);
  const [updatePrimaryGroup, setUpdatePrimaryGroup] = useState(false);
  const [updateIsRevenue, setUpdateIsRevenue] = useState(false);
  const [updateH1, setUpdateH1] = useState(false);
  const [updateH2, setUpdateH2] = useState(false);
  const [updateH3, setUpdateH3] = useState(false);
  
  const [parentGroup, setParentGroup] = useState<string>('');
  const [primaryGroup, setPrimaryGroup] = useState<string>('');
  const [isRevenue, setIsRevenue] = useState<string>('');
  const [h1, setH1] = useState<string>('');
  const [h2, setH2] = useState<string>('');
  const [h3, setH3] = useState<string>('');

  const handleToggleKey = (e: React.KeyboardEvent, toggle: (next: boolean) => void, current: boolean) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle(!current);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: Partial<LedgerRow> = {};
    if (updateParentGroup && parentGroup) updates['Parent Group'] = parentGroup;
    if (updatePrimaryGroup && primaryGroup) updates['Primary Group'] = primaryGroup;
    if (updateIsRevenue && isRevenue) updates['Is Revenue'] = isRevenue;
    if (updateH1 && h1) updates['H1'] = h1;
    if (updateH2 && h2) updates['H2'] = h2;
    if (updateH3 && h3) updates['H3'] = h3;
    
    if (Object.keys(updates).length === 0) {
      return;
    }
    
    onUpdate(updates);
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setUpdateParentGroup(false);
    setUpdatePrimaryGroup(false);
    setUpdateIsRevenue(false);
    setUpdateH1(false);
    setUpdateH2(false);
    setUpdateH3(false);
    setParentGroup('');
    setPrimaryGroup('');
    setIsRevenue('');
    setH1('');
    setH2('');
    setH3('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update {selectedRows.length} Items</DialogTitle>
          <DialogDescription>
            Select which fields to update for all selected ledgers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Group */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_parent_group"
                checked={updateParentGroup}
                onCheckedChange={(checked) => setUpdateParentGroup(checked === true)}
              />
              <Label
                htmlFor="update_parent_group"
                tabIndex={0}
                role="button"
                className="cursor-pointer"
                onKeyDown={(e) => handleToggleKey(e, setUpdateParentGroup, updateParentGroup)}
              >
                Update Parent Group
              </Label>
            </div>
            {updateParentGroup && (
              <input
                type="text"
                value={parentGroup}
                onChange={(e) => setParentGroup(e.target.value)}
                placeholder="Enter parent group"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </div>

          {/* Primary Group */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_primary_group"
                checked={updatePrimaryGroup}
                onCheckedChange={(checked) => setUpdatePrimaryGroup(checked === true)}
              />
              <Label
                htmlFor="update_primary_group"
                tabIndex={0}
                role="button"
                className="cursor-pointer"
                onKeyDown={(e) => handleToggleKey(e, setUpdatePrimaryGroup, updatePrimaryGroup)}
              >
                Update Primary Group
              </Label>
            </div>
            {updatePrimaryGroup && (
              <input
                type="text"
                value={primaryGroup}
                onChange={(e) => setPrimaryGroup(e.target.value)}
                placeholder="Enter primary group"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </div>

          {/* Is Revenue */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_is_revenue"
                checked={updateIsRevenue}
                onCheckedChange={(checked) => setUpdateIsRevenue(checked === true)}
              />
              <Label
                htmlFor="update_is_revenue"
                tabIndex={0}
                role="button"
                className="cursor-pointer"
                onKeyDown={(e) => handleToggleKey(e, setUpdateIsRevenue, updateIsRevenue)}
              >
                Update Is Revenue
              </Label>
            </div>
            {updateIsRevenue && (
              <Select value={isRevenue} onValueChange={setIsRevenue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* H1 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h1"
                checked={updateH1}
                onCheckedChange={(checked) => setUpdateH1(checked === true)}
              />
              <Label
                htmlFor="update_h1"
                tabIndex={0}
                role="button"
                className="cursor-pointer"
                onKeyDown={(e) => handleToggleKey(e, setUpdateH1, updateH1)}
              >
                Update H1
              </Label>
            </div>
            {updateH1 && (
              <Select
                value={h1}
                onValueChange={(value) => {
                  setH1(value);
                  setH2('');
                  setH3('');
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
            )}
          </div>

          {/* H2 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h2"
                checked={updateH2}
                onCheckedChange={(checked) => setUpdateH2(checked === true)}
              />
              <Label
                htmlFor="update_h2"
                tabIndex={0}
                role="button"
                className="cursor-pointer"
                onKeyDown={(e) => handleToggleKey(e, setUpdateH2, updateH2)}
              >
                Update H2
              </Label>
            </div>
            {updateH2 && (
              <Select
                value={h2}
                onValueChange={(value) => {
                  setH2(value);
                  setH3('');
                }}
                disabled={!h1}
              >
                <SelectTrigger>
                  <SelectValue placeholder={h1 ? 'Select H2' : 'Select H1 first'} />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  {(bsplOptions.h2Options[h1] || []).map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* H3 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_h3"
                checked={updateH3}
                onCheckedChange={(checked) => setUpdateH3(checked === true)}
              />
              <Label
                htmlFor="update_h3"
                tabIndex={0}
                role="button"
                className="cursor-pointer"
                onKeyDown={(e) => handleToggleKey(e, setUpdateH3, updateH3)}
              >
                Update H3
              </Label>
            </div>
            {updateH3 && (
              <Select
                value={h3}
                onValueChange={setH3}
                disabled={!h1 || !h2}
              >
                <SelectTrigger>
                  <SelectValue placeholder={h1 && h2 ? 'Select H3' : 'Select H1 and H2 first'} />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  {((bsplOptions.h3Options[h1] || {})[h2] || []).map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!updateParentGroup && !updatePrimaryGroup && !updateIsRevenue && !updateH1 && !updateH2 && !updateH3}
            >
              Update {selectedRows.length} Items
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

