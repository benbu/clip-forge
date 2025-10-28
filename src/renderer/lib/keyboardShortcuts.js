// Keyboard shortcuts handler for ClipForge

export const shortcuts = {
  PLAY_PAUSE: 'Space',
  SKIP_BACK_1S: 'ArrowLeft',
  SKIP_FORWARD_1S: 'ArrowRight',
  SKIP_BACK_5S: 'Shift+ArrowLeft',
  SKIP_FORWARD_5S: 'Shift+ArrowRight',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  MUTE: 'm',
  FULLSCREEN: 'f',
  SPLIT: 's',
  DELETE: 'Delete',
  UNDO: 'Ctrl+z',
  REDO: 'Ctrl+Shift+z',
  ZOOM_IN: 'Ctrl+Plus',
  ZOOM_OUT: 'Ctrl+Minus',
  EXPORT: 'Ctrl+E',
  IMPORT: 'Ctrl+I',
  PERF_TOGGLE: 'Ctrl+Shift+P',
};

// Parse keyboard event to string representation
export function parseKey(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  
  if (e.key === ' ') parts.push('Space');
  else if (e.key === '+') parts.push('Plus');
  else if (e.key === '-') parts.push('Minus');
  else if (e.key.length === 1) parts.push(e.key.toUpperCase());
  else parts.push(e.key);
  
  return parts.join('+');
}

// Check if a keyboard event matches a shortcut
export function matchesShortcut(e, shortcut) {
  const parsed = parseKey(e);
  return parsed === shortcut;
}

// Get human-readable shortcut name
export function getShortcutLabel(shortcut) {
  return shortcut
    .split('+')
    .map(k => {
      switch(k) {
        case 'Ctrl': return 'Ctrl';
        case 'Shift': return 'Shift';
        case 'Alt': return 'Alt';
        case 'Space': return '␣';
        case 'Plus': return '+';
        case 'Minus': return '-';
        case 'ArrowLeft': return '←';
        case 'ArrowRight': return '→';
        case 'ArrowUp': return '↑';
        case 'ArrowDown': return '↓';
        default: return k;
      }
    })
    .join(' + ');
}

// Shortcut descriptions for UI
export const shortcutDescriptions = {
  [shortcuts.PLAY_PAUSE]: 'Play/Pause',
  [shortcuts.SKIP_BACK_1S]: 'Skip back 1 second',
  [shortcuts.SKIP_FORWARD_1S]: 'Skip forward 1 second',
  [shortcuts.SKIP_BACK_5S]: 'Skip back 5 seconds',
  [shortcuts.SKIP_FORWARD_5S]: 'Skip forward 5 seconds',
  [shortcuts.VOLUME_UP]: 'Volume up',
  [shortcuts.VOLUME_DOWN]: 'Volume down',
  [shortcuts.MUTE]: 'Mute/Unmute',
  [shortcuts.FULLSCREEN]: 'Toggle fullscreen',
  [shortcuts.SPLIT]: 'Split at playhead',
  [shortcuts.DELETE]: 'Delete selected',
  [shortcuts.EXPORT]: 'Export video',
  [shortcuts.IMPORT]: 'Import video',
  [shortcuts.PERF_TOGGLE]: 'Toggle performance overlay',
};

