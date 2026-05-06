import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface CopyButtonProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

export function CopyButton({
  component,
  children,
}: CopyButtonProps): ReactNode {
  const { textToCopy, label } = component as A2UIComponent & {
    textToCopy?: string;
    label?: string;
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium transition-colors',
          'h-7 px-3 text-xs',
          'bg-surface-elevated text-text-secondary border border-border hover:bg-surface-hover hover:text-text-primary',
          copied && 'border-success text-success'
        )}
      >
        {copied ? 'Copied!' : label ?? 'Copy'}
      </button>
      {children}
    </div>
  );
}
