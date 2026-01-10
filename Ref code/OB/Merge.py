import pandas as pd
import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
import xml.sax.saxutils as saxutils
import logging
import os
from utils import resource_path, ensure_directory_exists

# Setup logging
logging.basicConfig(
    filename=resource_path('ledger_importer.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def compare_tally_balances(new_file=resource_path('new_tally_cleaned_data.xlsx'), old_file=resource_path('old_tally_cleaned_data.xlsx'), output_file=resource_path('balance_comparison.xlsx')):
    try:
        # Read input files
        if not (os.path.exists(new_file) and os.path.exists(old_file)):
            print(f"Error: One or both input files not found: {new_file}, {old_file}")
            logging.error(f"Input files not found: {new_file}, {old_file}")
            return False

        new_df = pd.read_excel(new_file)
        old_df = pd.read_excel(old_file)
        print(f"Read {len(new_df)} ledgers from new Tally and {len(old_df)} ledgers from old Tally")
        logging.info(f"Read {len(new_df)} ledgers from new Tally and {len(old_df)} ledgers from old Tally")

        # Validate required columns
        required_cols = ['$Name', 'Dr_Balance', 'Cr_Balance']
        missing_cols_new = [col for col in required_cols if col not in new_df.columns]
        missing_cols_old = [col for col in required_cols if col not in old_df.columns]
        if missing_cols_new or missing_cols_old:
            print(f"Error: Missing columns in new Tally: {missing_cols_new}, old Tally: {missing_cols_old}")
            logging.error(f"Missing columns in new Tally: {missing_cols_new}, old Tally: {missing_cols_old}")
            return False

        # Standardize $Name for comparison
        new_df['$Name_lower'] = new_df['$Name'].str.strip().str.lower()
        old_df['$Name_lower'] = old_df['$Name'].str.strip().str.lower()

        # Sheet 1: Balance Mismatches (only matched ledgers, excluding Profit & Loss A/c)
        matched_df = pd.merge(
            new_df, old_df,
            left_on='$Name_lower', right_on='$Name_lower',
            how='inner',  # Only matched ledgers
            suffixes=('_new', '_old')
        )
        if not matched_df.empty:
            # Ensure numeric balances
            for col in ['Dr_Balance_new', 'Cr_Balance_new', 'Dr_Balance_old', 'Cr_Balance_old']:
                matched_df[col] = pd.to_numeric(matched_df[col], errors='coerce').fillna(0)

            # Calculate differences
            matched_df['Dr_Difference'] = matched_df['Dr_Balance_new'] - matched_df['Dr_Balance_old']
            matched_df['Cr_Difference'] = matched_df['Cr_Balance_new'] - matched_df['Cr_Balance_old']

            # Filter for mismatches, excluding Profit & Loss A/c
            mismatches_df = matched_df[
                ((matched_df['Dr_Difference'].abs() > 0) | (matched_df['Cr_Difference'].abs() > 0)) &
                (matched_df['$Name_new'] != 'Profit & Loss A/c')
            ][[
                '$Name_new', '$_PrimaryGroup_new', '$Parent_new',
                'Dr_Balance_new', 'Cr_Balance_new',
                'Dr_Balance_old', 'Cr_Balance_old',
                'Dr_Difference', 'Cr_Difference'
            ]].rename(columns={
                '$Name_new': '$Name',
                '$_PrimaryGroup_new': '$_PrimaryGroup',
                '$Parent_new': '$Parent',
                'Dr_Balance_new': 'New_Dr_Balance',
                'Cr_Balance_new': 'New_Cr_Balance',
                'Dr_Balance_old': 'Old_Dr_Balance',
                'Cr_Balance_old': 'Old_Cr_Balance'
            })

            # Add Sl No
            if not mismatches_df.empty:
                mismatches_df.insert(0, 'Sl No', range(1, len(mismatches_df) + 1))
                print(f"Found {len(mismatches_df)} balance mismatches")
                logging.info(f"Found {len(mismatches_df)} balance mismatches")
            else:
                mismatches_df = pd.DataFrame([["No balance mismatches found"]], columns=['Status'])
                print("No balance mismatches found")
                logging.info("No balance mismatches found")
        else:
            mismatches_df = pd.DataFrame([["No matched ledgers found"]], columns=['Status'])
            print("No matched ledgers found")
            logging.info("No matched ledgers found")

        # Sheet 2: Ledger Name Mismatches (unmatched ledgers + Profit & Loss A/c with mismatches)
        full_merge_df = pd.merge(
            new_df, old_df,
            left_on='$Name_lower', right_on='$Name_lower',
            how='outer',
            suffixes=('_new', '_old')
        )
        unmatched_df = full_merge_df[full_merge_df['$Name_new'].isna() | full_merge_df['$Name_old'].isna()].copy()
        name_mismatches = []

        # Add unmatched ledgers
        if not unmatched_df.empty:
            for _, row in unmatched_df.iterrows():
                if pd.notna(row['$Name_old']):
                    balance = f"Dr {row['Dr_Balance_old']}" if row['Dr_Balance_old'] > 0 else f"Cr {row['Cr_Balance_old']}" if row['Cr_Balance_old'] > 0 else "0"
                    name_mismatches.append({
                        'Name as per OLD Tally': row['$Name_old'],
                        'Name as per NEW Tally': '',
                        'Balance as per OLD Tally': balance,
                        'Balance as per NEW Tally': '',
                        'Remarks': 'Not in New Tally, or the balance may be NIL'
                    })
                if pd.notna(row['$Name_new']):
                    balance = f"Dr {row['Dr_Balance_new']}" if row['Dr_Balance_new'] > 0 else f"Cr {row['Cr_Balance_new']}" if row['Cr_Balance_new'] > 0 else "0"
                    name_mismatches.append({
                        'Name as per OLD Tally': '',
                        'Name as per NEW Tally': row['$Name_new'],
                        'Balance as per OLD Tally': '',
                        'Balance as per NEW Tally': balance,
                        'Remarks': 'Not in Old Tally, or the balance may be NIL'
                    })

        # Add Profit & Loss A/c if it has mismatches
        profit_loss_df = matched_df[
            (matched_df['$Name_new'] == 'Profit & Loss A/c') &
            ((matched_df['Dr_Difference'].abs() > 0) | (matched_df['Cr_Difference'].abs() > 0))
        ]
        if not profit_loss_df.empty:
            for _, row in profit_loss_df.iterrows():
                old_balance = f"Dr {row['Dr_Balance_old']}" if row['Dr_Balance_old'] > 0 else f"Cr {row['Cr_Balance_old']}" if row['Cr_Balance_old'] > 0 else "0"
                new_balance = f"Dr {row['Dr_Balance_new']}" if row['Dr_Balance_new'] > 0 else f"Cr {row['Cr_Balance_new']}" if row['Cr_Balance_new'] > 0 else "0"
                name_mismatches.append({
                    'Name as per OLD Tally': row['$Name_old'],
                    'Name as per NEW Tally': row['$Name_new'],
                    'Balance as per OLD Tally': old_balance,
                    'Balance as per NEW Tally': new_balance,
                    'Remarks': 'Balance mismatch'
                })

        # Create DataFrame for name mismatches
        if name_mismatches:
            name_mismatches_df = pd.DataFrame(name_mismatches)
            name_mismatches_df.insert(0, 'Sl No', range(1, len(name_mismatches_df) + 1))
            print(f"Found {len(name_mismatches_df)} ledger name mismatches")
            logging.info(f"Found {len(name_mismatches_df)} ledger name mismatches")
        else:
            name_mismatches_df = pd.DataFrame([["No ledger name mismatches found"]], columns=['Status'])
            print("No ledger name mismatches found")
            logging.info("No ledger name mismatches found")

        # Save to Excel
        ensure_directory_exists(output_file)
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            mismatches_df.to_excel(writer, sheet_name='Balance Mismatches', index=False)
            name_mismatches_df.to_excel(writer, sheet_name='Ledger Name Mismatches', index=False)
        print(f"Comparison report saved to {output_file}")
        logging.info(f"Comparison report saved to {output_file}")
        return True

    except Exception as e:
        print(f"Error processing comparison: {e}")
        logging.error(f"Error processing comparison: {e}")
        return False

def import_to_tally():
    input_file = resource_path('balance_comparison.xlsx')
    output_file = resource_path('tally_ledger_import.xml')
    try:
        df = pd.read_excel(input_file, sheet_name='Balance Mismatches')
        required_columns = ['$Name', 'Old_Dr_Balance', 'Old_Cr_Balance']
        if not all(col in df.columns for col in required_columns):
            raise ValueError("Excel file must contain '$Name', 'Old_Dr_Balance', and 'Old_Cr_Balance' columns")
    except FileNotFoundError:
        print(f"Error: '{input_file}' not found in the current directory")
        logging.error(f"Error: '{input_file}' not found in the current directory")
        exit(1)
    except ValueError as e:
        print(f"Error: {e}")
        logging.error(f"Error: {e}")
        exit(1)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        logging.error(f"Error reading Excel file: {e}")
        exit(1)

    # Create the XML structure
    envelope = ET.Element('ENVELOPE')
    header = ET.SubElement(envelope, 'HEADER')
    ET.SubElement(header, 'VERSION').text = '1'
    ET.SubElement(header, 'TALLYREQUEST').text = 'Import'
    ET.SubElement(header, 'TYPE').text = 'Data'
    ET.SubElement(header, 'ID').text = 'All Masters'

    body = ET.SubElement(envelope, 'BODY')
    desc = ET.SubElement(body, 'DESC')
    static_vars = ET.SubElement(desc, 'STATICVARIABLES')
    ET.SubElement(static_vars, 'SVCURRENTCOMPANY').text = 'Your Company Name'  # Replace with your Tally company name

    tally_message = ET.SubElement(body, 'TALLYMESSAGE')

    # Process each ledger
    for index, row in df.iterrows():
        ledger_name = str(row['$Name']).strip()
        old_dr_balance = row['Old_Dr_Balance']
        old_cr_balance = row['Old_Cr_Balance']

        if not ledger_name:
            print(f"Warning: Empty ledger name at row {index + 2}. Skipping.")
            logging.warning(f"Warning: Empty ledger name at row {index + 2}. Skipping.")
            continue

        # Determine opening balance: debit (negative) or credit (positive)
        opening_balance = None
        balance_type = None
        if pd.notna(old_dr_balance) and old_dr_balance != 0:
            try:
                opening_balance = -float(old_dr_balance)  # Negative for debit
                balance_type = "Dr"
            except ValueError:
                print(f"Warning: Invalid debit balance for '{ledger_name}'. Skipping.")
                logging.warning(f"Warning: Invalid debit balance for '{ledger_name}'. Skipping.")
                continue
        elif pd.notna(old_cr_balance) and old_cr_balance != 0:
            try:
                opening_balance = float(old_cr_balance)  # Positive for credit
                balance_type = "Cr"
            except ValueError:
                print(f"Warning: Invalid credit balance for '{ledger_name}'. Skipping.")
                logging.warning(f"Warning: Invalid credit balance for '{ledger_name}'. Skipping.")
                continue
        else:
            print(f"Warning: No valid balance for '{ledger_name}' (both Dr and Cr empty or zero). Skipping.")
            logging.warning(f"Warning: No valid balance for '{ledger_name}' (both Dr and Cr empty or zero). Skipping.")
            continue

        # Escape special characters in ledger name
        ledger_name_escaped = saxutils.escape(ledger_name)
        print(f"Processing ledger: '{ledger_name}' with balance: {opening_balance:.2f} ({balance_type})")
        logging.info(f"Processing ledger: '{ledger_name}' with balance: {opening_balance:.2f} ({balance_type})")

        # Create ledger entry with Alter action
        ledger = ET.SubElement(tally_message, 'LEDGER', NAME=ledger_name_escaped, ACTION='Alter')
        name_list = ET.SubElement(ledger, 'NAME.LIST')
        ET.SubElement(name_list, 'NAME').text = ledger_name_escaped
        ET.SubElement(ledger, 'OPENINGBALANCE').text = f"{opening_balance:.2f}"

    # Save the XML file
    try:
        ensure_directory_exists(output_file)
        xml_str = minidom.parseString(ET.tostring(envelope, encoding='unicode')).toprettyxml(indent="  ")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(xml_str)
        print("\nXML file 'tally_ledger_import.xml' created successfully.")
        print("To update the opening balance in Tally:")
        print("1. Open Tally (ERP 9 or TallyPrime).")
        print("2. Go to 'Gateway of Tally > Import > Masters'.")
        print("3. Select 'tally_ledger_import.xml'.")
        print("4. Choose 'Modify with new data' (NOT 'Create' or 'Combine').")
        print("5. Press Enter to import.")
        print("6. Check the import log (e.g., 'Altered: 1') to confirm success.")
        print("7. Verify the balance in 'Display > List of Accounts > Ledger'.")
        print("Note: Ensure ledger names in '$Name' match Tally exactly (case-sensitive, no extra spaces).")
        print("Backup your Tally data before importing!")
        logging.info("XML file 'tally_ledger_import.xml' created successfully.")
    except Exception as e:
        print(f"Error generating XML: {e}")
        print("Check ledger names for special characters or invalid data.")
        logging.error(f"Error generating XML: {e}")
        exit(1)

def main():
    # Run comparison first
    success = compare_tally_balances()
    if success:
        # If comparison succeeds, proceed to import
        import_to_tally()
    else:
        print("Comparison failed. Skipping XML generation.")
        logging.warning("Comparison failed. Skipping XML generation.")

if __name__ == '__main__':
    main()