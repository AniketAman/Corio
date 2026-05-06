import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface SummaryStatsRowProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

interface StatEntry {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
}

const variantTextColors: Record<string, string> = {
  default: 'text-text-primary',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

export function SummaryStatsRow({
  component,
  children,
  onAction: _onAction,
}: SummaryStatsRowProps): ReactNode {
  const { stats } = component as A2UIComponent & {
    stats?: StatEntry[];
  };

  const statList = stats ?? [];

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex flex-row gap-3',
          statList.length >= 4 && 'overflow-x-auto'
        )}
      >
        {statList.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-elevated border border-border-subtle rounded-[var(--radius-sm)] px-4 py-3 min-w-0 shrink-0"
          >
            <div
              className={cn(
                'text-lg font-semibold',
                variantTextColors[stat.variant ?? 'default'] ??
                  variantTextColors.default
              )}
            >
              {stat.value}
            </div>
            <div className="text-[12px] text-text-muted uppercase tracking-wider mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
