// Centralized starter templates used by the audit report generator/editor.
//
// Note: Wording templates can vary by firm policy and engagement facts.
// These are intentionally conservative “starter” templates that users can edit.

export type OpinionType = 'unqualified' | 'qualified' | 'adverse' | 'disclaimer';

export type SA720BoardReportStatus =
  | 'received_no_misstatement'
  | 'received_material_misstatement'
  | 'not_received';

export function buildOpinionHeading(opinionType: OpinionType) {
  switch (opinionType) {
    case 'unqualified':
      return 'Opinion';
    case 'qualified':
      return 'Qualified Opinion';
    case 'adverse':
      return 'Adverse Opinion';
    case 'disclaimer':
      return 'Disclaimer of Opinion';
  }
}

export function buildOpinionParagraph(params: {
  opinionType: OpinionType;
  entityName: string;
  periodEndLabel: string; // e.g., "31 March 2025" or FY label
  includeCashFlow: boolean;
  hasBranchAuditors?: boolean;
  branchLocations?: string | null;
  profitOrLoss?: 'profit' | 'loss' | null;
  ifcApplicable?: boolean;
  ifcAnnexureLetter?: string | null;
}) {
  const { opinionType, entityName, periodEndLabel, includeCashFlow, hasBranchAuditors, branchLocations, profitOrLoss, ifcApplicable, ifcAnnexureLetter } = params;
  const cashFlowIntro = includeCashFlow ? ' and the Statement of Cash Flows' : '';
  const profitLossText = profitOrLoss === 'profit' ? 'profit' : profitOrLoss === 'loss' ? 'loss' : 'profit/loss [delete whichever is not applicable]';
  const profitAndCashPhrase = includeCashFlow
    ? `and its ${profitLossText} and its cash flows`
    : `and its ${profitLossText}`;

  const branchAuditorClause = hasBranchAuditors
    ? ` in which are included the Returns for the year ended on that date audited by the branch auditors of the Company's branches located at ${branchLocations || '________________'}`
    : '';

  const ifcClause = ifcApplicable
    ? `\n\nWe have also audited, in accordance with the Standards on Auditing (SAs) issued by the ICAI, as specified under Section 143(10) of the Act, the Company's internal financial controls with reference to standalone financial statements as at ${periodEndLabel} and our report in Annexure ${ifcAnnexureLetter || 'B'} expresses an unmodified opinion thereon.`
    : '';

  switch (opinionType) {
    case 'unqualified':
      return `We have audited the accompanying standalone financial statements of ${entityName} ("the Company"), which comprise the Balance Sheet as at ${periodEndLabel}, the Statement of Profit and Loss${cashFlowIntro} for the year then ended, and notes to the standalone financial statements, including a summary of significant accounting policies and other explanatory information (hereinafter referred to as "the standalone financial statements")${branchAuditorClause}.${ifcClause}

In our opinion and to the best of our information and according to the explanations given to us, the aforesaid standalone financial statements give the information required by the Companies Act, 2013 ("the Act") in the manner so required and give a true and fair view in conformity with the Accounting Standards specified under section 133 of the Act and other accounting principles generally accepted in India, of the state of affairs of the Company as at ${periodEndLabel}, ${profitAndCashPhrase} for the year ended on that date.`;

    case 'qualified':
      return `We have audited the accompanying standalone financial statements of ${entityName} ("the Company"), which comprise the Balance Sheet as at ${periodEndLabel}, the Statement of Profit and Loss${cashFlowIntro} for the year then ended, and notes to the standalone financial statements, including a summary of significant accounting policies and other explanatory information (hereinafter referred to as "the standalone financial statements")${branchAuditorClause}.${ifcClause}

In our opinion and to the best of our information and according to the explanations given to us, except for the effects of the matter(s) described in the Basis for Qualified Opinion section of our report, the aforesaid standalone financial statements give the information required by the Act in the manner so required and give a true and fair view in conformity with the Accounting Standards specified under section 133 of the Act and other accounting principles generally accepted in India, of the state of affairs of the Company as at ${periodEndLabel}, ${profitAndCashPhrase} for the year ended on that date.`;
    
    case 'adverse':
      return `We have audited the accompanying standalone financial statements of ${entityName} ("the Company"), which comprise the Balance Sheet as at ${periodEndLabel}, the Statement of Profit and Loss${cashFlowIntro} for the year then ended, and notes to the standalone financial statements, including a summary of significant accounting policies and other explanatory information (hereinafter referred to as "the standalone financial statements")${branchAuditorClause}.${ifcClause}

In our opinion, because of the significance of the matter(s) discussed in the Basis for Adverse Opinion section of our report, the accompanying financial statements do not give a true and fair view in conformity with the Accounting Standards specified under section 133 of the Act and other accounting principles generally accepted in India, of the state of affairs of the Company as at ${periodEndLabel}, ${profitAndCashPhrase} for the year ended on that date.`;

    case 'disclaimer':
      return `We have audited the accompanying standalone financial statements of ${entityName} ("the Company"), which comprise the Balance Sheet as at ${periodEndLabel}, the Statement of Profit and Loss${cashFlowIntro} for the year then ended, and notes to the standalone financial statements, including a summary of significant accounting policies and other explanatory information (hereinafter referred to as "the standalone financial statements")${branchAuditorClause}.${ifcClause}

Because of the significance of the matter(s) described in the Basis for Disclaimer of Opinion section of our report, we have not been able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion. Accordingly, we do not express an opinion on the financial statements.`;
  }
}

