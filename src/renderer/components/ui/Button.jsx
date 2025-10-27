import React from 'react';
import { cn } from '@/lib/utils';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
  tooltip,
  ariaLabel,
  className,
  iconOnly, // Destructure to prevent passing to DOM
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900';
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-400',
    secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400',
    ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-800 disabled:text-zinc-600',
    outline: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:border-zinc-800 disabled:text-zinc-600',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };
  
  const iconOnlySizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };
  
  const isIconOnly = icon && !children;
  
  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        isIconOnly ? iconOnlySizes[size] : sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      aria-label={tooltip || ariaLabel || children}
      title={tooltip}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && icon && iconPosition === 'left' && icon}
      {children}
      {!isLoading && icon && iconPosition === 'right' && icon}
    </button>
  );
}

