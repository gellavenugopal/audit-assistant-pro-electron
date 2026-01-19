import tkinter as tk
from tkinter import messagebox
import sys
import datetime
import logging
from layer import LedgerImporterApp

# Setup logging
logging.basicConfig(
    filename='ledger_importer.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

DESTRUCT_DATE = datetime.date(2025, 09, 30)
WARNING_DATE = datetime.date(2025, 09, 25)

def check_self_destruct():
    current_date = datetime.date.today()
    root = tk.Tk()
    root.withdraw()
    if current_date >= DESTRUCT_DATE:
        messagebox.showerror(
            "Application Expired",
            "This application has reached its end-of-life date (31-12-2025) and will now terminate."
        )
        root.destroy()
        sys.exit(0)
        return False
    elif current_date >= WARNING_DATE:
        messagebox.showwarning(
            "Expiration Warning",
            "This application will stop working after 31-12-2025 (in 5 days or less). Please plan accordingly."
        )
        root.destroy()
        return True
    root.destroy()
    return True

def main():
    if check_self_destruct():
        root = tk.Tk()
        app = LedgerImporterApp(root)
        root.mainloop()

if __name__ == "__main__":
    main()