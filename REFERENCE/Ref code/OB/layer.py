import tkinter as tk
from tkinter import messagebox
import webbrowser
import logging
import os
from run import check_tally_odbc_driver, connect_to_tally, generate_old_tally_ledger_data, generate_new_tally_ledger_data
from Merge import compare_tally_balances, import_to_tally
from tally_import_automator import import_ledger_xml
from utils import resource_path, ensure_directory_exists

class LedgerImporterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Techflow Hub Ledger Balance Importer")
        self.root.geometry("700x500")
        self.root.resizable(False, False)
        self.status_var = tk.StringVar(value="Ready")
        self.setup_gui()
        logging.info("LedgerImporterApp initialized successfully.")

    def setup_gui(self):
        """Set up the GUI with two frames for navigation."""
        self.container = tk.Frame(self.root, bg="#F0F0F0")
        self.container.pack(fill="both", expand=True)

        self.main_frame = tk.Frame(self.container, bg="#F0F0F0")
        self.main_frame.place(relwidth=1, relheight=1)

        self.ledger_frame = tk.Frame(self.container, bg="#F0F0F0")

        tk.Label(
            self.main_frame,
            text="Techflow Hub Ledger Balance Importer",
            font=("Arial", 24, "bold"),
            fg="#4A90E2",
            bg="#F0F0F0"
        ).pack(pady=20)

        tk.Label(
            self.main_frame,
            text="For More Softwares Contact: 9854940794",
            font=("Arial", 12),
            bg="#F0F0F0",
            fg="black"
        ).pack()

        btn_ob_ledger = tk.Button(
            self.main_frame,
            text="Ob Ledger Comparison",
            command=self.show_ledger_frame,
            bg="#4A90E2",
            fg="white",
            font=("Arial", 12, "bold"),
            width=20,
            height=2,
            activebackground="#357ABD"
        )
        btn_ob_ledger.pack(pady=30)
        btn_ob_ledger.bind("<Enter>", lambda e: self.show_tooltip(e, "Manage ledger balance comparison and import"))
        btn_ob_ledger.bind("<Leave>", lambda e: self.hide_tooltip())

        btn_learn_more = tk.Button(
            self.main_frame,
            text="Learn More",
            command=self.open_learn_more,
            bg="#2ECC71",
            fg="white",
            font=("Arial", 12, "bold"),
            width=20,
            height=2,
            activebackground="#27AE60"
        )
        btn_learn_more.pack(pady=20)
        btn_learn_more.bind("<Enter>", lambda e: self.show_tooltip(e, "Learn more about the app"))
        btn_learn_more.bind("<Leave>", lambda e: self.hide_tooltip())

        tk.Label(
            self.main_frame,
            textvariable=self.status_var,
            font=("Arial", 10, "italic"),
            fg="gray",
            bg="#F0F0F0"
        ).pack(pady=10)

        tk.Label(
            self.ledger_frame,
            text="Ledger Balance Operations",
            font=("Arial", 18, "bold"),
            fg="#4A90E2",
            bg="#F0F0F0"
        ).pack(pady=20)

        buttons = [
            ("Fetch Data", self.run_fetch_data, "Fetch and clean ledger data from Old and New Tally"),
            ("Compare Data", self.run_compare_data, "Compare ledger balances and generate XML"),
            ("Import", self.run_import_to_tally, "Import XML to Tally")
        ]
        for text, command, tooltip in buttons:
            btn = tk.Button(
                self.ledger_frame,
                text=text,
                command=command,
                bg="#4A90E2",
                fg="white",
                font=("Arial", 11),
                width=18,
                height=1,
                activebackground="#357ABD"
            )
            btn.pack(pady=15)
            btn.bind("<Enter>", lambda e, t=tooltip: self.show_tooltip(e, t))
            btn.bind("<Leave>", lambda e: self.hide_tooltip())

        btn_back = tk.Button(
            self.ledger_frame,
            text="Back",
            command=self.show_main_frame,
            bg="#E74C3C",
            fg="white",
            font=("Arial", 11),
            width=18,
            height=1,
            activebackground="#C0392B"
        )
        btn_back.pack(pady=15)
        btn_back.bind("<Enter>", lambda e: self.show_tooltip(e, "Return to main menu"))
        btn_back.bind("<Leave>", lambda e: self.hide_tooltip())

        tk.Label(
            self.ledger_frame,
            textvariable=self.status_var,
            font=("Arial", 10, "italic"),
            fg="gray",
            bg="#F0F0F0"
        ).pack(pady=10)

    def show_ledger_frame(self):
        """Show the ledger operations frame."""
        self.main_frame.place_forget()
        self.ledger_frame.place(relwidth=1, relheight=1)
        logging.info("Navigated to ledger operations frame.")

    def show_main_frame(self):
        """Show the main frame."""
        self.ledger_frame.place_forget()
        self.main_frame.place(relwidth=1, relheight=1)
        logging.info("Navigated to main frame.")

    def show_tooltip(self, event, text):
        """Show tooltip at mouse position."""
        x, y = event.x_root, event.y_root
        self.tooltip = tk.Toplevel(self.root)
        self.tooltip.wm_overrideredirect(True)
        self.tooltip.geometry(f"+{x+10}+{y+10}")
        tk.Label(self.tooltip, text=text, bg="lightyellow", relief="solid", borderwidth=1).pack(padx=5, pady=2)

    def hide_tooltip(self):
        """Hide tooltip."""
        if hasattr(self, 'tooltip') and self.tooltip.wm_overrideredirect():
            self.tooltip.destroy()

    def run_fetch_data(self):
        """Execute run.py to fetch and clean ledger data."""
        self.status_var.set("Fetching ledger data...")
        self.root.update()
        logging.info("Running fetch data.")
        try:
            check_tally_odbc_driver()
            messagebox.showinfo("Prompt", "Please load Old Tally instance in TallyPrime.")
            old_conn = connect_to_tally("Old Tally")
            generate_old_tally_ledger_data(old_conn)
            old_conn.close()
            messagebox.showinfo("Prompt", "Please load New Tally instance in TallyPrime.")
            new_conn = connect_to_tally("New Tally")
            generate_new_tally_ledger_data(new_conn)
            new_conn.close()
            output_file_old = resource_path("old_tally_cleaned_data.xlsx")
            output_file_new = resource_path("new_tally_cleaned_data.xlsx")
            if os.path.exists(output_file_old) and os.path.exists(output_file_new):
                messagebox.showinfo("Success", f"Ledger data fetched and saved to {output_file_old} and {output_file_new}")
            else:
                messagebox.showerror("Error", f"One or both output files not found. Check {resource_path('ledger_importer.log')} for details.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to fetch ledger data: {e}\nCheck {resource_path('ledger_importer.log')} for details.")
        finally:
            self.status_var.set("Ready")

    def run_compare_data(self):
        """Execute Merge.py to compare ledger balances and generate XML."""
        self.status_var.set("Comparing ledger balances...")
        self.root.update()
        logging.info("Running compare data.")
        try:
            input_file_old = resource_path("old_tally_cleaned_data.xlsx")
            input_file_new = resource_path("new_tally_cleaned_data.xlsx")
            output_file = resource_path("balance_comparison.xlsx")
            success = compare_tally_balances(input_file_new, input_file_old, output_file)
            if success:
                import_to_tally()
                xml_file = resource_path("tally_ledger_import.xml")
                if os.path.exists(xml_file):
                    messagebox.showinfo("Success", f"Comparison completed and XML generated at {xml_file}")
                else:
                    messagebox.showerror("Error", f"XML file {xml_file} not found. Check {resource_path('ledger_importer.log')} for details.")
            else:
                messagebox.showerror("Error", f"Comparison failed. Check {resource_path('ledger_importer.log')} for details.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to compare data: {e}\nCheck {resource_path('ledger_importer.log')} for details.")
        finally:
            self.status_var.set("Ready")

    def run_import_to_tally(self):
        """Execute tally_import_automator.py to import XML to Tally."""
        self.status_var.set("Importing ledger balances to Tally...")
        self.root.update()
        logging.info("Running import to Tally.")
        try:
            import_ledger_xml()
            messagebox.showinfo("Success", "Ledger balances imported to Tally successfully")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to import to Tally: {e}\nCheck {resource_path('ledger_importer.log')} for details.")
        finally:
            self.status_var.set("Ready")

    def open_learn_more(self):
        """Open YouTube link."""
        webbrowser.open("https://youtube.com/@techflow_hublokesh?si=IZS0bLR2tnVbDhZq")
        logging.info("Opened Learn More link.")

if __name__ == "__main__":
    root = tk.Tk()
    app = LedgerImporterApp(root)
    root.mainloop()