export const BASIS_FOR_OPINION_STARTER = {
  unqualified:
    'We conducted our audit of the standalone financial statements in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Act. Our responsibilities under those Standards are further described in the Auditors\' Responsibilities for the Audit of the Standalone Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India ("ICAI") together with the ethical requirements that are relevant to our audit of the standalone financial statements under the provisions of the Act and the Rules made thereunder, and we have fulfilled our other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our audit opinion.',
  qualified:
    'We conducted our audit of the standalone financial statements in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Act. Our responsibilities under those Standards are further described in the Auditors\' Responsibilities for the Audit of the Standalone Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India ("ICAI") together with the ethical requirements that are relevant to our audit of the standalone financial statements under the provisions of the Act and the Rules made thereunder, and we have fulfilled our other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our qualified opinion.',
  adverse:
    'We conducted our audit of the standalone financial statements in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Act. Our responsibilities under those Standards are further described in the Auditors\' Responsibilities for the Audit of the Standalone Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India ("ICAI") together with the ethical requirements that are relevant to our audit of the standalone financial statements under the provisions of the Act and the Rules made thereunder, and we have fulfilled our other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our adverse opinion.',
  disclaimer:
    'We were engaged to audit the standalone financial statements of the Company. Our responsibilities under the Standards on Auditing are further described in the Auditors\' Responsibilities for the Audit of the Standalone Financial Statements section of our report. Because of the matter(s) described in the Basis for Disclaimer of Opinion section of our report, we were not able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion.',
} satisfies Record<OpinionType, string>;

export function buildManagementResponsibilitiesParagraph(includeCashFlow: boolean) {
  const cashFlowPhrase = includeCashFlow 
    ? 'and financial performance and cash flows' 
    : 'and financial performance';

  return `The Company's Board of Directors is responsible for the matters stated in section 134(5) of the Act with respect to the preparation of these standalone financial statements that give a true and fair view of the financial position, ${cashFlowPhrase} of the Company in accordance with the accounting principles generally accepted in India, including the Accounting Standards (AS) specified under section 133 of the Act. This responsibility also includes maintenance of adequate accounting records in accordance with the provisions of the Act for safeguarding of the assets of the Company and for preventing and detecting frauds and other irregularities; selection and application of appropriate accounting policies; making judgments and estimates that are reasonable and prudent; and design, implementation and maintenance of adequate internal financial controls, that were operating effectively for ensuring the accuracy and completeness of the accounting records, relevant to the preparation and presentation of the standalone financial statements that give a true and fair view and are free from material misstatement, whether due to fraud or error.

In preparing the standalone financial statements, management is responsible for assessing the Company's ability to continue as a going concern, disclosing, as applicable, matters related to going concern and using the going concern basis of accounting unless management either intends to liquidate the Company or to cease operations, or has no realistic alternative but to do so.

The Board of Directors is also responsible for overseeing the Company's financial reporting process.`;
}

