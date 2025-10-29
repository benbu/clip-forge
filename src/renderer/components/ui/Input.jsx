import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const sizeStyles = {
  md: 'h-10 px-3 py-2 text-sm',
  sm: 'h-5 px-2 py-1 text-[11px]',
};

export const Input = forwardRef(function Input({ type = 'text', error, className, size = 'md', ...props }, ref) {
  const sizeClass = sizeStyles[size] ?? sizeStyles.md;

  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex w-full rounded-md border bg-zinc-900',
        sizeClass,
        'text-zinc-100 placeholder:text-zinc-500',
        'border-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
        className
      )}
      {...props}
    />
  );
});

