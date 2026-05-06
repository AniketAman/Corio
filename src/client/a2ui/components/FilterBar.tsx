import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface FilterBarProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

interface FilterOption {
  id: string;
  label: string;
  variant?: string;
}

const variantColors: Record<string, string> = {
  critical: 'bg-danger-muted text-danger border-danger/30',
  high: 'bg-danger-muted text-danger border-danger/30',
  medium: 'bg-warning-muted text-warning border-warning/30',
  low: 'bg-info-muted text-info border-info/30',
  default: 'bg-accent-muted text-accent border-accent/30',
};

export function FilterBar({
  component,
  children,
  onAction,
}: FilterBarProps): ReactNode {
  const { options, initialSelected } = component as A2UIComponent & {
    options?: FilterOption[];
    initialSelected?: string[];
  };

  const filterOptions: FilterOption[] = options ?? [];
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected ?? filterOptions.map((o) => o.id))
  );

  const toggleFilter = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onAction({
        type: 'filter',
        payload: { selected: Array.from(next) },
      });
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => {
          const isActive = selected.has(opt.id);
          const colorClass =
            variantColors[opt.variant ?? 'default'] ?? variantColors.default;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleFilter(opt.id)}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-all',
                isActive ? colorClass : 'bg-surface text-text-muted border-border opacity-50'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
