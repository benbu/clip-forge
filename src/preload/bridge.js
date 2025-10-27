const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe API surface for the renderer
contextBridge.exposeInMainWorld('env', {
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
});

// IPC API
contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: () => ipcRenderer.invoke('getScreenSources'),
  saveFile: (filePath, buffer) => ipcRenderer.invoke('saveFile', filePath, buffer),
});

