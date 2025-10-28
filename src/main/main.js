const {
  app,
  BrowserWindow,
  shell,
  desktopCapturer,
  ipcMain,
  dialog,
} = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Mitigate Windows flicker/occlusion issues and allow optional GPU disable
if (process.platform === 'win32') {
  // Disables occlusion tracking which can cause black/flicker frames on some GPUs/drivers
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
}
if (process.env.CLIPFORGE_DISABLE_GPU === '1') {
  // For stubborn GPU/driver combos, allow opting out of hardware acceleration
  app.disableHardwareAcceleration();
}

let mainWindow;
const isDev = !app.isPackaged;

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

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (isDev ? 'http://localhost:5173' : null);
  if (devServerUrl) {
    if (isDev) {
      console.log(`Loading renderer from ${devServerUrl}`);
    }
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
const serializeSource = (source) => {
  const thumbnail =
    source.thumbnail && typeof source.thumbnail.toDataURL === 'function'
      ? source.thumbnail.toDataURL()
      : null;
  const appIcon =
    source.appIcon && typeof source.appIcon.toDataURL === 'function'
      ? source.appIcon.toDataURL()
      : null;

  return {
    id: source.id,
    name: source.name,
    displayId: source.display_id,
    thumbnail,
    appIcon,
    primary: source.id?.toLowerCase().includes('screen'),
  };
};

ipcMain.handle('getScreenSources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });
    return sources.map(serializeSource);
  } catch (error) {
    console.error('Error getting screen sources:', error);
    throw error;
  }
});

ipcMain.handle('saveFile', async (event, filePath, buffer) => {
  try {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });

    const data =
      buffer instanceof Uint8Array
        ? Buffer.from(buffer)
        : Buffer.from(buffer);

    await fs.writeFile(filePath, data);
    return filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
});

ipcMain.handle('logMessage', async (event, payload = {}) => {
  try {
    const { level = 'info', message = '', scope = 'app', stack = '' } = payload;
    const timestamp = new Date().toISOString();
    const logDir = path.join(app.getPath('userData'), 'logs');
    await fs.mkdir(logDir, { recursive: true });
    const filePath = path.join(logDir, 'clipforge.log');

    const entryLines = [
      `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${message}`,
    ];

    if (stack) {
      entryLines.push(stack);
    }

    entryLines.push(''); // trailing newline

    await fs.appendFile(filePath, entryLines.join('\n'), 'utf8');

    return filePath;
  } catch (error) {
    console.error('Error writing log entry:', error);
    throw error;
  }
});

ipcMain.handle('chooseExportPath', async (event, suggestedName) => {
  try {
    const defaultDir =
      app.getPath('videos') || app.getPath('documents') || app.getPath('downloads');
    const defaultPath = path.join(
      defaultDir,
      suggestedName || `ClipForge-${Date.now()}.mp4`
    );

    const result = await dialog.showSaveDialog({
      title: 'Export Video',
      defaultPath,
      filters: [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) return null;
    return result.filePath;
  } catch (error) {
    console.error('Error choosing export path:', error);
    throw error;
  }
});

const sanitizeFileName = (value) =>
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, ' ').trim();

ipcMain.handle('prepareRecordingPath', async (event, options = {}) => {
  try {
    const { extension = 'webm', fileName = null } = options || {};
    const baseDir =
      app.getPath('videos') ||
      app.getPath('documents') ||
      app.getPath('downloads');
    const recordingsDir = path.join(baseDir, 'ClipForge', 'Recordings');

    await fs.mkdir(recordingsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawName =
      fileName && typeof fileName === 'string'
        ? sanitizeFileName(fileName)
        : `ClipForge-Recording-${timestamp}`;

    const safeName = rawName.endsWith(`.${extension}`)
      ? rawName
      : `${rawName}.${extension}`;

    return path.join(recordingsDir, safeName);
  } catch (error) {
    console.error('Error preparing recording path:', error);
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
