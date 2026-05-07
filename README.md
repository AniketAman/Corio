<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="Code Reviewer">
</p>

<h1 align="center">Code Reviewer</h1>

<p align="center">
  AI-powered GitHub PR review desktop app built with Tauri + React.
</p>

---

Paste a GitHub PR URL, get a detailed AI review powered by Claude. Supports multi-tab browsing, per-file explanations, inline annotations, interactive chat follow-ups, and one-click review comment submission back to GitHub.

## Features

- **AI-Powered Reviews** — Claude analyzes your PR diff and provides structured feedback with severity levels
- **Multi-Tab Interface** — Review multiple PRs simultaneously with Firefox-style tabs
- **Per-File Breakdown** — Explanations organized by file with inline code annotations
- **Interactive Chat** — Ask follow-up questions about the review with full context
- **Review Actions** — Draft and submit GitHub review comments directly from the app
- **Model Selection** — Choose between Opus (thorough), Sonnet (balanced), or Haiku (fast)
- **Custom Presets** — Create reusable review prompt templates with variable substitution
- **Notifications** — Native OS notifications when reviews complete (configurable)
- **Repo Mode** — Clone and analyze the full repository for deeper context
- **Caching** — Reviews are cached by PR SHA to avoid redundant API calls

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- A GitHub personal access token (for PR API access)
- An Anthropic API key (for Claude)

## Setup

```bash
git clone <repo-url>
cd code-reviewer
npm install
```

Create a `.env` file in the project root:

```
GITHUB_TOKEN=ghp_your_token_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

## Development

```bash
npm run tauri:dev
```

This launches the app with hot-reload for both the frontend (Vite) and the Rust backend.

## Production Build

```bash
npm run tauri:build
```

Output: `src-tauri/target/release/bundle/macos/Code Reviewer.app`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd + ,` | Open Settings |
| `Cmd + T` | New tab |
| `Cmd + W` | Close tab |
| `Cmd + Shift + ]` | Next tab |
| `Cmd + Shift + [` | Previous tab |
| `Cmd + 1-9` | Jump to tab |

## Tech Stack

- **Frontend:** React, Tailwind CSS v4, Radix UI, Monaco Editor
- **Backend:** Rust, Tauri v2
- **AI:** Anthropic Claude API (streaming)
- **Bundling:** Vite, Rolldown

## Project Structure

```
src/
  client/
    components/    # React UI components
    context/       # React contexts (Review, Tabs)
    hooks/         # Custom hooks (useTauriApi, useSettings)
    styles/        # Global CSS + Tailwind theme
    public/        # Static assets
src-tauri/
  src/
    commands/      # Tauri IPC command handlers
    services/      # Business logic (GitHub, AI, caching)
  icons/           # App icons (all platforms)
```

## License

Private — all rights reserved.
