import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface BeforeAfterCodeProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

export function BeforeAfterCode({
  component,
  children,
  onAction: _onAction,
}: BeforeAfterCodeProps): ReactNode {
  const { before, after, language } = component as A2UIComponent & {
    before?: string;
    after?: string;
    language?: string;
  };

  const [copied, setCopied] = useState(false);

  const handleCopyFix = async () => {
    if (!after) return;
    try {
      await navigator.clipboard.writeText(after);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-2"
        data-language={language}
      >
        {/* Before panel */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-danger">Before</span>
          <pre className="font-mono text-xs p-3 rounded-[var(--radius-sm)] overflow-x-auto bg-danger-muted text-text-primary leading-relaxed">
            {before ?? ''}
          </pre>
        </div>
        {/* After panel */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-success">After</span>
          <pre className="font-mono text-xs p-3 rounded-[var(--radius-sm)] overflow-x-auto bg-success-muted text-text-primary leading-relaxed">
            {after ?? ''}
          </pre>
        </div>
      </div>
      {after && (
        <button
          type="button"
          onClick={handleCopyFix}
          className={cn(
            'inline-flex items-center justify-center rounded-[var(--radius-sm)] text-xs font-medium transition-colors',
            'h-7 px-3',
            'bg-surface-elevated text-text-secondary border border-border hover:bg-surface-hover hover:text-text-primary',
            copied && 'border-success text-success'
          )}
        >
          {copied ? 'Copied!' : 'Copy fix'}
        </button>
      )}
      {children}
    </div>
  );
}
