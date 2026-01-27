/**
 * Auto-Updater Module for Electron App
 * 
 * Implements electron-updater with GitHub Releases provider
 * Supports both stable and pre-release (beta) versions
 * 
 * Key Features:
 * - Automatic update checks on app ready
 * - User notifications for available updates
 * - Background download of updates
 * - Smart pre-release handling (beta users only)
 * - Proper Windows NSIS support
 * - Comprehensive logging
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('[AUTO-UPDATER] Created logs directory:', logsDir);
  } catch (error) {
    console.error('[AUTO-UPDATER] Failed to create logs directory:', error);
  }
}

// Configure auto-updater logging
log.transports.file.level = 'debug';
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs', 'main.log');
autoUpdater.logger = log;

// Also log to console for debugging
console.log('[AUTO-UPDATER] Module loaded');
console.log('[AUTO-UPDATER] App version:', app.getVersion());
console.log('[AUTO-UPDATER] User data path:', app.getPath('userData'));
console.log('[AUTO-UPDATER] Logs path:', path.join(app.getPath('userData'), 'logs', 'main.log'));

/**
 * Auto-Updater Configuration
 * 
 * GitHub Provider Details:
 * - Repository format: owner/repo (e.g., "company/audit-assistant-pro")
 * - Releases should be published on GitHub with proper semantic versioning
 * - electron-updater automatically constructs the GitHub API URL
 * - No manual setFeedURL needed - GitHub provider is configured via package.json
 */

/**
 * Determine if user is in beta/pre-release channel
 * 
 * Methods to set beta channel:
 * 1. Environment variable: ENABLE_BETA_UPDATES=true
 * 2. User preference stored in userData
 * 3. Package version contains -beta, -alpha, -rc
 * 
 * @returns {boolean} true if user should receive pre-release versions
 */
function isBetaChannel() {
  // Check environment variable (useful for testing)
  if (process.env.ENABLE_BETA_UPDATES === 'true') {
    return true;
  }

  // Check if current app version is a pre-release
  const appVersion = app.getVersion();
  const isCurrentBeta = /^[0-9]+\.[0-9]+\.[0-9]+-/.test(appVersion);
  if (isCurrentBeta) {
    return true;
  }

  // Check user preferences (you could store this in localStorage from renderer)
  // For now, we check the app's config or user settings
  // This can be enhanced to persist user choice
  return false;
}

/**
 * Configure auto-updater with appropriate settings
 * 
 * Configuration Requirements:
 * - GitHub provider needs electron-updater ^7.0 or later
 * - Package.json must include:
 *   {
 *     "repository": {
 *       "url": "https://github.com/owner/repo.git"
 *     }
 *   }
 * - Releases must follow semantic versioning (e.g., v1.0.0, v1.0.0-beta.1)
 */
function configureAutoUpdater() {
  // Enable allowPrerelease to receive beta versions when in beta channel
  autoUpdater.allowPrerelease = isBetaChannel();

  // These settings ensure stable behavior:
  // allowDowngrade: false - prevents downgrading to older versions
  // disableWebInstaller: true - uses full installers (more reliable)
  autoUpdater.allowDowngrade = false;

  log.info(
    `[AUTO-UPDATER] Configured with beta=${autoUpdater.allowPrerelease}, version=${app.getVersion()}`
  );
}

/**
 * Send update status to renderer process
 * 
 * This allows the UI to show update notifications to the user
 * Communication uses IPC for secure main->renderer messaging
 */
function notifyRenderer(channel, data) {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((window) => {
    if (window && window.webContents) {
      window.webContents.send(channel, data);
    }
  });
}

/**
 * Handle update-available event
 * 
 * Lifecycle:
 * 1. Update found on GitHub releases
 * 2. Automatically starts download
 * 3. Notifies user about available version
 * 4. User can choose to restart immediately or later
 * 
 * Note: Download happens automatically - we don't need to trigger it
 */
function setupUpdateAvailableHandler() {
  autoUpdater.on('update-available', (info) => {
    console.log('[AUTO-UPDATER] *** UPDATE AVAILABLE EVENT TRIGGERED ***');
    console.log('[AUTO-UPDATER] Available version:', info.version);
    console.log('[AUTO-UPDATER] Current version:', app.getVersion());
    log.info(`[AUTO-UPDATER] Update available: ${info.version}`);

    // Notify renderer process about available update
    notifyRenderer('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes || 'Update available',
      releaseName: info.releaseName,
      releaseDate: info.releaseDate,
    });
  });
}

/**
 * Handle update downloaded event
 * 
 * Lifecycle:
 * 1. Update fully downloaded and staged
 * 2. User is prompted to restart
 * 3. On restart, installer runs automatically
 * 
 * Important: Do NOT call quitAndInstall automatically
 * Let user choose when to restart to prevent work loss
 */
function setupUpdateDownloadedHandler() {
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AUTO-UPDATER] *** UPDATE DOWNLOADED EVENT TRIGGERED ***');
    console.log('[AUTO-UPDATER] Version:', info.version);
    log.info(`[AUTO-UPDATER] Update downloaded: ${info.version}`);

    // Notify renderer that update is ready; renderer is responsible
    // for prompting the user and calling restart when appropriate.
    notifyRenderer('update:downloaded', {
      version: info.version,
    });
  });
}

/**
 * Handle checking-for-update event
 * Logged for debugging update check frequency
 */
