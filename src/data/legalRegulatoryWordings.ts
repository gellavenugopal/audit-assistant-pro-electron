import type { AuditReportSetup } from '../hooks/useAuditReportSetup';
import type { AuditReportMainContent } from '../hooks/useAuditReportContent';
import type { OpinionType } from './auditReportStandardWordings';

export type LegalRegulatoryParagraph = {
  text: string;
  highlight?: 'yellow';
};

/**
 * Build the complete "Report on Other Legal and Regulatory Requirements" section
 * with all conditional paragraphs based on company characteristics and audit findings.
 */
export function buildLegalRegulatorySection(
  setup: AuditReportSetup,
  content: AuditReportMainContent,
  periodEndLabel: string,
  opinionType: OpinionType = 'unqualified'
): LegalRegulatoryParagraph[] {
  const paragraphs: LegalRegulatoryParagraph[] = [];
  
  // Helper to get the basis section name based on opinion type
  const getBasisSectionName = () => {
    switch (opinionType) {
      case 'qualified': return 'Basis for Qualified Opinion';
      case 'adverse': return 'Basis for Adverse Opinion';
      case 'disclaimer': return 'Basis for Disclaimer of Opinion';
      default: return 'Basis for Opinion';
    }
  };

  // 1. CARO Statement
  paragraphs.push({ text: buildCAROStatement(setup) });

  // 2. Section 143(3) reporting
  paragraphs.push({ text: '2.\tAs required by Section 143(3) of the Act, we report that:' });

  // (a) Information and explanations
  paragraphs.push(buildInformationAndExplanationsParagraph(content, opinionType, getBasisSectionName()));

  // (b) Proper books of account - 4 variations
  paragraphs.push(buildBooksOfAccountParagraph(setup, content, opinionType, getBasisSectionName()));

  // (c) Branch returns - conditional
  if (setup.has_branch_auditors) {
    paragraphs.push({ text: 'c.\tThe reports on the accounts of the branch offices of the Company audited under Section 143(8) of the Act by branch auditors have been sent to us and have been properly dealt with by us in preparing this report;' });
  }

  // (d) Balance sheet agreement
  paragraphs.push({ text: buildBalanceSheetAgreementParagraph(setup) });

  // (e) Accounting standards compliance
  if (opinionType !== 'unqualified') {
    paragraphs.push({ 
      text: `e.\t[except for the effects/ possible effects (delete whichever is not applicable) of the matter described in the ${getBasisSectionName()} section above,] In our opinion, the aforesaid standalone financial statements comply with the Accounting Standards (AS) specified under Section 133 of the Act, read with Rule 7 of the Companies (Accounts) Rules, 2014, as amended.`,
      highlight: 'yellow'
    });
  } else {
    paragraphs.push({ text: 'e.\tIn our opinion, the aforesaid standalone financial statements comply with the Accounting Standards (AS) specified under Section 133 of the Act, read with Rule 7 of the Companies (Accounts) Rules, 2014, as amended.' });
  }

  // (f) Directors disqualification
  paragraphs.push(buildDirectorsDisqualificationParagraph(content, periodEndLabel));

  // (g) Internal financial controls
  paragraphs.push({ text: 'g.\twith respect to the adequacy of the internal financial controls with reference to standalone financial statements of the Company and the operating effectiveness of such controls as required under Clause (i) of Sub-section 3 of Section 143 of the Act, the same is not applicable to the Company vide amendment to the notification G.S.R 464(E) dated June 13, 2017;' });

  // (h) Director remuneration
  paragraphs.push(buildDirectorRemunerationParagraph(setup, content));

  // (i) Modifications relating to maintenance of accounts - conditional on Rule 11(g) audit trail status
  const auditTrailStatus = content.rule_11_f_audit_trail_status;
  if (auditTrailStatus === 'no' || auditTrailStatus === 'qualified') {
    paragraphs.push({ text: 'i.\tthe modification relating to the maintenance of accounts and other matters connected therewith are as stated paragraph 2(b) above on reporting under Section 143(3)(b) and paragraph 2(j)(vi) below on reporting under Rule 11(g) of the Companies (Audit and Auditors) Rules, 2014.' });
  }

  // (j) Rule 11 matters
  paragraphs.push({ text: "j.\twith respect to the other matters to be included in the Auditors' Report in accordance with Rule 11 of the Companies (Audit and Auditors) Rules, 2014, as amended, in our opinion and to the best of our information and according to the explanations given to us:" });

  // Rule 11 sub-clauses
  paragraphs.push(...buildRule11Paragraphs(content));

  return paragraphs;
}

