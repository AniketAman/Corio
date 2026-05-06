# PR Interactions: Direct Review Submission from Code Reviewer

**Date:** 2026-05-06
**Status:** Approved

## Goal

Add the ability to submit a GitHub Pull Request Review directly from the code reviewer app. Users can queue inline (line-level) and general comments from finding cards or the diff viewer, then submit them as a batched review with an approve/request-changes/comment verdict.

## Interaction Model

All comments are **pending** until explicitly submitted. Visual cues (inline badges) indicate uncommitted state. No individual/immediate posting — everything goes through the batch review flow, even single comments.

### Entry Points

1. **Finding cards** — each card gets two actions:
   - "Add inline" (disabled if no `fileLine`) — attaches to the file:line from the finding
   - "Add as general" — adds as a top-level review body comment
   - Once added, buttons are replaced by a "Pending" badge (clickable to remove)

2. **Diff viewer gutter** — hover reveals a comment icon per line:
   - Click opens an inline textarea widget in Monaco
   - Pre-filled with AI finding text if a finding matches that file:line, otherwise blank
   - "Add to review" confirms, "Cancel" dismisses
   - Lines with pending comments show a distinct filled icon

3. **Status bar** — "Submit Review (n)" button appears when pending comments exist:
   - Opens a popover with: verdict picker (Approve/Request Changes/Comment), optional summary textarea, scrollable list of pending comments with remove buttons, Submit button

## Architecture

### Data Model

```typescript
interface PendingComment {
  id: string;                    // uuid
  body: string;                  // comment text (markdown)
  type: 'inline' | 'general';
  path?: string;                 // file path (for inline)
  line?: number;                 // absolute line in new version (for inline)
  source: 'finding' | 'manual'; // origin
  findingId?: string;            // if from a finding card
}

interface PendingReview {
  comments: PendingComment[];
  verdict?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  summaryBody?: string;
}
```

### State Location

`pendingReview` lives in `TabsContext` per-tab state. Ephemeral — lost on tab close. No disk persistence.

### ReviewContext Actions

```typescript
addPendingComment: (comment: Omit<PendingComment, 'id'>) => void;
removePendingComment: (id: string) => void;
editPendingComment: (id: string, body: string) => void;
submitReview: (verdict: string, summaryBody?: string) => Promise<void>;
clearPendingReview: () => void;
pendingReview: PendingReview;
```

## Backend

### Tauri Command

One new command in a new file `src-tauri/src/commands/pr_review.rs`:

```rust
#[derive(Deserialize)]
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
    verdict: String,           // "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
    body: Option<String>,
    comments: Vec<ReviewComment>,
) -> Result<(), String>
```

### Implementation

1. Construct a JSON payload per GitHub's [Create Review API](https://docs.github.com/en/rest/pulls/reviews#create-a-review-for-a-pull-request):
   ```json
   {
     "commit_id": "<head_sha>",
     "event": "<verdict>",
     "body": "<summary + general comments joined by --->" ,
     "comments": [
       { "path": "src/foo.ts", "line": 42, "side": "RIGHT", "body": "..." }
     ]
   }
   ```
2. Write payload to a temp file
3. Execute: `gh api repos/{owner}/{repo}/pulls/{number}/reviews --input <tempfile> --method POST`
4. Clean up temp file
5. Return success or error string from stderr

### Why `gh api --input`

- No new dependencies (no `reqwest`)
- Consistent with existing `gh`-based architecture
- Handles auth via user's existing `gh` session
- Stdin/file piping handles complex JSON payloads cleanly

### Line Number Strategy

Uses GitHub's "comfort-fade" API variant: absolute `line` number in the new file version + `side: "RIGHT"`. This matches what Monaco gives us directly — no diff-position calculation needed.

## Frontend Changes

### Modified Files

| File | Change |
|------|--------|
| `src/client/context/TabsContext.tsx` | Add `pendingReview` to `TabState` |
| `src/client/context/ReviewContext.tsx` | Expose pending review actions |
| `src/client/components/review/FindingCard.tsx` | Add "Add inline" / "Add as general" buttons + pending badge |
| `src/client/components/DiffViewer.tsx` | Gutter icons, inline textarea widget, pending decorations |
| `src/client/components/StatusBar.tsx` | "Submit Review (n)" button + verdict popover |
| `src/client/hooks/useTauriApi.ts` | Add `submitReview` binding |

### New Files

| File | Purpose |
|------|---------|
| `src-tauri/src/commands/pr_review.rs` | Rust command for submitting review |
| `src/client/components/ReviewSubmitPopover.tsx` | Verdict picker + comment list + submit UI |
| `src/client/components/DiffCommentWidget.tsx` | Inline textarea for diff viewer comments |

## Edge Cases

**Stale HEAD:** GitHub returns 422 if HEAD has moved. Show error "PR has new commits — refresh to update." Keep pending comments intact.

**No `fileLine`:** "Add inline" button disabled with tooltip. "Add as general" always works.

**Auth failures:** Surface `gh` stderr directly in error toast. User runs `gh auth login` themselves.

**Duplicate comments:** No deduplication. User can remove duplicates manually from pending badge or submit popover.

**Empty review:** Submit disabled if zero comments AND no summary AND verdict is "COMMENT". Approve/Request Changes can submit with zero comments (just the verdict).

**Tab close with pending comments:** State is lost. No confirmation dialog (ephemeral by design — the real review lives in the AI findings, these are just selections from it).

## Non-Goals

- Editing/replying to existing PR comments
- Viewing existing review comments from other reviewers
- Persisting pending review state to disk
- Individual/immediate comment posting (everything batched)
