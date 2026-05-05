import { cn } from '../../lib/utils';

interface ConfidenceBarProps {
  score: number;
  className?: string;
}

export function ConfidenceBar({ score, className }: ConfidenceBarProps) {
  const color = score >= 90
    ? 'bg-danger'
    : score >= 80
      ? 'bg-warning'
      : 'bg-info';

  const label = score >= 90 ? 'Critical' : score >= 80 ? 'Important' : 'Minor';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden max-w-[60px]">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] text-text-muted font-mono">{score}</span>
      <span className={cn(
        'text-[10px] font-medium',
        score >= 90 ? 'text-danger' : score >= 80 ? 'text-warning' : 'text-info'
      )}>
        {label}
      </span>
    </div>
  );
}
