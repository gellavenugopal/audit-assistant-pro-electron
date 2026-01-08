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
  Gstr1ReportType,
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
   * Login to GSTZen
   */
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<{ access: string; refresh: string }>> {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.gstzen && window.electronAPI.gstzen.login) {
      const result = await window.electronAPI.gstzen.login(credentials);
      
      if (result.ok && result.data && result.data.access) {
        return { 
          success: true, 
          data: { access: result.data.access, refresh: result.data.refresh || '' } 
        };
      } else {
        return { 
          success: false, 
          error: result.data?.detail || result.data?.message || 'Login failed' 
        };
      }
    }

    // Fallback to direct fetch
    const apiUrl = (import.meta as any).env.VITE_GSTZEN_API_URL || 'https://staging.gstzen.in';
    const loginUrl = `${apiUrl}/accounts/api/login/token/`;
    console.log('[API Request Check] Login Fallback:', loginUrl, credentials);

    try {
        const response = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
        });
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('Failed to parse JSON response:', text.substring(0, 100));
            data = { error: 'Invalid JSON response', raw: text.substring(0, 1000) };
        }
        
        console.log(`[API Response Check] Login Fallback (${response.status}):`, data);

        if (response.ok && data.access) {
            return { success: true, data: { access: data.access, refresh: data.refresh || '' } };
        }
        return { success: false, error: data.detail || data.message || 'Login failed' };
    } catch (error) {
        console.error('[API Exception Check] Login Fallback:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // 1. Try Electron IPC Bridge (Bypass CORS)

    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.gstzen && window.electronAPI.gstzen.request) {
        // Map methods
        const method = options.method || 'GET';
        
        // Handle Body
        let data = undefined;
        if (options.body && typeof options.body === 'string') {
             try {
                 data = JSON.parse(options.body as string);
             } catch (e) {
                 console.warn("Could not parse body for IPC", options.body);
             }
        }

        console.log(`[API Request] Method: ${method}, Endpoint: ${endpoint}`, data ? { data } : 'No Data');
        
        try {
            const result = await window.electronAPI.gstzen.request(endpoint, method, data, this.authToken || '');
            if (result.ok) {
                console.log(`[API Response] ${endpoint}:`, result.data);
                return { success: true, data: result.data };
            } else {
                console.error(`[API Error] ${endpoint}:`, result);
                return { success: false, error: result.data?.message || `HTTP error ${result.status}` };
            }
        } catch (error) {
             console.error(`[API Exception] ${endpoint}:`, error);
             return { success: false, error: error instanceof Error ? error.message : 'IPC Request Failed' };
        }
    }

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

    const method = options.method || 'GET';
    console.log(`[API Request Fetch] Method: ${method}, Endpoint: ${endpoint}`, 'Headers:', headers);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[API Error Fetch] ${endpoint}:`, errorData);
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
        console.log(`[API Response Fetch] ${endpoint}:`, data);
      } catch (e) {
        console.warn('Invalid JSON response:', e);
        throw new Error('Received invalid response from server');
      }
      
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
   * Get all GSTINs for the authenticated user
   */
  async getGstins(): Promise<ApiResponse<Gstin[]>> {
    return this.get<Gstin[]>(`/api/gstins/`);
  }



  // ===== GSTN Portal Authentication =====

  /**
   * Generate OTP for GSTN Portal login
   */
  async generateOtp(gstin: string, username: string): Promise<ApiResponse<any>> {
    const requestData = { gstin, username };
    
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.gstzen && window.electronAPI.gstzen.generateOtp) {
      const result = await window.electronAPI.gstzen.generateOtp(requestData, this.authToken || '');
      if (result.ok && result.data && Object.keys(result.data).length > 0) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.data?.error || result.data?.message || 'Failed to generate OTP (Empty Response)' };
      }
    }
    
    return this.post('/api/gstn-generate-otp/', requestData);
  }

  /**
   * Establish GSTN Portal Session with OTP
   */
  async establishSession(gstin: string, otp: string): Promise<ApiResponse<any>> {
    const requestData = { gstin, otp };
    
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.gstzen && window.electronAPI.gstzen.establishSession) {
      const result = await window.electronAPI.gstzen.establishSession(requestData, this.authToken || '');
      if (result.ok) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.data?.error || result.data?.message || 'Failed to establish session' };
      }
    }
    
    return this.post('/api/gstn-establish-session/', requestData);
  }

  // ===== GSTR1 Downloads =====

  /**
   * Download GSTR1 report
   */
  async downloadGstr1(data: Gstr1DownloadRequest): Promise<ApiResponse<Gstr1Response>> {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.gstzen && window.electronAPI.gstzen.downloadGstr1) {
      console.log('GSTZenAPI: Initiating GSTR1 Download via IPC...', data);
      // Ensure backend-compatible field names
      const requestData = {
          ...data,
          ret_period: data.filing_period,
      };

      const result = await window.electronAPI.gstzen.downloadGstr1(requestData, this.authToken || '');
      console.log('GSTZenAPI: IPC Download Result:', result);
      if (result.ok) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.data?.error || result.data?.message || 'Failed to download GSTR1' };
      }
    }

    return this.post<Gstr1Response>('/api/gstr1/download/', {
      api_name: data.api_name,
      gstin: data.gstin,
      ret_period: data.filing_period,
    });
  }

  /**
   * Get Consolidated Report JSON
   */
  async getConsolidatedReport(gstinUuid: string, year: number, reportType: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/gstin/${gstinUuid}/consolidated-report/${year}/${reportType}/`);
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

  /**
   * Get all GSTINs for the user (Authenticated View)
   */
  async getGstinList(): Promise<ApiResponse<{ gstins: Gstin[], page_info: any }>> {
      // Endpoint corresponds to views.GstInListApi
      return this.get<{ gstins: Gstin[], page_info: any }>(`/api/gstins/`);
  }

  /**
   * Get fresh GSTIN details (to check session status)
   */
  async getGstinDetails(uuid: string): Promise<Gstin | null> {
      try {
          const response = await this.getGstinList();
          if (response.success && response.data?.gstins) {
              return response.data.gstins.find(g => g.uuid === uuid) || null;
          }
          return null;
      } catch (error) {
          console.warn("Failed to fetch fresh GSTIN details", error);
          return null;
      }
  }

  /**
   * Fetch specific GSTR-1 section data
   */
  async fetchGstr1SectionData(
    gstin: string,
    filingPeriod: string,
    apiName: Gstr1ReportType
  ): Promise<any[]> {
    try {
      const response = await this.downloadGstr1({
        gstin,
        filing_period: filingPeriod,
        api_name: apiName,
      });

      if (response.success && response.data) {
        // Check for Status 1 (Success)
        if (response.data.status === 1 && response.data.message && typeof response.data.message !== 'string') {
           // Extract the first key's value (e.g. "b2b": [...])
           const keys = Object.keys(response.data.message);
           if (keys.length > 0) {
             const data = response.data.message[keys[0]];
             if (Array.isArray(data)) {
               return data;
             }
           }
        }
      }
      return [];
    } catch (error) {
      console.warn(`Failed to fetch section ${apiName}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const gstzenApi = new GstzenApiClient(API_BASE_URL, API_KEY);

// Export class for testing
export { GstzenApiClient };
