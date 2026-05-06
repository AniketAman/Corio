import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface CollapsibleSectionProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

export function CollapsibleSection({
  component,
  children,
}: CollapsibleSectionProps): ReactNode {
  const { title, defaultOpen } = component as A2UIComponent & {
    title?: string;
    defaultOpen?: boolean;
  };

  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border border-border rounded-[var(--radius)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-3 bg-surface-elevated hover:bg-surface-hover transition-colors text-left"
      >
        <span className="text-sm font-medium text-text-primary">
          {title ?? 'Section'}
        </span>
        <svg
          className={cn(
            'w-4 h-4 text-text-muted transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-border">{children}</div>
      )}
    </div>
  );
}
