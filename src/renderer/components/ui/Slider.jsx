import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export function Slider({ 
  value = [0], 
  onChange,
  onValueChange, 
  min = 0, 
  max = 100, 
  step = 1,
  showValue = false,
  className,
  ...props 
}) {
  const [isDragging, setIsDragging] = useState(false);
  
  // Support both single value and array of values
  const actualValue = Array.isArray(value) ? value[0] : value;
  const percentage = ((actualValue - min) / (max - min)) * 100;
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 relative h-2 bg-zinc-800 rounded-full overflow-hidden">
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
          className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          {...props}
        />
      </div>
      {showValue && (
        <div className="text-sm text-zinc-400 min-w-[3rem] text-right">
          {actualValue}
        </div>
      )}
    </div>
  );
}
