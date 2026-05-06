import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { Button } from './ui/button';

interface ReviewSubmitPopoverProps {
  onClose: () => void;
}

export function ReviewSubmitPopover({ onClose }: ReviewSubmitPopoverProps) {
  const {
    pendingReview,
    removePendingComment,
    submitReview,
    reviewSubmitting,
    reviewSubmitError,
  } = useReview();

  const [verdict, setVerdict] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'>('COMMENT');
  const [summaryBody, setSummaryBody] = useState('');

  const canSubmit =
    verdict === 'APPROVE' ||
    verdict === 'REQUEST_CHANGES' ||
    pendingReview.comments.length > 0 ||
    summaryBody.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || reviewSubmitting) return;

    await submitReview(verdict, summaryBody.trim() || undefined);

    if (!reviewSubmitError) {
      onClose();
    }
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-[380px] bg-surface-elevated border border-border rounded-[var(--radius)] shadow-lg z-50">
      <div className="p-4 space-y-4">
        {/* Verdict Picker */}
        <div>
          <label className="text-sm font-medium text-text-primary block mb-2">
            Review Verdict
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setVerdict('APPROVE')}
              className={`flex-1 h-9 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-all ${
                verdict === 'APPROVE'
                  ? 'bg-success text-white ring-2 ring-success ring-offset-2 ring-offset-surface-elevated'
                  : 'bg-success-muted text-success hover:bg-success/30'
              }`}
              disabled={reviewSubmitting}
            >
              Approve
            </button>
            <button
              onClick={() => setVerdict('REQUEST_CHANGES')}
              className={`flex-1 h-9 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-all ${
                verdict === 'REQUEST_CHANGES'
                  ? 'bg-danger text-white ring-2 ring-danger ring-offset-2 ring-offset-surface-elevated'
                  : 'bg-danger-muted text-danger hover:bg-danger/30'
              }`}
              disabled={reviewSubmitting}
            >
              Request Changes
            </button>
            <button
              onClick={() => setVerdict('COMMENT')}
              className={`flex-1 h-9 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-all ${
                verdict === 'COMMENT'
                  ? 'bg-surface-hover text-text-primary ring-2 ring-border ring-offset-2 ring-offset-surface-elevated'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
              disabled={reviewSubmitting}
            >
              Comment
            </button>
          </div>
        </div>

        {/* Summary Textarea */}
        <div>
          <label className="text-sm font-medium text-text-primary block mb-2">
            Summary (optional)
          </label>
          <textarea
            value={summaryBody}
            onChange={(e) => setSummaryBody(e.target.value)}
            placeholder="Overall review summary..."
            className="w-full h-20 px-3 py-2 bg-surface text-text-primary border border-border rounded-[var(--radius-sm)] text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none"
            disabled={reviewSubmitting}
          />
        </div>

        {/* Pending Comments List */}
        {pendingReview.comments.length > 0 && (
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              Pending Comments ({pendingReview.comments.length})
            </label>
            <div className="max-h-[200px] overflow-y-auto space-y-2 border border-border rounded-[var(--radius-sm)] p-2 bg-surface">
              {pendingReview.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-2 p-2 bg-surface-elevated rounded-[var(--radius-sm)] group hover:bg-surface-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {comment.type === 'inline' && comment.path && comment.line ? (
                        <span className="text-xs font-medium text-accent">
                          {comment.path.split('/').pop()}:{comment.line}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-text-muted">General</span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">{comment.body}</p>
                  </div>
                  <button
                    onClick={() => removePendingComment(comment.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                    disabled={reviewSubmitting}
                    title="Remove comment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {reviewSubmitError && (
          <div className="p-3 bg-danger-muted border border-danger/30 rounded-[var(--radius-sm)]">
            <p className="text-sm text-danger">{reviewSubmitError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={reviewSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit || reviewSubmitting}
          >
            {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </div>
  );
}
