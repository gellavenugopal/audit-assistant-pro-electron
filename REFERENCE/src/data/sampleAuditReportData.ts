/**
 * Sample Audit Report Data - Infosys FY2024-25 Style
 * Pre-filled data to test audit report generation matching the Infosys audit report format
 */

export const INFOSYS_SAMPLE_SETUP = {
  company_cin: 'L85110KA1981PLC013115',
  registered_office: 'Electronics City, Hosur Road, Bengaluru - 560 100, Karnataka, India',
  nature_of_business: 'Information Technology Services',
  is_standalone: true,
  accounting_framework: 'Ind AS',
  company_type: 'public_company',
  is_private_company: false,
  paid_up_capital: 1036_00_00_000, // ₹1,036 crore (approx)
  reserves_surplus: 90000_00_00_000, // ₹90,000 crore (approx)
  borrowings_amount: 0, // Infosys is debt-free
  caro_applicable_status: 'applicable',
};

export const INFOSYS_SAMPLE_MAIN_REPORT = {
  opinionType: 'unqualified' as const,
  reportDate: '2025-04-17',
  financialYearEnd: '2024-25',
  entityName: 'INFOSYS LIMITED',
  entityAddress: 'Electronics City, Hosur Road, Bengaluru - 560 100, Karnataka, India',
  auditorName: 'Vikas Bagaria',
  auditorFirmName: 'DELOITTE HASKINS & SELLS LLP',
  auditorMembershipNo: '060408',
  auditorFirmRegNo: '117366W/W-100018',
  auditorAddress: '',
  auditorCity: 'Bengaluru',
  auditorUDIN: '25060408BMOCIU7329',
  basisForQualification: '',
  qualifiedMatters: '',
  adverseMatters: '',
  disclaimerMatters: '',
  emphasisOfMatter: '',
  otherMatter: '',
  includeKAM: true,
  goingConcernUncertainty: false,
  goingConcernDetails: '',
  keyAuditMatters: [
    {
      id: 'kam-1',
      title: 'Revenue Recognition',
      description: `Revenues from IT services comprising software development and related services, maintenance, consulting and package implementation, licensing of software products and platforms across the Company's core and digital offerings and business process management services. The Company assesses the services promised in a contract and identifies distinct performance obligations in the contract. Identification of distinct performance obligations to determine the deliverables and the ability of the customer to benefit independently from such deliverables involves significant judgement.

In certain integrated services arrangements, contracts with customers include subcontractor services or third-party vendor equipment or software. Revenue from sales of third-party vendor products or services is recorded net of costs when the Company is acting as an agent between the customer and the vendor, and gross when the Company is the principal for the transaction.

Fixed price maintenance revenue is recognized ratably either on a straight-line basis when services are performed through an indefinite number of repetitive acts over a specified period, or using a percentage of completion method when the pattern of benefits from the services rendered to the customer is not even through the period of contract.

As certain contracts with customers involve management's judgment in identifying distinct performance obligations, determining whether the Company is acting as a principal or an agent, and whether fixed price maintenance revenue is recognized on a straight-line basis or using the percentage of completion method, revenue recognition from these judgments were identified as a key audit matter.`,
      auditResponse: `Our audit procedures related to revenue recognition included the following:

• We tested the effectiveness of controls relating to (a) the identification of distinct performance obligations, (b) determination of whether the Company is acting as a principal or an agent and (c) determination of whether fixed price maintenance revenue for certain contracts is recognized on a straight-line basis or using the percentage of completion method.

• We selected a sample of contracts with customers and performed the following procedures:
  - Obtained and read contract documents for each selection, including master service agreements, and other documents that were part of the agreement.
  - Identified significant terms and deliverables in the contract to assess management's conclusions regarding the identification of distinct performance obligations, whether the Company is acting as a principal or an agent, and whether fixed price maintenance revenue is recognized on a straight-line basis or using the percentage of completion method.

• For fixed price contracts measured using percentage-of-completion method:
  - Evaluated management's ability to reasonably estimate progress towards satisfying the performance obligation by comparing actual efforts or costs incurred to prior year estimates.
  - Compared efforts or costs incurred with Company's estimate to identify significant variations and evaluate whether those variations have been considered appropriately.
  - Tested the estimate for consistency with the status of delivery of milestones and customer acceptances.`,
    },
  ],
};

