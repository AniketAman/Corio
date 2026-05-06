# Tauri Desktop Rewrite — Design Spec

## Overview

Rewrite the Code Reviewer from a CLI-launched Express+Vite web app into a native macOS desktop application using Tauri. The Rust backend replaces Express for process spawning and IPC; the React frontend moves into a Tauri webview with minimal changes. Distribution target: `.dmg` for a small team.

## Goals

1. Run from anywhere — paste a PR URL, app handles repo resolution and branch checkout
2. Never disrupt working directory — use git worktrees for isolation
3. Native macOS experience — window management, notifications, theme, keyboard shortcuts
4. Editable presets — full prompt templates visible and modifiable in-app
5. Token-saving cache — repeat visits to unchanged PRs load instantly
6. A2UI always active — interactive rendering fires automatically after every review

## Non-Goals

- Bundling `claude` or `gh` CLIs (prerequisites the user installs separately)
- Team-shared preset sync (all local)
- Electron or Node SEA packaging
- Linux/Windows builds (macOS-first; others are future work)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Tauri App (.dmg)                               │
│                                                 │
│  ┌───────────────┐    IPC (invoke/listen)       │
│  │  React UI     │◄─────────────────────────►┐  │
│  │  (webview)    │                           │  │
│  └───────────────┘                           │  │
│                                              │  │
│  ┌───────────────────────────────────────────┤  │
│  │  Rust Backend (Tauri commands)            │  │
│  │                                           │  │
│  │  ├─ process::Command → `claude` CLI       │  │
│  │  ├─ process::Command → `gh` CLI           │  │
│  │  ├─ process::Command → `git` (worktrees)  │  │
│  │  ├─ Config / Preset / Cache I/O           │  │
│  │  └─ A2UI converter (spawns claude)        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Layers

| Layer | Responsibility | Tech |
|-------|---------------|------|
| Frontend | UI rendering, state management, IPC calls | React 19, Tailwind, Monaco, Radix, A2UI components |
| Backend | Process spawning, file I/O, worktree management | Rust (Tauri commands) |
| Persistence | Config, presets, cache | JSON files in `~/.code-reviewer/` |

---

## Core Flows

### 1. Review Launch

```
User pastes PR URL (or deep link / global shortcut)
  → parse owner/repo/number
  → Rust: `gh pr view` to get head SHA + branch name
  → check cache (key: owner/repo#number:presetId:headSHA)
      → HIT: return cached reviewText, skip Claude
      → MISS: continue
  → lookup repo in registry (~/.code-reviewer/config.json)
      → NOT FOUND: show native file picker → user selects repo root → save to registry
  → Rust: `git fetch origin` in the registered repo path
  → Rust: `git worktree add /tmp/.code-reviewer/<repo>-pr-<N> <branch>`
  → Rust: spawn `claude` with cwd = worktree path, stream output via IPC events
  → Frontend: render streaming review text
  → On complete: save to cache, auto-trigger A2UI conversion
  → On window close / new review: `git worktree remove --force`
```

### 2. Worktree Lifecycle

- **Created**: when a review starts for a cache-miss
- **Used as cwd**: for `claude` process (gives it Read/Glob/Grep access to the correct branch)
- **Cleaned up**: on review close, app quit, or starting a new review (whichever comes first)
- **Location**: `/tmp/.code-reviewer/<repo>-pr-<number>/`
- **Failure handling**: if worktree creation fails (branch conflict, unresolvable ref, disk error), fall back to standalone mode (review based on diff only, no codebase tool access) with a warning toast explaining why
- **Standalone fallback also applies** when repo is not in the registry and user dismisses the file picker

### 3. Cache

**Storage**: `~/.code-reviewer/cache/<owner>-<repo>-<number>-<preset>-<sha>.json`

**Schema**:
```json
{
  "key": "anthropics/claude-code#142:review:abc123f",
  "reviewText": "...",
  "prMetadata": { "title": "...", "author": "...", "files": [...] },
  "timestamp": "2026-05-06T10:00:00Z"
}
```

**Invalidation**:
- Automatic: head SHA differs from cached SHA
- Manual: user clicks "Re-review" button
- No TTL-based expiry (SHA-based is sufficient)

**UI indicators**:
- "Cached" badge shown when serving from cache
- "Re-review" button always visible (forces fresh Claude call)

### 4. Preset Management

**Storage**:
- Built-in presets: bundled in the Rust binary as default strings
- Custom presets: `~/.code-reviewer/presets/<id>.json`

**Preset schema** (unchanged):
```json
{
  "id": "my-custom",
  "name": "My Custom",
  "description": "One-line description",
  "template": "You are reviewing...\n{{diff}}\n...",
  "builtIn": false,
  "parseFileMarkers": true
}
```

