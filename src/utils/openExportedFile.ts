const determineSeparator = (value?: string): '\\\\' | '/' => {
  if (!value) return '/';
  return value.toLowerCase().includes('win') ? '\\\\' : '/';
};

const ensureTrailingSeparator = (path: string, separator: string) => {
  if (path.endsWith(separator)) return path;
  return `${path}${separator}`;
};

export async function openExportedFileInDownloads(filename: string): Promise<string | null> {
  if (typeof window === 'undefined') return 'Cannot open file outside of a browser.';

  const electronAPI = window.electronAPI;
  if (!electronAPI?.app?.getDownloadsPath || !electronAPI.app.openPath) {
    return 'Open the downloaded file manually from the Downloads folder.';
  }

  try {
    const downloadsPath = await electronAPI.app.getDownloadsPath();
    if (!downloadsPath) {
      return 'Could not determine the Downloads folder.';
    }

    const separator = determineSeparator(electronAPI.platform);
    const normalizedPath = ensureTrailingSeparator(downloadsPath, separator);
    const fullPath = `${normalizedPath}${filename}`;
    const openResult = await electronAPI.app.openPath(fullPath);

    if (openResult) {
      return openResult;
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Failed to open the exported file.';
  }
}
