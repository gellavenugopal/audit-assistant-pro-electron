// ============================================================================
// ENGAGEMENT LETTER TEMPLATES
// ============================================================================
// Master templates with merge tags and conditional blocks
// Used for generation of 4 letter types

/**
 * TEMPLATE 1: Statutory Audit – Unlisted Company
 * Scope adapts based on:
 *   - IFC_APPLICABLE: Include/exclude IFC audit paragraphs
 *   - CARO_APPLICABLE: Include/exclude CARO 2020 scope
 *   - IND_AS_APPLICABLE: Use Ind AS vs AS/Schedule III
 */
export const STATUTORY_AUDIT_COMPANY_TEMPLATE = `
ENGAGEMENT LETTER
STATUTORY AUDIT

{{FIRM_NAME}}
Chartered Accountants
(Firm Registration No. {{FIRM_REG_NO}})
{{PLACE}}
{{LETTER_DATE}}

TO THE BOARD OF DIRECTORS / MEMBERS
{{ENTITY_NAME}}
{{REGISTERED_ADDRESS}}
Email: {{EMAIL}}
Phone: {{PHONE}}

Dear Sir / Madam,

RE: APPOINTMENT AS STATUTORY AUDITORS

We acknowledge your appointment as Statutory Auditors of {{ENTITY_NAME}} (hereinafter referred to as "the Company") to audit the standalone financial statements for the financial year ending {{BALANCE_SHEET_DATE}} (referred to as "the Financial Statements" and the engagement referred to as "the Engagement").

We are pleased to confirm our engagement on the terms and conditions set out in this letter.

1. OBJECTIVES AND RESPONSIBILITIES

1.1 Our Audit Objectives

Our primary responsibility is to conduct an audit of the standalone financial statements and to express an independent audit opinion on whether the Financial Statements give a true and fair view in accordance with applicable accounting standards and the Companies Act, 2013.

We will conduct our audit in accordance with the Standards on Auditing (SAs) issued by the Institute of Chartered Accountants of India (ICAI).

1.2 Scope of Audit

Our audit scope includes examination of the:
- Balance Sheet as at {{BALANCE_SHEET_DATE}}
- Statement of Profit and Loss for the financial year ended {{BALANCE_SHEET_DATE}}
- Cash Flow Statement for the financial year ended {{BALANCE_SHEET_DATE}}
- Statement of Changes in Equity for the financial year ended {{BALANCE_SHEET_DATE}}
- Notes to the financial statements
- Other disclosure items as required by applicable accounting standards

The financial statements are prepared {{IF IND_AS_APPLICABLE}}in accordance with Indian Accounting Standards (Ind AS){{ELSE}}in accordance with Accounting Standards (AS) or Schedule III of the Companies Act, 2013{{ENDIF}} as applicable.

{{IF CARO_APPLICABLE}}
1.3 CARO 2020 Compliance

Our audit will also include compliance with the requirements of the Companies (Auditor's Report) Order, 2020 ("CARO 2020"). We will report on matters specified in CARO 2020 in our audit report and in Annexure to the Auditor's Report.
{{ENDIF}}

{{IF IFC_APPLICABLE}}
1.4 Internal Financial Controls (IFC) Audit

In accordance with Section 143(3)(i) of the Companies Act, 2013, we will also audit and report on the adequacy of internal financial controls with reference to standalone financial statements and the operating effectiveness of such controls. Our report on IFC will be issued as a separate annexure to the audit report.
{{ENDIF}}

2. MANAGEMENT REPRESENTATION AND RESPONSIBILITY

2.1 Management acknowledges that it is responsible for:

{{IF MGMT_RESPONSIBILITY_ACK}}
✓ The preparation and fair presentation of the standalone financial statements in accordance with applicable accounting standards and the Companies Act, 2013.
{{ENDIF}}

{{IF BOOKS_RESPONSIBILITY_ACK}}
✓ Maintaining adequate books of accounts and supporting records as required under the Companies Act, 2013.
{{ENDIF}}

{{IF INTERNAL_CONTROL_ACK}}
✓ Establishing and maintaining effective internal control systems with reference to financial reporting.
{{ENDIF}}

{{IF FRAUD_PREVENTION_ACK}}
✓ Prevention and detection of fraud, error, and non-compliance with applicable laws and regulations.
{{ENDIF}}

2.2 Management will provide us with:
- Complete access to books, records, and documentation
- All necessary information and explanations
- Written representations as required by applicable auditing standards

3. SCOPE LIMITATIONS AND AUDIT PROCEDURES

3.1 Our audit will be conducted in accordance with SAs and will include:
- Assessing the risks of material misstatement (whether due to fraud or error)
- Obtaining sufficient and appropriate audit evidence
- Evaluating the appropriateness of accounting policies and related disclosures
- Forming an opinion on the Financial Statements
- Testing of transactions and account balances

3.2 Our audit is not designed to:
- Provide assurance on the effectiveness of internal controls for purposes other than financial reporting
- Detect all fraud or irregularities
- Identify violations of law or regulation (except those relevant to financial reporting)

4. PROFESSIONAL FEES AND COMMERCIAL TERMS

4.1 Professional Fees

Our professional fees for the engagement are {{PROFESSIONAL_FEES}} {{IF TAXES_EXTRA}}(exclusive of applicable taxes){{ELSE}}(inclusive of all applicable taxes){{ENDIF}}.

Payment Terms: {{PAYMENT_TERMS}}

{{IF OUT_OF_POCKET_EXP}}
4.2 Out-of-Pocket Expenses

Out-of-pocket expenses incurred in connection with the engagement (travel, communication, etc.) will be charged separately and billed as incurred.
{{ENDIF}}

5. TIMING AND REPORTING

5.1 We will:
- Conduct interim audit procedures during the financial year
- Conduct final audit procedures post year-end
- Issue our audit report within [30 days] of completing field work

5.2 Our audit report will include:
{{IF CARO_APPLICABLE}}
- Our independent audit opinion
- Annexure with CARO 2020 compliance report
{{IF IFC_APPLICABLE}}
- Annexure with IFC audit report
{{ENDIF}}
{{ELSE}}
- Our independent audit opinion
{{IF IFC_APPLICABLE}}
- Annexure with IFC audit report
{{ENDIF}}
{{ENDIF}}

6. INDEPENDENCE AND QUALITY

We confirm our independence in accordance with:
- The Code of Ethics issued by the ICAI
- The provisions of the Companies Act, 2013
- Applicable laws and regulations

We maintain quality control policies and procedures consistent with ICAI standards.

7. COMMUNICATIONS WITH MANAGEMENT

7.1 During the audit, we will communicate with management regarding:
- Our audit strategy and timeline
- Significant findings and observations
- Matters of governance importance

7.2 We will provide a separate management letter highlighting control deficiencies and suggestions for improvement.

8. LIMITATIONS AND DISCLAIMERS

8.1 This engagement is limited to the audit of the Financial Statements as described herein. We do not undertake to:
- Audit any other period or entity
- Provide assurance on prospective financial information
- Provide tax or legal advice (unless separately engaged)

8.2 Our audit report will be prepared for the benefit of the Company and its shareholders. We do not assume responsibility to third parties.

9. APPLICABLE STANDARDS AND REGULATIONS

This engagement will be conducted in accordance with:
- Standards on Auditing (SAs) issued by the ICAI
- Companies Act, 2013
- Companies (Auditor's Report) Order, 2020 {{IF CARO_APPLICABLE}}(CARO 2020){{ENDIF}}
- Applicable accounting standards

10. TENURE AND TERMINATION

The engagement will commence from {{APPOINTMENT_DATE}} for the financial year {{FINANCIAL_YEAR}}.

Either party may terminate this engagement with written notice. Upon termination, we will complete work-in-progress and provide a preliminary report if applicable.

11. CONFIDENTIALITY

We will maintain strict confidentiality regarding all information obtained during the engagement, subject to applicable laws and professional standards.

12. ACCEPTANCE OF TERMS

Please confirm your acceptance of the terms of this engagement letter by:
- Signing and returning a copy of this letter, or
- Providing written email confirmation

{{IF NOT MGMT_RESPONSIBILITY_ACK OR NOT BOOKS_RESPONSIBILITY_ACK OR NOT INTERNAL_CONTROL_ACK OR NOT FRAUD_PREVENTION_ACK}}
[IMPORTANT: Management must acknowledge all responsibility items. Please complete the separate management representation form.]
{{ENDIF}}

We look forward to a productive engagement.

---

For {{FIRM_NAME}}
Chartered Accountants

{{PARTNER_NAME}}
Partner
Membership No. {{PARTNER_MEM_NO}}
DIN: [if applicable]

Date: {{LETTER_DATE}}
Place: {{PLACE}}

---

ACCEPTANCE BY THE COMPANY

We confirm our acceptance of the terms of this engagement letter.

Company: {{ENTITY_NAME}}
CIN: {{REGISTRATION_NO}}

Authorized Signatory: _______________________
Name: _______________________________
Designation: __________________________
Date: ________________________________

`;

