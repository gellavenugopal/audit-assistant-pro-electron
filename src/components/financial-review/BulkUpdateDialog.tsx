/**
 * Bulk Update Dialog Component
 * 
 * Implements auto-population logic for H1, H2, H3 based on selected ledgers.
 * 
 * Behavior:
 * - Auto-populates H1 if all selected ledgers have the same H1
 * - Auto-populates H2 if all selected ledgers have the same H2 AND H1 is uniform
 * - Leaves H3 empty and requires manual selection (forces user to consciously choose)
 * - Apply button is enabled only if at least one field is selected/uniform
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { LedgerRow } from '@/services/trialBalanceNewClassification';
import {
  calculateBulkUpdateAutoPopulation,
  shouldEnableApplyButton,
  prepareBulkUpdatePayload,
  normalizeValue,
} from '@/utils/bulkUpdateHelpers';

interface BsplOptions {
  h1Options: string[];
  h2Options: Record<string, string[]>;
  h3Options: Record<string, Record<string, string[]>>;
}

interface BulkUpdateDialogComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRowIndices: Set<number>;
  currentData: LedgerRow[];
  onApply: (updates: Partial<LedgerRow>) => void;
  bsplOptions: BsplOptions;
}

export const BulkUpdateDialogComponent: React.FC<BulkUpdateDialogComponentProps> = ({
  open,
  onOpenChange,
  selectedRowIndices,
  currentData,
  onApply,
  bsplOptions,
}) => {
  // Form state
  const [selectedH1, setSelectedH1] = useState<string>('');
  const [selectedH2, setSelectedH2] = useState<string>('');
  const [selectedH3, setSelectedH3] = useState<string>('');

  // Get selected ledgers
  const selectedLedgers = useMemo(() => {
    return Array.from(selectedRowIndices)
      .map(index => currentData[index])
      .filter(Boolean);
  }, [selectedRowIndices, currentData]);

  // Calculate auto-population
  const autoPopulation = useMemo(() => {
    return calculateBulkUpdateAutoPopulation(selectedLedgers);
  }, [selectedLedgers]);

  const normalizedBsplLookup = useMemo(() => {
    const canonicalH1 = new Map<string, string>();
    const h2Lookup = new Map<string, string[]>();
    const h2Canonical = new Map<string, Map<string, string>>();
    const h3Lookup = new Map<string, Map<string, string[]>>();

    Object.entries(bsplOptions.h2Options).forEach(([h1, h2List]) => {
      const normalizedH1 = normalizeValue(h1);
      canonicalH1.set(normalizedH1, h1);
      h2Lookup.set(normalizedH1, h2List);

      const normalizedH2Map = new Map<string, string>();
      const normalizedH3Map = new Map<string, string[]>();
      const h3Set = bsplOptions.h3Options[h1] || {};

      h2List.forEach(h2 => {
        const normalizedH2 = normalizeValue(h2);
        normalizedH2Map.set(normalizedH2, h2);
        normalizedH3Map.set(normalizedH2, h3Set[h2] || []);
      });

      h2Canonical.set(normalizedH1, normalizedH2Map);
      h3Lookup.set(normalizedH1, normalizedH3Map);
    });

    return {
      canonicalH1,
      h2Lookup,
      h2Canonical,
      h3Lookup,
    };
  }, [bsplOptions]);

  const getCanonicalH1Value = useCallback(
    (value?: string) => {
      if (!value) return '';
      const normalized = normalizeValue(value);
      return normalizedBsplLookup.canonicalH1.get(normalized) || value;
    },
    [normalizedBsplLookup]
  );

  const getCanonicalH2Value = useCallback(
    (h1Value: string, value?: string) => {
      if (!h1Value || !value) return '';
      const normalizedH1 = normalizeValue(h1Value);
      const normalizedH2 = normalizeValue(value);
      return normalizedBsplLookup.h2Canonical.get(normalizedH1)?.get(normalizedH2) || value;
    },
    [normalizedBsplLookup]
  );

  const getH2OptionsForH1Key = useCallback(
    (value?: string) => {
      if (!value) return [];
      const normalized = normalizeValue(value);
      return normalizedBsplLookup.h2Lookup.get(normalized) || [];
    },
    [normalizedBsplLookup]
  );

  const getH3OptionsForSelection = useCallback(
    (h1Value?: string, h2Value?: string) => {
      if (!h1Value || !h2Value) return [];
      const normalizedH1 = normalizeValue(h1Value);
      const normalizedH2 = normalizeValue(h2Value);
      return normalizedBsplLookup.h3Lookup.get(normalizedH1)?.get(normalizedH2) || [];
    },
    [normalizedBsplLookup]
  );

  // Auto-populate form on dialog open
  useEffect(() => {
    if (open && selectedLedgers.length > 0) {
      // Reset form
      setSelectedH1('');
      setSelectedH2('');
      setSelectedH3('');

      // Auto-populate based on uniformity detection
      if (autoPopulation.h1.isUniform && autoPopulation.h1.value) {
        const canonicalH1 = getCanonicalH1Value(autoPopulation.h1.value);
        if (canonicalH1) {
          setSelectedH1(canonicalH1);
          if (autoPopulation.h2.isUniform && autoPopulation.h2.value) {
            setSelectedH2(getCanonicalH2Value(canonicalH1, autoPopulation.h2.value));
          }
        }
      }

      if (autoPopulation.h3.isUniform && autoPopulation.h3.value) {
        setSelectedH3(autoPopulation.h3.value);
      }
    }
  }, [open, selectedLedgers, autoPopulation, getCanonicalH1Value, getCanonicalH2Value]);

  const handleH1Change = useCallback(
    (value: string) => {
      const canonicalH1 = getCanonicalH1Value(value);
      setSelectedH1(canonicalH1);
      setSelectedH2('');
      setSelectedH3('');
    },
    [getCanonicalH1Value]
  );

  const handleH2Change = useCallback(
    (value: string) => {
      const canonicalH2 = getCanonicalH2Value(selectedH1, value);
      setSelectedH2(canonicalH2);
      setSelectedH3('');
    },
    [getCanonicalH2Value, selectedH1]
  );

  // Get H2 options based on selected H1
  const h2OptionsForH1 = useMemo(() => {
    const options = getH2OptionsForH1Key(selectedH1);
    if (!Array.isArray(options)) return [];
    return options.filter(opt => opt && opt.trim() !== '');
  }, [selectedH1, getH2OptionsForH1Key]);

  // Get H3 options based on selected H1 and H2
  const h3OptionsForH2 = useMemo(() => {
    const options = getH3OptionsForSelection(selectedH1, selectedH2);
    if (!Array.isArray(options)) return [];
    return options.filter(opt => opt && opt.trim() !== '');
  }, [selectedH1, selectedH2, getH3OptionsForSelection]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = prepareBulkUpdatePayload(
      selectedH1 || undefined,
      selectedH2 || undefined,
      selectedH3 || undefined
    );

    onApply(payload);
    onOpenChange(false);
  };

  // Determine if apply button should be enabled
  const applyButtonEnabled = shouldEnableApplyButton(autoPopulation) ||
    selectedH1 || selectedH2 || selectedH3;

  const totalItems = selectedRowIndices.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update {totalItems} Item{totalItems !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Update classification for {totalItems} selected ledger{totalItems !== 1 ? 's' : ''}.
            Fields with ✓ are auto-populated from common values.
          </DialogDescription>
        </DialogHeader>

        {/* Auto-Population Summary */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <div className="text-xs font-medium text-blue-900 mb-2">Auto-Population Status</div>
          <div className="text-xs text-blue-800 space-y-1">
            <div className="flex items-center gap-2">
              {autoPopulation.h1.isUniform ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span>H1: {autoPopulation.h1.value} (uniform)</span>
                </>
              ) : (
                <>
                  <span className="text-gray-400">○</span>
                  <span>H1: Mixed values - select manually</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {autoPopulation.h2.isUniform ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span>H2: {autoPopulation.h2.value} (uniform)</span>
                </>
              ) : (
                <>
                  <span className="text-gray-400">○</span>
                  <span>H2: {autoPopulation.h1.isUniform ? 'Mixed values' : 'Depends on H1'} - select manually</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">○</span>
              <span>H3: Requires manual selection</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* H1 Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="bulk-h1" className="flex-1">
                BS/PL Category (H1)
              </Label>
              {autoPopulation.h1.isUniform && (
                <Badge variant="secondary" className="text-xs">Auto-populated</Badge>
              )}
            </div>
                <Select value={selectedH1} onValueChange={handleH1Change}>
              <SelectTrigger id="bulk-h1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {bsplOptions.h1Options.map(h1 => (
                  <SelectItem key={h1} value={h1}>
                    {h1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* H2 Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="bulk-h2" className="flex-1">
                Subcategory (H2)
              </Label>
              {autoPopulation.h2.isUniform && (
                <Badge variant="secondary" className="text-xs">Auto-populated</Badge>
              )}
            </div>
            {selectedH1 ? (
                <Select value={selectedH2} onValueChange={handleH2Change}>
                <SelectTrigger id="bulk-h2">
                  <SelectValue placeholder={`Select ${selectedH1} subcategory`} />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(h2OptionsForH1) && h2OptionsForH1.map(h2 => (
                    <SelectItem key={h2} value={h2}>
                      {h2}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="bulk-h2"
                placeholder="Select H1 first"
                disabled
              />
            )}
          </div>

          {/* H3 Selection */}
          <div className="space-y-2">
            <Label htmlFor="bulk-h3">
              Sub-subcategory (H3) - Manual Selection Required
            </Label>
            {selectedH1 && selectedH2 ? (
              <Select value={selectedH3} onValueChange={setSelectedH3}>
                <SelectTrigger id="bulk-h3">
                  <SelectValue placeholder="Select sub-subcategory (optional - leave empty for no change)" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(h3OptionsForH2) && h3OptionsForH2.map(h3 => (
                    <SelectItem key={h3} value={h3}>
                      {h3}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="bulk-h3"
                placeholder="Select H1 and H2 first"
                disabled
              />
            )}
            <p className="text-xs text-muted-foreground">
              Even if all selected ledgers have the same H3, you must explicitly select it.
              This prevents accidental overwrites.
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <div className="text-xs font-medium text-amber-900 mb-2">Update Summary</div>
            <div className="text-xs text-amber-800 space-y-1">
              {selectedH1 && <div>• Will set H1 = {selectedH1}</div>}
              {selectedH2 && <div>• Will set H2 = {selectedH2}</div>}
              {selectedH3 && <div>• Will set H3 = {selectedH3}</div>}
              {!selectedH1 && !selectedH2 && !selectedH3 && (
                <div className="text-gray-500">No changes selected</div>
              )}
              <div className="mt-2 pt-2 border-t border-amber-300">
                Applied to: <span className="font-semibold">{totalItems} ledger(s)</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!applyButtonEnabled}
              title={!applyButtonEnabled ? 'Select at least one field to apply' : ''}
            >
              Apply to {totalItems} Item{totalItems !== 1 ? 's' : ''}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateDialogComponent;
