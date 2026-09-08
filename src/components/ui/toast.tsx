import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

type ToastColor = 'success' | 'error';

type ToastState = {
  color: ToastColor;
  message: string;
};

type ToastContextValue = {
  toast: ToastState | null;
  showToast: (message: string, color?: ToastColor) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, color: ToastColor = 'success') => {
      setToast({ color, message });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with ToastProvider
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context.showToast;
}

export function ToastViewport() {
  const context = useContext(ToastContext);
  if (!context?.toast) return null;

  return (
    <div
      className={cn(
        'app-toast pointer-events-none toast toast-center toast-bottom',
        'bottom-[calc(4.5rem+max(0.75rem,env(safe-area-inset-bottom)))]',
      )}
    >
      <div
        className={cn(
          'alert alert-soft',
          context.toast.color === 'error' ? 'alert-error' : 'alert-success',
        )}
        role="status"
      >
        {context.toast.message}
      </div>
    </div>
  );
}
