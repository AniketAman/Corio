import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { createCatalog } from './catalog';
import type { A2UIAction, A2UICatalog, A2UIPanelProps } from './catalog/types';
import { useA2UI, type TreeNode } from './hooks/useA2UI';

function RenderTree({
  nodes,
  catalog,
  onAction,
}: {
  nodes: TreeNode[];
  catalog: A2UICatalog;
  onAction: (action: A2UIAction) => void;
}): ReactNode {
  return (
    <>
      {nodes.map((node) => {
        const renderer = catalog.renderers[node.component.component];
        if (!renderer) {
          // Fallback: render children without a wrapper
          return (
            <div key={node.component.id} className="space-y-2">
              <RenderTree
                nodes={node.children}
                catalog={catalog}
                onAction={onAction}
              />
            </div>
          );
        }

        const childContent =
          node.children.length > 0 ? (
            <RenderTree
              nodes={node.children}
              catalog={catalog}
              onAction={onAction}
            />
          ) : null;

        return (
          <div key={node.component.id}>
            {renderer({
              component: node.component,
              children: childContent,
              onAction,
            })}
          </div>
        );
      })}
    </>
  );
}

export function A2UIPanel({
  payload,
  loading,
  error: externalError,
  onAction,
  onFallback,
  className,
}: A2UIPanelProps): ReactNode {
  const catalog = useMemo(() => createCatalog(), []);
  const { tree, error: processError, ready } = useA2UI(payload, catalog);
  const [renderError, setRenderError] = useState<string | null>(null);

  const handleAction = (action: A2UIAction) => {
    onAction?.(action);
  };

  const error = externalError ?? processError ?? renderError;

  if (loading) {
    return (
      <div className={cn('flex items-center gap-3 p-4', className)}>
        <svg
          className="animate-spin h-4 w-4 text-accent"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-text-secondary">
          Rendering interactive view...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 space-y-3', className)}>
        <div className="flex items-center gap-2 text-danger text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>{error}</span>
        </div>
        {onFallback && (
          <button
            type="button"
            onClick={onFallback}
            className="inline-flex items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium h-9 px-4 bg-surface-elevated text-text-secondary border border-border hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            Fall back to classic view
          </button>
        )}
      </div>
    );
  }

  if (!ready || !tree) {
    return null;
  }

  // Error boundary via try/catch in render
  try {
    return (
      <div className={cn('space-y-3', className)}>
        <RenderTree nodes={tree} catalog={catalog} onAction={handleAction} />
      </div>
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Rendering failed';
    if (!renderError) {
      setRenderError(msg);
    }
    return null;
  }
}
