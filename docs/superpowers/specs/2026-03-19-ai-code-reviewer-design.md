# AI-Assisted Code Reviewer - Design Spec

## Overview

A CLI-launched web app that takes a GitHub PR URL, fetches the PR details via `gh` CLI, generates AI-powered explanations using Claude Code (`claude` CLI), and presents everything in a three-column Monaco editor interface with an interactive chat panel.

## Goals

- Provide clear, contextual explanations of PR changes using Claude Opus 4.6
- Show code diffs in a professional Monaco side-by-side diff editor
- Enable follow-up questions about the code via a chat interface
- When launched from the PR's repo, leverage the full codebase for richer context

## Non-Goals

- Acting as a CI/CD bot or automated reviewer
- Posting comments back to GitHub
- Supporting non-GitHub providers (GitLab, Bitbucket)

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Express.js (TypeScript)
- **Diff View**: Monaco Editor (`@monaco-editor/react` DiffEditor)
- **AI Backend**: Claude Code CLI (`claude -p`)
- **PR Data**: GitHub CLI (`gh`)
- **Package**: npm package with CLI entry point

## Architecture

### System Flow

```
User runs: code-reviewer <pr-url>

1. CLI parses PR URL → extracts owner/repo/number
2. CLI detects repo mode vs standalone mode
3. Express server starts on random available port
4. Browser opens automatically to localhost:<port>
5. Server fetches PR data via gh CLI
6. Server generates AI explanation via claude CLI
7. Frontend renders three-column layout
8. User interacts: browse files, read diffs, ask questions
```

### Repo Detection

Two operating modes, auto-detected at startup:

**Repo Mode** - CWD is inside a git repo whose remote matches the PR's repo:
- Claude Code is launched from the repo root with file access tools (`Read`, `Glob`, `Grep`)
- Can read imports, tests, types, and related files for deeper explanations
- Detection:
  1. `git rev-parse --show-toplevel` to find repo root
  2. `git remote -v` to get ALL remote URLs (not just origin — supports fork workflows where `upstream` is the PR target)
  3. Normalize all URLs: strip `.git` suffix, convert `git@github.com:org/repo` → `github.com/org/repo`, strip protocol/scheme
  4. Compare normalized URLs against the PR's `owner/repo`

**Standalone Mode** - CWD is not a matching repo:
- Claude Code receives only the PR diff and metadata in the prompt
- Explanations are based purely on the changed code
- Still provides useful reviews, just less contextual

### Backend (Express API)

#### Endpoints

**`POST /api/review`** (SSE streamed response)
- Input: `{ prUrl: string }`
- Parses PR URL to extract `owner`, `repo`, `number`
- **URL validation**: `owner` and `repo` must match `[a-zA-Z0-9._-]+`, `number` must be a positive integer. Reject anything else before executing commands.
- **Command execution**: Use `execFile` (not `exec`) for all `gh` and `claude` CLI calls to prevent shell injection.
- Runs `gh pr view` and `gh pr diff` to fetch metadata and unified diff
- File content fetching: fetches base and head versions **in parallel** (Promise.all batches of 5) via `gh api repos/<owner>/<repo>/contents/<path>?ref=<ref>`
  - **1MB limit**: GitHub Contents API fails for files >1MB. Fallback: in repo mode, use `git show <ref>:<path>`. In standalone mode, skip and show a placeholder.
  - **Binary files**: Detected by GitHub API response (`encoding: "none"`). Skipped with a "binary file" placeholder in the diff view.
- **Server-side cache**: In-memory Map keyed by `repo/ref/path` stores fetched file contents. Shared between the review and file-content endpoints to avoid redundant API calls.
- Streams progress events to the frontend via SSE:
  1. `{ event: "pr-metadata", data: { title, body, author, files... } }` — immediate, lets UI render file tree
  2. `{ event: "file-content", data: { path, status } }` — per file as content is fetched
  3. `{ event: "explanation", data: { chunk } }` — streamed AI explanation tokens
  4. `{ event: "done", data: { mode, summary, sessionId } }` — final event, includes Claude session ID for chat
- **SSE over POST**: Since `EventSource` only supports GET, the frontend uses `fetch()` with `ReadableStream` to consume the SSE stream from POST endpoints.

