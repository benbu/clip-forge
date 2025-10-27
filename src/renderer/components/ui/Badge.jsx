import React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ children, variant = 'default', size = 'md', className, ...props }) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300',
    primary: 'bg-indigo-600 text-white',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-600 text-white',
    error: 'bg-red-600 text-white',
  };
  
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  
  return (
    <span
      className={cn('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
}

