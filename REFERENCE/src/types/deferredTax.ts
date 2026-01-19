export interface DTLRecord {
  id: string;
  head: string;
  depreciationBasis: string;
  accounts: number;
  tax: number;
  difference: number;
  type: 'DTA' | 'DTL';
  deferredTax: number;
}

export interface DTLMasterItem {
  nature: string;
  type: 'DTA' | 'DTL';
}

export interface DTLMaster {
  [key: string]: DTLMasterItem;
}

export interface DTLSummary {
  openingDTA: number;
  openingDTL: number;
  currentYearDTA: number;
  currentYearDTL: number;
  closingDTA: number;
  closingDTL: number;
  netPosition: number;
  pnlImpact: number;
  pnlLabel: string;
  bsLabel: string;
}

export interface DTLFormState {
  entityName: string;
  financialYear: string;
  preparedBy: string;
  reviewedBy: string;
  openingDTA: number;
  openingDTL: number;
  selectedHead: string;
  manualHead: string;
  nature: string;
  depreciationBasis: string;
  accounts: string;
  tax: string;
  difference: string;
  dtType: 'DTA' | 'DTL' | '';
  taxRate: string;
  dtAmount: string;
}