**`POST /api/chat`** (SSE streamed response)
- Input: `{ question: string, sessionId: string }`
- Uses Claude CLI's `--resume <sessionId>` flag to continue the existing conversation session, preserving full context and tool-use state from the initial review
- The initial review creates a session; subsequent chat messages resume it
- This avoids reconstructing history in the prompt and prevents context window bloat
- **Conversation cap**: After 20 messages, warn the user that context may degrade and offer to start a fresh session
- Returns: streamed response (Server-Sent Events)

**`GET /api/file-content`**
- Input: query params `repo`, `ref`, `path`
- **Reads from server-side cache first** (populated during review). Falls back to `gh api` if cache miss. Cache lives for the server's lifetime and is cleaned up on process exit (no eviction needed for a single-session CLI tool).
- Returns raw file content for Monaco editor (base or head version)
- Used to populate both sides of the diff editor

#### AI Integration (Claude Code CLI)

**Repo mode prompt:**
```
You are reviewing a GitHub PR. You have access to the full codebase via Read, Glob, and Grep tools.

PR: {title} by {author}
Description: {body}

Diff:
{unified diff}

Provide:
1. A high-level summary of what this PR does and why
2. For each changed file, explain what changed and why
3. Call out any potential issues, edge cases, or improvements

Use the codebase tools to read related files (imports, tests, types) for context.
```

Invocation (repo mode):
```bash
echo "<prompt>" | claude -p --model claude-opus-4-6-20250925 \
  --output-format stream-json \
  --allowedTools "Read,Glob,Grep"
```
Working directory set to the repo root.

**Standalone mode prompt:**
Same prompt structure but without the "use codebase tools" instruction. No `--allowedTools` flag.

```bash
echo "<prompt>" | claude -p --model claude-opus-4-6-20250925 \
  --output-format stream-json
```

**Chat follow-up invocation:**
```bash
echo "<follow-up question>" | claude -p \
  --model claude-opus-4-6-20250925 \
  --output-format stream-json \
  --resume <sessionId> \
  [--allowedTools "Read,Glob,Grep"]  # only in repo mode
```

The `--resume` flag continues the Claude CLI session from the initial review, preserving the full conversation context and any tool-use state. The server stores the session ID returned from the initial review invocation.

### Frontend (React + Vite)

#### Layout: Three-Column

```
┌──────────────────────────────────────────────────────────────────┐
│  Code Reviewer  │  [PR URL input]                    │ [Review]  │
├────────┬────────────────────────────────┬────────────────────────┤
│        │          Monaco DiffEditor     │   AI Explanation       │
│ Files  │  ┌───────────┬──────────────┐  │                        │
│        │  │  Base     │  Head        │  │   Per-file explanation  │
│ src/   │  │  (left)   │  (right)     │  │   rendered as markdown  │
│  auth  │  │           │              │  │                         │
│  mid.. │  │           │              │  │  ─────────────────────  │
│  type  │  │           │              │  │   Chat                  │
│        │  └───────────┴──────────────┘  │   [Ask a question...]   │
├────────┴────────────────────────────────┴────────────────────────┤
│  repo mode ● | PR #142 | 5 files | +234 -56                     │
└──────────────────────────────────────────────────────────────────┘
```

#### Components

- **`App`** - Root component, manages PR state, triggers review
- **`PRInput`** - Top bar with URL input and Review button
- **`FileTree`** - Left panel listing changed files with +/- stats
- **`DiffViewer`** - Center panel with Monaco `DiffEditor` (side-by-side mode)
- **`ExplanationPanel`** - Right panel with AI explanation (markdown rendered) + chat
- **`ChatPanel`** - Chat input + message list within the explanation panel
- **`StatusBar`** - Bottom bar showing mode, PR info, file stats

#### State Management

React context (`ReviewContext`) holding:
- `prData` - PR metadata and file list
- `explanation` - AI-generated PR summary
- `fileExplanations` - Per-file explanations map
- `selectedFile` - Currently selected file
- `mode` - "repo" | "standalone"
- `chatHistory` - Array of chat messages
- `loading` - Loading states for review and chat

#### Monaco Editor Setup

- Use `@monaco-editor/react` with `DiffEditor` component
- Language auto-detected from file extension
- Theme: VS Code dark (matches the app theme)
- Read-only mode (viewing only, not editing)
- Original = base ref content, Modified = head ref content

#### Chat Interface

