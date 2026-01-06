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

