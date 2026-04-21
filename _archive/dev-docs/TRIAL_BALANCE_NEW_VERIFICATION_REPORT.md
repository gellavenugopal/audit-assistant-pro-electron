# Trial Balance New Module - End-to-End Verification Report
**Date:** January 10, 2026  
**Module:** trial-balance-new  
**Audited by:** GitHub Copilot  

---

## Executive Summary

| Category | Status | Critical Issues | Recommendations |
|----------|--------|-----------------|-----------------|
| Data Ingestion | ⚠️ **PARTIAL** | Missing explicit filters | Add toggle controls |
| Actual → Classified | ⚠️ **PARTIAL** | Implicit filtering applied | Document filter behavior |
| Filter Controls | ❌ **MISSING** | Required toggles not implemented | **URGENT: Implement** |
| Classification Integrity | ✅ **PASS** | None | Minor enhancements |
| Notes Flow Control | ⚠️ **PARTIAL** | No explicit validation | Add guard checks |
| Totals Validation | ⚠️ **NEEDS REVIEW** | No cross-check mechanism | Add validation layer |
| Negative Checks | ❌ **MISSING** | No guard rails | **URGENT: Implement** |
| Golden Audit Rule | ⚠️ **AT RISK** | Direct dependencies possible | Refactor data flow |

---

## 1️⃣ Data Ingestion Check (Actual TB Tab)

### Current Implementation
**File:** `src/pages/TrialBalanceNew.tsx` (Lines 490-600)

```typescript
// ISSUE: Implicit filtering during ingestion
const processedData: LedgerRow[] = lines
  .filter(line => {
    const opening = line.openingBalance || 0;
    const debit = Math.abs(line.totalDebit || 0);
    const credit = Math.abs(line.totalCredit || 0);
    const closing = line.closingBalance || 0;
    
    // ❌ ISSUE: Data is filtered at ingestion - violates "Actual TB = Raw Data"
    return !(opening === 0 && debit === 0 && credit === 0 && closing === 0);
  })
```

### ✅ What Works
- ✅ Tally ODBC connection functional
- ✅ Excel import (assumed functional based on structure)
- ✅ All ledger fields populated correctly:
  - Ledger Name
  - Parent Group / Primary Group
  - Opening Balance
  - Debit
  - Credit
  - Closing Balance

### ❌ Issues Found

**CRITICAL:** Actual TB is NOT showing raw data - implicit filter applied at line 505

```typescript
// Current (WRONG):
.filter(line => {
  return !(opening === 0 && debit === 0 && credit === 0 && closing === 0);
})
```

**Expected Behavior:**
```typescript
// Should be (CORRECT):
const processedData: LedgerRow[] = lines.map(line => ({...}));
// NO FILTERING - Let Actual TB show everything
```

### 📋 Recommendations
1. **URGENT:** Remove filter at ingestion (line 505)
2. Store complete raw data in `actualData` state
3. Apply filters ONLY in the UI layer (Actual TB Tab component)
4. Add total reconciliation with source

---

## 2️⃣ Movement from Actual TB → Classified TB

### Current Implementation
**File:** `src/pages/TrialBalanceNew.tsx` (Lines 605-615)

```typescript
// ISSUE: Second implicit filter applied
const dataToClassify = processedData.filter(row => {
  const opening = row['Opening Balance'] || 0;
  const closing = row['Closing Balance'] || 0;
  // ❌ Exclude if BOTH Opening=0 AND Closing=0
  return !(opening === 0 && closing === 0);
});
```

### ❌ Issues Found

**CRITICAL:** Data loss between Actual TB and Classified TB

| Stage | Filter Applied | Data Lost |
|-------|----------------|-----------|
| Ingestion | All 5 columns zero | Unknown % |
| Classification | Opening=0 AND Closing=0 | Unknown % |
| **Total Loss** | Compounded | **Not tracked** |

