const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

function safeLog(...args) {
  try {
    console.log(...args);
  } catch (error) {
    if (!error || error.code !== 'EPIPE') {
      // Ignore logging failures to keep the main process stable.
    }
  }
}

// ODBC is optional - only load if available
let odbc = null;
try {
  odbc = require('odbc');
} catch (error) {
  console.warn('ODBC module not available - Tally integration will be disabled');
}

const isDev = process.env.NODE_ENV === 'development' || (app && !app.isPackaged);

// ODBC connection handling
let odbcConnection = null;

function setAppMenu() {
  const template = [
    {
      label: '&File',
      submenu: [
        { role: 'close', label: 'Close Window' },
        { type: 'separator' },
        { role: 'quit', label: 'Exit', accelerator: 'Alt+F+X' },
      ],
    },
    { label: '&Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '&View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: '&Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }] },
    { label: '&Help', submenu: [{ role: 'about' }] },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpcHandlers() {
  const { ipcMain } = require('electron');

  // Check if ODBC connection is already active (without creating new connection)
  ipcMain.handle('odbc-check-connection', async () => {
    try {
      if (!odbcConnection) {
        return { success: false, isConnected: false };
      }

      // Test if connection is still valid
      try {
        await odbcConnection.query('SELECT TOP 1 $Name FROM Ledger');
        return { success: true, isConnected: true };
      } catch (err) {
        // Connection is dead, clear it
        odbcConnection = null;
        return { success: false, isConnected: false, error: 'Connection lost' };
      }
    } catch (error) {
      return { success: false, isConnected: false, error: error.message };
    }
  });

  ipcMain.handle('odbc-test-connection', async (event, portOverride) => {
    try {
      if (!odbc) {
        return { success: false, error: 'ODBC module not available. Install the Tally ODBC driver and restart the app.' };
      }
      // If already connected, verify it's still active
      if (odbcConnection) {
        try {
          const testResult = await odbcConnection.query('SELECT TOP 1 $Name FROM Ledger');
          if (testResult.length > 0) {
            return { success: true, driver: 'Existing Connection', sampleData: testResult[0] };
          }
        } catch (err) {
          // Connection is dead, clear it and create new one
          odbcConnection = null;
        }
      }

      // Common Tally ODBC drivers
      const drivers = ['Tally ODBC Driver64', 'Tally ODBC Driver', 'Tally ODBC 64-bit Driver'];
      const port = typeof portOverride === 'string' && portOverride.trim() ? portOverride.trim() : '9000';

      for (const driver of drivers) {
        try {
          const connStr = `DRIVER={${driver}};SERVER=localhost;PORT=${port}`;
          odbcConnection = await odbc.connect(connStr);

          // Test query
          const result = await odbcConnection.query('SELECT TOP 1 $Name FROM Ledger');

          if (result.length > 0) {
            return { success: true, driver, sampleData: result[0] };
          }
        } catch (err) {
          safeLog(`Failed with driver ${driver}:`, err.message);
          continue;
        }
      }

      return { success: false, error: 'No compatible ODBC driver found or Tally not running' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('odbc-disconnect', async () => {
    try {
      if (odbcConnection) {
        try {
          await odbcConnection.close();
        } catch (err) {
          safeLog('ODBC disconnect error:', err.message);
        }
      }
      odbcConnection = null;
      return { success: true };
    } catch (error) {
      odbcConnection = null;
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('odbc-fetch-trial-balance', async (event, fromDate, toDate) => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }
      
      // Note: Tally ODBC doesn't directly support date filtering in SELECT queries
      // The balances returned are as of the current Tally date setting
      // To get period-specific balances, Tally's date should be set before querying
      // For now, we fetch all ledgers - the balances reflect Tally's current date context
      
      // Convert dates to Tally format (DD-MMM-YYYY) for potential future use
      const formatDateForTally = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };
      
      const toDateFormatted = formatDateForTally(toDate);
      safeLog(`Trial Balance: Fetching for period ${fromDate} to ${toDate} (Tally date: ${toDateFormatted})`);
      safeLog('Note: Ensure Tally is set to the correct date before fetching. ODBC returns balances as of Tally\'s current date.');
      
      // First, get company name
      let companyName = '';
      try {
        const companyQuery = `SELECT $Name FROM Company`;
        const companyResult = await odbcConnection.query(companyQuery);
        if (companyResult && companyResult.length > 0) {
          companyName = companyResult[0]['$Name'] || '';
          safeLog(`Trial Balance: Company Name - ${companyName}`);
        }
      } catch (err) {
        console.warn('Could not fetch company name:', err.message);
      }

      const query = `
        SELECT $Name, $_PrimaryGroup, $Parent, $IsRevenue, 
               $OpeningBalance, $ClosingBalance, $DebitTotals, $CreditTotals,
               $Code, $Branch
        FROM Ledger
        ORDER BY $_PrimaryGroup, $Name
      `;

      const result = await odbcConnection.query(query);

      // Also fetch stock items to include opening stock
      let stockItems = [];
      let totalOpeningStock = 0;
      let totalClosingStock = 0;
      try {
        const stockQuery = `
          SELECT $Name, $OpeningValue, $ClosingValue
          FROM StockItem
        `;
        const stockResult = await odbcConnection.query(stockQuery);
        if (stockResult && stockResult.length > 0) {
          stockItems = stockResult;
          // In Tally ODBC, stock values are typically negative (representing asset/debit)
          // We take absolute value of the SUM (not individual items) to get total stock value
          const sumOpeningStock = stockResult.reduce((sum, row) => {
            const val = parseFloat(row['$OpeningValue']) || 0;
            return sum + val;
          }, 0);
          const sumClosingStock = stockResult.reduce((sum, row) => {
            const val = parseFloat(row['$ClosingValue']) || 0;
            return sum + val;
          }, 0);
          // Take absolute value of the final sum
          totalOpeningStock = Math.abs(sumOpeningStock);
          totalClosingStock = Math.abs(sumClosingStock);
          safeLog(`Trial Balance: Found ${stockResult.length} stock items. Opening Stock: ${totalOpeningStock}, Closing Stock: ${totalClosingStock}`);
        }
      } catch (stockErr) {
        console.warn('Could not fetch stock items (may not be available):', stockErr.message);
      }

      // Process the data to match the Excel template format
      // Parse numeric values properly - Tally may return strings
      const parseNumeric = (val) => {
        if (val === null || val === undefined || val === '') return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      };

      const processedData = result.map(row => {
        const accountHead = row['$Name'] || '';
        const openingBalance = parseNumeric(row['$OpeningBalance']);
        let closingBalance = parseNumeric(row['$ClosingBalance']);
        
        // For Profit & Loss A/c, use opening balance as closing balance
        // because Tally's TB shows P&L without current year's profit/loss
        if (accountHead.toLowerCase() === 'profit & loss a/c' || 
            accountHead.toLowerCase() === 'profit and loss a/c') {
          closingBalance = openingBalance;
        }
        
        return {
          accountHead,
          openingBalance,
          totalDebit: parseNumeric(row['$DebitTotals']),
          totalCredit: parseNumeric(row['$CreditTotals']),
          closingBalance,
          accountCode: row['$Code'] || '',
          branch: row['$Branch'] || 'HO',
          // Add hierarchy data
          primaryGroup: row['$_PrimaryGroup'] || '',
          parent: row['$Parent'] || '',
          isRevenue: row['$IsRevenue'] === 'Yes' || row['$IsRevenue'] === true || row['$IsRevenue'] === 1,
        };
      });

      // Add opening stock as a separate line item if stock items exist
      // Check if there's already an "Opening Stock" ledger
      const hasOpeningStockLedger = processedData.some(line => 
        line.accountHead?.toLowerCase() === 'opening stock' ||
        line.accountHead?.toLowerCase().includes('opening stock') ||
        line.primaryGroup?.toLowerCase().includes('stock-in-hand')
      );

      if (totalOpeningStock !== 0 && !hasOpeningStockLedger) {
        // Add opening stock as a ledger entry
        // Note: Opening Stock is a static account - opening and closing should be SAME
        // because it represents the stock value at the START of the period only
        processedData.push({
          accountHead: 'Opening Stock (from Stock Items)',
          openingBalance: -totalOpeningStock, // Negative because it's an asset (debit balance in Tally convention)
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: -totalOpeningStock, // Use OPENING value for closing too (static account)
          accountCode: 'STOCK-OPENING',
          branch: 'HO',
          primaryGroup: 'Stock-in-Hand',
          parent: 'Current Assets',
          isRevenue: false,
        });
        safeLog(`Trial Balance: Added opening stock entry: ${totalOpeningStock}`);
      } else if (totalOpeningStock !== 0 && hasOpeningStockLedger) {
        safeLog(`Trial Balance: Stock ledger already exists, opening stock value: ${totalOpeningStock}`);
      }

      safeLog(`Trial Balance: Processed ${processedData.length} ledgers (including stock if applicable)`);

      return { 
        success: true, 
        data: processedData, 
        companyName,
        stockInfo: {
          itemCount: stockItems.length,
          openingStock: totalOpeningStock,
          closingStock: totalClosingStock
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('odbc-fetch-month-wise', async (event, fyStartYear, targetMonth) => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }

      safeLog('fyStartYear:', fyStartYear, 'targetMonth:', targetMonth);

      const monthOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
      const targetIndex = monthOrder.indexOf(targetMonth);
      if (targetIndex === -1) {
        return { success: false, error: `Invalid target month: ${targetMonth}` };
      }

      const selectedMonths = monthOrder.slice(0, targetIndex + 1);
      const monthSqlParts = [];

      // Build SQL parts for each month
      for (const mName of selectedMonths) {
        const year = (mName === "Jan" || mName === "Feb" || mName === "Mar") ? fyStartYear + 1 : fyStartYear;

        let day;
        if (["Apr", "Jun", "Sep", "Nov"].includes(mName)) day = "30";
        else if (mName === "Feb") day = (year % 4 === 0) ? "29" : "28";
        else day = "31";

        const currDate = `${day}-${mName}-${year}`;
        monthSqlParts.push(`($$ToValue:"${currDate}":$ClosingBalance)`);
      }

      const query = `SELECT $Name, $_PrimaryGroup, $IsRevenue, $OpeningBalance, ${monthSqlParts.join(', ')} FROM Ledger`;

      const result = await odbcConnection.query(query);
      safeLog('Month wise query result length:', result.length);
      if (result.length > 0) {
        safeLog('First row keys:', Object.keys(result[0]));
        safeLog('First row:', result[0]);
      }

      if (!result || result.length === 0) {
        return { success: false, error: 'No data found' };
      }

      // Process data
      const lines = [];
      const plGroupKeywords = [
        'Sales Accounts', 'Purchase Accounts', 'Direct Expenses', 'Indirect Expenses',
        'Direct Incomes', 'Indirect Incomes', 'Expense', 'Income', 'Interest'
      ];

      for (const row of result) {
        const ledgerName = row['$Name'] || '';
        const primaryGroup = row['$_PrimaryGroup'] || '';
        const isRevenue = row['$IsRevenue'] === 'Yes' || row['$IsRevenue'] === true;
        const openingBalance = parseFloat(row['$OpeningBalance']) || 0;

        // Check if PL
        const isRevCheck = isRevenue;
        const groupCheck = plGroupKeywords.some(keyword =>
          primaryGroup.toLowerCase().includes(keyword.toLowerCase())
        );
        const isPL = isRevCheck || groupCheck;

        // Get monthly balances (closing balances)
        // ODBC may return columns with different names - try multiple possibilities
        const monthlyBalances = {};
        const rowKeys = Object.keys(row);

        // Log available keys for debugging (only for first row)
        if (lines.length === 0 && rowKeys.length > 0) {
          safeLog('Available row keys:', rowKeys);
          safeLog('Month SQL parts:', monthSqlParts);
        }

        selectedMonths.forEach((month, i) => {
          let balance = 0;

          // Strategy 1: Access by position (most reliable - ODBC returns columns in SELECT order)
          // Columns: $Name (0), $_PrimaryGroup (1), $IsRevenue (2), $OpeningBalance (3), then month columns (4+)
          const monthIndex = 4 + i;
          if (monthIndex < rowKeys.length) {
            const key = rowKeys[monthIndex];
            balance = parseFloat(row[key]) || 0;
          }

          // Strategy 2: Try exact SQL expression as key (fallback)
          if (balance === 0) {
            const sqlExpr = monthSqlParts[i];
            if (row[sqlExpr] !== undefined && row[sqlExpr] !== null) {
              balance = parseFloat(row[sqlExpr]) || 0;
            }
          }

          // Strategy 3: Try finding by month name in key (last resort)
          if (balance === 0) {
            const altKeys = rowKeys.filter(key =>
              key.toLowerCase().includes(month.toLowerCase()) &&
              !key.includes('Name') &&
              !key.includes('Group') &&
              !key.includes('Revenue') &&
              !key.includes('Opening')
            );
            if (altKeys.length > 0) {
              balance = parseFloat(row[altKeys[0]]) || 0;
            }
          }

          monthlyBalances[month] = balance;
        });

        // Check if has non-zero balances
        let hasNonZero = false;
        if (isPL) {
          // For PL, check movements
          const movements = {};
          selectedMonths.forEach((month, i) => {
            if (i === 0) {
              movements[month] = monthlyBalances[month] - openingBalance;
            } else {
              const prevMonth = selectedMonths[i - 1];
              movements[month] = monthlyBalances[month] - monthlyBalances[prevMonth];
            }
          });
          hasNonZero = Object.values(movements).some(val => val !== 0);
        } else {
          // For BS, check absolute balances
          hasNonZero = Object.values(monthlyBalances).some(val => val !== 0);
        }

        if (hasNonZero) {
          lines.push({
            accountName: ledgerName,
            primaryGroup: primaryGroup,
            isRevenue: isPL, // Use isPL (includes group check) instead of just isRevenue flag
            openingBalance: openingBalance,
            monthlyBalances: monthlyBalances,
          });
        }
      }

      safeLog('Processed lines count:', lines.length);
      const plLines = lines.filter(line => line.isRevenue); // isRevenue now contains isPL classification
      const bsLines = lines.filter(line => !line.isRevenue);
      safeLog('PL lines:', plLines.length, 'BS lines:', bsLines.length);

      return { success: true, data: { plLines, bsLines, months: selectedMonths, fyStartYear, targetMonth } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Opening Balance Matching - Fetch Old Tally Ledger Data (Closing Balances)
  safeLog('Registering IPC handler: odbc-fetch-old-tally-ledgers');
  ipcMain.handle('odbc-fetch-old-tally-ledgers', async () => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }

      const query = `
      SELECT 
        $Name, 
        $_PrimaryGroup, 
        $Parent, 
        $OpeningBalance, 
        $_ClosingBalance, 
        $IsRevenue
      FROM Ledger
    `;

      const result = await odbcConnection.query(query);

      // Process and clean data
      const processedData = result.map(row => {
        const closingBalance = parseFloat(row['$_ClosingBalance'] || 0) || 0;
        const isRevenue = row['$IsRevenue'] === 1 || row['$IsRevenue'] === 'Yes' || row['$IsRevenue'] === true;

        // Convert closing balance to Dr/Cr format
        // Tally convention: Positive = Debit, Negative = Credit
        // Reference: trial_balance.py line 37-59
        const drBalance = closingBalance > 0 ? closingBalance : 0;
        const crBalance = closingBalance < 0 ? Math.abs(closingBalance) : 0;

        return {
          $Name: row['$Name'] || '',
          $_PrimaryGroup: row['$_PrimaryGroup'] || '',
          $Parent: row['$Parent'] || '',
          $OpeningBalance: row['$OpeningBalance'] || 0,
          $_ClosingBalance: closingBalance,
          $IsRevenue: isRevenue ? 'Yes' : 'No',
          Dr_Balance: drBalance,
          Cr_Balance: crBalance,
        };
      }).filter(row =>
        row.$IsRevenue !== 'Yes' && row.$_ClosingBalance !== 0
      );

      return { success: true, data: processedData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Opening Balance Matching - Fetch New Tally Ledger Data (Opening Balances)
  safeLog('Registering IPC handler: odbc-fetch-new-tally-ledgers');
  ipcMain.handle('odbc-fetch-new-tally-ledgers', async () => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }

      const query = `
      SELECT 
        $Name, 
        $_PrimaryGroup, 
        $Parent, 
        $OpeningBalance, 
        $IsRevenue
      FROM Ledger
    `;

      const result = await odbcConnection.query(query);

      // Process and clean data
      const processedData = result.map(row => {
        const openingBalance = parseFloat(row['$OpeningBalance'] || 0) || 0;
        const isRevenue = row['$IsRevenue'] === 1 || row['$IsRevenue'] === 'Yes' || row['$IsRevenue'] === true;

        // Convert opening balance to Dr/Cr format
        // Tally convention: Positive = Debit, Negative = Credit
        // Reference: trial_balance.py line 37-59
        const drBalance = openingBalance > 0 ? openingBalance : 0;
        const crBalance = openingBalance < 0 ? Math.abs(openingBalance) : 0;

        return {
          $Name: row['$Name'] || '',
          $_PrimaryGroup: row['$_PrimaryGroup'] || '',
          $Parent: row['$Parent'] || '',
          $OpeningBalance: openingBalance,
          $IsRevenue: isRevenue ? 'Yes' : 'No',
          Dr_Balance: drBalance,
          Cr_Balance: crBalance,
        };
      }).filter(row =>
        row.$IsRevenue !== 'Yes' && row.$OpeningBalance !== 0
      );

      return { success: true, data: processedData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Opening Balance Matching - Compare balances and generate XML
  safeLog('Registering IPC handler: odbc-compare-opening-balances');
  ipcMain.handle('odbc-compare-opening-balances', async (event, { oldData, newData }) => {
    try {
      // Create comparison report
      const comparison = {
        balanceMismatches: [],
        nameMismatches: [],
      };

      // Normalize ledger names for comparison
      const normalizeName = (name) => (name || '').trim().toLowerCase();

      // Create maps for quick lookup
      const oldMap = new Map();
      oldData.forEach(ledger => {
        const key = normalizeName(ledger.$Name);
        oldMap.set(key, ledger);
      });

      const newMap = new Map();
      newData.forEach(ledger => {
        const key = normalizeName(ledger.$Name);
        newMap.set(key, ledger);
      });

      // Find balance mismatches (matched ledgers with different balances)
      newData.forEach(newLedger => {
        const key = normalizeName(newLedger.$Name);
        const oldLedger = oldMap.get(key);

        if (oldLedger && newLedger.$Name !== 'Profit & Loss A/c') {
          const drDiff = Math.abs((newLedger.Dr_Balance || 0) - (oldLedger.Dr_Balance || 0));
          const crDiff = Math.abs((newLedger.Cr_Balance || 0) - (oldLedger.Cr_Balance || 0));

          if (drDiff > 0.01 || crDiff > 0.01) {
            comparison.balanceMismatches.push({
              $Name: newLedger.$Name,
              $_PrimaryGroup: newLedger.$_PrimaryGroup,
              $Parent: newLedger.$Parent,
              New_Dr_Balance: newLedger.Dr_Balance,
              New_Cr_Balance: newLedger.Cr_Balance,
              Old_Dr_Balance: oldLedger.Dr_Balance,
              Old_Cr_Balance: oldLedger.Cr_Balance,
              Dr_Difference: (newLedger.Dr_Balance || 0) - (oldLedger.Dr_Balance || 0),
              Cr_Difference: (newLedger.Cr_Balance || 0) - (oldLedger.Cr_Balance || 0),
            });
          }
        }
      });

      // Find name mismatches (unmatched ledgers)
      oldData.forEach(oldLedger => {
        const key = normalizeName(oldLedger.$Name);
        if (!newMap.has(key)) {
          comparison.nameMismatches.push({
            'Name as per OLD Tally': oldLedger.$Name,
            'Name as per NEW Tally': '',
            'Balance as per OLD Tally': oldLedger.Dr_Balance > 0
              ? `Dr ${oldLedger.Dr_Balance}`
              : oldLedger.Cr_Balance > 0
                ? `Cr ${oldLedger.Cr_Balance}`
                : '0',
            'Balance as per NEW Tally': '',
            'Remarks': 'Not in New Tally, or the balance may be NIL',
          });
        }
      });

      newData.forEach(newLedger => {
        const key = normalizeName(newLedger.$Name);
        if (!oldMap.has(key)) {
          comparison.nameMismatches.push({
            'Name as per OLD Tally': '',
            'Name as per NEW Tally': newLedger.$Name,
            'Balance as per OLD Tally': '',
            'Balance as per NEW Tally': newLedger.Dr_Balance > 0
              ? `Dr ${newLedger.Dr_Balance}`
              : newLedger.Cr_Balance > 0
                ? `Cr ${newLedger.Cr_Balance}`
                : '0',
            'Remarks': 'Not in Old Tally, or the balance may be NIL',
          });
        }
      });

      // Generate XML for import
      let xmlContent = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY></SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <TALLYMESSAGE>`;

      comparison.balanceMismatches.forEach(ledger => {
        const ledgerName = (ledger.$Name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        const oldDr = ledger.Old_Dr_Balance || 0;
        const oldCr = ledger.Old_Cr_Balance || 0;

        let openingBalance = 0;
        if (oldDr > 0) {
          openingBalance = -oldDr; // Negative for debit
        } else if (oldCr > 0) {
          openingBalance = oldCr; // Positive for credit
        }

        if (openingBalance !== 0) {
          xmlContent += `
      <LEDGER NAME="${ledgerName}" ACTION="Alter">
        <NAME.LIST>
          <NAME>${ledgerName}</NAME>
        </NAME.LIST>
        <OPENINGBALANCE>${openingBalance.toFixed(2)}</OPENINGBALANCE>
      </LEDGER>`;
        }
      });

      xmlContent += `
    </TALLYMESSAGE>
  </BODY>
</ENVELOPE>`;

      return {
        success: true,
        comparison,
        xml: xmlContent,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Fetch Month Wise Data via ODBC
  safeLog('Registering IPC handler: odbc-fetch-month-wise-data');
  ipcMain.handle('odbc-fetch-month-wise-data', async (event, { fyStartYear, targetMonth }) => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }

      // Map month names to numbers
      const monthMap = {
        'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9,
        'Oct': 10, 'Nov': 11, 'Dec': 12, 'Jan': 1, 'Feb': 2, 'Mar': 3
      };

      const targetMonthNum = monthMap[targetMonth] || 3;
      const months = [];
      const lines = [];

      // Generate month list from April to target month
      for (let m = 4; m <= targetMonthNum; m++) {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.push(monthNames[m]);
      }

      // Fetch ledger data with monthly balances
      // Note: This is a simplified implementation - Tally ODBC may need specific queries for monthly data
      const query = `
      SELECT 
        $Name, 
        $_PrimaryGroup, 
        $Parent,
        $IsRevenue,
        $OpeningBalance,
        $ClosingBalance
      FROM Ledger
      ORDER BY $_PrimaryGroup, $Name
    `;

      const result = await odbcConnection.query(query);

      // Process data - Note: Monthly balances would need more complex queries in real implementation
      result.forEach(row => {
        const isRevenue = row['$IsRevenue'] === 1 || row['$IsRevenue'] === 'Yes' || row['$IsRevenue'] === true;
        const openingBalance = parseFloat(row['$OpeningBalance'] || 0) || 0;
        const closingBalance = parseFloat(row['$ClosingBalance'] || 0) || 0;

        // For now, distribute closing balance evenly across months (simplified)
        // In production, you'd need to query actual monthly transaction data
        const monthlyBalances = {};
        months.forEach(month => {
          monthlyBalances[month] = closingBalance / months.length;
        });

        lines.push({
          accountName: row['$Name'] || '',
          primaryGroup: row['$_PrimaryGroup'] || '',
          isRevenue,
          openingBalance,
          monthlyBalances,
        });
      });

      return { success: true, lines, months };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Fetch GST Not Feeded Data via ODBC
  safeLog('Registering IPC handler: odbc-fetch-gst-not-feeded');
  ipcMain.handle('odbc-fetch-gst-not-feeded', async () => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }

      // Query all ledgers - GST registration can be on any ledger, not just Sundry Debtors/Creditors
      // This matches the XML/Tally Bridge approach which queries all ledgers
      let query = `
      SELECT 
        $Name, 
        $_PrimaryGroup,
        $GSTRegistrationType,
        $GSTIN,
        $PartyGSTIN
      FROM Ledger
      ORDER BY $Name
    `;

      let result;
      try {
        result = await odbcConnection.query(query);
        safeLog(`GST Not Feeded: Queried ${result.length} total ledgers`);
      } catch (err) {
        console.error('Error querying GST data:', err.message);
        // Try without WHERE clause to see what fields are available
        try {
          query = `SELECT TOP 10 $Name, $_PrimaryGroup, $GSTRegistrationType, $GSTIN FROM Ledger`;
          const testResult = await odbcConnection.query(query);
          safeLog('Test query result sample:', testResult[0]);
          throw new Error(`Query failed: ${err.message}. Available fields: ${Object.keys(testResult[0] || {}).join(', ')}`);
        } catch (testErr) {
          throw new Error(`Failed to query GST data: ${err.message}`);
        }
      }

      // Filter in JavaScript to handle different GSTIN formats and registration types
      // Tally ODBC field names can vary. We normalize/validate before deciding "missing".
      const normalizeGstin = (value) => {
        if (value === undefined || value === null) return null;
        const s = value.toString().trim();
        if (!s) return null;
        const low = s.toLowerCase();
        if (low === 'null' || low === 'na' || low === 'n/a' || s === '0' || s === '-') return null;

        const upper = s.toUpperCase();
        // Prefer a valid-looking GSTIN (15 chars). We keep the check permissive but structured.
        // Common pattern: 2 digits + 10 PAN chars + 1 entity + Z + 1 checksum
        const looksLikeGstin =
          upper.length === 15 &&
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(upper);

        if (looksLikeGstin) return upper;
        // If it's not a valid GSTIN format, treat it as "missing" (avoids false negatives like 'NA')
        return null;
      };

      const pickBestGstin = (row) => {
        const candidates = [
          row['$GSTIN'],
          row['GSTIN'],
          row['$PartyGSTIN'],
          row['PartyGSTIN'],
        ];
        for (const c of candidates) {
          const normalized = normalizeGstin(c);
          if (normalized) return normalized;
        }
        return null;
      };

      const lines = result
        .map(row => {
          const gstRegType = row['$GSTRegistrationType'] || row['GSTRegistrationType'] || '';
          const gstin = pickBestGstin(row);

          return {
            ledgerName: row['$Name'] || '',
            primaryGroup: row['$_PrimaryGroup'] || row['PrimaryGroup'] || '',
            partyGSTIN: gstin || '',
            registrationType: gstRegType,
            gstRegistrationType: gstRegType, // Alias for compatibility
          };
        })
        .filter(line => {
          // Filter: GST Registration Type is "Regular" (case-insensitive) but GSTIN is missing
          const regType = (line.registrationType || '').toString().trim().toLowerCase();
          const isRegular = regType === 'regular' || regType.startsWith('regular ') || regType.includes('regular');
          if (!isRegular) return false;

          return !normalizeGstin(line.partyGSTIN);
        });

      safeLog(`GST Not Feeded: Found ${lines.length} ledgers with Regular GST but no GSTIN out of ${result.length} total ledgers checked`);

      // Log sample data for debugging if no results found
      if (lines.length === 0 && result.length > 0) {
        const regularLedgers = result.filter(r => {
          const regType = (r['$GSTRegistrationType'] || '').toString().trim().toLowerCase();
          return regType === 'regular';
        });
        safeLog(`Found ${regularLedgers.length} Regular GST ledgers out of ${result.length} total, all have GSTIN entered`);
        if (regularLedgers.length > 0) {
          const sample = regularLedgers[0];
          safeLog('Sample Regular GST ledger:', {
            name: sample['$Name'],
            primaryGroup: sample['$_PrimaryGroup'],
            gstRegType: sample['$GSTRegistrationType'],
            gstin: sample['$PartyGSTIN'] || sample['$GSTIN'] || '(empty)',
          });
        }
      }

      return { success: true, lines };
    } catch (error) {
      console.error('Error fetching GST Not Feeded data:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('odbc-fetch-stock-items', async () => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }

      // Query stock items from Tally
      const query = `
      SELECT 
        $Name,
        $Parent,
        $_PrimaryGroup,
        $OpeningValue,
        $ClosingValue
      FROM StockItem
      ORDER BY $Parent, $Name
    `;

      const result = await odbcConnection.query(query);
      safeLog(`Stock Items: Fetched ${result.length} stock items`);

      if (!result || result.length === 0) {
        return { success: true, items: [] };
      }

      // Process stock items
      const items = result.map(row => ({
        'Item Name': row['$Name'] || '',
        'Stock Group': row['$Parent'] || '',
        'Primary Group': row['$_PrimaryGroup'] || '',
        'Opening Value': parseFloat(row['$OpeningValue']) || 0,
        'Closing Value': parseFloat(row['$ClosingValue']) || 0,
        'Stock Category': '', // Will be classified by user
        'Composite Key': `STOCK|${row['$Name'] || ''}`
      }));

      safeLog(`Stock Items: Processed ${items.length} items`);
      return { success: true, items };
    } catch (error) {
      console.error('Error fetching stock items:', error);
      return { success: false, error: error.message };
    }
  });
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'Audit Assistant Pro',
    show: false,
  });

  // Show window maximized when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:8080';
    mainWindow.loadURL(devServerUrl);
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  safeLog('Electron app ready - IPC handlers should be registered');
  setAppMenu();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for GSTZen API
// Use localhost for development/testing as per user logs. 
// For production, this should be 'https://app.gstzen.in'
const API_BASE_URL = 'https://staging.gstzen.in';

async function handleApiRequest(endpoint, method, data, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const tokenInfo = token ? ' token=[REDACTED]' : '';
    safeLog(`[API Request] ${method} ${endpoint}${tokenInfo}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    // Handle empty response (e.g. 204 No Content)
    // Handle empty response (e.g. 204 No Content)
    const text = await response.text();
    let json = {};
    try {
      if (text && text.trim()) {
        json = JSON.parse(text);
      }
    } catch (e) {
      console.error(`[API] Invalid JSON from ${endpoint}:`, text.substring(0, 500));
      // Fallback: If not JSON, but has text, maybe return it as message?
      // If HTML, prevent bloat.
      if (response.ok) {
        // If 200 OK but invalid JSON, it's a backend issue.
        return { ok: false, status: 500, data: { message: "Invalid response from server" } };
      }
    }

    safeLog(`[API Response] ${method} ${endpoint} -> ${response.status}`);
    return { ok: response.ok, status: response.status, data: json };
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return { ok: false, data: { message: error.message || 'Network request failed' } };
  }
}

ipcMain.handle('gstzen-login', async (event, credentials) => {
  return handleApiRequest('/accounts/api/login/token/', 'POST', credentials);
});


ipcMain.handle('gstzen-generate-otp', async (event, { data, token }) => {
  return handleApiRequest('/api/gstn-generate-otp/', 'POST', data, token);
});

ipcMain.handle('gstzen-establish-session', async (event, { data, token }) => {
  return handleApiRequest('/api/gstn-establish-session/', 'POST', data, token);
});

ipcMain.handle('gstzen-download-gstr1', async (event, { data, token }) => {
  return handleApiRequest('/api/gstr1/download/', 'POST', {
    api_name: data.api_name,
    gstin: data.gstin,
    ret_period: data.filing_period || data.ret_period, // Handle potential field name diffs
  }, token);
});

ipcMain.handle('gstzen-api-request', async (event, { endpoint, method, data, token }) => {
  safeLog(`[IPC] gstzen-api-request: ${method} ${endpoint}`);
  return handleApiRequest(endpoint, method, data, token);
});

