import type { ReportBlock } from '@/services/auditReportGenerator';
import type { IFCReportContent } from '@/hooks/useIFCReportContent';
import type { CAROClauseResponse } from '@/hooks/useCAROClauseResponses';
import type { CAROClause } from '@/hooks/useCAROClauseLibrary';
import type { AuditReportSetup } from '@/hooks/useAuditReportSetup';
import type { FirmSettings } from '@/hooks/useFirmSettings';
import type { Partner } from '@/hooks/usePartners';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatText = (value: string) => escapeHtml(value).replace(/\n/g, '<br />');

const wrapParagraph = (text: string, className?: string) =>
  `<p${className ? ` class="${className}"` : ''}>${formatText(text)}</p>`;

const wrapLines = (lines: string[], className?: string) =>
  lines
    .map((line) => {
      if (!line.trim()) {
        return `<p${className ? ` class="${className} spacer"` : ' class="spacer"'}>&nbsp;</p>`;
      }
      return wrapParagraph(line, className);
    })
    .join('');

export const buildMainReportPreviewHtml = (blocks: ReportBlock[]) => {
  const html = blocks
    .map((block) => {
      if (block.kind === 'title') return wrapParagraph(block.text, 'title');
      if (block.kind === 'subtitle') return wrapParagraph(block.text, 'subtitle');
      if (block.kind === 'heading') return wrapParagraph(block.text, 'heading');
      if (block.kind === 'subheading') return wrapParagraph(block.text, 'subheading');
      if (block.kind === 'paragraph') {
        const className = block.highlight === 'yellow' ? 'highlight' : undefined;
        return wrapParagraph(block.text, className);
      }
      if (block.kind === 'signature') {
        return `<div class="signature">${wrapLines(block.lines)}</div>`;
      }
      return '';
    })
    .join('');

  return `<div class="preview-doc">${html}</div>`;
};

export const buildIfcPreviewHtml = ({
  content,
  setup,
  firmSettings,
  signingPartner,
  clientName,
  financialYear,
}: {
  content: IFCReportContent | null;
  setup: AuditReportSetup | null;
  firmSettings: FirmSettings | null;
  signingPartner: Partner | null;
  clientName: string;
  financialYear: string;
}) => {
  const sections: string[] = [];

  sections.push(
    wrapParagraph("ANNEXURE B TO THE INDEPENDENT AUDITOR'S REPORT", 'title'),
    wrapParagraph(
      "(Referred to in paragraph 2 under 'Report on Other Legal and Regulatory Requirements' section of our report of even date)",
      'subtitle'
    ),
    wrapParagraph(
      "Report on the Internal Financial Control with Reference to Standalone Financial Statements under Clause (i) of Sub-section 3 of Section 143 of the Companies Act, 2013",
      'heading'
    )
  );

  sections.push(wrapParagraph('Opinion', 'subheading'));
  sections.push(
    wrapParagraph(content?.opinion_paragraph || '[Opinion paragraph not yet entered]')
  );

  sections.push(
    wrapParagraph(
      "Management's Responsibility for Internal Financial Control with Reference to Standalone Financial Statements",
      'subheading'
    )
  );
  sections.push(
    wrapParagraph(content?.management_responsibility_section || '[Management responsibility not yet entered]')
  );

  sections.push(wrapParagraph("Auditor's Responsibility", 'subheading'));
  sections.push(
    wrapParagraph(content?.auditor_responsibility_section || '[Auditor responsibility not yet entered]')
  );

  sections.push(
    wrapParagraph(
      'Meaning of Internal Financial Control with Reference to Standalone Financial Statements',
      'subheading'
    )
  );
  sections.push(
    wrapParagraph(content?.ifc_meaning_section || '[IFC meaning section not yet entered]')
  );

  sections.push(
    wrapParagraph(
      'Inherent Limitations of Internal Financial Control with Reference to Standalone Financial Statements',
      'subheading'
    )
  );
  sections.push(
    wrapParagraph(content?.inherent_limitations_section || '[Inherent limitations not yet entered]')
  );

  if (content?.has_material_weaknesses && content.material_weaknesses?.length) {
    sections.push(wrapParagraph('Material Weaknesses', 'subheading'));
    content.material_weaknesses.forEach((item, index) => {
      const lines = [
        `${index + 1}. ${item.title}`,
        item.description,
        item.impact ? `Impact: ${item.impact}` : '',
        item.recommendation ? `Recommendation: ${item.recommendation}` : '',
      ].filter(Boolean);
      sections.push(wrapParagraph(lines.join('\n'), 'bullet'));
    });
  }

  if (content?.has_significant_deficiencies && content.significant_deficiencies?.length) {
    sections.push(wrapParagraph('Significant Deficiencies', 'subheading'));
    content.significant_deficiencies.forEach((item, index) => {
      const lines = [
        `${index + 1}. ${item.title}`,
        item.description,
        item.impact ? `Impact: ${item.impact}` : '',
        item.recommendation ? `Recommendation: ${item.recommendation}` : '',
      ].filter(Boolean);
      sections.push(wrapParagraph(lines.join('\n'), 'bullet'));
    });
  }

  const signatureLines = [
    firmSettings?.firm_name ? `For ${firmSettings.firm_name}` : 'For [Firm Name]',
    'Chartered Accountants',
    firmSettings?.firm_registration_no ? `Firm Registration No. ${firmSettings.firm_registration_no}` : '',
    '',
    signingPartner?.name || '[Partner / Proprietor]',
    'Partner',
    signingPartner?.membership_number ? `Membership No. ${signingPartner.membership_number}` : '',
    setup?.udin ? `UDIN: ${setup.udin}` : '',
    '',
    setup?.report_city ? `Place: ${setup.report_city}` : '',
    setup?.report_date ? `Date: ${setup.report_date}` : '',
  ];

  sections.push(`<div class="signature">${wrapLines(signatureLines)}</div>`);

  return `<div class="preview-doc">${sections.join('')}</div>`;
};

export const buildCaroPreviewHtml = ({
  responses,
  clauses,
}: {
  responses: CAROClauseResponse[];
  clauses: CAROClause[];
}) => {
  const sections: string[] = [];
  sections.push(
    wrapParagraph('Annexure - A to the Auditors\' Report', 'title'),
    wrapParagraph(
      "(Referred to in paragraph 1 under 'Report on Other Legal and Regulatory Requirements' section of our report of even date)",
      'subtitle'
    )
  );

  const responseMap = new Map(responses.map((response) => [response.clause_id, response]));
  clauses.forEach((clause) => {
    const response = responseMap.get(clause.clause_id);
    if (!response) return;
    sections.push(wrapParagraph(`${clause.clause_id}. ${clause.clause_title}`, 'heading'));
    if (!response.is_applicable) {
      sections.push(wrapParagraph(response.na_reason || 'Not applicable'));
    } else {
      sections.push(wrapParagraph(response.conclusion_text || '[No conclusion entered]'));
    }
  });

  return `<div class="preview-doc">${sections.join('')}</div>`;
};
