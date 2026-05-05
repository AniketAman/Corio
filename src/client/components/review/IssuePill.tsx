import { Badge } from '../ui/badge';

interface IssuePillProps {
  text: string;
  fileLine?: string;
  onFileClick?: (file: string) => void;
}

type Severity = 'danger' | 'warning' | 'info';

const SEVERITY_KEYWORDS: Record<Severity, string[]> = {
  danger: ['bug', 'error', 'crash', 'fail', 'break', 'incorrect', 'wrong', 'vulnerability'],
  warning: ['edge case', 'missing', 'undefined', 'null', 'race', 'potential'],
  info: ['consider', 'suggest', 'could', 'might', 'improve', 'minor', 'nit'],
};

const SEVERITY_LABELS: Record<Severity, string> = {
  danger: 'Bug',
  warning: 'Edge Case',
  info: 'Suggestion',
};

function classifySeverity(text: string): Severity {
  const lower = text.toLowerCase();

  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS) as [Severity, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return severity;
    }
  }

  return 'warning';
}

export function IssuePill({ text, fileLine, onFileClick }: IssuePillProps) {
  const severity = classifySeverity(text);
  const label = SEVERITY_LABELS[severity];

  const handleFileClick = () => {
    if (fileLine && onFileClick) {
      const file = fileLine.split(':')[0];
      onFileClick(file);
    }
  };

  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-[var(--radius-sm)] p-3 mb-2">
      <div className="flex items-start gap-2">
        <Badge variant={severity} className="shrink-0 mt-0.5">
          {label}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary leading-snug m-0">{text}</p>
          {fileLine && (
            <button
              type="button"
              onClick={handleFileClick}
              className="text-[11px] font-mono text-accent hover:underline cursor-pointer mt-1 inline-block bg-transparent border-none p-0"
            >
              {fileLine}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
