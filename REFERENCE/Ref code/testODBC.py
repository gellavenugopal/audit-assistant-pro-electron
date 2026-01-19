import pyodbc

def test_tally_connection():
    print("--- TALLY ODBC CONNECTION TEST ---")
    
    # Common Driver Names (Tally Prime usually uses the first one)
    drivers_to_try = [
        "Tally ODBC Driver64", 
        "Tally ODBC Driver", 
        "Tally ODBC 64-bit Driver"
    ]
    
    # Common Ports (9000 is default, but sometimes it's 9001 or 9002)
    port = "9000" 

    connected = False
    
    for driver in drivers_to_try:
        conn_str = f"DRIVER={{{driver}}};SERVER=localhost;PORT={port}"
        print(f"\nTesting Driver: {driver} on Port: {port}...")
        
        try:
            conn = pyodbc.connect(conn_str, timeout=3)
            print(f"✅ SUCCESS! Connected using driver: '{driver}'")
            
            # Run a quick test query
            cursor = conn.cursor()
            cursor.execute("SELECT $Name FROM Ledger")
            row = cursor.fetchone()
            print(f"   Data Check: Found ledger '{row[0]}'")
            
            conn.close()
            connected = True
            break
            
        except Exception as e:
            print(f"❌ FAILED. Error:\n   {e}")

    if not connected:
        print("\n--- TROUBLESHOOTING GUIDE ---")
        print("1. Ensure Tally is OPEN and the company is loaded.")
        print("2. Check Tally Configuration (F1: Help > Settings > Connectivity).")
        print(f"   - 'Client/Server with ODBC' must be set to 'Yes'")
        print(f"   - 'Port' must match {port} (Change script if Tally is 9001).")

if __name__ == "__main__":
    test_tally_connection()