# Multi-PR Tabs — Design Spec

## Overview

Add tabbed multi-PR review support to the Code Reviewer desktop app. Each tab is a fully independent review session. Users can paste additional PR URLs at any time — each opens in a new tab and starts reviewing immediately in parallel. Navigation is via a horizontal tab bar.

## Goals

1. Review multiple PRs concurrently without losing context on any
2. Paste-and-go — adding a PR always opens a new tab, never replaces an existing review
3. Full isolation — each tab has its own state, Claude session, worktree, and cache
4. Minimal UI overhead — tabs are the only new UI element

## Non-Goals

- Cross-PR summary or dashboard
- Cross-PR chat (ask questions spanning multiple PRs)
- Tab reordering or drag-and-drop
- Tab persistence across app restarts (tabs start fresh on launch)

---

## Architecture

### State Model

Currently the app has a single `ReviewContext` holding all review state. This changes to a **tab-indexed state model**:

```
TabState {
  id: string (uuid)
  prUrl: string
  prData: PRMetadata | null
  explanation: string
  fileExplanations: Record<string, string>
  selectedFile: string | null
  mode: 'repo' | 'standalone'
  sessionId: string | null
  chatHistory: ChatMessage[]
  loading: boolean
  error: string | null
  annotations: Record<string, number[]>
  highlightedAnnotation: { file: string; line: number } | null
  a2uiPayload: object[] | null
  a2uiLoading: boolean
  a2uiError: string | null
  isCachedReview: boolean
  worktreePath: string | null
  repoPath: string | null
  activePresetId: string
}
```

A top-level `TabsContext` manages:
```
tabs: TabState[]
activeTabId: string
addTab(prUrl: string): void
closeTab(id: string): void
setActiveTab(id: string): void
```

The existing `ReviewContext` transforms into a **per-tab context** — it reads/writes the active tab's state from `TabsContext`.

### Tab Bar UI

- Position: horizontal strip between the PR input area and the main content
- Each tab displays:
  - Repo shortname + PR number (e.g., `claude-code #142`)
  - Loading spinner if review is in progress
  - Close button (×) on hover
- Active tab: highlighted background, no close button while loading
- Right end: "+" button to focus the PR input
- Overflow: horizontal scroll if many tabs (no wrapping)

### PR Input Behavior

- Submitting a PR URL always creates a new tab (calls `addTab`)
- Exception: if the current tab is "empty" (no PR loaded, fresh app launch), use it instead of creating a new one
- The input field clears after submission and remains available for the next URL

### Parallel Execution

- Each tab independently runs its own review flow:
  - Fetch metadata → check cache → create worktree → start Claude → stream → save cache → cleanup worktree → A2UI
- Multiple Claude processes can run simultaneously (one per tab)
- Tauri events need tab-scoping to avoid cross-talk (see Event Isolation below)

### Event Isolation

Problem: Tauri events like `review-chunk` and `chat-chunk` are global — if two reviews stream simultaneously, chunks would mix.

Solution: **Include a tab ID in the event payload** from the Rust side, and filter on the frontend.

- `start_review` and `send_chat_message` Rust commands accept an additional `tab_id: String` parameter
- Events are emitted as `review-chunk` with payload `{ tabId: string, text: string }` instead of just the text
- Frontend listeners filter by active tab ID or route to the correct tab's state

### Tab Lifecycle

1. **Created:** `addTab(prUrl)` → generates UUID, adds to tabs array, sets as active, triggers review
2. **Loading:** review streaming in progress, spinner shown on tab
3. **Complete:** review done, tab shows normally
4. **Closed:** user clicks × → cleanup worktree if active → remove from tabs array → if was active tab, switch to nearest neighbor

### Worktree Cleanup

- Each tab tracks its own `worktreePath` and `repoPath`
- Cleanup happens on:
  - Tab close (user clicks ×)
  - App quit (iterate all tabs, cleanup each)
  - Review complete (existing behavior — worktree removed after caching)

