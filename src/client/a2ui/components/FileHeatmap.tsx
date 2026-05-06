import type { ReactNode } from 'react';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface FileHeatmapProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

interface FileEntry {
  name: string;
  issues: number;
  maxIssues: number;
}

export function FileHeatmap({
  component,
  children,
  onAction,
}: FileHeatmapProps): ReactNode {
  const { files } = component as A2UIComponent & {
    files?: FileEntry[];
  };

  const fileList = files ?? [];
  const maxDisplay = 8;
  const visible = fileList.slice(0, maxDisplay);
  const remaining = fileList.length - maxDisplay;

  const getBarColor = (ratio: number): string => {
    if (ratio >= 0.75) return 'bg-danger';
    if (ratio >= 0.5) return 'bg-warning';
    return 'bg-warning/60';
  };

  return (
    <div className="bg-surface-elevated rounded-[var(--radius)] p-3 border border-border-subtle space-y-2">
      {visible.map((file) => {
        const maxIssues = file.maxIssues > 0 ? file.maxIssues : 1;
        const ratio = file.issues / maxIssues;
        const widthPercent = Math.max(4, ratio * 100);

        return (
          <div key={file.name} className="flex items-center gap-2">
            <button
              type="button"
              className="font-mono text-xs text-text-secondary hover:text-accent truncate w-36 shrink-0 text-left"
              title={file.name}
              onClick={() =>
                onAction({
                  type: 'select-file',
                  payload: { file: file.name },
                })
              }
            >
              {file.name}
            </button>
            <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(ratio)}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className="text-xs text-text-muted w-6 text-right shrink-0">
              {file.issues}
            </span>
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="text-xs text-text-muted pt-1">
          +{remaining} more files
        </div>
      )}
      {children}
    </div>
  );
}
