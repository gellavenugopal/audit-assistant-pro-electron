import openpyxl

wb = openpyxl.load_workbook(r'C:\ICAI_Audit_Tool\nw\SRM_Pro\Excel for AI.xlsx')
tb_sheet = wb['TrialBalance']

headers = [cell.value for cell in tb_sheet[1]]
name_col = headers.index('Name')

hier_cols = ['Parent', 'Group.$Parent', 'Group.$Parent.1', 'Group.$Parent.2', 
             'Group.$Parent.3', 'Group.$Parent.4', 'Group.$Parent.5']

print("Checking hierarchy columns for first 3 rows:")
print("=" * 80)

for row_idx, row in enumerate(tb_sheet.iter_rows(min_row=2, values_only=True), start=1):
    if row_idx > 3:
        break
        
    name = row[name_col]
    print(f"\nRow {row_idx}: {name}")
    
    for col in hier_cols:
        if col in headers:
            idx = headers.index(col)
            val = row[idx]
            if val:
                # Check for Primary marker
                has_primary = '_x0004_ Primary' in str(val)
                print(f"  {col}: {repr(val)[:60]} ... (has Primary: {has_primary})")
                
                # Show byte representation
                if has_primary:
                    print(f"    -> Bytes: {val.encode('unicode_escape').decode('ascii')}")
