import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  UnderlineType,
  BorderStyle,
} from 'docx';
import { EngagementLetterData } from '@/components/appointment/EngagementLetterModal';

interface FirmSettings {
  firm_name?: string;
  address?: string;
  registration_no?: string;
  [key: string]: any;
}

/**
 * Generate an Engagement Letter in Word format with mail-merge
 * This creates a professional engagement letter with placeholders replaced by actual data
 */
export async function generateEngagementLetterWord(
  data: EngagementLetterData,
  firmSettings?: FirmSettings
) {
  const firmName = firmSettings?.firm_name || 'Chartered Accountants';
  const firmAddress = firmSettings?.address || '';

  const doc = new Document({
    sections: [
      {
        children: [
          // Firm Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: firmName,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { after: 100 },
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Chartered Accountants',
                italics: true,
                size: 22,
              }),
            ],
            spacing: { after: 200 },
          }),

          // Address
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: firmAddress,
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Date
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: `Date: ${formatDate(data.engagementDate)}`,
              }),
            ],
            spacing: { after: 300 },
          }),

          // Recipient Address
          new Paragraph({
            children: [
              new TextRun(data.clientName),
            ],
            spacing: { after: 50 },
          }),

          new Paragraph({
            children: [
              new TextRun(data.clientAddress),
            ],
            spacing: { after: 300 },
          }),

          // Salutation
          new Paragraph({
            children: [
              new TextRun('Dear Sir/Madam,'),
            ],
            spacing: { after: 300 },
          }),

          // Subject
          new Paragraph({
            children: [
              new TextRun({
                text: `ENGAGEMENT LETTER – AUDIT FOR THE FINANCIAL YEAR ${data.financialYear}`,
                bold: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),

          // Introduction
          new Paragraph({
            children: [
              new TextRun(
                `We are pleased to confirm our appointment as auditors of ${data.clientName} for the financial year ending ${data.financialYear}. This letter outlines the scope of our audit engagement and sets out the terms and conditions of our appointment.`
              ),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // 1. Scope of Audit
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Scope of Audit',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                `We will conduct an audit of the standalone financial statements of ${data.clientName} for the financial year ending on 31 March, ${data.financialYear}. The audit will be conducted in accordance with the Standards on Auditing (SAs) issued by the Institute of Chartered Accountants of India (ICAI).`
              ),
            ],
            spacing: { after: 100 },
            indent: { firstLine: 720 },
          }),

          new Paragraph({
            children: [
              new TextRun(`Audit Scope: ${data.auditScope}`),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // 2. Our Responsibilities
          new Paragraph({
            children: [
              new TextRun({
                text: '2. Our Responsibilities',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'We are responsible for expressing an opinion on the financial statements. Our audit will be conducted in accordance with the Standards on Auditing and will include:'
              ),
            ],
            spacing: { after: 150 },
            indent: { firstLine: 720 },
          }),

          new Paragraph({
            children: [
              new TextRun('(a) Obtaining an understanding of your business and systems;'),
            ],
            spacing: { after: 50 },
            indent: { left: 1080 },
          }),

          new Paragraph({
            children: [
              new TextRun('(b) Assessing the risks of material misstatement;'),
            ],
            spacing: { after: 50 },
            indent: { left: 1080 },
          }),

          new Paragraph({
            children: [
              new TextRun('(c) Obtaining audit evidence through testing and substantive procedures;'),
            ],
            spacing: { after: 50 },
            indent: { left: 1080 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                '(d) Evaluating the appropriateness of accounting policies and disclosures.'
              ),
            ],
            spacing: { after: 200 },
            indent: { left: 1080 },
          }),

          // 3. Management's Responsibilities
          new Paragraph({
            children: [
              new TextRun({
                text: '3. Management\'s Responsibilities',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'Management is responsible for the preparation and fair presentation of the financial statements in accordance with applicable accounting standards and for implementing systems of internal control to prevent and detect fraud and error. Management is also responsible for providing us with:'
              ),
            ],
            spacing: { after: 150 },
            indent: { firstLine: 720 },
          }),

          new Paragraph({
            children: [
              new TextRun('(a) Complete and accurate financial records and supporting documentation;'),
            ],
            spacing: { after: 50 },
            indent: { left: 1080 },
          }),

          new Paragraph({
            children: [
              new TextRun('(b) Access to all relevant personnel and information;'),
            ],
            spacing: { after: 50 },
            indent: { left: 1080 },
          }),

          new Paragraph({
            children: [
              new TextRun('(c) Written representations regarding the completeness and accuracy of the information provided.'),
            ],
            spacing: { after: 200 },
            indent: { left: 1080 },
          }),

          // 4. Engagement Period
          new Paragraph({
            children: [
              new TextRun({
                text: '4. Engagement Period',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                `The estimated period for completion of the audit is ${data.engagementPeriod}. However, the actual time required may vary based on the complexity of transactions and the cooperation provided by your staff.`
              ),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // 5. Audit Fees
          new Paragraph({
            children: [
              new TextRun({
                text: '5. Audit Fees',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                `The fee for conducting the audit of financial statements for the financial year ending 31 March, ${data.financialYear} is Rs. ${data.auditFee}/-`
              ),
            ],
            spacing: { after: 100 },
            indent: { firstLine: 720 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                `Other Services: ${data.otherServices}`
              ),
            ],
            spacing: { after: 100 },
            indent: { firstLine: 720 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'The above fee covers the audit of standalone financial statements. If you require any additional services, please advise us immediately, and the fee for such services will be determined separately.'
              ),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // 6. Independence and Professional Ethics
          new Paragraph({
            children: [
              new TextRun({
                text: '6. Independence and Professional Ethics',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'We are independent of your organization and comply with the Code of Ethics issued by the Institute of Chartered Accountants of India (ICAI). We confirm that we have no financial, business, employment, or personal relationships with your company that could impair our independence or objectivity.'
              ),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // 7. Confidentiality
          new Paragraph({
            children: [
              new TextRun({
                text: '7. Confidentiality',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'All information provided to us in connection with this engagement will be treated as confidential and will not be disclosed to any third party without your prior consent, except where required by law or professional standards.'
              ),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // 8. Audit Committee
          new Paragraph({
            children: [
              new TextRun({
                text: '8. Audit Committee Communication',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'We will communicate with the Audit Committee / Board of Directors on key matters arising from our audit, including significant accounting policies, judgments, and internal control deficiencies.'
              ),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // 9. Terms and Conditions
          new Paragraph({
            children: [
              new TextRun({
                text: '9. Terms and Conditions',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'This engagement is governed by the Standards on Auditing and the Code of Ethics issued by ICAI. Our audit opinion will be expressed in accordance with the Companies Act, 2013 and applicable accounting standards.'
              ),
            ],
            spacing: { after: 200 },
            indent: { firstLine: 720 },
          }),

          // Additional Notes
          data.notes ? (
            new Paragraph({
              children: [
                new TextRun({
                  text: '10. Additional Terms',
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            })
          ) : null,

          data.notes ? (
            new Paragraph({
              children: [
                new TextRun(data.notes),
              ],
              spacing: { after: 300 },
              indent: { firstLine: 720 },
            })
          ) : null,

          // Closing
          new Paragraph({
            children: [
              new TextRun(
                'We hope this arrangement is acceptable to you. Should you have any questions or require any clarification, please do not hesitate to contact us.'
              ),
            ],
            spacing: { after: 300 },
            indent: { firstLine: 720 },
          }),

          new Paragraph({
            children: [
              new TextRun('Yours faithfully,'),
            ],
            spacing: { after: 300 },
          }),

          // Signature Block
          new Paragraph({
            children: [
              new TextRun('For ' + firmName),
            ],
            spacing: { after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun('Chartered Accountants'),
            ],
            spacing: { after: 300 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: data.partnerName,
                bold: true,
              }),
            ],
            spacing: { after: 50 },
          }),

          new Paragraph({
            children: [
              new TextRun('Partner'),
            ],
            spacing: { after: 50 },
          }),

          data.partnerMembership ? (
            new Paragraph({
              children: [
                new TextRun(`Membership No. ${data.partnerMembership}`),
              ],
              spacing: { after: 200 },
            })
          ) : null,

          new Paragraph({
            children: [
              new TextRun(
                `Date: ${formatDate(new Date().toISOString().split('T')[0])}`
              ),
            ],
          }),
        ],
      },
    ],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Engagement_Letter_${data.clientName.replace(/\s+/g, '_')}_FY${data.financialYear}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating engagement letter:', error);
    throw error;
  }
}

/**
 * Format date string to readable format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-IN', options);
  } catch {
    return dateString;
  }
}
