import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface VerdictBannerProps {
  verdict: 'yes' | 'with-fixes' | 'no';
  reasoning?: string;
}

export function VerdictBanner({ verdict, reasoning }: VerdictBannerProps) {
  const config = {
    yes: {
      label: 'Ready to merge',
      variant: 'success' as const,
      bg: 'bg-success-muted',
      border: 'border-success/30',
      icon: '✓',
    },
    'with-fixes': {
      label: 'Ready with fixes',
      variant: 'warning' as const,
      bg: 'bg-warning-muted',
      border: 'border-warning/30',
      icon: '⚠',
    },
    no: {
      label: 'Not ready to merge',
      variant: 'danger' as const,
      bg: 'bg-danger-muted',
      border: 'border-danger/30',
      icon: '✗',
    },
  };

  const c = config[verdict];

  return (
    <div className={cn('rounded-[var(--radius)] p-4 border mb-4', c.bg, c.border)}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{c.icon}</span>
        <Badge variant={c.variant} className="text-sm font-semibold px-3 py-1">
          {c.label}
        </Badge>
      </div>
      {reasoning && (
        <p className="mt-2 text-sm text-text-secondary ml-8">{reasoning}</p>
      )}
    </div>
  );
}
