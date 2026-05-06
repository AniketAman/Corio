import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

type TriageState = 'unchecked' | 'acknowledged' | 'will-fix';

interface AcknowledgeCheckboxProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

const stateConfig: Record<TriageState, { label: string; color: string }> = {
  unchecked: { label: 'Not reviewed', color: 'text-text-muted' },
  acknowledged: { label: 'Acknowledged', color: 'text-warning' },
  'will-fix': { label: 'Will fix', color: 'text-success' },
};

const stateOrder: TriageState[] = ['unchecked', 'acknowledged', 'will-fix'];

export function AcknowledgeCheckbox({
  component,
  children,
  onAction,
}: AcknowledgeCheckboxProps): ReactNode {
  const { findingId, label, initialState } = component as A2UIComponent & {
    findingId?: string;
    label?: string;
    initialState?: TriageState;
  };

  const [state, setState] = useState<TriageState>(initialState ?? 'unchecked');

  const handleClick = () => {
    const currentIndex = stateOrder.indexOf(state);
    const nextState = stateOrder[(currentIndex + 1) % stateOrder.length];
    setState(nextState);
    onAction({
      type: 'acknowledge',
      payload: { findingId: findingId ?? component.id, state: nextState },
    });
  };

  const config = stateConfig[state];

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center justify-center w-5 h-5 rounded border transition-colors',
          state === 'unchecked' && 'border-border bg-surface',
          state === 'acknowledged' && 'border-warning bg-warning-muted',
          state === 'will-fix' && 'border-success bg-success-muted'
        )}
      >
        {state === 'acknowledged' && (
          <span className="text-warning text-xs font-bold">-</span>
        )}
        {state === 'will-fix' && (
          <svg
            className="w-3 h-3 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-text-primary">
          {label ?? 'Finding'}
        </span>
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      </div>

      {children}
    </div>
  );
}