**Expected Behavior:**
- Classified TB should START with exact same dataset as Actual TB
- Filters should be UI-only, NOT data mutations

### 📋 Recommendations
1. **URGENT:** Remove filter at line 610
2. Pass complete `actualData` to classification engine
3. Classification should preserve ALL rows
4. Add row count validation:
   ```typescript
   console.assert(
     actualData.length === classifiedData.length,
     'Data loss detected between Actual and Classified TB'
   );
   ```

---

## 3️⃣ Filtering Controls in Classified TB

### Current Implementation
**File:** `src/components/trial-balance-new/FilterModal.tsx`

### ❌ CRITICAL ISSUES

**MISSING FILTER A:** "Hide Zero Transaction Ledgers"
- **Required:** Hide where Debit=0 AND Credit=0 AND Opening=0 AND Closing=0
- **Current Status:** ❌ NOT IMPLEMENTED
- **Available:** Only "Zero Balance" filter exists (line 206)

**MISSING FILTER B:** "Hide Zero Balance but Movement Ledgers"
- **Required:** Hide where Opening=0 AND Closing=0 BUT (Debit≠0 OR Credit≠0)
- **Current Status:** ❌ NOT IMPLEMENTED
- **Impact:** Users cannot hide ledgers with transactions but no balance impact

### Current Filters (Insufficient)
```typescript
// From FilterModal.tsx - Line 195-210
<SelectItem value="all">All Balances</SelectItem>
<SelectItem value="debit">Debit Only</SelectItem>      // ✅ Works
<SelectItem value="credit">Credit Only</SelectItem>    // ✅ Works
<SelectItem value="zero">Zero Balance</SelectItem>     // ⚠️ Wrong logic
<SelectItem value="non-zero">Non-Zero</SelectItem>     // ⚠️ Wrong logic
```

### 📋 Required Implementation

**Add these toggle switches in Classified TB Tab:**

```typescript
interface FilterToggles {
  hideZeroTransactionLedgers: boolean;  // Filter A
  hideZeroBalanceWithMovement: boolean; // Filter B
}

// Filter A Logic:
const applyFilterA = (row: LedgerRow) => {
  if (!hideZeroTransactionLedgers) return true;
  const isAllZero = 
    row['Debit'] === 0 && 
    row['Credit'] === 0 && 
    row['Opening Balance'] === 0 && 
    row['Closing Balance'] === 0;
  return !isAllZero; // Hide if all zero
};

// Filter B Logic:
const applyFilterB = (row: LedgerRow) => {
  if (!hideZeroBalanceWithMovement) return true;
  const hasMovement = row['Debit'] !== 0 || row['Credit'] !== 0;
  const zeroBalance = row['Opening Balance'] === 0 && row['Closing Balance'] === 0;
  return !(hasMovement && zeroBalance); // Hide if movement but zero balance
};
```

**UI Placement:** Add to Classified TB toolbar as toggle buttons

---

## 4️⃣ Classification Integrity Check

### Current Implementation
**File:** `src/services/trialBalanceNewClassification.ts`

### ✅ What Works
- ✅ H1, H2, H3 assignments functional
- ✅ Status tracking (Mapped/Unmapped/Error)
- ✅ Classification engine with rules

### ⚠️ Concerns

**No Explicit Guard Against Unclassified Data in Reports**

```typescript
// From ReportsTab.tsx - Line 103
const trialBalanceLines = useMemo(() => {
  // ⚠️ NO CHECK: Are all rows classified?
  return convertLedgerRowsToTrialBalanceLines(data, ...);
}, [data, ...]);
```

**Expected:**
```typescript
const trialBalanceLines = useMemo(() => {
  // ✅ VALIDATE: Only classified data flows to reports
  const classifiedOnly = data.filter(row => 
    row.H1 && row.H2 && row.H3 && row.Status === 'Mapped'
  );
  
  if (classifiedOnly.length !== data.length) {
    console.warn(
      `Excluding ${data.length - classifiedOnly.length} unclassified ledgers from reports`
    );
  }
  
  return convertLedgerRowsToTrialBalanceLines(classifiedOnly, ...);
}, [data, ...]);
```

