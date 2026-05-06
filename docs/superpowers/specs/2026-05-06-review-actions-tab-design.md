# Review Actions Tab: Move PR Interactions to a Dedicated Panel Tab

**Date:** 2026-05-06
**Status:** Approved

## Goal

Move all pending review management (comments list, add comment, verdict picker, submit) out of the StatusBar popover and into a dedicated "Actions" tab in the right panel, next to the existing "AI Review" content.

## Architecture

The right `ResizablePanel` (currently label="AI Review") becomes label="Review". Its child content is replaced by a new `ReviewPanelTabs` wrapper component that renders a tab bar and conditionally shows either `ExplanationPanel` or `ReviewActionsPanel`.

```
ResizablePanel (label="Review")
└── ReviewPanelTabs
    ├── tab bar: [ AI Review | Actions (n) ]
    ├── if "AI Review" → <ExplanationPanel />
    └── if "Actions" → <ReviewActionsPanel />
```

Tab state is local to `ReviewPanelTabs` (no context needed).

## Changes

### New Files

| File | Purpose |
|------|---------|
| `src/client/components/ReviewPanelTabs.tsx` | Tab bar + conditional rendering of the two panels |
| `src/client/components/ReviewActionsPanel.tsx` | Full review management panel (comments, verdict, submit) |

### Modified Files

| File | Change |
|------|--------|
| `src/client/App.tsx` | Change `label="AI Review"` to `label="Review"`, replace `<ExplanationPanel />` with `<ReviewPanelTabs />` |
| `src/client/components/StatusBar.tsx` | Remove "Submit Review (n)" button and popover trigger, revert to passive display (or show a small passive "n pending" badge) |

### Deleted Files

| File | Reason |
|------|--------|
| `src/client/components/ReviewSubmitPopover.tsx` | Content moved into ReviewActionsPanel |

## ReviewPanelTabs Component

```typescript
interface Tab { id: 'review' | 'actions'; label: string; badge?: number }
```

- Renders a minimal tab bar at the top (two buttons, active gets accent underline)
- "Actions" tab shows a count badge when `pendingReview.comments.length > 0`
- Manages `activeTab` state locally (default: 'review')
- Renders `<ExplanationPanel />` or `<ReviewActionsPanel />` based on active tab
- Both panels remain mounted (not unmounted on tab switch) to preserve scroll position and textarea state

## ReviewActionsPanel Layout

Top-to-bottom, the panel contains:

1. **Scrollable content area** (flex-1, overflow-y-auto):
   - **Empty state** — when no comments pending and no PR loaded: "Add comments from findings or the diff viewer, then submit your review here."
   - **Pending comments list** — each comment as an editable card:
     - Type badge: inline shows `filename:line` in accent, general shows "PR comment"
     - Body: full text displayed, click to edit (turns into textarea), or a small edit icon
     - Remove (x) button
   - **"+ Add PR comment" button** — expands into textarea + Add/Cancel

2. **Sticky footer** (shrink-0, border-t, pinned to bottom):
   - **Verdict picker** — three buttons: Approve (green), Request Changes (red), Comment (neutral)
   - **Submit button** — full-width, disabled when nothing to submit
   - **Error display** — appears below submit if submission fails

## StatusBar Changes

Remove:
- The `popoverOpen` state
- The "Submit Review (n)" button
- The `ReviewSubmitPopover` import and render

The StatusBar returns to a passive information display. Optionally show a subtle "n pending" text next to the PR info when `pendingReview.comments.length > 0`, styled the same as the existing muted text.

## What Stays the Same

- `FindingCard` "Add inline" / "Add as general" buttons (entry points)
- `DiffViewer` gutter comment widget
- All pending review state/actions in `ReviewContext` and `TabsContext`
- `ExplanationPanel` internal behavior (presets, A2UI, chat, etc.)

## Non-Goals

- Reordering comments (not needed for v1)
- Drag-and-drop
- Persisting which tab is active across sessions
