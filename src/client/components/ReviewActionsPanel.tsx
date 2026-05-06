import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { PendingComment } from '../context/TabsContext';

export function ReviewActionsPanel() {
  const {
    prData,
    pendingReview,
    addPendingComment,
    removePendingComment,
    editPendingComment,
    submitReview,
    reviewSubmitting,
    reviewSubmitError,
  } = useReview();

  const [verdict, setVerdict] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'>('COMMENT');
  const [summaryBody, setSummaryBody] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const comments = pendingReview.comments;
  const hasComments = comments.length > 0;
  const canSubmit = verdict === 'APPROVE' || verdict === 'REQUEST_CHANGES' || hasComments || summaryBody.trim().length > 0;

  const handleAddComment = () => {
    if (newComment.trim()) {
      addPendingComment({
        body: newComment,
        type: 'general',
        source: 'manual',
      });
      setNewComment('');
      setShowCommentInput(false);
    }
  };

  const handleStartEdit = (comment: PendingComment) => {
    setEditingId(comment.id);
    setEditingBody(comment.body);
  };

  const handleSaveEdit = () => {
    if (editingId && editingBody.trim()) {
      editPendingComment(editingId, editingBody);
      setEditingId(null);
      setEditingBody('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingBody('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await submitReview(verdict, summaryBody.trim() || undefined);
    // Reset local state on success
    if (!reviewSubmitError) {
      setSummaryBody('');
      setVerdict('COMMENT');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!prData && (
          <div className="text-center text-text-muted py-12">
            Load a PR to start adding review comments.
          </div>
        )}

        {prData && !hasComments && !showCommentInput && (
          <div className="text-center text-text-muted py-12">
            Add comments from findings or the diff viewer, then submit your review here.
          </div>
        )}

        {/* Pending comments list */}
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="bg-surface-elevated border border-border-subtle rounded-[var(--radius)] p-3 hover:border-border transition-colors group"
          >
            {/* Type badge */}
            <div className="mb-2">
              {comment.type === 'inline' && comment.path && comment.line !== undefined ? (
                <span className="text-xs font-mono text-accent bg-accent-muted px-2 py-1 rounded">
                  {comment.path}:{comment.line}
                </span>
              ) : (
                <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded">
                  PR comment
                </span>
              )}
            </div>

            {/* Body or edit textarea */}
            {editingId === comment.id ? (
              <div className="space-y-2">
                <textarea
                  value={editingBody}
                  onChange={(e) => setEditingBody(e.target.value)}
                  className="w-full bg-surface border border-border rounded-[var(--radius-sm)] p-2 text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                  rows={4}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 text-xs bg-accent text-white rounded-[var(--radius-sm)] hover:bg-accent-hover transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs bg-surface-hover text-text-secondary rounded-[var(--radius-sm)] hover:bg-surface-elevated transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <p className="text-sm text-text-primary whitespace-pre-wrap">{comment.body}</p>
                {/* Edit/remove buttons on hover */}
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => handleStartEdit(comment)}
                    className="w-6 h-6 flex items-center justify-center bg-surface-hover hover:bg-surface-elevated rounded text-text-secondary hover:text-text-primary transition-colors"
                    title="Edit"
                  >
                    &#9998;
                  </button>
                  <button
                    onClick={() => removePendingComment(comment.id)}
                    className="w-6 h-6 flex items-center justify-center bg-surface-hover hover:bg-danger-muted rounded text-text-secondary hover:text-danger transition-colors"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add PR comment button/input */}
        {prData && !showCommentInput && (
          <button
            onClick={() => setShowCommentInput(true)}
            className="w-full py-2 text-sm text-accent border border-border-subtle rounded-[var(--radius)] hover:bg-surface-hover hover:border-border transition-colors"
          >
            + Add PR comment
          </button>
        )}

        {showCommentInput && (
          <div className="bg-surface-elevated border border-border-subtle rounded-[var(--radius)] p-3 space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a general PR comment..."
              className="w-full bg-surface border border-border rounded-[var(--radius-sm)] p-2 text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddComment}
                className="px-3 py-1 text-xs bg-accent text-white rounded-[var(--radius-sm)] hover:bg-accent-hover transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowCommentInput(false);
                  setNewComment('');
                }}
                className="px-3 py-1 text-xs bg-surface-hover text-text-secondary rounded-[var(--radius-sm)] hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      {prData && (
        <div className="shrink-0 border-t border-border p-4 bg-surface space-y-3">
          {/* Verdict picker */}
          <div className="flex gap-2">
            <button
              onClick={() => setVerdict('APPROVE')}
              className={`flex-1 py-2 px-3 text-sm rounded-[var(--radius)] transition-all ${
                verdict === 'APPROVE'
                  ? 'bg-success-muted text-success ring-2 ring-success font-medium'
                  : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
              }`}
            >
              Approve
            </button>
            <button
              onClick={() => setVerdict('REQUEST_CHANGES')}
              className={`flex-1 py-2 px-3 text-sm rounded-[var(--radius)] transition-all ${
                verdict === 'REQUEST_CHANGES'
                  ? 'bg-danger-muted text-danger ring-2 ring-danger font-medium'
                  : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
              }`}
            >
              Request Changes
            </button>
            <button
              onClick={() => setVerdict('COMMENT')}
              className={`flex-1 py-2 px-3 text-sm rounded-[var(--radius)] transition-all ${
                verdict === 'COMMENT'
                  ? 'bg-accent-muted text-accent ring-2 ring-accent font-medium'
                  : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
              }`}
            >
              Comment
            </button>
          </div>

          {/* Summary textarea */}
          <textarea
            value={summaryBody}
            onChange={(e) => setSummaryBody(e.target.value)}
            placeholder="Review summary (optional)..."
            className="w-full bg-surface-elevated border border-border-subtle rounded-[var(--radius-sm)] p-2 text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            rows={2}
          />

          {/* Error display */}
          {reviewSubmitError && (
            <div className="text-sm text-danger bg-danger-muted px-3 py-2 rounded-[var(--radius-sm)]">
              {reviewSubmitError}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || reviewSubmitting}
            className="w-full py-2 text-sm font-medium bg-accent text-white rounded-[var(--radius)] hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      )}
    </div>
  );
}
