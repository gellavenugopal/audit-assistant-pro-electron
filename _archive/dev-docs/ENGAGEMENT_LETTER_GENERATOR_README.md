# Master-Driven Engagement Letter Generator

**Production-Grade CA Engagement Letter Automation Tool for India**

## Overview

This tool generates professional engagement letters from one master data input using conditional logic and template processing. It implements the complete specification for a CA firm's engagement letter automation system.

## Features

✓ **One Master Input** → Multiple Output Documents  
✓ **Conditional Logic** for Statutory Audit, Tax Audit  
✓ **Professional DOCX Output** ready for signing  
✓ **Merge Tag Engine** with full conditional support  
✓ **Validation & Error Handling** for production use  
✓ **Future-Ready Architecture** for LLP, Trust engagements  

## Supported Letter Types

1. **Statutory Audit – Unlisted Company with IFC**
   - Includes Internal Financial Controls audit scope
   - CARO 2020 compliance reporting
   - Ind AS or AS/Schedule III accounting standards

2. **Statutory Audit – Unlisted Company without IFC**
   - For companies not requiring IFC audit
   - CARO 2020 compliance reporting
   - Ind AS or AS/Schedule III accounting standards

3. **Tax Audit – Partnership Firm (Form 3CA)**
   - Audited accounts under Companies Act or other law
   - Form 3CA certification language
   - Cross-audit reliance clauses (if applicable)

4. **Tax Audit – Partnership Firm (Form 3CB)**
   - Non-audited accounts (tax audit only)
   - Form 3CB certification language
   - No cross-audit references

---

## Architecture

### 1. **Master Data Model** (`types/engagementLetter.ts`)

```typescript
EngagementLetterMasterData {
  engagement_type: 'statutory_audit_company_with_ifc' | 'statutory_audit_company_without_ifc' 
                  | 'tax_audit_partnership_3ca' | 'tax_audit_partnership_3cb'
  
  entity: EntityDetails
  period: EngagementPeriod
  auditor: AuditorDetails
  commercial: CommercialTerms
  mgmt_responsibilities: ManagementResponsibilities
  
  statutory_audit_config?: StatutoryAuditCompanyConfig
  tax_audit_config?: TaxAuditPartnershipConfig
}
```

**Single source of truth** for all four letter types.

### 2. **Template Engine** (`services/engagementLetterEngine.ts`)

Processes templates with:

- **Merge Tags**: `{{ENTITY_NAME}}`, `{{FINANCIAL_YEAR}}`
- **Conditionals**: `{{IF IFC_APPLICABLE}}...{{ENDIF}}`
- **Logic**: AND, OR, NOT, Equality (`=`, `!=`)

Example:
```
{{IF IFC_APPLICABLE}}
<IFC audit scope paragraph>
{{ENDIF}}

{{IF IND_AS_APPLICABLE}}
Ind AS accounting standards
{{ELSE}}
AS / Schedule III standards
{{ENDIF}}
```

### 3. **Templates** (`data/engagementLetterTemplates.ts`)

Four master templates:
- `STATUTORY_AUDIT_COMPANY_TEMPLATE` - Used for both IFC scenarios
- `TAX_AUDIT_PARTNERSHIP_3CA_TEMPLATE` - Form 3CA language
- `TAX_AUDIT_PARTNERSHIP_3CB_TEMPLATE` - Form 3CB language

Templates automatically adapt based on conditional flags.

### 4. **DOCX Generator** (`services/engagementLetterDocxGenerator.ts`)

Converts rendered text to professionally formatted Word documents:
- Proper margins and spacing
- Heading hierarchies
- Bullet lists
- Bold/italic formatting
- Page breaks where needed

### 5. **Orchestrator** (`services/engagementLetterGenerator.ts`)

Master service coordinating the entire pipeline:
```
Master Data → Validation → Template Selection → 
Context Building → Template Rendering → DOCX Generation
```

