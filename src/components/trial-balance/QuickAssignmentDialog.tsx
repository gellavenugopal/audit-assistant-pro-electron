import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrialBalanceLine, TrialBalanceLineInput } from '@/hooks/useTrialBalance';
import {
  getAllFaceGroups,
  getNoteGroupsForFaceGroup,
  getSubNotesForNoteGroup,
  getAileForFaceGroup,
  isBalanceSheetFaceGroup,
  isProfitLossFaceGroup,
  findClassificationForTallyGroup,
} from '@/data/scheduleIIIHierarchy';
import { ChevronRight, Wand2, ArrowRight } from 'lucide-react';

interface QuickAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: TrialBalanceLine | null;
  onSave: (id: string, data: Partial<TrialBalanceLineInput>) => Promise<any>;
  onSaveAndNext?: () => void;
  uncategorizedLines?: TrialBalanceLine[];
}

export function QuickAssignmentDialog({
  open,
  onOpenChange,
  line,
  onSave,
  onSaveAndNext,
  uncategorizedLines = [],
}: QuickAssignmentDialogProps) {
  const [faceGroup, setFaceGroup] = useState<string>('');
  const [noteGroup, setNoteGroup] = useState<string>('');
  const [subNote, setSubNote] = useState<string>('');
  const [customSubNote, setCustomSubNote] = useState<string>('');
  const [level4Group, setLevel4Group] = useState<string>('');
  const [level5Detail, setLevel5Detail] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Get dropdown options from new hierarchy
  const faceGroups = useMemo(() => getAllFaceGroups(), []);
  const noteGroups = useMemo(() => {
    if (!faceGroup) return [];
    return getNoteGroupsForFaceGroup(faceGroup);
  }, [faceGroup]);
  const subNotes = useMemo(() => {
    if (!faceGroup || !noteGroup) return [];
    return getSubNotesForNoteGroup(faceGroup, noteGroup);
  }, [faceGroup, noteGroup]);

  // Derive AILE from Face Group
  const derivedAile = useMemo(() => {
    if (!faceGroup) return null;
    return getAileForFaceGroup(faceGroup);
  }, [faceGroup]);

  // Check if item is BS or PL
  const isBalanceSheetItem = useMemo(() => isBalanceSheetFaceGroup(faceGroup), [faceGroup]);
  const isProfitLossItem = useMemo(() => isProfitLossFaceGroup(faceGroup), [faceGroup]);

  // Validation - Level 4 mandatory for BS, Level 5 mandatory for PL
  const isLevel4Required = isBalanceSheetItem;
  const isLevel5Required = isProfitLossItem;
  const isValid = useMemo(() => {
    if (!faceGroup || !noteGroup) return false;
    if (isLevel4Required && !level4Group) return false;
    if (isLevel5Required && !level5Detail) return false;
    return true;
  }, [faceGroup, noteGroup, isLevel4Required, level4Group, isLevel5Required, level5Detail]);

  // Reset form when line changes
  useEffect(() => {
    if (line) {
      setFaceGroup(line.face_group || '');
      setNoteGroup(line.note_group || '');
      setSubNote(line.sub_note || '');
      setCustomSubNote('');
      setLevel4Group(line.level4_group || '');
      setLevel5Detail(line.level5_detail || '');
    }
  }, [line]);

  // Reset dependent dropdowns when parent changes
  useEffect(() => {
    if (faceGroup) {
      const validNoteGroups = getNoteGroupsForFaceGroup(faceGroup);
      if (!validNoteGroups.includes(noteGroup)) {
        setNoteGroup('');
        setSubNote('');
        setCustomSubNote('');
      }
    }
  }, [faceGroup]);

  useEffect(() => {
    if (faceGroup && noteGroup) {
      const validSubNotes = getSubNotesForNoteGroup(faceGroup, noteGroup);
      if (!validSubNotes.includes(subNote) && subNote !== 'custom') {
        setSubNote('');
        setCustomSubNote('');
      }
    }
  }, [noteGroup, faceGroup]);

  // Auto-classify based on Tally group using new hierarchy
  const handleAutoClassify = () => {
    if (!line?.ledger_primary_group) return;
    
    const result = findClassificationForTallyGroup(line.ledger_primary_group);
    if (result.faceGroup) {
      setFaceGroup(result.faceGroup);
      // Wait for state to update, then set note group
      setTimeout(() => {
        if (result.noteGroup) {
          setNoteGroup(result.noteGroup);
        }
        if (result.subNote) {
          setTimeout(() => setSubNote(result.subNote!), 50);
        }
      }, 50);
    }
  };

  const handleSave = async () => {
    if (!line || !isValid) return;
    
    setSaving(true);
    try {
      const finalSubNote = subNote === 'custom' ? customSubNote : subNote;
      
      await onSave(line.id, {
        face_group: faceGroup,
        note_group: noteGroup,
        sub_note: finalSubNote || null,
        level4_group: level4Group || null,
        level5_detail: level5Detail || null,
        aile: derivedAile,
        fs_area: noteGroup, // Use note group as FS area for backward compatibility
      });
      
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (!line || !isValid) return;
    
    setSaving(true);
    try {
      const finalSubNote = subNote === 'custom' ? customSubNote : subNote;
      
      await onSave(line.id, {
        face_group: faceGroup,
        note_group: noteGroup,
        sub_note: finalSubNote || null,
        level4_group: level4Group || null,
        level5_detail: level5Detail || null,
        aile: derivedAile,
        fs_area: noteGroup,
      });
      
      onSaveAndNext?.();
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `${sign}₹${(absAmount / 10000000).toFixed(2)} Cr`;
    } else if (absAmount >= 100000) {
      return `${sign}₹${(absAmount / 100000).toFixed(2)} L`;
    }
    return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
  };

  if (!line) return null;

  const remainingUncategorized = uncategorizedLines.filter(l => l.id !== line.id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Quick Assignment
            {remainingUncategorized > 0 && (
              <Badge variant="secondary">{remainingUncategorized} more uncategorized</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Account Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-foreground">{line.account_name}</p>
                <p className="text-sm text-muted-foreground">{line.ledger_primary_group || 'No Tally Group'}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${Number(line.closing_balance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Number(line.closing_balance))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Number(line.closing_balance) < 0 ? 'Debit' : 'Credit'} Balance
                </p>
              </div>
            </div>
            
            {line.ledger_primary_group && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAutoClassify}
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Auto-classify from Tally Group
              </Button>
            )}
          </div>

          {/* Classification Breadcrumb */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={faceGroup ? 'default' : 'outline'} className="truncate max-w-[120px]">
              {faceGroup || 'Face Group'}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Badge variant={noteGroup ? 'default' : 'outline'} className="truncate max-w-[140px]">
              {noteGroup || 'Note Group'}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Badge variant={subNote || customSubNote ? 'default' : 'outline'} className="truncate max-w-[160px]">
              {(subNote === 'custom' ? customSubNote : subNote) || 'Sub Note'}
            </Badge>
            {derivedAile && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <Badge variant="secondary">{derivedAile}</Badge>
              </>
            )}
          </div>

          {/* Level 1: Face Group */}
          <div className="space-y-2">
            <Label>Face Group (Level 1) <span className="text-destructive">*</span></Label>
            <Select value={faceGroup} onValueChange={setFaceGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Select face group..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {faceGroups.map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level 2: Note Group */}
          <div className="space-y-2">
            <Label>Note Group (Level 2) <span className="text-destructive">*</span></Label>
            <Select 
              value={noteGroup} 
              onValueChange={setNoteGroup}
              disabled={!faceGroup}
            >
              <SelectTrigger>
                <SelectValue placeholder={faceGroup ? "Select note group..." : "Select face group first"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-[300px]">
                {noteGroups.map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level 3: Sub Note */}
          <div className="space-y-2">
            <Label>Sub Note (Level 3)</Label>
            <Select 
              value={subNote} 
              onValueChange={setSubNote}
              disabled={!noteGroup}
            >
              <SelectTrigger>
                <SelectValue placeholder={noteGroup ? "Select sub note..." : "Select note group first"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-[300px]">
                {subNotes.map(note => (
                  <SelectItem key={note} value={note}>{note}</SelectItem>
                ))}
                <SelectItem value="custom">Specify custom...</SelectItem>
              </SelectContent>
            </Select>
            {subNote === 'custom' && (
              <Input
                placeholder="Enter custom sub note..."
                value={customSubNote}
                onChange={(e) => setCustomSubNote(e.target.value)}
              />
            )}
          </div>

          {/* Level 4: Ledger Group (Mandatory for BS) */}
          <div className="space-y-2">
            <Label>
              Level 4 - Ledger Grouping {isLevel4Required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              placeholder={isLevel4Required ? "Required for Balance Sheet items" : "Optional grouping"}
              value={level4Group}
              onChange={(e) => setLevel4Group(e.target.value)}
            />
            {isLevel4Required && !level4Group && (
              <p className="text-xs text-destructive">Required for Balance Sheet items</p>
            )}
          </div>

          {/* Level 5: Ledger Detail (Mandatory for PL) */}
          <div className="space-y-2">
            <Label>
              Level 5 - Ledger Detail {isLevel5Required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              placeholder={isLevel5Required ? "Required for P&L items" : "Optional detail"}
              value={level5Detail}
              onChange={(e) => setLevel5Detail(e.target.value)}
            />
            {isLevel5Required && !level5Detail && (
              <p className="text-xs text-destructive">Required for Profit & Loss items</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {remainingUncategorized > 0 && onSaveAndNext && (
            <Button 
              variant="secondary" 
              onClick={handleSaveAndNext}
              disabled={!isValid || saving}
            >
              Save & Next
            </Button>
          )}
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
