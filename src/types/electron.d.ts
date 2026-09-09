export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface ElectronAPI {
  // File system
  openFileDialog: (filters?: FileFilter[]) => Promise<string | null>;
  saveFileDialog: (defaultName: string, filters?: FileFilter[]) => Promise<string | null>;
  readFile: (filePath: string) => Promise<{ data: string; isBinary: boolean }>;
  writeFile: (filePath: string, content: string, isBinary?: boolean) => Promise<boolean>;

  // Secure key storage (OS keychain via safeStorage)
  setSecureKey: (key: string, value: string) => Promise<boolean>;
  getSecureKey: (key: string) => Promise<string | null>;
  deleteSecureKey: (key: string) => Promise<boolean>;
  isEncryptionAvailable: () => Promise<boolean>;

  // Non-sensitive config (electron-store)
  getConfig: <T = unknown>(key: string) => Promise<T | null>;
  setConfig: <T = unknown>(key: string, value: T) => Promise<boolean>;

  // Auto-update events
  onUpdateAvailable: (cb: (info: unknown) => void) => () => void;
  onUpdateDownloaded: (cb: () => void) => () => void;
  installUpdate: () => void;

  // Recent files (OS dock/jump list)
  addRecentDocument: (filePath: string) => void;

  // Print to PDF
  printToPDF: () => Promise<Uint8Array | null>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
