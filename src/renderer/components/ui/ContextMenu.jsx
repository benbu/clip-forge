import React from 'react';
import { cn } from '@/lib/utils';

export function ContextMenu({ items, position, onClose }) {
  if (!position) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[180px] rounded-lg border border-white/10 bg-zinc-800 p-1 shadow-lg backdrop-blur-sm"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={index} className="my-1 h-px bg-white/10" />;
          }

          if (item.disabled) {
            return (
              <div
                key={index}
                className="px-3 py-1.5 text-sm text-zinc-500 cursor-not-allowed select-none"
              >
                {item.label}
              </div>
            );
          }

          const Icon = item.icon;

          return (
            <button
              key={index}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
                'hover:bg-zinc-700 text-zinc-300',
                item.destructive && 'text-red-400 hover:bg-red-500/10'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{item.label}</span>
              {item.shortcut && (
                <span className="ml-auto text-xs text-zinc-500">{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

