import { useState } from 'react';

interface DiffCommentWidgetProps {
  line: number;
  filePath: string;
  prefill?: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

export function DiffCommentWidget({ line, filePath, prefill, onSubmit, onCancel }: DiffCommentWidgetProps) {
  const [body, setBody] = useState(prefill || '');

  const handleSubmit = () => {
    if (!body.trim()) return;
    onSubmit(body);
  };

  return (
    <div className="mx-4 my-2 border border-border rounded-[var(--radius)] bg-surface-elevated p-3 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-mono text-text-muted">
          {filePath.split('/').pop()}:{line}
        </span>
        {prefill && (
          <span className="text-[10px] text-accent bg-accent-muted px-1.5 py-0.5 rounded">
            AI suggestion
          </span>
        )}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a review comment..."
        rows={3}
        autoFocus
        className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs text-text-muted hover:text-text-secondary bg-transparent border border-border rounded-[var(--radius-sm)] cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="px-3 py-1 text-xs font-medium bg-accent text-white rounded-[var(--radius-sm)] hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add to review
        </button>
      </div>
    </div>
  );
}
