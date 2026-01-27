const { contextBridge, ipcRenderer } = require('electron');

// Auto-updater API mirrored from electron/auto-updater-preload.js
// (defined inline here to avoid dynamic requires in bundled preload)
const updaterApi = {
  /**
   * Manually check for updates
   * @returns {Promise<{success: boolean, updateAvailable: boolean, currentVersion: string, latestVersion?: string, error?: string}>}
   */
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),

  /**
   * Get current app version and beta status
   * @returns {Promise<{version: string, isBeta: boolean}>}
   */
  getCurrentVersion: () => ipcRenderer.invoke('updater:getCurrentVersion'),

  /**
   * Trigger immediate restart for waiting update
   * @returns {Promise<void>}
   */
  restartForUpdate: () => ipcRenderer.invoke('updater:restartForUpdate'),

  /**
   * Listen for update events
   * Events:
   * - 'update:checking' - checking for updates started
   * - 'update:available' - {version, releaseNotes, releaseName, releaseDate}
   * - 'update:not-available' - {currentVersion}
   * - 'update:downloaded' - {version} - update ready to install
   * - 'update:progress' - {percent, transferred, total}
   * - 'update:deferred' - {version} - user postponed restart
   * - 'update:error' - {message}
   */
  onUpdateEvent: (channel, listener) => {
    // Validate channel to prevent listening to arbitrary events
    const validChannels = [
      'update:checking',
      'update:available',
      'update:not-available',
      'update:downloaded',
      'update:progress',
      'update:deferred',
      'update:error',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener);

      // Return unsubscribe function for cleanup
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    } else {
      console.warn(`[SECURITY] Attempted to listen to invalid channel: ${channel}`);
    }
  },

  /**
   * Remove listener for update event
   */
  removeUpdateListener: (channel, listener) => {
    ipcRenderer.removeListener(channel, listener);
  },
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods you need here
  platform: process.platform,
  gstzen: {
    login: (credentials) => ipcRenderer.invoke('gstzen-login', credentials),
    generateOtp: (data, token) => ipcRenderer.invoke('gstzen-generate-otp', { data, token }),
    establishSession: (data, token) => ipcRenderer.invoke('gstzen-establish-session', { data, token }),
    downloadGstr1: (data, token) => ipcRenderer.invoke('gstzen-download-gstr1', { data, token }),
    request: (endpoint, method, data, token) => ipcRenderer.invoke('gstzen-api-request', { endpoint, method, data, token }),
  },
  // Auto-updater API, consumed by useAutoUpdater hook
  updater: updaterApi,
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
  odbcTestConnection: (port) => ipcRenderer.invoke('odbc-test-connection', port),
  odbcFetchTrialBalance: (fromDate, toDate) => ipcRenderer.invoke('odbc-fetch-trial-balance', fromDate, toDate),
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

