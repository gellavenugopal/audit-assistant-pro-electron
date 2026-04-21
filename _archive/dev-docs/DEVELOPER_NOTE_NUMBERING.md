# Financial Statement Note Numbering - Developer Documentation

## Architecture Overview

The Financial Statement Note Numbering system is built on a modular architecture that separates concerns:

```
User Interface Layer
├─ EnhancedNoteNumberSettings.tsx      [Configuration Dialog]
├─ NoteNumberSummary.tsx               [Configuration Display]
└─ TrialBalance.tsx                    [Main Integration]

Business Logic Layer
├─ utils/noteNumbering.ts              [Core Numbering Algorithm]
└─ ScheduleIII*.tsx                    [Statement Components]

Data Layer
└─ State Management (React hooks)
```

---

## Component Structure

### 1. EnhancedNoteNumberSettings.tsx

**Purpose**: User interface for configuring note numbers

**Props:**
```typescript
interface EnhancedNoteNumberSettingsProps {
  onApplySettings: (startingNote: number, bsNotes: number, plNotes: number, includeContingent: boolean) => void;
  bsStartingNote: number;
  plStartingNote: number;
  includeContingentLiabilities?: boolean;
}
```

**Key Features:**
- Real-time calculation of note ranges
- Visual preview with color-coded badges
- Validation of input values
- Live updates as user changes settings

**State Management:**
```typescript
const [startingNote, setStartingNote] = useState<string>();
const [bsNoteCount, setBsNoteCount] = useState<string>();
const [plNoteCount, setPlNoteCount] = useState<string>();
const [includeContingent, setIncludeContingent] = useState<boolean>();
const [calculatedNotes, setCalculatedNotes] = useState<NoteRanges>();
```

### 2. NoteNumberSummary.tsx

**Purpose**: Display the current note configuration in a card format

**Props:**
```typescript
interface NoteNumberSummaryProps {
  bsStartingNote: number;
  bsNoteCount: number;
  plStartingNote: number;
  plNoteCount: number;
  includeContingentLiabilities: boolean;
  contingentLiabilityNoteNo?: number;
}
```

**Rendering:**
- Color-coded badges for each statement section
- Summary of note ranges
- Helper text explaining the configuration

### 3. Core Utility: utils/noteNumbering.ts

**Purpose**: Centralized business logic for note numbering

**Key Interfaces:**

```typescript
interface NoteNumberConfig {
  bsStartingNote: number;
  bsNoteCount: number;
  plStartingNote: number;
  plNoteCount: number;
  includeContingentLiabilities: boolean;
  contingentLiabilityNoteNo?: number;
}

interface NoteNumberRange {
  bsStart: number;
  bsEnd: number;
  plStart: number;
  plEnd: number;
  contingentLiability?: number;
}
```

**Key Functions:**

```typescript
// Calculate ranges from config
calculateNoteNumberRanges(config: NoteNumberConfig): NoteNumberRange

// Get note number for a specific line
getNoteNumberForLine(
  statementType: 'balance-sheet' | 'profit-loss' | 'contingent-liabilities',
  lineIndex: number,
  config: NoteNumberConfig
): number | undefined

// Get all notes for a statement
getAllNoteNumbersForStatement(
  statementType: string,
  config: NoteNumberConfig
): number[]

// Get summary text
getNoteNumberingSummary(config: NoteNumberConfig): string
```

---

## Integration Points

### TrialBalance.tsx

**State Variables Added:**
```typescript
const [bsStartingNote, setBsStartingNote] = useState<number>(3);
const [plStartingNote, setPlStartingNote] = useState<number>(19);
const [bsNoteCount, setBsNoteCount] = useState<number>(15);
const [plNoteCount, setPlNoteCount] = useState<number>(7);
const [includeContingentLiabilities, setIncludeContingentLiabilities] = useState<boolean>(false);
const [contingentLiabilityNoteNo, setContingentLiabilityNoteNo] = useState<number>(27);
```

**Handler Function:**
```typescript
const handleApplyNoteSettings = (
  startingNote: number,
  bsCount: number,
  plCount: number,
  includeContingent: boolean
) => {
  // Update all relevant states
  // Show toast notification
  // Trigger re-render of financial statements
}
```

**Component Usage:**
```tsx
<EnhancedNoteNumberSettings
  onApplySettings={handleApplyNoteSettings}
  bsStartingNote={bsStartingNote}
  plStartingNote={plStartingNote}
  includeContingentLiabilities={includeContingentLiabilities}
/>

<NoteNumberSummary
  bsStartingNote={bsStartingNote}
  bsNoteCount={bsNoteCount}
  plStartingNote={plStartingNote}
  plNoteCount={plNoteCount}
  includeContingentLiabilities={includeContingentLiabilities}
  contingentLiabilityNoteNo={contingentLiabilityNoteNo}
/>

<ScheduleIIIBalanceSheet
  startingNoteNumber={bsStartingNote}
  // ... other props
/>

<ScheduleIIIProfitLoss
  startingNoteNumber={plStartingNote}
  // ... other props
/>
```