function buildCAROStatement(setup: AuditReportSetup): string {
  if (setup.caro_applicable_status === 'not_applicable') {
    return `1.\tAs the Company falls within the class of companies specified under paragraph 1(2)(iii)/(iv)/(v) of the Companies (Auditor's Report) Order, 2020 ("the Order") issued by the Central Government of India in terms of sub-section (11) of section 143 of the Act, the said Order is not applicable to the Company.`;
  } else {
    return `1.\tAs required by the Companies (Auditor's Report) Order, 2020 ("CARO 2020"), issued by the Central Government of India in terms of section 143(11) of the Act, we give in the Annexure ${setup.caro_annexure_letter || 'A'} a statement on the matters specified in paragraphs 3 and 4 of the Order, to the extent applicable.`;
  }
}

function buildInformationAndExplanationsParagraph(
  content: AuditReportMainContent,
  opinionType: OpinionType,
  basisSectionName: string
): LegalRegulatoryParagraph {
  const status = content.clause_143_3_a_information_status;
  const details = content.clause_143_3_a_information_details;

  // User selected qualified/custom - use their details
  if (status === 'qualified') {
    if (details && details.trim()) {
      return { text: `a.\t${details}` };
    } else {
      return { 
        text: 'a.\t[USER TO COMPLETE - provide custom paragraph for qualified/modified information and explanations];',
        highlight: 'yellow'
      };
    }
  }

  // Standard - auto-generate based on opinion type
  if (opinionType === 'unqualified') {
    return { text: 'a.\tWe have sought and obtained all the information and explanations which to the best of our knowledge and belief were necessary for the purposes of our audit;' };
  } else {
    // Modified opinions (qualified, adverse, disclaimer)
    return { 
      text: `a.\tWe have sought and except for the matter described in the ${basisSectionName} section above, obtained all the information and explanations which to the best of our knowledge and belief were necessary for the purposes of our audit;`,
      highlight: 'yellow'
    };
  }
}

function buildBooksOfAccountParagraph(
  setup: AuditReportSetup, 
  content: AuditReportMainContent,
  opinionType: OpinionType = 'unqualified',
  basisSectionName: string = 'Basis for Opinion'
): LegalRegulatoryParagraph {
  const hasBranches = setup.has_branch_auditors;
  const hasAuditTrailModifications = content.rule_11_f_audit_trail_status === 'no' || content.rule_11_f_audit_trail_status === 'qualified';
  const serverOutsideIndia = content.clause_143_3_b_server_outside_india;
  
  // Exception clause for non-unqualified opinions
  const exceptionClause = opinionType !== 'unqualified' 
    ? `[except for the effects/ possible effects (delete whichever is not applicable) of the matter described in the ${basisSectionName} section above,] `
    : '';
  
  const hasException = opinionType !== 'unqualified';

  if (serverOutsideIndia && hasAuditTrailModifications) {
    return { 
      text: `b.\t${exceptionClause}in our opinion, proper books of account as required by law have been kept by the Company so far as it appears from our examination of those books except that the Company does not have server physically located in India for the daily backup of the books of account and other books and papers maintained in electronic mode and for the matters stated in the paragraph 2B(f) below on reporting under Rule 11(g) of the Companies (Audit and Auditors) Rules, 2014. The server of daily backup of the books of account and other records is physically located outside India;`,
      highlight: hasException ? 'yellow' : undefined
    };
  } else if (hasAuditTrailModifications) {
    return { 
      text: `b.\t${exceptionClause}In our opinion, proper books of account as required by law have been kept by the Company so far as it appears from our examination of those books except for the matters stated in the paragraph 2B(f) below on reporting under Rule 11(g) of the Companies (Audit and Auditors) Rules, 2014;`,
      highlight: hasException ? 'yellow' : undefined
    };
  } else if (hasBranches) {
    return { 
      text: `b.\t${exceptionClause}In our opinion, proper books of account as required by law have been kept by the Company so far as it appears from our examination of those books and proper returns adequate for the purposes of our audit have been received from the branches not visited by us;`,
      highlight: hasException ? 'yellow' : undefined
    };
  } else {
    return { 
      text: `b.\t${exceptionClause}In our opinion, proper books of account as required by law have been kept by the Company so far as it appears from our examination of those books;`,
      highlight: hasException ? 'yellow' : undefined
    };
  }
}

