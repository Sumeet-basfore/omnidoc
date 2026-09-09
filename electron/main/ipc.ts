import { ipcMain, dialog, safeStorage, app, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { configStore, keychainStore } from './store';

const BINARY_EXTENSIONS = new Set(['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.zip']);

export function registerIpcHandlers() {
  // File dialogs
  ipcMain.handle('dialog:openFile', async (_event, filters) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow || undefined as any, {
      properties: ['openFile'],
      filters: filters || [
        { name: 'All Supported Documents', extensions: ['md', 'markdown', 'pdf', 'docx', 'csv', 'json', 'txt', 'py', 'js', 'ts', 'html', 'css'] },
        { name: 'Markdown (*.md)', extensions: ['md', 'markdown'] },
        { name: 'PDF (*.pdf)', extensions: ['pdf'] },
        { name: 'Word Document (*.docx)', extensions: ['docx'] },
        { name: 'Data (*.csv, *.json)', extensions: ['csv', 'json'] },
        { name: 'Code & Text', extensions: ['txt', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'yaml', 'yml', 'xml', 'sql', 'sh', 'rs', 'go'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (_event, defaultName: string, filters) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(focusedWindow || undefined as any, {
      defaultPath: defaultName,
      filters: filters || [
        { name: 'Markdown (*.md)', extensions: ['md'] },
        { name: 'Word Document (*.docx)', extensions: ['docx'] },
        { name: 'PDF (*.pdf)', extensions: ['pdf'] },
        { name: 'CSV (*.csv)', extensions: ['csv'] },
        { name: 'JSON (*.json)', extensions: ['json'] },
        { name: 'Text (*.txt)', extensions: ['txt'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }
    return result.filePath;
  });

  // File system I/O
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    const isBinary = BINARY_EXTENSIONS.has(ext);

    if (isBinary) {
      const buffer = await fs.readFile(filePath);
      return {
        data: buffer.toString('base64'),
        isBinary: true
      };
    } else {
      const text = await fs.readFile(filePath, 'utf-8');
      return {
        data: text,
        isBinary: false
      };
    }
  });

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string, isBinary: boolean = false) => {
    try {
      if (isBinary) {
        const buffer = Buffer.from(content, 'base64');
        await fs.writeFile(filePath, buffer);
      } else {
        await fs.writeFile(filePath, content, 'utf-8');
      }
      return true;
    } catch (err) {
      console.error('Failed to write file:', err);
      throw err;
    }
  });

  // Secure key storage (safeStorage)
  ipcMain.handle('keychain:isAvailable', () => {
    return safeStorage.isEncryptionAvailable();
  });

  ipcMain.handle('keychain:set', (_event, key: string, value: string) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(value);
        keychainStore.set(key, encrypted.toString('base64'));
      } else {
        // Fallback for environments where OS keychain isn't initialized (e.g. Linux headless)
        keychainStore.set(key, `raw:${Buffer.from(value).toString('base64')}`);
      }
      return true;
    } catch (err) {
      console.error('Failed to store secure key:', err);
      return false;
    }
  });

  ipcMain.handle('keychain:get', (_event, key: string) => {
    try {
      const stored = keychainStore.get(key) as string | undefined;
      if (!stored) return null;

      if (stored.startsWith('raw:')) {
        const rawB64 = stored.slice(4);
        return Buffer.from(rawB64, 'base64').toString('utf-8');
      }

      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(stored, 'base64');
        return safeStorage.decryptString(buffer);
      }
      return null;
    } catch (err) {
      console.error('Failed to retrieve secure key:', err);
      return null;
    }
  });

  ipcMain.handle('keychain:delete', (_event, key: string) => {
    try {
      keychainStore.delete(key);
      return true;
    } catch {
      return false;
    }
  });

  // Store get/set
  ipcMain.handle('store:get', (_event, key: string) => {
    return configStore.get(key);
  });

  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    configStore.set(key, value);
    return true;
  });

  // Recent files
  ipcMain.on('app:addRecentDocument', (_event, filePath: string) => {
    try {
      app.addRecentDocument(filePath);
      const recent = (configStore.get('recentFiles') as string[]) || [];
      const updated = [filePath, ...recent.filter((p) => p !== filePath)].slice(0, 20);
      configStore.set('recentFiles', updated);
    } catch (err) {
      console.warn('Failed to add recent document:', err);
    }
  });

  // Print to PDF
  ipcMain.handle('print:toPDF', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    try {
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4'
      });
      return pdfBuffer;
    } catch (err) {
      console.error('Failed to print to PDF:', err);
      return null;
    }
  });
}
