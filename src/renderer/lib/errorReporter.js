export function installErrorReporter() {
  const log = (level, message, stack, scope = 'renderer') => {
    try {
      if (window?.electronAPI?.logMessage) {
        window.electronAPI.logMessage({ level, message, stack, scope });
      }
    } catch (_) {
      // ignore
    }
  };

  window.addEventListener('error', (event) => {
    const msg = event?.message || 'Uncaught error';
    const stack = event?.error?.stack || '';
    log('error', msg, stack, 'renderer');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || 'Unhandled promise rejection';
    const stack = reason?.stack || '';
    log('error', msg, stack, 'renderer');
  });
}


