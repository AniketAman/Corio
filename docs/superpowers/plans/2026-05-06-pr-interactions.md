# PR Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to submit GitHub Pull Request Reviews directly from the code reviewer app — queueing inline and general comments from finding cards or the diff viewer, then submitting as a batched review with a verdict.

**Architecture:** Pending review state lives per-tab in `TabsContext`. Finding cards and the diff viewer add comments to a `PendingReview` queue. A status bar button opens a verdict popover and submits via a Rust command that calls `gh api --input <tempfile>` to post the review.

**Tech Stack:** Tauri (Rust backend), React (frontend), Monaco Editor, GitHub REST API via `gh` CLI

---

## File Structure

### New Files

```
src-tauri/src/commands/pr_review.rs     ← Rust command: submit_review
src/client/components/ReviewSubmitPopover.tsx  ← Verdict picker + pending comment list
src/client/components/DiffCommentWidget.tsx    ← Inline textarea for diff gutter comments
```

### Modified Files

```
src-tauri/src/commands/mod.rs           ← Register pr_review module
src-tauri/src/lib.rs                    ← Register submit_review command
src/client/context/TabsContext.tsx      ← Add PendingComment/PendingReview to TabState
src/client/context/ReviewContext.tsx    ← Expose pending review actions
src/client/hooks/useTauriApi.ts         ← Add submitReview binding
src/client/components/review/FindingCard.tsx   ← Add "Add inline"/"Add as general" buttons
src/client/components/DiffViewer.tsx    ← Gutter comment icons + inline widget
src/client/components/StatusBar.tsx     ← "Submit Review (n)" button + popover trigger
```

---

## Task 1: Rust Backend — `submit_review` Command

**Files:**
- Create: `src-tauri/src/commands/pr_review.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `pr_review.rs` with the command**

```rust
// src-tauri/src/commands/pr_review.rs
use serde::Deserialize;
use std::io::Write;
use crate::services::process::run_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewComment {
    pub path: String,
    pub line: u32,
    pub body: String,
}

#[tauri::command]
pub async fn submit_review(
    owner: String,
    repo: String,
    number: u32,
    head_sha: String,
    verdict: String,
    body: Option<String>,
    comments: Vec<ReviewComment>,
) -> Result<(), String> {
    // Build the payload per GitHub's Create Review API
    let review_comments: Vec<serde_json::Value> = comments
        .iter()
        .map(|c| {
            serde_json::json!({
                "path": c.path,
                "line": c.line,
                "side": "RIGHT",
                "body": c.body,
            })
        })
        .collect();

    let payload = serde_json::json!({
        "commit_id": head_sha,
        "event": verdict,
        "body": body.unwrap_or_default(),
        "comments": review_comments,
    });

    // Write payload to a temp file
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("cr-review-{}.json", uuid::Uuid::new_v4()));
    let temp_path_str = temp_path.to_string_lossy().to_string();

    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(payload.to_string().as_bytes())
        .map_err(|e| format!("Failed to write payload: {}", e))?;
    drop(file);

    // Call gh api
    let api_path = format!("repos/{}/{}/pulls/{}/reviews", owner, repo, number);
    let result = run_command(
        "gh",
        &["api", &api_path, "--method", "POST", "--input", &temp_path_str],
        None,
    );

    // Clean up temp file regardless of result
    let _ = std::fs::remove_file(&temp_path);

    let output = result?;
    if output.exit_code != 0 {
        return Err(format!("GitHub API error: {}", output.stderr));
    }

    Ok(())
}
```

- [ ] **Step 2: Register module in `mod.rs`**

Add to `src-tauri/src/commands/mod.rs`:

```rust
pub mod pr_review;
```

- [ ] **Step 3: Register command in `lib.rs`**

Add to the `invoke_handler` list in `src-tauri/src/lib.rs`:

```rust
commands::pr_review::submit_review,
```

- [ ] **Step 4: Verify Rust compiles**

Run: `~/.cargo/bin/cargo check`
Expected: `Finished` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/pr_review.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add submit_review Tauri command for GitHub PR reviews"
```

