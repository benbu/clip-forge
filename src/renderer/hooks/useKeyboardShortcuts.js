import { useEffect } from 'react';
import { shortcuts, matchesShortcut } from '@/lib/keyboardShortcuts';

export function useKeyboardShortcuts(handlers, dependencies = []) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Check each shortcut
      for (const [action, shortcut] of Object.entries(shortcuts)) {
        if (matchesShortcut(e, shortcut)) {
          const handler = handlers[action];
          if (handler) {
            e.preventDefault();
            handler();
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
}