**UI**:
- Preset panel accessible from main screen (not just a dropdown)
- Each preset shows: name, description, full template text
- Built-in presets: read-only view, "Duplicate" button to create editable copy
- Custom presets: edit name, description, template (Monaco editor with placeholder highlighting)
- Delete/reorder for custom presets
- Template placeholders documented with inline reference: `{{title}}`, `{{author}}`, `{{fileCount}}`, `{{additions}}`, `{{deletions}}`, `{{body}}`, `{{diff}}`, `{{fileInstructions}}`, `{{repoContext}}`, `{{repoToolHint}}`

### 5. A2UI (Always Active)

- No `--a2ui` flag, no `a2uiEnabled` state
- After every review completes (fresh or cached), A2UI conversion fires automatically
- Classic/interactive toggle remains (user can switch to raw markdown view)
- "Generate Interactive View" button removed (replaced by automatic triggering)

### 6. Repo Registry

**Storage**: `~/.code-reviewer/config.json`

```json
{
  "repos": {
    "anthropics/claude-code": "/Users/aniket.aman/repos/claude-code",
    "myorg/backend": "/Users/aniket.aman/work/backend"
  },
  "defaults": {
    "model": "claude-opus-4-6-20250925",
    "preset": "review"
  }
}
```

**Management**:
- Auto-prompt on first review of unknown repo (native file picker)
- Editable in Settings screen (add, remove, update paths)
- Validation: on save, check that path exists and has a `.git` directory

---

## Native Features

### Global Keyboard Shortcut

- `Cmd+Shift+R`: opens the app (or brings to front)
- If clipboard contains a PR URL, auto-populates the input field

### Deep Links

- Register URL scheme: `code-reviewer://owner/repo/number`
- Clicking a deep link opens the app and starts a review
- Useful for Slack/browser integration

### Notifications

- System notification when a review completes (user may have switched windows during the 30-60s wait)
- Notification click brings app window to front

### Window State Persistence

- Remember window size, position, and last-reviewed PR between launches
- Stored in Tauri's default app data path

### System Theme

- Follow macOS appearance (light/dark)
- Tailwind `@media (prefers-color-scheme: dark)` — existing CSS likely supports this already

### Auto-Updater

- Tauri built-in updater
- Check on launch + periodic background check
- Update prompt shown in-app (non-blocking)

### Menu Bar

- File: New Review, Close Window
- Edit: Copy, Paste, Select All
- View: Toggle Sidebar, Zoom In/Out
- Preferences: `Cmd+,` opens settings

### Dock Integration

- Dock icon shows progress indicator while review is in-flight
- Drag & drop PR URL onto dock icon to start a review

---

## Project Structure

```
code-reviewer/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs              # Tauri entry, window setup, menu
│   │   ├── commands/
│   │   │   ├── review.rs        # Start review, stream output
│   │   │   ├── chat.rs          # Follow-up questions
│   │   │   ├── github.rs        # PR metadata, diff via `gh`
│   │   │   ├── worktree.rs      # Create/remove git worktrees
│   │   │   ├── cache.rs         # Read/write/invalidate cache
│   │   │   ├── presets.rs       # CRUD for presets
│   │   │   ├── config.rs        # Repo registry, defaults
│   │   │   └── a2ui.rs          # A2UI conversion
│   │   ├── services/
│   │   │   ├── process.rs       # Shared process spawn + stream helpers
│   │   │   └── paths.rs         # Config dir resolution
│   │   └── lib.rs
│   └── icons/                   # App icons for macOS
├── src/
│   ├── client/                  # React frontend (mostly unchanged)
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── context/
│   │   ├── a2ui/
│   │   └── ...
│   └── (server/ — removed, replaced by src-tauri/)
├── docs/
├── package.json                 # Frontend deps only
├── vite.config.ts
└── CONTEXT.md
```

---

## Migration Plan (high-level)

1. Scaffold Tauri project (`src-tauri/`) alongside existing source
2. Port Express routes → Tauri commands (Rust), one module at a time
3. Replace `fetch('/api/...')` calls in React with `invoke('command_name', {...})`
4. Replace SSE streaming with Tauri event listeners (`listen('review-chunk', ...)`)
5. Add worktree management (new functionality)
6. Add cache layer (new functionality)
7. Add preset editor UI (new frontend work)
8. Remove `--a2ui` conditionals, make always-on
9. Add native features (shortcuts, notifications, deep links, menu, auto-updater)
10. Remove `src/server/`, `src/cli.ts`, Express/cors dependencies
11. Build `.dmg`, test distribution

---

## Prerequisites (User's Machine)

- `gh` CLI installed and authenticated
- `claude` CLI installed and authenticated
- Git installed
- macOS 12+ (Tauri webview requirement)

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Worktree vs branch switch | Worktree (user has uncommitted work) |
| Worktree cleanup | Auto on close |
| Preset sharing | Local only |
| Cache invalidation | SHA-based + manual re-review |
| Cache contents | Review text only (A2UI re-renders from text) |
| A2UI activation | Always on, no flag |
| Distribution | `.dmg` for macOS |
| CLI bundling | Not bundled, prerequisites |
