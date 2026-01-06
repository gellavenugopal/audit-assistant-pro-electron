const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const odbc = require('odbc');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ODBC connection handling
let odbcConnection = null;

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

ipcMain.handle('odbc-disconnect', async () => {
  try {
    if (odbcConnection) {
      await odbcConnection.close();
      odbcConnection = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Opening Balance Matching - Fetch Old Tally Ledger Data (Closing Balances)
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
      const drBalance = closingBalance < 0 ? Math.abs(closingBalance) : 0;
      const crBalance = closingBalance > 0 ? closingBalance : 0;
      
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
      const drBalance = openingBalance < 0 ? Math.abs(openingBalance) : 0;
      const crBalance = openingBalance > 0 ? openingBalance : 0;
      
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

