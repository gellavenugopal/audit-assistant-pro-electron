export const CONSTITUTION_TYPES = [
  { value: 'company', label: 'Company', templateType: 'company' },
  { value: 'llp', label: 'Limited Liability Partnership (LLP)', templateType: 'company' },
  { value: 'partnership', label: 'Partnership Firm', templateType: 'non_corporate' },
  { value: 'proprietorship', label: 'Proprietorship', templateType: 'non_corporate' },
  { value: 'trust', label: 'Trust', templateType: 'non_corporate' },
  { value: 'society', label: 'Society', templateType: 'non_corporate' },
  { value: 'aop', label: 'Association of Persons (AOP)', templateType: 'non_corporate' },
  { value: 'huf', label: 'Hindu Undivided Family (HUF)', templateType: 'non_corporate' },
  { value: 'cooperative', label: 'Cooperative Society', templateType: 'non_corporate' },
] as const;

export type ConstitutionType = typeof CONSTITUTION_TYPES[number]['value'];

export function getTemplateTypeForConstitution(constitution: string): 'company' | 'non_corporate' {
  const type = CONSTITUTION_TYPES.find(c => c.value === constitution);
  return type?.templateType || 'company';
}
