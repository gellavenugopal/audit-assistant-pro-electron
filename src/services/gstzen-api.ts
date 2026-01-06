/**
 * GSTZen API Service
 * Handles all communication with the gstzen backend
 */

import type {
  GstzenCustomer,
  Gstin,
  Gstr1DownloadRequest,
  Gstr1Response,
  ApiResponse,
  CreateCustomerRequest,
  AddGstinRequest,
  UpdateGstinCredentialsRequest,
} from '@/types/gstzen';

const API_BASE_URL = (import.meta as any).env.VITE_GSTZEN_API_URL || 'https://app.gstzen.in';
const API_KEY = (import.meta as any).env.VITE_GSTZEN_API_KEY || '';

/**
 * Base API client for making requests to gstzen backend
 */
class GstzenApiClient {
  private baseUrl: string;
  private apiKey: string;
  private authToken: string | null = null;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    // Load token from storage if available
    this.authToken = this.getStoredToken();
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string) {
    this.authToken = token;
    // Also store in localStorage for persistence
    localStorage.setItem('gstzen_token', token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('gstzen_token');
    localStorage.removeItem('gstzen_user');
  }

  /**
   * Get token from localStorage on initialization
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('gstzen_token');
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authentication
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ===== Customer Management =====

  /**
   * Create a new customer in gstzen
   */
  async createCustomer(data: CreateCustomerRequest): Promise<ApiResponse<GstzenCustomer>> {
    return this.post<GstzenCustomer>('/api/customer/create/', data);
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<ApiResponse<GstzenCustomer>> {
    return this.get<GstzenCustomer>(`/api/customer/by-email/${encodeURIComponent(email)}/`);
  }

  /**
   * Update customer details
   */
  async updateCustomer(
    customerUuid: string,
    data: Partial<CreateCustomerRequest>
  ): Promise<ApiResponse<GstzenCustomer>> {
    return this.put<GstzenCustomer>(`/api/customer/${customerUuid}/`, data);
  }

  // ===== GSTIN Management =====

  /**
   * Get all GSTINs for a customer
   */
  async getGstins(customerUuid: string): Promise<ApiResponse<Gstin[]>> {
    return this.get<Gstin[]>(`/api/customer/${customerUuid}/gstins/`);
  }

  /**
   * Add a new GSTIN to customer account
   */
  async addGstin(
    customerUuid: string,
    data: AddGstinRequest
  ): Promise<ApiResponse<Gstin>> {
    return this.post<Gstin>(`/api/customer/${customerUuid}/gstins/`, data);
  }

  /**
   * Update GSTIN credentials
   */
  async updateGstinCredentials(
    data: UpdateGstinCredentialsRequest
  ): Promise<ApiResponse<Gstin>> {
    return this.put<Gstin>(
      `/api/gstin/${data.gstin_uuid}/credentials/`,
      {
        username: data.username,
        password: data.password,
      }
    );
  }

  /**
   * Delete a GSTIN
   */
  async deleteGstin(gstinUuid: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/gstin/${gstinUuid}/`);
  }

  /**
   * Test GSTIN connection (authenticate with portal)
   */
  async testGstinConnection(gstinUuid: string): Promise<ApiResponse<{ status: string }>> {
    return this.post<{ status: string }>(`/api/gstin/${gstinUuid}/test-connection/`, {});
  }

  // ===== GSTR1 Downloads =====

  /**
   * Download GSTR1 report
   */
  async downloadGstr1(data: Gstr1DownloadRequest): Promise<ApiResponse<Gstr1Response>> {
    return this.post<Gstr1Response>('/api/gstr1/download/', {
      api_name: data.api_name,
      gstin: data.gstin,
      fp: data.filing_period,
    });
  }

  /**
   * Get GSTR1 summary
   */
  async getGstr1Summary(
    gstin: string,
    filingPeriod: string
  ): Promise<ApiResponse<Gstr1Response>> {
    return this.downloadGstr1({
      gstin,
      filing_period: filingPeriod,
      api_name: 'retsum',
    });
  }

  /**
   * Get GSTR1 B2B invoices
   */
  async getGstr1B2B(
    gstin: string,
    filingPeriod: string
  ): Promise<ApiResponse<Gstr1Response>> {
    return this.downloadGstr1({
      gstin,
      filing_period: filingPeriod,
      api_name: 'b2b',
    });
  }

  /**
   * Get GSTR1 B2CS invoices
   */
  async getGstr1B2CS(
    gstin: string,
    filingPeriod: string
  ): Promise<ApiResponse<Gstr1Response>> {
    return this.downloadGstr1({
      gstin,
      filing_period: filingPeriod,
      api_name: 'b2cs',
    });
  }
}

// Export singleton instance
export const gstzenApi = new GstzenApiClient(API_BASE_URL, API_KEY);

// Export class for testing
export { GstzenApiClient };
