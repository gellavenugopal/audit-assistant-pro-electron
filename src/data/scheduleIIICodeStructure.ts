// Schedule III Code Structure based on Companies Act, 2013
// Hierarchical codes for Balance Sheet and Profit & Loss Statement

export interface ScheduleIIICode {
  code: string;           // e.g., 'EL-SHF-SC-EQ'
  level: number;          // 1-4
  description: string;
  parentCode: string | null;
  appearsOn: 'Face' | 'Note' | 'Sub-item';
  statementType: 'bs' | 'pl';
  noteSequence: number | null;  // For note-level items
}

// ==========================================
// BALANCE SHEET STRUCTURE (24 Notes)
// ==========================================

export const BS_STRUCTURE: ScheduleIIICode[] = [
  // === EQUITY AND LIABILITIES ===
  { code: 'EL', level: 1, description: 'EQUITY AND LIABILITIES', parentCode: null, appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  
  // -- Shareholders' Funds --
  { code: 'EL-SHF', level: 2, description: "Shareholders' Funds", parentCode: 'EL', appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  
  // Note 1: Share Capital
  { code: 'EL-SHF-SC', level: 3, description: 'Share Capital', parentCode: 'EL-SHF', appearsOn: 'Note', statementType: 'bs', noteSequence: 1 },
  { code: 'EL-SHF-SC-EQ', level: 4, description: 'Equity Share Capital', parentCode: 'EL-SHF-SC', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-SC-PR', level: 4, description: 'Preference Share Capital', parentCode: 'EL-SHF-SC', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 2: Reserves and Surplus
  { code: 'EL-SHF-RS', level: 3, description: 'Reserves and Surplus', parentCode: 'EL-SHF', appearsOn: 'Note', statementType: 'bs', noteSequence: 2 },
  { code: 'EL-SHF-RS-CR', level: 4, description: 'Capital Reserves', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-RS-CRR', level: 4, description: 'Capital Redemption Reserve', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-RS-SPR', level: 4, description: 'Securities Premium Reserve', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-RS-DRR', level: 4, description: 'Debenture Redemption Reserve', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-RS-RVR', level: 4, description: 'Revaluation Reserve', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-RS-SRF', level: 4, description: 'Share Options Outstanding Account', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-RS-GR', level: 4, description: 'General Reserve', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-SHF-RS-PL', level: 4, description: 'Surplus (Profit & Loss Account)', parentCode: 'EL-SHF-RS', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 3: Money Received Against Share Warrants
  { code: 'EL-SHF-MW', level: 3, description: 'Money Received Against Share Warrants', parentCode: 'EL-SHF', appearsOn: 'Note', statementType: 'bs', noteSequence: 3 },
  
  // -- Share Application Money Pending Allotment --
  { code: 'EL-SAM', level: 2, description: 'Share Application Money Pending Allotment', parentCode: 'EL', appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  { code: 'EL-SAM-PA', level: 3, description: 'Share Application Money Pending Allotment', parentCode: 'EL-SAM', appearsOn: 'Note', statementType: 'bs', noteSequence: 4 },
  
  // -- Non-Current Liabilities --
  { code: 'EL-NCL', level: 2, description: 'Non-Current Liabilities', parentCode: 'EL', appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  
  // Note 5: Long-term Borrowings
  { code: 'EL-NCL-LTB', level: 3, description: 'Long-term Borrowings', parentCode: 'EL-NCL', appearsOn: 'Note', statementType: 'bs', noteSequence: 5 },
  { code: 'EL-NCL-LTB-BD', level: 4, description: 'Bonds/Debentures', parentCode: 'EL-NCL-LTB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-NCL-LTB-TL', level: 4, description: 'Term Loans from Banks', parentCode: 'EL-NCL-LTB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-NCL-LTB-FI', level: 4, description: 'Term Loans from Financial Institutions', parentCode: 'EL-NCL-LTB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-NCL-LTB-LO', level: 4, description: 'Loans from Related Parties', parentCode: 'EL-NCL-LTB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-NCL-LTB-PD', level: 4, description: 'Public Deposits', parentCode: 'EL-NCL-LTB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-NCL-LTB-OT', level: 4, description: 'Other Long-term Borrowings', parentCode: 'EL-NCL-LTB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 6: Deferred Tax Liabilities (Net)
  { code: 'EL-NCL-DTL', level: 3, description: 'Deferred Tax Liabilities (Net)', parentCode: 'EL-NCL', appearsOn: 'Note', statementType: 'bs', noteSequence: 6 },
  
  // Note 7: Other Long-term Liabilities
  { code: 'EL-NCL-OLL', level: 3, description: 'Other Long-term Liabilities', parentCode: 'EL-NCL', appearsOn: 'Note', statementType: 'bs', noteSequence: 7 },
  { code: 'EL-NCL-OLL-TPS', level: 4, description: 'Trade Payables - Others', parentCode: 'EL-NCL-OLL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-NCL-OLL-OT', level: 4, description: 'Others', parentCode: 'EL-NCL-OLL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 8: Long-term Provisions
  { code: 'EL-NCL-LTP', level: 3, description: 'Long-term Provisions', parentCode: 'EL-NCL', appearsOn: 'Note', statementType: 'bs', noteSequence: 8 },
  { code: 'EL-NCL-LTP-EB', level: 4, description: 'Provision for Employee Benefits', parentCode: 'EL-NCL-LTP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-NCL-LTP-OT', level: 4, description: 'Other Provisions', parentCode: 'EL-NCL-LTP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // -- Current Liabilities --
  { code: 'EL-CL', level: 2, description: 'Current Liabilities', parentCode: 'EL', appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  
  // Note 9: Short-term Borrowings
  { code: 'EL-CL-STB', level: 3, description: 'Short-term Borrowings', parentCode: 'EL-CL', appearsOn: 'Note', statementType: 'bs', noteSequence: 9 },
  { code: 'EL-CL-STB-LR', level: 4, description: 'Loans Repayable on Demand from Banks', parentCode: 'EL-CL-STB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-STB-CC', level: 4, description: 'Cash Credit/Overdraft from Banks', parentCode: 'EL-CL-STB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-STB-RP', level: 4, description: 'Loans from Related Parties', parentCode: 'EL-CL-STB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-STB-ICD', level: 4, description: 'Inter-Corporate Deposits', parentCode: 'EL-CL-STB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-STB-OT', level: 4, description: 'Other Short-term Borrowings', parentCode: 'EL-CL-STB', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 10: Trade Payables
  { code: 'EL-CL-TP', level: 3, description: 'Trade Payables', parentCode: 'EL-CL', appearsOn: 'Note', statementType: 'bs', noteSequence: 10 },
  { code: 'EL-CL-TP-MSME', level: 4, description: 'Due to MSME', parentCode: 'EL-CL-TP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-TP-OTH', level: 4, description: 'Due to Others', parentCode: 'EL-CL-TP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 11: Other Current Liabilities
  { code: 'EL-CL-OCL', level: 3, description: 'Other Current Liabilities', parentCode: 'EL-CL', appearsOn: 'Note', statementType: 'bs', noteSequence: 11 },
  { code: 'EL-CL-OCL-CMLTB', level: 4, description: 'Current Maturities of Long-term Debt', parentCode: 'EL-CL-OCL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-OCL-IPA', level: 4, description: 'Interest Accrued but Not Due on Borrowings', parentCode: 'EL-CL-OCL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-OCL-IPD', level: 4, description: 'Interest Accrued and Due on Borrowings', parentCode: 'EL-CL-OCL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-OCL-DIV', level: 4, description: 'Unpaid Dividends', parentCode: 'EL-CL-OCL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-OCL-ADV', level: 4, description: 'Advances from Customers', parentCode: 'EL-CL-OCL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-OCL-SD', level: 4, description: 'Statutory Dues Payable', parentCode: 'EL-CL-OCL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-OCL-OT', level: 4, description: 'Other Payables', parentCode: 'EL-CL-OCL', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 12: Short-term Provisions
  { code: 'EL-CL-STP', level: 3, description: 'Short-term Provisions', parentCode: 'EL-CL', appearsOn: 'Note', statementType: 'bs', noteSequence: 12 },
  { code: 'EL-CL-STP-EB', level: 4, description: 'Provision for Employee Benefits', parentCode: 'EL-CL-STP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-STP-DIV', level: 4, description: 'Proposed Dividend', parentCode: 'EL-CL-STP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-STP-TAX', level: 4, description: 'Provision for Tax', parentCode: 'EL-CL-STP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'EL-CL-STP-OT', level: 4, description: 'Other Provisions', parentCode: 'EL-CL-STP', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // === ASSETS ===
  { code: 'AS', level: 1, description: 'ASSETS', parentCode: null, appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  
  // -- Non-Current Assets --
  { code: 'AS-NCA', level: 2, description: 'Non-Current Assets', parentCode: 'AS', appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  
  // Note 13: Property, Plant and Equipment & Intangible Assets
  { code: 'AS-NCA-PPE', level: 3, description: 'Property, Plant and Equipment', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 13 },
  { code: 'AS-NCA-PPE-LA', level: 4, description: 'Land', parentCode: 'AS-NCA-PPE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-PPE-BU', level: 4, description: 'Buildings', parentCode: 'AS-NCA-PPE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-PPE-PM', level: 4, description: 'Plant and Machinery', parentCode: 'AS-NCA-PPE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-PPE-FU', level: 4, description: 'Furniture and Fixtures', parentCode: 'AS-NCA-PPE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-PPE-VE', level: 4, description: 'Vehicles', parentCode: 'AS-NCA-PPE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-PPE-OF', level: 4, description: 'Office Equipment', parentCode: 'AS-NCA-PPE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-PPE-CO', level: 4, description: 'Computers', parentCode: 'AS-NCA-PPE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 14: Intangible Assets
  { code: 'AS-NCA-IA', level: 3, description: 'Intangible Assets', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 14 },
  { code: 'AS-NCA-IA-GW', level: 4, description: 'Goodwill', parentCode: 'AS-NCA-IA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-IA-BR', level: 4, description: 'Brands/Trademarks', parentCode: 'AS-NCA-IA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-IA-SW', level: 4, description: 'Computer Software', parentCode: 'AS-NCA-IA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-IA-PT', level: 4, description: 'Patents/Copyrights', parentCode: 'AS-NCA-IA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-IA-OT', level: 4, description: 'Other Intangible Assets', parentCode: 'AS-NCA-IA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 15: Capital Work-in-Progress
  { code: 'AS-NCA-CWIP', level: 3, description: 'Capital Work-in-Progress', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 15 },
  
  // Note 16: Intangible Assets Under Development
  { code: 'AS-NCA-IAUD', level: 3, description: 'Intangible Assets Under Development', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 16 },
  
  // Note 17: Non-Current Investments
  { code: 'AS-NCA-NCI', level: 3, description: 'Non-Current Investments', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 17 },
  { code: 'AS-NCA-NCI-PS', level: 4, description: 'Investment in Property', parentCode: 'AS-NCA-NCI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-NCI-EQ', level: 4, description: 'Investment in Equity Instruments', parentCode: 'AS-NCA-NCI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-NCI-PR', level: 4, description: 'Investment in Preference Shares', parentCode: 'AS-NCA-NCI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-NCI-DB', level: 4, description: 'Investment in Debentures/Bonds', parentCode: 'AS-NCA-NCI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-NCI-MF', level: 4, description: 'Investment in Mutual Funds', parentCode: 'AS-NCA-NCI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-NCI-GS', level: 4, description: 'Investment in Government Securities', parentCode: 'AS-NCA-NCI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-NCI-OT', level: 4, description: 'Other Non-Current Investments', parentCode: 'AS-NCA-NCI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 18: Deferred Tax Assets (Net)
  { code: 'AS-NCA-DTA', level: 3, description: 'Deferred Tax Assets (Net)', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 18 },
  
  // Note 19: Long-term Loans and Advances
  { code: 'AS-NCA-LTLA', level: 3, description: 'Long-term Loans and Advances', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 19 },
  { code: 'AS-NCA-LTLA-CG', level: 4, description: 'Capital Advances', parentCode: 'AS-NCA-LTLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-LTLA-SD', level: 4, description: 'Security Deposits', parentCode: 'AS-NCA-LTLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-LTLA-RP', level: 4, description: 'Loans to Related Parties', parentCode: 'AS-NCA-LTLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-LTLA-OT', level: 4, description: 'Other Loans and Advances', parentCode: 'AS-NCA-LTLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 20: Other Non-Current Assets
  { code: 'AS-NCA-ONCA', level: 3, description: 'Other Non-Current Assets', parentCode: 'AS-NCA', appearsOn: 'Note', statementType: 'bs', noteSequence: 20 },
  { code: 'AS-NCA-ONCA-LTR', level: 4, description: 'Long-term Trade Receivables', parentCode: 'AS-NCA-ONCA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-NCA-ONCA-OT', level: 4, description: 'Others', parentCode: 'AS-NCA-ONCA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // -- Current Assets --
  { code: 'AS-CA', level: 2, description: 'Current Assets', parentCode: 'AS', appearsOn: 'Face', statementType: 'bs', noteSequence: null },
  
  // Note 21: Current Investments
  { code: 'AS-CA-CI', level: 3, description: 'Current Investments', parentCode: 'AS-CA', appearsOn: 'Note', statementType: 'bs', noteSequence: 21 },
  { code: 'AS-CA-CI-MF', level: 4, description: 'Investment in Mutual Funds', parentCode: 'AS-CA-CI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-CI-EQ', level: 4, description: 'Investment in Equity Shares', parentCode: 'AS-CA-CI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-CI-OT', level: 4, description: 'Other Current Investments', parentCode: 'AS-CA-CI', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 22: Inventories
  { code: 'AS-CA-INV', level: 3, description: 'Inventories', parentCode: 'AS-CA', appearsOn: 'Note', statementType: 'bs', noteSequence: 22 },
  { code: 'AS-CA-INV-RM', level: 4, description: 'Raw Materials', parentCode: 'AS-CA-INV', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-INV-WIP', level: 4, description: 'Work-in-Progress', parentCode: 'AS-CA-INV', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-INV-FG', level: 4, description: 'Finished Goods', parentCode: 'AS-CA-INV', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-INV-ST', level: 4, description: 'Stock-in-Trade (Goods for Resale)', parentCode: 'AS-CA-INV', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-INV-SP', level: 4, description: 'Stores and Spares', parentCode: 'AS-CA-INV', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-INV-LS', level: 4, description: 'Loose Tools', parentCode: 'AS-CA-INV', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-INV-OT', level: 4, description: 'Others', parentCode: 'AS-CA-INV', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 23: Trade Receivables
  { code: 'AS-CA-TR', level: 3, description: 'Trade Receivables', parentCode: 'AS-CA', appearsOn: 'Note', statementType: 'bs', noteSequence: 23 },
  { code: 'AS-CA-TR-SEC', level: 4, description: 'Trade Receivables - Secured, Considered Good', parentCode: 'AS-CA-TR', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-TR-USEC', level: 4, description: 'Trade Receivables - Unsecured, Considered Good', parentCode: 'AS-CA-TR', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-TR-DBT', level: 4, description: 'Trade Receivables - Doubtful', parentCode: 'AS-CA-TR', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-TR-PROV', level: 4, description: 'Less: Provision for Doubtful Debts', parentCode: 'AS-CA-TR', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 24: Cash and Cash Equivalents
  { code: 'AS-CA-CCE', level: 3, description: 'Cash and Cash Equivalents', parentCode: 'AS-CA', appearsOn: 'Note', statementType: 'bs', noteSequence: 24 },
  { code: 'AS-CA-CCE-COH', level: 4, description: 'Cash on Hand', parentCode: 'AS-CA-CCE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-CCE-BB', level: 4, description: 'Balances with Banks', parentCode: 'AS-CA-CCE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-CCE-CH', level: 4, description: 'Cheques in Hand', parentCode: 'AS-CA-CCE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-CCE-FD', level: 4, description: 'Fixed Deposits (Short-term)', parentCode: 'AS-CA-CCE', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 25: Short-term Loans and Advances (continuing from BS notes)
  { code: 'AS-CA-STLA', level: 3, description: 'Short-term Loans and Advances', parentCode: 'AS-CA', appearsOn: 'Note', statementType: 'bs', noteSequence: 25 },
  { code: 'AS-CA-STLA-RP', level: 4, description: 'Loans to Related Parties', parentCode: 'AS-CA-STLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-STLA-EMP', level: 4, description: 'Loans and Advances to Staff', parentCode: 'AS-CA-STLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-STLA-PRE', level: 4, description: 'Prepaid Expenses', parentCode: 'AS-CA-STLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-STLA-BAL', level: 4, description: 'Balance with Revenue Authorities', parentCode: 'AS-CA-STLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-STLA-OT', level: 4, description: 'Other Loans and Advances', parentCode: 'AS-CA-STLA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  
  // Note 26: Other Current Assets
  { code: 'AS-CA-OCA', level: 3, description: 'Other Current Assets', parentCode: 'AS-CA', appearsOn: 'Note', statementType: 'bs', noteSequence: 26 },
  { code: 'AS-CA-OCA-INT', level: 4, description: 'Interest Accrued on Investments', parentCode: 'AS-CA-OCA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
  { code: 'AS-CA-OCA-OT', level: 4, description: 'Others', parentCode: 'AS-CA-OCA', appearsOn: 'Sub-item', statementType: 'bs', noteSequence: null },
];

// ==========================================
// PROFIT & LOSS STRUCTURE (10 Notes)
// ==========================================

export const PL_STRUCTURE: ScheduleIIICode[] = [
  // === INCOME ===
  { code: 'INC', level: 1, description: 'INCOME', parentCode: null, appearsOn: 'Face', statementType: 'pl', noteSequence: null },
  
  // Note 27: Revenue from Operations
  { code: 'INC-RFO', level: 2, description: 'Revenue from Operations', parentCode: 'INC', appearsOn: 'Note', statementType: 'pl', noteSequence: 1 },
  { code: 'INC-RFO-SG', level: 3, description: 'Sale of Goods', parentCode: 'INC-RFO', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-RFO-SS', level: 3, description: 'Sale of Services', parentCode: 'INC-RFO', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-RFO-OOR', level: 3, description: 'Other Operating Revenue', parentCode: 'INC-RFO', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-RFO-LESS', level: 3, description: 'Less: Excise Duty/GST', parentCode: 'INC-RFO', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // Note 28: Other Income
  { code: 'INC-OI', level: 2, description: 'Other Income', parentCode: 'INC', appearsOn: 'Note', statementType: 'pl', noteSequence: 2 },
  { code: 'INC-OI-INT', level: 3, description: 'Interest Income', parentCode: 'INC-OI', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-OI-DIV', level: 3, description: 'Dividend Income', parentCode: 'INC-OI', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-OI-RENT', level: 3, description: 'Rental Income', parentCode: 'INC-OI', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-OI-PL', level: 3, description: 'Profit on Sale of Assets', parentCode: 'INC-OI', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-OI-FX', level: 3, description: 'Foreign Exchange Gain', parentCode: 'INC-OI', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'INC-OI-OT', level: 3, description: 'Other Non-Operating Income', parentCode: 'INC-OI', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // === EXPENSES ===
  { code: 'EXP', level: 1, description: 'EXPENSES', parentCode: null, appearsOn: 'Face', statementType: 'pl', noteSequence: null },
  
  // Note 29: Cost of Materials Consumed
  { code: 'EXP-CMC', level: 2, description: 'Cost of Materials Consumed', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 3 },
  { code: 'EXP-CMC-RM', level: 3, description: 'Raw Materials Consumed', parentCode: 'EXP-CMC', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-CMC-PM', level: 3, description: 'Packing Materials Consumed', parentCode: 'EXP-CMC', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-CMC-SP', level: 3, description: 'Stores & Spares Consumed', parentCode: 'EXP-CMC', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // Note 30: Purchases of Stock-in-Trade
  { code: 'EXP-PST', level: 2, description: 'Purchases of Stock-in-Trade', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 4 },
  
  // Note 31: Changes in Inventories
  { code: 'EXP-CII', level: 2, description: 'Changes in Inventories of FG, WIP and Stock-in-Trade', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 5 },
  { code: 'EXP-CII-FG', level: 3, description: 'Changes in Finished Goods', parentCode: 'EXP-CII', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-CII-WIP', level: 3, description: 'Changes in Work-in-Progress', parentCode: 'EXP-CII', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-CII-ST', level: 3, description: 'Changes in Stock-in-Trade', parentCode: 'EXP-CII', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // Note 32: Employee Benefits Expense
  { code: 'EXP-EBE', level: 2, description: 'Employee Benefits Expense', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 6 },
  { code: 'EXP-EBE-SAL', level: 3, description: 'Salaries and Wages', parentCode: 'EXP-EBE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-EBE-PF', level: 3, description: 'Contribution to Provident Fund', parentCode: 'EXP-EBE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-EBE-GR', level: 3, description: 'Gratuity Expense', parentCode: 'EXP-EBE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-EBE-LV', level: 3, description: 'Leave Encashment', parentCode: 'EXP-EBE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-EBE-BON', level: 3, description: 'Bonus', parentCode: 'EXP-EBE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-EBE-WEL', level: 3, description: 'Staff Welfare Expenses', parentCode: 'EXP-EBE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-EBE-OT', level: 3, description: 'Other Employee Benefits', parentCode: 'EXP-EBE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // Note 33: Finance Costs
  { code: 'EXP-FC', level: 2, description: 'Finance Costs', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 7 },
  { code: 'EXP-FC-INT', level: 3, description: 'Interest Expense', parentCode: 'EXP-FC', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-FC-BC', level: 3, description: 'Bank Charges', parentCode: 'EXP-FC', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-FC-OT', level: 3, description: 'Other Borrowing Costs', parentCode: 'EXP-FC', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // Note 34: Depreciation and Amortisation
  { code: 'EXP-DA', level: 2, description: 'Depreciation and Amortisation Expense', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 8 },
  { code: 'EXP-DA-DEP', level: 3, description: 'Depreciation on Property, Plant & Equipment', parentCode: 'EXP-DA', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-DA-AMO', level: 3, description: 'Amortisation of Intangible Assets', parentCode: 'EXP-DA', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // Note 35: Other Expenses
  { code: 'EXP-OE', level: 2, description: 'Other Expenses', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 9 },
  { code: 'EXP-OE-MFG', level: 3, description: 'Manufacturing Expenses', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-RENT', level: 3, description: 'Rent', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-REP', level: 3, description: 'Repairs and Maintenance', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-INS', level: 3, description: 'Insurance', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-PWR', level: 3, description: 'Power and Fuel', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-LEG', level: 3, description: 'Legal and Professional Fees', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-AUD', level: 3, description: 'Audit Fees', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-TRV', level: 3, description: 'Travelling and Conveyance', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-ADV', level: 3, description: 'Advertisement and Publicity', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-COM', level: 3, description: 'Commission', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-FRT', level: 3, description: 'Freight and Forwarding', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-BD', level: 3, description: 'Bad Debts Written Off', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-PROV', level: 3, description: 'Provision for Doubtful Debts', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-PRT', level: 3, description: 'Printing and Stationery', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-TEL', level: 3, description: 'Telephone and Communication', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-FX', level: 3, description: 'Foreign Exchange Loss', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-LA', level: 3, description: 'Loss on Sale of Assets', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-CSR', level: 3, description: 'CSR Expenditure', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-OE-MISC', level: 3, description: 'Miscellaneous Expenses', parentCode: 'EXP-OE', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  
  // Note 36: Tax Expense
  { code: 'EXP-TAX', level: 2, description: 'Tax Expense', parentCode: 'EXP', appearsOn: 'Note', statementType: 'pl', noteSequence: 10 },
  { code: 'EXP-TAX-CUR', level: 3, description: 'Current Tax', parentCode: 'EXP-TAX', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-TAX-DEF', level: 3, description: 'Deferred Tax', parentCode: 'EXP-TAX', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
  { code: 'EXP-TAX-MAT', level: 3, description: 'MAT Credit Entitlement', parentCode: 'EXP-TAX', appearsOn: 'Sub-item', statementType: 'pl', noteSequence: null },
];

// Contingent Liabilities (separate disclosure)
export const CONTINGENT_LIABILITIES: ScheduleIIICode = {
  code: 'CL',
  level: 1,
  description: 'Contingent Liabilities and Commitments',
  parentCode: null,
  appearsOn: 'Note',
  statementType: 'bs',
  noteSequence: null  // Dynamic based on config
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getAllCodes(): ScheduleIIICode[] {
  return [...BS_STRUCTURE, ...PL_STRUCTURE];
}

export function getCodesByStatement(statementType: 'bs' | 'pl'): ScheduleIIICode[] {
  return statementType === 'bs' ? BS_STRUCTURE : PL_STRUCTURE;
}

export function getCodeByCode(code: string): ScheduleIIICode | undefined {
  return getAllCodes().find(c => c.code === code);
}

export function getChildCodes(parentCode: string): ScheduleIIICode[] {
  return getAllCodes().filter(c => c.parentCode === parentCode);
}

export function getLevel3Codes(statementType: 'bs' | 'pl'): ScheduleIIICode[] {
  return getCodesByStatement(statementType).filter(c => c.level === 3 && c.noteSequence !== null);
}

export function getLevel4Codes(parentCode: string): ScheduleIIICode[] {
  return getAllCodes().filter(c => c.parentCode === parentCode && c.level === 4);
}

export function getParentChain(code: string): ScheduleIIICode[] {
  const chain: ScheduleIIICode[] = [];
  let current = getCodeByCode(code);
  
  while (current) {
    chain.unshift(current);
    if (current.parentCode) {
      current = getCodeByCode(current.parentCode);
    } else {
      break;
    }
  }
  
  return chain;
}

export function buildNoteNumberMap(startNoteNumber: number, includeContingentLiabilities: boolean): Map<string, number> {
  const map = new Map<string, number>();
  let currentNote = startNoteNumber;
  
  // BS notes (26 notes in total based on structure)
  const bsNotes = BS_STRUCTURE
    .filter(s => s.noteSequence !== null && s.appearsOn === 'Note')
    .sort((a, b) => a.noteSequence! - b.noteSequence!);
  
  bsNotes.forEach(item => {
    map.set(item.code, currentNote++);
  });
  
  // Contingent Liabilities (if included)
  if (includeContingentLiabilities) {
    map.set('CL', currentNote++);
  }
  
  // PL notes (10 notes in total)
  const plNotes = PL_STRUCTURE
    .filter(s => s.noteSequence !== null && s.appearsOn === 'Note')
    .sort((a, b) => a.noteSequence! - b.noteSequence!);
  
  plNotes.forEach(item => {
    map.set(item.code, currentNote++);
  });
  
  return map;
}

// Get note number for any code (Level 4 items inherit from parent Level 3)
export function getNoteNumberForCode(code: string, noteMap: Map<string, number>): number | null {
  // Check if code itself has a note number
  if (noteMap.has(code)) {
    return noteMap.get(code)!;
  }
  
  // Walk up the parent chain to find a note-level parent
  const parts = code.split('-');
  for (let len = parts.length - 1; len >= 2; len--) {
    const parentCode = parts.slice(0, len).join('-');
    if (noteMap.has(parentCode)) {
      return noteMap.get(parentCode)!;
    }
  }
  
  return null;
}

// Mapping from Schedule III codes to fs_area values used by Balance Sheet/P&L components
const CODE_TO_FS_AREA: Record<string, string> = {
  // Equity and Liabilities
  'EL-SHF-SC': 'Equity',
  'EL-SHF-SC-EQ': 'Equity',
  'EL-SHF-SC-PR': 'Equity',
  'EL-SHF-RS': 'Reserves',
  'EL-SHF-RS-CR': 'Reserves',
  'EL-SHF-RS-CRR': 'Reserves',
  'EL-SHF-RS-SPR': 'Reserves',
  'EL-SHF-RS-DRR': 'Reserves',
  'EL-SHF-RS-RVR': 'Reserves',
  'EL-SHF-RS-SRF': 'Reserves',
  'EL-SHF-RS-GR': 'Reserves',
  'EL-SHF-RS-PL': 'Reserves',
  'EL-SHF-MW': 'Share Warrants',
  'EL-SAM': 'Share Application',
  'EL-SAM-PA': 'Share Application',
  
  // Non-Current Liabilities
  'EL-NCL-LTB': 'Borrowings',
  'EL-NCL-LTB-BD': 'Borrowings',
  'EL-NCL-LTB-TL': 'Borrowings',
  'EL-NCL-LTB-FI': 'Borrowings',
  'EL-NCL-LTB-LO': 'Borrowings',
  'EL-NCL-LTB-PD': 'Borrowings',
  'EL-NCL-LTB-OT': 'Borrowings',
  'EL-NCL-DTL': 'Deferred Tax',
  'EL-NCL-OLL': 'Other Long Term',
  'EL-NCL-OLL-TPS': 'Other Long Term',
  'EL-NCL-OLL-OT': 'Other Long Term',
  'EL-NCL-LTP': 'Provisions',
  'EL-NCL-LTP-EB': 'Provisions',
  'EL-NCL-LTP-OT': 'Provisions',
  
  // Current Liabilities
  'EL-CL-STB': 'Short Term Borrowings',
  'EL-CL-STB-LR': 'Short Term Borrowings',
  'EL-CL-STB-CC': 'Short Term Borrowings',
  'EL-CL-STB-RP': 'Short Term Borrowings',
  'EL-CL-STB-ICD': 'Short Term Borrowings',
  'EL-CL-STB-OT': 'Short Term Borrowings',
  'EL-CL-TP': 'Payables',
  'EL-CL-TP-MSME': 'Payables MSME',
  'EL-CL-TP-OTH': 'Payables',
  'EL-CL-OCL': 'Other Current Liabilities',
  'EL-CL-OCL-CMLTB': 'Other Current Liabilities',
  'EL-CL-OCL-IPA': 'Other Current Liabilities',
  'EL-CL-OCL-IPD': 'Other Current Liabilities',
  'EL-CL-OCL-DIV': 'Other Current Liabilities',
  'EL-CL-OCL-ADV': 'Other Current Liabilities',
  'EL-CL-OCL-SD': 'Other Current Liabilities',
  'EL-CL-OCL-OT': 'Other Current Liabilities',
  'EL-CL-STP': 'Provisions Current',
  'EL-CL-STP-EB': 'Provisions Current',
  'EL-CL-STP-DIV': 'Provisions Current',
  'EL-CL-STP-TAX': 'Provisions Current',
  'EL-CL-STP-OT': 'Provisions Current',
  
  // Non-Current Assets
  'AS-NCA-PPE': 'Fixed Assets',
  'AS-NCA-PPE-LA': 'Fixed Assets',
  'AS-NCA-PPE-BU': 'Fixed Assets',
  'AS-NCA-PPE-PM': 'Fixed Assets',
  'AS-NCA-PPE-FU': 'Fixed Assets',
  'AS-NCA-PPE-VE': 'Fixed Assets',
  'AS-NCA-PPE-OF': 'Fixed Assets',
  'AS-NCA-PPE-CO': 'Fixed Assets',
  'AS-NCA-IA': 'Intangible Assets',
  'AS-NCA-IA-GW': 'Intangible Assets',
  'AS-NCA-IA-BR': 'Intangible Assets',
  'AS-NCA-IA-SW': 'Intangible Assets',
  'AS-NCA-IA-PT': 'Intangible Assets',
  'AS-NCA-IA-OT': 'Intangible Assets',
  'AS-NCA-CWIP': 'CWIP',
  'AS-NCA-IAUD': 'Intangible Under Dev',
  'AS-NCA-NCI': 'Investments',
  'AS-NCA-NCI-PS': 'Investments',
  'AS-NCA-NCI-EQ': 'Investments',
  'AS-NCA-NCI-PR': 'Investments',
  'AS-NCA-NCI-DB': 'Investments',
  'AS-NCA-NCI-MF': 'Investments',
  'AS-NCA-NCI-GS': 'Investments',
  'AS-NCA-NCI-OT': 'Investments',
  'AS-NCA-DTA': 'Deferred Tax Asset',
  'AS-NCA-LTLA': 'Other Non-Current',
  'AS-NCA-LTLA-CG': 'Other Non-Current',
  'AS-NCA-LTLA-SD': 'Other Non-Current',
  'AS-NCA-LTLA-RP': 'Other Non-Current',
  'AS-NCA-LTLA-OT': 'Other Non-Current',
  'AS-NCA-ONCA': 'Other Non-Current',
  'AS-NCA-ONCA-LTR': 'Other Non-Current',
  'AS-NCA-ONCA-OT': 'Other Non-Current',
  
  // Current Assets
  'AS-CA-CI': 'Current Investments',
  'AS-CA-CI-MF': 'Current Investments',
  'AS-CA-CI-EQ': 'Current Investments',
  'AS-CA-CI-OT': 'Current Investments',
  'AS-CA-INV': 'Inventory',
  'AS-CA-INV-RM': 'Inventory',
  'AS-CA-INV-WIP': 'Inventory',
  'AS-CA-INV-FG': 'Inventory',
  'AS-CA-INV-ST': 'Inventory',
  'AS-CA-INV-SP': 'Inventory',
  'AS-CA-INV-LS': 'Inventory',
  'AS-CA-INV-OT': 'Inventory',
  'AS-CA-TR': 'Receivables',
  'AS-CA-TR-SEC': 'Receivables',
  'AS-CA-TR-USEC': 'Receivables',
  'AS-CA-TR-DBT': 'Receivables',
  'AS-CA-CB': 'Cash',
  'AS-CA-CB-COH': 'Cash',
  'AS-CA-CB-BOB': 'Cash',
  'AS-CA-CB-BFD': 'Cash',
  'AS-CA-CB-OT': 'Cash',
  'AS-CA-STLA': 'Other Current',
  'AS-CA-STLA-SD': 'Other Current',
  'AS-CA-STLA-ADV': 'Other Current',
  'AS-CA-STLA-RP': 'Other Current',
  'AS-CA-STLA-OT': 'Other Current',
  'AS-CA-OCA': 'Other Current',
  'AS-CA-OCA-AI': 'Other Current',
  'AS-CA-OCA-PP': 'Other Current',
  'AS-CA-OCA-OT': 'Other Current',
  
  // P&L - Revenue and Income
  'PL-REV': 'Revenue',
  'PL-REV-SG': 'Revenue',
  'PL-REV-SS': 'Revenue',
  'PL-REV-OOR': 'Revenue',
  'PL-OI': 'Other Income',
  'PL-OI-INT': 'Other Income',
  'PL-OI-DIV': 'Other Income',
  'PL-OI-GIN': 'Other Income',
  'PL-OI-REN': 'Other Income',
  'PL-OI-OT': 'Other Income',
  
  // P&L - Expenses
  'PL-CMC': 'Cost of Materials',
  'PL-CMC-RM': 'Cost of Materials',
  'PL-CMC-PA': 'Cost of Materials',
  'PL-CMC-CP': 'Cost of Materials',
  'PL-PST': 'Purchases',
  'PL-CIS': 'Inventory Change',
  'PL-EBE': 'Employee Benefits',
  'PL-EBE-SW': 'Employee Benefits',
  'PL-EBE-CB': 'Employee Benefits',
  'PL-EBE-SC': 'Employee Benefits',
  'PL-EBE-GR': 'Employee Benefits',
  'PL-EBE-LV': 'Employee Benefits',
  'PL-EBE-OT': 'Employee Benefits',
  'PL-FC': 'Finance',
  'PL-FC-INT': 'Finance',
  'PL-FC-OFC': 'Finance',
  'PL-DA': 'Depreciation',
  'PL-DA-DP': 'Depreciation',
  'PL-DA-AM': 'Depreciation',
  'PL-OE': 'Other Expenses',
  'PL-OE-CON': 'Other Expenses',
  'PL-OE-REN': 'Other Expenses',
  'PL-OE-REP': 'Other Expenses',
  'PL-OE-INS': 'Other Expenses',
  'PL-OE-RAT': 'Other Expenses',
  'PL-OE-FRE': 'Other Expenses',
  'PL-OE-ADV': 'Other Expenses',
  'PL-OE-COM': 'Other Expenses',
  'PL-OE-BD': 'Other Expenses',
  'PL-OE-TRV': 'Other Expenses',
  'PL-OE-TEL': 'Other Expenses',
  'PL-OE-LEG': 'Other Expenses',
  'PL-OE-AUD': 'Other Expenses',
  'PL-OE-CSR': 'Other Expenses',
  'PL-OE-OT': 'Other Expenses',
  
  // Tax
  'PL-EI': 'Exceptional',
  'PL-TAX-CT': 'Current Tax',
  'PL-TAX-DT': 'Deferred Tax Expense',
};

// Decode a Schedule III code into its components for proper database storage
export interface DecodedScheduleIIICode {
  code: string;
  aile: 'Asset' | 'Liability' | 'Income' | 'Expense' | null;
  fs_area: string | null;
  face_group: string | null;
  note_group: string | null;
  sub_note: string | null;
}

export function decodeScheduleIIICode(code: string): DecodedScheduleIIICode {
  if (!code || code === 'UNMAPPED') {
    return { code, aile: null, fs_area: null, face_group: null, note_group: null, sub_note: null };
  }

  // Get AILE based on code prefix
  let aile: 'Asset' | 'Liability' | 'Income' | 'Expense' | null = null;
  if (code.startsWith('AS-')) {
    aile = 'Asset';
  } else if (code.startsWith('EL-')) {
    aile = 'Liability';
  } else if (code.startsWith('PL-REV') || code.startsWith('PL-OI')) {
    aile = 'Income';
  } else if (code.startsWith('PL-')) {
    aile = 'Expense';
  }

  // Get fs_area from mapping
  const fs_area = CODE_TO_FS_AREA[code] || null;
  
  // If not found directly, try to find parent code
  let resolvedFsArea = fs_area;
  if (!resolvedFsArea) {
    const parts = code.split('-');
    for (let len = parts.length - 1; len >= 2; len--) {
      const parentCode = parts.slice(0, len).join('-');
      if (CODE_TO_FS_AREA[parentCode]) {
        resolvedFsArea = CODE_TO_FS_AREA[parentCode];
        break;
      }
    }
  }

  // Get hierarchy info from BS/PL structure
  const codeInfo = getCodeByCode(code);
  
  let face_group: string | null = null;
  let note_group: string | null = null;
  let sub_note: string | null = null;
  
  if (codeInfo) {
    // Get the parent chain to identify face group and note group
    const chain = getParentChain(code);
    
    // Level 2 = face_group (e.g., "Shareholders' Funds")
    // Level 3 = note_group (e.g., "Share Capital")
    // Level 4 = sub_note (e.g., "Equity Share Capital")
    
    chain.forEach(item => {
      if (item.level === 2) {
        face_group = item.description;
      } else if (item.level === 3) {
        note_group = item.description;
      } else if (item.level === 4) {
        sub_note = item.description;
      }
    });
  }

  return {
    code,
    aile,
    fs_area: resolvedFsArea,
    face_group,
    note_group,
    sub_note,
  };
}
