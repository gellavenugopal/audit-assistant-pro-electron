# Financial Statement Note Numbering - Implementation Guide

## Quick Start (5 Minutes)

### Step 1: Navigate to Balance Sheet Tab
1. Open your engagement in the Audit Assistant
2. Go to **Trial Balance** page
3. Click the **Balance Sheet** tab

### Step 2: Click "Configure Note Numbers"
- Look for the "Configure Note Numbers" button (with hash icon) in the toolbar
- Click it to open the configuration dialog

### Step 3: Enter Your Settings
1. **Starting Note Number**: Enter `1`, `3`, `5`, or whatever your standard is
2. **BS Notes Count**: Enter the number of balance sheet notes (e.g., `15`)
3. **P&L Notes Count**: Enter the number of P&L notes (e.g., `7`)
4. **Include Contingent Liabilities**: Check if you want a contingent liabilities note

### Step 4: Review the Preview
- The dialog shows a real-time preview of how notes will be numbered
- You'll see color-coded badges for each statement section
- Verify the ranges are correct

### Step 5: Click "Apply Settings"
- Settings are immediately applied
- A summary card appears above the financial statements showing your configuration

---

## Understanding the Note Numbering Logic

### How Notes Are Assigned

The system uses **automatic sequential numbering** with these rules:

```
For each statement line item (top to bottom):
├─ If item has a value in current OR previous period:
│  └─ Assign next available note number
└─ If item has zero in both periods:
   └─ No note number (item is displayed but not numbered)
```

### Example: Balance Sheet Notes

**Your Configuration:**
- Starting: 3
- BS Count: 5

**Your Balance Sheet Structure:**
```
Equity Share Capital        ← Has value → Note 3
Reserves and Surplus        ← Has value → Note 4
Share Application Money     ← Zero value → No note
Secured Borrowings          ← Has value → Note 5
Unsecured Borrowings        ← Has value → Note 6
Deferred Tax Liability       ← Zero value → No note
Other Long-term Liabilities ← Has value → Note 7
```

**Result:**
- 5 notes were allocated (3-7)
- Only 5 items received notes (zero-value items skipped)
- Note numbering is contiguous in the output

---

## Real-World Scenarios

### Scenario A: Small Company Financials

**Setup:**
- Starting Note: `1`
- BS Notes: `8`
- P&L Notes: `4`
- Contingent Liabilities: No

**Expected Output:**
```
BALANCE SHEET
Note 1: Equity Share Capital
Note 2: Reserves and Surplus
Note 3: Borrowings
Note 4: Provisions
Note 5: Trade Payables
Note 6: Other Payables
Note 7: Fixed Assets
Note 8: Current Assets

STATEMENT OF P&L
Note 9: Revenue from Operations
Note 10: Cost of Materials
Note 11: Employee Benefits
Note 12: Depreciation
```

### Scenario B: Large Company with Contingent Liabilities

**Setup:**
- Starting Note: `3`
- BS Notes: `18`
- P&L Notes: `8`
- Contingent Liabilities: Yes

**Expected Output:**
```
Balance Sheet: Notes 3-20 (18 notes)
P&L: Notes 21-28 (8 notes)
Contingent Liabilities: Note 29
```

### Scenario C: Holding Company Structure

**Setup:**
- Starting Note: `1`
- BS Notes: `12`
- P&L Notes: `5`
- Contingent Liabilities: Yes

**Expected Output:**
```
Parent Company:
  BS: Notes 1-12
  P&L: Notes 13-17
  Contingent: Note 18

Consolidated (reuse same range for cross-referenced notes)
```

---

## Displaying Notes in Financial Statements

### Note Appearance in Balance Sheet

**Column Layout:**
```
┌────────────────────────────────────────────┐
│ Sr. │ Particulars  │ Note │ Current │ Prev │
├────────────────────────────────────────────┤
│  1  │ EQUITY      │      │         │      │
│  2  │ Equity Cap  │ Note3│ 100 Cr  │ 100Cr│
│  3  │ Reserves    │ Note4│  50 Cr  │  40Cr│
│     │ Liabilities │      │         │      │
│  4  │ Borrowings  │ Note5│  75 Cr  │  70Cr│
└────────────────────────────────────────────┘
```

**Clicking on a Note:**
- If ledger details are available, a dialog opens
- Shows the breakdown of that note's constituents
- Displays ledger-wise or group-wise annexure

### Note Appearance in P&L

**Column Layout:**
```
┌────────────────────────────────────────────┐
│ Sr. │ Particulars  │ Note │ Current │ Prev │
├────────────────────────────────────────────┤
│  1  │ Revenue      │      │         │      │
│  2  │ Revenue Ops  │ Note1│ 500 Cr  │ 450Cr│
│  3  │ Other Income │ Note2│  10 Cr  │   5Cr│
│     │ Expenses     │      │         │      │
│  4  │ COGS         │ Note3│ 250 Cr  │ 225Cr│
│  5  │ Employee Ben │ Note4│  50 Cr  │  45Cr│
└────────────────────────────────────────────┘
```

