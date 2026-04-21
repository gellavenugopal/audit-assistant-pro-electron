/**
 * UpdateNotification Component
 * 
 * Displays update availability to user
 * Shows version number and prompts for restart
 */

import { useState } from 'react';
import { AlertCircle, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpdateNotificationProps {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  onRestart: () => void;
  onDismiss?: () => void;
}

export function UpdateNotification({
  version,
  releaseNotes,
  releaseName,
  onRestart,
  onDismiss,
}: UpdateNotificationProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border-l-4 border-blue-500 p-4">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Download className="h-5 w-5 text-blue-500" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {releaseName || `Update Available`}
          </h3>
          
          <p className="text-sm text-gray-600 mt-1">
            Version {version} is ready to install.
          </p>

          {releaseNotes && (
            <details className="mt-2 text-sm text-gray-600">
              <summary className="cursor-pointer font-medium">
                Release notes
              </summary>
              <div className="mt-2 pl-2 border-l-2 border-gray-300 text-xs whitespace-pre-wrap">
                {releaseNotes}
              </div>
            </details>
          )}

          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              onClick={onRestart}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Restart Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
            >
              Later
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * UpdateDownloadingIndicator Component
 * 
 * Shows download progress while update is being downloaded
 * Includes percentage and file sizes
 */

interface UpdateDownloadingIndicatorProps {
  percent: number;
  transferred: number;
  total: number;
}

export function UpdateDownloadingIndicator({
  percent,
  transferred,
  total,
}: UpdateDownloadingIndicatorProps) {
  const transferredMB = (transferred / 1024 / 1024).toFixed(1);
  const totalMB = (total / 1024 / 1024).toFixed(1);

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border-l-4 border-amber-500 p-4">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Download className="h-5 w-5 text-amber-500 animate-bounce" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Downloading Update
          </h3>

          <p className="text-sm text-gray-600 mt-1">
            {transferredMB} MB / {totalMB} MB
          </p>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 mt-2 text-right">
            {Math.round(percent)}%
          </p>

          <p className="text-xs text-gray-600 mt-2">
            The update will be installed automatically when finished.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * UpdateReadyNotification Component
 * 
 * Shows when update is downloaded and ready to install
 * Prompts user to restart application
 */

interface UpdateReadyNotificationProps {
  version: string;
  onRestart: () => void;
  onDismiss?: () => void;
}

export function UpdateReadyNotification({
  version,
  onRestart,
  onDismiss,
}: UpdateReadyNotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border-l-4 border-green-500 p-4">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Update Ready
          </h3>

          <p className="text-sm text-gray-600 mt-1">
            Version {version} is ready to install. Restart to complete the update.
          </p>

          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              onClick={onRestart}
              className="bg-green-500 hover:bg-green-600"
            >
              Restart Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDismiss}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * UpdateErrorNotification Component
 * 
 * Shows when update check fails
 */

interface UpdateErrorNotificationProps {
  message: string;
  onRetry?: () => void;
}

export function UpdateErrorNotification({
  message,
  onRetry,
}: UpdateErrorNotificationProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border-l-4 border-red-500 p-4">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Update Check Failed
          </h3>

          <p className="text-sm text-gray-600 mt-1">
            {message}
          </p>

          <div className="flex gap-2 mt-4">
            {onRetry && (
              <Button
                size="sm"
                onClick={onRetry}
                variant="outline"
              >
                Retry
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDismissed(true)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * VersionBadge Component
 * 
 * Simple badge showing current version and beta status
 */

interface VersionBadgeProps {
  version: string;
  isBeta?: boolean;
  className?: string;
}

export function VersionBadge({
  version,
  isBeta,
  className = '',
}: VersionBadgeProps) {
  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${className}`}>
      <span className="text-gray-500">v{version}</span>
      {isBeta && (
        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold">
          beta
        </span>
      )}
    </div>
  );
}

