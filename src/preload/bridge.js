const { contextBridge } = require('electron');

// Minimal, safe API surface for the renderer
contextBridge.exposeInMainWorld('env', {
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
});