### 6. **UI Component** (`components/engagement-letter/EngagementLetterGeneratorUI.tsx`)

Five-step wizard:
1. Select engagement letter type
2. Enter entity details
3. Enter auditor & period details
4. Enter commercial terms & conditions
5. Review & generate

---

## Usage Example

### Programmatic API

```typescript
import { EngagementLetterGenerator } from '@/services/engagementLetterGenerator';
import type { EngagementLetterMasterData } from '@/types/engagementLetter';

const masterData: EngagementLetterMasterData = {
  engagement_type: 'statutory_audit_company_with_ifc',
  
  entity: {
    entity_name: 'ABC Manufacturing Ltd',
    entity_type: 'Company',
    entity_status: 'Unlisted Company',
    registration_no: 'U28110DL2020PLC123456',
    pan: 'AABCT1234A',
    gstin: '07AABCT1234A1Z0',
    registered_address: '123 Corporate Park, New Delhi-110001',
    email: 'audit@abcmfg.com',
    phone: '+91-11-2345-6789',
  },
  
  period: {
    financial_year: '2024-25',
    balance_sheet_date: '2025-03-31',
    appointment_date: '2024-04-01',
  },
  
  auditor: {
    firm_name: 'XYZ & Associates',
    firm_reg_no: '123456N',
    partner_name: 'Mr. John Doe',
    partner_mem_no: '123456',
    partner_pan: 'ABCPD1234K',
    place: 'New Delhi',
    letter_date: '2024-04-01',
  },
  
  commercial: {
    professional_fees: 250000,
    taxes_extra: true,
    payment_terms: '50% on engagement, 50% on completion',
    out_of_pocket_exp: true,
  },
  
  mgmt_responsibilities: {
    mgmt_responsibility_ack: true,
    books_responsibility_ack: true,
    internal_control_ack: true,
    fraud_prevention_ack: true,
  },
  
  statutory_audit_config: {
    ifc_applicable: true,  // Triggers IFC audit scope
    caro_applicable: true,
    ind_as_applicable: true,
  },
};

// Generate DOCX
const result = await EngagementLetterGenerator.generateLetter(masterData);

if (result.success) {
  console.log('Generated:', result.letter_type);
  console.log('Document Base64:', result.document_base64);
  // Download or save result.document_buffer
} else {
  console.error('Error:', result.error);
}
```

### UI Usage

```tsx
import { EngagementLetterGeneratorUI } from '@/components/engagement-letter/EngagementLetterGeneratorUI';

export function MyPage() {
  return <EngagementLetterGeneratorUI engagementId="eng-123" />;
}
```

---

## Conditional Logic Reference

### Statutory Audit Conditionals

**IFC_APPLICABLE**
- If `true`: Includes IFC audit scope, IFC responsibilities, IFC signature section
- If `false`: All IFC paragraphs removed

**CARO_APPLICABLE**
- If `true`: Includes CARO 2020 reporting scope
- If `false`: CARO clauses omitted

**IND_AS_APPLICABLE**
- If `true`: References "Ind AS"
- If `false`: References "AS / Schedule III"

**Combined Example**:
```
{{IF IFC_APPLICABLE AND CARO_APPLICABLE}}
<Section covering both IFC and CARO>
{{ENDIF}}
```

### Tax Audit Conditionals

**TAX_AUDIT_FORM = "3CA"**
- Includes references to audit under other law
- States accounts are audited
- Includes cross-audit reliance language

**TAX_AUDIT_FORM = "3CB"**
- No cross-audit references
- Emphasizes tax-audit-only nature
- States accounts are NOT audited under other law

**AUDITED_UNDER_OTHER_LAW**
- If `true`: Includes coordination clauses
- If `false`: Omits cross-audit dependencies

---

## Field Validation

All fields are validated before generation:

