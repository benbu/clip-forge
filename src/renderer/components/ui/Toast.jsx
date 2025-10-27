import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export function Toast({ id, message, type = 'info', duration = 3000, onRemove }) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove?.(id), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onRemove]);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove?.(id), 300);
  };

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm min-w-[300px] max-w-md',
          type === 'success' && 'border-green-500/50 bg-green-900/20',
          type === 'error' && 'border-red-500/50 bg-red-900/20',
          type === 'info' && 'border-blue-500/50 bg-blue-900/20',
          type === 'warning' && 'border-yellow-500/50 bg-yellow-900/20'
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5 flex-shrink-0',
            type === 'success' && 'text-green-400',
            type === 'error' && 'text-red-400',
            type === 'info' && 'text-blue-400',
            type === 'warning' && 'text-yellow-400'
          )}
        />
        <p className="text-sm text-zinc-200 flex-1">{message}</p>
        <button
          onClick={handleRemove}
          className="text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

