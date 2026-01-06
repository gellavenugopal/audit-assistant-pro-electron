import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import seaborn as sns

class FinancialDashboardApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Financial Analysis Dashboard")
        self.root.geometry("1000x700")

        # --- Data Storage ---
        self.pl_df = None
        self.bs_df = None
        self.months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

        # --- UI Layout ---
        self.create_widgets()

    def create_widgets(self):
        # 1. Top Control Panel
        control_frame = tk.Frame(self.root, bg="#f0f0f0", height=50)
        control_frame.pack(side=tk.TOP, fill=tk.X)

        self.btn_load = tk.Button(control_frame, text="Load Excel File", command=self.load_file, bg="#4CAF50", fg="white", font=("Arial", 10, "bold"))
        self.btn_load.pack(side=tk.LEFT, padx=10, pady=10)

        self.lbl_status = tk.Label(control_frame, text="No file loaded", bg="#f0f0f0", font=("Arial", 9))
        self.lbl_status.pack(side=tk.LEFT, padx=10, pady=10)

        # 2. Main Content Area (Tabs)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(expand=True, fill="both", padx=10, pady=10)

        # Create Tabs
        self.tab_sales = ttk.Frame(self.notebook)
        self.tab_expenses = ttk.Frame(self.notebook)
        self.tab_summary = ttk.Frame(self.notebook)

        self.notebook.add(self.tab_sales, text="Sales & Purchases")
        self.notebook.add(self.tab_expenses, text="Expense Analysis")
        self.notebook.add(self.tab_summary, text="FAQs & Summary")

    def load_file(self):
        file_path = filedialog.askopenfilename(filetypes=[("Excel Files", "*.xlsx")])
        if not file_path:
            return

        try:
            xls = pd.ExcelFile(file_path)
            # Simple logic: Try to guess sheets, or default to first 2
            sheet_names = xls.sheet_names
            
            # You might want to make this dynamic, but assuming standard format:
            # We look for keywords 'Profit' or 'Loss' for P&L, 'Balance' for BS
            pl_sheet = next((s for s in sheet_names if 'Profit' in s or 'Loss' in s), sheet_names[0])
            bs_sheet = next((s for s in sheet_names if 'Balance' in s), sheet_names[1] if len(sheet_names) > 1 else sheet_names[0])

            self.pl_df = pd.read_excel(xls, sheet_name=pl_sheet)
            self.bs_df = pd.read_excel(xls, sheet_name=bs_sheet)
            
            self.lbl_status.config(text=f"Loaded: {file_path.split('/')[-1]}")
            self.process_and_plot()
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not read file.\nDetails: {e}")

    def process_and_plot(self):
        # Data Extraction (Logic from your previous script)
        try:
            # Sales
            sales_df = self.pl_df[self.pl_df['PrimaryGroup'] == 'Sales Accounts']
            monthly_sales = sales_df[self.months].sum().abs()

            # Purchases
            purchases_df = self.pl_df[self.pl_df['PrimaryGroup'] == 'Purchase Accounts']
            monthly_purchases = purchases_df[self.months].sum().abs()

            # Expenses
            exp_groups = ['Administrative Expenses', 'Direct Expenses', 'Indirect Expenses', 'Interest']
            expenses_df = self.pl_df[self.pl_df['PrimaryGroup'].isin(exp_groups)]
            
            # Creditors (for Summary)
            creditors_df = self.bs_df[self.bs_df['PrimaryGroup'] == 'Sundry Creditors']
            monthly_creditors = creditors_df[self.months].sum().abs()

            # --- RENDER TAB 1: Sales vs Purchases ---
            self.clear_frame(self.tab_sales)
            fig1, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 8))
            
            # Bar Chart
            sns.barplot(x=self.months, y=monthly_sales, ax=ax1, color='skyblue')
            ax1.set_title("Monthly Sales")
            
            # Line Chart Comparison
            ax2.plot(self.months, monthly_sales, marker='o', label='Sales')
            ax2.plot(self.months, monthly_purchases, marker='o', label='Purchases', color='orange')
            ax2.set_title("Sales vs Purchases Trend")
            ax2.legend()
            
            self.embed_chart(fig1, self.tab_sales)

            # --- RENDER TAB 2: Expenses ---
            self.clear_frame(self.tab_expenses)
            
            # Top 5 Expenses
            expenses_df['TotalYear'] = expenses_df[self.months].sum(axis=1).abs()
            top_exp = expenses_df.sort_values('TotalYear', ascending=False).head(5)
            
            fig2, ax3 = plt.subplots(figsize=(8, 6))
            sns.barplot(x='TotalYear', y='LedgerName', data=top_exp, palette='viridis', ax=ax3)
            ax3.set_title("Top 5 Expense Ledgers")
            
            self.embed_chart(fig2, self.tab_expenses)

            # --- RENDER TAB 3: Summary / FAQs ---
            self.clear_frame(self.tab_summary)
            self.render_summary(monthly_sales, monthly_purchases, monthly_creditors)

        except KeyError as e:
            messagebox.showerror("Data Error", f"Missing column in Excel: {e}")

    def embed_chart(self, fig, parent_frame):
        canvas = FigureCanvasTkAgg(fig, master=parent_frame)
        canvas.draw()
        canvas.get_tk_widget().pack(expand=True, fill="both")

    def clear_frame(self, frame):
        for widget in frame.winfo_children():
            widget.destroy()

    def render_summary(self, sales, purchases, creditors):
        # Create a nice styled text area
        text_frame = tk.Frame(self.tab_summary, bg="white", padx=20, pady=20)
        text_frame.pack(fill="both", expand=True)

        stats = [
            ("Total Sales", f"{sales.sum():,.2f}"),
            ("Total Purchases", f"{purchases.sum():,.2f}"),
            ("Best Sales Month", f"{sales.idxmax()} ({sales.max():,.2f})"),
            ("Highest Creditors Month", f"{creditors.idxmax()} ({creditors.max():,.2f})"),
            ("Profit Margin (Approx)", f"{(sales.sum() - purchases.sum()):,.2f}")
        ]

        tk.Label(text_frame, text="Financial Snapshot (FAQs)", font=("Arial", 16, "bold"), bg="white", pady=10).pack(anchor="w")

        for label, value in stats:
            row = tk.Frame(text_frame, bg="white")
            row.pack(fill="x", pady=5)
            tk.Label(row, text=label + ":", font=("Arial", 12, "bold"), width=25, anchor="w", bg="white").pack(side="left")
            tk.Label(row, text=value, font=("Arial", 12), fg="blue", bg="white").pack(side="left")

# --- Run the App ---
if __name__ == "__main__":
    root = tk.Tk()
    app = FinancialDashboardApp(root)
    root.mainloop()