function buildBalanceSheetAgreementParagraph(setup: AuditReportSetup): string {
  const hasBranches = setup.has_branch_auditors;
  const hasCashFlow = setup.cash_flow_required;

  if (hasBranches && hasCashFlow) {
    return `d.\tthe Balance Sheet, the Statement of Profit and loss and the Statement of Cash Flow dealt with by this Report are in agreement with the books of account and with the returns received from the branches not visited by us;`;
  } else if (hasBranches && !hasCashFlow) {
    return `d.\tthe Balance Sheet and the Statement of Profit and loss dealt with by this Report are in agreement with the books of account and with the returns received from the branches not visited by us;`;
  } else if (!hasBranches && hasCashFlow) {
    return `d.\tthe Balance Sheet, the Statement of Profit and loss and the Statement of Cash Flow dealt with by this Report are in agreement with the books of account;`;
  } else {
    return `d.\tthe Balance Sheet, and the Statement of Profit and loss dealt with by this Report are in agreement with the books of account;`;
  }
}

function buildDirectorRemunerationParagraph(setup: AuditReportSetup, content: AuditReportMainContent): LegalRegulatoryParagraph {
  const isPrivate = setup.is_private_company;
  
  if (isPrivate) {
    return { text: `h.\tThis Company being a private limited company, the provisions of managerial remuneration and approvals under section 197 of the Act are not applicable to the Company.` };
  }
  
  // Public company reporting
  const remunerationStatus = content.clause_143_3_h_remuneration_status;
  const details = content.clause_143_3_h_details;
  
  if (remunerationStatus === 'yes') {
    return { text: `h.\twith respect to the other matters to be included in the Auditors' Report in accordance with the requirements of section 197(16) of the Act, as amended: In our opinion and to the best of our information and according to the explanations given to us, the remuneration paid by the Company to its directors during the year is in accordance with the provisions of section 197 of the Act.` };
  } else if (remunerationStatus === 'no') {
    // Not complied - use details if provided
    if (details && details.trim()) {
      return { text: `h.\twith respect to the other matters to be included in the Auditors' Report in accordance with the requirements of section 197(16) of the Act, as amended: ${details}` };
    } else {
      return { text: `h.\twith respect to the other matters to be included in the Auditors' Report in accordance with the requirements of section 197(16) of the Act, as amended: [USER TO COMPLETE - remuneration not in accordance with section 197 - provide details of non-compliance/excess remuneration];`, highlight: 'yellow' };
    }
  } else if (remunerationStatus === 'qualified') {
    // Qualified/With remarks - use details if provided
    if (details && details.trim()) {
      return { text: `h.\twith respect to the other matters to be included in the Auditors' Report in accordance with the requirements of section 197(16) of the Act, as amended: ${details}` };
    } else {
      return { text: `h.\twith respect to the other matters to be included in the Auditors' Report in accordance with the requirements of section 197(16) of the Act, as amended: [USER TO COMPLETE - qualified opinion/remarks on managerial remuneration];`, highlight: 'yellow' };
    }
  }
  
  return { text: `h.\twith respect to the other matters to be included in the Auditors' Report in accordance with the requirements of section 197(16) of the Act, as amended: [USER DEFINED]`, highlight: 'yellow' };
}

function buildDirectorsDisqualificationParagraph(content: AuditReportMainContent, periodEndLabel: string): LegalRegulatoryParagraph {
  const isDisqualified = content.clause_143_3_f_directors_disqualified;
  const details = content.clause_143_3_f_disqualified_details;

  if (isDisqualified) {
    // Directors are disqualified - yellow highlighted user-specific line
    const detailsText = details && details.trim() 
      ? details 
      : 'As on the close of the financial year, Director/(Director(s)) are disqualified in terms of Section 164(2) of the Companies Act, 2013.';
    return { 
      text: `f.\t${detailsText}`,
      highlight: 'yellow' 
    };
  } else {
    // No disqualification - standard text
    return { 
      text: `f.\ton the basis of the written representations received from the directors as on ${periodEndLabel}, and taken on record by the Board of Directors, none of the directors is disqualified as on ${periodEndLabel}, from being appointed as a director in terms of Section 164(2) of the Act;` 
    };
  }
}

