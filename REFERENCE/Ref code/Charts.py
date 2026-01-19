import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import seaborn as sns
import numpy as np

class AuditorDashboard:
    def __init__(self, root):
        self.root = root
        self.root.title("Auditor's Lens: Financial Analysis & Risk Dashboard")
        self.root.geometry("1200x850")
        
        # Style configuration
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#f5f5f5")
        style.configure("TLabel", background="#f5f5f5", font=("Segoe UI", 10))
        style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"), foreground="#2c3e50")
        style.configure("Card.TFrame", relief="raised", borderwidth=1)

        # Data placeholders
        self.pl_df = None
        self.bs_df = None
        self.months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

        self.create_layout()

    def create_layout(self):
        # 1. Toolbar
        toolbar = tk.Frame(self.root, bg="#2c3e50", height=60)
        toolbar.pack(side=tk.TOP, fill=tk.X)
        
        btn_load = tk.Button(toolbar, text="📂 Import Tally Excel", command=self.load_file, 
                             bg="#27ae60", fg="white", font=("Segoe UI", 10, "bold"), relief="flat", padx=15, pady=5)
        btn_load.pack(side=tk.LEFT, padx=20, pady=10)
        
        self.status_lbl = tk.Label(toolbar, text="Waiting for data...", bg="#2c3e50", fg="white", font=("Segoe UI", 9, "italic"))
        self.status_lbl.pack(side=tk.LEFT, pady=10)

        # 2. Main Notebook (Tabs)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(expand=True, fill="both", padx=10, pady=10)

        # Define Tabs
        self.tab_profit = ttk.Frame(self.notebook)
        self.tab_working_cap = ttk.Frame(self.notebook)
        self.tab_expenses = ttk.Frame(self.notebook)
        self.tab_audit_report = ttk.Frame(self.notebook)

        self.notebook.add(self.tab_profit, text="📊 Profitability & Margins")
        self.notebook.add(self.tab_working_cap, text="💰 Working Capital (Debtors/Creditors)")
        self.notebook.add(self.tab_expenses, text="📉 Expense Deep Dive")
        self.notebook.add(self.tab_audit_report, text="📑 Auditor Observations (FAQs)")

    def load_file(self):
        file_path = filedialog.askopenfilename(filetypes=[("Excel Files", "*.xlsx")])
        if not file_path: return
        
        try:
            xls = pd.ExcelFile(file_path)
            # Smart sheet detection
            sheet_names = xls.sheet_names
            pl_sheet = next((s for s in sheet_names if 'Profit' in s or 'Loss' in s or 'PL' in s), sheet_names[0])
            bs_sheet = next((s for s in sheet_names if 'Balance' in s or 'BS' in s), sheet_names[1] if len(sheet_names)>1 else sheet_names[0])
            
            self.pl_df = pd.read_excel(xls, sheet_name=pl_sheet)
            self.bs_df = pd.read_excel(xls, sheet_name=bs_sheet)
            
            self.status_lbl.config(text=f"Analyzing: {file_path.split('/')[-1]}")
            self.run_analysis()
            
        except Exception as e:
            messagebox.showerror("Import Error", str(e))

    def run_analysis(self):
        # --- PREPARATION ---
        # Clean numeric data
        for col in self.months:
            self.pl_df[col] = pd.to_numeric(self.pl_df[col], errors='coerce').fillna(0)
            self.bs_df[col] = pd.to_numeric(self.bs_df[col], errors='coerce').fillna(0)

        # Extract Series
        sales = self.pl_df[self.pl_df['PrimaryGroup'] == 'Sales Accounts'][self.months].sum().abs()
        direct_exp = self.pl_df[self.pl_df['PrimaryGroup'] == 'Direct Expenses'][self.months].sum().abs()
        purchases = self.pl_df[self.pl_df['PrimaryGroup'] == 'Purchase Accounts'][self.months].sum().abs()
        # Total Direct Cost = Purchases + Direct Expenses
        cogs = purchases + direct_exp
        
        # Gross Profit
        gp = sales - cogs
        
        # Indirect Expenses
        indirect_groups = ['Indirect Expenses', 'Administrative Expenses', 'Interest']
        indirect_exp = self.pl_df[self.pl_df['PrimaryGroup'].isin(indirect_groups)][self.months].sum().abs()
        
        # Net Profit
        np_profit = gp - indirect_exp

        # Balance Sheet Items
        debtors = self.bs_df[self.bs_df['PrimaryGroup'] == 'Sundry Debtors'][self.months].sum().abs()
        creditors = self.bs_df[self.bs_df['PrimaryGroup'] == 'Sundry Creditors'][self.months].sum().abs()

        # --- DRAW TABS ---
        self.draw_profitability(sales, gp, np_profit)
        self.draw_working_capital(sales, debtors, creditors)
        self.draw_expenses(cogs, indirect_exp)
        self.generate_audit_report(sales, np_profit, debtors, creditors, cogs, indirect_exp)

    def draw_profitability(self, sales, gp, np_profit):
        self.clear_frame(self.tab_profit)
        
        # Layout: Top half chart, bottom half chart
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), gridspec_kw={'height_ratios': [2, 1]})
        fig.patch.set_facecolor('#f5f5f5')

        # 1. Multi-Line Chart (Sales vs GP vs NP)
        ax1.plot(self.months, sales, marker='o', label='Sales (Revenue)', color='#2980b9', linewidth=2)
        ax1.plot(self.months, gp, marker='o', label='Gross Profit', color='#27ae60', linewidth=2, linestyle='--')
        ax1.plot(self.months, np_profit, marker='o', label='Net Profit', color='#e74c3c', linewidth=2)
        ax1.set_title("Profitability Trends: Are we keeping what we earn?", fontsize=12, fontweight='bold')
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # 2. Net Profit Margin % Chart
        # Handle division by zero
        margin_pct = (np_profit / sales.replace(0, np.nan)) * 100
        sns.barplot(x=self.months, y=margin_pct, ax=ax2, palette="RdBu")
        ax2.set_title("Net Profit Margin % (Net Profit / Sales)", fontsize=12, fontweight='bold')
        ax2.set_ylabel("Percentage %")
        ax2.axhline(0, color='black', linewidth=1)

        self.embed_chart(fig, self.tab_profit)

    def draw_working_capital(self, sales, debtors, creditors):
        self.clear_frame(self.tab_working_cap)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
        fig.patch.set_facecolor('#f5f5f5')

        # 1. Liquidity Squeeze (Debtors vs Creditors)
        ax1.plot(self.months, debtors, label='Debtors (Money to Receive)', color='green', fillstyle='bottom')
        ax1.fill_between(self.months, debtors, alpha=0.2, color='green')
        ax1.plot(self.months, creditors, label='Creditors (Money to Pay)', color='red')
        ax1.fill_between(self.months, creditors, alpha=0.1, color='red')
        ax1.set_title("Liquidity Position: Receivables vs Payables")
        ax1.legend()

        # 2. Correlation: Sales vs Debtors
        # Are debtors growing faster than sales? (Bad sign)
        ax2.scatter(sales, debtors, color='purple')
        ax2.set_title("Correlation: Sales vs Debtors")
        ax2.set_xlabel("Sales Volume")
        ax2.set_ylabel("Debtor Balance")
        # Add a trend line if possible
        if len(sales) > 1:
            z = np.polyfit(sales, debtors, 1)
            p = np.poly1d(z)
            ax2.plot(sales, p(sales), "r--", alpha=0.5)

        self.embed_chart(fig, self.tab_working_cap)

    def draw_expenses(self, cogs, indirect):
        self.clear_frame(self.tab_expenses)
        
        # Analyze top specific ledgers
        # We need to go back to the DF for this
        exp_df = self.pl_df[self.pl_df['PrimaryGroup'].str.contains('Expense|Purchase', case=False, na=False)].copy()
        exp_df['TotalYear'] = exp_df[self.months].sum(axis=1).abs()
        top_5_ledgers = exp_df.sort_values('TotalYear', ascending=False).head(7)

        fig = plt.figure(figsize=(12, 6))
        gs = fig.add_gridspec(1, 2)
        fig.patch.set_facecolor('#f5f5f5')

        # 1. Pie Chart: Direct vs Indirect Cost Structure
        ax1 = fig.add_subplot(gs[0, 0])
        total_cogs = cogs.sum()
        total_indir = indirect.sum()
        ax1.pie([total_cogs, total_indir], labels=['COGS (Direct)', 'Overheads (Indirect)'], 
                autopct='%1.1f%%', colors=['#f39c12', '#8e44ad'], startangle=140)
        ax1.set_title("Cost Structure Analysis")

        # 2. Horizontal Bar: Top Cost Drivers
        ax2 = fig.add_subplot(gs[0, 1])
        sns.barplot(x='TotalYear', y='LedgerName', data=top_5_ledgers, ax=ax2, palette='viridis')
        ax2.set_title("Top 7 Ledger Accounts Draining Cash")
        
        self.embed_chart(fig, self.tab_expenses)

    def generate_audit_report(self, sales, np_profit, debtors, creditors, cogs, indirect):
        self.clear_frame(self.tab_audit_report)
        
        # Scrollable text area
        text_widget = tk.Text(self.tab_audit_report, wrap=tk.WORD, font=("Consolas", 11), bg="white", padx=20, pady=20)
        text_widget.pack(fill="both", expand=True)
        
        # --- LOGIC ENGINE FOR INSIGHTS ---
        
        def write_section(title, content, alert=False):
            tag = "alert" if alert else "normal"
            text_widget.insert(tk.END, f"\n--- {title} ---\n", "header")
            text_widget.insert(tk.END, content + "\n")

        text_widget.tag_config("header", foreground="#2c3e50", font=("Segoe UI", 12, "bold"))
        
        # 1. Profitability Assessment
        total_sales = sales.sum()
        total_np = np_profit.sum()
        np_margin = (total_np/total_sales)*100
        
        prof_msg = f"Total Turnover: {total_sales:,.2f}\nTotal Net Profit: {total_np:,.2f} ({np_margin:.2f}%)\n"
        if np_margin < 5:
            prof_msg += "⚠️ ALERT: Net Profit Margin is dangerously low (below 5%). Review pricing or overheads."
        elif np_margin > 20:
            prof_msg += "✅ HEALTHY: Strong profit margins observed."
            
        # Check for loss months
        loss_months = np_profit[np_profit < 0].index.tolist()
        if loss_months:
            prof_msg += f"\n⚠️ WARNING: The company incurred losses in: {', '.join(loss_months)}."
            
        write_section("PROFITABILITY AUDIT", prof_msg)

        # 2. Expense Control
        cogs_pct = (cogs.sum() / total_sales) * 100
        indirect_pct = (indirect.sum() / total_sales) * 100
        
        exp_msg = f"Direct Costs eat up {cogs_pct:.1f}% of revenue.\nOverheads eat up {indirect_pct:.1f}% of revenue.\n"
        if indirect_pct > cogs_pct:
             exp_msg += "⚠️ OBSERVATION: Indirect expenses are higher than direct costs. Is the company top-heavy?"
        
        write_section("COST CONTROL CHECK", exp_msg)

        # 3. Liquidity & Working Capital
        total_debtors = debtors.iloc[-1] # Closing balance (Mar) roughly
        total_creditors = creditors.iloc[-1]
        
        wc_msg = f"Closing Debtor Balance (Approx): {total_debtors:,.2f}\nClosing Creditor Balance (Approx): {total_creditors:,.2f}\n"
        
        if total_debtors > total_sales * 0.25: # Roughly 3 months sales
             wc_msg += "⚠️ RISK: High Debtors. A significant amount of sales is stuck in credit (approx > 3 months)."
        
        if total_creditors > total_debtors:
            wc_msg += "ℹ️ STRATEGY: You are using supplier credit to fund operations (Creditors > Debtors). This is good for cash flow if managed well."
        else:
            wc_msg += "ℹ️ CASH FLOW: You are paying suppliers faster than you are collecting from customers."

        write_section("WORKING CAPITAL & LIQUIDITY", wc_msg)

        # 4. Seasonal Anomalies
        max_sale_month = sales.idxmax()
        min_sale_month = sales.idxmin()
        season_msg = f"Peak Business Month: {max_sale_month}\nSlowest Month: {min_sale_month}\n"
        season_msg += "Auditor Note: Verify if the dip in the slowest month is due to operations or missing data."
        
        write_section("SEASONALITY & ANOMALIES", season_msg)

        text_widget.config(state=tk.DISABLED) # Make Read-only

    def embed_chart(self, fig, parent):
        canvas = FigureCanvasTkAgg(fig, master=parent)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="both", expand=True)

    def clear_frame(self, frame):
        for widget in frame.winfo_children():
            widget.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = AuditorDashboard(root)
    root.mainloop()