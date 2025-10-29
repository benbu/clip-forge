import React from 'react';
import { cn } from '@/lib/utils';

const SIZE_CONFIG = {
  sm: {
    wrapper: 'h-5 w-9',
    thumb: 'h-3.5 w-3.5',
    translateOn: 'translate-x-5',
    translateOff: 'translate-x-1',
  },
  md: {
    wrapper: 'h-6 w-11',
    thumb: 'h-4 w-4',
    translateOn: 'translate-x-6',
    translateOff: 'translate-x-1',
  },
};

export function Switch({
  checked,
  onChange,
  disabled = false,
  className,
  size = 'md',
  ...props
}) {
  const config = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors',
        config.wrapper,
        checked ? 'bg-indigo-600' : 'bg-zinc-700',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white transition-transform',
          config.thumb,
          checked ? config.translateOn : config.translateOff
        )}
      />
    </button>
  );
}

