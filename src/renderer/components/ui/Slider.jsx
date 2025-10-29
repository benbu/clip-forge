import React from 'react';
import { cn } from '@/lib/utils';

const sizeStyles = {
  md: {
    container: 'gap-3',
    track: 'h-2',
    value: 'text-sm',
  },
  sm: {
    container: 'gap-2',
    track: 'h-1',
    value: 'text-xs',
  },
};

export function Slider({
  value = [0],
  onChange,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  showValue = false,
  className,
  size = 'md',
  ...props
}) {
  const styles = sizeStyles[size] ?? sizeStyles.md;

  const actualValue = Array.isArray(value) ? value[0] : value;
  const percentage = ((actualValue - min) / (max - min)) * 100;

  return (
    <div className={cn('flex items-center', styles.container, className)}>
      <div className={cn('flex-1 relative bg-zinc-800 rounded-full overflow-hidden', styles.track)}>
        <div
          className="absolute left-0 top-0 h-full bg-indigo-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={actualValue}
          onChange={(e) => {
            const newValue = Number(e.target.value);
            if (onValueChange) {
              onValueChange([newValue]);
            } else if (onChange) {
              onChange(newValue);
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          {...props}
        />
      </div>
      {showValue && (
        <div className={cn('text-zinc-400 min-w-[3rem] text-right', styles.value)}>
          {actualValue}
        </div>
      )}
    </div>
  );
}
