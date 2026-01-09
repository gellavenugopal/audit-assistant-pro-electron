import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Hash } from 'lucide-react';

interface NoteNumberSettingsProps {
  startingNoteNumber: number;
  onStartingNoteNumberChange: (value: number) => void;
}

export function NoteNumberSettings({ 
  startingNoteNumber, 
  onStartingNoteNumberChange 
}: NoteNumberSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(startingNoteNumber.toString());

  const handleSave = () => {
    const num = parseInt(tempValue, 10);
    if (!isNaN(num) && num >= 1) {
      onStartingNoteNumberChange(num);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Hash className="h-4 w-4" />
          Note No. Start: {startingNoteNumber}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Note Number Settings</DialogTitle>
          <DialogDescription>
            Set the starting note number for financial statement line items.
            Note numbers are generated sequentially only for items that have values.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startingNote" className="text-right">
              Start From
            </Label>
            <Input
              id="startingNote"
              type="number"
              min={1}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="col-span-3"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Note: Items without values in either current or previous year will be skipped
            and will not receive a note number.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
