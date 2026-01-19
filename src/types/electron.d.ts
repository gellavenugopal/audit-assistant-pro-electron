export {};

declare global {
  interface ElectronAppAPI {
    getDownloadsPath: () => Promise<string>;
    openPath: (targetPath: string) => Promise<string>;
  }

  interface Window {
    electronAPI?: {
      platform: string;
      app?: ElectronAppAPI;
    };
  }
}
