import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface VoteButtonsProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

type Vote = 'up' | 'down' | 'na';

export function VoteButtons({
  component,
  onAction,
}: VoteButtonsProps): ReactNode {
  const { findingId, voted } = component as A2UIComponent & {
    findingId?: string;
    voted?: Vote | null;
  };

  const [selected, setSelected] = useState<Vote | null>(voted ?? null);

  const handleVote = (vote: Vote) => {
    const next = selected === vote ? null : vote;
    setSelected(next);
    onAction({
      type: 'vote',
      payload: { findingId: findingId ?? component.id, vote: next ?? vote },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleVote('up')}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--radius-sm)] h-7 px-2 text-xs font-medium transition-colors cursor-pointer border',
          selected === 'up'
            ? 'bg-success-muted text-success border-success/30'
            : 'bg-transparent text-text-secondary border-border hover:bg-surface-hover hover:text-text-primary'
        )}
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => handleVote('down')}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--radius-sm)] h-7 px-2 text-xs font-medium transition-colors cursor-pointer border',
          selected === 'down'
            ? 'bg-danger-muted text-danger border-danger/30'
            : 'bg-transparent text-text-secondary border-border hover:bg-surface-hover hover:text-text-primary'
        )}
      >
        👎
      </button>
      <button
        type="button"
        onClick={() => handleVote('na')}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--radius-sm)] h-7 px-2 text-xs font-medium transition-colors cursor-pointer border',
          selected === 'na'
            ? 'bg-surface-elevated text-text-muted border-border'
            : 'bg-transparent text-text-secondary border-border hover:bg-surface-hover hover:text-text-primary'
        )}
      >
        N/A
      </button>
    </div>
  );
}