/**
 * TEMPLATE 2: Tax Audit – Partnership Firm (Form 3CA)
 * Differences from 3CB:
 *   - Reference to audit under other law (if applicable)
 *   - Specific 3CA compliance language
 */
export const TAX_AUDIT_PARTNERSHIP_3CA_TEMPLATE = `
ENGAGEMENT LETTER
TAX AUDIT – FORM 3CA

{{FIRM_NAME}}
Chartered Accountants
(Firm Registration No. {{FIRM_REG_NO}})
{{PLACE}}
{{LETTER_DATE}}

TO THE PARTNERS / MEMBERS
{{ENTITY_NAME}}
{{REGISTERED_ADDRESS}}
Email: {{EMAIL}}
Phone: {{PHONE}}

Dear Sir / Madam,

RE: APPOINTMENT FOR TAX AUDIT AND Form 3CA CERTIFICATION

We acknowledge our appointment to conduct a tax audit of {{ENTITY_NAME}} (hereinafter referred to as "the Firm") and to prepare Form 3CA for the assessment year {{ASSESSMENT_YEAR}} (for the financial year ending {{BALANCE_SHEET_DATE}}).

1. SCOPE AND OBJECTIVES

1.1 Our engagement includes:
- Audit of the books of account and other records maintained by the Firm
- Verification of entries in the books of account
- Preparation of Form 3CA (Audit Report for Partnership Firms)
- Preparation of financial statements as required by Section 44AB of the Income-tax Act, 1961

1.2 Our audit will be conducted in accordance with:
- Standards on Auditing (SAs) issued by the ICAI
- Income-tax Act, 1961
- Guidance Note on Tax Audit issued by the ICAI
- Applicable Accounting Standards ({{ACCOUNTING_STANDARD}})

{{IF AUDITED_UNDER_OTHER_LAW}}
1.3 Additional Audits

Please note that the Firm's accounts are also audited under [specify other law], and we will coordinate our audit procedures accordingly.
{{ENDIF}}

2. FINANCIAL STATEMENTS AND ACCOUNTING RECORDS

2.1 We will audit the following:
- Profit and Loss Account for the financial year ended {{BALANCE_SHEET_DATE}}
- Balance Sheet as at {{BALANCE_SHEET_DATE}}
- Notes to the financial statements
- Books of account and supporting records

2.2 Financial statements will be prepared in accordance with {{ACCOUNTING_STANDARD}}.

3. MANAGEMENT REPRESENTATION

3.1 The partners/members acknowledge responsibility for:

{{IF MGMT_RESPONSIBILITY_ACK}}
✓ Preparation and accuracy of the financial statements
{{ENDIF}}

{{IF BOOKS_RESPONSIBILITY_ACK}}
✓ Maintenance of accurate books of account as required under the Income-tax Act, 1961
{{ENDIF}}

{{IF FRAUD_PREVENTION_ACK}}
✓ Prevention and detection of fraud and irregularities
{{ENDIF}}

3.2 Management will provide:
- Complete access to books, records, and supporting documentation
- All necessary explanations and clarifications
- Written representations as required

4. FORM 3CA COMPLIANCE

4.1 Form 3CA Certification

We will prepare and certify Form 3CA containing:
- Audit opinion on the accounts
- Schedule of income and deductions as per the books of account
- Reconciliation of book profit with taxable income
- Compliance schedules and notes

4.2 Our report will state:
- Whether the accounts have been properly kept and maintained
- Whether entries in the books of account are in accordance with the financial statements
- Whether the financial statements are in accordance with accounting standards
- Particulars of income-tax assessments during the preceding 5 years

5. PROFESSIONAL FEES AND TERMS

5.1 Professional Fees: {{PROFESSIONAL_FEES}} {{IF TAXES_EXTRA}}(exclusive of applicable taxes){{ELSE}}(inclusive of all applicable taxes){{ENDIF}}

Payment Terms: {{PAYMENT_TERMS}}

{{IF OUT_OF_POCKET_EXP}}
5.2 Out-of-pocket expenses will be charged separately.
{{ENDIF}}

6. COMPLIANCE AND DISCLOSURE

6.1 Disclosures Required by Section 44AB:
- We will report on transactions not supported by reliable documentation
- We will disclose any information required to be given to the Income-tax Department

6.2 The Firm must comply with:
- Maintaining books of account as per Section 44AA
- Submitting the audit report in Form 3CA
- Filing income-tax return with certified financial statements

7. TIMING AND DELIVERY

7.1 We will:
- Conduct interim audit procedures during the year
- Conduct final audit and prepare Form 3CA within [30 days] of year-end
- Deliver final reports and Form 3CA within [agreed timeline]

7.2 Delivery: Form 3CA will be issued in quadruplicate for filing with income-tax authorities.

8. SCOPE LIMITATIONS

8.1 Our audit is not designed to:
- Detect all instances of non-compliance with tax laws
- Provide tax planning or advisory services (unless separately engaged)
- Examine all transactions in detail

8.2 We rely on representations from management regarding:
- Completeness of transactions
- Absence of material fraud or non-compliance

9. INDEPENDENCE AND STANDARDS

We confirm our independence in accordance with ICAI Code of Ethics and applicable laws.

We will maintain quality control and professional standards throughout the engagement.

10. COMMUNICATIONS

10.1 We will communicate with management:
- During the interim and final audit phases
- Upon completion with final reports
- Regarding any significant findings or observations

10.2 A separate management letter may be provided highlighting observations and recommendations.

11. ACCEPTANCE

Please confirm acceptance by signing and returning a copy of this letter or by written email confirmation.

---

For {{FIRM_NAME}}
Chartered Accountants

{{PARTNER_NAME}}
Partner
Membership No. {{PARTNER_MEM_NO}}

Date: {{LETTER_DATE}}
Place: {{PLACE}}

---

ACCEPTANCE

We confirm our acceptance of the terms of this engagement letter.

Firm: {{ENTITY_NAME}}
Registration No.: {{REGISTRATION_NO}}

Authorized Signatory: _______________________
Name: _______________________________
Date: ________________________________

`;

