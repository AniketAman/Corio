import { useReview } from '../context/ReviewContext';
import { Badge } from './ui/badge';

export function StatusBar() {
  const { prData, mode } = useReview();

  if (!prData) {
    return (
      <div className="px-4 py-2 bg-surface border-t border-border text-xs text-text-muted">
        No PR loaded
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface border-t border-border text-xs">
      <Badge variant={mode === 'repo' ? 'success' : 'outline'}>
        {mode === 'repo' ? 'repo mode' : 'standalone'}
      </Badge>
      <span className="text-text-secondary">PR #{prData.number}</span>
      <span className="text-text-muted">{prData.files.length} files</span>
      <span className="flex gap-1.5">
        <span className="text-success">+{prData.additions}</span>
        <span className="text-danger">-{prData.deletions}</span>
      </span>
    </div>
  );
}
