import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File system
  openFileDialog: (filters?: any) => ipcRenderer.invoke('dialog:openFile', filters),
  saveFileDialog: (defaultName: string, filters?: any) => ipcRenderer.invoke('dialog:saveFile', defaultName, filters),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string, isBinary: boolean = false) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content, isBinary),

  // Secure key storage (safeStorage)
  setSecureKey: (key: string, value: string) => ipcRenderer.invoke('keychain:set', key, value),
  getSecureKey: (key: string) => ipcRenderer.invoke('keychain:get', key),
  deleteSecureKey: (key: string) => ipcRenderer.invoke('keychain:delete', key),
  isEncryptionAvailable: () => ipcRenderer.invoke('keychain:isAvailable'),

  // Non-sensitive config (electron-store)
  getConfig: (key: string) => ipcRenderer.invoke('store:get', key),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),

  // Auto-update events
  onUpdateAvailable: (cb: (info: unknown) => void) => {
    const handler = (_event: unknown, info: unknown) => cb(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
  onUpdateDownloaded: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('update:downloaded', handler);
    return () => ipcRenderer.removeListener('update:downloaded', handler);
  },
  installUpdate: () => ipcRenderer.send('update:install'),

  // Recent documents
  addRecentDocument: (filePath: string) => ipcRenderer.send('app:addRecentDocument', filePath),

  // Print to PDF
  printToPDF: () => ipcRenderer.invoke('print:toPDF')
});
