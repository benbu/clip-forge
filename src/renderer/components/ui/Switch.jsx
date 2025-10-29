import React from 'react';
import { cn } from '@/lib/utils';

const sizeStyles = {
  md: {
    track: 'h-6 w-11',
    thumb: 'h-4 w-4',
    checked: 'translate-x-6',
    unchecked: 'translate-x-1',
  },
  sm: {
    track: 'h-3 w-6',
    thumb: 'h-2 w-2',
    checked: 'translate-x-3',
    unchecked: 'translate-x-1',
  },
};

export function Switch({ checked, onChange, disabled = false, className, size = 'md', ...props }) {
  const styles = sizeStyles[size] ?? sizeStyles.md;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors',
        styles.track,
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
          styles.thumb,
          checked ? styles.checked : styles.unchecked
        )}
      />
    </button>
  );
}

