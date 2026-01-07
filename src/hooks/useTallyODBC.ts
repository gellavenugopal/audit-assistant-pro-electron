import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TallyMonthWiseLine } from "@/contexts/TallyContext";

      // Extend the Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: {
      odbcCheckConnection: () => Promise<{ success: boolean; isConnected?: boolean; error?: string }>;
      odbcTestConnection: () => Promise<{ success: boolean; error?: string; driver?: string; sampleData?: any }>;
      odbcFetchTrialBalance: () => Promise<{ success: boolean; error?: string; data?: any[] }>;
      odbcFetchMonthWise: (fyStartYear: number, targetMonth: string) => Promise<{ success: boolean; error?: string; data?: { plLines: TallyMonthWiseLine[]; bsLines: TallyMonthWiseLine[]; months: string[]; fyStartYear: number; targetMonth: string } }>;
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
      // Month wise and GST methods
      odbcFetchMonthWiseData: (data: { fyStartYear: number; targetMonth: string }) => Promise<{
        success: boolean;
        error?: string;
        lines?: any[];
        months?: string[];
      }>;
      odbcFetchGSTNotFeeded: () => Promise<{
        success: boolean;
        error?: string;
        lines?: any[];
      }>;
      // Stock Items methods
      odbcFetchStockItems: () => Promise<{
        success: boolean;
        error?: string;
        items?: any[];
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

const STORAGE_KEY = 'auditpro_odbc_connection';

export const useTallyODBC = () => {
  const { toast } = useToast();
  const [state, setState] = useState<TallyODBCState>({
    isConnected: false,
    isConnecting: false,
    companyInfo: null,
    error: null,
  });

  // Restore connection state on mount and verify it's still active
  useEffect(() => {
    const checkConnectionStatus = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.isConnected) {
            // Verify connection is still active without creating a new one
            try {
              if (window.electronAPI && typeof window.electronAPI.odbcCheckConnection === 'function') {
                const result = await window.electronAPI.odbcCheckConnection();
                if (result.success && result.isConnected) {
                  // Connection is still active, restore state
                  setState({
                    isConnected: true,
                    isConnecting: false,
                    companyInfo: parsed.companyInfo || null,
                    error: null,
                  });
                  return;
                }
              }
            } catch {
              // Check failed, connection is not active
            }
            // Connection lost, clear saved state
            localStorage.removeItem(STORAGE_KEY);
            setState({
              isConnected: false,
              isConnecting: false,
              companyInfo: null,
              error: null,
            });
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    checkConnectionStatus();
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      const result = await window.electronAPI.odbcTestConnection();

      if (result.success) {
        const newState = {
          isConnected: true,
          isConnecting: false,
          companyInfo: null, // Can be populated later if needed
          error: null
        };
        setState(newState);
        
        // Persist connection state to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          isConnected: true,
          companyInfo: null,
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

  const fetchMonthWise = useCallback(async (fyStartYear: number, targetMonth: string): Promise<{ plLines: TallyMonthWiseLine[]; bsLines: TallyMonthWiseLine[]; months: string[] } | null> => {
    try {
      const result = await window.electronAPI.odbcFetchMonthWise(fyStartYear, targetMonth);

      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || "Failed to fetch month wise data");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to Fetch Month Wise Data",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const fetchStockItems = useCallback(async (): Promise<any[]> => {
    try {
      const result = await window.electronAPI.odbcFetchStockItems();

      if (result.success && result.items) {
        toast({
          title: "Stock Items Fetched",
          description: `Successfully fetched ${result.items.length} stock items from Tally`,
        });
        return result.items;
      } else {
        throw new Error(result.error || "Failed to fetch stock items");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to Fetch Stock Items",
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
    
    // Remove persisted connection state
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    ...state,
    testConnection,
    fetchTrialBalance,
    fetchMonthWise,
    fetchStockItems,
    disconnect,
  };
};