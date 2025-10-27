import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export function Tooltip({ 
  children, 
  content, 
  side = 'top',
  disabled = false 
}) {
  const [isVisible, setIsVisible] = useState(false);
  
  if (disabled) return children;
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-zinc-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-zinc-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-zinc-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-zinc-800 border-t-transparent border-b-transparent border-l-transparent',
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs text-white bg-zinc-800 rounded shadow-lg whitespace-nowrap pointer-events-none',
            positionClasses[side]
          )}
        >
          {content}
          <div
            className={cn(
              'absolute w-0 h-0 border-4',
              arrowClasses[side]
            )}
          />
        </div>
      )}
    </div>
  );
}