### ScheduleIIIBalanceSheet.tsx & ScheduleIIIProfitLoss.tsx

**Current Implementation:**
- Uses `startingNoteNumber` prop to calculate note assignments
- Maintains existing logic for determining which items get notes
- No changes required to existing algorithm

**How Notes Are Assigned:**
```typescript
const displayItems = useMemo(() => {
  const items: DisplayLineItem[] = [];
  let noteCounter = startingNoteNumber;

  bsFormat.forEach(formatItem => {
    // ... get amounts ...
    
    if (formatItem.fsArea && (currentAmount > 0 || previousAmount > 0)) {
      displayNoteNo = noteCounter.toString();
      noteCounter++;
    }
    
    items.push({ ...formatItem, displayNoteNo });
  });
}, [startingNoteNumber, ...]);
```

---

## Data Flow

### Configuration Flow

```
User Input
    ↓
[EnhancedNoteNumberSettings Dialog]
    ↓
handleApplyNoteSettings() → Update State
    ↓
State Updates:
  - bsStartingNote
  - bsNoteCount
  - plStartingNote
  - plNoteCount
  - includeContingentLiabilities
  - contingentLiabilityNoteNo
    ↓
Re-render Components:
  - NoteNumberSummary (shows preview)
  - ScheduleIIIBalanceSheet (uses bsStartingNote)
  - ScheduleIIIProfitLoss (uses plStartingNote)
```

### Note Assignment Flow

```
ScheduleIII* Component Renders
    ↓
displayItems useMemo() executes
    ↓
For each line item:
  1. Check if has value (>0 or <0)
  2. If yes: Assign noteCounter
  3. Increment noteCounter
    ↓
displayItems array created with:
  - displayNoteNo for each item with value
  - undefined for items without value
    ↓
Table renders with notes in "Note" column
```

---

## Algorithm Details

### Note Assignment Logic

```typescript
function assignNotes(items: FSLineItem[], startingNoteNumber: number): DisplayLineItem[] {
  let noteCounter = startingNoteNumber;
  
  return items.map(item => {
    const hasValue = (item.currentAmount > 0 || item.previousAmount > 0);
    
    if (item.fsArea && hasValue) {
      item.displayNoteNo = noteCounter.toString();
      noteCounter++;
    } else {
      item.displayNoteNo = undefined;
    }
    
    return item;
  });
}
```

### Key Design Decisions

1. **Sequential Numbering**: Notes are assigned in the order items appear, not by magnitude
2. **Skip Zero Items**: Items with no values don't break the sequence
3. **fsArea Requirement**: Only items with an fsArea can receive notes
4. **Current State**: noteCounter is local to the useMemo, reset on each render

---

## Configuration Storage & Persistence

### Current Implementation

- **Storage**: React component state in TrialBalance.tsx
- **Scope**: Per-engagement session
- **Persistence**: Lost on page refresh

### Future Enhancement Options

1. **Engagement Context**
   ```typescript
   interface EngagementSettings {
     noteNumberConfig: NoteNumberConfig;
   }
   ```

2. **LocalStorage**
   ```typescript
   localStorage.setItem(
     `engagement_${engagementId}_noteConfig`,
     JSON.stringify(config)
   );
   ```

3. **Database**
   ```typescript
   // Store in engagement metadata
   await updateEngagement(engagementId, {
     note_numbering_config: config
   });
   ```

---

## Type Definitions

### NoteNumberConfig

```typescript
interface NoteNumberConfig {
  bsStartingNote: number;        // Starting note number for BS
  bsNoteCount: number;           // Count of BS notes to allocate
  plStartingNote: number;        // Starting note number for P&L
  plNoteCount: number;           // Count of P&L notes to allocate
  includeContingentLiabilities: boolean; // Include CL note?
  contingentLiabilityNoteNo?: number;    // CL note number (calculated)
}
```

### NoteNumberRange

```typescript
interface NoteNumberRange {
  bsStart: number;               // First BS note
  bsEnd: number;                 // Last BS note
  plStart: number;               // First P&L note
  plEnd: number;                 // Last P&L note
  contingentLiability?: number;  // CL note number
}
```

---

## Error Handling

### Validation in EnhancedNoteNumberSettings

```typescript
const handleApply = () => {
  const start = parseInt(startingNote, 10);
  
  if (isNaN(start) || start < 1) {
    alert('Please enter a valid starting note number');
    return;
  }
  
  if (isNaN(bsCount) || bsCount < 0) {
    alert('Please enter valid note counts');
    return;
  }
  
  // Apply settings
};
```

