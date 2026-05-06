import type { ReactNode } from 'react';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface ProgressTrackerProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

export function ProgressTracker({
  component,
  children,
}: ProgressTrackerProps): ReactNode {
  const { total, addressed, willFix, acknowledged } =
    component as A2UIComponent & {
      total?: number;
      addressed?: number;
      willFix?: number;
      acknowledged?: number;
    };

  const totalCount = total ?? 0;
  const addressedCount = addressed ?? 0;
  const willFixCount = willFix ?? 0;
  const acknowledgedCount = acknowledged ?? (addressedCount - willFixCount);
  const percentage = totalCount > 0 ? (addressedCount / totalCount) * 100 : 0;
  const willFixPercent =
    totalCount > 0 ? (willFixCount / totalCount) * 100 : 0;
  const acknowledgedPercent =
    totalCount > 0 ? (acknowledgedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          {addressedCount}/{totalCount} addressed
        </span>
        <span className="text-text-muted text-xs">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="h-2 bg-surface rounded-full overflow-hidden flex">
        {willFixPercent > 0 && (
          <div
            className="h-full bg-success transition-all"
            style={{ width: `${willFixPercent}%` }}
          />
        )}
        {acknowledgedPercent > 0 && (
          <div
            className="h-full bg-text-muted transition-all"
            style={{ width: `${acknowledgedPercent}%` }}
          />
        )}
      </div>

      <div className="flex gap-4 text-xs text-text-muted">
        {willFixCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            Will fix: {willFixCount}
          </span>
        )}
        {acknowledgedCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-text-muted" />
            Acknowledged: {acknowledgedCount}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