function buildRule11Paragraphs(content: AuditReportMainContent): LegalRegulatoryParagraph[] {
  const paragraphs: LegalRegulatoryParagraph[] = [];

  // (i) Rule 11(a) - Pending litigations
  paragraphs.push(buildPendingLitigationsParagraph(content));

  // (ii) Rule 11(b) - Long-term contracts
  paragraphs.push(buildLongTermContractsParagraph(content));

  // (iii) Rule 11(c) - IEPF transfers
  paragraphs.push(buildIEPFParagraph(content));

  // (iv) Rule 11(e) - Funds routing via intermediaries: (i) advanced, (ii) received, (iii) audit procedures
  // Note: Rule 11(d) SBN has been deleted from Companies Act
  paragraphs.push(buildFundRoutingParagraph(content));

  // (v) Rule 11(f) - Dividend
  paragraphs.push(buildDividendParagraph(content));

  // (vi) Rule 11(g) - Audit trail
  paragraphs.push(buildAuditTrailParagraph(content));

  return paragraphs;
}

function buildPendingLitigationsParagraph(content: AuditReportMainContent): LegalRegulatoryParagraph {
  const status = content.rule_11_a_pending_litigations;
  const noteRef = content.rule_11_a_note_ref;

  if (status === 'has_litigations_disclosed' && noteRef) {
    return { text: `\ti.\tthe Company has disclosed the impact of pending litigations on its financial position in its standalone financial statements – Refer Note ${noteRef} to the standalone financial statements;` };
  } else if (status === 'has_litigations_disclosed' && !noteRef) {
    // Disclosed but missing note reference - highlight yellow
    return { text: `\ti.\tthe Company has disclosed the impact of pending litigations on its financial position in its standalone financial statements – Refer Note _____ to the standalone financial statements;`, highlight: 'yellow' };
  } else if (status === 'has_litigations_not_disclosed') {
    // Pending litigation but NOT disclosed - yellow highlighted for user to complete
    return { text: `\ti.\tthe Company has pending litigations which would impact its financial position in its standalone financial statements [USER TO COMPLETE - impact not disclosed in financial statements];`, highlight: 'yellow' };
  } else if (status === 'no_litigations') {
    return { text: `\ti.\tthe Company does not have any pending litigations which would impact its financial position;` };
  }
  
  return { text: `\ti.\t[Pending litigations status - USER DEFINED]`, highlight: 'yellow' };
}

function buildLongTermContractsParagraph(content: AuditReportMainContent): LegalRegulatoryParagraph {
  const status = content.rule_11_b_long_term_contracts;
  const noteRef = content.rule_11_b_note_ref;

  if (status === 'has_made_provision' && noteRef) {
    return { text: `\tii.\tthe Company has made provision, as required under the applicable law or accounting standards, for material foreseeable losses, if any, on long-term contracts including derivative contracts \u2013 Refer Note ${noteRef} to the standalone financial statements;` };
  } else if (status === 'has_made_provision' && !noteRef) {
    // Made provision but missing note reference - highlight yellow
    return { text: `\tii.\tthe Company has made provision, as required under the applicable law or accounting standards, for material foreseeable losses, if any, on long-term contracts including derivative contracts \u2013 Refer Note _____ to the standalone financial statements;`, highlight: 'yellow' };
  } else if (status === 'has_not_made_provision') {
    // Has contracts but NOT made provision - yellow highlighted for user to complete
    return { text: `\tii.\tthe Company has NOT made provision, as required under the applicable law or accounting standards, for material foreseeable losses on long-term contracts including derivative contracts [USER TO COMPLETE - provision not made];`, highlight: 'yellow' };
  } else if (status === 'no_contracts') {
    return { text: `\tii.\tthe Company did not have any long-term contracts including derivative contracts as at the end of the financial year;` };
  }
  
  return { text: `\tii.\t[Long-term contracts status - USER DEFINED]`, highlight: 'yellow' };
}