### 📋 Recommendations
1. Add explicit filter in `ReportsTab.tsx` (line 103)
2. Show warning if unclassified data exists
3. Add validation badge showing classified vs total count
4. Prevent report generation if unclassified data > threshold

---

## 5️⃣ Deep Control: What Goes Into Notes

### Current Implementation
**File:** `src/utils/computePLNoteValues.ts` & `src/utils/computeBSNoteValues.ts`

### ✅ What Works
- ✅ Notes derive from passed data
- ✅ Grouping by H3/H4 classifications

### ❌ Issues Found

**NO VALIDATION: Are ledgers classified before flowing into notes?**

```typescript
// From computePLNoteValues.ts
export function computePLNoteValues(data: LedgerRow[], stockData: any[]) {
  // ❌ NO CHECK: Is data.filter(row => row.Status === 'Mapped') used?
  const ledgers = data; // Assumes all data is classified
  ...
}
```

**Expected Guard:**
```typescript
export function computePLNoteValues(data: LedgerRow[], stockData: any[]) {
  // ✅ GUARD: Only use classified ledgers
  const classifiedLedgers = data.filter(row => 
    row.H1 === 'P&L Account' && 
    row.H2 && 
    row.H3 && 
    row.Status === 'Mapped'
  );
  
  if (classifiedLedgers.length !== data.length) {
    throw new Error(
      `Cannot compute P&L notes: ${data.length - classifiedLedgers.length} unclassified ledgers detected`
    );
  }
  ...
}
```

### 📋 Recommendations
1. **URGENT:** Add classification validation in compute functions
2. Add duplicate detection (ledger in multiple notes)
3. Add completeness check (all classified ledgers appear in exactly one note)
4. Create audit log of note assignments

---

## 6️⃣ Deep Control: PL / BS Totals vs Classified TB

### Current Implementation
**File:** `src/pages/TrialBalanceNew.tsx` (Line 451-478)

### ✅ What Works
- ✅ Totals calculated from filtered data
- ✅ Separate totals for Actual TB vs Classified TB

### ❌ Issues Found

**NO CROSS-VALIDATION between Notes and Classified TB**

**Expected Validation:**
```typescript
// Add to ReportsTab.tsx
const validateTotals = useMemo(() => {
  // Get all P&L ledgers from Classified TB
  const plLedgers = data.filter(row => row.H1 === 'P&L Account');
  const plTotal = plLedgers.reduce((sum, row) => 
    sum + Math.abs(row['Closing Balance']), 0
  );
  
  // Get sum of all P&L notes
  const plNotesTotal = Object.values(plNoteValues).reduce(
    (sum, val) => sum + Math.abs(val), 0
  );
  
  // Validate
  const difference = Math.abs(plTotal - plNotesTotal);
  if (difference > 1) { // Allow 1 rupee rounding
    console.error(
      `P&L validation failed: TB=${plTotal}, Notes=${plNotesTotal}, Diff=${difference}`
    );
  }
  
  return { plTotal, plNotesTotal, difference };
}, [data, plNoteValues]);
```

### 📋 Recommendations
1. Add total validation in `ReportsTab.tsx`
2. Show validation status badge in UI
3. Block export if validation fails
4. Add reconciliation report showing differences

---

## 7️⃣ Negative / Sanity Checks

### ❌ CRITICAL: NO GUARD RAILS IMPLEMENTED

**Required Checks (ALL MISSING):**

