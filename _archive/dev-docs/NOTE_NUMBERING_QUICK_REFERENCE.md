# Financial Statement Note Numbering - Quick Reference

## 🎯 What It Does

Automatically assigns sequential note numbers to Balance Sheet and P&L statement line items based on your configuration.

## 🚀 Quick Start (30 seconds)

1. **Balance Sheet Tab** → Click **"Configure Note Numbers"**
2. **Enter:**
   - Starting Note: `1` (or your preference)
   - BS Notes Count: `15`
   - P&L Notes Count: `7`
   - Contingent Liabilities: Yes/No
3. **Click "Apply Settings"** ✓
4. **Done!** Notes are assigned automatically

## 📊 Result Example

### Input:
- Start: 1, BS Count: 15, P&L Count: 7, Contingent: Yes

### Output:
```
Balance Sheet:       Notes 1-15
P&L:                Notes 16-22
Contingent Liab:     Note 23
```

## 📍 Where to Find It

| Location | Action |
|----------|--------|
| Balance Sheet Tab | Click "Configure Note Numbers" button |
| P&L Tab | Click "Configure Note Numbers" button |
| Both Tabs | View summary card above statements |

## 📝 How Notes Are Numbered

✅ **Get a Note:** Line item has value in current OR previous period  
❌ **No Note:** Line item has zero in both periods  
↔️ **Sequential:** Numbered as items appear (1, 2, 3...)  
⏭️ **No Gaps:** Zero items don't break the sequence  

## ⚙️ Configuration Options

| Setting | Range | Default | Example |
|---------|-------|---------|---------|
| Starting Note | 1+ | 3 | 1, 3, 5, 10 |
| BS Notes Count | 0+ | 15 | 10-20 |
| P&L Notes Count | 0+ | 7 | 5-10 |
| Contingent Liab | Yes/No | No | Yes |

## 🎨 Visual Indicators

```
🔵 BLUE   = Balance Sheet Notes
🟢 GREEN  = P&L Notes
🟠 ORANGE = Contingent Liabilities Note
```

## 📋 Display Format

### Balance Sheet
```
Equity Share Capital        [Note 1] ₹100 Cr
Reserves and Surplus        [Note 2] ₹50 Cr
Borrowings                  [Note 3] ₹75 Cr
```

### P&L
```
Revenue from Operations     [Note 1] ₹500 Cr
Cost of Materials           [Note 2] ₹250 Cr
Employee Benefits           [Note 3] ₹50 Cr
```

## ✔️ Consistency Rules

| Rule | ✓ Correct | ✗ Wrong |
|------|-----------|---------|
| Same item same note | Revenue = Note 1 everywhere | Revenue = Note 1 in BS, Note 2 in P&L |
| Sequential order | 1, 2, 3, 4... | 1, 3, 5, 2... |
| Skip zeros | 1, 2, 3, 4... (skipping blanks) | 1, 2, _, 3... (with gaps) |

## 🔧 Common Configurations

### Small Company
```
Start: 1, BS: 8, P&L: 4, CL: No
Result: BS (1-8), P&L (9-12)
```

### Large Company
```
Start: 3, BS: 16, P&L: 6, CL: No
Result: BS (3-18), P&L (19-24)
```

### With Contingencies
```
Start: 1, BS: 12, P&L: 5, CL: Yes
Result: BS (1-12), P&L (13-17), CL (18)
```

## ❓ FAQ

**Q: Can I change notes later?**  
A: Yes, reconfigure anytime with the dialog

**Q: Do notes persist after refresh?**  
A: No, they're reset. (Future: will be saved to database)

**Q: Can I have different numbers between sheets?**  
A: Not recommended - use one dialog for both

**Q: What if I want to skip a number?**  
A: Reduce the count by 1, or adjust manually in Excel after export

**Q: Why doesn't this item have a note?**  
A: It has zero balance in both periods. Only items with values get notes.

## 🖱️ Clicking Notes

- **Click a Note Number** → View ledger-wise breakdown (if available)
- **Dialog Opens** → Shows constituents of that note
- **Breakdown Displayed** → Group-wise or ledger-wise split

## 📥 When Exporting

1. ✅ Configure notes BEFORE exporting
2. ✅ Note numbers appear in Excel export
3. ✅ Summary card shows current configuration
4. ✅ Export includes all notes with line items

## ⌨️ Keyboard

- **Alt + N**: (Future) Open note configuration
- **Tab**: Navigate dialog fields
- **Enter**: Apply settings

## 🎓 Best Practices

✅ Set notes at the start of engagement  
✅ Follow your firm's standard numbering  
✅ Review preview before applying  
✅ Keep all statements consistent  
✅ Document your configuration  

❌ Don't manually edit notes in statements  
❌ Don't use non-sequential numbers (without reason)  
❌ Don't change notes between related reports  
❌ Don't forget to verify the preview  

## 📂 Files Involved

- `src/pages/TrialBalance.tsx` - Main integration
- `src/components/trial-balance/EnhancedNoteNumberSettings.tsx` - Dialog
- `src/components/trial-balance/NoteNumberSummary.tsx` - Summary card
- `src/utils/noteNumbering.ts` - Core logic
- `src/components/trial-balance/ScheduleIIIBalanceSheet.tsx` - BS display
- `src/components/trial-balance/ScheduleIIIProfitLoss.tsx` - P&L display

## 📖 Full Documentation

- `NOTE_NUMBERING_GUIDE.md` - Complete reference
- `NOTE_NUMBERING_IMPLEMENTATION.md` - Step-by-step guide
- `DEVELOPER_NOTE_NUMBERING.md` - Technical details

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Notes not showing | Check if items have values |
| Wrong ranges | Reconfigure and verify preview |
| Dialog won't open | Ensure you're on BS or P&L tab |
| Notes mismatched | Use same dialog for both statements |

## 💡 Pro Tips

- **Preset Configuration**: Note your firm's standard (e.g., "Start: 3, BS: 16, P&L: 6")
- **Batch Updates**: Set once, apply to all reports in engagement
- **Audit Trail**: Screenshot the summary card for your records
- **Cross-Reference**: Use these notes for cross-reference in disclosures

---

**Last Updated:** January 8, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
