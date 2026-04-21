# Deletion Persistence Diagnostics

## Summary
Added console logging to trace where deleted rows are being reintroduced in the data pipeline.

## Changes Made

### 1. **handleDeleteSelected() function** (~line 20076)
Added logging to confirm deletion from `currentData`:
```javascript
console.log('🗑️ DELETE COMPLETE - currentData now has', currentData.length, 'rows. Removed', selectedKeys.size, 'ledgers.');
```
- **What it shows**: Total rows remaining after deletion and how many were removed
- **Expected**: Should show decreasing currentData length each time you delete

### 2. **noteSourceData memo** (~line 10033)
Added logging to see if noteSourceData is being rebuilt with deleted rows:
```javascript
console.log('📝 noteSourceData rendered - currentData.length:', currentData.length, '| data.length:', data.length);
```
- **What it shows**: Whether noteSourceData is correctly excluding deleted rows
- **Expected**: Should match or exceed currentData length (includes stock detail rows if manual inventory is enabled)

## How to Test

### Step 1: Prepare Test Data
- Import trial balance data
- Make sure you have rows in the Classified TB tab

### Step 2: Run Deletion Test
1. Open the Classified tab
2. Select 1 or 2 rows
3. Delete them (use the delete button)
4. **Open Browser Console** (F12 → Console tab)

### Step 3: Check Console Logs
Watch for these messages in order:

```
🗑️ DELETE COMPLETE - currentData now has 45 rows. Removed 2 ledgers.
📝 noteSourceData rendered - currentData.length: 45 | data.length: 45
```

### Step 4: Switch to Notes View
- Go to Notes tab
- **Check**: Do the deleted rows appear in the notes?
  
#### If deleted rows appear:
1. Check what noteSourceData contained before they reappeared
2. Look for any logs that show noteSourceData increasing unexpectedly
3. Check if `applyClassificationRules` or any auto-classification is re-adding rows

#### If deleted rows don't appear:
- Problem is NOT in the deletion handler or noteSourceData
- Problem is in the notes-display path (may be in how `displayNoteRows` filters or how profit rows are injected)

### Step 5: Try Auto-Classification
- Go back to Classified tab
- Click "Reapply Auto Classification" button
- Check if deleted rows reappear

## Expected Behavior

**After deletion, rows should:**
- ✅ Be removed from `currentData` (confirmed by first log)
- ✅ Be removed from `noteSourceData` (confirmed by second log matching currentData length)
- ✅ NOT appear in Notes view
- ✅ NOT reappear unless explicitly re-added or re-classified

**If rows reappear after reapply auto-classification:**
- This is EXPECTED if the row's composition still matches a classification rule
- To prevent reappearance, the row must be removed from the source trial balance data in the database

## Additional Tracing

If rows still persist, we may need to add logging to:
1. **`applyClassificationRules`** - Check if it's re-classifying deleted rows
2. **`buildPreparedNotes`** - Check if notes are filtering currentData correctly
3. **`displayNoteRows`** - Check if profit row injection is re-adding deleted entries
4. **`filterClassifiedRows`** - Check if this filter is excluding rows properly

## Files Modified
- `src/pages/FinancialReview.tsx` (lines 10035-10037, 20077)

## Cleanup
Once you've identified where rows are returning, remove these console.log statements to clean up the production code.
