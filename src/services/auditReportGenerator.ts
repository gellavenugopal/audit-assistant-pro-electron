import {
  AUDITOR_RESPONSIBILITIES_STARTER,
  BASIS_FOR_OPINION_STARTER,
  buildKAMIntro,
  buildOpinionHeading,
  buildOpinionParagraph,
  buildSA720Paragraph,
  MANAGEMENT_RESPONSIBILITIES_STARTER,
} from '@/data/auditReportStandardWordings';

import type { AuditReportSetup } from '@/hooks/useAuditReportSetup';
import type { AuditReportMainContent } from '@/hooks/useAuditReportContent';
import type { KeyAuditMatter } from '@/hooks/useKeyAuditMatters';
import type { FirmSettings } from '@/hooks/useFirmSettings';
import type { Partner } from '@/hooks/usePartners';

export type ReportBlock =
  | { kind: 'title'; text: string }
  | { kind: 'subtitle'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'signature'; lines: string[] };

export type GenerateParams = {
  setup: AuditReportSetup;
  content: AuditReportMainContent;
  kams: KeyAuditMatter[];
  clientName: string;
  financialYearLabel: string;
  firmSettings?: FirmSettings;
  signingPartner?: Partner;
};

function cleanLines(lines: Array<string | null | undefined>) {
  return lines.map((l) => (l || '').trim()).filter(Boolean);
}

export class AuditReportGenerator {
  constructor(private params: GenerateParams) {}

  generateBlocks(): ReportBlock[] {
    const { setup, content, kams, clientName, financialYearLabel, firmSettings, signingPartner } = this.params;

    const includeCashFlow = Boolean(setup.cash_flow_required);
    const addressee = `To the Members of ${clientName}`;

    const blocks: ReportBlock[] = [
      { kind: 'title', text: 'Independent Auditor’s Report' },
      { kind: 'subtitle', text: addressee },
      { kind: 'heading', text: 'Report on the Audit of the Financial Statements' },
      {
        kind: 'subheading',
        text: buildOpinionHeading(content.opinion_type),
      },
      {
        kind: 'paragraph',
        text: buildOpinionParagraph({
          opinionType: content.opinion_type,
          entityName: clientName,
          periodEndLabel: financialYearLabel,
          includeCashFlow,
        }),
      },
    ];

    // Basis for Opinion
    blocks.push({ kind: 'subheading', text: this.basisHeading(content.opinion_type) });
    blocks.push({
      kind: 'paragraph',
      text: content.basis_for_opinion?.trim() || BASIS_FOR_OPINION_STARTER[content.opinion_type],
    });

    if (content.opinion_type !== 'unqualified' && content.qualification_details?.trim()) {
      blocks.push({ kind: 'paragraph', text: content.qualification_details.trim() });
    }

    // Emphasis of Matter
    if (content.has_emphasis_of_matter && (content.emphasis_of_matter_items || []).length > 0) {
      blocks.push({ kind: 'subheading', text: 'Emphasis of Matter' });
      for (const item of content.emphasis_of_matter_items || []) {
        const title = item.title?.trim();
        if (title) blocks.push({ kind: 'paragraph', text: title });
        blocks.push({ kind: 'paragraph', text: item.paragraph || '' });
        if (item.note_ref) blocks.push({ kind: 'paragraph', text: `Note reference: ${item.note_ref}` });
      }
    }

    // Going concern
    if (content.has_going_concern_uncertainty) {
      blocks.push({ kind: 'subheading', text: 'Material Uncertainty Related to Going Concern' });
      blocks.push({
        kind: 'paragraph',
        text:
          content.going_concern_details?.trim() ||
          '[Describe the material uncertainty related to going concern and relevant disclosures.]',
      });
      if (content.going_concern_note_ref) {
        blocks.push({ kind: 'paragraph', text: `Note reference: ${content.going_concern_note_ref}` });
      }
    }

    // Key Audit Matters
    const includeKams = Boolean(content.include_kam ?? setup.is_listed_company);
    if (includeKams && kams.length > 0) {
      blocks.push({ kind: 'subheading', text: 'Key Audit Matters' });
      blocks.push({ kind: 'paragraph', text: buildKAMIntro() });
      for (const kam of kams) {
        blocks.push({ kind: 'paragraph', text: kam.title });
        blocks.push({ kind: 'paragraph', text: `Description: ${kam.description}` });
        blocks.push({ kind: 'paragraph', text: `How our audit addressed the matter: ${kam.audit_response}` });
      }
    }

    // Other Information (SA 720)
    blocks.push({ kind: 'subheading', text: 'Other Information' });
    blocks.push({
      kind: 'paragraph',
      text: buildSA720Paragraph(content.board_report_status || 'received_no_misstatement', content.board_report_misstatement_details),
    });

    // Responsibilities
    blocks.push({ kind: 'subheading', text: 'Responsibilities of Management and Those Charged with Governance for the Financial Statements' });
    blocks.push({ kind: 'paragraph', text: MANAGEMENT_RESPONSIBILITIES_STARTER });

    blocks.push({ kind: 'subheading', text: 'Auditor’s Responsibilities for the Audit of the Financial Statements' });
    blocks.push({ kind: 'paragraph', text: AUDITOR_RESPONSIBILITIES_STARTER });

    // Other Matter
    if (content.has_other_matter && (content.other_matter_items || []).length > 0) {
      blocks.push({ kind: 'subheading', text: 'Other Matter' });
      for (const item of content.other_matter_items || []) {
        const title = item.title?.trim();
        if (title) blocks.push({ kind: 'paragraph', text: title });
        blocks.push({ kind: 'paragraph', text: item.paragraph || '' });
      }
    }

    // Legal & Regulatory requirements (starter)
    blocks.push({ kind: 'heading', text: 'Report on Other Legal and Regulatory Requirements' });
    blocks.push({ kind: 'paragraph', text: this.build1433Summary(content) });
    blocks.push({ kind: 'paragraph', text: this.buildRule11Summary(content) });

    // Signature - prioritize firmSettings and signingPartner from partners table
    const firmName = firmSettings?.firm_name || content.firm_name;
    const firmRegNo = firmSettings?.firm_registration_no || content.firm_registration_no;
    const partnerName = signingPartner?.name || content.partner_name;
    const membershipNo = signingPartner?.membership_number || content.membership_no;

    const signatureLines = cleanLines([
      firmName ? `For ${firmName}` : 'For [Firm Name]',
      'Chartered Accountants',
      firmRegNo ? `Firm Registration No.: ${firmRegNo}` : null,
      '',
      partnerName ? `${partnerName}` : '[Partner Name]',
      'Partner',
      membershipNo ? `Membership No.: ${membershipNo}` : null,
      setup.udin ? `UDIN: ${setup.udin}` : null,
      '',
      setup.report_city ? `Place: ${setup.report_city}` : null,
      setup.report_date ? `Date: ${setup.report_date}` : null,
    ]);

    blocks.push({ kind: 'signature', lines: signatureLines });

    return blocks;
  }

