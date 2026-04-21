/**
 * Auto-Updater Preload Context Bridge
 * 
 * Exposes safe, limited IPC methods for renderer process
 * These are called from the React UI to interact with the auto-updater
 * 
 * Usage in React:
 * const { ipcRenderer } = window.electron;
 * 
 * // Listen for updates
 * ipcRenderer.on('update:available', (event, data) => {
 *   console.log('Update available:', data.version);
 * });
 * 
 * // Check for updates manually
 * const result = await ipcRenderer.invoke('updater:checkForUpdates');
 * 
 * // Trigger restart
 * await ipcRenderer.invoke('updater:restartForUpdate');
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exposed IPC methods for auto-updater
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

// Expose via context bridge under 'updater' namespace
// Main preload script will expose 'electron.updater'
contextBridge.exposeInMainWorld('electronUpdater', updaterApi);

module.exports = { updaterApi };
