/**
 * TypeScript type definitions for GSTZen API integration
 */

// Customer Types
export interface GstzenCustomer {
  uuid: string;
  schema_name: string;
  first_name: string;
  last_name: string;
  organization?: string;
  email: string;
  phone: string;
  config?: CustomerConfig;
  metadata?: CustomerMetadata;
  create_date?: string;
  modify_date?: string;
}

export interface CustomerConfig {
  trial?: boolean;
  suspended?: boolean;
  subscription_end_date?: string;
  max_gstins?: number;
  subscription_type?: 'full-software' | 'reports-only' | 'json-to-xls-only';
}

export interface CustomerMetadata {
  gstin?: string;
  state?: string;
  billing_address?: string;
  billing_email?: string;
  account_type?: 'taxpayer' | 'practitioner';
}

// GSTIN Types
export interface Gstin {
  uuid: string;
  gstin: string;
  trade_name?: string;
  legal_name?: string;
  state?: string;
  state_code?: string;
  is_active?: boolean;
  filing_frequency?: 'monthly' | 'quarterly';
  metadata?: GstinMetadata;
  create_date?: string;
  modify_date?: string;
}

export interface GstinMetadata {
  gstn?: {
    credentials?: {
      username?: string;
      password?: string;
      ip_usr?: string;
    };
    session?: GstnSession;
    quarterly?: boolean;
    gsp_client_type?: string;
  };
}

export interface GstnSession {
  authtoken?: string;
  expiry_time?: number;
  max_expiry_time?: number;
}

export type GstnSessionStatus = 'INACTIVE' | 'ACTIVE' | 'DORMANT';

// GSTR1 Report Types
export interface Gstr1DownloadRequest {
  gstin: string;
  filing_period: string; // Format: MMYYYY (e.g., "072024")
  api_name: Gstr1ReportType;
}

export type Gstr1ReportType =
  | 'retsum'    // Return Summary
  | 'b2b'       // B2B Invoices
  | 'b2b-einv'  // B2B E-Invoices
  | 'b2ba'      // B2B Amendment
  | 'b2cs'      // B2C Small
  | 'b2csa'     // B2C Small Amendment
  | 'b2cl'      // B2C Large
  | 'b2cla'     // B2C Large Amendment
  | 'cdnr'      // Credit/Debit Notes Registered
  | 'cdnr-einv' // Credit/Debit Notes E-Invoice
  | 'cdnra'     // Credit/Debit Notes Amendment
  | 'cdnur'     // Credit/Debit Notes Unregistered
  | 'cdnur-einv'// Credit/Debit Notes Unregistered E-Invoice
  | 'cdnura'    // Credit/Debit Notes Unregistered Amendment
  | 'exp'       // Export Invoices
  | 'exp-einv'  // Export E-Invoices
  | 'expa'      // Export Amendment
  | 'at'        // Advance Tax
  | 'ata'       // Advance Tax Amendment
  | 'txp'       // Tax Payment
  | 'txpa'      // Tax Payment Amendment
  | 'hsnsum'    // HSN Summary
  | 'nil'       // NIL Rated Supplies
  | 'ecom'      // E-commerce
  | 'ecoma'     // E-commerce Amendment
  | 'supeco'    // Supplies through E-commerce
  | 'supecoa';  // Supplies through E-commerce Amendment

export interface Gstr1Response {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  message?: string;
}

// API Request/Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateCustomerRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization?: string;
  metadata?: Partial<CustomerMetadata>;
}

export interface AddGstinRequest {
  gstin: string;
  trade_name?: string;
  legal_name?: string;
  username?: string;
  password?: string;
  filing_frequency?: 'monthly' | 'quarterly';
}

export interface UpdateGstinCredentialsRequest {
  gstin_uuid: string;
  username: string;
  password: string;
}

// Error Types
export interface GstzenApiError {
  code: string;
  message: string;
  details?: any;
}