  private basisHeading(opinionType: AuditReportMainContent['opinion_type']) {
    switch (opinionType) {
      case 'unqualified':
        return 'Basis for Opinion';
      case 'qualified':
        return 'Basis for Qualified Opinion';
      case 'adverse':
        return 'Basis for Adverse Opinion';
      case 'disclaimer':
        return 'Basis for Disclaimer of Opinion';
    }
  }

  private build1433Summary(content: AuditReportMainContent) {
    // Minimal structured starter. Users can replace/extend text in future iterations.
    const lines = cleanLines([
      'As required by the Companies (Auditor’s Report) Order, 2020 ("CARO 2020"), issued by the Central Government of India in terms of section 143(11) of the Act, we give in the Annexure a statement on the matters specified in paragraphs 3 and 4 of the Order (to the extent applicable).',
      content.clause_143_3_a_status ? `143(3)(a) Proper books of account: ${content.clause_143_3_a_status}` : null,
      content.clause_143_3_a_details || null,
      content.clause_143_3_b_audit_trail_status ? `143(3)(b) Audit trail: ${content.clause_143_3_b_audit_trail_status}` : null,
      content.clause_143_3_b_audit_trail_details || null,
      content.clause_143_3_c_branch_returns ? `143(3)(c) Branch returns: ${content.clause_143_3_c_branch_returns}` : null,
      content.clause_143_3_e_going_concern_impact ? `143(3)(e) Going concern impact: ${content.clause_143_3_e_going_concern_impact}` : null,
      content.clause_143_3_f_directors_disqualified != null
        ? `143(3)(f) Directors disqualified: ${content.clause_143_3_f_directors_disqualified ? 'Yes' : 'No'}`
        : null,
      content.clause_143_3_f_disqualified_details || null,
      content.clause_143_3_g_qualification_impact ? `143(3)(g) Qualification impact: ${content.clause_143_3_g_qualification_impact}` : null,
      content.clause_143_3_h_remuneration_status ? `143(3)(h) Managerial remuneration: ${content.clause_143_3_h_remuneration_status}` : null,
      content.clause_143_3_h_details || null,
      content.clause_143_3_i_ifc_qualification ? `143(3)(i) IFC: ${content.clause_143_3_i_ifc_qualification}` : null,
    ]);

    return lines.join('\n');
  }

  private buildRule11Summary(content: AuditReportMainContent) {
    const lines = cleanLines([
      'As required by Rule 11 of the Companies (Audit and Auditors) Rules, 2014, in our opinion and to the best of our information and according to the explanations given to us:',
      content.rule_11_a_pending_litigations ? `Rule 11(a) Pending litigations: ${content.rule_11_a_pending_litigations}` : null,
      content.rule_11_b_long_term_contracts ? `Rule 11(b) Long-term contracts including derivatives: ${content.rule_11_b_long_term_contracts}` : null,
      content.rule_11_c_iepf_status ? `Rule 11(c) IEPF transfers: ${content.rule_11_c_iepf_status}` : null,
      content.rule_11_c_delay_details || null,
      content.rule_11_e_dividend_status ? `Rule 11(e) Dividend: ${content.rule_11_e_dividend_status}` : null,
      content.rule_11_f_audit_trail_status ? `Rule 11(f) Audit trail (Rule 3(1)): ${content.rule_11_f_audit_trail_status}` : null,
      content.rule_11_f_audit_trail_details || null,
      content.rule_11_g_funds_advanced_status ? `Rule 11(g) Funds advanced/received: ${content.rule_11_g_funds_advanced_status}` : null,
      content.rule_11_g_funds_advanced_details || null,
    ]);

    return lines.join('\n');
  }
}