function setupCheckingHandler() {
  autoUpdater.on('checking-for-update', () => {
    log.debug('[AUTO-UPDATER] Checking for updates...');
    notifyRenderer('update:checking', {});
  });
}

/**
 * Handle update-not-available event
 * User is already on the latest version
 */
function setupUpdateNotAvailableHandler() {
  autoUpdater.on('update-not-available', () => {
    log.debug('[AUTO-UPDATER] Already on latest version');
    notifyRenderer('update:not-available', {
      currentVersion: app.getVersion(),
    });
  });
}

/**
 * Handle download-progress event
 * 
 * Useful for displaying progress bar in UI
 * Updates are sent frequently - throttle in renderer if needed
 */
function setupDownloadProgressHandler() {
  let lastLog = 0; // Track last log time to avoid spam
  let downloadStarted = false;
  
  autoUpdater.on('download-progress', (progressObj) => {
    const now = Date.now();
    const mbTransferred = Math.round(progressObj.transferred / 1024 / 1024 * 100) / 100;
    const mbTotal = Math.round(progressObj.total / 1024 / 1024 * 100) / 100;
    const percent = Math.round(progressObj.percent);
    
    // Show initial download started message
    if (!downloadStarted) {
      console.log('[AUTO-UPDATER] *** DOWNLOAD STARTED ***');
      console.log('[AUTO-UPDATER] Total size:', mbTotal, 'MB');
      downloadStarted = true;
    }
    
    // Log every 500ms to avoid spam
    if (now - lastLog > 500) {
      console.log(`[AUTO-UPDATER] Downloading: ${percent}% (${mbTransferred} MB / ${mbTotal} MB)`);
      log.debug(
        `[AUTO-UPDATER] Download: ${percent}% (${mbTransferred} MB / ${mbTotal} MB)`
      );
      lastLog = now;
    }

    notifyRenderer('update:progress', {
      percent: percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      mbTransferred: mbTransferred,
      mbTotal: mbTotal,
    });
  });
}

/**
 * Handle error event
 * 
 * Errors are logged but not fatal
 * App continues running even if updates fail
 * This ensures app reliability even with poor internet
 */
function setupErrorHandler() {
  autoUpdater.on('error', (err) => {
    log.error('[AUTO-UPDATER] Error:', err);

    notifyRenderer('update:error', {
      message: err.message || 'Failed to check for updates',
    });
  });
}

/**
 * Set up IPC handlers for renderer process
 * 
 * Allows UI to:
 * - Manually trigger update checks
 * - Check current version
 * - Check beta channel status
 */
function setupIpcHandlers() {
  // Allow manual update check from UI
  ipcMain.handle('updater:checkForUpdates', async () => {
    log.info('[AUTO-UPDATER] Manual update check triggered from UI');
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        updateAvailable: result?.updateInfo?.version !== app.getVersion(),
        currentVersion: app.getVersion(),
        latestVersion: result?.updateInfo?.version,
      };
    } catch (error) {
      log.error('[AUTO-UPDATER] Manual check failed:', error);
      return {
        success: false,
        error: error.message,
        currentVersion: app.getVersion(),
      };
    }
  });

  // Get current app version
  ipcMain.handle('updater:getCurrentVersion', () => {
    return {
      version: app.getVersion(),
      isBeta: isBetaChannel(),
    };
  });

  // Allow user to manually trigger restart for waiting update
  ipcMain.handle('updater:restartForUpdate', () => {
    log.info('[AUTO-UPDATER] Restart triggered from UI');
    autoUpdater.quitAndInstall();
  });
}

/**
 * Initialize auto-updater when app is ready
 * 
 * This should be called in app.whenReady().then()
 * 
 * Sequence:
 * 1. Configure updater with appropriate settings
 * 2. Set up event handlers
 * 3. Set up IPC handlers
 * 4. Check for updates (initial check)
 * 5. Schedule periodic checks (optional)
 */
function initializeAutoUpdater() {
  try {
    console.log('[AUTO-UPDATER] *** INITIALIZING AUTO-UPDATER ***');
    configureAutoUpdater();

    // Set up all event handlers
    setupCheckingHandler();
    setupUpdateAvailableHandler();
    setupUpdateDownloadedHandler();
    setupUpdateNotAvailableHandler();
    setupDownloadProgressHandler();
    setupErrorHandler();

    // Set up IPC handlers for renderer communication
    setupIpcHandlers();

    // Initial check for updates
    console.log('[AUTO-UPDATER] Starting initial update check...');
    autoUpdater.checkForUpdatesAndNotify();

    // Optional: Schedule periodic checks (every 60 minutes)
    const updateInterval = setInterval(() => {
      log.debug('[AUTO-UPDATER] Periodic update check (60 min interval)');
      autoUpdater.checkForUpdates();
    }, 1000 * 60 * 60); // 60 minutes

    // Clean up intervals on app quit
    app.once('before-quit', () => {
      clearInterval(updateInterval);
    });

    console.log('[AUTO-UPDATER] *** AUTO-UPDATER INITIALIZED SUCCESSFULLY ***');
    log.info('[AUTO-UPDATER] Auto-updater initialized successfully');
  } catch (error) {
    console.error('[AUTO-UPDATER] INITIALIZATION FAILED:', error);
    log.error('[AUTO-UPDATER] Initialization failed:', error);
    // App continues even if updater fails
  }
}

module.exports = {
  initializeAutoUpdater,
  isBetaChannel,
};

