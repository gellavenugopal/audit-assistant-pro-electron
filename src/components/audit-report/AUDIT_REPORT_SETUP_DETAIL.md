# Audit Report Setup — Detailed Logic Guide

## Overview

`AuditReportSetup.tsx` implements a guided 3-step configuration workflow for audit report generation. It collects client information, determines CARO 2020 applicability, and configures signing details. The component is critical for establishing the foundation of all audit reports.

---

## Architecture

### Component Props

```typescript
interface AuditReportSetupProps {
  engagementId: string;
  setup: AuditReportSetup | null;           // Current setup data from DB
  loading: boolean;                          // Loading state
  saveSetup: (data: Partial<AuditReportSetup>) => Promise<...>;  // Persist changes
  refetchSetup: () => Promise<void>;         // Reload from DB
  onSetupComplete: () => void;               // Callback to proceed to reporting
}
```

### External Dependencies

- **`usePartners()`** — Retrieves list of CA partners; used to populate signing partner dropdown
- **`useTrialBalance(engagementId)`** — Fetches trial balance lines for cross-checking balance sheet amounts
- **State management** — `formData` (local staging) vs `setup` (from DB via props)

---

## Step-by-Step Workflow

### Step 1: Client Profile

**Purpose:** Collect company metadata and accounting framework.

**Fields captured:**
- `company_cin` — Corporate Identification Number
- `company_type` — Selected from: Public Company, Private Company, OPC, Small Company, Section 8, Banking, Insurance, NBFC
- `registered_office` — Full address
- `nature_of_business` — Business description (e.g., Manufacturing, Trading, Services)
- `is_standalone` — Radio choice: Standalone vs Consolidated Financial Statements
- `accounting_framework` — Radio choice: AS (Accounting Standards) vs Ind AS (Indian Accounting Standards)

**Database saves:**
```javascript
await saveSetup({
  company_cin,
  registered_office,
  nature_of_business,
  is_standalone,
  accounting_framework,
  company_type
})
```

**After save:** Component calls `refetchSetup()` to reload and then advances to Step 2.

---

### Step 2: CARO Applicability Test

**Purpose:** Determine whether CARO 2020 regulations apply and establish threshold limits.

#### Conditional Input: Private Company Threshold Test

When `is_private_company` checkbox is checked, user enters three numeric fields:

| Field | Threshold | Notes |
|-------|-----------|-------|
| `paid_up_capital` | ≤ ₹1 crore | Paid-up capital of the company |
| `reserves_surplus` | ≤ ₹1 crore | Reserves and surplus on balance sheet |
| `borrowings_amount` | ≤ ₹1 crore | Borrowings from banks and FIs only |

**Total capital check:** `paid_up_capital + reserves_surplus ≤ ₹2 crores`

#### Trial Balance Cross-Check (Automatic)

When TB mapping exists, the component automatically computes reference totals from trial balance:

1. **Filters TB lines** by FS area: Equity, Reserves, Borrowings, Short Term Borrowings
2. **Sums by area:**
   - `paidUpCapitalTB = SUM(Equity closing_balance)`
   - `reservesSurplusTB = SUM(Reserves closing_balance)`
   - `borrowingsTB = SUM(Borrowings + Short Term Borrowings closing_balance)`
3. **Calculates differences** with user inputs
4. **Displays alert** if any difference > ₹1 (allows user to reconcile or proceed)

**Example cross-check display:**
```
Trial Balance cross-check (mapped Balance Sheet)
• Paid-up Capital: TB ₹5,00,00,000 | Entered ₹4,98,00,000 | Diff ₹2,00,000
• Reserves & Surplus: TB ₹3,50,00,000 | Entered ₹3,50,00,000 | Diff ₹0
• Borrowings (TB total): TB ₹2,00,00,000 | Entered ₹2,00,50,000 | Diff ₹50,000
```

#### CARO Applicability Algorithm

