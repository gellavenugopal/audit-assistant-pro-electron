# Financial Statement Note Numbering Guide

## Overview

The Financial Statement Note Numbering system allows you to configure and assign note numbers to both Balance Sheet (BS) and Profit & Loss (P&L) statement line items in a sequential and organized manner.

## How It Works

### 1. **Opening the Configuration Dialog**

- Navigate to either the **Balance Sheet** or **P&L** tab
- Click the **"Configure Note Numbers"** button in the toolbar
- The configuration dialog will open with a preview of how notes will be numbered

### 2. **Setting Note Numbers**

The dialog prompts you for:

- **Starting Note Number**: The first note number to use (e.g., 1, 3, 5)
- **Balance Sheet (BS) Notes Count**: Number of notes to allocate for BS line items
- **P&L Notes Count**: Number of notes to allocate for P&L line items
- **Include Contingent Liabilities**: Optional checkbox to add a contingent liabilities note at the end

#### Example Configuration

If you set:
- Starting Note: `1`
- BS Notes Count: `15`
- P&L Notes Count: `7`
- Include Contingent Liabilities: `Yes`

You will get:
- **Balance Sheet Notes**: 1 to 15 (15 notes)
- **P&L Notes**: 16 to 22 (7 notes)
- **Contingent Liabilities**: Note 23

### 3. **Note Assignment Rules**

Notes are assigned sequentially to line items based on these rules:

1. **Only items with values** receive note numbers
2. **Line items are numbered in order** as they appear in the financial statement
3. **Skipped items** (those with zero values in both periods) do not receive note numbers
4. **Contingent liabilities** (if enabled) gets the final note number after all P&L notes

## Features

### Visual Preview

The configuration dialog provides:

- **Number Range Preview**: Shows which notes are allocated to each statement
- **Color-coded Badges**: 
  - 🔵 Blue for Balance Sheet Notes
  - 🟢 Green for P&L Notes
  - 🟠 Orange for Contingent Liabilities Note
- **Sequential Display**: Lists all assigned note numbers for easy verification

### Real-time Configuration Summary

Once configured, the statement tabs display a summary card showing:

```
Balance Sheet Notes:     1 - 15 (15 notes)
P&L Notes:              16 - 22 (7 notes)
Contingent Liabilities: Note 23
```

### Note Display in Statements

- Notes appear in the **"Note" column** of the financial statement tables
- Notes only appear for line items that have values
- Clicking on a note number may show ledger-wise annexure details (if available)

## Common Scenarios

### Scenario 1: Standard Notes Layout

**Typical Indian Company Setup:**
- Starting Note: `3`
- BS Notes Count: `16`
- P&L Notes Count: `6`
- Contingent Liabilities: No

**Result:**
- BS Notes: 3-18
- P&L Notes: 19-24

### Scenario 2: Company with Contingent Liabilities

**Starting Note: `1`**
- BS Notes Count: `8`
- P&L Notes Count: `4`
- Contingent Liabilities: Yes

**Result:**
- BS Notes: 1-8
- P&L Notes: 9-12
- Contingent Liabilities: Note 13

### Scenario 3: Consolidated Financials

**Starting Note: `10`**
- BS Notes Count: `20`
- P&L Notes Count: `10`
- Contingent Liabilities: Yes

**Result:**
- BS Notes: 10-29
- P&L Notes: 30-39
- Contingent Liabilities: Note 40

## Consistency Between Statements

### Important Note

The note numbers must be consistent between:
- The same line item's note in Balance Sheet
- The corresponding note in P&L

**Example:**
- If "Revenue from Operations" is Note 1 in the Balance Sheet, it should be Note 1 when referenced in the P&L statement

The system automatically maintains this consistency when you use the "Configure Note Numbers" dialog.

## Displaying Notes with Constituents

### Balance Sheet Notes Display

Each note in the Balance Sheet includes:

1. **Note Number** (e.g., "Note 1")
2. **Particulars** of the line item (e.g., "Equity Share Capital")
3. **Constituent Details**: Breakdown by:
   - Ledger names and amounts
   - Group classifications
   - Opening and closing balances

### P&L Notes Display

Each note in the P&L includes:

1. **Note Number**
2. **Expense/Income Item** (e.g., "Revenue from Operations")
3. **Constituent Details**: 
   - Revenue stream breakdown
   - Expense category breakdown
   - Comparative amounts (current vs. previous period)

## Technical Details

### Note Numbering Algorithm

```
For Balance Sheet:
- Note N = BS Starting Note + (Sequential Index of BS Line Items with Values)
- Range: BS_START to BS_START + BS_COUNT - 1

For P&L:
- Note N = P&L Starting Note + (Sequential Index of P&L Line Items with Values)
- Range: P&L_START to P&L_START + P&L_COUNT - 1

For Contingent Liabilities (if enabled):
- Note N = BS_START + BS_COUNT + P&L_COUNT
```

### Configuration Storage

The note configuration is temporarily maintained for the current engagement and can be:
- Modified anytime by clicking "Configure Note Numbers"
- Viewed in the summary card above each statement
- Used consistently across exports

## Keyboard Shortcuts

- **Alt + N**: Open Note Number Configuration (when on Balance Sheet or P&L tab)

## Best Practices

1. **Set notes at the beginning**: Configure your note numbers before creating exports
2. **Follow standards**: Use numbering that matches your audit firm's standards
3. **Review preview**: Always verify the preview before applying settings
4. **Document your choice**: Note your numbering scheme in the engagement details
5. **Maintain consistency**: Use the same configuration for all related reports

## Troubleshooting

### Q: Why doesn't my line item have a note number?
**A:** The system only assigns notes to line items with values in either the current or previous period. If both are zero, the item won't receive a note.

### Q: Can I change note numbers after creating a report?
**A:** Yes! Reconfigure the note numbers and regenerate the report. The new numbers will be applied.

### Q: How are zero-value items handled?
**A:** Items with zero balances in both periods are still displayed in the statement but do not receive note numbers. This is by design.

### Q: Can I use non-sequential note numbers?
**A:** Currently, the system supports sequential numbering. For non-sequential numbering, you would need to manually adjust after export.

## Related Components

- **Balance Sheet (ScheduleIIIBalanceSheet)**: Displays notes for BS line items
- **P&L (ScheduleIIIProfitLoss)**: Displays notes for P&L line items
- **Note Number Utility** (`/src/utils/noteNumbering.ts`): Core numbering logic
- **Enhanced Settings Dialog** (`EnhancedNoteNumberSettings`): Configuration interface
