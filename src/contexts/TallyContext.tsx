import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
// Edge functions not available in SQLite - Tally Bridge needs alternative implementation
// import { supabase } from "@/integrations/supabase/client";

// Helper function to sanitize XML response from Tally
// Tally sometimes returns illegal XML 1.0 characters (often as character references like "&#x4;")
// which makes DOMParser throw: xmlParseCharRef: invalid xmlChar value 4
const sanitizeXmlResponse = (xml: string): string => {
  let out = xml;

  // Remove invalid numeric character references for control chars (0-31) except 9, 10, 13
  out = out.replace(/&#0*(?:[0-8]|1[1-2]|1[4-9]|2\d|3[0-1]);/g, "");
  out = out.replace(/&#x0*(?:[0-8]|[bBcC]|[eEfF]|1[0-9a-fA-F]);/g, "");

  // Remove raw control characters (same set)
  out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Final guard: keep only XML 1.0 valid chars in BMP (good enough for Tally output)
  out = out.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g, "");

  if (out !== xml) {
    console.debug("Sanitized Tally XML response", {
      originalLength: xml.length,
      sanitizedLength: out.length,
    });
  }

  return out;
};

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

export interface TallyMonthWiseLine {
  accountName: string;
  primaryGroup: string;
  isRevenue: boolean;
  openingBalance: number;
  monthlyBalances: { [month: string]: number }; // month key like "Apr", "May", etc.
}

export interface TallyMonthWiseResponse {
  success: boolean;
  plLines: TallyMonthWiseLine[];
  bsLines: TallyMonthWiseLine[];
  months: string[];
  fyStartYear: number;
  targetMonth: string;
}

export interface TallyGSTNotFeedLine {
  ledgerName: string;
  gstRegistrationType: string;
  partyGSTIN: string;
}

export interface TallyGSTNotFeedResponse {
  success: boolean;
  lines: TallyGSTNotFeedLine[];
}

interface TallyContextState {
  isConnected: boolean;
  isConnecting: boolean;
  companyInfo: TallyCompanyInfo | null;
  error: string | null;
  sessionCode: string;
}

interface TallyContextValue extends TallyContextState {
  connectWithSession: (sessionCode: string) => Promise<boolean>;
  disconnect: () => void;
  sendTallyRequest: (sessionCode: string, xmlRequest: string) => Promise<string | null>;
  fetchTrialBalance: (fromDate: string, toDate: string) => Promise<TallyTrialBalanceResponse | null>;
  fetchMonthWiseData: (fyStartYear: number, targetMonth: string) => Promise<TallyMonthWiseResponse | null>;
  fetchGSTNotFeeded: () => Promise<TallyGSTNotFeedResponse | null>;
}

const STORAGE_KEY = 'auditpro_tally_connection';

const TallyContext = createContext<TallyContextValue | undefined>(undefined);

export function TallyProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [state, setState] = useState<TallyContextState>({
    isConnected: false,
    isConnecting: false,
    companyInfo: null,
    error: null,
    sessionCode: "",
  });

  // Restore connection on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sessionCode) {
          // Verify session is still active
          checkAndRestoreSession(parsed.sessionCode, parsed.companyInfo);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Periodic session check to detect disconnection
  useEffect(() => {
    if (!state.isConnected || !state.sessionCode) return;
    
    const interval = setInterval(async () => {
      const isActive = await checkSession(state.sessionCode);
      if (!isActive) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: "Session expired. Desktop app may have disconnected.",
        }));
        localStorage.removeItem(STORAGE_KEY);
        toast({
          title: "Tally Disconnected",
          description: "The desktop bridge app connection was lost",
          variant: "destructive",
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [state.isConnected, state.sessionCode]);

  const checkSession = useCallback(async (sessionCode: string): Promise<boolean> => {
    // Edge functions not available in SQLite
    toast({
      title: "Not Available",
      description: "Tally Bridge requires edge functions. Please use Supabase or implement alternative service.",
      variant: "destructive",
    });
    return false;
    // try {
    //   const { data, error } = await supabase.functions.invoke("tally-bridge", {
    //     body: { action: "check-session", sessionCode },
    //   });
    //   if (error) throw error;
    //   return data?.connected || false;
    // } catch (err) {
    //   console.error("Error checking session:", err);
    //   return false;
    // }
  }, [toast]);

  const checkAndRestoreSession = async (sessionCode: string, savedCompanyInfo: TallyCompanyInfo | null) => {
    const isActive = await checkSession(sessionCode);
    if (isActive && savedCompanyInfo) {
      setState({
        isConnected: true,
        isConnecting: false,
        companyInfo: savedCompanyInfo,
        error: null,
        sessionCode,
      });
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const sendTallyRequest = useCallback(async (sessionCode: string, xmlRequest: string): Promise<string | null> => {
    // Edge functions not available in SQLite
    toast({
      title: "Not Available",
      description: "Tally Bridge requires edge functions. Please use Supabase or implement alternative service.",
      variant: "destructive",
    });
    throw new Error("Tally Bridge requires edge functions. Not available in SQLite.");
    // try {
    //   // 1) Create request (fast, should never time out)
    //   const { data: createData, error: createError } = await supabase.functions.invoke("tally-bridge", {
    //     body: { action: "send-request", sessionCode, xmlRequest },
    //   });
    //   if (createError) throw createError;
    //   if (createData?.error) throw new Error(createData.error);
    //   // Backward compatibility: old API returned { data: "...xml..." }
    //   if (typeof createData?.data === "string") {
    //     return createData.data;
    //   }
    //   const requestId = createData?.requestId as string | undefined;
    //   if (!requestId) {
    //     throw new Error("Failed to create request (missing requestId)");
    //   }
    //   // 2) Poll status from client (so edge function doesn't hit runtime timeout)
    //   const timeoutMs = 600000; // 10 minutes
    //   const pollEveryMs = 1000;
    //   const start = Date.now();
    //   while (Date.now() - start < timeoutMs) {
    //     const { data: statusData, error: statusError } = await supabase.functions.invoke("tally-bridge", {
    //       body: { action: "get-request-status", requestId },
    //     });
    //     if (statusError) throw statusError;

    //     if (statusData?.status === "completed") {
    //       return (statusData?.data as string) || null;
    //     }
    //     if (statusData?.status === "failed") {
    //       throw new Error(statusData?.error || "Tally request failed");
    //     }
    //     await new Promise((resolve) => setTimeout(resolve, pollEveryMs));
    //   }
    //   throw new Error("Request timeout - Tally is taking too long to respond");
    // } catch (err) {
    //   console.error("Error sending Tally request:", err);
    //   throw err;
    // }
  }, [toast]);

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
      const isConnected = await checkSession(sessionCode);
      
      if (!isConnected) {
        throw new Error("Bridge not found. Make sure Tally Bridge desktop app is running and showing this session code.");
      }

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

      const parser = new DOMParser();
      const sanitizedResponse = sanitizeXmlResponse(response);
      const xmlDoc = parser.parseFromString(sanitizedResponse, "text/xml");
      
      const nameElement = xmlDoc.querySelector("NAME") ||
                          xmlDoc.querySelector("COMPANY NAME") ||
                          xmlDoc.querySelector("CURRENTCOMPANY NAME");
      const startingFromElement = xmlDoc.querySelector("STARTINGFROM");
      const booksFromElement = xmlDoc.querySelector("BOOKSFROM");
      
      let companyInfo: TallyCompanyInfo;
      
      if (nameElement) {
        const companyName = nameElement.textContent || "Tally Company";
        const booksFrom = booksFromElement?.textContent || startingFromElement?.textContent || "";
        const booksTo = "";
        
        const formatFinancialYear = (from: string) => {
          try {
            if (from) {
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
        companyInfo = {
          companyName: "Tally Connected",
          financialYear: "N/A",
          booksFrom: "",
          booksTo: "",
        };
      }

      const newState = {
        isConnected: true,
        isConnecting: false,
        companyInfo,
        error: null,
        sessionCode,
      };
      
      setState(newState);
      
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionCode,
        companyInfo,
      }));

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
    
    localStorage.removeItem(STORAGE_KEY);

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

      const parser = new DOMParser();
      const sanitizedResponse = sanitizeXmlResponse(response);
      const xmlDoc = parser.parseFromString(sanitizedResponse, "text/xml");
      
      const lines: TallyTrialBalanceLine[] = [];
      
      // Find all LEDGER elements
      const ledgers = xmlDoc.querySelectorAll("LEDGER");
      
      ledgers.forEach((ledger) => {
        const accountName = ledger.querySelector("NAME")?.textContent?.trim() || 
                           ledger.getAttribute("NAME") || "";
        const parentGroup = ledger.querySelector("PARENT")?.textContent?.trim() || "";
        const primaryGroup = ledger.querySelector("PRIMARYGROUP, _PRIMARYGROUP")?.textContent?.trim() || parentGroup;
        
        // IsRevenue: Yes = P&L, No = Balance Sheet
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

        // Split signed balances into Dr/Cr columns (in Tally: positive = Cr, negative = Dr)
        const openingDr = openingBalance < 0 ? Math.abs(openingBalance) : 0;
        const openingCr = openingBalance > 0 ? openingBalance : 0;
        const closingDr = closingBalance < 0 ? Math.abs(closingBalance) : 0;
        const closingCr = closingBalance > 0 ? closingBalance : 0;

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

  const fetchMonthWiseData = useCallback(async (fyStartYear: number, targetMonth: string): Promise<TallyMonthWiseResponse | null> => {
    if (!state.isConnected || !state.sessionCode) {
      toast({
        title: "Not Connected",
        description: "Please connect to Tally Bridge first",
        variant: "destructive",
      });
      return null;
    }

    const monthOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const targetIndex = monthOrder.indexOf(targetMonth);
    
    if (targetIndex === -1) {
      toast({
        title: "Invalid Month",
        description: "Please select a valid month",
        variant: "destructive",
      });
      return null;
    }

    // Build months list up to target with their end dates (DD-Mon-YYYY format for Tally $$ToValue)
    const selectedMonths: string[] = [];
    const monthDates: { month: string; tallyDate: string }[] = [];

    for (let i = 0; i <= targetIndex; i++) {
      const mName = monthOrder[i];
      selectedMonths.push(mName);
      
      // Year logic: Apr-Dec use fyStartYear, Jan-Mar use fyStartYear + 1
      const year = ["Jan", "Feb", "Mar"].includes(mName) ? fyStartYear + 1 : fyStartYear;
      
      // Day logic for month end
      let day: string;
      if (["Apr", "Jun", "Sep", "Nov"].includes(mName)) {
        day = "30";
      } else if (mName === "Feb") {
        day = year % 4 === 0 ? "29" : "28";
      } else {
        day = "31";
      }
      
      // Format as DD-Mon-YYYY for Tally $$ToValue syntax
      const tallyDate = `${day}-${mName}-${year}`;
      monthDates.push({ month: mName, tallyDate });
    }

    // Build TDL formula methods for each month's closing balance using $$ToValue
    // This matches the Python approach: ($$ToValue:"DD-Mon-YYYY":$ClosingBalance)
    const monthFormulas = monthDates.map(({ month, tallyDate }) => 
      `<FORMULA NAME="${month}Bal">$$ToValue:"${tallyDate}":$ClosingBalance</FORMULA>`
    ).join('\n            ');

    const fetchMethods = monthDates.map(({ month }) => 
      `<FETCH>${month}Bal</FETCH>`
    ).join('\n            ');

    // Single query approach using TDL formulas - similar to Python ODBC query
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>MonthWiseLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="MonthWiseLedgers">
            <TYPE>Ledger</TYPE>
            <NATIVEMETHOD>Name</NATIVEMETHOD>
            <NATIVEMETHOD>Parent</NATIVEMETHOD>
            <NATIVEMETHOD>OpeningBalance</NATIVEMETHOD>
            <NATIVEMETHOD>IsRevenue</NATIVEMETHOD>
            ${monthFormulas}
            ${fetchMethods}
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    // P&L group keywords for classification
    const plGroupKeywords = [
      'Sales Accounts', 'Purchase Accounts',
      'Direct Expenses', 'Indirect Expenses',
      'Direct Incomes', 'Indirect Incomes',
      'Expense', 'Income', 'Interest'
    ];

    const parseNumeric = (text: string | null | undefined): number => {
      if (!text) return 0;

      // Tally can return amounts like:
      // - "-322957.00"
      // - "322,957.00"
      // - "(322957.00)"
      // - "322957.00 Dr" / "322957.00 Cr"
      let cleaned = text.replace(/,/g, "").trim();
      let sign = 1;

      // Dr/Cr suffix
      if (/\bcr\b/i.test(cleaned)) sign *= -1;
      cleaned = cleaned.replace(/\b(dr|cr)\b/gi, "").trim();

      // Parentheses indicate negative
      if (/^\(.*\)$/.test(cleaned)) {
        sign *= -1;
        cleaned = cleaned.slice(1, -1).trim();
      }

      const n = parseFloat(cleaned);
      if (Number.isNaN(n)) return 0;
      return n * sign;
    };

    try {
      console.log("Fetching month-wise data with XML:", xmlRequest);
      
      const response = await sendTallyRequest(state.sessionCode, xmlRequest);
      
      if (!response) {
        throw new Error("No response from Tally");
      }

      console.log("Tally month-wise response length:", response.length);
      console.log("Tally response preview:", response.substring(0, 1000));

      const parser = new DOMParser();
      const sanitizedResponse = sanitizeXmlResponse(response);
      const xmlDoc = parser.parseFromString(sanitizedResponse, "text/xml");
      
      // Check for parse errors
      const parseError = xmlDoc.querySelector("parsererror");
      if (parseError) {
        console.error("XML Parse error:", parseError.textContent);
        throw new Error("Failed to parse Tally response");
      }

      const ledgers = xmlDoc.querySelectorAll("LEDGER, MONTHWISELEDGERS");
      console.log("Found ledger elements:", ledgers.length);

      const lines: TallyMonthWiseLine[] = [];

      // If the formula-based fields are not present in the XML at all, the result will look like
      // "everything is blank" (all months = 0). In that case, we must use the per-month SVCURRENTDATE fallback.
      let anyMonthValueTagFound = false;
      let anyNonZeroMonthValue = false;

      ledgers.forEach((ledger, idx) => {
        const accountName = ledger.querySelector("NAME")?.textContent?.trim() || ledger.getAttribute("NAME") || "";

        if (!accountName) return;

        const primaryGroup = ledger.querySelector("PARENT")?.textContent?.trim() || "";
        const isRevenueText = ledger.querySelector("ISREVENUE")?.textContent?.trim() || "No";
        const isRevenueFlag =
          isRevenueText.toLowerCase() === "yes" || isRevenueText === "1" || isRevenueText.toLowerCase() === "true";
        const groupCheck = plGroupKeywords.some((kw) => primaryGroup.toLowerCase().includes(kw.toLowerCase()));
        const isRevenue = isRevenueFlag || groupCheck;

        const openingBalance = parseNumeric(ledger.querySelector("OPENINGBALANCE")?.textContent);

        // Get monthly balances from computed formula fields
        const monthlyBalances: { [month: string]: number } = {};
        let hasNonZero = openingBalance !== 0;

        for (const { month } of monthDates) {
          // Formula NAME is like "AprBal"; Tally may materialize it as "APRBAL" or "AprBal".
          const monthTagUpper = `${month.toUpperCase()}BAL`;
          const monthTagMixed = `${month}Bal`;

          const balanceEl =
            ledger.querySelector(monthTagUpper) ||
            ledger.querySelector(monthTagMixed) ||
            ledger.querySelector(`${month}BAL`) ||
            ledger.querySelector(`${month.toUpperCase()}BALANCE`);

          if (balanceEl) anyMonthValueTagFound = true;

          const balance = parseNumeric(balanceEl?.textContent);
          monthlyBalances[month] = balance;

          if (balance !== 0) {
            hasNonZero = true;
            anyNonZeroMonthValue = true;
          }
        }

        if (hasNonZero) {
          lines.push({
            accountName,
            primaryGroup,
            isRevenue,
            openingBalance,
            monthlyBalances,
          });

          // Log first few entries for debugging
          if (idx < 3) {
            console.log(`Ledger ${idx}:`, { accountName, primaryGroup, isRevenue, openingBalance, monthlyBalances });
          }
        }
      });

      // If the formula fields are missing (or all evaluated to 0), switch to fallback approach.
      // Some Tally setups return the *same* closing balance for every $$ToValue field; detect that and fallback.
      const looksConstantAcrossMonths = (() => {
        if (selectedMonths.length < 2) return false;

        const sample = lines
          .slice(0, 25)
          .map((l) => selectedMonths.map((m) => l.monthlyBalances[m] ?? 0))
          .filter((vals) => vals.some((v) => v !== 0));

        if (sample.length < 5) return false;

        const constantCount = sample.filter((vals) => vals.every((v) => v === vals[0])).length;
        return constantCount / sample.length >= 0.8;
      })();

      if (
        lines.length === 0 ||
        !anyMonthValueTagFound ||
        (!anyNonZeroMonthValue && lines.length > 0) ||
        looksConstantAcrossMonths
      ) {
        console.log(
          "Month-wise formula export missing/invalid (or constant). Using fallback per-month requests...",
          { lines: lines.length, anyMonthValueTagFound, anyNonZeroMonthValue, looksConstantAcrossMonths }
        );
        return await fetchMonthWiseDataFallback(
          fyStartYear,
          targetMonth,
          selectedMonths,
          monthDates,
          plGroupKeywords,
          parseNumeric
        );
      }

      toast({
        title: "Month wise Data Fetched",
        description: `Retrieved ${lines.length} ledgers for ${selectedMonths.length} months`,
      });

      return {
        success: true,
        lines,
        months: selectedMonths,
        fyStartYear,
        targetMonth,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch Month wise data";
      console.error("Month-wise fetch error:", error);
      toast({
        title: "Error Fetching Month wise Data",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }, [state.isConnected, state.sessionCode, sendTallyRequest, toast]);

  // Fallback approach: fetch each month separately using SVCURRENTDATE
  const fetchMonthWiseDataFallback = async (
    fyStartYear: number,
    targetMonth: string,
    selectedMonths: string[],
    monthDates: { month: string; tallyDate: string }[],
    plGroupKeywords: string[],
    parseNumeric: (text: string | null | undefined) => number
  ): Promise<TallyMonthWiseResponse | null> => {
    const ledgerMap = new Map<string, TallyMonthWiseLine>();
    for (const { month, tallyDate } of monthDates) {
      // Convert DD-Mon-YYYY to YYYYMMDD for SVTODATE/SVCURRENTDATE
      const [day, mon, year] = tallyDate.split('-');
      const monthNum = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(mon) + 1;
      const svDate = `${year}${String(monthNum).padStart(2, '0')}${day}`;

      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>LedgerBalances</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTDATE>${svDate}</SVCURRENTDATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="LedgerBalances">
            <TYPE>Ledger</TYPE>
            <NATIVEMETHOD>Name</NATIVEMETHOD>
            <NATIVEMETHOD>Parent</NATIVEMETHOD>
            <NATIVEMETHOD>IsRevenue</NATIVEMETHOD>
            <NATIVEMETHOD>OpeningBalance</NATIVEMETHOD>
            <NATIVEMETHOD>ClosingBalance</NATIVEMETHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

      console.log(`Fetching data for ${month} (${svDate})...`);
      
      const response = await sendTallyRequest(state.sessionCode, xmlRequest);
      
      if (!response) {
        console.warn(`No response for month ${month}`);
        continue;
      }

      const parser = new DOMParser();
      const sanitizedResponse = sanitizeXmlResponse(response);
      const xmlDoc = parser.parseFromString(sanitizedResponse, "text/xml");
      const ledgers = xmlDoc.querySelectorAll("LEDGER, LEDGERBALANCES");
      
      console.log(`Month ${month}: Found ${ledgers.length} ledgers`);

      ledgers.forEach((ledger) => {
        const accountName = ledger.querySelector("NAME")?.textContent?.trim() || 
                           ledger.getAttribute("NAME") || "";
        
        if (!accountName) return;

        const primaryGroup = ledger.querySelector("PARENT")?.textContent?.trim() || "";
        const isRevenueText = ledger.querySelector("ISREVENUE")?.textContent?.trim() || "No";
        const isRevenueFlag = isRevenueText.toLowerCase() === "yes" || isRevenueText === "1" || isRevenueText.toLowerCase() === "true";
        const groupCheck = plGroupKeywords.some(kw => 
          primaryGroup.toLowerCase().includes(kw.toLowerCase())
        );
        const isRevenue = isRevenueFlag || groupCheck;
        
        const openingBalance = parseNumeric(ledger.querySelector("OPENINGBALANCE")?.textContent);
        const closingBalance = parseNumeric(ledger.querySelector("CLOSINGBALANCE")?.textContent);

        let entry = ledgerMap.get(accountName);
        if (!entry) {
          entry = {
            accountName,
            primaryGroup,
            isRevenue,
            openingBalance,
            monthlyBalances: {},
          };
          ledgerMap.set(accountName, entry);
        }

        entry.monthlyBalances[month] = closingBalance;
      });
    }

    const lines = Array.from(ledgerMap.values()).filter(line => {
      const hasNonZero = line.openingBalance !== 0 || 
        Object.values(line.monthlyBalances).some(v => v !== 0);
      return hasNonZero;
    });

    console.log(`Fallback approach: Retrieved ${lines.length} ledgers`);

    toast({
      title: "Month wise Data Fetched",
      description: `Retrieved ${lines.length} ledgers for ${selectedMonths.length} months`,
    });

    return {
      success: true,
      lines,
      months: selectedMonths,
      fyStartYear,
      targetMonth,
    };
  };

  // Fetch ledgers where GST Registration Type is Regular but PartyGSTIN is blank
  const fetchGSTNotFeeded = useCallback(async (): Promise<TallyGSTNotFeedResponse | null> => {
    if (!state.isConnected || !state.sessionCode) {
      toast({
        title: "Not Connected",
        description: "Connect to Tally Bridge first",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Request ledger name, GSTRegistrationType and PartyGSTIN
      const xmlRequest = `<ENVELOPE>
<HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>LedgerGSTInfo</ID>
</HEADER>
<BODY>
  <DESC>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
    <TDL>
      <TDLMESSAGE>
        <COLLECTION NAME="LedgerGSTInfo" ISMODIFY="No">
          <TYPE>Ledger</TYPE>
          <FETCH>NAME, GSTREGISTRATIONTYPE, PARTYGSTIN</FETCH>
        </COLLECTION>
      </TDLMESSAGE>
    </TDL>
  </DESC>
</BODY>
</ENVELOPE>`;

      console.log("Fetching GST not feeded ledgers...");
      const response = await sendTallyRequest(state.sessionCode, xmlRequest);
      
      if (!response) {
        toast({
          title: "No Response",
          description: "Tally did not return any data",
          variant: "destructive",
        });
        return null;
      }

      // Parse XML response
      const sanitizedXml = sanitizeXmlResponse(response);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(sanitizedXml, "text/xml");

      const parseError = xmlDoc.querySelector("parsererror");
      if (parseError) {
        console.error("XML parse error:", parseError.textContent);
        toast({
          title: "Parse Error",
          description: "Failed to parse Tally response",
          variant: "destructive",
        });
        return null;
      }

      // Extract ledgers
      const ledgerNodes = xmlDoc.querySelectorAll("LEDGER");
      const allLedgers: TallyGSTNotFeedLine[] = [];

      ledgerNodes.forEach((node) => {
        const ledgerName = node.querySelector("NAME")?.textContent?.trim() || 
                           node.getAttribute("NAME") || "";
        const gstRegType = node.querySelector("GSTREGISTRATIONTYPE")?.textContent?.trim() || "";
        const partyGSTIN = node.querySelector("PARTYGSTIN")?.textContent?.trim() || "";

        allLedgers.push({
          ledgerName,
          gstRegistrationType: gstRegType,
          partyGSTIN,
        });
      });

      // Filter: GST Registration Type is "Regular" but PartyGSTIN is blank/empty
      // Exclude Unregistered, Consumer, Composition, Unknown, etc.
      const filteredLines = allLedgers.filter(line => {
        const regType = (line.gstRegistrationType || '').toLowerCase().trim();
        
        // Only include "Regular" registration type - strict check
        // Exclude "Unregistered", "Consumer", "Composition", "Unknown", empty, etc.
        const isRegular = regType === 'regular' || 
                          (regType.startsWith('regular') && !regType.includes('unregistered'));
        
        if (!isRegular) return false;
        
        // Check if GSTIN is actually missing
        const gstin = (line.partyGSTIN || '').trim().toUpperCase();
        if (!gstin) return true; // Empty = missing
        
        // Reject obvious placeholders
        const gstinLower = gstin.toLowerCase();
        if (gstinLower === 'null' || gstinLower === 'na' || gstinLower === 'n/a' || 
            gstinLower === 'nil' || gstin === '0' || gstin === '-' || gstin === '--' ||
            gstinLower === 'not available' || gstinLower === 'not applicable') {
          return true; // Placeholder = missing
        }
        
        // If it's a 15-char alphanumeric string, consider GSTIN as entered
        const cleanGstin = gstin.replace(/\s/g, '');
        if (cleanGstin.length === 15 && /^[A-Z0-9]{15}$/.test(cleanGstin)) {
          return false; // Valid GSTIN = not missing
        }
        
        // Also accept if it looks like meaningful content (10+ alphanumeric chars)
        if (cleanGstin.length >= 10 && /^[A-Z0-9]+$/.test(cleanGstin)) {
          return false; // Meaningful content = not missing
        }
        
        // Otherwise consider it missing
        return true;
      });

      console.log(`Found ${filteredLines.length} ledgers with Regular GST but no GSTIN out of ${allLedgers.length} total`);

      toast({
        title: "GST Not Feeded",
        description: `Found ${filteredLines.length} ledgers with Regular GST but no GSTIN`,
      });

      return {
        success: true,
        lines: filteredLines,
      };
    } catch (error) {
      console.error("Error fetching GST not feeded:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch GST data",
        variant: "destructive",
      });
      return null;
    }
  }, [state.isConnected, state.sessionCode, sendTallyRequest, toast]);

  return (
    <TallyContext.Provider value={{
      ...state,
      connectWithSession,
      disconnect,
      sendTallyRequest,
      fetchTrialBalance,
      fetchMonthWiseData,
      fetchGSTNotFeeded,
    }}>
      {children}
    </TallyContext.Provider>
  );
}

export function useTally() {
  const context = useContext(TallyContext);
  if (context === undefined) {
    throw new Error('useTally must be used within a TallyProvider');
  }
  return context;
}