export function buildAuditorResponsibilitiesParagraph(ifcApplicable: boolean) {
  if (ifcApplicable) {
    return `Our objectives are to obtain reasonable assurance about whether the standalone financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditors' report that includes our opinion. Reasonable assurance is a high level of assurance but is not a guarantee that an audit conducted in accordance with SAs will always detect a material misstatement when it exists. Misstatements can arise from fraud or error and are considered material if, individually or in aggregate, they could reasonably be expected to influence the economic decisions of users taken on the basis of these standalone financial statements.

As part of an audit in accordance with SAs, we exercise professional judgment and maintain professional skepticism throughout the audit. We also:

•	Identify and assess the risks of material misstatement of the standalone financial statements, whether due to fraud or error, design and perform audit procedures responsive to those risks, and obtain audit evidence that is sufficient and appropriate to provide a basis for our opinion. The risk of not detecting a material misstatement resulting from fraud is higher than for one resulting from error, as fraud may involve collusion, forgery, intentional omissions, misrepresentations, or the override of internal control.

•	Obtain an understanding of internal control relevant to the audit in order to design audit procedures that are appropriate in the circumstances. Under section 143(3)(i) of the Act, we are also responsible for expressing our opinion on whether the Company has adequate internal financial controls with reference to financial statements in place and the operating effectiveness of such controls

•	Evaluate the appropriateness of accounting policies used and the reasonableness of accounting estimates and related disclosures made by management.

•	Conclude on the appropriateness of management's use of the going concern basis of accounting and, based on the audit evidence obtained, whether a material uncertainty exists related to events or conditions that may cast significant doubt on the Company's ability to continue as a going concern. If we conclude that a material uncertainty exists, we are required to draw attention in our auditors' report to the related disclosures in the standalone financial statements or, if such disclosures are inadequate, to modify our opinion. Our conclusions are based on the audit evidence obtained up to the date of our auditors' report. However, future events or conditions may cause the Company to cease to continue as a going concern.

•	Evaluate the overall presentation, structure and content of the standalone financial statements, including the disclosures, and whether the standalone financial statements represent the underlying transactions and events in a manner that achieves fair presentation

We communicate with those charged with governance regarding, among other matters, the planned scope and timing of the audit and significant audit findings, including any significant deficiencies in internal control that we identify during our audit.

We also provide those charged with governance with a statement that we have complied with relevant ethical requirements regarding independence, and to communicate with them all relationships and other matters that may reasonably be thought to bear on our independence, and where applicable, related safeguards`;
  } else {
    return `Our objectives are to obtain reasonable assurance about whether the standalone financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditors' report that includes our opinion. Reasonable assurance is a high level of assurance but is not a guarantee that an audit conducted in accordance with SAs will always detect a material misstatement when it exists. Misstatements can arise from fraud or error and are considered material if, individually or in aggregate, they could reasonably be expected to influence the economic decisions of users taken on the basis of these standalone financial statements.

As part of an audit in accordance with SAs, we exercise professional judgment and maintain professional skepticism throughout the audit. We also:

•	Identify and assess the risks of material misstatement of the standalone financial statements, whether due to fraud or error, design and perform audit procedures responsive to those risks, and obtain audit evidence that is sufficient and appropriate to provide a basis for our opinion. The risk of not detecting a material misstatement resulting from fraud is higher than for one resulting from error, as fraud may involve collusion, forgery, intentional omissions, misrepresentations, or the override of internal control.

•	Obtain an understanding of internal control relevant to the audit in order to design audit procedures that are appropriate in the circumstances, but not for the purpose of expressing an opinion on the effectiveness of the entity's internal control

•	Evaluate the appropriateness of accounting policies used and the reasonableness of accounting estimates and related disclosures made by management.

•	Conclude on the appropriateness of management's use of the going concern basis of accounting and, based on the audit evidence obtained, whether a material uncertainty exists related to events or conditions that may cast significant doubt on the Company's ability to continue as a going concern. If we conclude that a material uncertainty exists, we are required to draw attention in our auditors' report to the related disclosures in the standalone financial statements or, if such disclosures are inadequate, to modify our opinion. Our conclusions are based on the audit evidence obtained up to the date of our auditors' report. However, future events or conditions may cause the Company to cease to continue as a going concern.

•	Evaluate the overall presentation, structure and content of the standalone financial statements, including the disclosures, and whether the standalone financial statements represent the underlying transactions and events in a manner that achieves fair presentation

We communicate with those charged with governance regarding, among other matters, the planned scope and timing of the audit and significant audit findings, including any significant deficiencies in internal control that we identify during our audit.

We also provide those charged with governance with a statement that we have complied with relevant ethical requirements regarding independence, and to communicate with them all relationships and other matters that may reasonably be thought to bear on our independence, and where applicable, related safeguards`;
  }
}