function buildIEPFParagraph(content: AuditReportMainContent): LegalRegulatoryParagraph {
  const status = content.rule_11_c_iepf_status;
  const details = content.rule_11_c_delay_details;

  if (status === 'na') {
    // Not applicable
    return { text: `\tiii.\tThere were no amounts which were required to be transferred to the Investor Education and Protection Fund by the Company;` };
  } else if (status === 'yes') {
    // Complied - no delay
    return { text: `\tiii.\tthere has been no delay in transferring amounts, required to be transferred, to the Investor Education and Protection Fund by the Company;` };
  } else if (status === 'no') {
    // Not complied - use delay details if provided
    if (details && details.trim()) {
      return { text: `\tiii.\t${details}` };
    } else {
      // Provide both wording templates as yellow-highlighted examples
      const template1 = `there has been delay in transferring amounts required to be transferred, to the Investor Education and Protection Fund by the Company in case of Dividend declared on ____________ where the unpaid amount aggregating to Rs. ________ has not been transferred till the date of this report`;
      const template2 = `there has been delay in transferring amounts required to be transferred, to the Investor Education and Protection Fund by the Company in case of Dividend declared on ______ where the unpaid amount aggregating to Rs. ________ was transferred on _________ as against the due date of __________`;
      return { text: `\tiii.\t${template1}\n\t\tOR\n\t\t${template2}\n\t\t[USER TO SELECT ONE and fill in the blanks: dates, amounts]`, highlight: 'yellow' };
    }
  } else if (status === 'qualified') {
    // Qualified/With remarks - use details if provided
    if (details && details.trim()) {
      return { text: `\tiii.\t${details}` };
    } else {
      return { text: `\tiii.\t[USER TO COMPLETE - IEPF transfer with qualification/remarks: provide specific details about partial compliance, ongoing transfers, or other qualifications];`, highlight: 'yellow' };
    }
  }
  
  return { text: `\tiii.\t[IEPF transfer status - USER DEFINED]`, highlight: 'yellow' };
}

// Rule 11(e): Funds routing via intermediaries
// (a) Management representation - funds advanced via intermediaries
// (b) Management representation - funds received via intermediaries
// (c) Auditor's conclusion on representations
function buildFundRoutingParagraph(content: AuditReportMainContent): LegalRegulatoryParagraph {
  const status = content.rule_11_g_funds_advanced_status;
  const details = content.rule_11_g_funds_advanced_details;

  if (status === 'yes' || !status) {
    // Default standard paragraph
    return { text: `\tiv.\t(a)\tThe Management has represented that, to the best of its knowledge and belief, no funds (which are material either individually or in the aggregate) have been advanced or loaned or invested (either from borrowed funds or share premium or any other sources or kind of funds) by the Company to or in any other person or entity, including foreign entity ("Intermediaries"), with the understanding, whether recorded in writing or otherwise, that the Intermediary shall, whether, directly or indirectly lend or invest in other persons or entities identified in any manner whatsoever by or on behalf of the Company ("Ultimate Beneficiaries") or provide any guarantee, security or the like on behalf of the Ultimate Beneficiaries;\n\t(b)\tThe Management has represented, that, to the best of its knowledge and belief, no funds (which are material either individually or in the aggregate) have been received by the Company from any person or entity, including foreign entity ("Funding Parties"), with the understanding, whether recorded in writing or otherwise, that the Company shall, whether, directly or indirectly, lend or invest in other persons or entities identified in any manner whatsoever by or on behalf of the Funding Party ("Ultimate Beneficiaries") or provide any guarantee, security or the like on behalf of the Ultimate Beneficiaries;\n\t(c)\tBased on the audit procedures that have been considered reasonable and appropriate in the circumstances, nothing has come to our notice that has caused us to believe that the representations under sub-clause (i) and (ii) of Rule 11(e), as provided under (a) and (b) above, contain any material misstatement.` };
  } else if ((status === 'no' || status === 'qualified') && details) {
    return { text: `\tv.\t${details}` };
  }
  
  return { text: `\tiv.\t[Fund routing status - USER DEFINED]`, highlight: 'yellow' };
}

