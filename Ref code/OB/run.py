import pyodbc
import pandas as pd
import logging
import warnings
import os
import shutil
from utils import resource_path, ensure_directory_exists

# Suppress pandas SQLAlchemy warning
warnings.filterwarnings("ignore", category=UserWarning, message="pandas only supports SQLAlchemy")

# Setup logging
logging.basicConfig(
    filename=resource_path('ledger_importer.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Check Tally ODBC Driver
def check_tally_odbc_driver():
    if not any('Tally' in driver for driver in pyodbc.drivers()):
        print("Error: Tally ODBC Driver not found. Please install it.")
        logging.error("Tally ODBC Driver not found.")
        exit(1)

# Connect to TallyPrime
def connect_to_tally(instance_name):
    CONNECTION_STRING = "DRIVER={Tally ODBC Driver64};SERVER=localhost;PORT=9000"
    try:
        conn = pyodbc.connect(CONNECTION_STRING)
        print(f"Connected to TallyPrime ({instance_name}) successfully.")
        logging.info(f"Connected to TallyPrime ({instance_name}).")
        return conn
    except pyodbc.Error as e:
        print(f"Failed to connect to TallyPrime ({instance_name}). Error:", e)
        logging.error(f"Failed to connect to TallyPrime ({instance_name}): {e}")
        exit(1)

# Generate and clean Ledger Data report for Old Tally
def generate_old_tally_ledger_data(conn):
    query = """
    SELECT 
        $Name, 
        $_PrimaryGroup, 
        $Parent, 
        $OpeningBalance, 
        $_ClosingBalance, 
        $IsRevenue
    FROM Ledger
    """
    try:
        # Step 3: Extract data
        df = pd.read_sql(query, conn)
        print("Columns returned by query (Old Tally):", df.columns.tolist())
        print("First few rows (raw data):\n", df.head())
        logging.info(f"Columns returned by query (Old Tally): {df.columns.tolist()}")
        logging.info(f"First few rows (raw data, Old Tally):\n{df.head().to_string()}")

        # Convert $IsRevenue from 0/1 to No/Yes
        df['$IsRevenue'] = df['$IsRevenue'].apply(lambda x: 'Yes' if x == 1 else 'No' if x == 0 else '')

        # Replace NaN with empty string for consistency
        df.fillna('', inplace=True)

        # Save raw data to Excel
        raw_output_file = resource_path("old_tally_ledger_data.xlsx")
        ensure_directory_exists(raw_output_file)
        df.to_excel(raw_output_file, index=False)
        print(f"Old Tally raw ledger data saved to {raw_output_file}")
        logging.info(f"Generated Old Tally raw ledger data with {len(df)} ledgers, saved to {raw_output_file}")

        # Step 4: Clean data
        # Convert $_ClosingBalance to numeric, handling non-numeric values
        df['$_ClosingBalance'] = pd.to_numeric(df['$_ClosingBalance'], errors='coerce').fillna(0)

        # Create Dr_Balance (negative balances as positive) and Cr_Balance (positive balances)
        df['Dr_Balance'] = df['$_ClosingBalance'].apply(lambda x: abs(x) if x < 0 else 0)
        df['Cr_Balance'] = df['$_ClosingBalance'].apply(lambda x: x if x > 0 else 0)

        # Filter out revenue items ($IsRevenue = 'Yes') and zero/blank closing balances
        df_cleaned = df[
            (df['$IsRevenue'] != 'Yes') &  # Keep only non-revenue (balance sheet) items
            (df['$_ClosingBalance'] != 0)  # Exclude zero closing balances
        ][['$Name', '$_PrimaryGroup', '$Parent', 'Dr_Balance', 'Cr_Balance']]

        # Verify cleaned data
        print(f"Number of ledgers after cleaning (non-revenue, non-zero closing balances, Old Tally): {len(df_cleaned)}")
        logging.info(f"Number of ledgers after cleaning (Old Tally): {len(df_cleaned)}")
        logging.info(f"First few rows (cleaned data, Old Tally):\n{df_cleaned.head().to_string()}")

        if df_cleaned.empty:
            print("No data found after cleaning for Old Tally Ledger Data report.")
            logging.warning("Cleaned Old Tally Ledger Data report returned empty.")
        else:
            cleaned_output_file = resource_path("old_tally_cleaned_data.xlsx")
            ensure_directory_exists(cleaned_output_file)
            df_cleaned.to_excel(cleaned_output_file, index=False)
            print(f"Cleaned Old Tally Ledger Data report saved to {cleaned_output_file}")
            logging.info(f"Generated cleaned Old Tally Ledger Data report with {len(df_cleaned)} ledgers, saved to {cleaned_output_file}")

        # Backup raw data
        backup_folder = resource_path("Backup")
        backup_file = os.path.join(backup_folder, "OLD_Trial.xlsx")
        ensure_directory_exists(backup_file)
        try:
            shutil.move(raw_output_file, backup_file)
            print(f"Moved raw data to {backup_file}")
            logging.info(f"Moved raw data to {backup_file}")
        except Exception as e:
            print(f"Error moving raw data to Backup folder: {e}")
            logging.error(f"Error moving raw data to Backup folder: {e}")

    except pyodbc.Error as e:
        if 'Invalid column name' in str(e):
            print("Error: One or more columns not found in Ledger table. Please check TallyPrime schema for $Name, $_PrimaryGroup, $Parent, $OpeningBalance, $_ClosingBalance, or $IsRevenue.")
            logging.error(f"Column not found: {e}")
        else:
            print("Error generating Old Tally Ledger Data report:", e)
            logging.error(f"Error generating Old Tally Ledger Data report: {e}")
    except Exception as e:
        print("Error processing Old Tally Ledger Data report:", e)
        logging.error(f"Error processing Old Tally Ledger Data report: {e}")

# Generate and clean Ledger Data report for New Tally
def generate_new_tally_ledger_data(conn):
    query = """
    SELECT 
        $Name, 
        $_PrimaryGroup, 
        $Parent, 
        $OpeningBalance, 
        $IsRevenue
    FROM Ledger
    """
    try:
        # Step 1: Extract data
        df = pd.read_sql(query, conn)
        print("Columns returned by query (New Tally):", df.columns.tolist())
        print("First few rows (raw data):\n", df.head())
        logging.info(f"Columns returned by query (New Tally): {df.columns.tolist()}")
        logging.info(f"First few rows (raw data, New Tally):\n{df.head().to_string()}")

        # Convert $IsRevenue from 0/1 to No/Yes
        df['$IsRevenue'] = df['$IsRevenue'].apply(lambda x: 'Yes' if x == 1 else 'No' if x == 0 else '')

        # Replace NaN with empty string for consistency
        df.fillna('', inplace=True)

        # Save raw data to Excel
        raw_output_file = resource_path("new_tally_ledger_data.xlsx")
        ensure_directory_exists(raw_output_file)
        df.to_excel(raw_output_file, index=False)
        print(f"New Tally raw ledger data saved to {raw_output_file}")
        logging.info(f"Generated New Tally raw ledger data with {len(df)} ledgers, saved to {raw_output_file}")

        # Step 2: Clean data
        # Convert $OpeningBalance to numeric, handling non-numeric values
        df['$OpeningBalance'] = pd.to_numeric(df['$OpeningBalance'], errors='coerce').fillna(0)

        # Create Dr_Balance (negative balances as positive) and Cr_Balance (positive balances)
        df['Dr_Balance'] = df['$OpeningBalance'].apply(lambda x: abs(x) if x < 0 else 0)
        df['Cr_Balance'] = df['$OpeningBalance'].apply(lambda x: x if x > 0 else 0)

        # Filter out revenue items ($IsRevenue = 'Yes') and zero/blank opening balances
        df_cleaned = df[
            (df['$IsRevenue'] != 'Yes') &  # Keep only non-revenue (balance sheet) items
            (df['$OpeningBalance'] != 0)   # Exclude zero opening balances
        ][['$Name', '$_PrimaryGroup', '$Parent', 'Dr_Balance', 'Cr_Balance']]

        # Verify cleaned data
        print(f"Number of ledgers after cleaning (non-revenue, non-zero opening balances, New Tally): {len(df_cleaned)}")
        logging.info(f"Number of ledgers after cleaning (New Tally): {len(df_cleaned)}")
        logging.info(f"First few rows (cleaned data, New Tally):\n{df_cleaned.head().to_string()}")

        if df_cleaned.empty:
            print("No data found after cleaning for New Tally Ledger Data report.")
            logging.warning("Cleaned New Tally Ledger Data report returned empty.")
        else:
            cleaned_output_file = resource_path("new_tally_cleaned_data.xlsx")
            ensure_directory_exists(cleaned_output_file)
            df_cleaned.to_excel(cleaned_output_file, index=False)
            print(f"Cleaned New Tally Ledger Data report saved to {cleaned_output_file}")
            logging.info(f"Generated cleaned New Tally Ledger Data report with {len(df_cleaned)} ledgers, saved to {cleaned_output_file}")

        # Backup raw data
        backup_folder = resource_path("Backup")
        backup_file = os.path.join(backup_folder, "NEW_Trial.xlsx")
        ensure_directory_exists(backup_file)
        try:
            shutil.move(raw_output_file, backup_file)
            print(f"Moved raw data to {backup_file}")
            logging.info(f"Moved raw data to {backup_file}")
        except Exception as e:
            print(f"Error moving raw data to Backup folder: {e}")
            logging.error(f"Error moving raw data to Backup folder: {e}")

    except pyodbc.Error as e:
        if 'Invalid column name' in str(e):
            print("Error: One or more columns not found in Ledger table. Please check TallyPrime schema for $Name, $_PrimaryGroup, $Parent, $OpeningBalance, or $IsRevenue.")
            logging.error(f"Column not found: {e}")
        else:
            print("Error generating New Tally Ledger Data report:", e)
            logging.error(f"Error generating New Tally Ledger Data report: {e}")
    except Exception as e:
        print("Error processing New Tally Ledger Data report:", e)
        logging.error(f"Error processing New Tally Ledger Data report: {e}")

def main():
    # Check Tally ODBC Driver
    check_tally_odbc_driver()

    # Prompt for Old Tally
    print("\nPlease load Old Tally instance in TallyPrime.")
    input("Press Enter when Old Tally is loaded and ready...")

    # Connect to Old Tally and generate data
    old_conn = connect_to_tally("Old Tally")
    generate_old_tally_ledger_data(old_conn)
    old_conn.close()
    print("Old Tally processing complete. Connection closed.")

    # Prompt for New Tally
    print("\nPlease load New Tally instance in TallyPrime.")
    input("Press Enter when New Tally is loaded and ready...")

    # Connect to New Tally and generate data
    new_conn = connect_to_tally("New Tally")
    generate_new_tally_ledger_data(new_conn)
    new_conn.close()
    print("New Tally processing complete. Connection closed.")

if __name__ == '__main__':
    main()