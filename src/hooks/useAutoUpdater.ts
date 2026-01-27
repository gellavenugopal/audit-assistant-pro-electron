/**
 * useAutoUpdater Hook
 * 
 * React hook for managing auto-updater state and events
 * 
 * Usage:
 * const { isCheckingForUpdates, updateAvailable, downloadProgress, checkForUpdates, restartNow } = useAutoUpdater();
 * 
 * return (
 *   <>
 *     {updateAvailable && (
 *       <UpdateNotification version={updateAvailable.version} onRestart={restartNow} />
 *     )}
 *     {downloadProgress && <ProgressBar percent={downloadProgress.percent} />}
 *   </>
 * );
 */

import { useEffect, useState, useCallback } from 'react';

export function useAutoUpdater() {
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{
    version: string;
    releaseNotes?: string;
    releaseName?: string;
    releaseDate?: string;
  } | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<{
    version: string;
  } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    transferred: number;
    total: number;
  } | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isBeta, setIsBeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access the updater API from preload script
  const updater = (window as any).electronAPI?.updater;

  /**
   * Check for updates manually
   */
  const checkForUpdates = useCallback(async () => {
    if (!updater) {
      console.error('[UPDATER HOOK] Updater API not available');
      return;
    }

    try {
      setIsCheckingForUpdates(true);
      setError(null);
      
      const result = await updater.checkForUpdates();
      
      if (!result.success) {
        setError(result.error || 'Failed to check for updates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCheckingForUpdates(false);
    }
  }, [updater]);

  /**
   * Trigger immediate restart and install update
   */
  const restartNow = useCallback(async () => {
    if (!updater) {
      console.error('[UPDATER HOOK] Updater API not available');
      return;
    }

    try {
      await updater.restartForUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart for update');
    }
  }, [updater]);

  /**
   * Dismiss current update notifications in UI (e.g. "Later" button)
   * Does not affect the underlying downloaded update, only local state.
   */
  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(null);
    setUpdateDownloaded(null);
    setDownloadProgress(null);
    setError(null);
  }, []);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (!updater) {
      console.error('[UPDATER HOOK] Updater API not available');
      return;
    }

    // Get current version on mount
    (async () => {
      try {
        const versionInfo = await updater.getCurrentVersion();
        setCurrentVersion(versionInfo.version);
        setIsBeta(versionInfo.isBeta);
      } catch (err) {
        console.error('[UPDATER HOOK] Failed to get version:', err);
      }
    })();

    // Listen for update events
    const unlisteners: (() => void)[] = [];

    // Update checking started
    const unlistenChecking = updater.onUpdateEvent('update:checking', () => {
      setIsCheckingForUpdates(true);
      setError(null);
    });
    if (unlistenChecking) unlisteners.push(unlistenChecking);

    // Update available
    const unlistenAvailable = updater.onUpdateEvent(
      'update:available',
      (event: any, data: any) => {
        setUpdateAvailable(data);
        setIsCheckingForUpdates(false);
      }
    );
    if (unlistenAvailable) unlisteners.push(unlistenAvailable);

    // Update not available
    const unlistenNotAvailable = updater.onUpdateEvent(
      'update:not-available',
      () => {
        setIsCheckingForUpdates(false);
        setUpdateAvailable(null);
      }
    );
    if (unlistenNotAvailable) unlisteners.push(unlistenNotAvailable);

    // Download progress
    const unlistenProgress = updater.onUpdateEvent(
      'update:progress',
      (event: any, data: any) => {
        setDownloadProgress(data);
      }
    );
    if (unlistenProgress) unlisteners.push(unlistenProgress);

    // Update downloaded and ready
    const unlistenDownloaded = updater.onUpdateEvent(
      'update:downloaded',
      (event: any, data: any) => {
        setUpdateDownloaded(data);
        setDownloadProgress(null);
        setIsCheckingForUpdates(false);
      }
    );
    if (unlistenDownloaded) unlisteners.push(unlistenDownloaded);

    // Update deferred by user
    const unlistenDeferred = updater.onUpdateEvent('update:deferred', () => {
      setDownloadProgress(null);
    });
    if (unlistenDeferred) unlisteners.push(unlistenDeferred);

    // Update error
    const unlistenError = updater.onUpdateEvent(
      'update:error',
      (event: any, data: any) => {
        setError(data.message || 'Update error');
        setIsCheckingForUpdates(false);
        setDownloadProgress(null);
      }
    );
    if (unlistenError) unlisteners.push(unlistenError);

    // Cleanup on unmount
    return () => {
      unlisteners.forEach((unlisten) => unlisten?.());
    };
  }, [updater]);

  return {
    // State
    isCheckingForUpdates,
    updateAvailable,
    updateDownloaded,
    downloadProgress,
    currentVersion,
    isBeta,
    error,

    // Actions
    checkForUpdates,
    restartNow,
    dismissUpdate,
  };
}