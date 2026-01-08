const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods you need here
  platform: process.platform,
  gstzen: {
    login: (credentials) => ipcRenderer.invoke('gstzen-login', credentials),
    testGstinConnection: (gstinUuid, token) => ipcRenderer.invoke('gstzen-test-connection', { gstinUuid, token }),
    generateOtp: (data, token) => ipcRenderer.invoke('gstzen-generate-otp', { data, token }),
    establishSession: (data, token) => ipcRenderer.invoke('gstzen-establish-session', { data, token }),
    downloadGstr1: (data, token) => ipcRenderer.invoke('gstzen-download-gstr1', { data, token }),
  },
  // Example: send a message to main process
  send: (channel, data) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Example: receive a message from main process
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // ODBC methods
  odbcCheckConnection: () => ipcRenderer.invoke('odbc-check-connection'),
  odbcTestConnection: () => ipcRenderer.invoke('odbc-test-connection'),
  odbcFetchTrialBalance: () => ipcRenderer.invoke('odbc-fetch-trial-balance'),
  odbcFetchMonthWise: (fyStartYear, targetMonth) => ipcRenderer.invoke('odbc-fetch-month-wise', fyStartYear, targetMonth),
  odbcDisconnect: () => ipcRenderer.invoke('odbc-disconnect'),
  // Opening Balance Matching methods
  odbcFetchOldTallyLedgers: () => ipcRenderer.invoke('odbc-fetch-old-tally-ledgers'),
  odbcFetchNewTallyLedgers: () => ipcRenderer.invoke('odbc-fetch-new-tally-ledgers'),
  odbcCompareOpeningBalances: (data) => ipcRenderer.invoke('odbc-compare-opening-balances', data),
  // Month wise and GST methods
  odbcFetchMonthWiseData: (data) => ipcRenderer.invoke('odbc-fetch-month-wise-data', data),
  odbcFetchGSTNotFeeded: () => ipcRenderer.invoke('odbc-fetch-gst-not-feeded'),
  // Stock Items methods
  odbcFetchStockItems: () => ipcRenderer.invoke('odbc-fetch-stock-items'),
});

// Log when preload script is loaded
console.log('Preload script loaded');

