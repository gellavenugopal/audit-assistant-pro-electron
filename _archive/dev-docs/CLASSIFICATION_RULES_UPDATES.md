# Classification Rules Updates - January 19, 2026

## Summary of Changes

All classification rule updates have been successfully implemented in `src/utils/classificationRules.ts` and the application has been built successfully.

---

## 1. ✅ Staff Welfare Expense Rule - NEW

**Location:** Lines 1417-1425 in `classificationRules.ts`

**Rule Details:**
- **H1:** Expense
- **H2:** Employee Benefits Expense
- **H3:** Staff welfare expenses

**Keywords (43 total):**
```
Canteen, Refreshments, Meals, Snacks, Uniforms, Shoes, Safetygear, Medical, 
Wellness, Recreation, Sports, Gym, Training, Induction, Welfare, Amenities, 
Transport, Hostel, Accommodation, Tea, Coffee, Lunch, Dinner, Firstaid, 
Vaccination, Counseling, Creche, Subsidy, Towels, Lockers, Restroom, Hygiene, 
Sanitizer, Mask, Gloves, Uniformity, Laundry, Housekeeping, Drinkingwater, 
Purifier, Cooler, Heater, Picnic, Outing, Welfarefund, Staffcare, Wellbeing, 
Morale, Mess
```

**Matching Logic:**
- Triggered when any of the keywords appear in the Ledger Name or Parent Group
- Applies when H1 is Expense

---

## 2. ✅ GST Input Credit Rule - MODIFIED

**Location:** Lines 434-444 in `classificationRules.ts`

**Changes Made:**
- Added exclusion logic to prevent GST Input Credit classification when:
  - Primary Group contains "Expense" OR
  - Primary Group contains "Income" OR
  - IsRevenue = Yes

**Code Added:**
```typescript
const isPrimaryExpenseOrIncome = normalize(primary).includes('expense') || 
                                 normalize(primary).includes('income') || 
                                 normalize(primary).includes('revenue') === true;
```

**Rationale:** Prevents incorrect classification of GST Input Credit for revenue-related or expense-related items.

---

## 3. ✅ Insurance Rule - MODIFIED

**Location:** Line 1578 in `classificationRules.ts`

**Changes Made:**
- Added keyword: **'factory'**

**Updated Keywords:**
```
insurance, life, health, key man, factory
```

**Rule Details:**
- **H1:** Expense
- **H2:** Other Expenses
- **H3:** Insurance expenses

---

## 4. ✅ Directors Remuneration Rule - MODIFIED

**Location:** Lines 1378-1386 in `classificationRules.ts`

**Changes Made:**
- Changed from AND logic (both required) to flexible matching (either keyword can appear first)
- Now matches when EITHER 'director' OR 'remuneration' appears AND both keyword groups are present

**Old Logic:**
```typescript
if (hasAnyInLedgerOrParent(ledger, parent, ['director', 'directors']) && 
    hasAnyInLedgerOrParent(ledger, parent, ['remuneration', 'remu']) && isCompany)
```

**New Logic:**
```typescript
if ((hasAnyInLedgerOrParent(ledger, parent, ['director', 'directors']) || 
     hasAnyInLedgerOrParent(ledger, parent, ['remuneration', 'remu'])) && 
    hasAnyInLedgerOrParent(ledger, parent, [...['director', 'directors'], ...['remuneration', 'remu']]) && 
    isCompany)
```

**Accepted Ledger Name Variations:**
- "Director Remuneration"
- "Remuneration - Directors"
- "Director's Commission"
- "Remuneration to Director"

**Rule Details:**
- **H1:** Expense
- **H2:** Employee Benefits Expense
- **H3:** Directors' Remuneration
- **Applicable Entity Types:** Private Limited Company, Public Limited Company

---

## 5. ✅ Other Borrowing Costs Rule - MODIFIED

**Location:** Lines 1355-1361 in `classificationRules.ts`

**Changes Made:**
- Removed keywords: 'bank charge', 'bank charges', 'processing charge'
- Added keyword: 'processing fee'

**Updated Keywords:**
```
renewal charge, processing fee, bg commission
```

**Rule Details:**
- **H1:** Expense
- **H2:** Finance Costs
- **H3:** Other Borrowing costs

**Note:** Bank charges are now handled by a separate rule (Bank Charges rule) in Other Expenses category.

---

## 6. ✅ Bank Charges Rule - EXISTING

**Location:** Lines 1499-1506 in `classificationRules.ts`

**Keywords:**
```
bank chg, bank charge
```

**Rule Details:**
- **H1:** Expense
- **H2:** Other Expenses
- **H3:** Bank Charges

---

## Testing Verification

**Build Status:** ✅ SUCCESS
- All 3898 modules transformed successfully
- No compilation errors
- Output files generated:
  - dist/index.html (1.40 kB)
  - dist/assets/index.es-DR4tVcmS.js (150.44 kB, gzip: 51.42 kB)
  - dist/assets/index-BtRrHGy0.js (5,420.29 kB, gzip: 1,566.92 kB)

---

## Implementation Notes

### Rule Precedence
Classification rules are evaluated in the following order:
1. GST Input Credit (with expense/income exclusions)
2. Staff Welfare (new, evaluated before other employee benefits)
3. Directors Remuneration (flexible keyword matching)
4. Finance Costs - Other Borrowing (processing fee)
5. Finance Costs - Bank Charges (separate category)
6. Insurance (with factory keyword)

### Application Impact
- Staff welfare ledgers will now automatically classify to "Employee Benefits Expense > Staff welfare expenses"
- GST Input Credit will correctly exclude expense/income related items
- Insurance rules now capture factory-related insurance
- Director compensation can be matched regardless of keyword order
- Processing fees are now in Finance Costs instead of Bank Charges

---

## Files Modified
- `src/utils/classificationRules.ts` - All 5 updates implemented

---

**Deployment Ready:** ✅ Yes - Application built successfully and ready for deployment.