```typescript
// 1. Unclassified ledgers must not appear in reports
const validateUnclassifiedExclusion = (data: LedgerRow[]) => {
  const unclassified = data.filter(row => !row.H1 || !row.H2 || !row.H3);
  const inReports = /* check if any unclassified in reports */;
  console.assert(inReports.length === 0, 'Unclassified ledgers in reports!');
};

// 2. Filtered-out ledgers must not flow into statements
const validateFilteredExclusion = (
  allData: LedgerRow[], 
  filteredData: LedgerRow[], 
  reportData: LedgerRow[]
) => {
  const excludedKeys = allData
    .filter(r => !filteredData.includes(r))
    .map(r => r['Composite Key']);
  
  const inReports = reportData.filter(r => 
    excludedKeys.includes(r['Composite Key'])
  );
  
  console.assert(
    inReports.length === 0, 
    'Filtered-out ledgers appearing in reports!'
  );
};

// 3. Classification changes must update reports immediately
// Currently: ✅ React useMemo handles this
// But: ❌ No validation that update actually occurred
```

### 📋 Recommendations
1. **URGENT:** Implement all three validation functions
2. Add validation layer before report generation
3. Show validation errors in UI (not just console)
4. Add "Pre-flight Check" button before generating reports

---

## 8️⃣ Golden Audit Rule (Architecture)

### Current Architecture Analysis

```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT DATA FLOW                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tally/Excel ──> actualData (FILTERED!) ──> ISSUE          │
│       │                                                     │
│       └──────> classifiedData (RE-FILTERED!) ──> ISSUE     │
│                     │                                       │
│                     ├──> ReportsTab ──> Notes (NO GUARD)   │
│                     ├──> Balance Sheet                     │
│                     └──> P&L                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ❌ Violations of Golden Audit Rule

1. **Actual TB ≠ Raw Data**
   - Filter applied at ingestion (line 505)
   - Violates: "Actual TB = Raw Data"

2. **Classified TB ≠ Single Source of Truth**
   - Additional filter at classification (line 610)
   - Violates: "Classified TB = Single Source of Truth"

3. **Notes derive from unvalidated data**
   - No explicit guard against unclassified ledgers
   - Violates: "Only derived from Classified TB"

4. **No isolation layer**
   - `ReportsTab` receives `data` directly
   - Could theoretically bypass classification
   - Violates: "No direct dependency to raw data"

### ✅ Required Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ CORRECT DATA FLOW                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tally/Excel ──> actualData (RAW, UNFILTERED)              │
│       │                                                     │
│       └──> classifiedData (ALL ROWS, WITH STATUS)          │
│                     │                                       │
│                     │  🛡️ VALIDATION GATE                   │
│                     │  • Check: All classified?            │
│                     │  • Check: No duplicates?             │
│                     │  • Check: Totals match?              │
│                     ▼                                       │
│                classifiedOnly ──> ReportsTab               │
│                (Status='Mapped')      │                    │
│                                       ├──> Notes           │
│                                       ├──> Balance Sheet   │
│                                       └──> P&L             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Priority Action Items

### 🔴 CRITICAL (Implement within 24 hours)

1. **Remove Implicit Filters**
   - [ ] Remove filter at ingestion (line 505)
   - [ ] Remove filter before classification (line 610)
   - [ ] Store complete raw data in `actualData`

2. **Add Required Toggle Filters**
   - [ ] Implement "Hide Zero Transaction Ledgers" toggle
   - [ ] Implement "Hide Zero Balance with Movement" toggle
   - [ ] Place in Classified TB toolbar

3. **Add Validation Gate**
   - [ ] Filter to classified-only before passing to `ReportsTab`
   - [ ] Add guard in `computePLNoteValues.ts`
   - [ ] Add guard in `computeBSNoteValues.ts`

### 🟡 HIGH PRIORITY (Implement within 1 week)

4. **Add Cross-Validation**
   - [ ] Validate P&L notes total = P&L TB total
   - [ ] Validate BS notes total = BS TB total
   - [ ] Add validation status badge in UI

5. **Add Negative Checks**
   - [ ] Validate unclassified exclusion
   - [ ] Validate filtered exclusion
   - [ ] Add pre-flight validation before export

6. **Add Audit Trail**
   - [ ] Log row counts at each stage
   - [ ] Log classification success/failure rates
   - [ ] Add reconciliation report

### 🟢 MEDIUM PRIORITY (Implement within 2 weeks)

7. **Enhance UI Feedback**
   - [ ] Show "X of Y classified" badge
   - [ ] Show validation status indicators
   - [ ] Add warning dialogs for data integrity issues

8. **Add Documentation**
   - [ ] Document data flow architecture
   - [ ] Add inline comments explaining filters
   - [ ] Create user guide for classification workflow

---

## Code Implementation Checklist

### File: `src/pages/TrialBalanceNew.tsx`

```typescript
// ❌ REMOVE THIS (Line 505-510):
.filter(line => {
  const opening = line.openingBalance || 0;
  const debit = Math.abs(line.totalDebit || 0);
  const credit = Math.abs(line.totalCredit || 0);
  const closing = line.closingBalance || 0;
  return !(opening === 0 && debit === 0 && credit === 0 && closing === 0);
})

