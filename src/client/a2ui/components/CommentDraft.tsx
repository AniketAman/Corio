import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface CommentDraftProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

export function CommentDraft({
  component,
}: CommentDraftProps): ReactNode {
  const { defaultText } = component as A2UIComponent & {
    defaultText?: string;
    findingId?: string;
  };

  const [text, setText] = useState(defaultText ?? '');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const formatted = `> \u{1F4DD} **Finding:** ${defaultText ?? ''}\n\n${text}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  const handleClear = () => {
    setText('');
  };

  return (
    <div className="bg-surface-elevated border border-border rounded-[var(--radius)] p-3 space-y-2">
      <span className="text-xs text-text-muted uppercase font-medium">
        Draft Comment
      </span>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={cn(
          'w-full min-h-[80px] font-mono text-xs bg-surface border border-border-subtle rounded-[var(--radius-sm)] p-2',
          'text-text-primary placeholder:text-text-muted resize-y',
          'focus:outline-none focus:ring-2 focus:ring-accent'
        )}
        placeholder="Write your comment..."
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center justify-center rounded-[var(--radius-sm)] text-xs font-medium transition-colors h-7 px-3 cursor-pointer',
            copied
              ? 'bg-success-muted text-success border border-success/30'
              : 'bg-accent text-white hover:bg-accent-hover'
          )}
        >
          {copied ? 'Copied!' : 'Copy as PR Comment'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center justify-center rounded-[var(--radius-sm)] text-xs font-medium transition-colors h-7 px-3 cursor-pointer text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
