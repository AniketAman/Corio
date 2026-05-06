# Review Actions Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all pending review management (comments list, add comment, verdict picker, submit) from the StatusBar popover into a dedicated "Actions" tab in the right panel, next to "AI Review".

**Architecture:** A new `ReviewPanelTabs` wrapper component renders a tab bar and conditionally shows `ExplanationPanel` or `ReviewActionsPanel`. The `ReviewActionsPanel` is extracted from the existing `ReviewSubmitPopover` content, adapted to a full-panel layout with a sticky footer. The StatusBar reverts to passive display and the popover is deleted.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## File Structure

### New Files

```
src/client/components/ReviewPanelTabs.tsx    ← Tab bar + conditional panel rendering
src/client/components/ReviewActionsPanel.tsx  ← Full review management panel
```

### Modified Files

```
src/client/App.tsx                           ← Replace ExplanationPanel with ReviewPanelTabs, label="Review"
src/client/components/StatusBar.tsx          ← Remove popover, show passive "n pending" badge
```

### Deleted Files

```
src/client/components/ReviewSubmitPopover.tsx ← Content moved to ReviewActionsPanel
```

---

## Task 1: Create ReviewActionsPanel

**Files:**
- Create: `src/client/components/ReviewActionsPanel.tsx`

- [ ] **Step 1: Create the component file**

```typescript
// src/client/components/ReviewActionsPanel.tsx
import { useState } from 'react';
import { useReview } from '../context/ReviewContext';

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

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addPendingComment({
      body: newComment.trim(),
      type: 'general',
      source: 'manual',
    });
    setNewComment('');
    setShowCommentInput(false);
  };

  const handleStartEdit = (id: string, body: string) => {
    setEditingId(id);
    setEditingBody(body);
  };

  const handleSaveEdit = () => {
    if (editingId && editingBody.trim()) {
      editPendingComment(editingId, editingBody.trim());
    }
    setEditingId(null);
    setEditingBody('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingBody('');
  };

  const canSubmit =
    verdict === 'APPROVE' ||
    verdict === 'REQUEST_CHANGES' ||
    pendingReview.comments.length > 0 ||
    summaryBody.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || reviewSubmitting) return;
    await submitReview(verdict, summaryBody.trim() || undefined);
  };

  if (!prData) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm p-6 text-center">
        Load a PR to start adding review comments.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty state */}
        {pendingReview.comments.length === 0 && !showCommentInput && (
          <div className="text-sm text-text-muted py-6 text-center">
            Add comments from findings or the diff viewer, then submit your review here.
          </div>
        )}

        {/* Pending comments list */}
        {pendingReview.comments.length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
              Pending Comments ({pendingReview.comments.length})
            </label>
            {pendingReview.comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 bg-surface-elevated border border-border-subtle rounded-[var(--radius-sm)] group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  {comment.type === 'inline' && comment.path && comment.line ? (
                    <span className="text-xs font-medium text-accent font-mono">
                      {comment.path.split('/').pop()}:{comment.line}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-text-muted">PR comment</span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(comment.id, comment.body)}
                      className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent rounded transition-colors bg-transparent border-none cursor-pointer text-xs"
                      title="Edit"
                    >
                      &#9998;
                    </button>
                    <button
                      onClick={() => removePendingComment(comment.id)}
                      className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-danger rounded transition-colors bg-transparent border-none cursor-pointer"
                      title="Remove"
                      disabled={reviewSubmitting}
                    >
                      &times;
                    </button>
                  </div>
                </div>
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      className="w-full h-20 px-2 py-1.5 bg-surface text-text-primary border border-border rounded-[var(--radius-sm)] text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-[11px] text-text-muted hover:text-text-secondary bg-transparent border-none cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editingBody.trim()}
                        className="px-2.5 py-1 text-[11px] font-medium bg-accent text-white rounded-[var(--radius-sm)] hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{comment.body}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add PR comment */}
        <div>
          {showCommentInput ? (
            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a PR-level comment..."
                className="w-full h-20 px-3 py-2 bg-surface text-text-primary border border-border rounded-[var(--radius-sm)] text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                autoFocus
                disabled={reviewSubmitting}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setShowCommentInput(false); setNewComment(''); }}
                  className="px-2.5 py-1 text-[11px] text-text-muted hover:text-text-secondary bg-transparent border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-accent text-white rounded-[var(--radius-sm)] hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCommentInput(true)}
              disabled={reviewSubmitting}
              className="text-[12px] text-accent hover:text-accent-hover bg-transparent border border-accent/30 rounded-[var(--radius-sm)] px-2.5 py-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add PR comment
            </button>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-border p-4 space-y-3 bg-surface">
        {/* Verdict picker */}
        <div className="flex gap-2">
          <button
            onClick={() => setVerdict('APPROVE')}
            className={`flex-1 h-8 px-2 text-xs font-medium rounded-[var(--radius-sm)] transition-all ${
              verdict === 'APPROVE'
                ? 'bg-success text-white ring-2 ring-success ring-offset-1 ring-offset-surface'
                : 'bg-success-muted text-success hover:bg-success/30'
            }`}
            disabled={reviewSubmitting}
          >
            Approve
          </button>
          <button
            onClick={() => setVerdict('REQUEST_CHANGES')}
            className={`flex-1 h-8 px-2 text-xs font-medium rounded-[var(--radius-sm)] transition-all ${
              verdict === 'REQUEST_CHANGES'
                ? 'bg-danger text-white ring-2 ring-danger ring-offset-1 ring-offset-surface'
                : 'bg-danger-muted text-danger hover:bg-danger/30'
            }`}
            disabled={reviewSubmitting}
          >
            Request Changes
          </button>
          <button
            onClick={() => setVerdict('COMMENT')}
            className={`flex-1 h-8 px-2 text-xs font-medium rounded-[var(--radius-sm)] transition-all ${
              verdict === 'COMMENT'
                ? 'bg-surface-hover text-text-primary ring-2 ring-border ring-offset-1 ring-offset-surface'
                : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
            }`}
            disabled={reviewSubmitting}
          >
            Comment
          </button>
        </div>

        {/* Summary textarea */}
        <textarea
          value={summaryBody}
          onChange={(e) => setSummaryBody(e.target.value)}
          placeholder="Review summary (optional)..."
          rows={2}
          className="w-full px-3 py-2 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          disabled={reviewSubmitting}
        />

        {/* Error display */}
        {reviewSubmitError && (
          <div className="p-2 bg-danger-muted border border-danger/30 rounded-[var(--radius-sm)]">
            <p className="text-xs text-danger">{reviewSubmitError}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || reviewSubmitting}
          className="w-full h-9 text-sm font-medium rounded-[var(--radius-sm)] bg-accent text-white hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/ReviewActionsPanel.tsx
git commit -m "feat: create ReviewActionsPanel component"
```

