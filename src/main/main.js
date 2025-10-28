const {
  app,
  BrowserWindow,
  shell,
  desktopCapturer,
  ipcMain,
  dialog,
  Tray,
  Menu,
  nativeImage,
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
let appTray = null;
let trayRecordingStatus = { state: 'idle' };

const TRAY_ICON_IDLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAJUlEQVR4AWP4//8/AxJgYGBg+I8BxiUGhBCYgYGB4TgYBAAtPwP8ZUBKZAAAAABJRU5ErkJggg==';

const TRAY_ICON_RECORDING =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAANklEQVR4AWP8//8/Awbw////NwyMmQAETAEkIwMDA8P/DwMDgzAMYGBg0DBg0A1EkwYAtBkQ/8bbcMUAAAAASUVORK5CYII=';

const ALLOWED_RECORDING_STATES = new Set([
  'idle',
  'preparing',
  'countdown',
  'recording',
  'paused',
  'saving',
]);

const getTrayIcon = (state = 'idle') => {
  const dataUrl = state === 'recording' ? TRAY_ICON_RECORDING : TRAY_ICON_IDLE;
  const image = nativeImage.createFromDataURL(dataUrl);
  if (process.platform === 'darwin') {
    image.setTemplateImage(state !== 'recording');
  }
  return image;
};

const showMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
};

const sendTrayCommand = (command) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('tray-recording-command', command);
};

const formatElapsed = (totalSeconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatTrayTooltip = (status) => {
  switch (status.state) {
    case 'preparing':
      return 'ClipForge — Preparing recording';
    case 'countdown':
      return `ClipForge — Recording starts in ${status.countdownSeconds ?? 0}s`;
    case 'recording':
      return `ClipForge — Recording ${formatElapsed(status.elapsedSeconds)}${
        status.isAudioMuted ? ' (Muted)' : ''
      }`;
    case 'paused':
      return 'ClipForge — Recording paused';
    case 'saving':
      return 'ClipForge — Saving recording…';
    default:
      return 'ClipForge — Ready';
  }
};

const buildTrayMenu = (status) => {
  const template = [
    {
      label: 'Open ClipForge',
      click: showMainWindow,
    },
  ];

  if (status.state === 'recording' || status.state === 'paused') {
    template.push({
      label: status.state === 'paused' ? 'Resume Recording' : 'Pause Recording',
      click: () =>
        sendTrayCommand(status.state === 'paused' ? 'resume-recording' : 'pause-recording'),
    });
  }

  if (['preparing', 'countdown', 'recording', 'paused', 'saving'].includes(status.state)) {
    template.push({
      label: status.state === 'saving' ? 'Saving Recording…' : 'Stop Recording',
      enabled: status.state !== 'saving',
      click: () => sendTrayCommand('stop-recording'),
    });
  }

  template.push({ type: 'separator' });
  template.push({
    label: 'Quit ClipForge',
    click: () => {
      app.quit();
    },
  });

  return Menu.buildFromTemplate(template);
};

const ensureTray = () => {
  if (appTray && !appTray.isDestroyed()) {
    return appTray;
  }
  if (!Tray) return null;

  appTray = new Tray(getTrayIcon(trayRecordingStatus.state));
  appTray.setToolTip(formatTrayTooltip(trayRecordingStatus));
  appTray.setContextMenu(buildTrayMenu(trayRecordingStatus));
  appTray.on('click', showMainWindow);
  return appTray;
};

const updateTrayStatus = (status) => {
  trayRecordingStatus = status;
  const tray = ensureTray();
  if (!tray) return;

  tray.setImage(getTrayIcon(status.state));
  tray.setToolTip(formatTrayTooltip(status));

  if (process.platform === 'darwin' && typeof tray.setTitle === 'function') {
    if (status.state === 'recording') {
      tray.setTitle(`● ${formatElapsed(status.elapsedSeconds)}`);
    } else if (status.state === 'paused') {
      tray.setTitle('⏸');
    } else if (status.state === 'countdown') {
      tray.setTitle(`…${status.countdownSeconds ?? ''}`);
    } else {
      tray.setTitle('');
    }
  }

  tray.setContextMenu(buildTrayMenu(status));
};

const normalizeRecordingStatus = (payload = {}) => {
  const state = ALLOWED_RECORDING_STATES.has(payload.state) ? payload.state : 'idle';
  const countdownSeconds = Number.isFinite(payload.countdownSeconds)
    ? Math.max(0, Math.round(payload.countdownSeconds))
    : null;
  const elapsedSeconds = Number.isFinite(payload.elapsedSeconds)
    ? Math.max(0, Math.round(payload.elapsedSeconds))
    : 0;

  return {
    state,
    countdownSeconds,
    elapsedSeconds,
    isAudioMuted: Boolean(payload.isAudioMuted),
    audioEnabled: payload.audioEnabled !== false,
    cameraEnabled: Boolean(payload.cameraEnabled),
  };
};

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

ipcMain.handle('updateRecordingStatus', async (_event, payload = {}) => {
  try {
    const status = normalizeRecordingStatus(payload);
    updateTrayStatus(status);
    return { success: true };
  } catch (error) {
    console.error('Failed to update recording status:', error);
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
  ensureTray();
  updateTrayStatus(trayRecordingStatus);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (appTray && !appTray.isDestroyed()) {
    appTray.destroy();
    appTray = null;
  }
});
