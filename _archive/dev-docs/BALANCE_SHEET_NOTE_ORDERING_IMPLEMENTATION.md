# Balance Sheet Note Ordering & Profit Row Injection - Implementation Summary

## Overview
This document summarizes the implementation of balance sheet note ordering improvements and profit row injection logic in `FinancialReview.tsx`. The changes ensure that equity items appear before liabilities in the balance sheet and that profit rows are correctly injected into the appropriate notes.

## Changes Made

### 1. Entity Type Detection (Already Well-Implemented)
**Location:** Lines 5620-5680 in `FinancialReview.tsx`

The entity type helpers are already robust:
- **`isCompanyEntityType`**: Detects companies with checks for "company", "limited", "private/public", "opc", "one person company"
- **`isIndividualEntityType`**: Detects individuals with checks for "individual", "sole proprietorship", "sole proprietor", "proprietorship", "hindu undivided", "huf"
- **`isPartnershipEntityType`**: Detects partnerships with checks for "partnership", "limited liability partnership", "llp"

These flags drive which note receives the added profit row.

### 2. Balance Sheet Note H2 Ordering (Already Well-Implemented)
**Location:** Lines 10117-10151 in `FinancialReview.tsx`

The `bsNoteH2Order` memoized value correctly:
1. Collects all H2s from `filteredBsplHeads`
2. Splits H1='Liability' rows into:
   - **Equity items** (identified by `isEquityItem()`)
   - **True liabilities** (remaining rows)
3. Collects H1='Asset' H2s
4. Sorts equity items using `getEquityOrderIndex()`
5. **Emits**: `[sorted equity, remaining liabilities, asset H2s]`

This ensures "Reserves and Surplus", "Owners Capital Account", and "Partners Capital Account" appear before liabilities in the balance sheet.

### 3. Normalized Note Label Helper
**Location:** Lines 15010-15014 in `FinancialReview.tsx`

**Improvement Made:** Enhanced the regex pattern to handle all quote variations:

```typescript
const normalizeNoteLabel = (value?: string): string => {
  return (value || '').replace(/[''ΓÇÖΓÇÿ]/g, "'").toLowerCase().trim();
};
```

This helper handles:
- Straight apostrophes (`'`)
- Curly left/right quotes (`''`)
- Smart quotes (`ΓÇÖΓÇÿ`)

### 4. Profit Row Configuration (Refactored)
**Location:** Lines 15016-15042 in `FinancialReview.tsx`

**Improvement Made:** Removed duplicate profitRowConfig calculation inside `displayNoteRows`. The memoized `profitRowConfig` now:

1. Checks if `noteStatementType === 'BS'` and `profitForYearAmount !== 0`
2. Normalizes the H2 value using the improved `normalizeNoteLabel`
3. Computes the correct target H3 based on entity type:
   - **Companies**: H2 'reserves and surplus' → target H3 'surplus in statement of profit and loss'
   - **Individuals**: H2 'owners capital account' (with apostrophe variations) → target H3 'owners capital account'
   - **Partnerships**: H2 'partners capital account' (with apostrophe variations) → target H3 'partners capital account'

**Key Enhancement:** Added handling for apostrophe variations in H2 names:
```typescript
if (isIndividualEntityType && (normalizedH2 === 'owners capital account' || normalizedH2 === "owners' capital account")) {
  return { targetH3: 'owners capital account', id: 'manual:add-profit-owners' };
}
```

### 5. Profit Row Injection (Already Well-Implemented)
**Location:** Lines 15075-15113 in `FinancialReview.tsx`

The `addProfitRow` function:
1. Checks if `profitRowConfig` exists
2. Avoids duplicate rows (checks if row with same id already exists)
3. Finds the target H3 by normalizing labels
4. Creates a manual row with:
   - Label: "Add: Profit/(loss) for the year"
   - Amount: `profitForYearAmount`
   - Proper indentation matching the target H3
   - Link to current note's header via `noteTarget`
5. Inserts the row immediately after the matching H3
6. Returns the updated rows list

The function is called on `computedState.rows` at line 15616.

### 6. Note Numbering with New Order
**Location:** Lines 10240-10319 in `FinancialReview.tsx`

The note numbering chain correctly reflects the new order:

1. **`preparedNotesBSRaw`**: Built with updated `bsNoteH2Order` (equity first, then liabilities, then assets)
2. **`applyNoteNumberOffset`**: Assigns `noteNo` sequentially based on the new order
3. **`preparedNotesBS`**: Result with correct note numbers
4. **`faceNoteMetaMapBS`**: Maps H2 to `{ total, noteNo }` using `preparedNotesBS`

Example flow:
- "Reserves and Surplus" (equity) → Note 1
- "Capital Account" (equity) → Note 2
- "Long-term Borrowings" (liability) → Note 3
- "Current Liabilities" (liability) → Note 4
- "Fixed Assets" (asset) → Note 5

### 7. Removed Duplication
**Location:** Previously lines 15084-15108 in `displayNoteRows`

**What was removed:**
- Duplicate `isIndividualEntityTypeLocal` calculation (already available as `isIndividualEntityType`)
- Duplicate `profitRowConfig` IIFE that was recomputing values
- Duplicate `profitRowLabel` definition
- Local `normalizeText` that used incomplete regex

**Result:** Cleaner, more maintainable code with single source of truth for profit row configuration.

## Verification Checklist

- ✅ Entity type helpers are robust and broad
- ✅ Balance sheet note ordering places equity before liabilities
- ✅ Profit row configuration is memoized and not duplicated
- ✅ Apostrophe variations are handled in normalization
- ✅ Profit rows are injected beneath the correct H3
- ✅ Profit rows only appear when noteStatementType === 'BS' and profitForYearAmount !== 0
- ✅ Note numbering reflects the new order (equity → liabilities → assets)
- ✅ `faceNoteMetaMapBS` confirms new noteNo entries align with updated order
- ✅ No more "Unclassified Liabilities – Note X" inconsistencies
- ✅ Syntax validation passed

## Testing Recommendations

1. **Balance Sheet View**: Load a financial statement and verify equity sections appear before liabilities
2. **Profit Row Injection**: 
   - For company: Check "Surplus in Statement of Profit and Loss" has "Add: Profit/(loss) for the year" below it
   - For individual: Check "Owners Capital Account" has the profit row below it
   - For partnership: Check "Partners Capital Account" has the profit row below it
3. **Note Numbering**: Verify that Reserves/Capital Account notes come before Liability notes
4. **Entity Type Edge Cases**: Test with variations like "OPC", "Private Limited", "Sole Proprietorship", "HUF", etc.
5. **Quote Variations**: Test with data containing curly quotes, smart quotes, and straight quotes

## Files Modified

- `src/pages/FinancialReview.tsx` (Lines 5620-5680, 10117-10151, 15010-15616)

## Performance Impact

- **Minimal**: Changes only remove duplicate calculations
- **Benefits**: 
  - One less IIFE computation per note render
  - Improved memoization effectiveness
  - Cleaner code path for profit row logic

## Backward Compatibility

✅ **Fully backward compatible**: All changes maintain existing API contracts and just improve internal logic flow.
