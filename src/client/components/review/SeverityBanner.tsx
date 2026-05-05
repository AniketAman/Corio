import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface SeverityBannerProps {
  counts: { critical: number; high: number; medium: number; low: number };
  noIssuesMessage?: string;
}

export function SeverityBanner({ counts, noIssuesMessage }: SeverityBannerProps) {
  const total = counts.critical + counts.high + counts.medium + counts.low;

  if (total === 0) {
    return (
      <div className={cn('rounded-[var(--radius)] p-4 border mb-4', 'bg-success-muted', 'border-success/30')}>
        <div className="flex items-center gap-3">
          <span className="text-lg">&#x2713;</span>
          <span className="text-sm font-semibold text-success">No security issues found</span>
        </div>
        {noIssuesMessage && (
          <p className="mt-2 text-sm text-text-secondary ml-8">{noIssuesMessage}</p>
        )}
      </div>
    );
  }

  const borderColor = counts.critical > 0
    ? 'border-danger/30'
    : counts.high > 0
      ? 'border-danger/20'
      : counts.medium > 0
        ? 'border-warning/30'
        : 'border-info/30';

  return (
    <div className={cn('rounded-[var(--radius)] p-4 border mb-4 bg-surface-elevated', borderColor)}>
      <div className="flex items-center gap-2 flex-wrap">
        {counts.critical > 0 && (
          <Badge variant="danger" className="text-sm font-semibold px-3 py-1">
            Critical ({counts.critical})
          </Badge>
        )}
        {counts.high > 0 && (
          <Badge variant="danger" className="text-sm px-3 py-1">
            High ({counts.high})
          </Badge>
        )}
        {counts.medium > 0 && (
          <Badge variant="warning" className="text-sm px-3 py-1">
            Medium ({counts.medium})
          </Badge>
        )}
        {counts.low > 0 && (
          <Badge variant="info" className="text-sm px-3 py-1">
            Low ({counts.low})
          </Badge>
        )}
      </div>
    </div>
  );
}
