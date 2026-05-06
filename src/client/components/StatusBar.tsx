import { useReview } from '../context/ReviewContext';
import { Badge } from './ui/badge';
import { useTheme } from '../hooks/useTheme';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="flex items-center gap-0.5 bg-surface-elevated rounded-[var(--radius-sm)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
            theme === opt.value
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBar() {
  const { prData, mode, currentPrUrl, pendingReview } = useReview();

  const pendingCount = pendingReview.comments.length;

  if (!prData) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-t border-border text-xs text-text-muted">
        <span>No PR loaded</span>
        <ThemeToggle />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface border-t border-border text-xs">
      <div className="flex items-center gap-3">
        <Badge variant={mode === 'repo' ? 'success' : 'outline'}>
          {mode === 'repo' ? 'repo mode' : 'standalone'}
        </Badge>
        <span className="text-text-secondary">PR #{prData.number}</span>
        <span className="text-text-muted">{prData.files.length} files</span>
        <span className="flex gap-1.5">
          <span className="text-success">+{prData.additions}</span>
          <span className="text-danger">-{prData.deletions}</span>
        </span>
        {currentPrUrl && (
          <a
            href={currentPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover hover:underline truncate max-w-[300px]"
          >
            {currentPrUrl}
          </a>
        )}
        {pendingCount > 0 && (
          <span className="text-accent font-medium">{pendingCount} pending</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </div>
  );
}
