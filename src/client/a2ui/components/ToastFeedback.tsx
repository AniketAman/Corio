import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface ToastFeedbackProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

type ToastVariant = 'success' | 'info' | 'warning';

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-success-muted text-success border border-success/30',
  info: 'bg-info-muted text-info border border-info/30',
  warning: 'bg-warning-muted text-warning border border-warning/30',
};

const variantIcons: Record<ToastVariant, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
};

export function ToastFeedback({
  component,
}: ToastFeedbackProps): ReactNode {
  const { message, variant, duration, visible } = component as A2UIComponent & {
    message?: string;
    variant?: ToastVariant;
    duration?: number;
    visible?: boolean;
  };

  const [show, setShow] = useState(visible ?? false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        setTimeout(() => setShow(false), 200);
      }, duration ?? 2000);
      return () => clearTimeout(timer);
    } else {
      setAnimating(false);
      setTimeout(() => setShow(false), 200);
    }
  }, [visible, duration]);

  if (!show) return null;

  const v: ToastVariant = variant ?? 'info';

  return (
    <div
      className={cn(
        'rounded-[var(--radius)] px-4 py-2 text-xs font-medium shadow-elevated inline-flex items-center gap-2 transition-all duration-200',
        variantClasses[v],
        animating
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-1'
      )}
    >
      <span>{variantIcons[v]}</span>
      <span>{message ?? ''}</span>
    </div>
  );
}
