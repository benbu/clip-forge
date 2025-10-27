import React from 'react';
import { cn } from '@/lib/utils';

export function Card({ children, variant = 'default', className, ...props }) {
  const variants = {
    default: 'bg-zinc-900/40 border border-white/10',
    elevated: 'bg-zinc-800/70 border border-white/10 shadow-lg',
    subtle: 'bg-zinc-950/40 border border-white/5',
  };
  
  return (
    <div
      className={cn('rounded-lg p-4', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