// Rule 11(f): Dividend (Section 123 compliance)
// Note: Rule 11(d) SBN has been deleted from Companies Act, so paragraph numbering continues with (v)
function buildDividendParagraph(content: AuditReportMainContent): LegalRegulatoryParagraph {
  const status = content.rule_11_e_dividend_status;
  const noteRef = content.rule_11_e_dividend_note_ref;
  const details = content.rule_11_e_dividend_details;
  const interimPaid = content.rule_11_e_interim_dividend_paid;
  const interimDeclaredNotPaid = content.rule_11_e_interim_dividend_declared_not_paid;
  const finalPreviousYear = content.rule_11_e_final_dividend_previous_year;
  const finalProposed = content.rule_11_e_final_dividend_proposed;

  // Default: No dividend
  if (status === 'na' || !status) {
    return { text: `\tv.\tThe Company has not declared or paid any dividend during the year.` };
  }

  // Non-compliance or qualified - use details field
  if (status === 'no' || status === 'qualified') {
    if (details && details.trim()) {
      return { text: `\tv.\t${details}` };
    } else {
      return { text: `\tv.\t[USER TO COMPLETE - Provide detailed reporting for modifications/non-compliance in Rule 11(f) - refer to ICAI Implementation Guide];`, highlight: 'yellow' };
    }
  }

  // Standard yes/complied - build detailed dividend paragraph
  if (status === 'yes') {
    // If yes but nothing selected, highlight yellow
    if (!interimPaid && !interimDeclaredNotPaid && !finalPreviousYear && !finalProposed) {
      return { text: `\tv.\t[USER TO COMPLETE - Select applicable dividend types and provide note reference]`, highlight: 'yellow' };
    }

    let parts: string[] = [];
    
    // Intro with note reference
    if (noteRef && noteRef.trim()) {
      parts.push(`\tv.\tAs stated in Note ${noteRef} to the standalone financial statements:`);
    } else {
      parts.push(`\tv.\tAs stated in Note [USER TO PROVIDE NOTE NUMBER] to the standalone financial statements:`);
      // Will return with yellow highlight if note ref missing
    }

    // (a) Interim dividend
    if (interimPaid && interimDeclaredNotPaid) {
      // Both selected - include both paragraphs
      parts.push(`\t(a)\tThe interim dividend declared and paid by the Company during the year and until the date of this audit report is in accordance with section 123 of the Companies Act 2013.\n\tThe interim dividend declared by the Company during the year is in accordance with section 123 of the Companies Act 2013 to the extent it applies to declaration of dividend. However, the said dividend was not paid on the date of this audit report.`);
    } else if (interimPaid) {
      parts.push(`\t(a)\tThe interim dividend declared and paid by the Company during the year and until the date of this audit report is in accordance with section 123 of the Companies Act 2013.`);
    } else if (interimDeclaredNotPaid) {
      parts.push(`\t(a)\tThe interim dividend declared by the Company during the year is in accordance with section 123 of the Companies Act 2013 to the extent it applies to declaration of dividend. However, the said dividend was not paid on the date of this audit report.`);
    }

    // (b) Final dividend of previous year
    if (finalPreviousYear) {
      parts.push(`\t(b)\tThe final dividend paid by the Company during the year in respect of the same declared for the previous year is in accordance with section 123 of the Companies Act 2013 to the extent it applies to payment of dividends.`);
    }

    // (c) Final dividend proposed for current year
    if (finalProposed) {
      parts.push(`\t(c)\tThe Board of Directors of the Company has proposed a final dividend for the current financial year ended March 31, XXXX, which is subject to the approval of the members at the ensuing Annual General Meeting. The dividend declared is in accordance with section 123 of the Act to the extent it applies to declaration of dividend.`);
    }

    const fullText = parts.join('\n');
    
    // Check if note reference is missing
    if (!noteRef || !noteRef.trim()) {
      return { text: fullText, highlight: 'yellow' };
    }
    
    return { text: fullText };
  }
  
  return { text: `\tv.\t[Dividend status - USER DEFINED]`, highlight: 'yellow' };
}

// Rule 11(g): Audit trail (Rule 3(1))
function buildAuditTrailParagraph(content: AuditReportMainContent): LegalRegulatoryParagraph {
  const status = content.rule_11_f_audit_trail_status;
  const details = content.rule_11_f_audit_trail_details;

  if (status === 'yes') {
    return { text: `\tvi.\tBased on our examination, which included test checks, the Company has used accounting software systems for maintaining its books of account for the financial year which have the feature of recording audit trail (edit log) facility and the same has operated throughout the year for all relevant transactions recorded in the software systems. Further, during the course of our audit we did not come across any instance of the audit trail feature being tampered with and the audit trail has been preserved by the Company as per the statutory requirements for record retention;` };
  } else if (status === 'no' || status === 'qualified') {
    // Not complied or qualified - use details if provided
    if (details && details.trim()) {
      return { text: `\tvi.\t${details}\n\t\tRefer various illustrations given in Implementation Guide on Reporting under Rule 11(g) of the Companies (Audit and Auditors) Rules, 2014.` };
    } else {
      return { text: `\tvi.\t[USER TO COMPLETE - audit trail issues/modifications/tampering details];\n\t\tRefer various illustrations given in Implementation Guide on Reporting under Rule 11(g) of the Companies (Audit and Auditors) Rules, 2014.`, highlight: 'yellow' };
    }
  }
  
  return { text: `\tvi.\t[Audit trail status - USER DEFINED]`, highlight: 'yellow' };
}