export function buildKAMIntro() {
  return 'Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the financial statements of the current period. These matters were addressed in the context of our audit of the financial statements as a whole, and in forming our opinion thereon, and we do not provide a separate opinion on these matters.';
}

export function buildSA720Paragraph(status: SA720BoardReportStatus, misstatementDetails?: string | null) {
  switch (status) {
    case 'received_no_misstatement':
      return `The Company’s Board of Directors is responsible for the other information. The other information comprises the information included in the Board’s Report including annexures to Board’s Report but does not include the standalone financial statements and our auditors’ report thereon.

Our opinion on the standalone financial statements does not cover the other information and we do not express any form of assurance conclusion thereon.

In connection with our audit of the standalone financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the standalone financial statements or our knowledge obtained in the audit or otherwise appears to be materially misstated.

If, based on the work we have performed, we conclude that there is a material misstatement of this other information, we are required to report that fact. We have nothing to report in this regard.`;

    case 'received_material_misstatement':
      return `The Company’s Board of Directors is responsible for the other information. The other information comprises the information included in the Board’s Report including annexures to Board’s Report but does not include the standalone financial statements and our auditors’ report thereon.

Our opinion on the standalone financial statements does not cover the other information and we do not express any form of assurance conclusion thereon.

In connection with our audit of the standalone financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the standalone financial statements or our knowledge obtained in the audit or otherwise appears to be materially misstated.

If, based on the work we have performed, we conclude that there is a material misstatement of this other information, we are required to report that fact. As described below, we have concluded that such a material misstatement of the other information exists.

${misstatementDetails || '[Description of material misstatement of the other information] – USER DEFINED'}`;

    case 'not_received':
      return `The Company’s Board of Directors is responsible for the other information. The other information comprises the information included in the Board’s Report including annexures to Board’s Report but does not include the standalone financial statements and our auditors’ report thereon. The Board’s Report including annexures to Board’s Report is expected to be made available to us after the date of this auditor's report.

Our opinion on the standalone financial statements does not cover the other information and we will not express any form of assurance conclusion thereon.

In connection with our audit of the standalone financial statements, our responsibility is to read the other information identified above when it becomes available and, in doing so, consider whether the other information is materially inconsistent with the standalone financial statements or our knowledge obtained in the audit or otherwise appears to be materially misstated.

When we read the Board’s Report including annexures to Board’s Report, if we conclude that there is a material misstatement therein, we are required to communicate the matter to those charged with governance and take appropriate actions necessitated by the circumstances & the applicable laws and regulations..`;
  }
}

export const STATUS_OPTIONS = [
  { value: 'yes', label: 'Yes / Complied' },
  { value: 'no', label: 'No / Not complied' },
  { value: 'na', label: 'Not applicable' },
  { value: 'qualified', label: 'Qualified / With remarks' },
] as const;

export type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];
