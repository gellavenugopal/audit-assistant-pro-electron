import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Hash, AlertCircle, Info } from 'lucide-react';

interface EnhancedNoteNumberSettingsProps {
  onApplySettings: (startingNote: number, bsNotes: number, plNotes: number, includeContingent: boolean) => void;
  bsStartingNote: number;
  plStartingNote: number;
  includeContingentLiabilities?: boolean;
}

export function EnhancedNoteNumberSettings({
  onApplySettings,
  bsStartingNote,
  plStartingNote,
  includeContingentLiabilities = false,
}: EnhancedNoteNumberSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startingNote, setStartingNote] = useState(bsStartingNote.toString());
  const [bsNoteCount, setBsNoteCount] = useState('15'); // Default BS notes
  const [plNoteCount, setPlNoteCount] = useState('7'); // Default P&L notes
  const [includeContingent, setIncludeContingent] = useState(includeContingentLiabilities);
  const [calculatedNotes, setCalculatedNotes] = useState({
    bsStart: bsStartingNote,
    bsEnd: bsStartingNote + 14,
    plStart: bsStartingNote + 15,
    plEnd: bsStartingNote + 21,
    contingentNote: bsStartingNote + 22,
  });

  useEffect(() => {
    const start = parseInt(startingNote, 10) || 1;
    const bsCount = parseInt(bsNoteCount, 10) || 0;
    const plCount = parseInt(plNoteCount, 10) || 0;

    setCalculatedNotes({
      bsStart: start,
      bsEnd: start + bsCount - 1,
      plStart: start + bsCount,
      plEnd: start + bsCount + plCount - 1,
      contingentNote: start + bsCount + plCount,
    });
  }, [startingNote, bsNoteCount, plNoteCount]);

  const handleApply = () => {
    const start = parseInt(startingNote, 10);
    const bsCount = parseInt(bsNoteCount, 10);
    const plCount = parseInt(plNoteCount, 10);

    if (isNaN(start) || start < 1) {
      alert('Please enter a valid starting note number');
      return;
    }

    if (isNaN(bsCount) || bsCount < 0 || isNaN(plCount) || plCount < 0) {
      alert('Please enter valid note counts');
      return;
    }

    onApplySettings(start, bsCount, plCount, includeContingent);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Reset form values when opening dialog
      setStartingNote(bsStartingNote.toString());
      setIncludeContingent(includeContingentLiabilities);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Hash className="h-4 w-4" />
          Configure Note Numbers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configure Financial Statement Note Numbers</DialogTitle>
          <DialogDescription>
            Set up the note numbering for Balance Sheet and P&L notes. Numbers will be automatically assigned sequentially.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Starting Note Number */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startingNote" className="text-right font-semibold">
              Start From
            </Label>
            <Input
              id="startingNote"
              type="number"
              min={1}
              value={startingNote}
              onChange={(e) => setStartingNote(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 1, 3, 5"
            />
          </div>

          {/* Balance Sheet Notes Count */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bsNoteCount" className="text-right font-semibold">
              BS Notes Count
            </Label>
            <Input
              id="bsNoteCount"
              type="number"
              min={0}
              value={bsNoteCount}
              onChange={(e) => setBsNoteCount(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 15"
            />
          </div>

          {/* P&L Notes Count */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="plNoteCount" className="text-right font-semibold">
              P&L Notes Count
            </Label>
            <Input
              id="plNoteCount"
              type="number"
              min={0}
              value={plNoteCount}
              onChange={(e) => setPlNoteCount(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 7"
            />
          </div>

          {/* Contingent Liabilities Checkbox */}
          <div className="flex items-center gap-4">
            <Checkbox
              id="contingent"
              checked={includeContingent}
              onCheckedChange={(checked) => setIncludeContingent(checked as boolean)}
            />
            <Label htmlFor="contingent" className="font-semibold cursor-pointer">
              Include Contingent Liabilities Note
            </Label>
          </div>

          {/* Preview Section */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Note Number Preview</AlertTitle>
            <AlertDescription className="text-blue-800 text-sm mt-2">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span>Balance Sheet Notes:</span>
                  <span className="font-semibold">
                    {calculatedNotes.bsStart} to {calculatedNotes.bsEnd}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>P&L Notes:</span>
                  <span className="font-semibold">
                    {calculatedNotes.plStart} to {calculatedNotes.plEnd}
                  </span>
                </div>
                {includeContingent && (
                  <div className="flex justify-between">
                    <span>Contingent Liabilities Note:</span>
                    <span className="font-semibold">{calculatedNotes.contingentNote}</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Numbered Notes Display */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-sm mb-3 text-gray-900">Assigned Notes:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600 mb-2">
                  <strong>Balance Sheet Notes ({calculatedNotes.bsEnd - calculatedNotes.bsStart + 1}):</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({
                    length: Math.max(0, calculatedNotes.bsEnd - calculatedNotes.bsStart + 1),
                  }, (_, i) => (
                    <span
                      key={`bs-${i}`}
                      className="bg-blue-100 text-blue-900 px-2 py-1 rounded text-xs font-medium"
                    >
                      {calculatedNotes.bsStart + i}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-gray-600 mb-2">
                  <strong>P&L Notes ({calculatedNotes.plEnd - calculatedNotes.plStart + 1}):</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({
                    length: Math.max(0, calculatedNotes.plEnd - calculatedNotes.plStart + 1),
                  }, (_, i) => (
                    <span
                      key={`pl-${i}`}
                      className="bg-green-100 text-green-900 px-2 py-1 rounded text-xs font-medium"
                    >
                      {calculatedNotes.plStart + i}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {includeContingent && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p className="text-gray-600 mb-2">
                  <strong>Contingent Liabilities:</strong>
                </p>
                <span className="bg-orange-100 text-orange-900 px-2 py-1 rounded text-xs font-medium">
                  {calculatedNotes.contingentNote}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How It Works</AlertTitle>
            <AlertDescription className="text-xs mt-2">
              <ul className="list-disc list-inside space-y-1">
                <li>Balance Sheet notes are numbered sequentially starting from your chosen number</li>
                <li>P&L notes continue the sequence after all Balance Sheet notes</li>
                <li>If included, Contingent Liabilities note receives the last sequential number</li>
                <li>Note numbers will only be assigned to line items that have values</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
