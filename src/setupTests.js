import '@testing-library/jest-dom/vitest';

// Provide minimal Electron bridge stubs for renderer tests
if (!window.electronAPI) {
  window.electronAPI = {
    getScreenSources: async () => [],
    saveFile: async () => { throw new Error('saveFile not implemented in tests'); },
    chooseExportPath: async () => null,
    logMessage: async () => '/tmp/clipforge-test.log',
  };
}

if (!window.env) {
  window.env = { isDev: false };
}
