import pyodbc
import pandas as pd
import logging
import os
import warnings
from datetime import datetime

# Suppress Pandas SQLAlchemy warning
warnings.filterwarnings('ignore', category=UserWarning, module='pandas')

# Setup logging
logging.basicConfig(filename='tally_reports.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ==========================================
# 1. HELPER FUNCTIONS (Previously in utils)
# ==========================================

def autofit_columns(worksheet, df):
    """
    Automatically adjusts the width of columns in an Excel worksheet 
    based on the content of the DataFrame.
    """
    for idx, col in enumerate(df.columns):
        # Calculate max length of column header and content
        max_len = max(
            df[col].astype(str).map(len).max(),
            len(str(col))
        ) + 2  # Add a little padding
        worksheet.set_column(idx, idx, max_len)

def fetch_ledger_data(conn):
    """
    Fetches Ledger data from Tally ODBC and structures it into Dr/Cr columns.
    """
    try:
        # SQL Query to Tally ODBC
        # Note: $OpeningBalance and $ClosingBalance are signed numbers in Tally (Neg = Credit, Pos = Debit)
        sql = """
            SELECT $Name, $_PrimaryGroup, $Parent, $IsRevenue, 
                   $OpeningBalance, $ClosingBalance, $DebitTotals, $CreditTotals
            FROM Ledger
        """
        
        df = pd.read_sql(sql, conn)
        
        # Clean numeric columns (handle potential None/Strings)
        numeric_cols = ['$OpeningBalance', '$ClosingBalance', '$DebitTotals', '$CreditTotals']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # --- LOGIC: Split Signed Balances into Dr/Cr columns ---
        
        # Opening Balances
        df['Opening_Dr'] = df['$OpeningBalance'].apply(lambda x: x if x > 0 else 0)
        df['Opening_Cr'] = df['$OpeningBalance'].apply(lambda x: abs(x) if x < 0 else 0)

        # Closing Balances
        df['Closing_Dr'] = df['$ClosingBalance'].apply(lambda x: x if x > 0 else 0)
        df['Closing_Cr'] = df['$ClosingBalance'].apply(lambda x: abs(x) if x < 0 else 0)

        # Totals (Usually these are absolute values in Tally, but we ensure they are clean)
        df['$DebitTotals'] = df['$DebitTotals'].abs()
        df['$CreditTotals'] = df['$CreditTotals'].abs()

        return df

    except Exception as e:
        logging.error(f"Error fetching data from Tally: {e}")
        print(f"Error fetching data from Tally: {e}")
        return pd.DataFrame() # Return empty DF on failure

# ==========================================
# 2. CORE REPORT LOGIC
# ==========================================

def create_output_folders():
    trial_balance_folder = 'Trial_Balance'
    os.makedirs(trial_balance_folder, exist_ok=True)
    return trial_balance_folder

def write_grouped_sheets(df, filename, folder, workbook_name):
    final_columns = [
        '$Name', '$_PrimaryGroup', '$Parent', 'Opening_Dr', 'Opening_Cr',
        '$DebitTotals', '$CreditTotals', 'Closing_Dr', 'Closing_Cr'
    ]
    # Ensure columns exist before filtering
    available_cols = [c for c in final_columns if c in df.columns]
    df = df[available_cols]

    summary_data = []
    unique_groups = sorted(df['$_PrimaryGroup'].dropna().unique())
    
    for idx, group in enumerate(unique_groups, 1):
        if not group:
            group = "Unnamed_Group"
        df_group = df[df['$_PrimaryGroup'] == group]
        
        # Calculate counts safely
        dr_count = len(df_group[df_group['Closing_Dr'] > 0])
        cr_count = len(df_group[df_group['Closing_Cr'] > 0])
        
        summary_data.append({
            'Sl No': idx,
            'Group Name': group,
            'No of Ledgers having Dr Balance': dr_count,
            'No of Ledgers having Cr Balance': cr_count
        })
    df_summary = pd.DataFrame(summary_data)

    try:
        file_path = os.path.join(folder, filename)
        with pd.ExcelWriter(file_path, engine='xlsxwriter') as writer:
            # Write Summary Sheet
            df_summary.to_excel(writer, sheet_name='Summary', index=False)
            workbook = writer.book
            worksheet = writer.sheets['Summary']
            autofit_columns(worksheet, df_summary)
            
            # Add Hyperlinks to Summary
            for row, group in enumerate(df_summary['Group Name'], 1):
                clean_name = str(group).replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_')[:31]
                if not clean_name:
                    clean_name = f"Group_{row}"
                
                # Excel internal link format
                link = f"internal:'{clean_name}'!A1"
                worksheet.write_url(row, 1, link, string=group)
            
            logging.info(f"{workbook_name} - Summary sheet written with {len(df_summary)} rows.")

            # Write Individual Group Sheets
            for group in unique_groups:
                clean_name = str(group).replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_')[:31]
                if not clean_name:
                    clean_name = f"Group_{unique_groups.index(group) + 1}"
                
                try:
                    df_group = df[df['$_PrimaryGroup'] == group].sort_values(by=['Closing_Dr', 'Closing_Cr'], ascending=[False, False])
                    if not df_group.empty:
                        df_group.to_excel(writer, sheet_name=clean_name, index=False)
                        worksheet = writer.sheets[clean_name]
                        autofit_columns(worksheet, df_group)
                        
                        # Add 'Back to Summary' link at the top of each sheet (Optional but helpful)
                        worksheet.write_url(0, len(available_cols) + 1, "internal:'Summary'!A1", string="Back to Summary")
                        
                        logging.info(f"{workbook_name} - Sheet '{clean_name}' written with {len(df_group)} rows.")
                    else:
                        logging.warning(f"{workbook_name} - Skipping empty sheet for group '{group}'")
                except Exception as e:
                    logging.error(f"{workbook_name} - Error writing sheet '{clean_name}': {e}")
                    continue
        
        logging.info(f"{workbook_name} report saved to {file_path}")
        print(f"{workbook_name} report generated successfully and saved to {file_path}")
    except Exception as e:
        logging.error(f"Error writing {workbook_name} Excel file: {e}")
        print(f"Error writing {workbook_name} Excel file: {e}")

def generate_trial_balance_reports(conn, trial_balance_folder):
    logging.info("Generating Trial Balance reports...")
    
    df = fetch_ledger_data(conn)
    if df.empty:
        logging.error("No data fetched for Trial Balance reports.")
        print("Error: No data fetched for Trial Balance reports.")
        return

    # Tally $IsRevenue is 1 for P&L, 0 for Balance Sheet
    df_pl = df[df['$IsRevenue'] == 1]
    df_bs = df[df['$IsRevenue'] == 0]
    logging.info(f"Trial Balance - P&L Item rows: {len(df_pl)}, Balance Sheet rows: {len(df_bs)}")

    # Remove rows where opening and closing are ALL zero
    df_trial = df[
        ~((df['Opening_Dr'] == 0) & (df['Opening_Cr'] == 0) & 
          (df['Closing_Dr'] == 0) & (df['Closing_Cr'] == 0))
    ]
    
    df_trial_pl = df_trial[df_trial['$IsRevenue'] == 1].sort_values(by=['Closing_Dr', 'Closing_Cr'], ascending=[False, False])
    df_trial_bs = df_trial[df_trial['$IsRevenue'] == 0].sort_values(by=['Closing_Dr', 'Closing_Cr'], ascending=[False, False])
    
    logging.info(f"Trial Balance - After zero-balance filter, P&L rows: {len(df_trial_pl)}, Balance Sheet rows: {len(df_trial_bs)}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    
    # 1. Generate Combined Trial Balance Excel
    trial_balance_filename = f"trial_balance_{timestamp}.xlsx"
    final_columns = [
        '$Name', '$_PrimaryGroup', '$Parent', 'Opening_Dr', 'Opening_Cr',
        '$DebitTotals', '$CreditTotals', 'Closing_Dr', 'Closing_Cr'
    ]
    
    try:
        tb_path = os.path.join(trial_balance_folder, trial_balance_filename)
        with pd.ExcelWriter(tb_path, engine='xlsxwriter') as writer:
            # P&L Sheet
            df_trial_pl[final_columns].to_excel(writer, sheet_name='P&L Item', index=False)
            autofit_columns(writer.sheets['P&L Item'], df_trial_pl[final_columns])
            
            # BS Sheet
            df_trial_bs[final_columns].to_excel(writer, sheet_name='Balance Sheet', index=False)
            autofit_columns(writer.sheets['Balance Sheet'], df_trial_bs[final_columns])
            
        logging.info(f"Trial Balance report saved to {tb_path}")
        print(f"Trial Balance report generated successfully and saved to {tb_path}")
    except Exception as e:
        logging.error(f"Error writing Trial Balance Excel file: {e}")
        print(f"Error writing Trial Balance Excel file: {e}")

    # 2. Generate Separate Grouped Workbooks
    if not df_trial_pl.empty:
        pl_filename = f"pl_grouped_{timestamp}.xlsx"
        write_grouped_sheets(df_trial_pl, pl_filename, trial_balance_folder, "P&L Grouped")
    else:
        print("P&L grouped workbook not generated: No P&L items found.")

    if not df_trial_bs.empty:
        bs_filename = f"bs_grouped_{timestamp}.xlsx"
        write_grouped_sheets(df_trial_bs, bs_filename, trial_balance_folder, "Balance Sheet Grouped")
    else:
        print("Balance Sheet grouped workbook not generated: No Balance Sheet items found.")

def main():
    # Adjust PORT if your Tally is configured differently (Default is 9000)
    connection_string = "DRIVER={Tally ODBC Driver64};SERVER=localhost;PORT=9000"
    
    try:
        trial_balance_folder = create_output_folders()
        logging.info("Output folder created: Trial_Balance")
        
        print("Connecting to Tally ODBC...")
        conn = pyodbc.connect(connection_string)
        logging.info("Successfully connected to Tally ODBC server.")
        
        generate_trial_balance_reports(conn, trial_balance_folder)
        
        conn.close()
        logging.info("Tally ODBC connection closed.")
        print("Done.")
        
    except pyodbc.Error as e:
        logging.error(f"Failed to connect to Tally ODBC server: {e}")
        print(f"Error connecting to Tally ODBC server. Is Tally running and ODBC enabled? Details: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()