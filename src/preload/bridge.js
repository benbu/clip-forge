const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe API surface for the renderer
contextBridge.exposeInMainWorld('env', {
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
});

// IPC API
contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: () => ipcRenderer.invoke('getScreenSources'),
  saveFile: (filePath, buffer) => ipcRenderer.invoke('saveFile', filePath, buffer),
  logMessage: (payload) => ipcRenderer.invoke('logMessage', payload),
  chooseExportPath: (suggestedName) => ipcRenderer.invoke('chooseExportPath', suggestedName),
  prepareRecordingPath: (options) => ipcRenderer.invoke('prepareRecordingPath', options),
  updateRecordingStatus: (payload) => ipcRenderer.invoke('updateRecordingStatus', payload),
  onTrayRecordingCommand: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, command) => {
      try {
        callback(command);
      } catch (error) {
        console.error('Tray recording command listener error:', error);
      }
    };
    ipcRenderer.on('tray-recording-command', listener);
    return () => {
      ipcRenderer.removeListener('tray-recording-command', listener);
    };
  },
});
