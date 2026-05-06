import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface DiffSnippetProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

export function DiffSnippet({
  component,
  children,
  onAction: _onAction,
}: DiffSnippetProps): ReactNode {
  const { code, language, startLine, highlightLines } =
    component as A2UIComponent & {
      code?: string;
      language?: string;
      startLine?: number;
      highlightLines?: number[];
    };

  const lines = (code ?? '').split('\n');
  const firstLine = startLine ?? 1;
  const highlighted = new Set(highlightLines ?? []);

  const fileName = (component as A2UIComponent & { fileName?: string })
    .fileName;

  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-[var(--radius)] overflow-hidden">
      {fileName && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle bg-surface">
          <span className="text-xs text-text-muted font-mono">{fileName}</span>
          {startLine != null && (
            <span className="text-xs text-text-muted">
              L{firstLine}&ndash;{firstLine + lines.length - 1}
            </span>
          )}
        </div>
      )}
      <div
        className="font-mono text-xs leading-relaxed p-3 overflow-x-auto"
        data-language={language}
      >
        {lines.map((line, i) => {
          const lineNum = firstLine + i;
          const isHighlighted = highlighted.has(lineNum);
          return (
            <div
              key={lineNum}
              className={cn(
                'flex',
                isHighlighted &&
                  'bg-danger-muted border-l-2 border-danger -ml-3 pl-3'
              )}
            >
              <span className="select-none text-text-muted w-8 shrink-0 text-right pr-3">
                {lineNum}
              </span>
              <span
                className={cn(
                  'flex-1 whitespace-pre',
                  isHighlighted ? 'text-text-primary' : 'text-text-secondary'
                )}
              >
                {line}
              </span>
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}
