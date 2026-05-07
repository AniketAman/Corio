import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

type ToastVariant = 'success' | 'info' | 'warning';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-success-muted border-success/30 text-success',
  info: 'bg-info-muted border-info/30 text-info',
  warning: 'bg-warning-muted border-warning/30 text-warning',
};

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);
    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius)] border text-sm shadow-lg transition-all duration-200 ${VARIANT_STYLES[toast.variant]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span className="text-base leading-none mt-0.5">{ICONS[toast.variant]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px]">{toast.title}</div>
        {toast.description && (
          <div className="text-[11px] opacity-80 mt-0.5">{toast.description}</div>
        )}
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(({ title, description, variant = 'info', duration = 3000 }: {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
  }) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-2), { id, title, description, variant, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[320px]">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
