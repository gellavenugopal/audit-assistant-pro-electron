/**
 * Utility functions for managing financial statement note numbering
 */

export interface NoteNumberConfig {
  bsStartingNote: number;
  bsNoteCount: number;
  plStartingNote: number;
  plNoteCount: number;
  includeContingentLiabilities: boolean;
  contingentLiabilityNoteNo?: number;
}

export interface NoteNumberRange {
  bsStart: number;
  bsEnd: number;
  plStart: number;
  plEnd: number;
  contingentLiability?: number;
}

/**
 * Calculate note number ranges based on configuration
 */
export function calculateNoteNumberRanges(config: NoteNumberConfig): NoteNumberRange {
  return {
    bsStart: config.bsStartingNote,
    bsEnd: config.bsStartingNote + config.bsNoteCount - 1,
    plStart: config.plStartingNote,
    plEnd: config.plStartingNote + config.plNoteCount - 1,
    contingentLiability: config.includeContingentLiabilities
      ? config.contingentLiabilityNoteNo || config.bsStartingNote + config.bsNoteCount + config.plNoteCount
      : undefined,
  };
}

/**
 * Get the note number for a specific statement line
 * @param statementType 'balance-sheet' | 'profit-loss' | 'contingent-liabilities'
 * @param lineIndex 0-based index of the line item with a value
 * @param config Note number configuration
 */
export function getNoteNumberForLine(
  statementType: 'balance-sheet' | 'profit-loss' | 'contingent-liabilities',
  lineIndex: number,
  config: NoteNumberConfig
): number | undefined {
  const ranges = calculateNoteNumberRanges(config);

  switch (statementType) {
    case 'balance-sheet': {
      const bsNoteNo = ranges.bsStart + lineIndex;
      return bsNoteNo <= ranges.bsEnd ? bsNoteNo : undefined;
    }

    case 'profit-loss': {
      const plNoteNo = ranges.plStart + lineIndex;
      return plNoteNo <= ranges.plEnd ? plNoteNo : undefined;
    }

    case 'contingent-liabilities':
      return config.includeContingentLiabilities && lineIndex === 0 ? ranges.contingentLiability : undefined;

    default:
      return undefined;
  }
}

/**
 * Generate display text for note numbers
 */
export function getDisplayNoteNumber(noteNumber: number | undefined): string {
  return noteNumber ? `Note ${noteNumber}` : '-';
}

/**
 * Get all note numbers for a statement
 */
export function getAllNoteNumbersForStatement(
  statementType: 'balance-sheet' | 'profit-loss' | 'contingent-liabilities',
  config: NoteNumberConfig
): number[] {
  const ranges = calculateNoteNumberRanges(config);
  const notes: number[] = [];

  switch (statementType) {
    case 'balance-sheet': {
      for (let i = ranges.bsStart; i <= ranges.bsEnd; i++) {
        notes.push(i);
      }
      break;
    }

    case 'profit-loss': {
      for (let i = ranges.plStart; i <= ranges.plEnd; i++) {
        notes.push(i);
      }
      break;
    }

    case 'contingent-liabilities': {
      if (config.includeContingentLiabilities && ranges.contingentLiability) {
        notes.push(ranges.contingentLiability);
      }
      break;
    }
  }

  return notes;
}

/**
 * Get summary of note numbering configuration
 */
export function getNoteNumberingSummary(config: NoteNumberConfig): string {
  const ranges = calculateNoteNumberRanges(config);
  const parts: string[] = [
    `BS Notes: ${ranges.bsStart}-${ranges.bsEnd} (${config.bsNoteCount} notes)`,
    `P&L Notes: ${ranges.plStart}-${ranges.plEnd} (${config.plNoteCount} notes)`,
  ];

  if (config.includeContingentLiabilities && ranges.contingentLiability) {
    parts.push(`Contingent Liabilities: ${ranges.contingentLiability}`);
  }

  return parts.join(', ');
}
