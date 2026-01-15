// ============================================================================
// ENGAGEMENT LETTER TEMPLATE ENGINE
// ============================================================================
// Processes merge tags {{VARIABLE}} and conditional blocks {{IF}}...{{ENDIF}}

import type { LetterContext } from '@/types/engagementLetter';

const BRACKET_LABEL_MAP: Record<string, string> = {
  date: 'letter_date',
  letter_date: 'letter_date',
  letter_dated: 'letter_date',
  appointment_letter_date: 'appointment_letter_date',
  appointment_date: 'appointment_date',
  agm_date: 'agm_date',
  entity_name: 'entity_name',
  entity_type: 'entity_type',
  entity_status: 'entity_status',
  registration_no: 'registration_no',
  registration_number: 'registration_no',
  cin: 'registration_no',
  pan: 'pan',
  gstin: 'gstin',
  address: 'registered_address',
  registered_address: 'registered_address',
  email: 'email',
  phone: 'phone',
  financial_year: 'financial_year',
  assessment_year: 'assessment_year',
  balance_sheet_date: 'balance_sheet_date',
  financial_year_start: 'financial_year_start',
  financial_year_end: 'financial_year_end',
  financial_year_start_long: 'financial_year_start_long',
  financial_year_end_long: 'financial_year_end_long',
  financial_year_start_short: 'financial_year_start_short',
  financial_year_end_short: 'financial_year_end_short',
  firm_name: 'firm_name',
  firm_registration_number: 'firm_reg_no',
  firm_registration_no: 'firm_reg_no',
  firm_reg_no: 'firm_reg_no',
  partner_name: 'partner_name',
  partner_mem_no: 'partner_mem_no',
  partner_pan: 'partner_pan',
  partner_signature_date: 'partner_signature_date',
  partner_signature_date_long: 'partner_signature_date_long',
  partner_signature_date_short: 'partner_signature_date_short',
  sir_madam: 'salutation',
  salutation: 'salutation',
  place: 'place',
  professional_fees: 'professional_fees',
  professional_fees_amount: 'professional_fees_amount',
  fees_amount: 'professional_fees_amount',
  fee_amount: 'professional_fees_amount',
  inr: 'professional_fees_amount',
  payment_terms: 'payment_terms',
  meeting_number: 'meeting_number',
  meeting_no: 'meeting_number',
  meeting_number_plus_5: 'meeting_number_plus_5',
  meeting_no_plus_5: 'meeting_number_plus_5',
  appointment_type: 'appointment_type',
  appointment_reappointment: 'appointment_type',
  letterhead_note: 'letterhead_note',
  letterhead_notice: 'letterhead_note',
  letter_head_note: 'letterhead_note',
};

interface RenderOptions {
  escapeXml?: boolean;
}

/**
 * Parse and render a template using context data
 * Supports:
 *   - Merge tags: {{VARIABLE_NAME}}
 *   - Conditionals: {{IF CONDITION}}...{{ENDIF}}
 *   - Nested conditionals
 */
export class EngagementLetterTemplateEngine {
  /**
   * Render template with context
   * @param template Raw template string with merge tags and conditionals
   * @param context Data context for variable substitution
   * @returns Rendered document string
   */
  static render(template: string, context: LetterContext, options: RenderOptions = {}): string {
    let result = template;

    // Step 1: Process conditionals (innermost first due to nesting)
    result = this.processConditionals(result, context);

    // Step 2: Substitute merge tags
    result = this.substituteMergeTags(result, context, options);

    // Step 2b: Substitute bracket-style tags
    result = this.substituteBracketTags(result, context, options);

    // Step 3: Clean up any remaining unprocessed tags
    result = this.cleanupUnprocessedTags(result);
    result = this.replaceEngagementPeriodClause(result, context);
    result = this.collapseDuplicateDates(result);

    return result;
  }

  /**
   * Process conditional blocks: {{IF CONDITION}}...{{ENDIF}}
   * Supports nested conditionals and boolean/comparison operations
   */
  private static processConditionals(template: string, context: LetterContext): string {
    let result = template;
    const conditionalRegex = /\{\{\s*IF\s+([^}]+)\s*\}\}([\s\S]*?)\{\{\s*ENDIF\s*\}\}/gi;
    const elseRegex = /\{\{\s*ELSE\s*\}\}/i;

