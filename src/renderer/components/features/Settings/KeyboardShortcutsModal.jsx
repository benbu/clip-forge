import React from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { shortcuts, shortcutDescriptions, getShortcutLabel } from '@/lib/keyboardShortcuts';

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  const categories = {
    'Playback': [
      { key: shortcuts.PLAY_PAUSE, desc: shortcutDescriptions[shortcuts.PLAY_PAUSE] },
      { key: shortcuts.SKIP_BACK_1S, desc: shortcutDescriptions[shortcuts.SKIP_BACK_1S] },
      { key: shortcuts.SKIP_FORWARD_1S, desc: shortcutDescriptions[shortcuts.SKIP_FORWARD_1S] },
      { key: shortcuts.SKIP_BACK_5S, desc: shortcutDescriptions[shortcuts.SKIP_BACK_5S] },
      { key: shortcuts.SKIP_FORWARD_5S, desc: shortcutDescriptions[shortcuts.SKIP_FORWARD_5S] },
      { key: shortcuts.VOLUME_UP, desc: shortcutDescriptions[shortcuts.VOLUME_UP] },
      { key: shortcuts.VOLUME_DOWN, desc: shortcutDescriptions[shortcuts.VOLUME_DOWN] },
      { key: shortcuts.MUTE, desc: shortcutDescriptions[shortcuts.MUTE] },
      { key: shortcuts.FULLSCREEN, desc: shortcutDescriptions[shortcuts.FULLSCREEN] },
    ],
    'Editing': [
      { key: shortcuts.SPLIT, desc: shortcutDescriptions[shortcuts.SPLIT] },
      { key: shortcuts.DELETE, desc: shortcutDescriptions[shortcuts.DELETE] },
    ],
    'File Operations': [
      { key: shortcuts.IMPORT, desc: shortcutDescriptions[shortcuts.IMPORT] },
      { key: shortcuts.EXPORT, desc: shortcutDescriptions[shortcuts.EXPORT] },
    ],
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-zinc-900 rounded-lg border border-white/10 w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <Button variant="ghost" size="sm" icon={<X className="h-5 w-5" />} iconOnly onClick={onClose} />
        </div>

        <div className="space-y-6 max-h-[600px] overflow-y-auto">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map(({ key, desc }) => (
                  <div 
                    key={key} 
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-zinc-800/50 hover:bg-zinc-800/70 transition-colors"
                  >
                    <span className="text-sm text-zinc-300">{desc}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-zinc-900 border border-white/10 rounded text-zinc-300">
                      {getShortcutLabel(key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-zinc-500">
          Tip: Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded">?</kbd> to open this menu from anywhere
        </div>
      </div>
    </Modal>
  );
}

