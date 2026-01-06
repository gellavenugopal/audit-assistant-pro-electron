import pyodbc
import pandas as pd

# 1. Connection
try:
    conn = pyodbc.connect(Driver="{Tally ODBC Driver64}", Server="Localhost", Port="9000")
    print("Connected to Tally successfully!\n")
except Exception as e:
    print(f"Connection Error: {e}")
    exit()

# 2. Dynamic Input
try:
    fy_start_year = int(input("Enter Starting Year of FY (e.g., 2024): "))
except ValueError:
    print("Invalid year format.")
    exit()

target_input = input("Enter Target Month (e.g., Nov): ").strip()[:3].capitalize()

month_order = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
if target_input not in month_order:
    print(f"Error: '{target_input}' is invalid.")
    exit()

selected_months = []
month_sql_parts = []

# Fetch absolute closing balances for every month
for i, m_name in enumerate(month_order):
    selected_months.append(m_name)
    year = fy_start_year if m_name not in ["Jan", "Feb", "Mar"] else fy_start_year + 1
    
    if m_name in ["Apr", "Jun", "Sep", "Nov"]: day = "30"
    elif m_name == "Feb": day = "29" if year % 4 == 0 else "28"
    else: day = "31"
    
    curr_date = f"{day}-{m_name}-{year}"
    month_sql_parts.append(f'($$ToValue:"{curr_date}":$ClosingBalance)')
    
    if m_name == target_input:
        break

# Fetching Opening Balance + Monthly Snapshots
query = f"SELECT $Name, $_PrimaryGroup, $IsRevenue, $OpeningBalance, {', '.join(month_sql_parts)} FROM Ledger"

# 3. Fetch Data
cursor = conn.cursor()
cursor.execute(query)
rows = cursor.fetchall()

if not rows:
    print("No data found. Ensure the company is open in Tally.")
    exit()

col_names = ["LedgerName", "PrimaryGroup", "IsRevenue", "OpeningBalance"] + selected_months
df = pd.DataFrame.from_records(rows, columns=col_names)

# Define standard P&L Groups
pl_group_keywords = [
    'Sales Accounts', 'Purchase Accounts', 
    'Direct Expenses', 'Indirect Expenses', 
    'Direct Incomes', 'Indirect Incomes',
    'Expense', 'Income','Interest' 
]

def process_sheet_data(dataframe, type_flag):
    # Logic: Identify PL items based on Tally's 'IsRevenue' flag OR Group Keywords
    is_rev_check = dataframe['IsRevenue'].astype(str).str.lower().isin(['yes', 'true', '1', 'y'])
    group_check = dataframe['PrimaryGroup'].str.contains('|'.join(pl_group_keywords), case=False, na=False)
    
    is_pl_mask = is_rev_check | group_check
    
    # Filter by type
    if type_flag == 'PL':
        temp_df = dataframe[is_pl_mask].copy()
    else:
        temp_df = dataframe[~is_pl_mask].copy()

    # Numeric conversion
    numeric_cols = ['OpeningBalance'] + selected_months
    for col in numeric_cols:
        temp_df[col] = pd.to_numeric(temp_df[col], errors='coerce').fillna(0)

    # REVENUE LOGIC: Calculate Movement (This month - Last month)
    if type_flag == 'PL':
        for i, month in enumerate(selected_months):
            if i == 0:
                # Movement for Apr = Apr Closing - Opening Balance
                temp_df[month] = temp_df[month] - temp_df['OpeningBalance']
            else:
                # Movement = Current Month Closing - Previous Month Closing
                prev_month = selected_months[i-1]
                temp_df[month] = temp_df[month] - temp_df[prev_month + '_raw']
            
            # Store raw closing in a temp col for the next month's calculation
            temp_df[month + '_raw'] = dataframe.loc[temp_df.index, month].apply(pd.to_numeric, errors='coerce').fillna(0)
        
        # Drop temp columns
        raw_cols = [c for c in temp_df.columns if '_raw' in c]
        temp_df.drop(columns=raw_cols, inplace=True)

    # BALANCE SHEET LOGIC: Remains as absolute balances (no subtraction)

    # FINAL FILTER: Take only ledgers having any non-zero balance in the selected period
    temp_df = temp_df[(temp_df[selected_months] != 0).any(axis=1)]
    
    if temp_df.empty:
        return pd.DataFrame(columns=["LedgerName", "PrimaryGroup"] + selected_months)

    # Clean up and Sort
    final_df = temp_df.drop(columns=['IsRevenue', 'OpeningBalance'])
    final_df = final_df.sort_values(by=['PrimaryGroup', 'LedgerName'])
    
    # Grand Total
    totals = final_df[selected_months].sum()
    total_row = pd.DataFrame([["GRAND TOTAL", ""] + totals.tolist()], columns=final_df.columns)
    
    return pd.concat([final_df, total_row], ignore_index=True)

# Process both sheets
df_pl = process_sheet_data(df, 'PL')
df_bs = process_sheet_data(df, 'BS')

# 4. Save to Excel
file_name = f"Financial_Report_{fy_start_year}_{target_input}.xlsx"
with pd.ExcelWriter(file_name, engine='xlsxwriter') as writer:
    df_pl.to_excel(writer, sheet_name='Profit_Loss', index=False)
    df_bs.to_excel(writer, sheet_name='Balance_Sheet', index=False)
    
    workbook = writer.book
    header_fmt = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC', 'border': 1})
    num_fmt = workbook.add_format({'num_format': '#,##0.00'})
    total_fmt = workbook.add_format({'bold': True, 'bg_color': '#E7E6E6', 'top': 2})
    
    for sheet_name in ['Profit_Loss', 'Balance_Sheet']:
        ws = writer.sheets[sheet_name]
        curr_df = df_pl if sheet_name == 'Profit_Loss' else df_bs
        
        # Formatting
        ws.set_column('A:B', 40) # Name and Group
        ws.set_column('C:Z', 18, num_fmt) # Monthly values
        
        for col_num, value in enumerate(curr_df.columns):
            ws.write(0, col_num, value, header_fmt)

print(f"\nSuccess! Report generated: {file_name}")
conn.close()
