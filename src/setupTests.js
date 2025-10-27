import '@testing-library/jest-dom/vitest';

// Provide minimal Electron bridge stubs for renderer tests
if (!window.electronAPI) {
  window.electronAPI = {
    getScreenSources: async () => [],
    saveFile: async () => { throw new Error('saveFile not implemented in tests'); },
  };
}

if (!window.env) {
  window.env = { isDev: false };
}