// ✅ REPLACE WITH:
// No filter - store complete raw data
const processedData: LedgerRow[] = lines.map(line => ({...}));
setActualData(processedData);

// ❌ REMOVE THIS (Line 610-615):
const dataToClassify = processedData.filter(row => {
  const opening = row['Opening Balance'] || 0;
  const closing = row['Closing Balance'] || 0;
  return !(opening === 0 && closing === 0);
});

// ✅ REPLACE WITH:
const dataToClassify = processedData; // Use all data
const classified = classifyDataframeBatch(dataToClassify, ...);
```

### File: `src/components/trial-balance-new/ReportsTab.tsx`

```typescript
// ✅ ADD THIS (Before line 103):
const classifiedOnlyData = useMemo(() => {
  const filtered = data.filter(row => 
    row.H1 && 
    row.H2 && 
    row.H3 && 
    row.Status === 'Mapped'
  );
  
  const unmapped = data.length - filtered.length;
  if (unmapped > 0) {
    console.warn(`[GUARD] Excluding ${unmapped} unclassified ledgers from reports`);
  }
  
  return filtered;
}, [data]);

// ✅ MODIFY (Line 103):
const trialBalanceLines = useMemo(() => {
  return convertLedgerRowsToTrialBalanceLines(
    classifiedOnlyData, // ← Use validated data
    engagementId,
    userId,
    'current',
    toDate,
    stockData
  );
}, [classifiedOnlyData, ...]);
```

### File: `src/utils/computePLNoteValues.ts`

```typescript
// ✅ ADD AT START:
export function computePLNoteValues(data: LedgerRow[], stockData: any[]) {
  // GUARD: Validate all data is classified
  const unclassified = data.filter(row => 
    !row.H1 || !row.H2 || !row.H3 || row.Status !== 'Mapped'
  );
  
  if (unclassified.length > 0) {
    throw new Error(
      `[INTEGRITY ERROR] Cannot compute P&L notes: ` +
      `${unclassified.length} unclassified ledgers detected. ` +
      `Please classify all ledgers before generating reports.`
    );
  }
  
  // Rest of function...
}
```

---

## Conclusion

### Overall Assessment: ⚠️ **NEEDS CRITICAL FIXES**

The trial-balance-new module has a solid foundation but requires urgent fixes to meet the control objectives. The most critical issue is the **implicit filtering at data ingestion**, which violates the "Actual TB = Raw Data" principle.

### Risk Level: 🔴 **HIGH**

Without the recommended fixes:
- Data integrity cannot be guaranteed
- Unclassified ledgers may flow into financial statements
- Totals may not reconcile with source
- Audit trail is incomplete

### Estimated Effort: 2-3 days for critical fixes

With proper implementation of the action items, this module will achieve the required level of data integrity and control.

---

**Report Generated:** January 10, 2026  
**Next Review:** After implementing critical fixes  
**Sign-off Required:** Lead Developer + QA Team