### Edge Cases Handled

1. **Non-numeric input**: Validates with parseInt and isNaN
2. **Negative numbers**: Checks for min value of 1
3. **Zero counts**: Allows 0 (means no notes for that statement)
4. **Overflow**: No validation needed (users responsible)

---

## Testing Scenarios

### Unit Test Cases

```typescript
describe('noteNumbering.ts', () => {
  test('calculateNoteNumberRanges with default config', () => {
    const config: NoteNumberConfig = {
      bsStartingNote: 1,
      bsNoteCount: 5,
      plStartingNote: 6,
      plNoteCount: 3,
      includeContingentLiabilities: false,
    };
    const ranges = calculateNoteNumberRanges(config);
    expect(ranges.bsStart).toBe(1);
    expect(ranges.bsEnd).toBe(5);
    expect(ranges.plStart).toBe(6);
    expect(ranges.plEnd).toBe(8);
  });

  test('getNoteNumberForLine for BS item', () => {
    const noteNo = getNoteNumberForLine('balance-sheet', 2, config);
    expect(noteNo).toBe(3);
  });

  test('getNoteNumberForLine exceeding range', () => {
    const noteNo = getNoteNumberForLine('balance-sheet', 10, config);
    expect(noteNo).toBeUndefined();
  });
});
```

### Integration Test Cases

```typescript
describe('Note numbering in TrialBalance', () => {
  test('applying settings updates all states', () => {
    // Mock user input
    // Trigger handleApplyNoteSettings
    // Verify all state variables updated
  });

  test('summary card reflects current config', () => {
    // Set specific config
    // Render NoteNumberSummary
    // Verify display matches config
  });

  test('statements use correct starting notes', () => {
    // Set BS start to 1, P&L start to 10
    // Render both statements
    // Verify first BS note is 1, first P&L note is 10
  });
});
```

---

## Performance Considerations

### Optimization Points

1. **useMemo in displayItems**
   - Recalculates only when dependencies change
   - Prevents unnecessary note reassignment

2. **Calculated state in dialog**
   - Real-time calculation of ranges
   - Efficient with useEffect dependency array

3. **Summary card**
   - Pure component, no complex calculations
   - Minimal re-renders

### Potential Bottlenecks

- Large financial statements (1000+ items): May need pagination
- Real-time preview updates: Acceptable latency
- Toast notifications: Non-blocking

---

## Future Enhancements

### Planned Features

1. **Persistence**
   - Save configuration to database
   - Restore on engagement reopening

2. **Templates**
   - Save as template (e.g., "Standard Indian Co.")
   - Quick preset buttons

3. **Validation Rules**
   - Warn if notes exceed typical ranges
   - Suggest standard configurations

4. **Export Customization**
   - Custom note formatting
   - Note annexures in Excel

5. **Cross-Reference**
   - Automatic cross-reference generation
   - Link notes between statements

### Breaking Changes to Avoid

- Don't change the NoteNumberConfig interface without migration
- Keep calculateNoteNumberRanges backward compatible
- Maintain fsArea-based note assignment logic

---

## Related Files

| File | Purpose |
|------|---------|
| `src/pages/TrialBalance.tsx` | Main integration point |
| `src/components/trial-balance/EnhancedNoteNumberSettings.tsx` | Configuration UI |
| `src/components/trial-balance/NoteNumberSummary.tsx` | Summary display |
| `src/utils/noteNumbering.ts` | Core logic |
| `src/components/trial-balance/ScheduleIIIBalanceSheet.tsx` | BS rendering |
| `src/components/trial-balance/ScheduleIIIProfitLoss.tsx` | P&L rendering |
| `NOTE_NUMBERING_GUIDE.md` | User documentation |
| `NOTE_NUMBERING_IMPLEMENTATION.md` | Implementation guide |

---

## Debugging Tips

### Enable Logging

```typescript
// In handleApplyNoteSettings
console.log('Settings applied:', {
  bsStartingNote,
  bsNoteCount,
  plStartingNote,
  plNoteCount,
  includeContingentLiabilities
});

// In displayItems calculation
console.log('Assigning notes:', {
  itemName: formatItem.particulars,
  noteNumber: displayNoteNo,
  hasValue: currentAmount > 0 || previousAmount > 0
});
```

### Common Issues

1. **Notes not updating**: Check state dependencies in useMemo
2. **Wrong note ranges**: Verify calculation in handleApplyNoteSettings
3. **Summary not showing**: Check if NoteNumberSummary is rendered
4. **Dialog not opening**: Check z-index and modal state management

---

## Version History

### v1.0 (Initial Release)
- Basic note numbering functionality
- EnhancedNoteNumberSettings dialog
- NoteNumberSummary display
- Integration with BS and P&L statements
- Contingent liabilities support
