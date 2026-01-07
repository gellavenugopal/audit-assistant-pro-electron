const { app, BrowserWindow } = require('electron');
const path = require('path');
const odbc = require('odbc');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ODBC connection handling
let odbcConnection = null;

function registerIpcHandlers() {
  const { ipcMain } = require('electron');

  ipcMain.handle('odbc-test-connection', async () => {
    try {
      // Common Tally ODBC drivers
      const drivers = ['Tally ODBC Driver64', 'Tally ODBC Driver', 'Tally ODBC 64-bit Driver'];
      const port = '9000';
      
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
          console.log(`Failed with driver ${driver}:`, err.message);
          continue;
        }
      }
      
      return { success: false, error: 'No compatible ODBC driver found or Tally not running' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('odbc-fetch-trial-balance', async () => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }
      
      const query = `
        SELECT $Name, $_PrimaryGroup, $Parent, $IsRevenue, 
               $OpeningBalance, $ClosingBalance, $DebitTotals, $CreditTotals,
               $Code, $Branch
        FROM Ledger
        ORDER BY $_PrimaryGroup, $Name
      `;
      
      const result = await odbcConnection.query(query);
      
      // Process the data to match the Excel template format
      const processedData = result.map(row => ({
        accountHead: row['$Name'] || '',
        openingBalance: row['$OpeningBalance'] || 0,
        totalDebit: row['$DebitTotals'] || 0,
        totalCredit: row['$CreditTotals'] || 0,
        closingBalance: row['$ClosingBalance'] || 0,
        accountCode: row['$Code'] || '',
        branch: row['$Branch'] || 'HO',
        // Add hierarchy data
        primaryGroup: row['$_PrimaryGroup'] || '',
        parent: row['$Parent'] || '',
        isRevenue: row['$IsRevenue'] === 'Yes' || row['$IsRevenue'] === true,
      }));
      
      return { success: true, data: processedData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('odbc-fetch-month-wise', async (event, fyStartYear, targetMonth) => {
    try {
      if (!odbcConnection) {
        return { success: false, error: 'Not connected to Tally ODBC' };
      }

      console.log('fyStartYear:', fyStartYear, 'targetMonth:', targetMonth);

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
      console.log('Month wise query result length:', result.length);
      if (result.length > 0) {
        console.log('First row keys:', Object.keys(result[0]));
        console.log('First row:', result[0]);
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
        const monthlyBalances = {};
        selectedMonths.forEach((month, i) => {
          monthlyBalances[month] = parseFloat(row[monthSqlParts[i]]) || 0;
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
            isRevenue: isRevenue,
            openingBalance: openingBalance,
            monthlyBalances: monthlyBalances,
          });
        }
      }

      console.log('Processed lines count:', lines.length);
      const plLines = lines.filter(line => line.isRevenue);
      const bsLines = lines.filter(line => !line.isRevenue);
      console.log('PL lines:', plLines.length, 'BS lines:', bsLines.length);
      
      return { success: true, data: { plLines, bsLines, months: selectedMonths, fyStartYear, targetMonth } };
    } catch (error) {
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
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'Audit Assistant Pro',
    show: false,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:8080');
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
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