---

## UI Layout Change

```
Before:
┌──────────────────────────────────┐
│ PR Input Bar                     │
├──────────────────────────────────┤
│ FileTree │ DiffViewer │ Review   │
└──────────────────────────────────┘

After:
┌──────────────────────────────────┐
│ PR Input Bar                     │
├──────────────────────────────────┤
│ Tab Bar  [PR #1] [PR #2] [+]    │
├──────────────────────────────────┤
│ FileTree │ DiffViewer │ Review   │
└──────────────────────────────────┘
```

The tab bar is a thin horizontal strip (~32px) between the input and the main panels.

---

## Data Flow

### Adding a PR:
```
User pastes URL → addTab(url) → new TabState created
  → setActiveTab(newTab.id) → triggerReview(url, tabId)
  → review streams into that tab's state
  → other tabs unaffected
```

### Switching tabs:
```
User clicks tab → setActiveTab(tabId)
  → all panels re-render with that tab's state
  → DiffViewer shows that tab's selected file
  → ExplanationPanel shows that tab's review
  → ChatPanel shows that tab's chat history
```

### Closing a tab:
```
User clicks × → cleanupWorktree(tab) → removeTab(tabId)
  → if active: switch to adjacent tab (prefer left)
  → if last tab: show empty state (fresh app)
```

---

## Rust Backend Changes

### Modified Commands

`start_review` — add `tab_id: String` parameter:
```rust
#[tauri::command]
pub async fn start_review(
    app: AppHandle,
    tab_id: String,  // NEW
    pr: PRMetadata,
    diff: String,
    model: String,
    preset_id: String,
    worktree_path: Option<String>,
) -> Result<String, String>
```

Events emitted become:
```rust
app.emit("review-chunk", serde_json::json!({ "tabId": tab_id, "text": text }));
app.emit("review-session-id", serde_json::json!({ "tabId": tab_id, "sessionId": sid }));
app.emit("review-complete", serde_json::json!({ "tabId": tab_id }));
```

`send_chat_message` — add `tab_id: String` parameter:
```rust
#[tauri::command]
pub async fn send_chat_message(
    app: AppHandle,
    tab_id: String,  // NEW
    question: String,
    session_id: String,
    model: String,
    worktree_path: Option<String>,
) -> Result<(), String>
```

Events become:
```rust
app.emit("chat-chunk", serde_json::json!({ "tabId": tab_id, "text": text }));
app.emit("chat-complete", serde_json::json!({ "tabId": tab_id }));
```

### Unchanged Commands

All other commands (github, config, worktree, cache, presets, a2ui) remain unchanged — they're stateless and can be called from any tab.

---

## Frontend Changes Summary

| File | Change |
|------|--------|
| New: `src/client/context/TabsContext.tsx` | Tabs state management, tab CRUD |
| Modify: `src/client/context/ReviewContext.tsx` | Becomes per-tab state accessor (reads from active tab) |
| New: `src/client/components/TabBar.tsx` | Horizontal tab strip component |
| Modify: `src/client/components/PRInput.tsx` | Calls `addTab` instead of `triggerReview` directly |
| Modify: `src/client/App.tsx` | Wrap with `TabsProvider`, add `TabBar` to layout |
| Modify: `src/client/hooks/useTauriApi.ts` | Update event listener types to include tabId |

---

## Edge Cases

- **Duplicate PR:** If user pastes a URL for a PR already open in another tab, open a new tab anyway (they might want to re-review with a different preset)
- **All tabs closed:** Show empty state with PR input focused
- **Tab overflow:** Horizontal scroll, no max tab limit (practical limit ~10-15 before it gets unwieldy)
- **Error in one tab:** Does not affect other tabs. Error shown in that tab's view only.
- **Cached review in one tab, fresh in another:** Each tab independently checks its own cache based on its preset + SHA