---

## Constituents Displayed with Notes

### For Balance Sheet Notes

Each Balance Sheet note typically includes:

1. **Primary Ledger Breakdown**
   - Individual ledger accounts and their balances
   - Opening balance → Closing balance flow

2. **Group-wise Segregation**
   - Assets broken down by type (Fixed, Current, etc.)
   - Liabilities by nature (Long-term, Short-term)

3. **Comparative Information**
   - Current period balance
   - Previous period balance
   - Changes/movements

**Example - Note 1: Equity Share Capital**
```
Equity Share Capital
Opening Balance (1 Apr 2023):    100,000
Issues during the period:             -
Closing Balance (31 Mar 2024):   100,000

Breakdown:
  Equity Shares of ₹10 each:     100,000
```

### For P&L Notes

Each P&L note includes:

1. **Item Breakdown**
   - Sub-categories of revenue or expenses
   - Geographic or product-wise split

2. **Calculation Details**
   - How the total was derived
   - Supporting schedules

3. **Comparative Analysis**
   - Current year amount
   - Previous year amount
   - Variance analysis

**Example - Note 1: Revenue from Operations**
```
Revenue from Operations
Domestic Sales:              450 Cr
Export Sales:                 50 Cr
Total:                       500 Cr

Previous Year:               450 Cr
Growth:                       10%
```

---

## Configuration Persistence

### How Your Configuration is Saved

- **Per Engagement**: Settings are stored per engagement
- **Session Persistence**: Maintained during the current session
- **Re-apply**: Can be modified anytime via the configuration dialog

### Resetting to Defaults

If you need to reset:
1. Click "Configure Note Numbers" again
2. Enter new values
3. Click "Apply Settings"

---

## Advanced Features

### Using with Exports

When exporting financial statements:
1. Configure note numbers first
2. Notes are included in the export
3. Note columns appear in exported Excel files

### Contingent Liabilities Note

If enabled:
- Gets the last sequential note number
- Appears at the end of financial statements
- Used for disclosures of contingent liabilities

---

## Consistency Rules

### Important: Note Numbering Consistency

**Rule 1**: The same line item gets the same note number across all statements
```
✓ CORRECT: Revenue is Note 1 in both BS and P&L
✗ WRONG: Revenue is Note 1 in BS but Note 2 in P&L
```

**Rule 2**: Notes follow the order of line items
```
✓ CORRECT: Notes are sequential as items appear (1, 2, 3, 4...)
✗ WRONG: Notes jump around (1, 3, 5, 2...)
```

**Rule 3**: Zero-balance items don't break the sequence
```
✓ CORRECT: If item 2 has zero balance, skip it and go to next
✗ WRONG: Leave a gap in note numbering
```

---

## Troubleshooting

### Problem: Note numbers don't match between statements

**Solution:**
1. Use the same "Configure Note Numbers" dialog for both statements
2. Don't modify individual note numbers manually
3. The system maintains consistency automatically

### Problem: My line item isn't getting a note number

**Solution:**
- Check if the line item has a value in either period
- Items with zero balances in both periods don't get notes
- This is by design (matches audit standards)

### Problem: I want to skip a note number

**Solution:**
- Manually reduce the "Notes Count" by 1
- Reconfigure and notes will shift accordingly
- Or adjust after export if needed

### Problem: Contingent Liabilities note isn't appearing

**Solution:**
1. Make sure the checkbox is enabled in configuration
2. Click "Apply Settings"
3. The note number will appear in the summary card
4. Check that you have a contingent liabilities line item with a value

---

## Best Practices

✅ **Do:**
- Set note numbers before generating reports
- Use your firm's standard numbering scheme
- Document your numbering convention
- Review the preview before applying
- Keep notes sequential and logical

❌ **Don't:**
- Manually edit note numbers in exports (regenerate instead)
- Use non-sequential numbering without reason
- Change note numbers between related statements
- Forget to verify the preview

---

## Support & Questions

### Common Questions

**Q: Can I use non-sequential notes?**
A: Currently not supported. Use sequential numbering and adjust in Excel after export if needed.

**Q: Will notes update when I add new line items?**
A: Yes! Regenerate the statement and notes will be reassigned.

**Q: Can I have different note numbers for different sheets?**
A: Not recommended. Keep consistent numbering across all statements.

**Q: What about cross-references between notes?**
A: These can be added in the note content or during export customization.

---

## Related Documentation

- [NOTE_NUMBERING_GUIDE.md](./NOTE_NUMBERING_GUIDE.md) - Detailed reference
- [QUICK_START_MIGRATION.md](./QUICK_START_MIGRATION.md) - Getting started
- Trial Balance page documentation - Feature overview
