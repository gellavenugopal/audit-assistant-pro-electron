import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// Extend the Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: {
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

export interface LedgerData {
  $Name: string;
  $_PrimaryGroup: string;
  $Parent: string;
  $OpeningBalance: number;
  $_ClosingBalance?: number;
  $IsRevenue: string;
  Dr_Balance: number;
  Cr_Balance: number;
}

export interface BalanceMismatch {
  $Name: string;
  $_PrimaryGroup: string;
  $Parent: string;
  New_Dr_Balance: number;
  New_Cr_Balance: number;
  Old_Dr_Balance: number;
  Old_Cr_Balance: number;
  Dr_Difference: number;
  Cr_Difference: number;
}

export interface NameMismatch {
  'Name as per OLD Tally': string;
  'Name as per NEW Tally': string;
  'Balance as per OLD Tally': string;
  'Balance as per NEW Tally': string;
  'Remarks': string;
}

export interface ComparisonResult {
  balanceMismatches: BalanceMismatch[];
  nameMismatches: NameMismatch[];
  xml: string;
}

export const useOpeningBalanceMatching = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [oldTallyData, setOldTallyData] = useState<LedgerData[] | null>(null);
  const [newTallyData, setNewTallyData] = useState<LedgerData[] | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const fetchOldTallyLedgers = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!window.electronAPI || typeof window.electronAPI.odbcFetchOldTallyLedgers !== 'function') {
        throw new Error('Electron API not available. Please restart the application.');
      }
      const result = await window.electronAPI.odbcFetchOldTallyLedgers();

      if (result.success && result.data) {
        setOldTallyData(result.data);
        toast({
          title: "Old Tally Data Fetched",
          description: `Successfully fetched ${result.data.length} ledgers from Old Tally`,
        });
        return true;
      } else {
        throw new Error(result.error || "Failed to fetch Old Tally ledger data");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to Fetch Old Tally Data",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchNewTallyLedgers = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!window.electronAPI || typeof window.electronAPI.odbcFetchNewTallyLedgers !== 'function') {
        throw new Error('Electron API not available. Please restart the application.');
      }
      const result = await window.electronAPI.odbcFetchNewTallyLedgers();

      if (result.success && result.data) {
        setNewTallyData(result.data);
        toast({
          title: "New Tally Data Fetched",
          description: `Successfully fetched ${result.data.length} ledgers from New Tally`,
        });
        return true;
      } else {
        throw new Error(result.error || "Failed to fetch New Tally ledger data");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to Fetch New Tally Data",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const compareBalances = useCallback(async (): Promise<boolean> => {
    try {
      if (!oldTallyData || !newTallyData) {
        toast({
          title: "Missing Data",
          description: "Please fetch both Old and New Tally data first",
          variant: "destructive",
        });
        return false;
      }

      setIsLoading(true);
      if (!window.electronAPI || typeof window.electronAPI.odbcCompareOpeningBalances !== 'function') {
        throw new Error('Electron API not available. Please restart the application.');
      }
      const result = await window.electronAPI.odbcCompareOpeningBalances({
        oldData: oldTallyData,
        newData: newTallyData,
      });

      if (result.success && result.comparison && result.xml) {
        setComparisonResult({
          balanceMismatches: result.comparison.balanceMismatches,
          nameMismatches: result.comparison.nameMismatches,
          xml: result.xml,
        });
        toast({
          title: "Comparison Complete",
          description: `Found ${result.comparison.balanceMismatches.length} balance mismatches and ${result.comparison.nameMismatches.length} name mismatches`,
        });
        return true;
      } else {
        throw new Error(result.error || "Failed to compare balances");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Comparison Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [oldTallyData, newTallyData, toast]);

  const downloadXML = useCallback(() => {
    if (!comparisonResult?.xml) {
      toast({
        title: "No XML Available",
        description: "Please run comparison first",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([comparisonResult.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tally_ledger_import.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "XML Downloaded",
      description: "tally_ledger_import.xml has been downloaded. Import it to Tally using Gateway of Tally > Import > Masters",
    });
  }, [comparisonResult, toast]);

  const reset = useCallback(() => {
    setOldTallyData(null);
    setNewTallyData(null);
    setComparisonResult(null);
  }, []);

  return {
    isLoading,
    oldTallyData,
    newTallyData,
    comparisonResult,
    fetchOldTallyLedgers,
    fetchNewTallyLedgers,
    compareBalances,
    downloadXML,
    reset,
  };
};

