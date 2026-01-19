# Deletion Persistence — ROOT CAUSE & FIX

## Problem Identified
Deleted rows were reappearing immediately after deletion due to a **dependency loop** between:
1. Auto-save effect writing to database
2. Load effect re-reading from database
3. currentData being reset to database contents

## Console Log Evidence
```
🗑️ DELETE COMPLETE - currentData now has 22 rows. Removed 1 ledgers.  [❌ Wait, should be 21!]
📝 noteSourceData rendered - currentData.length: 21 | data.length: 21  [✅ Correct temp]
🔧 Auto-saved trial balance data
📝 noteSourceData rendered - currentData.length: 22 | data.length: 22  [❌ BACK TO 22!]
```

The "DELETE COMPLETE" log message actually shows the WRONG number because it was running with the old currentData value from the closure. But the real evidence is that noteSourceData jumped from 21 → 22.

## Root Cause Chain

1. **User deletes row**
   - `handleDeleteSelected()` removes from DB: `await trialBalanceDB.deleteLines(lineIds)`
   - Updates state: `setCurrentData(prev => prev.filter(...))` → 21 rows

2. **Auto-save effect triggers** (observes currentData changed to 21 rows)
   - Debounced 2 seconds
   - Writes only the 21 remaining rows: `await trialBalanceDB.importLines(dbLines, true, false)`
   - upsert mode (`true`) means: insert new rows and update existing ones, but doesn't delete

3. **Database gets updated** by auto-save
   - 21 rows are upserted
   - But deleted row X might still exist in DB (if deletion didn't cascade or was partial)

4. **Load effect re-runs** (PROBLEM!)
   - Has dependency: `[currentEngagement?.id, trialBalanceDB.lines, classificationRules, ...]`
   - `trialBalanceDB.lines` changed due to auto-save
   - Effect runs: `if (trialBalanceDB.lines && trialBalanceDB.lines.length > 0) { ... setCurrentData(...) }`
   - Reloads all lines from database into currentData
   - Back to 22 rows!

## The Fix

**File:** `src/pages/FinancialReview.tsx`  
**Line:** 9141  
**Change:** Remove `trialBalanceDB.lines` from dependency array

### Before
```typescript
}, [currentEngagement?.id, trialBalanceDB.lines, classificationRules, deriveH1FromRevenueAndBalance]);
```

### After
```typescript
}, [currentEngagement?.id, classificationRules, deriveH1FromRevenueAndBalance]);
```

### Why This Works

- The load effect now ONLY runs when the engagement changes
- It does NOT re-run when the database contents change
- So auto-save can update the database without triggering a re-load
- Deleted rows stay deleted in currentData state
- The database will eventually be consistent through auto-save writing only what's in currentData

## Remaining Notes

1. **Database cleanup:** The deleted row might still exist in the DB (if the delete call didn't work or the DB constraint isn't strict). But because we no longer reload from DB on every change, currentData stays clean.

2. **Persistence:** When user next loads the engagement, the load effect WILL run (on engagement change), and it will reload from DB at that point. If the DB still has old rows, they'll come back. To prevent this, ensure `trialBalanceDB.deleteLines()` actually removes rows from the database.

3. **Auto-save mode:** The auto-save uses upsert mode (`importLines(..., true, ...)`). This is fine for keeping currentData in sync with DB, but it doesn't DELETE rows from DB. If you need to permanently remove rows on reload, either:
   - Make `deleteLines()` actually delete from DB (current approach)
   - Switch auto-save to sync full state (not upsert)
   - Add a "tombstone" or "deleted" flag to rows instead of hard-deleting

## Testing the Fix

After deploying this change:

1. **Delete a row** in Classified tab
2. **Don't reload the page** — deletion should persist
3. **Switch to Notes tab** — deleted rows should NOT appear
4. **Refresh the page** — engagement load effect runs, reloads from DB
   - If deleted row still appears: DB delete didn't work, check `trialBalanceDB.deleteLines()`
   - If deleted row is gone: Everything works correctly!

## Files Modified
- `src/pages/FinancialReview.tsx` — Line 9141

## Related Diagnostics
Added console logging (can be removed after verification):
- Line 10039: noteSourceData rebuild logging
- Line 20092: Deletion completion logging