export const INFOSYS_SAMPLE_CARO_RESPONSES: Record<string, {
  is_applicable: boolean;
  na_reason?: string;
  conclusion_text?: string;
  answers?: Record<string, any>;
}> = {
  '3(i)': {
    is_applicable: true,
    conclusion_text: `(a)(A) The Company has maintained proper records showing full particulars, including quantitative details and situation of property, plant and equipment and relevant details of right-of-use assets.
    
(B) The Company has maintained proper records showing full particulars of intangible assets.

(b) The Company has a program of physical verification of property, plant and equipment and right-of-use assets so to cover all the assets once every three years which, in our opinion, is reasonable having regard to the size of the Company and the nature of its assets. Pursuant to the program, certain property, plant and equipment and right-of-use assets were due for verification during the year and were physically verified by the Management during the year. According to the information and explanations given to us, no material discrepancies were noticed on such verification.

(c) Based on our examination of the property tax receipts and lease agreement for land on which building is constructed, registered sale deed / transfer deed / conveyance deed provided to us, we report that, the title in respect of self-constructed buildings and title deeds of all other immovable properties (other than properties where the company is the lessee and the lease agreements are duly executed in favour of the lessee), disclosed in the financial statements included under Property, Plant and Equipment are held in the name of the Company as at the balance sheet date.

(d) The Company has not revalued any of its property, plant and equipment (including right-of-use assets) and intangible assets during the year.

(e) No proceedings have been initiated during the year or are pending against the Company as at March 31, 2025 for holding any benami property under the Benami Transactions (Prohibition) Act, 1988 (as amended in 2016) and rules made thereunder.`,
  },
  '3(ii)': {
    is_applicable: false,
    na_reason: `(a) The Company does not have any inventory and hence reporting under clause 3(ii)(a) of the Order is not applicable.

(b) The Company has not been sanctioned working capital limits in excess of ₹5 crore, in aggregate, at any points of time during the year, from banks or financial institutions on the basis of security of current assets and hence reporting under clause 3(ii)(b) of the Order is not applicable.`,
  },
  '3(iii)': {
    is_applicable: true,
    conclusion_text: `The Company has made investments in Companies and granted unsecured loans to other parties, during the year, in respect of which:

(a) The Company has provided loans or advances in the nature of loans during the year. Aggregate amount granted/provided during the year to Subsidiary: ₹10 crore. Balance outstanding as at balance sheet date: ₹10 crore. The Company has not provided any guarantee or security to any other entity during the year.

(b) In our opinion, the investments made and the terms and conditions of the grant of loans, during the year are, prima facie, not prejudicial to the Company's interest.

(c) In respect of loans granted by the Company, the schedule of repayment of principal and payment of interest has been stipulated and the repayments of principal amounts and receipts of interest are generally regular as per stipulation.

(d) In respect of loans granted by the Company, there is no overdue amount remaining outstanding as at the balance sheet date.

(e) No loan granted by the Company which has fallen due during the year, has been renewed or extended or fresh loans granted to settle the overdue of existing loans given to the same parties.

(f) The Company has not granted any loans or advances in the nature of loans either repayable on demand or without specifying any terms or period of repayment during the year. Hence, reporting under clause 3(iii)(f) is not applicable.`,
  },
  '3(iv)': {
    is_applicable: true,
    conclusion_text: `The Company has complied with the provisions of Sections 185 and 186 of the Companies Act, 2013 in respect of loans granted, investments made and guarantees and securities provided, as applicable.`,
  },
  '3(v)': {
    is_applicable: false,
    na_reason: `The Company has not accepted any deposit or amounts which are deemed to be deposits. Hence, reporting under clause 3(v) of the Order is not applicable.`,
  },
  '3(vi)': {
    is_applicable: false,
    na_reason: `The maintenance of cost records has not been specified by the Central Government under sub-section (1) of section 148 of the Companies Act, 2013 for the business activities carried out by the Company. Hence, reporting under clause (vi) of the Order is not applicable to the Company.`,
  },
  '3(vii)': {
    is_applicable: true,
    conclusion_text: `(a) In our opinion, the Company has generally been regular in depositing undisputed statutory dues, including Goods and Services tax, Provident Fund, Employees' State Insurance, Income Tax, Sales Tax, Service Tax, duty of Custom, duty of Excise, Value Added Tax, Cess and other material statutory dues applicable to it with the appropriate authorities.

There were no undisputed amounts payable in respect of Goods and Service tax, Provident Fund, Employees' State Insurance, Income Tax, Sales Tax, Service Tax, duty of Custom, duty of Excise, Value Added Tax, Cess and other material statutory dues in arrears as at March 31, 2025 for a period of more than six months from the date they became payable.

(b) Details of statutory dues which have not been deposited as on March 31, 2025 on account of disputes are maintained in a separate schedule. [Refer Note: Schedule of Disputed Taxes]`,
  },
  '3(viii)': {
    is_applicable: true,
    conclusion_text: `There were no transactions relating to previously unrecorded income that have been surrendered or disclosed as income during the year in the tax assessments under the Income Tax Act, 1961 (43 of 1961).`,
  },
  '3(ix)': {
    is_applicable: true,
    conclusion_text: `(a) The Company has not taken any loans or other borrowings from any lender. Hence reporting under clause 3(ix)(a) of the Order is not applicable.

(b) The Company has not been declared wilful defaulter by any bank or financial institution or government or any government authority.

(c) The Company has not taken any term loan during the year and there are no outstanding term loans at the beginning of the year and hence, reporting under clause 3(ix)(c) of the Order is not applicable.

(d) On an overall examination of the financial statements of the Company, funds raised on short-term basis have, prima facie, not been used during the year for long-term purposes by the Company.

(e) On an overall examination of the financial statements of the Company, the Company has not taken any funds from any entity or person on account of or to meet the obligations of its subsidiaries.

(f) The Company has not raised any loans during the year and hence reporting on clause 3(ix)(f) of the Order is not applicable.`,
  },
  '3(x)': {
    is_applicable: false,
    na_reason: `(a) The Company has not raised moneys by way of initial public offer or further public offer (including debt instruments) during the year and hence reporting under clause 3(x)(a) of the Order is not applicable.

(b) During the year, the Company has not made any preferential allotment or private placement of shares or convertible debentures (fully or partly or optionally) and hence reporting under clause 3(x)(b) of the Order is not applicable.`,
  },
  '3(xi)': {
    is_applicable: true,
    conclusion_text: `(a) No fraud by the Company and no material fraud on the Company has been noticed or reported during the year.

(b) No report under sub-section (12) of section 143 of the Companies Act has been filed in Form ADT-4 as prescribed under rule 13 of Companies (Audit and Auditors) Rules, 2014 with the Central Government, during the year and up to the date of this report.

(c) We have taken into consideration the whistle blower complaints received by the Company during the year (and up to the date of this report), while determining the nature, timing and extent of our audit procedures.`,
  },
  '3(xii)': {
    is_applicable: false,
    na_reason: `The Company is not a Nidhi Company and hence reporting under clause (xii) of the Order is not applicable.`,
  },
  '3(xiii)': {
    is_applicable: true,
    conclusion_text: `In our opinion, the Company is in compliance with Section 177 and 188 of the Companies Act, 2013 with respect to applicable transactions with the related parties and the details of related party transactions have been disclosed in the Standalone Financial Statements as required by the applicable accounting standards.`,
  },
  '3(xiv)': {
    is_applicable: true,
    conclusion_text: `(a) In our opinion, the Company has an adequate internal audit system commensurate with the size and the nature of its business.

(b) We have considered, the internal audit reports for the year under audit, issued to the Company during the year and till date, in determining the nature, timing and extent of our audit procedures.`,
  },
  '3(xv)': {
    is_applicable: true,
    conclusion_text: `In our opinion, during the year the Company has not entered into any non-cash transactions with its Directors or persons connected with its directors and hence provisions of section 192 of the Companies Act, 2013 are not applicable to the Company.`,
  },
  '3(xvi)': {
    is_applicable: false,
    na_reason: `(a) In our opinion, the Company is not required to be registered under section 45-IA of the Reserve Bank of India Act, 1934. Hence, reporting under clause 3(xvi)(a), (b) and (c) of the Order is not applicable.

(b) In our opinion, there is no core investment company within the Group (as defined in the Core Investment Companies (Reserve Bank) Directions, 2016) and accordingly reporting under clause 3(xvi)(d) of the Order is not applicable.`,
  },
  '3(xvii)': {
    is_applicable: true,
    conclusion_text: `The Company has not incurred cash losses during the financial year covered by our audit and the immediately preceding financial year.`,
  },
  '3(xviii)': {
    is_applicable: true,
    conclusion_text: `There has been no resignation of the statutory auditors of the Company during the year.`,
  },
  '3(xix)': {
    is_applicable: true,
    conclusion_text: `On the basis of the financial ratios, ageing and expected dates of realisation of financial assets and payment of financial liabilities, other information accompanying the financial statements and our knowledge of the Board of Directors and Management plans and based on our examination of the evidence supporting the assumptions, nothing has come to our attention, which causes us to believe that any material uncertainty exists as on the date of the audit report indicating that Company is not capable of meeting its liabilities existing at the date of balance sheet as and when they fall due within a period of one year from the balance sheet date. We, however, state that this is not an assurance as to the future viability of the Company. We further state that our reporting is based on the facts up to the date of the audit report and we neither give any guarantee nor any assurance that all liabilities falling due within a period of one year from the balance sheet date, will get discharged by the Company as and when they fall due.`,
  },
  '3(xx)': {
    is_applicable: true,
    conclusion_text: `(a) There are no unspent amounts towards Corporate Social Responsibility ("CSR") on other than ongoing projects requiring a transfer to a Fund specified in Schedule VII to the Companies Act, 2013 in compliance with second proviso to sub-section (5) of Section 135 of the said Act. Accordingly, reporting under clause 3(xx)(a) of the Order is not applicable for the year.

(b) In respect of ongoing projects, the Company has transferred unspent CSR amount as at the end of the previous financial year, to a Special account within a period of 30 days from the end of the said financial year in compliance with the provision of section 135(6) of the Companies Act, 2013.`,
  },
  '3(xxi)': {
    is_applicable: true,
    conclusion_text: `Based on the auditor's reports of the subsidiary companies incorporated in India, furnished to us, the following companies have CARO qualifications/adverse remarks in their respective CARO reports: None. There are no qualifications or adverse remarks in the CARO reports of subsidiary companies incorporated in India.`,
  },
};

export const INFOSYS_SAMPLE_IFCFR = {
  opinion: 'unmodified' as const,
  opinionText: `In our opinion, to the best of our information and according to the explanations given to us, the Company has, in all material respects, an adequate internal financial controls with reference to Standalone Financial Statements and such internal financial controls with reference to Standalone Financial Statements were operating effectively as at March 31, 2025, based on the criteria for internal financial control with reference to Standalone Financial Statements established by the Company considering the essential components of internal control stated in the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting issued by the ICAI.`,
};