---

## Task 2: Frontend — Pending Review State in TabsContext

**Files:**
- Modify: `src/client/context/TabsContext.tsx`

- [ ] **Step 1: Add types and state to TabsContext**

Add these interfaces above `TabState`:

```typescript
export interface PendingComment {
  id: string;
  body: string;
  type: 'inline' | 'general';
  path?: string;
  line?: number;
  source: 'finding' | 'manual';
  findingId?: string;
}

export interface PendingReview {
  comments: PendingComment[];
}
```

Add to `TabState` interface:

```typescript
pendingReview: PendingReview;
```

Add to `createDefaultTabState`:

```typescript
pendingReview: { comments: [] },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/context/TabsContext.tsx
git commit -m "feat: add PendingReview state to TabsContext"
```

---

## Task 3: Frontend — ReviewContext Actions

**Files:**
- Modify: `src/client/context/ReviewContext.tsx`

- [ ] **Step 1: Add pending review actions to the context interface**

Add to `ReviewContextType`:

```typescript
pendingReview: PendingReview;
addPendingComment: (comment: Omit<PendingComment, 'id'>) => void;
removePendingComment: (id: string) => void;
editPendingComment: (id: string, body: string) => void;
submitReview: (verdict: string, summaryBody?: string) => Promise<void>;
clearPendingReview: () => void;
reviewSubmitting: boolean;
reviewSubmitError: string | null;
```

- [ ] **Step 2: Implement the actions in ReviewProvider**

Add these inside `ReviewProvider`, after the existing `useCallback` hooks:

```typescript
const pendingReview = activeTab.pendingReview;

const addPendingComment = useCallback((comment: Omit<PendingComment, 'id'>) => {
  const newComment: PendingComment = { ...comment, id: crypto.randomUUID() };
  const current = activeTab.pendingReview;
  updateTab(activeTabId, {
    pendingReview: { comments: [...current.comments, newComment] },
  });
}, [activeTabId, activeTab.pendingReview, updateTab]);

const removePendingComment = useCallback((id: string) => {
  const current = activeTab.pendingReview;
  updateTab(activeTabId, {
    pendingReview: { comments: current.comments.filter(c => c.id !== id) },
  });
}, [activeTabId, activeTab.pendingReview, updateTab]);

const editPendingComment = useCallback((id: string, body: string) => {
  const current = activeTab.pendingReview;
  updateTab(activeTabId, {
    pendingReview: {
      comments: current.comments.map(c => c.id === id ? { ...c, body } : c),
    },
  });
}, [activeTabId, activeTab.pendingReview, updateTab]);

const clearPendingReview = useCallback(() => {
  updateTab(activeTabId, { pendingReview: { comments: [] } });
}, [activeTabId, updateTab]);

const [reviewSubmitting, setReviewSubmitting] = useState(false);
const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

const submitReview = useCallback(async (verdict: string, summaryBody?: string) => {
  const pr = activeTab.prData;
  if (!pr) return;

  setReviewSubmitting(true);
  setReviewSubmitError(null);

  const pending = activeTab.pendingReview;
  const inlineComments = pending.comments
    .filter(c => c.type === 'inline' && c.path && c.line)
    .map(c => ({ path: c.path!, line: c.line!, body: c.body }));

  const generalComments = pending.comments.filter(c => c.type === 'general');
  const bodyParts: string[] = [];
  if (summaryBody) bodyParts.push(summaryBody);
  if (generalComments.length > 0) {
    bodyParts.push(...generalComments.map(c => c.body));
  }
  const fullBody = bodyParts.join('\n\n---\n\n') || undefined;

  try {
    await tauriApi.submitReview(
      pr.owner,
      pr.repo,
      pr.number,
      pr.headSha,
      verdict,
      fullBody,
      inlineComments,
    );
    clearPendingReview();
  } catch (err: any) {
    setReviewSubmitError(err.message || err.toString());
  } finally {
    setReviewSubmitting(false);
  }
}, [activeTab.prData, activeTab.pendingReview, clearPendingReview]);
```

