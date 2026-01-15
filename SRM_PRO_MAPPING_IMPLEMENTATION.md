# SRM Pro Mapping Implementation

## Overview
Implemented automatic mapping functionality for the SRM Pro module using a mapping sheet with support for different assessee types.

## Features Implemented

### 1. Mapping Sheet Integration
- **Location**: `C:\ICAI_Audit_Tool\nw\SRM_Pro\Mapping.xlsx`
- **Copied to**: `public/SRM_Pro/Mapping.xlsx` for browser access
- **Auto-loaded**: Mapping file loads automatically when the app starts
- **Structure**: 
  - Column 0: Constitution (3=Corporate, 4=Non-Corporate, 5=LLP)
  - Column 1: Level 1 (e.g., "EQUITY AND LIABILITIES")
  - Column 2: Level 2 (e.g., "Shareholders' funds") - **Used for matching**
  - Column 3: Level 3 (e.g., "Share capital") - **Used as mapped category**
  - Additional columns for further hierarchy levels

### 2. Assessee Type Selection
- **UI Component**: Dropdown added in Upload tab
- **Options**:
  - Corporate (Constitution = 3)
  - Non-Corporate (Constitution = 4)
  - LLP (Constitution = 5)
- **Default**: Corporate
- **Indicator**: Green checkmark shows when mapping file is loaded

### 3. Mapping Logic
The mapping works by:
1. **Extract 2nd Parent After Primary**: 
   - Traverses the Group hierarchy columns from right to left
   - Finds the column containing "Primary" marker (`\x04`)
   - Takes the next parent level to the left as the matching key
   
2. **Match Against Mapping Sheet**:
   - Cleans and normalizes the 2nd parent name (lowercase, trim, single spaces)
   - Looks up in mapping sheet's Level 2 column (column 2)
   - Filters by selected assessee type (Corporate/Non-Corporate/LLP)
   
3. **Apply Mapped Category**:
   - Uses Level 3 value (column 3) as the mapped category
   - Falls back to "NOT MAPPED" if no match found

### 4. Updated Processing Flow
```
Trial Balance Upload
  ↓
Extract hierarchy from Group.$Parent columns
  ↓
Identify 2nd parent after "Primary"
  ↓
Match against mapping sheet (filtered by assessee type)
  ↓
Apply mapped category or "NOT MAPPED"
  ↓
Display results with mapping statistics
```

## Code Changes

### Files Modified:
1. **src/pages/SrmPro.tsx**
   - Added state: `assesseeType`, `mappingData`, `mappingLoaded`
   - Added useEffect to load mapping file on mount
   - Added Assessee Type dropdown in upload UI
   - Updated handleFileUpload to pass mapping data and assessee type
   - Enhanced toast message to show mapped/unmapped counts

2. **src/utils/srmProcessor.ts**
   - Added `extract2ndParentAfterPrimary()` helper function
   - Updated `processAccountingData()` signature to accept mapping data and assessee type
   - Built mapping lookup from mapping data
   - Applied mapping logic during processing
   - Added "2nd Parent After Primary" field for debugging
   - Enhanced Logic Trace field

### Files Created:
- `test-excel-structure.mjs` - Tests Excel file structure
- `test-full-processing.mjs` - Tests complete processing logic
- `test-mapping-structure.mjs` - Examines mapping file structure
- `test-mapping-logic.mjs` - Verifies mapping logic works correctly

## Testing Results

### Test Run (test-mapping-logic.mjs):
```
Trial Balance rows: 1,289
Mapping rules: 1,009
Mapping lookup entries: 15 (for Corporate)
Sample: All 20 test rows successfully mapped to "Uncategorised Current assets"
Success rate: 100%
```

### Example Mapping:
```
Ledger: "Sundry Debtors > Abdul Jabbar"
Parent: "Sundry Debtors"
2nd Parent After Primary: "Current Assets"
Mapped Category: "Uncategorised Current assets"
```

## User Workflow

1. **Start App**: Mapping file loads automatically in background
2. **Upload Tab**: 
   - Select Period (Current/Previous Year)
   - Enter Financial Year (e.g., 2024)
   - **Select Assessee Type** (Corporate/Non-Corporate/LLP)
   - Upload Trial Balance Excel file
3. **Processing**: 
   - 2nd parent extracted from hierarchy
   - Matched against mapping sheet
   - Categories applied automatically
4. **Results**: 
   - Toast shows: "X ledgers imported (Y mapped, Z unmapped)"
   - Mapped Category column shows actual categories
   - Logic Trace shows mapping details for debugging

## Benefits

1. ✅ **Automatic Mapping**: No manual category assignment needed
2. ✅ **Flexible**: Supports 3 assessee types with different rules
3. ✅ **Transparent**: Logic Trace field shows how mapping was determined
4. ✅ **Maintainable**: Mapping rules in external Excel file, easy to update
5. ✅ **Robust**: Handles missing data gracefully with "NOT MAPPED" fallback

## Next Steps

1. User can update mapping rules by editing `SRM_Pro/Mapping.xlsx`
2. Add more detailed mapping rules for specific account hierarchies
3. Consider adding manual override capability for individual ledgers
4. Add export functionality to save mapped trial balance

## Configuration

### Mapping File Location:
- **Source**: `C:\ICAI_Audit_Tool\nw\SRM_Pro\Mapping.xlsx`
- **Public**: `C:\ICAI_Audit_Tool\nw\public\SRM_Pro\Mapping.xlsx`
- **URL**: Loaded from `/SRM_Pro/Mapping.xlsx` when app starts

### Assessee Type Values:
- **3**: Corporate (Schedule III Part I)
- **4**: Non-Corporate entities (Schedule III Part II)
- **5**: LLP (Schedule III Part III)