**Required for All Letters**:
- entity.entity_name
- entity.registration_no
- entity.email
- period.financial_year
- period.balance_sheet_date
- auditor.firm_name
- auditor.partner_name
- commercial.professional_fees
- commercial.payment_terms

**Required for Tax Audits**:
- period.assessment_year
- tax_audit_config.tax_audit_form
- tax_audit_config.accounting_standard

---

## Template Merge Tags (Full Reference)

### Entity Details
- `{{ENTITY_NAME}}`
- `{{ENTITY_TYPE}}`
- `{{ENTITY_STATUS}}`
- `{{REGISTRATION_NO}}`
- `{{PAN}}`
- `{{GSTIN}}`
- `{{REGISTERED_ADDRESS}}`
- `{{EMAIL}}`
- `{{PHONE}}`

### Period
- `{{FINANCIAL_YEAR}}`
- `{{ASSESSMENT_YEAR}}`
- `{{BALANCE_SHEET_DATE}}`
- `{{APPOINTMENT_DATE}}`

### Auditor
- `{{FIRM_NAME}}`
- `{{FIRM_REG_NO}}`
- `{{PARTNER_NAME}}`
- `{{PARTNER_MEM_NO}}`
- `{{PARTNER_PAN}}`
- `{{PLACE}}`
- `{{LETTER_DATE}}`

### Commercial
- `{{PROFESSIONAL_FEES}}`
- `{{TAXES_EXTRA}}`
- `{{PAYMENT_TERMS}}`
- `{{OUT_OF_POCKET_EXP}}`

### Management Responsibilities
- `{{MGMT_RESPONSIBILITY_ACK}}`
- `{{BOOKS_RESPONSIBILITY_ACK}}`
- `{{INTERNAL_CONTROL_ACK}}`
- `{{FRAUD_PREVENTION_ACK}}`

### Conditionals
- `{{IF IFC_APPLICABLE}}`
- `{{IF CARO_APPLICABLE}}`
- `{{IF IND_AS_APPLICABLE}}`
- `{{IF TAX_AUDIT_FORM = "3CA"}}`
- `{{IF NOT AUDITED_UNDER_OTHER_LAW}}`

---

## Adding New Letter Types

To extend with new engagement letters (e.g., LLP Audit, Limited Review):

1. **Update `types/engagementLetter.ts`**:
   - Add new `EngagementLetterType`
   - Add new config type (e.g., `LLPAuditConfig`)

2. **Add Template** in `data/engagementLetterTemplates.ts`:
   ```typescript
   export const LLP_AUDIT_TEMPLATE = `...`;
   ```

3. **Update Orchestrator** in `services/engagementLetterGenerator.ts`:
   - Update `selectTemplate()` method
   - Add to `getAvailableLetterTypes()`

**No changes required to engine or DOCX generator** — architecture is extensible.

---

## Quality Assurance

- ✓ All templates ICAI-compliant
- ✓ Professional formatting suitable for peer review
- ✓ No manual post-editing required
- ✓ Validation prevents incomplete generation
- ✓ Error messages guide users to missing fields

---

## Technical Stack

- **React** (UI Component)
- **TypeScript** (Type Safety)
- **docx** Library (DOCX Generation)
- **Template Engine** (Custom Built)
- **Conditional Logic** (Custom Parser)

---

## Files Structure

```
src/
├── types/
│   └── engagementLetter.ts
├── services/
│   ├── engagementLetterEngine.ts
│   ├── engagementLetterGenerator.ts
│   ├── engagementLetterDocxGenerator.ts
├── data/
│   └── engagementLetterTemplates.ts
└── components/
    └── engagement-letter/
        └── EngagementLetterGeneratorUI.tsx
```

---

## Support

For issues, additions, or clarifications:
- Review conditional logic in `EngagementLetterTemplateEngine`
- Update templates for new ICAI guidance
- Extend master data model for new engagement types

---

**Version 1.0 - Production Ready**  
**Suitable for ICAI Peer Review**