---

## Task 2: Create ReviewPanelTabs

**Files:**
- Create: `src/client/components/ReviewPanelTabs.tsx`

- [ ] **Step 1: Create the wrapper component**

```typescript
// src/client/components/ReviewPanelTabs.tsx
import { useState } from 'react';
import { ExplanationPanel } from './ExplanationPanel';
import { ReviewActionsPanel } from './ReviewActionsPanel';
import { useReview } from '../context/ReviewContext';

type PanelTab = 'review' | 'actions';

export function ReviewPanelTabs() {
  const [activeTab, setActiveTab] = useState<PanelTab>('review');
  const { pendingReview } = useReview();

  const pendingCount = pendingReview.comments.length;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border-subtle shrink-0">
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'review'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          AI Review
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors border-b-2 -mb-px flex items-center justify-center gap-1.5 ${
            activeTab === 'actions'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          Actions
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-accent text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        <div className={activeTab === 'review' ? 'h-full' : 'hidden'}>
          <ExplanationPanel />
        </div>
        <div className={activeTab === 'actions' ? 'h-full' : 'hidden'}>
          <ReviewActionsPanel />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/ReviewPanelTabs.tsx
git commit -m "feat: create ReviewPanelTabs wrapper component"
```

---

## Task 3: Update App.tsx to Use ReviewPanelTabs

**Files:**
- Modify: `src/client/App.tsx`

- [ ] **Step 1: Replace ExplanationPanel import and usage**

In `src/client/App.tsx`:

Replace the import:
```typescript
import { ExplanationPanel } from './components/ExplanationPanel';
```
with:
```typescript
import { ReviewPanelTabs } from './components/ReviewPanelTabs';
```

Replace the ResizablePanel block (lines 105-115):
```typescript
          <ResizablePanel
            defaultWidth={400}
            minWidth={280}
            maxWidth={700}
            side="right"
            collapsed={explanationCollapsed}
            onCollapse={() => setExplanationCollapsed(c => !c)}
            label="AI Review"
          >
            <ExplanationPanel />
          </ResizablePanel>
```
with:
```typescript
          <ResizablePanel
            defaultWidth={400}
            minWidth={280}
            maxWidth={700}
            side="right"
            collapsed={explanationCollapsed}
            onCollapse={() => setExplanationCollapsed(c => !c)}
            label="Review"
          >
            <ReviewPanelTabs />
          </ResizablePanel>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/App.tsx
git commit -m "feat: wire ReviewPanelTabs into right panel"
```

---

## Task 4: Simplify StatusBar (Remove Popover)

**Files:**
- Modify: `src/client/components/StatusBar.tsx`

- [ ] **Step 1: Replace StatusBar content**

Replace the entire file with:

```typescript
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
      <ThemeToggle />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/StatusBar.tsx
git commit -m "refactor: simplify StatusBar to passive pending count display"
```

---

## Task 5: Delete ReviewSubmitPopover

**Files:**
- Delete: `src/client/components/ReviewSubmitPopover.tsx`

- [ ] **Step 1: Delete the file**

```bash
git rm src/client/components/ReviewSubmitPopover.tsx
```

- [ ] **Step 2: Verify no remaining imports**

Run: `grep -rn "ReviewSubmitPopover" src/client/ --include="*.tsx" --include="*.ts"`
Expected: no output (no remaining references).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 4: Verify Vite builds**

Run: `npm run build:client`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor: remove ReviewSubmitPopover (replaced by ReviewActionsPanel)"
```

---

## Task 6: Final Build Verification

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Vite build**

Run: `npm run build:client`
Expected: success.

- [ ] **Step 3: Commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address issues from build verification"
```
