Setup Detail Explanation
=========================

Purpose
-------
This document explains the logic implemented in `AuditReportSetup.tsx`. It describes the data flow, decision rules (especially CARO applicability), cross-checks with the Trial Balance, UI steps, and important edge cases and recommendations.

Key props and hooks
-------------------
- Props: `engagementId`, `setup`, `loading`, `saveSetup`, `refetchSetup`, `onSetupComplete`.
- Hooks used:
  - `usePartners()` — list of partners for signing selection.
  - `useTrialBalance(engagementId)` — trial balance lines for cross-checking paid-up capital, reserves, and borrowings.

UI flow and steps
-----------------
The component implements a 3-step guided setup:

1. Client Profile (Step 1)
   - Collects: `company_cin`, `company_type`, `registered_office`, `nature_of_business`, `is_standalone` (standalone/consolidated), `accounting_framework` (AS / Ind AS).
   - Saves these fields via `saveSetup` and then calls `refetchSetup` before moving to Step 2.

2. CARO Applicability Test (Step 2)
   - For private companies, prompts user to enter `paid_up_capital`, `reserves_surplus`, and `borrowings_amount` (borrowings from banks/FIs).
   - Performs a Trial Balance cross-check to compute TB-derived totals for Equity, Reserves, and Borrowings (including Short Term Borrowings) and highlights any differences.
   - Uses `calculateCAROApplicability()` to decide CARO applicability and saves several fields, sets `setup_completed: true`, and `report_status: 'in_progress'`.

3. Complete & Report Details (Step 3)
   - Shows a summary of selections and allows entering/saving signing details: `signing_partner_id`, `report_date`, `report_city`, and `udin`.
   - User can save these details and call `onSetupComplete` to proceed to CARO reporting.

Form state and persistence
-------------------------
- `formData` holds a staged copy of the setup fields and is initialized from the `setup` prop via `useEffect`.
- `handleNextStep` performs the step-wise saves described above. Each save calls `saveSetup(...)` and then `refetchSetup()` to refresh the persisted `setup`.

Trial Balance cross-check logic
------------------------------
- The code maps TB lines to three FS areas: `Equity`, `Reserves`, and `Borrowings` (including `Short Term Borrowings`).
- It sums the absolute `closing_balance` values per area to produce `paidUpCapitalTB`, `reservesSurplusTB`, and `borrowingsTB`.
- Diffs are computed between TB totals and user inputs; `hasTbMismatch` is true when any diff > 1 rupee (i.e., > 1), and a warning is shown.
- Note: TB cross-check is advisory — user-entered values are authoritative for the threshold test unless the user updates them.

CARO applicability algorithm (`calculateCAROApplicability`)
--------------------------------------------------------
1. Exclusions by company type: If `company_type` is one of `['banking','insurance','section_8','opc']`, return `'not_applicable'`.
2. Private company threshold test: If `is_private_company` is true, apply these thresholds:
   - `paid_up_capital <= 1,00,00,000` (₹1 crore)
   - `reserves_surplus <= 1,00,00,000` (₹1 crore)
   - `borrowings_amount <= 1,00,00,000` (₹1 crore)
   - `totalCapital = paid_up_capital + reserves_surplus <= 2,00,00,000` (₹2 crores)
   If all of the above are satisfied, return `'not_applicable'`.
3. Consolidated accounts rule: If `is_standalone` is false (consolidated), return `'cfs_only_xxi'` (meaning only clause 3(xxi) applies for consolidated FS).
4. Otherwise, return `'applicable'`.

Saved setup fields (important ones)
----------------------------------
- From Step 1: `company_cin`, `registered_office`, `nature_of_business`, `is_standalone`, `accounting_framework`, `company_type`.
- From Step 2: `is_private_company`, `paid_up_capital`, `reserves_surplus`, `borrowings_amount`, `caro_applicable_status`, `caro_exclusion_reason` (if `not_applicable`), `setup_completed`, `report_status`.
- From Step 3: `signing_partner_id`, `report_date`, `report_city`, `udin`.

Visual feedback and badges
-------------------------
- `getApplicabilityBadge()` maps the `calculateCAROApplicability()` result to UI badges:
  - `'applicable'` → green badge: CARO Applicable
  - `'not_applicable'` → secondary badge: CARO Not Applicable
  - `'cfs_only_xxi'` → outline badge: CFS - Only Clause 3(xxi)
  - default → Pending Evaluation

Edge cases and behavior notes
-----------------------------
- TB mapping missing: if the Trial Balance mapping does not include the required FS areas, the TB cross-check UI shows guidance to map TB to Schedule III.
- Tiny numeric differences are tolerated (threshold of > ₹1 needed to trigger mismatch warning).
- The private company thresholds are applied only when `is_private_company` is checked — otherwise the company may still be CARO-applicable even if capital/reserves are small.
- For consolidated accounts the logic short-circuits to `'cfs_only_xxi'` — this follows the code's intent to include only clause 3(xxi) for consolidated FS.
- `caro_exclusion_reason` is stored only when the result is `'not_applicable'`; otherwise it is saved as `null`.

Recommendations / possible improvements
-------------------------------------
- Make threshold constants configurable (avoid magic numbers in code) so limits can be adjusted or tested.
- Expose `calculateCAROApplicability` as a pure utility function and add unit tests for the edge conditions (private company boundary values, consolidated vs standalone, excluded company types).
- Consider a larger tolerance for TB mismatch (e.g., 0.5% or ₹100) to avoid noise from rounding or mapping differences.
- If TB mapping is reliable, optionally auto-fill the form fields from TB totals with an explicit user confirmation step.

Where this data is used
-----------------------
- `caro_applicable_status` is consumed by `ReportExport.tsx` to determine which CARO clauses to include and to compute completion percentage.
- Signing details (`signing_partner_id`, `report_city`, `report_date`, `udin`) are inserted into the report signature blocks (PDF and Word exports).

Contact
-------
If you want this turned into inline comments in the component or converted to unit tests, tell me which option you prefer and I will implement it.
