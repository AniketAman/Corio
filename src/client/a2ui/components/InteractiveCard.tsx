import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface InteractiveCardProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

const severityColors: Record<string, string> = {
  critical: 'bg-danger-muted text-danger border-danger/30',
  high: 'bg-danger-muted text-danger border-danger/30',
  medium: 'bg-warning-muted text-warning border-warning/30',
  low: 'bg-info-muted text-info border-info/30',
  info: 'bg-accent-muted text-accent border-accent/30',
};

export function InteractiveCard({
  component,
  children,
  onAction,
}: InteractiveCardProps): ReactNode {
  const { title, severity, fileLine } = component as A2UIComponent & {
    title?: string;
    severity?: string;
    fileLine?: string;
  };

  return (
    <div className="bg-surface-elevated border border-border rounded-[var(--radius)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        {severity && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
              severityColors[severity] ?? 'bg-accent-muted text-accent border-accent/30'
            )}
          >
            {severity}
          </span>
        )}
        {title && (
          <span className="text-sm font-medium text-text-primary">
            {title}
          </span>
        )}
      </div>

      {fileLine && (
        <button
          type="button"
          className="text-xs text-accent hover:underline font-mono"
          onClick={() =>
            onAction({ type: 'navigate', payload: { fileLine } })
          }
        >
          {fileLine}
        </button>
      )}

      <div className="space-y-2">{children}</div>
    </div>
  );
}
