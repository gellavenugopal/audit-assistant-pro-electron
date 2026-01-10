import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
import requests
import logging
import os
from utils import resource_path

# Set up logging
logging.basicConfig(
    filename=resource_path('ledger_importer.log'),
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Tally server details
TALLY_HOST = "localhost"
TALLY_PORT = "9000"
TALLY_URL = f"http://{TALLY_HOST}:{TALLY_PORT}"

# Function to send XML request to Tally
def send_to_tally(xml_file_path):
    xml_file_path = resource_path(xml_file_path)
    if not os.path.exists(xml_file_path):
        logging.error("XML file '%s' not found in the current directory", xml_file_path)
        print(f"Error: XML file '{xml_file_path}' not found in the current directory")
        return False

    try:
        with open(xml_file_path, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        logging.debug("Read XML content from %s:\n%s", xml_file_path, xml_content)
    except Exception as e:
        logging.error("Error reading XML file '%s': %s", xml_file_path, str(e))
        print(f"Error reading XML file '{xml_file_path}': {str(e)}")
        return False

    # Create the import request envelope
    envelope = ET.Element('ENVELOPE')
    header = ET.SubElement(envelope, 'HEADER')
    ET.SubElement(header, 'TALLYREQUEST').text = 'Import Data'
    body = ET.SubElement(envelope, 'BODY')
    import_data = ET.SubElement(body, 'IMPORTDATA')
    request_desc = ET.SubElement(import_data, 'REQUESTDESC')
    ET.SubElement(request_desc, 'REPORTNAME').text = 'All Masters'
    static_vars = ET.SubElement(request_desc, 'STATICVARIABLES')
    ET.SubElement(static_vars, 'IMPORTDUPS').text = 'Modify'
    request_data = ET.SubElement(import_data, 'REQUESTDATA')

    # Parse the input XML and extract TALLYMESSAGE
    try:
        input_tree = ET.ElementTree(ET.fromstring(xml_content))
        input_root = input_tree.getroot()
        tally_message = input_root.find('.//TALLYMESSAGE')
        if tally_message is None:
            logging.error("TALLYMESSAGE not found in XML file '%s'", xml_file_path)
            print(f"Error: TALLYMESSAGE not found in XML file '{xml_file_path}'")
            return False
        request_data.append(tally_message)
    except ET.ParseError:
        logging.error("Invalid XML format in '%s'", xml_file_path)
        print(f"Error: Invalid XML format in '{xml_file_path}'")
        return False
    except Exception as e:
        logging.error("Error processing XML file '%s': %s", xml_file_path, str(e))
        print(f"Error processing XML file '{xml_file_path}': {str(e)}")
        return False

    # Convert to XML string
    xml_request = minidom.parseString(ET.tostring(envelope, encoding='unicode')).toprettyxml(indent="  ")
    logging.debug("Sending XML to Tally:\n%s", xml_request)

    # Send to Tally
    try:
        response = requests.post(
            TALLY_URL,
            data=xml_request.encode('utf-8'),
            headers={'Content-Type': 'application/xml'},
            timeout=10
        )
        response.raise_for_status()
        logging.info("Successfully sent import request to Tally")
        logging.debug("Tally response:\n%s", response.text)
        print("Successfully sent import request to Tally")
    except requests.exceptions.ConnectionError:
        logging.error("Failed to connect to Tally at %s. Ensure Tally is running and listening on port %s.", TALLY_URL, TALLY_PORT)
        print(f"Error: Failed to connect to Tally at {TALLY_URL}. Ensure Tally is running and listening on port {TALLY_PORT}.")
        return False
    except requests.exceptions.Timeout:
        logging.error("Request to Tally timed out at %s. Check Tally server or increase timeout.", TALLY_URL)
        print(f"Error: Request to Tally timed out at {TALLY_URL}.")
        return False
    except requests.exceptions.RequestException as e:
        logging.error("Error sending import request to Tally: %s", str(e))
        print(f"Error sending import request to Tally: {str(e)}")
        return False

    # Parse Tally's response
    try:
        response_tree = ET.ElementTree(ET.fromstring(response.text))
        response_root = response_tree.getroot()
        error_nodes = response_root.findall('.//ERROR')
        if error_nodes:
            for error in error_nodes:
                error_desc = error.text if error.text else "Unknown error"
                logging.error("Ledger import failed: %s", error_desc)
                print(f"Ledger import failed: {error_desc}")
            return False
        created = response_root.find('.//CREATED')
        altered = response_root.find('.//ALTERED')
        errors = response_root.find('.//ERRORS')
        created_count = int(created.text) if created is not None and created.text else 0
        altered_count = int(altered.text) if altered is not None and altered.text else 0
        error_count = int(errors.text) if errors is not None and errors.text else 0
        if error_count > 0:
            logging.error("Ledger import had %d errors. Check Tally for details.", error_count)
            print(f"Ledger import had {error_count} errors. Check Tally for details.")
            return False
        logging.info("Ledger import successful: Created=%d, Altered=%d", created_count, altered_count)
        print(f"Ledger import successful: Created={created_count}, Altered={altered_count}")
        return True
    except ET.ParseError:
        logging.error("Invalid XML response from Tally:\n%s", response.text)
        print("Error: Invalid XML response from Tally")
        return False
    except Exception as e:
        logging.error("Error parsing Tally response: %s", str(e))
        print(f"Error parsing Tally response: {str(e)}")
        return False

# Main function to import XML to Tally
def import_ledger_xml():
    print("Starting Tally ledger import automation...")
    logging.info("Starting Tally ledger import automation")
    xml_file_path = resource_path('tally_ledger_import.xml')
    success = send_to_tally(xml_file_path)
    if success:
        print("Ledger import completed successfully.")
    else:
        logging.error("Ledger import failed. Check Tally or try manual import with '%s'.", xml_file_path)
        print(f"Ledger import failed. Check {resource_path('ledger_importer.log')} for details.")
        print(f"Try manual import: Gateway of Tally > Import > Masters > Select '{xml_file_path}' > Choose 'Modify with new data'.")
    print("Tally ledger import automation completed.")
    logging.info("Tally ledger import automation completed")

if __name__ == "__main__":
    import_ledger_xml()