```javascript
function calculateCAROApplicability() {
  // Rule 1: Excluded company types
  const excludedTypes = ['banking', 'insurance', 'section_8', 'opc'];
  if (excludedTypes.includes(company_type)) {
    return 'not_applicable';
  }

  // Rule 2: Private company thresholds
  if (is_private_company) {
    if (
      paid_up_capital <= 10000000 &&           // ₹1 crore
      reserves_surplus <= 10000000 &&          // ₹1 crore
      borrowings_amount <= 10000000 &&         // ₹1 crore
      (paid_up_capital + reserves_surplus) <= 20000000  // ₹2 crores
    ) {
      return 'not_applicable';
    }
  }

  // Rule 3: Consolidated financial statements
  if (!is_standalone) {
    return 'cfs_only_xxi';  // Only clause 3(xxi) applies
  }

  // Default
  return 'applicable';
}
```

**Result badges:**
- `'applicable'` → ✓ CARO Applicable (green)
- `'not_applicable'` → ⚠ CARO Not Applicable (secondary)
- `'cfs_only_xxi'` → ℹ CFS - Only Clause 3(xxi) (outline)

**Database saves on completion:**
```javascript
await saveSetup({
  is_private_company,
  paid_up_capital,
  reserves_surplus,
  borrowings_amount,
  caro_applicable_status,        // Result of algorithm
  caro_exclusion_reason: status === 'not_applicable' ? reason : null,
  setup_completed: true,         // Flag for Step 3 availability
  report_status: 'in_progress'
})
```

---

### Step 3: Complete & Report Details

**Purpose:** Configure signing partner and audit report metadata (date, place, UDIN).

**Summary display:**
- Company type (from Step 1)
- Financial statements type (Standalone / Consolidated)
- Accounting framework (AS / Ind AS)
- CARO status badge (result of Step 2)

**Fields to configure:**

| Field | Type | Purpose |
|-------|------|---------|
| `signing_partner_id` | Select (from `usePartners()`) | CA partner signing the report |
| `report_date` | Date input | Date of audit report |
| `report_city` | Text | "Place" printed on signature block |
| `udin` | Text | Unique Document Identification Number |

**Database save:**
```javascript
await saveSetup({
  signing_partner_id: formData.signing_partner_id || null,
  report_date: formData.report_date || null,
  report_city: formData.report_city || null,
  udin: formData.udin || null
})
```

**Workflow completion:** User clicks "Proceed to CARO Reporting" → calls `onSetupComplete()` callback.

---

## Key Algorithms & Logic

### Trial Balance Mapping

The `tbCrosscheck` is computed as a memoized value:

```javascript
const tbCrosscheck = useMemo(() => {
  const relevant = tbLines.filter(l => 
    ['Equity', 'Reserves', 'Borrowings', 'Short Term Borrowings'].includes(l.fs_area)
  );
  
  if (relevant.length === 0) {
    return { available: false, paidUpCapitalTB: 0, ... };
  }
  
  const sumByFsArea = (fsArea) =>
    relevant
      .filter(l => l.fs_area === fsArea)
      .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
  
  return {
    available: true,
    paidUpCapitalTB: sumByFsArea('Equity'),
    reservesSurplusTB: sumByFsArea('Reserves'),
    borrowingsTB: sumByFsArea('Borrowings') + sumByFsArea('Short Term Borrowings')
  };
}, [tbLines]);
```

### Threshold Validation

```javascript
const hasTbMismatch = 
  tbCrosscheck.available && 
  (paidUpDiff > 1 || reservesDiff > 1 || borrowingsDiff > 1);
```

Tolerance: **> ₹1** (small rounding differences ignored).

---

## Data Flow

```
Props: setup → useEffect → formData (initialization)
                ↓
         User edits formData
                ↓
         handleNextStep() → saveSetup() → refetchSetup()
                ↓
         props.setup updated → re-render with new data
```

