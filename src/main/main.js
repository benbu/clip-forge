const { app, BrowserWindow, shell, desktopCapturer, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'bridge.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow safe external URLs (basic allowlist)
    try {
      const allowed = ['https://', 'mailto:'];
      if (allowed.some((p) => url.startsWith(p))) {
        shell.openExternal(url);
      }
    } catch (_) {}
    return { action: 'deny' };
  });
};

// IPC Handlers
ipcMain.handle('getScreenSources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen']
    });
    return sources;
  } catch (error) {
    console.error('Error getting screen sources:', error);
    throw error;
  }
});

ipcMain.handle('saveFile', async (event, filePath, buffer) => {
  try {
    await fs.writeFile(filePath, buffer);
    return filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