/**
 * TEMPLATE 3: Tax Audit – Partnership Firm (Form 3CB)
 * Differences from 3CA:
 *   - No reference to audit under other law
 *   - Specific 3CB (non-audited accounts) language
 */
export const TAX_AUDIT_PARTNERSHIP_3CB_TEMPLATE = `
ENGAGEMENT LETTER
TAX AUDIT – FORM 3CB

{{FIRM_NAME}}
Chartered Accountants
(Firm Registration No. {{FIRM_REG_NO}})
{{PLACE}}
{{LETTER_DATE}}

TO THE PARTNERS / MEMBERS
{{ENTITY_NAME}}
{{REGISTERED_ADDRESS}}
Email: {{EMAIL}}
Phone: {{PHONE}}

Dear Sir / Madam,

RE: APPOINTMENT FOR TAX AUDIT AND FORM 3CB CERTIFICATION

We acknowledge our appointment to conduct a tax audit of {{ENTITY_NAME}} (hereinafter referred to as "the Firm") and to prepare Form 3CB for the assessment year {{ASSESSMENT_YEAR}} (for the financial year ending {{BALANCE_SHEET_DATE}}).

1. SCOPE AND OBJECTIVES

1.1 Our engagement includes:
- Tax audit of the books of account and records maintained by the Firm
- Verification of entries in the books of account for income-tax compliance
- Preparation of Form 3CB (Tax Audit Report for Partnership Firms - Non-audited Accounts)
- Preparation of financial statements as required by Section 44AB of the Income-tax Act, 1961

1.2 Important Note Regarding Form 3CB

Form 3CB is used when the Firm's accounts are NOT audited under the Companies Act or any other law. This is a tax audit only for income-tax compliance purposes.

1.3 Our audit will be conducted in accordance with:
- Standards on Auditing (SAs) issued by the ICAI
- Income-tax Act, 1961 (particularly Section 44AB)
- Guidance Note on Tax Audit issued by the ICAI
- Applicable Accounting Standards ({{ACCOUNTING_STANDARD}})

2. FINANCIAL STATEMENTS AND ACCOUNTING RECORDS

2.1 We will verify and report on:
- Books of account and records
- Trial balance and final accounts
- Entries in the books of account
- Supporting documentation

2.2 The Firm represents that accounts are NOT audited under the Companies Act, 2013, or any other law.

2.3 Financial statements will be prepared in accordance with {{ACCOUNTING_STANDARD}}.

3. MANAGEMENT REPRESENTATION

3.1 The partners/members acknowledge responsibility for:

{{IF MGMT_RESPONSIBILITY_ACK}}
✓ Preparation and accuracy of the financial statements
{{ENDIF}}

{{IF BOOKS_RESPONSIBILITY_ACK}}
✓ Maintenance of accurate books of account as required under the Income-tax Act, 1961
{{ENDIF}}

{{IF FRAUD_PREVENTION_ACK}}
✓ Prevention and detection of fraud and irregularities
{{ENDIF}}

3.2 Management will provide:
- Complete access to all books, records, and supporting documentation
- All necessary explanations and clarifications
- Written representations as required

3.3 Critical Representation: Management certifies that these accounts are NOT audited under the Companies Act, 2013, or any other law except for this tax audit under Section 44AB.

4. FORM 3CB CERTIFICATION

4.1 Form 3CB Contents

We will prepare and certify Form 3CB containing:
- Verification report on books of account
- Schedule of income and deductions per books
- Reconciliation of book profit with taxable income
- Statement of capital and drawings
- Details of specified transactions (if any)
- Schedules as required by the Income-tax Department

4.2 Our Form 3CB Report

The report will contain:
- Our opinion on the books of account
- Whether entries are properly recorded
- Reconciliation between book profit and taxable income
- Audit particulars and tax history

4.3 Key Distinction from Form 3CA

Unlike Form 3CA (which certifies audited accounts), Form 3CB certifies that:
- We have verified the books of account for income-tax purposes
- The accounts are NOT statutorily audited
- Our certification is limited to income-tax compliance

5. PROFESSIONAL FEES AND TERMS

5.1 Professional Fees: {{PROFESSIONAL_FEES}} {{IF TAXES_EXTRA}}(exclusive of applicable taxes){{ELSE}}(inclusive of all applicable taxes){{ENDIF}}

Payment Terms: {{PAYMENT_TERMS}}

{{IF OUT_OF_POCKET_EXP}}
5.2 Out-of-pocket expenses will be charged separately and billed as incurred.
{{ENDIF}}

6. TAX COMPLIANCE REQUIREMENTS

6.1 Disclosures Under Section 44AB

We will report:
- Transactions not supported by reliable documentation
- Unusual or questionable entries
- Information required to be furnished to income-tax authorities

6.2 The Firm is responsible for:
- Maintaining books of account as per Section 44AA
- Filing income-tax returns with the certified Form 3CB
- Complying with all income-tax compliance requirements

7. TIMING AND DELIVERY

7.1 We will:
- Conduct audit procedures during the financial year and at year-end
- Prepare Form 3CB within [30 days] of year-end
- Issue final reports within [agreed timeline]

7.2 Delivery: Form 3CB will be issued in [number] copies for filing with income-tax authorities.

8. SCOPE LIMITATIONS

8.1 Our audit is not designed to:
- Provide a complete audit opinion (use Form 3CA for audited accounts)
- Detect all instances of error or fraud
- Provide advice on tax planning or structure
- Examine all transactions in granular detail

8.2 We rely on management representations regarding:
- Completeness of transactions and records
- Absence of material errors or fraud
- Compliance with applicable laws

9. INDEPENDENCE AND PROFESSIONAL STANDARDS

We confirm our independence in accordance with:
- ICAI Code of Ethics
- Applicable laws and regulations

We maintain quality control and professional standards throughout the engagement.

10. COMMUNICATIONS AND FOLLOW-UP

10.1 We will communicate with management:
- During the audit process
- At completion with final reports
- Regarding any significant observations

10.2 A management letter may be provided with observations and recommendations.

11. IMPORTANT DISCLAIMERS

11.1 This engagement is limited to tax audit for income-tax compliance. We do not:
- Provide an opinion on overall financial position (use statutory audit for that)
- Guarantee income-tax compliance (ultimate responsibility rests with the Firm)
- Provide tax advisory services (unless separately engaged)

11.2 We accept no responsibility to third parties for our Form 3CB report.

12. ACCEPTANCE

Please confirm your acceptance by signing and returning a copy of this letter or providing written email confirmation.

---

For {{FIRM_NAME}}
Chartered Accountants

{{PARTNER_NAME}}
Partner
Membership No. {{PARTNER_MEM_NO}}

Date: {{LETTER_DATE}}
Place: {{PLACE}}

---

ACCEPTANCE

We confirm our acceptance of the terms of this engagement letter.

Firm: {{ENTITY_NAME}}
Registration No.: {{REGISTRATION_NO}}

Authorized Signatory: _______________________
Name: _______________________________
Designation: __________________________
Date: ________________________________

Critical Certification: We certify that the accounts of {{ENTITY_NAME}} are NOT audited under the Companies Act, 2013, or any other law except for this tax audit under Section 44AB of the Income-tax Act, 1961.

`;