---

## Edge Cases & Important Notes

### 1. TB Mapping Missing
- If FS areas (Equity, Reserves, Borrowings) are not mapped in trial balance, UI shows:
  ```
  Trial Balance mapping not found... Map your Trial Balance to Schedule III to enable auto cross-check.
  ```
- Cross-check is advisory only; user can proceed without it.

### 2. Consolidated Accounts
- When `is_standalone = false`, algorithm immediately returns `'cfs_only_xxi'`.
- Does not check thresholds or company type exclusions.
- User sees Alert: "For Consolidated FS, CARO 2020 does not apply except for Clause 3(xxi)..."

### 3. Numeric Coercion
- Input fields use `parseFloat(...) || 0` to handle empty strings.
- TB totals use `Math.abs(Number(closing_balance))` to ensure positive amounts.

### 4. Private Company Short-circuit
- Private company exclusion applies **only** if **all four** conditions are met:
  - Paid-up capital ≤ ₹1 cr
  - Reserves ≤ ₹1 cr
  - Borrowings ≤ ₹1 cr
  - Total capital ≤ ₹2 cr
- If any threshold is exceeded, CARO becomes applicable (assuming standalone and not an excluded type).

### 5. Exclusion Reason Saving
- `caro_exclusion_reason` is persisted **only** when result is `'not_applicable'`.
- Otherwise set to `null` to avoid stale data.

---

## Data Contract

### Expected Input: `setup` prop (from DB)
```typescript
{
  company_cin?: string;
  registered_office?: string;
  nature_of_business?: string;
  is_standalone?: boolean;
  accounting_framework?: string;
  company_type?: string;
  is_private_company?: boolean;
  paid_up_capital?: number;
  reserves_surplus?: number;
  borrowings_amount?: number;
  caro_applicable_status?: string;  // 'applicable' | 'not_applicable' | 'cfs_only_xxi' | 'pending'
  caro_exclusion_reason?: string;
  signing_partner_id?: string;
  report_date?: string;
  report_city?: string;
  udin?: string;
  setup_completed?: boolean;
  report_status?: string;
}
```

### Expected Output: saveSetup() calls
- Partial objects saved incrementally (not all fields at once).
- Each `saveSetup` call should persist to DB and be retrievable on `refetchSetup`.

---

## Consumer Usage

### ReportExport.tsx
Uses `caro_applicable_status` to:
- Filter applicable CARO clauses (3(i) through 3(xxi))
- Calculate completion percentage
- Decide whether to include Annexure B in exports

### MainReportEditor.tsx
Uses signing details to auto-populate signature block fields:
- `setup.signing_partner_id` → lookup partner name, membership number
- `setup.report_date`, `setup.report_city`, `setup.udin` → directly inserted into signatures

---

## Testing & Validation Recommendations

### Unit Tests for `calculateCAROApplicability`
- Test excluded company types
- Test private company boundary values (at threshold, just below, just above)
- Test consolidated accounts short-circuit
- Test mixed conditions

### TB Cross-Check Tolerance
- Consider: should tolerance be absolute (₹1) or percentage-based (0.5%)?
- Current: absolute ₹1 may be too strict for large companies.

### Auto-Fill from TB
- Optional enhancement: auto-populate paid_up_capital, reserves, borrowings from TB totals with user confirmation.

---

## Summary Checklist

Before proceeding to CARO reporting, verify:

- [ ] Step 1 complete: company_cin, company_type, registered_office, nature_of_business saved
- [ ] Step 2 complete: CARO applicability determined and saved
- [ ] TB cross-check reviewed (if applicable)
- [ ] Step 3 complete: signing_partner_id, report_date, report_city, udin filled and saved
- [ ] setup_completed = true in database
- [ ] report_status = 'in_progress' in database

---

**Last Updated:** 2026-01-06  
**Component:** `src/components/audit-report/AuditReportSetup.tsx`
