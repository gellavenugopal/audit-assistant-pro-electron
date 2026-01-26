/**
 * Example: How to integrate auto-updater in your app
 * 
 * This shows a complete example of using the auto-updater
 * in your main app component
 * 
 * File: src/components/AppUpdaterManager.tsx
 */

import { useAutoUpdater } from '@/hooks/useAutoUpdater';
import {
  UpdateNotification,
  UpdateDownloadingIndicator,
  UpdateReadyNotification,
  UpdateErrorNotification,
  VersionBadge,
} from '@/components/UpdateNotifications';
import { useEffect } from 'react';

/**
 * Main updater manager component
 * 
 * Usage: Add <AppUpdaterManager /> near the root of your app
 * This ensures update notifications appear system-wide
 */
export function AppUpdaterManager() {
  const {
    updateAvailable,
    updateDownloaded,
    downloadProgress,
    currentVersion,
    isBeta,
    error,
    checkForUpdates,
    restartNow,
  } = useAutoUpdater();

  // Optionally check for updates on a schedule
  // By default, auto-updater checks on app start and every 60 minutes
  useEffect(() => {
    // You could trigger manual checks based on user action
    // checkForUpdates();
  }, [checkForUpdates]);

  return (
    <>
      {/* Show download progress while downloading */}
      {downloadProgress && !updateDownloaded && (
        <UpdateDownloadingIndicator
          percent={downloadProgress.percent}
          transferred={downloadProgress.transferred}
          total={downloadProgress.total}
        />
      )}

      {/* Show notification when update is available */}
      {updateAvailable && !updateDownloaded && (
        <UpdateNotification
          version={updateAvailable.version}
          releaseNotes={updateAvailable.releaseNotes}
          releaseName={updateAvailable.releaseName}
          onRestart={restartNow}
        />
      )}

      {/* Show ready notification when download is complete */}
      {updateDownloaded && (
        <UpdateReadyNotification
          version={updateDownloaded.version}
          onRestart={restartNow}
        />
      )}

      {/* Show error notification if something goes wrong */}
      {error && (
        <UpdateErrorNotification
          message={error}
          onRetry={checkForUpdates}
        />
      )}
    </>
  );
}

/**
 * Example: Add version badge to app header
 * 
 * Usage: Add <VersionBadgeDisplay /> in your header/navbar
 */
export function VersionBadgeDisplay() {
  const { currentVersion, isBeta } = useAutoUpdater();

  return (
    <VersionBadge
      version={currentVersion}
      isBeta={isBeta}
      className="text-gray-600"
    />
  );
}

/**
 * Example: Add manual update check button
 * 
 * Usage: Add <ManualUpdateCheckButton /> in settings or help menu
 */
export function ManualUpdateCheckButton() {
  const { checkForUpdates, isCheckingForUpdates } = useAutoUpdater();

  return (
    <button
      onClick={checkForUpdates}
      disabled={isCheckingForUpdates}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {isCheckingForUpdates ? 'Checking...' : 'Check for Updates'}
    </button>
  );
}

/**
 * Example: Complete app layout with all components
 * 
 * This shows how to integrate the updater into your main App component
 */
export function AppWithUpdater() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Update manager - renders notifications */}
      <AppUpdaterManager />

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Audit Assistant Pro</h1>
            {/* Version badge in header */}
            <VersionBadgeDisplay />
          </div>

          {/* Manual check button in header */}
          <ManualUpdateCheckButton />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Your app content here */}
      </main>
    </div>
  );
}

/**
 * Example: Settings page with update options
 * 
 * Could include:
 * - Enable/disable auto-updates
 * - Enable/disable beta updates
 * - View update history
 * - Manual update check
 */
export function UpdateSettingsPage() {
  const { 
    currentVersion, 
    isBeta, 
    checkForUpdates, 
    isCheckingForUpdates 
  } = useAutoUpdater();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Updates</h2>
        <p className="text-gray-600 mt-1">
          Manage how and when Audit Assistant Pro is updated
        </p>
      </div>

      {/* Current version section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Current Version</h3>
            <p className="text-sm text-gray-600 mt-1">
              You are running version {currentVersion}
              {isBeta && ' (beta)'}
            </p>
          </div>
          <VersionBadge version={currentVersion} isBeta={isBeta} />
        </div>
      </div>

      {/* Check for updates button */}
      <div className="bg-gray-50 rounded-lg p-4">
        <button
          onClick={checkForUpdates}
          disabled={isCheckingForUpdates}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isCheckingForUpdates ? 'Checking for updates...' : 'Check for Updates Now'}
        </button>
        <p className="text-xs text-gray-600 mt-2">
          Updates are checked automatically on startup and every hour.
          You can also check manually here.
        </p>
      </div>

      {/* Auto-update options (future enhancements) */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium mb-4">Update Options</h3>
        
        <label className="flex items-center gap-3 mb-4">
          <input type="checkbox" defaultChecked className="rounded" />
          <span className="text-sm">
            Automatically check for updates
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked={isBeta} className="rounded" />
          <span className="text-sm">
            Include pre-release versions (beta)
            <span className="text-gray-600 text-xs block mt-1">
              Receive updates before stable release for testing new features
            </span>
          </span>
        </label>
      </div>

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900">About Auto-Updates</h4>
        <ul className="mt-2 text-sm text-blue-800 space-y-1">
          <li>✓ Updates are checked automatically in the background</li>
          <li>✓ Download happens automatically without interrupting work</li>
          <li>✓ You control when the app restarts to install</li>
          <li>✓ All updates are verified and signed for security</li>
        </ul>
      </div>
    </div>
  );
}
