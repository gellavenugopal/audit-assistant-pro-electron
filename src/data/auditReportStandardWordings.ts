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
}) {
  const { opinionType, entityName, periodEndLabel, includeCashFlow } = params;
  const cashFlowText = includeCashFlow ? ' and its cash flows' : '';

  switch (opinionType) {
    case 'unqualified':
      return `In our opinion and to the best of our information and according to the explanations given to us, the aforesaid financial statements give the information required by the Companies Act, 2013 ("the Act") in the manner so required and give a true and fair view in conformity with the accounting principles generally accepted in India, of the state of affairs of ${entityName} as at ${periodEndLabel}, and its profit/loss${cashFlowText} for the year ended on that date.`;

    case 'qualified':
      return `In our opinion and to the best of our information and according to the explanations given to us, except for the effects of the matter(s) described in the Basis for Qualified Opinion section of our report, the aforesaid financial statements give the information required by the Act in the manner so required and give a true and fair view in conformity with the accounting principles generally accepted in India, of the state of affairs of ${entityName} as at ${periodEndLabel}, and its profit/loss${cashFlowText} for the year ended on that date.`;

    case 'adverse':
      return `In our opinion, because of the significance of the matter(s) discussed in the Basis for Adverse Opinion section of our report, the accompanying financial statements do not give a true and fair view in conformity with the accounting principles generally accepted in India, of the state of affairs of ${entityName} as at ${periodEndLabel}, and its profit/loss${cashFlowText} for the year ended on that date.`;

    case 'disclaimer':
      return 'Because of the significance of the matter(s) described in the Basis for Disclaimer of Opinion section of our report, we have not been able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion. Accordingly, we do not express an opinion on the financial statements.';
  }
}

export const BASIS_FOR_OPINION_STARTER = {
  unqualified:
    'We conducted our audit in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Companies Act, 2013. Our responsibilities under those Standards are further described in the Auditor’s Responsibilities for the Audit of the Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India and we have fulfilled our other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.',
  qualified:
    'We conducted our audit in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Companies Act, 2013. Our responsibilities under those Standards are further described in the Auditor’s Responsibilities for the Audit of the Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India and we have fulfilled our other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our qualified opinion.',
  adverse:
    'We conducted our audit in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Companies Act, 2013. Our responsibilities under those Standards are further described in the Auditor’s Responsibilities for the Audit of the Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India and we have fulfilled our other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our adverse opinion.',
  disclaimer:
    'We were engaged to audit the financial statements of the Company. Our responsibilities under the Standards on Auditing are further described in the Auditor’s Responsibilities for the Audit of the Financial Statements section of our report. Because of the matter(s) described in the Basis for Disclaimer of Opinion section of our report, we were not able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion.',
} satisfies Record<OpinionType, string>;

export const MANAGEMENT_RESPONSIBILITIES_STARTER =
  'The Company’s Management is responsible for the matters stated in section 134(5) of the Companies Act, 2013 with respect to the preparation of these financial statements that give a true and fair view of the financial position, financial performance and cash flows (where applicable) of the Company in accordance with the accounting principles generally accepted in India, including the accounting standards specified under section 133 of the Act. This responsibility also includes maintenance of adequate accounting records, safeguarding of assets of the Company and for preventing and detecting frauds and other irregularities; selection and application of appropriate accounting policies; making judgments and estimates that are reasonable and prudent; and design, implementation and maintenance of adequate internal financial controls that were operating effectively for ensuring the accuracy and completeness of the accounting records.';

export const AUDITOR_RESPONSIBILITIES_STARTER =
  'Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor’s report that includes our opinion. Reasonable assurance is a high level of assurance but is not a guarantee that an audit conducted in accordance with SAs will always detect a material misstatement when it exists. Misstatements can arise from fraud or error and are considered material if, individually or in the aggregate, they could reasonably be expected to influence the economic decisions of users taken on the basis of these financial statements.';

export function buildKAMIntro() {
  return 'Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the financial statements of the current period. These matters were addressed in the context of our audit of the financial statements as a whole, and in forming our opinion thereon, and we do not provide a separate opinion on these matters.';
}

export function buildSA720Paragraph(status: SA720BoardReportStatus, misstatementDetails?: string | null) {
  switch (status) {
    case 'received_no_misstatement':
      return 'The Board of Directors is responsible for the other information. The other information comprises the information included in the Board’s Report, but does not include the financial statements and our auditor’s report thereon. Our opinion on the financial statements does not cover the other information and we do not express any form of assurance conclusion thereon. In connection with our audit of the financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the financial statements or our knowledge obtained in the audit, or otherwise appears to be materially misstated. If we identify such material misstatement, we are required to report that fact. We have nothing to report in this regard.';

    case 'received_material_misstatement':
      return `The Board of Directors is responsible for the other information. The other information comprises the information included in the Board’s Report, but does not include the financial statements and our auditor’s report thereon. Our opinion on the financial statements does not cover the other information and we do not express any form of assurance conclusion thereon. In connection with our audit of the financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the financial statements or our knowledge obtained in the audit, or otherwise appears to be materially misstated. Based on the work performed, we conclude that the other information is materially misstated for the following reason(s): ${misstatementDetails || '[Describe the material misstatement(s) identified in the Board’s Report.]'}`;

    case 'not_received':
      return 'The Board of Directors is responsible for the other information. The other information comprises the information included in the Board’s Report, but does not include the financial statements and our auditor’s report thereon. At the date of this auditor’s report, the other information has not been received by us. When we read the other information, if we conclude that there is a material misstatement therein, we are required to communicate the matter to those charged with governance.';
  }
}

export const STATUS_OPTIONS = [
  { value: 'yes', label: 'Yes / Complied' },
  { value: 'no', label: 'No / Not complied' },
  { value: 'na', label: 'Not applicable' },
  { value: 'qualified', label: 'Qualified / With remarks' },
] as const;

export type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];
