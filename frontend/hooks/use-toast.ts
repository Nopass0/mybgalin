import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

// Simple toast state management
let toastCounter = 0;
const listeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener([...toasts]));
};

export function useToast() {
  const [, setRender] = useState(0);

  const subscribe = useCallback(() => {
    const listener = () => setRender(prev => prev + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
    };

    toasts = [...toasts, newToast];
    notifyListeners();

    // Log for now (can be replaced with proper toast UI later)
    const prefix = options.variant === 'destructive' ? '❌' : '✅';
    console.log(`${prefix} Toast: ${options.title}${options.description ? ' - ' + options.description : ''}`);

    // Auto-dismiss after duration
    const duration = options.duration || 3000;
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, duration);

    return { id };
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      toasts = toasts.filter(t => t.id !== toastId);
    } else {
      toasts = [];
    }
    notifyListeners();
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
