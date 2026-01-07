declare global {
  interface Window {
    electronAPI: {
      platform: string;
      gstzen: {
        login: (credentials: { username: string; password: string }) => Promise<any>;
        getCustomerByEmail: (email: string, token: string) => Promise<any>;
        createCustomer: (customerData: any, token: string) => Promise<any>;
        getGstins: (customerUuid: string, token: string) => Promise<any>;
        addGstin: (customerUuid: string, gstinData: any, token: string) => Promise<any>;
        updateGstinCredentials: (gstinUuid: string, credentials: any, token: string) => Promise<any>;
        testGstinConnection: (gstinUuid: string, token: string) => Promise<any>;
        downloadGstr1: (downloadRequest: any, token: string) => Promise<any>;
        generateOtp: (requestData: any, token: string) => Promise<any>;
        establishSession: (requestData: any, token: string) => Promise<any>;
      };
    };
  }
}

export {};
