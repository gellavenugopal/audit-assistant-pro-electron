-- Add constitution column to clients table
ALTER TABLE public.clients 
ADD COLUMN constitution TEXT DEFAULT 'company';

-- Add comment for documentation
COMMENT ON COLUMN public.clients.constitution IS 'Entity constitution type: company, partnership, proprietorship, llp, trust, society, aop, huf';

-- Create a table to store financial statement templates
CREATE TABLE public.fs_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  constitution_type TEXT NOT NULL, -- company, non_corporate
  level1 TEXT NOT NULL,
  level2 TEXT,
  level3 TEXT,
  level4 TEXT,
  level5 TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fs_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for fs_templates
CREATE POLICY "Users can view all templates" 
ON public.fs_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert templates" 
ON public.fs_templates 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update templates" 
ON public.fs_templates 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete templates" 
ON public.fs_templates 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_fs_templates_updated_at
BEFORE UPDATE ON public.fs_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Schedule III templates for Companies
INSERT INTO public.fs_templates (name, constitution_type, level1, level2, level3, level4, level5, sort_order, created_by) VALUES
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Equity', 'Share Capital', 'Equity Share Capital', NULL, 1, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Equity', 'Share Capital', 'Preference Share Capital', NULL, 2, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Equity', 'Share Capital', 'Share Application Money Pending Allotment', NULL, 3, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Equity', 'Other Equity', 'Reserves & Surplus', 'Securities Premium', 4, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Equity', 'Other Equity', 'Reserves & Surplus', 'Capital Reserve', 5, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Equity', 'Other Equity', 'Reserves & Surplus', 'General Reserve', 6, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Equity', 'Other Equity', 'Reserves & Surplus', 'Retained Earnings', 7, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Non-Current Liabilities', 'Long-term Borrowings', NULL, 8, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Non-Current Liabilities', 'Deferred Tax Liabilities (Net)', NULL, 9, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Non-Current Liabilities', 'Long-term Provisions', NULL, 10, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Non-Current Liabilities', 'Other Non-Current Liabilities', NULL, 11, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Current Liabilities', 'Short-term Borrowings', NULL, 12, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Current Liabilities', 'Trade Payables', 'MSME', 13, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Current Liabilities', 'Trade Payables', 'Others', 14, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Current Liabilities', 'Other Current Liabilities', NULL, 15, 'system'),
('Schedule III - Company', 'company', 'Equity & Liabilities', 'Liabilities', 'Current Liabilities', 'Short-term Provisions', NULL, 16, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Property, Plant & Equipment', 'Land', NULL, 17, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Property, Plant & Equipment', 'Buildings', NULL, 18, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Property, Plant & Equipment', 'Plant & Machinery', NULL, 19, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Property, Plant & Equipment', 'Furniture & Fixtures', NULL, 20, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Property, Plant & Equipment', 'Vehicles', NULL, 21, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Property, Plant & Equipment', 'Capital Work-in-Progress', NULL, 22, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Intangible Assets', 'Goodwill', NULL, 23, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Intangible Assets', 'Software', NULL, 24, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Intangible Assets', 'Licenses / Patents / Trademarks', NULL, 25, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Financial Assets', 'Investments', NULL, 26, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Financial Assets', 'Long-term Loans', NULL, 27, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Financial Assets', 'Security Deposits', NULL, 28, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Non-Current Assets', 'Other Non-Current Assets', 'Deferred Tax Asset (Net)', NULL, 29, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Inventories', 'Raw Materials', NULL, 30, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Inventories', 'Work-in-Progress', NULL, 31, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Inventories', 'Finished Goods', NULL, 32, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Financial Assets', 'Trade Receivables', NULL, 33, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Financial Assets', 'Cash & Cash Equivalents', NULL, 34, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Financial Assets', 'Bank Balances (Other than Cash Equivalents)', NULL, 35, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Financial Assets', 'Short-term Loans & Advances', NULL, 36, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Other Current Assets', 'GST Input Credit Receivable', NULL, 37, 'system'),
('Schedule III - Company', 'company', 'Assets', 'Current Assets', 'Other Current Assets', 'Prepaid Expenses', NULL, 38, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Income', 'Revenue from Operations', 'Sale of Products', NULL, 39, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Income', 'Revenue from Operations', 'Sale of Services', NULL, 40, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Income', 'Other Income', 'Interest Income', NULL, 41, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Income', 'Other Income', 'Dividend Income', NULL, 42, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Expenses', 'Cost of Materials Consumed', NULL, NULL, 43, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Expenses', 'Changes in Inventory', NULL, NULL, 44, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Expenses', 'Employee Benefit Expenses', NULL, NULL, 45, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Expenses', 'Finance Costs', NULL, NULL, 46, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Expenses', 'Depreciation & Amortisation', NULL, NULL, 47, 'system'),
('Schedule III - Company', 'company', 'Statement of Profit & Loss', 'Expenses', 'Other Expenses', NULL, NULL, 48, 'system'),

-- Insert Non-Corporate templates (Partnership, Proprietorship, etc.)
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Capital Account', 'Proprietor / Partners Capital', NULL, 1, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Capital Account', 'Drawings', NULL, 2, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Reserves & Surplus', 'General Reserve', NULL, 3, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Reserves & Surplus', 'Profit & Loss Balance', NULL, 4, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Loans (Liability)', 'Secured Loans', NULL, 5, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Loans (Liability)', 'Unsecured Loans', NULL, 6, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Current Liabilities', 'Sundry Creditors', NULL, 7, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Current Liabilities', 'Statutory Liabilities', 'GST / TDS / PF', 8, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Current Liabilities', 'Other Payables', NULL, 9, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Capital & Liabilities', 'Provisions', 'Expenses Payable', NULL, 10, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Fixed Assets', 'Land & Building', NULL, 11, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Fixed Assets', 'Plant & Machinery', NULL, 12, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Fixed Assets', 'Furniture & Fixtures', NULL, 13, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Fixed Assets', 'Vehicles', NULL, 14, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Fixed Assets', 'Computers', NULL, 15, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Investments', 'Long-term Investments', NULL, 16, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Current Assets', 'Inventories', NULL, 17, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Current Assets', 'Sundry Debtors', NULL, 18, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Current Assets', 'Cash-in-Hand', NULL, 19, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Current Assets', 'Bank Balances', NULL, 20, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Current Assets', 'Loans & Advances', NULL, 21, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Balance Sheet', 'Assets', 'Current Assets', 'Other Current Assets', NULL, 22, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Income', 'Revenue', 'Sales', NULL, 23, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Income', 'Revenue', 'Service Income', NULL, 24, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Income', 'Other Income', 'Interest Received', NULL, 25, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Income', 'Other Income', 'Discount / Commission', NULL, 26, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Expenses', 'Direct Expenses', 'Purchases', NULL, 27, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Expenses', 'Direct Expenses', 'Opening / Closing Stock Adjustment', NULL, 28, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Expenses', 'Indirect Expenses', 'Employee Costs', NULL, 29, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Expenses', 'Indirect Expenses', 'Administrative Expenses', NULL, 30, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Expenses', 'Indirect Expenses', 'Selling & Distribution Expenses', NULL, 31, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Expenses', 'Indirect Expenses', 'Depreciation', NULL, 32, 'system'),
('Non-Corporate Financials', 'non_corporate', 'Profit & Loss', 'Expenses', 'Indirect Expenses', 'Finance Costs', NULL, 33, 'system');