- Messages rendered as alternating user/assistant bubbles
- Assistant messages rendered as markdown (for code blocks, lists)
- Streamed responses via SSE - tokens appear as they arrive
- Input at bottom with send button and Enter key support
- Context badge shows "repo mode" or "standalone mode"

### CLI Entry Point

```bash
# Usage
code-reviewer <pr-url> [--model <model-id>] [--no-browser] [--port <port>]

# Examples
code-reviewer https://github.com/org/repo/pull/142
code-reviewer org/repo#142  # shorthand

# From a matching repo directory (auto-enables repo mode)
cd ~/projects/my-app
code-reviewer https://github.com/org/my-app/pull/142

# Custom model
code-reviewer https://github.com/org/repo/pull/142 --model claude-sonnet-4-6-20250514
```

**URL parsing rules:**
- Full URL: `https://github.com/<owner>/<repo>/pull/<number>` — extract parts directly
- Shorthand: `<owner>/<repo>#<number>` — expand to full GitHub URL
- GitHub Enterprise: Not supported in v1 (future consideration)

**Flags:**
- `--model <id>`: Override the Claude model (default: `claude-opus-4-6-20250925`, env: `CODE_REVIEWER_MODEL`)
- `--no-browser`: Start server without opening browser
- `--port <port>`: Use a specific port instead of random

Behavior:
1. Parse and validate the PR URL argument
2. Detect repo mode (check all CWD git remotes against PR repo)
3. Find an available port (or use `--port`)
4. Start Express server
5. Open browser to `http://localhost:<port>?pr=<encoded-url>` (unless `--no-browser`)
6. Server auto-triggers the review
7. **Graceful shutdown**: SIGINT/SIGTERM kills child processes (claude, gh) and exits cleanly

### Build & Distribution

- **Development**: Vite dev server for frontend (with proxy to Express), `tsx` for backend hot-reload
- **Production build**: `vite build` outputs static assets to `dist/client/`. `tsc` compiles server to `dist/server/`. Express serves the built frontend assets from `dist/client/` in production.
- **npm package**: Published with `bin` entry pointing to compiled `dist/server/cli.js`. Users install via `npm install -g code-reviewer` or run with `npx code-reviewer`.

### Project Structure

```
code-reviewer/
├── package.json
├── tsconfig.json
├── tsconfig.server.json       # Separate tsconfig for server (Node target)
├── vite.config.ts
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── server/
│   │   ├── index.ts           # Express server setup + static file serving
│   │   ├── routes/
│   │   │   ├── review.ts      # POST /api/review (SSE)
│   │   │   ├── chat.ts        # POST /api/chat (SSE)
│   │   │   └── file.ts        # GET /api/file-content
│   │   ├── services/
│   │   │   ├── github.ts      # gh CLI wrapper (uses execFile)
│   │   │   ├── claude.ts      # claude CLI wrapper (uses execFile)
│   │   │   ├── repo-detect.ts # Repo mode detection (all remotes, URL normalization)
│   │   │   └── cache.ts       # In-memory file content cache
│   │   └── types.ts           # Shared types
│   └── client/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── context/
│       │   └── ReviewContext.tsx
│       ├── components/
│       │   ├── PRInput.tsx
│       │   ├── FileTree.tsx
│       │   ├── DiffViewer.tsx
│       │   ├── ExplanationPanel.tsx
│       │   ├── ChatPanel.tsx
│       │   └── StatusBar.tsx
│       └── styles/
│           └── app.css
└── docs/
```

## Error Handling

- **gh not authenticated**: Show clear message to run `gh auth login`
- **claude CLI not found**: Show install instructions for Claude Code
- **Invalid PR URL**: Validate format before making any calls
- **PR not found / no access**: Surface gh error message in the UI
- **Claude CLI timeout**: 120s timeout with retry option in UI
- **Large PRs**: If diff exceeds ~50KB, automatically switch to file-by-file mode: generate PR-level summary first, then explain each file individually as the user clicks on it. Show a banner in the UI indicating large-PR mode.
- **GitHub rate limits**: File content fetches are batched (5 concurrent). Cache prevents re-fetching. For very large PRs (50+ files), warn the user about potential rate limit impact.

## Future Considerations (Out of Scope)

- Support for GitLab/Bitbucket
- Posting review comments back to GitHub
- Saving/exporting review sessions
- Multi-PR comparison