- [ ] **Step 3: Add actions to the context value**

Add to the `value` object in `<ReviewContext.Provider>`:

```typescript
pendingReview,
addPendingComment,
removePendingComment,
editPendingComment,
submitReview,
clearPendingReview,
reviewSubmitting,
reviewSubmitError,
```

- [ ] **Step 4: Import the new types**

At the top of ReviewContext.tsx, update the import from TabsContext:

```typescript
import { useTabs, ChatMessage, PendingComment, PendingReview } from './TabsContext';
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/client/context/ReviewContext.tsx
git commit -m "feat: add pending review actions to ReviewContext"
```

---

## Task 4: Frontend — Tauri API Binding

**Files:**
- Modify: `src/client/hooks/useTauriApi.ts`

- [ ] **Step 1: Add `submitReview` to `tauriApi`**

Add after the `convertToA2UI` entry:

```typescript
// PR Review
submitReview: (
  owner: string,
  repo: string,
  number: number,
  headSha: string,
  verdict: string,
  body: string | undefined,
  comments: Array<{ path: string; line: number; body: string }>,
) => invoke<void>('submit_review', { owner, repo, number, headSha, verdict, body, comments }),
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/hooks/useTauriApi.ts
git commit -m "feat: add submitReview Tauri API binding"
```

---

## Task 5: Frontend — FindingCard Actions

**Files:**
- Modify: `src/client/components/review/FindingCard.tsx`

- [ ] **Step 1: Add "Add inline" / "Add as general" buttons and pending state**

Replace the full `FindingCard` component with:

