// ============================================================================
// ENGAGEMENT LETTER TEMPLATE ENGINE
// ============================================================================
// Processes merge tags {{VARIABLE}} and conditional blocks {{IF}}...{{ENDIF}}

import type { LetterContext } from '@/types/engagementLetter';

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
  static render(template: string, context: LetterContext): string {
    let result = template;

    // Step 1: Process conditionals (innermost first due to nesting)
    result = this.processConditionals(result, context);

    // Step 2: Substitute merge tags
    result = this.substituteMergeTags(result, context);

    // Step 3: Clean up any remaining unprocessed tags
    result = this.cleanupUnprocessedTags(result);

    return result;
  }

  /**
   * Process conditional blocks: {{IF CONDITION}}...{{ENDIF}}
   * Supports nested conditionals and boolean/comparison operations
   */
  private static processConditionals(template: string, context: LetterContext): string {
    let result = template;
    const conditionalRegex = /\{\{IF\s+([^}]+)\}\}([\s\S]*?)\{\{ENDIF\}\}/g;

    let match;
    const iterations: string[] = [];

    while ((match = conditionalRegex.exec(template)) !== null) {
      const condition = match[1].trim();
      const innerContent = match[2];
      const fullBlock = match[0];

      const shouldInclude = this.evaluateCondition(condition, context);

      if (shouldInclude) {
        result = result.replace(fullBlock, innerContent);
      } else {
        result = result.replace(fullBlock, '');
      }

      iterations.push(`Condition '${condition}' → ${shouldInclude}`);

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
    condition = condition.trim();

    // Handle NOT operator
    if (condition.startsWith('NOT ')) {
      return !this.evaluateCondition(condition.substring(4), context);
    }

    // Handle AND operator (left-to-right)
    if (condition.includes(' AND ')) {
      const parts = condition.split(' AND ').map((p) => p.trim());
      return parts.every((part) => this.evaluateCondition(part, context));
    }

    // Handle OR operator (left-to-right)
    if (condition.includes(' OR ')) {
      const parts = condition.split(' OR ').map((p) => p.trim());
      return parts.some((part) => this.evaluateCondition(part, context));
    }

    // Handle equality: VAR = "value"
    if (condition.includes('=')) {
      const [varName, value] = condition.split('=').map((s) => s.trim());
      const contextValue = (context as any)[varName];
      const expectedValue = value.replace(/^["']|["']$/g, ''); // Strip quotes
      return String(contextValue) === expectedValue;
    }

    // Handle inequality: VAR != "value"
    if (condition.includes('!=')) {
      const [varName, value] = condition.split('!=').map((s) => s.trim());
      const contextValue = (context as any)[varName];
      const expectedValue = value.replace(/^["']|["']$/g, '');
      return String(contextValue) !== expectedValue;
    }

    // Simple boolean: VAR (check if truthy)
    const value = (context as any)[condition];
    return Boolean(value);
  }

  /**
   * Substitute merge tags: {{VARIABLE_NAME}} with context values
   */
  private static substituteMergeTags(template: string, context: LetterContext): string {
    const mergeTagRegex = /\{\{([A-Z_0-9]+)\}\}/g;
    return template.replace(mergeTagRegex, (match, variable) => {
      const value = (context as any)[variable];
      if (value === undefined || value === null) {
        return ''; // Return empty if variable not found
      }
      return String(value);
    });
  }

  /**
   * Clean up any remaining unprocessed tags (e.g., orphaned {{VAR}})
   */
  private static cleanupUnprocessedTags(template: string): string {
    return template.replace(/\{\{[^}]+\}\}/g, '');
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
      assessment_year: period.assessment_year || '',
      balance_sheet_date: period.balance_sheet_date,
      appointment_date: period.appointment_date,

      // Auditor
      firm_name: auditor.firm_name,
      firm_reg_no: auditor.firm_reg_no,
      partner_name: auditor.partner_name,
      partner_mem_no: auditor.partner_mem_no,
      partner_pan: auditor.partner_pan,
      place: auditor.place,
      letter_date: period.appointment_date,

      // Commercial
      professional_fees: this.formatCurrency(commercial.professional_fees),
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
      is_ind_as: statutory_audit_config?.ind_as_applicable ?? true,
      is_3ca: tax_audit_config?.tax_audit_form === '3CA',
      is_3cb: tax_audit_config?.tax_audit_form === '3CB',

      // Optional conditionals
      ifc_applicable: statutory_audit_config?.ifc_applicable,
      caro_applicable: statutory_audit_config?.caro_applicable,
      ind_as_applicable: statutory_audit_config?.ind_as_applicable,
      tax_audit_form: tax_audit_config?.tax_audit_form,
      audited_under_other_law: tax_audit_config?.audited_under_other_law,
      accounting_standard: tax_audit_config?.accounting_standard,
    };
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
}
