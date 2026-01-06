import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// Extend the Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: {
      odbcTestConnection: () => Promise<{ success: boolean; error?: string; driver?: string; sampleData?: any }>;
      odbcFetchTrialBalance: () => Promise<{ success: boolean; error?: string; data?: any[] }>;
      odbcDisconnect: () => Promise<{ success: boolean; error?: string }>;
      // Opening Balance Matching methods
      odbcFetchOldTallyLedgers: () => Promise<{ success: boolean; error?: string; data?: any[] }>;
      odbcFetchNewTallyLedgers: () => Promise<{ success: boolean; error?: string; data?: any[] }>;
      odbcCompareOpeningBalances: (data: { oldData: any[]; newData: any[] }) => Promise<{
        success: boolean;
        error?: string;
        comparison?: {
          balanceMismatches: any[];
          nameMismatches: any[];
        };
        xml?: string;
      }>;
    };
  }
}

interface TallyCompanyInfo {
  companyName: string;
  financialYear: string;
  booksFrom: string;
  booksTo: string;
}

export interface TallyTrialBalanceLine {
  accountHead: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  accountCode: string;
  branch: string;
  // Hierarchy fields
  primaryGroup: string;
  parent: string;
  isRevenue: boolean;
}

interface TallyODBCState {
  isConnected: boolean;
  isConnecting: boolean;
  companyInfo: TallyCompanyInfo | null;
  error: string | null;
}

export const useTallyODBC = () => {
  const { toast } = useToast();
  const [state, setState] = useState<TallyODBCState>({
    isConnected: false,
    isConnecting: false,
    companyInfo: null,
    error: null,
  });

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      const result = await window.electronAPI.odbcTestConnection();

      if (result.success) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }));
        toast({
          title: "ODBC Connected",
          description: `Successfully connected using ${result.driver}`,
        });
        return true;
      } else {
        throw new Error(result.error || "ODBC connection failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage
      }));
      toast({
        title: "ODBC Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const fetchTrialBalance = useCallback(async (fromDate: string, toDate: string): Promise<TallyTrialBalanceLine[]> => {
    try {
      const result = await window.electronAPI.odbcFetchTrialBalance();

      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || "Failed to fetch trial balance");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to Fetch Trial Balance",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const disconnect = useCallback(async () => {
    try {
      await window.electronAPI.odbcDisconnect();
    } catch (err) {
      console.error("Error disconnecting ODBC:", err);
    }
    
    setState({
      isConnected: false,
      isConnecting: false,
      companyInfo: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    testConnection,
    fetchTrialBalance,
    disconnect,
  };
};