```typescript
import { useState } from 'react';
import { ConfidenceBar } from './ConfidenceBar';
import { Badge } from '../ui/badge';
import { useReview } from '../../context/ReviewContext';

interface Finding {
  fileLine?: string;
  what: string;
  why?: string;
  fix?: string;
  confidence: number;
}

interface FindingCardProps {
  finding: Finding;
  priority: 1 | 2 | 3;
}

export function FindingCard({ finding, priority }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { setSelectedFile, addPendingComment, removePendingComment, pendingReview } = useReview();

  const priorityConfig = {
    1: { label: 'P1', variant: 'danger' as const },
    2: { label: 'P2', variant: 'warning' as const },
    3: { label: 'P3', variant: 'info' as const },
  };

  const p = priorityConfig[priority];

  // Check if this finding is already in the pending review
  const findingId = `${finding.fileLine || 'general'}-${finding.what.slice(0, 30)}`;
  const pendingComment = pendingReview.comments.find(c => c.findingId === findingId);

  const handleFileClick = () => {
    if (finding.fileLine) {
      const filePath = finding.fileLine.split(':')[0];
      setSelectedFile(filePath);
    }
  };

  const buildCommentBody = (): string => {
    const parts: string[] = [`**${finding.what}**`];
    if (finding.why) parts.push(`\n_Why:_ ${finding.why}`);
    if (finding.fix) parts.push(`\n_Fix:_ \`${finding.fix}\``);
    return parts.join('');
  };

  const handleAddInline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!finding.fileLine) return;
    const [path, lineStr] = finding.fileLine.split(':');
    const line = parseInt(lineStr, 10);
    if (!path || isNaN(line)) return;

    addPendingComment({
      body: buildCommentBody(),
      type: 'inline',
      path,
      line,
      source: 'finding',
      findingId,
    });
  };

  const handleAddGeneral = (e: React.MouseEvent) => {
    e.stopPropagation();
    addPendingComment({
      body: buildCommentBody(),
      type: 'general',
      source: 'finding',
      findingId,
    });
  };

  const handleRemovePending = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pendingComment) {
      removePendingComment(pendingComment.id);
    }
  };

  return (
    <div className="border border-border-subtle rounded-[var(--radius-sm)] bg-surface-elevated mb-2 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2 bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <Badge variant={p.variant} className="shrink-0 mt-0.5">{p.label}</Badge>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary leading-snug">{finding.what}</div>
          {finding.fileLine && (
            <span
              onClick={(e) => { e.stopPropagation(); handleFileClick(); }}
              className="text-[12px] font-mono text-accent hover:underline cursor-pointer mt-0.5 inline-block"
            >
              {finding.fileLine}
            </span>
          )}
        </div>
        <ConfidenceBar score={finding.confidence} className="shrink-0" />
      </button>

      {expanded && (finding.why || finding.fix) && (
        <div className="px-3 pb-3 border-t border-border-subtle pt-2 ml-[42px] space-y-2">
          {finding.why && (
            <div>
              <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Why it matters</span>
              <p className="text-xs text-text-secondary mt-0.5">{finding.why}</p>
            </div>
          )}
          {finding.fix && (
            <div>
              <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Suggested fix</span>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">{finding.fix}</p>
            </div>
          )}
        </div>
      )}

      {/* Pending review actions */}
      <div className="px-3 pb-2 flex items-center gap-2">
        {pendingComment ? (
          <button
            onClick={handleRemovePending}
            className="flex items-center gap-1.5 text-[11px] text-accent bg-accent-muted border border-accent/30 rounded-full px-2.5 py-1 cursor-pointer hover:bg-accent-muted/80 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Pending
            <span className="text-text-muted ml-0.5">&times;</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleAddInline}
              disabled={!finding.fileLine}
              className="text-[11px] text-text-muted hover:text-text-secondary bg-transparent border border-border-subtle rounded-[var(--radius-sm)] px-2 py-1 cursor-pointer hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={finding.fileLine ? 'Add as inline comment on this line' : 'No line info available'}
            >
              + Inline
            </button>
            <button
              onClick={handleAddGeneral}
              className="text-[11px] text-text-muted hover:text-text-secondary bg-transparent border border-border-subtle rounded-[var(--radius-sm)] px-2 py-1 cursor-pointer hover:bg-surface-hover transition-colors"
            >
              + General
            </button>
          </>
        )}
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
git add src/client/components/review/FindingCard.tsx
git commit -m "feat: add pending review actions to FindingCard"
```

---

## Task 6: Frontend — ReviewSubmitPopover

**Files:**
- Create: `src/client/components/ReviewSubmitPopover.tsx`

- [ ] **Step 1: Create the popover component**

```typescript
// src/client/components/ReviewSubmitPopover.tsx
import { useState } from 'react';
import { useReview } from '../context/ReviewContext';

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

  const [verdict, setVerdict] = useState<string>('COMMENT');
  const [summary, setSummary] = useState('');

  const handleSubmit = async () => {
    await submitReview(verdict, summary || undefined);
    if (!reviewSubmitError) {
      onClose();
    }
  };

  const verdictOptions = [
    { value: 'APPROVE', label: 'Approve', color: 'bg-success text-white' },
    { value: 'REQUEST_CHANGES', label: 'Request Changes', color: 'bg-danger text-white' },
    { value: 'COMMENT', label: 'Comment', color: 'bg-surface-elevated text-text-primary border border-border' },
  ];

  const canSubmit =
    verdict === 'APPROVE' ||
    verdict === 'REQUEST_CHANGES' ||
    pendingReview.comments.length > 0 ||
    summary.trim().length > 0;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-[380px] bg-surface-elevated border border-border rounded-[var(--radius)] shadow-lg p-4 space-y-3 z-50">
      {/* Verdict picker */}
      <div className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
          Verdict
        </label>
        <div className="flex gap-2">
          {verdictOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setVerdict(opt.value)}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-all ${
                verdict === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-accent/50'
                  : 'bg-surface text-text-muted border border-border hover:text-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary textarea */}
      <div className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
          Summary (optional)
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Overall review summary..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>

      {/* Pending comments list */}
      {pendingReview.comments.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
            Comments ({pendingReview.comments.length})
          </label>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {pendingReview.comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-2 p-2 bg-surface rounded-[var(--radius-sm)] border border-border-subtle"
              >
                <span className={`shrink-0 mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  comment.type === 'inline'
                    ? 'bg-accent-muted text-accent'
                    : 'bg-surface-elevated text-text-muted border border-border'
                }`}>
                  {comment.type === 'inline' ? comment.path?.split('/').pop() + ':' + comment.line : 'General'}
                </span>
                <span className="flex-1 text-xs text-text-secondary truncate">
                  {comment.body.replace(/\*\*/g, '').slice(0, 60)}
                </span>
                <button
                  onClick={() => removePendingComment(comment.id)}
                  className="shrink-0 text-text-muted hover:text-danger text-sm bg-transparent border-none cursor-pointer"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {reviewSubmitError && (
        <div className="text-xs text-danger bg-danger-muted border border-danger/30 rounded-[var(--radius-sm)] p-2">
          {reviewSubmitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onClose}
          className="text-xs text-text-muted hover:text-text-secondary bg-transparent border-none cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || reviewSubmitting}
          className="px-4 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] bg-accent text-white hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
git add src/client/components/ReviewSubmitPopover.tsx
git commit -m "feat: add ReviewSubmitPopover component"
```

---

## Task 7: Frontend — StatusBar Integration

**Files:**
- Modify: `src/client/components/StatusBar.tsx`

- [ ] **Step 1: Add the submit review button to StatusBar**

Replace the full `StatusBar` component:

```typescript
import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { Badge } from './ui/badge';
import { useTheme } from '../hooks/useTheme';
import { ReviewSubmitPopover } from './ReviewSubmitPopover';

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
  const [popoverOpen, setPopoverOpen] = useState(false);

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
      </div>
      <div className="flex items-center gap-3">
        {pendingCount > 0 && (
          <div className="relative">
            <button
              onClick={() => setPopoverOpen(!popoverOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium bg-accent text-white hover:bg-accent-hover cursor-pointer transition-colors"
            >
              Submit Review ({pendingCount})
            </button>
            {popoverOpen && (
              <ReviewSubmitPopover onClose={() => setPopoverOpen(false)} />
            )}
          </div>
        )}
        <ThemeToggle />
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
git add src/client/components/StatusBar.tsx
git commit -m "feat: add Submit Review button to StatusBar with popover"
```

---

## Task 8: Frontend — Diff Viewer Gutter Comments

**Files:**
- Create: `src/client/components/DiffCommentWidget.tsx`
- Modify: `src/client/components/DiffViewer.tsx`

- [ ] **Step 1: Create the DiffCommentWidget component**

```typescript
// src/client/components/DiffCommentWidget.tsx
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
```

- [ ] **Step 2: Update DiffViewer with gutter icons and comment widget**

Replace the full `DiffViewer.tsx`:

```typescript
import { DiffEditor, DiffOnMount } from '@monaco-editor/react';
import { useReview } from '../context/ReviewContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { tauriApi } from '../hooks/useTauriApi';
import { createRoot } from 'react-dom/client';
import { DiffCommentWidget } from './DiffCommentWidget';
import type { editor } from 'monaco-editor';

export function DiffViewer() {
  const { prData, selectedFile, annotations, scrollToAnnotation, addPendingComment, pendingReview } = useReview();
  const { resolved } = useTheme();
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [commentLine, setCommentLine] = useState<number | null>(null);

  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const pendingDecorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const widgetRef = useRef<editor.IContentWidget | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetRootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  useEffect(() => {
    if (!prData || !selectedFile) {
      setOriginal('');
      setModified('');
      return;
    }

    let cancelled = false;

    const fetchContents = async () => {
      try {
        let repoRoot: string | null = null;
        try {
          repoRoot = await tauriApi.getRepoPath(prData.owner, prData.repo);
        } catch {
          // No repo registered — will use gh api fallback
        }

        const [baseContent, headContent] = await Promise.all([
          tauriApi.fetchFileContent(prData.owner, prData.repo, prData.baseRef, selectedFile, repoRoot),
          tauriApi.fetchFileContent(prData.owner, prData.repo, prData.headRef, selectedFile, repoRoot),
        ]);

        if (cancelled) return;

        setOriginal(baseContent || '');
        setModified(headContent || '');

        const ext = selectedFile.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          ts: 'typescript', tsx: 'typescript',
          js: 'javascript', jsx: 'javascript',
          py: 'python', go: 'go', rs: 'rust',
          java: 'java', cpp: 'cpp', c: 'c',
          md: 'markdown', json: 'json',
          yaml: 'yaml', yml: 'yaml',
          css: 'css', html: 'html', sql: 'sql',
        };
        setLanguage(langMap[ext] || 'plaintext');
      } catch (error) {
        console.error('Failed to fetch file contents:', error);
      }
    };

    fetchContents();
    return () => { cancelled = true; };
  }, [prData, selectedFile]);

  // Get prefill text for a line if a finding matches it
  const getPrefillForLine = useCallback((line: number): string | undefined => {
    if (!selectedFile) return undefined;
    const fileAnnotations = annotations[selectedFile] || [];
    if (fileAnnotations.includes(line)) {
      return `Review finding on line ${line}`;
    }
    return undefined;
  }, [selectedFile, annotations]);

  // Remove the comment widget from Monaco
  const removeWidget = useCallback(() => {
    if (widgetRef.current && editorRef.current) {
      const modifiedEditor = editorRef.current.getModifiedEditor();
      modifiedEditor.removeContentWidget(widgetRef.current);
      widgetRef.current = null;
    }
    if (widgetRootRef.current) {
      widgetRootRef.current.unmount();
      widgetRootRef.current = null;
    }
    widgetContainerRef.current = null;
    setCommentLine(null);
  }, []);

  // Show the comment widget at a given line
  const showCommentWidget = useCallback((line: number) => {
    if (!editorRef.current || !selectedFile) return;

    removeWidget();
    setCommentLine(line);

    const modifiedEditor = editorRef.current.getModifiedEditor();
    const container = document.createElement('div');
    container.style.width = '400px';
    widgetContainerRef.current = container;

    const prefill = getPrefillForLine(line);
    const root = createRoot(container);
    widgetRootRef.current = root;

    root.render(
      <DiffCommentWidget
        line={line}
        filePath={selectedFile}
        prefill={prefill}
        onSubmit={(body) => {
          addPendingComment({
            body,
            type: 'inline',
            path: selectedFile,
            line,
            source: prefill ? 'finding' : 'manual',
          });
          removeWidget();
        }}
        onCancel={removeWidget}
      />
    );

    const widget: editor.IContentWidget = {
      getId: () => 'diff-comment-widget',
      getDomNode: () => container,
      getPosition: () => ({
        position: { lineNumber: line, column: 1 },
        preference: [1], // BELOW
      }),
    };

    widgetRef.current = widget;
    modifiedEditor.addContentWidget(widget);
  }, [selectedFile, getPrefillForLine, addPendingComment, removeWidget]);

  const handleMount: DiffOnMount = (editor) => {
    editorRef.current = editor;

    const modifiedEditor = editor.getModifiedEditor();

    // Glyph margin click → open comment widget
    modifiedEditor.onMouseDown((e) => {
      if (!selectedFile) return;
      const lineNumber = e.target.position?.lineNumber;
      if (!lineNumber) return;

      // Click on glyph margin → open comment widget
      if (e.target.type === 2 /* GUTTER_GLYPH_MARGIN */ || e.target.type === 3 /* GUTTER_LINE_NUMBERS */) {
        showCommentWidget(lineNumber);
        return;
      }

      // Click on annotation highlights → scroll to annotation
      const lines = annotations[selectedFile] || [];
      if (lines.includes(lineNumber)) {
        scrollToAnnotation(selectedFile, lineNumber);
      }
    });
  };

  // Annotation decorations
  useEffect(() => {
    if (!editorRef.current || !selectedFile) return;

    const modifiedEditor = editorRef.current.getModifiedEditor();
    const lines = annotations[selectedFile] || [];

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    if (lines.length === 0) return;

    const decorations: editor.IModelDeltaDecoration[] = lines.map(line => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'annotation-highlight',
        glyphMarginClassName: 'annotation-glyph',
        glyphMarginHoverMessage: { value: 'Click to add review comment' },
        overviewRuler: {
          color: '#8b5cf6',
          position: 1,
        },
      },
    }));

    decorationsRef.current = modifiedEditor.createDecorationsCollection(decorations);
  }, [selectedFile, annotations]);

  // Pending comment decorations (filled dots for lines with pending comments)
  useEffect(() => {
    if (!editorRef.current || !selectedFile) return;

    const modifiedEditor = editorRef.current.getModifiedEditor();

    if (pendingDecorationsRef.current) {
      pendingDecorationsRef.current.clear();
    }

    const pendingLines = pendingReview.comments
      .filter(c => c.type === 'inline' && c.path === selectedFile)
      .map(c => c.line!)
      .filter(Boolean);

    if (pendingLines.length === 0) return;

    const decorations: editor.IModelDeltaDecoration[] = pendingLines.map(line => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'pending-comment-highlight',
        glyphMarginClassName: 'pending-comment-glyph',
        glyphMarginHoverMessage: { value: 'Pending review comment' },
      },
    }));

    pendingDecorationsRef.current = modifiedEditor.createDecorationsCollection(decorations);
  }, [selectedFile, pendingReview.comments]);

  // Cleanup widget on file change
  useEffect(() => {
    return () => { removeWidget(); };
  }, [selectedFile, removeWidget]);

  if (!prData || !selectedFile) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        <div className="text-center">
          <div className="text-2xl mb-2 opacity-30">&#8644;</div>
          <div>Select a file to view diff</div>
        </div>
      </div>
    );
  }

  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={language}
      theme={resolved === 'light' ? 'vs' : 'vs-dark'}
      onMount={handleMount}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        renderSideBySide: true,
        stickyScroll: { enabled: false },
        glyphMargin: true,
      }}
    />
  );
}
```

- [ ] **Step 3: Add CSS for pending comment decorations**

Add to `src/client/styles/globals.css`:

```css
.pending-comment-highlight {
  background-color: rgba(139, 92, 246, 0.08) !important;
}

