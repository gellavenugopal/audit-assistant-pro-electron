import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface TallyCompanyInfo {
  companyName: string;
  financialYear: string;
  booksFrom: string;
  booksTo: string;
}

interface TallyConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  companyInfo: TallyCompanyInfo | null;
  error: string | null;
}

export const useTallyConnection = () => {
  const { toast } = useToast();
  const [state, setState] = useState<TallyConnectionState>({
    isConnected: false,
    isConnecting: false,
    companyInfo: null,
    error: null,
  });

  const connectToTally = useCallback(async (port: string) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Tally typically runs on localhost with HTTP API
      const tallyUrl = `http://localhost:${port}`;
      
      // Create XML request to get company info from Tally
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <REPORT NAME="List of Companies">
            <FORMS>List of Companies</FORMS>
          </REPORT>
          <FORM NAME="List of Companies">
            <PARTS>List of Companies</PARTS>
          </FORM>
          <PART NAME="List of Companies">
            <LINES>List of Companies</LINES>
            <REPEAT>List of Companies : Collection of Companies</REPEAT>
            <SCROLLED>Vertical</SCROLLED>
          </PART>
          <LINE NAME="List of Companies">
            <FIELDS>FldCompanyName, FldBooksFrom, FldBooksTo</FIELDS>
          </LINE>
          <FIELD NAME="FldCompanyName">
            <SET>$Name</SET>
          </FIELD>
          <FIELD NAME="FldBooksFrom">
            <SET>$BooksFrom</SET>
          </FIELD>
          <FIELD NAME="FldBooksTo">
            <SET>$BooksTo</SET>
          </FIELD>
          <COLLECTION NAME="Collection of Companies">
            <TYPE>Company</TYPE>
            <FETCH>Name, BooksFrom, BooksTo</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

      const response = await fetch(tallyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xmlRequest,
      });

      if (!response.ok) {
        throw new Error("Failed to connect to Tally");
      }

      const xmlText = await response.text();
      
      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Try to extract company information
      const companyNames = xmlDoc.querySelectorAll("FLDCOMPANYNAME");
      const booksFromDates = xmlDoc.querySelectorAll("FLDBLOOKSFROM");
      const booksToDates = xmlDoc.querySelectorAll("FLDBOOKSTO");
      
      if (companyNames.length > 0) {
        const companyName = companyNames[0].textContent || "Unknown Company";
        const booksFrom = booksFromDates[0]?.textContent || "";
        const booksTo = booksToDates[0]?.textContent || "";
        
        // Format financial year from dates
        const formatFinancialYear = (from: string, to: string) => {
          try {
            // Tally dates are typically in YYYYMMDD format
            if (from && to) {
              const fromYear = from.substring(0, 4);
              const toYear = to.substring(0, 4);
              return `FY ${fromYear}-${toYear.slice(-2)}`;
            }
          } catch {
            return "N/A";
          }
          return "N/A";
        };

        const companyInfo: TallyCompanyInfo = {
          companyName,
          financialYear: formatFinancialYear(booksFrom, booksTo),
          booksFrom,
          booksTo,
        };

        setState({
          isConnected: true,
          isConnecting: false,
          companyInfo,
          error: null,
        });

        toast({
          title: "Tally Connected",
          description: `Connected to ${companyName}`,
        });

        return true;
      } else {
        // If no company info found but connection succeeded, show as connected
        setState({
          isConnected: true,
          isConnecting: false,
          companyInfo: {
            companyName: "Tally Company",
            financialYear: "N/A",
            booksFrom: "",
            booksTo: "",
          },
          error: null,
        });

        toast({
          title: "Tally Connected",
          description: "Connected to Tally (unable to fetch company details)",
        });

        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      
      // Check if it's a CORS/network error which is common when browser blocks localhost requests
      const isCorsError = errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("Failed to fetch");
      
      const displayError = isCorsError
        ? "Browser security blocks direct Tally connection. Please use the Tally Bridge desktop app or import data via Excel/CSV export from Tally."
        : errorMessage;

      setState({
        isConnected: false,
        isConnecting: false,
        companyInfo: null,
        error: displayError,
      });

      toast({
        title: "Connection Failed",
        description: isCorsError 
          ? "Browser blocks localhost requests. Use Excel import instead."
          : displayError,
        variant: "destructive",
      });

      return false;
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      isConnecting: false,
      companyInfo: null,
      error: null,
    });

    toast({
      title: "Disconnected",
      description: "Tally connection closed",
    });
  }, [toast]);

  return {
    ...state,
    connectToTally,
    disconnect,
  };
};