    let match;
    const iterations: string[] = [];

    while ((match = conditionalRegex.exec(template)) !== null) {
      const condition = match[1].trim();
      const innerContent = match[2];
      const fullBlock = match[0];

      const shouldInclude = this.evaluateCondition(condition, context);

      const parts = innerContent.split(elseRegex);
      const trueBlock = parts[0] ?? '';
      const falseBlock = parts.length > 1 ? parts.slice(1).join('') : '';
      result = result.replace(fullBlock, shouldInclude ? trueBlock : falseBlock);

      iterations.push(`Condition '${condition}' GåÆ ${shouldInclude}`);

      // Safety check for infinite loops
      if (iterations.length > 50) {
        throw new Error('Conditional processing exceeded max iterations (possible infinite loop)');
      }
    }

    return result;
  }

  /**
   * Evaluate a condition string against the context
   * Supports:
   *   - Simple boolean: IS_3CA, IFC_APPLICABLE
   *   - Negation: NOT IS_3CA
   *   - Comparison: TAX_AUDIT_FORM = "3CA"
   *   - Logical AND/OR: IS_3CA AND CARO_APPLICABLE
   */
  private static evaluateCondition(condition: string, context: LetterContext): boolean {
    const trimmed = condition.trim();

    // Handle NOT operator
    const notMatch = trimmed.match(/^NOT\s+(.+)$/i);
    if (notMatch) {
      return !this.evaluateCondition(notMatch[1], context);
    }

    // Handle AND operator (left-to-right)
    if (/\s+AND\s+/i.test(trimmed)) {
      const parts = trimmed.split(/\s+AND\s+/i).map((part) => part.trim());
      return parts.every((part) => this.evaluateCondition(part, context));
    }

    // Handle OR operator (left-to-right)
    if (/\s+OR\s+/i.test(trimmed)) {
      const parts = trimmed.split(/\s+OR\s+/i).map((part) => part.trim());
      return parts.some((part) => this.evaluateCondition(part, context));
    }

    // Handle inequality: VAR != "value"
    const inequalityMatch = trimmed.match(/^(.+?)\s*!=\s*(.+)$/);
    if (inequalityMatch) {
      const varName = inequalityMatch[1].trim();
      const expectedValue = this.stripQuotes(inequalityMatch[2].trim());
      const contextValue = this.getContextValue(context, varName);
      return String(contextValue) !== expectedValue;
    }

    // Handle equality: VAR = "value"
    const equalityMatch = trimmed.match(/^(.+?)\s*=\s*(.+)$/);
    if (equalityMatch) {
      const varName = equalityMatch[1].trim();
      const expectedValue = this.stripQuotes(equalityMatch[2].trim());
      const contextValue = this.getContextValue(context, varName);
      return String(contextValue) === expectedValue;
    }

    // Simple boolean: VAR (check if truthy)
    const value = this.getContextValue(context, trimmed);
    return Boolean(value);
  }

  /**
   * Substitute merge tags: {{VARIABLE_NAME}} with context values
   */
  private static substituteMergeTags(template: string, context: LetterContext, options: RenderOptions): string {
    const mergeTagRegex = /\{\{\s*([A-Za-z_0-9]+)\s*\}\}/g;
    return template.replace(mergeTagRegex, (match, variable) => {
      const value = this.getContextValue(context, variable);
      if (value === undefined || value === null) {
        return ''; // Return empty if variable not found
      }
      return this.maybeEscape(String(value), options);
    });
  }

  private static substituteBracketTags(template: string, context: LetterContext, options: RenderOptions): string {
    const bracketTagRegex = /\[([^\[\]\r\n]+)\]/g;
    const addressParts = this.getAddressParts(context.registered_address);
    return template.replace(bracketTagRegex, (match, label) => {
      const value = this.resolveBracketValue(label, context, addressParts);
      if (value === undefined || value === null) {
        return match;
      }
      return this.maybeEscape(String(value), options);
    });
  }

  /**
   * Clean up any remaining unprocessed tags (e.g., orphaned {{VAR}})
   */
  private static cleanupUnprocessedTags(template: string): string {
    return template.replace(/\{\{[^}]+\}\}/g, '');
  }

  private static replaceEngagementPeriodClause(template: string, context: LetterContext): string {
    if (!context.agm_date || !context.financial_year_start || !context.financial_year_end) {
      return template;
    }

    const replacement = `in the AGM held on ${context.agm_date} for the engagement period beginning ${context.financial_year_start} to engagement period ending ${context.financial_year_end}`;
    const pattern = /from the conclusion of the\s+Annual General Meeting[^.]*?covering the financial years beginning[^.]*?ending on[^.]*?/gi;
    return template.replace(pattern, replacement);
  }

  private static collapseDuplicateDates(template: string): string {
    return template.replace(/\b(\d{2}-\d{2}-\d{4})\b(?:\s+\1\b)+/g, '$1');
  }

  /**
   * Build context from master data
   */
  static buildContext(masterData: any): LetterContext {
    const {
      entity,
      period,
      auditor,
      commercial,
      mgmt_responsibilities,
      engagement_type,
      statutory_audit_config,
      tax_audit_config,
    } = masterData;

    const is_statutory_audit_company = engagement_type.startsWith('statutory_audit_company');
    const is_tax_audit_partnership = engagement_type.startsWith('tax_audit_partnership');
    const appointmentDateRaw = period.appointment_date || '';
    const appointmentLetterDateRaw =
      period.appointment_letter_date || period.appointment_date || auditor.letter_date || '';
    const partnerSignatureDateRaw = auditor.letter_date || '';
    const financialYearStartRaw = period.financial_year_start || '';
    const financialYearEndRaw = period.financial_year_end || period.balance_sheet_date || '';
    const balanceSheetDateRaw = period.balance_sheet_date || '';
    const appointmentLetterDate = this.formatDateShort(appointmentLetterDateRaw);
    const appointmentDate = this.formatDateShort(appointmentDateRaw);
    const agmDate = this.formatDateShort(period.agm_date || '');
    const financialYearStart = this.formatDateShort(financialYearStartRaw);
    const financialYearEnd = this.formatDateShort(financialYearEndRaw);
    const balanceSheetDate = this.formatDateShort(balanceSheetDateRaw);
    const assessmentYear = period.assessment_year || this.computeAssessmentYear(period.financial_year) || '';
    const meetingNumber = this.toNumber(period.meeting_number);

    return {
      // Entity details
      entity_name: entity.entity_name,
      entity_type: entity.entity_type,
      entity_status: entity.entity_status,
      registration_no: entity.registration_no,
      pan: entity.pan,
      gstin: entity.gstin || '',
      registered_address: entity.registered_address,
      email: entity.email,
      phone: entity.phone,

      // Period
      financial_year: period.financial_year,
      assessment_year: assessmentYear,
      balance_sheet_date: balanceSheetDate,
      appointment_date: appointmentDate,
      appointment_letter_date: appointmentLetterDate,
      appointment_letter_date_long: this.formatDateLong(appointmentLetterDateRaw),
      appointment_letter_date_short: this.formatDateShort(appointmentLetterDateRaw),
      agm_date: agmDate,
      agm_date_long: this.formatDateLong(period.agm_date),
      agm_date_short: this.formatDateShort(period.agm_date),
      financial_year_start: financialYearStart,
      financial_year_end: financialYearEnd,
      financial_year_start_long: this.formatDateLong(financialYearStartRaw),
      financial_year_end_long: this.formatDateLong(financialYearEndRaw),
      financial_year_start_short: this.formatDateShort(financialYearStartRaw),
      financial_year_end_short: this.formatDateShort(financialYearEndRaw),
      meeting_number: meetingNumber,
      meeting_number_plus_5: meetingNumber !== null ? meetingNumber + 5 : undefined,
      appointment_type: period.appointment_type || '',
      salutation: 'Sir/Madam',
      letterhead_note: 'TO BE PRINTED ON THE LETTER HEAD OF THE AUDITORS',

      // Auditor
      firm_name: auditor.firm_name,
      firm_reg_no: auditor.firm_reg_no,
      partner_name: auditor.partner_name,
      partner_mem_no: auditor.partner_mem_no,
      partner_pan: auditor.partner_pan,
      place: auditor.place,
      letter_date: appointmentLetterDate,
      partner_signature_date: this.formatDateShort(partnerSignatureDateRaw),
      partner_signature_date_long: this.formatDateLong(partnerSignatureDateRaw),
      partner_signature_date_short: this.formatDateShort(partnerSignatureDateRaw),

      // Commercial
      professional_fees: this.formatCurrency(commercial.professional_fees),
      professional_fees_amount: this.formatNumber(commercial.professional_fees),
      taxes_extra: commercial.taxes_extra,
      payment_terms: commercial.payment_terms,
      out_of_pocket_exp: commercial.out_of_pocket_exp,

      // Management responsibilities
      mgmt_responsibility_ack: mgmt_responsibilities.mgmt_responsibility_ack,
      books_responsibility_ack: mgmt_responsibilities.books_responsibility_ack,
      internal_control_ack: mgmt_responsibilities.internal_control_ack,
      fraud_prevention_ack: mgmt_responsibilities.fraud_prevention_ack,

      // Derived fields
      is_statutory_audit_company,
      is_tax_audit_partnership,
      is_ifc_applicable: statutory_audit_config?.ifc_applicable ?? false,
      is_caro_applicable: statutory_audit_config?.caro_applicable ?? false,
      is_ind_as: statutory_audit_config?.ind_as_applicable ?? false,
      is_3ca: tax_audit_config?.tax_audit_form === '3CA',
      is_3cb: tax_audit_config?.tax_audit_form === '3CB',

      // Optional conditionals
      ifc_applicable: statutory_audit_config?.ifc_applicable,
      caro_applicable: statutory_audit_config?.caro_applicable,
      ind_as_applicable: statutory_audit_config?.ind_as_applicable ?? false,
      tax_audit_form: tax_audit_config?.tax_audit_form,
      audited_under_other_law: tax_audit_config?.audited_under_other_law,
      accounting_standard: tax_audit_config?.accounting_standard ?? 'AS',
    };
  }

  private static resolveBracketValue(
    label: string,
    context: LetterContext,
    addressParts: { line1: string; line2: string; cityState: string; city: string; state: string }
  ) {
    const normalized = this.normalizeBracketLabel(label);

    if (normalized === 'address_line_1' || normalized === 'address_line1') return addressParts.line1;
    if (normalized === 'address_line_2' || normalized === 'address_line2') return addressParts.line2;
    if (normalized.startsWith('city_state')) return addressParts.cityState;
    if (normalized === 'city') return addressParts.city;
    if (normalized === 'state') return addressParts.state;
    if (normalized === 'the_board_of_directors_other_authorised_person' || this.isAddresseeLabel(normalized)) {
      return this.getDefaultAddressee(context);
    }
    if (
      normalized.includes('appointment') &&
      (normalized.includes('reappointment') || normalized.includes('re_appointment'))
    ) {
      return context.appointment_type || '';
    }
    if (normalized.includes('meeting') && normalized.includes('no') && normalized.includes('5')) {
      return context.meeting_number_plus_5 ?? '';
    }
    if (normalized.includes('meeting') && normalized.includes('no')) {
      return context.meeting_number ?? '';
    }
    if (normalized.startsWith('agm') && normalized.includes('dd_mm_yy')) {
      return context.agm_date_short || '';
    }
    if (normalized === 'dd_mm_yy' || normalized === 'dd_mm_yyyy') {
      return context.appointment_letter_date_short || '';
    }
    if (normalized.startsWith('agm')) {
      return context.agm_date_long || context.agm_date || '';
    }
    if (this.looksLikeMonthDate(normalized)) {
      if (normalized.includes('april') || normalized.includes('apr')) return context.financial_year_start_long || '';
      if (normalized.includes('march') || normalized.includes('mar')) return context.financial_year_end_long || '';
    }
    if (normalized.startsWith('py')) {
      return this.getYearSuffix(context.financial_year);
    }
    if (normalized.startsWith('ay')) {
      return this.getYearSuffix(context.assessment_year || context.financial_year);
    }

    const mappedKey = BRACKET_LABEL_MAP[normalized];
    if (mappedKey) {
      const value = this.getContextValue(context, mappedKey);
      return value === undefined ? '' : value;
    }

    return this.getContextValue(context, normalized);
  }

  private static normalizeBracketLabel(label: string): string {
    return label
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[\/,]/g, ' ')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/([a-z])([0-9])/g, '$1_$2')
      .replace(/\s+/g, '_');
  }

  private static getAddressParts(address?: string) {
    const cleaned = (address || '').replace(/\r\n/g, '\n').trim();
    if (!cleaned) {
      return { line1: '', line2: '', cityState: '', city: '', state: '' };
    }

    const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
    let line1 = lines[0] || '';
    let line2 = lines[1] || '';
    let cityState = lines.slice(2).join(', ');

    if (!cityState) {
      const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        line1 = parts[0] || line1;
        line2 = parts.length > 2 ? parts[1] || line2 : line2;
        cityState = parts.slice(-2).join(', ');
      }
    }

    const cityStateParts = cityState.split(',').map((part) => part.trim()).filter(Boolean);
    const city = cityStateParts[0] || '';
    const state = cityStateParts.slice(1).join(', ');

    return { line1, line2, cityState, city, state };
  }

  private static getDefaultAddressee(context: LetterContext): string {
    const entityType = String(context.entity_type || '').toLowerCase();
    if (entityType.includes('partnership') || entityType === 'llp') {
      return 'The Partners';
    }
    if (entityType.includes('trust')) {
      return 'The Trustees/Governing Body';
    }
    return 'The Board of Directors';
  }

  private static isAddresseeLabel(normalized: string): boolean {
    if (normalized.includes('board_of_directors')) return true;
    if (normalized.includes('directors')) return true;
    if (normalized.includes('partners')) return true;
    if (normalized.includes('members')) return true;
    if (normalized.includes('trustees')) return true;
    if (normalized.includes('governing_body')) return true;
    if (normalized.includes('authorised_person') || normalized.includes('authorized_person')) return true;
    return false;
  }

  private static getYearSuffix(value?: string): string {
    if (!value) return '';
    const match = value.match(/(\d{4})\s*-\s*(\d{2,4})/);
    if (!match) return value;
    const start = match[1].slice(-2);
    const end = match[2].length === 4 ? match[2].slice(-2) : match[2];
    return `${start}-${end}`;
  }

  private static computeAssessmentYear(financialYear?: string): string {
    if (!financialYear) return '';
    const match = financialYear.match(/(\d{4})\s*-\s*(\d{2,4})/);
    if (!match) return '';
    const startYear = parseInt(match[1], 10);
    if (Number.isNaN(startYear)) return '';
    const assessmentStart = startYear + 1;
    const assessmentEnd = String(assessmentStart + 1).slice(-2);
    return `${assessmentStart}-${assessmentEnd}`;
  }

  private static formatDateLong(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  }

  private static formatDateShort(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  }

  private static looksLikeMonthDate(value: string): boolean {
    const months = [
      'january', 'jan',
      'february', 'feb',
      'march', 'mar',
      'april', 'apr',
      'may',
      'june', 'jun',
      'july', 'jul',
      'august', 'aug',
      'september', 'sep',
      'october', 'oct',
      'november', 'nov',
      'december', 'dec',
    ];
    return months.some((month) => value.includes(month));
  }

  private static toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private static getContextValue(context: LetterContext, key: string) {
    const rawKey = key.trim();
    if (Object.prototype.hasOwnProperty.call(context, rawKey)) {
      return (context as any)[rawKey];
    }

    const normalizedKey = rawKey.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(context, normalizedKey)) {
      return (context as any)[normalizedKey];
    }

    if (normalizedKey === 'address' && Object.prototype.hasOwnProperty.call(context, 'registered_address')) {
      return (context as any).registered_address;
    }

    return undefined;
  }

  private static maybeEscape(value: string, options: RenderOptions): string {
    if (!options.escapeXml) return value;
    return this.escapeXml(value);
  }

  private static escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static stripQuotes(value: string): string {
    return value.replace(/^["']|["']$/g, '');
  }

  /**
   * Format currency for display
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private static formatNumber(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