.pending-comment-glyph {
  background-color: #8b5cf6;
  border-radius: 50%;
  width: 8px !important;
  height: 8px !important;
  margin-left: 4px;
  margin-top: 6px;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 5: Verify Vite builds**

Run: `npm run build:client`
Expected: success, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/DiffCommentWidget.tsx src/client/components/DiffViewer.tsx src/client/styles/globals.css
git commit -m "feat: add diff viewer gutter comment widget with pending decorations"
```

---

## Task 9: Full Build Verification

- [ ] **Step 1: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Verify Vite build**

Run: `npm run build:client`
Expected: success.

- [ ] **Step 3: Verify Rust**

Run: `~/.cargo/bin/cargo check`
Expected: `Finished` with no errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run tauri:dev`

Test flow:
1. Load a PR
2. Wait for review to complete
3. Expand a finding card → see "Add inline" and "Add as general" buttons
4. Click "Add inline" → badge shows "Pending"
5. Status bar shows "Submit Review (1)"
6. Click on diff gutter → textarea appears
7. Type a comment, click "Add to review"
8. Status bar updates to "Submit Review (2)"
9. Click "Submit Review" → popover opens with verdict picker
10. Select verdict, click Submit
11. Verify review appears on GitHub PR

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address issues from smoke testing PR interactions"
```
