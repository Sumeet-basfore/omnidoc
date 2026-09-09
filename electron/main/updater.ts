import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Only check for updates in packaged builds
  if (process.env.NODE_ENV === 'development' || !mainWindow) {
    return;
  }

  try {
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', (info) => {
      mainWindow.webContents.send('update:available', info);
    });

    autoUpdater.on('update-downloaded', () => {
      mainWindow.webContents.send('update:downloaded');
    });

    ipcMain.on('update:install', () => {
      autoUpdater.quitAndInstall();
    });
  } catch (err) {
    console.warn('Auto-updater initialization error:', err);
  }
}
