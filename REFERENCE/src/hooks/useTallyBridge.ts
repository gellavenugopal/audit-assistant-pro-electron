import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TallyCompanyInfo {
  companyName: string;
  financialYear: string;
  booksFrom: string;
  booksTo: string;
}

export interface TallyTrialBalanceLine {
  accountName: string;
  parentGroup: string;
  primaryGroup: string;
  isRevenue: boolean; // true = P&L, false = Balance Sheet
  openingDr: number;
  openingCr: number;
  debitTotals: number;
  creditTotals: number;
  closingDr: number;
  closingCr: number;
}

export interface TallyTrialBalanceResponse {
  success: boolean;
  lines: TallyTrialBalanceLine[];
  rawXml: string;
  periodFrom: string;
  periodTo: string;
}

interface TallyBridgeState {
  isConnected: boolean;
  isConnecting: boolean;
  companyInfo: TallyCompanyInfo | null;
  error: string | null;
  sessionCode: string;
}

export const useTallyBridge = () => {
  const { toast } = useToast();
  const [state, setState] = useState<TallyBridgeState>({
    isConnected: false,
    isConnecting: false,
    companyInfo: null,
    error: null,
    sessionCode: "",
  });

  const checkSession = useCallback(async (sessionCode: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("tally-bridge", {
        body: { action: "check-session", sessionCode },
      });

      if (error) throw error;
      return data?.connected || false;
    } catch (err) {
      console.error("Error checking session:", err);
      return false;
    }
  }, []);

  const sendTallyRequest = useCallback(async (sessionCode: string, xmlRequest: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("tally-bridge", {
        body: { action: "send-request", sessionCode, xmlRequest },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data?.data || null;
    } catch (err) {
      console.error("Error sending Tally request:", err);
      throw err;
    }
  }, []);

  const connectWithSession = useCallback(async (sessionCode: string) => {
    if (!sessionCode || sessionCode.length < 4) {
      toast({
        title: "Invalid Session Code",
        description: "Please enter a valid session code from the Tally Bridge app",
        variant: "destructive",
      });
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null, sessionCode }));

    try {
      // First check if bridge is connected
      const isConnected = await checkSession(sessionCode);
      
      if (!isConnected) {
        throw new Error("Bridge not found. Make sure Tally Bridge desktop app is running and showing this session code.");
      }

      // Try to get company info from Tally using simple built-in report
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>CurrentCompany</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="CurrentCompany">
            <TYPE>Company</TYPE>
            <NATIVEMETHOD>Name, StartingFrom, BooksFrom</NATIVEMETHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

      const response = await sendTallyRequest(sessionCode, xmlRequest);
      
      if (!response) {
        throw new Error("No response from Tally");
      }

      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response, "text/xml");
      
      // Look for company name in various possible XML structures
      const nameElement = xmlDoc.querySelector("NAME") || 
                          xmlDoc.querySelector("COMPANY NAME") ||
                          xmlDoc.querySelector("CURRENTCOMPANY NAME");
      const startingFromElement = xmlDoc.querySelector("STARTINGFROM");
      const booksFromElement = xmlDoc.querySelector("BOOKSFROM");
      
      let companyInfo: TallyCompanyInfo;
      
      if (nameElement) {
        const companyName = nameElement.textContent || "Tally Company";
        const booksFrom = booksFromElement?.textContent || startingFromElement?.textContent || "";
        const booksTo = ""; // Will be derived from current period
        
        const formatFinancialYear = (from: string) => {
          try {
            if (from) {
              // Tally date format is YYYYMMDD
              const fromYear = from.substring(0, 4);
              const nextYear = parseInt(fromYear) + 1;
              return `FY ${fromYear}-${String(nextYear).slice(-2)}`;
            }
          } catch {
            return "N/A";
          }
          return "N/A";
        };

        companyInfo = {
          companyName,
          financialYear: formatFinancialYear(booksFrom),
          booksFrom,
          booksTo,
        };
      } else {
        // Fallback - connection successful but couldn't parse company details
        companyInfo = {
          companyName: "Tally Connected",
          financialYear: "N/A",
          booksFrom: "",
          booksTo: "",
        };
      }

      setState({
        isConnected: true,
        isConnecting: false,
        companyInfo,
        error: null,
        sessionCode,
      });

      toast({
        title: "Tally Connected via Bridge",
        description: `Connected to ${companyInfo.companyName}`,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      
      setState({
        isConnected: false,
        isConnecting: false,
        companyInfo: null,
        error: errorMessage,
        sessionCode: "",
      });

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return false;
    }
  }, [toast, checkSession, sendTallyRequest]);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      isConnecting: false,
      companyInfo: null,
      error: null,
      sessionCode: "",
    });

    toast({
      title: "Disconnected",
      description: "Tally Bridge connection closed",
    });
  }, [toast]);

  const fetchTrialBalance = useCallback(async (fromDate: string, toDate: string): Promise<TallyTrialBalanceResponse | null> => {
    if (!state.isConnected || !state.sessionCode) {
      toast({
        title: "Not Connected",
        description: "Please connect to Tally Bridge first",
        variant: "destructive",
      });
      return null;
    }

    // Format dates to YYYYMMDD for Tally SVCURRENTDATE
    const formatDateForTally = (dateStr: string) => {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const toDateFormatted = formatDateForTally(toDate);

    // Use Ledger Collection similar to Python ODBC approach
    // Fetch: $Name, $_PrimaryGroup, $Parent, $IsRevenue, $OpeningBalance, $ClosingBalance, $DebitTotals, $CreditTotals
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>LedgerCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTDATE>${toDateFormatted}</SVCURRENTDATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="LedgerCollection">
            <TYPE>Ledger</TYPE>
            <NATIVEMETHOD>Name, Parent, OpeningBalance, ClosingBalance, IsRevenue</NATIVEMETHOD>
            <NATIVEMETHOD>DebitTotals, CreditTotals</NATIVEMETHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await sendTallyRequest(state.sessionCode, xmlRequest);
      
      if (!response) {
        throw new Error("No response from Tally");
      }

      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response, "text/xml");
      
      const lines: TallyTrialBalanceLine[] = [];
      
      // Find all LEDGER elements
      const ledgers = xmlDoc.querySelectorAll("LEDGER");
      
      ledgers.forEach((ledger) => {
        const accountName = ledger.querySelector("NAME")?.textContent?.trim() || 
                           ledger.getAttribute("NAME") || "";
        const parentGroup = ledger.querySelector("PARENT")?.textContent?.trim() || "";
        
        // Get primary group - may need to traverse or use $_PRIMARYGROUP
        const primaryGroup = ledger.querySelector("PRIMARYGROUP, _PRIMARYGROUP")?.textContent?.trim() || parentGroup;
        
        // IsRevenue: 1 or Yes = P&L, 0 or No = Balance Sheet
        const isRevenueText = ledger.querySelector("ISREVENUE")?.textContent?.trim() || "No";
        const isRevenue = isRevenueText === "Yes" || isRevenueText === "1";
        
        // Parse numeric values - Tally uses signed numbers (negative = credit)
        const parseNumeric = (text: string | null | undefined): number => {
          if (!text) return 0;
          const cleaned = text.replace(/,/g, "").trim();
          return parseFloat(cleaned) || 0;
        };

        const openingBalance = parseNumeric(ledger.querySelector("OPENINGBALANCE")?.textContent);
        const closingBalance = parseNumeric(ledger.querySelector("CLOSINGBALANCE")?.textContent);
        const debitTotals = Math.abs(parseNumeric(ledger.querySelector("DEBITTOTALS")?.textContent));
        const creditTotals = Math.abs(parseNumeric(ledger.querySelector("CREDITTOTALS")?.textContent));

        // Split signed balances into Dr/Cr columns (positive = Dr, negative = Cr)
        const openingDr = openingBalance > 0 ? openingBalance : 0;
        const openingCr = openingBalance < 0 ? Math.abs(openingBalance) : 0;
        const closingDr = closingBalance > 0 ? closingBalance : 0;
        const closingCr = closingBalance < 0 ? Math.abs(closingBalance) : 0;

        // Skip if all zeros
        if (openingDr === 0 && openingCr === 0 && closingDr === 0 && closingCr === 0 && 
            debitTotals === 0 && creditTotals === 0) {
          return;
        }

        if (accountName) {
          lines.push({
            accountName,
            parentGroup,
            primaryGroup,
            isRevenue,
            openingDr,
            openingCr,
            debitTotals,
            creditTotals,
            closingDr,
            closingCr,
          });
        }
      });

      return {
        success: true,
        lines,
        rawXml: response,
        periodFrom: fromDate,
        periodTo: toDate,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch Trial Balance";
      toast({
        title: "Error Fetching Trial Balance",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }, [state.isConnected, state.sessionCode, sendTallyRequest, toast]);

  return {
    ...state,
    connectWithSession,
    disconnect,
    sendTallyRequest,
    fetchTrialBalance,
  };
};
