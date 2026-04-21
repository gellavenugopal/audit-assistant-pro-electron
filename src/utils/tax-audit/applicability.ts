import { TaxAuditFormType, TaxAuditSourceLink } from '@/types/taxAudit';

export type TaxAuditApplicabilityInput = {
  businessOrProfession: 'business' | 'profession';
  turnover?: number | null;
  grossReceipts?: number | null;
  cashReceiptsPercent?: number | null;
  cashPaymentsPercent?: number | null;
  presumptiveTaxation?: boolean | number | null;
  lowerThanPresumptive?: boolean | number | null;
  booksAuditedUnderOtherLaw?: boolean | number | null;
};

export type TaxAuditApplicabilityResult = {
  applicable: boolean;
  relevantClause: string;
  reason: string;
  formType: TaxAuditFormType;
  sourceLinks: TaxAuditSourceLink[];
};

const truthy = (value: boolean | number | null | undefined) => value === true || value === 1;

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value || 0);

export function evaluateTaxAuditApplicability(input: TaxAuditApplicabilityInput): TaxAuditApplicabilityResult {
  const isProfession = input.businessOrProfession === 'profession';
  const activityAmount = isProfession ? Number(input.grossReceipts || input.turnover || 0) : Number(input.turnover || 0);
  const cashReceiptsPercent = Number(input.cashReceiptsPercent || 0);
  const cashPaymentsPercent = Number(input.cashPaymentsPercent || 0);
  const cashWithinFivePercent = cashReceiptsPercent <= 5 && cashPaymentsPercent <= 5;
  const formType: TaxAuditFormType = truthy(input.booksAuditedUnderOtherLaw) ? '3CA' : '3CB';

  const sourceLinks: TaxAuditSourceLink[] = [
    {
      label: 'Setup',
      module: 'tax_audit_setup',
      route: '/tax-audit',
      field: 'tax_audit_setup',
    },
  ];

  if (isProfession && activityAmount > 5_000_000) {
    return {
      applicable: true,
      relevantClause: '44AB(b)',
      reason: `Gross receipts from profession exceed Rs. 50,00,000. Reported amount: Rs. ${formatAmount(activityAmount)}.`,
      formType,
      sourceLinks,
    };
  }

  if (!isProfession && activityAmount > 100_000_000) {
    return {
      applicable: true,
      relevantClause: '44AB(a)',
      reason: `Business turnover exceeds Rs. 10 crore. Reported turnover: Rs. ${formatAmount(activityAmount)}.`,
      formType,
      sourceLinks,
    };
  }

  if (!isProfession && activityAmount > 10_000_000 && !cashWithinFivePercent) {
    return {
      applicable: true,
      relevantClause: '44AB(a)',
      reason: `Business turnover exceeds Rs. 1 crore and the cash receipt/payment conditions for the enhanced Rs. 10 crore threshold are not met.`,
      formType,
      sourceLinks,
    };
  }

  if (truthy(input.presumptiveTaxation) && truthy(input.lowerThanPresumptive)) {
    return {
      applicable: true,
      relevantClause: isProfession ? '44AB(d)' : '44AB(e)',
      reason: 'Presumptive taxation has been selected and income is reported lower than the presumptive threshold.',
      formType,
      sourceLinks,
    };
  }

  return {
    applicable: false,
    relevantClause: 'Not applicable',
    reason: 'The available setup inputs do not trigger tax audit under the configured Section 44AB checks.',
    formType,
    sourceLinks,
  };
}

export function deriveAssessmentYear(financialYear?: string | null) {
  if (!financialYear) return '';
  const match = financialYear.trim().match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return '';
  const startYear = parseInt(match[1], 10);
  if (!Number.isFinite(startYear)) return '';
  const assessmentStart = startYear + 1;
  return `${assessmentStart}-${String(assessmentStart + 1).slice(-2)}`;
}

export function derivePreviousYearRange(financialYear?: string | null) {
  if (!financialYear) return { from: '', to: '' };
  const match = financialYear.trim().match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return { from: '', to: '' };
  const startYear = parseInt(match[1], 10);
  const endRaw = match[2];
  const endYear = endRaw.length === 2 ? parseInt(`${String(startYear).slice(0, 2)}${endRaw}`, 10) : parseInt(endRaw, 10);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return { from: '', to: '' };
  return {
    from: `${startYear}-04-01`,
    to: `${endYear}-03-31`,
  };
}
