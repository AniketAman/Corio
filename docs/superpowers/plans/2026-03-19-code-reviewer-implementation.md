# Code Reviewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI-launched web app that reviews GitHub PRs using Claude Code, with a three-column Monaco diff UI and chat interface.

**Architecture:** Express backend + Vite React frontend. Backend shells out to `gh` and `claude` CLIs. Repo-aware mode detects if running from matching git repo and gives Claude codebase access. SSE streams for progressive loading.

**Tech Stack:** TypeScript, Express, React, Vite, Monaco Editor, GitHub CLI, Claude Code CLI

---

## File Structure

### Backend
- `src/cli.ts` - CLI entry point, URL parsing, repo detection, server startup
- `src/server/index.ts` - Express app, static serving, graceful shutdown
- `src/server/types.ts` - Shared TypeScript types
- `src/server/services/github.ts` - GitHub API wrapper via `gh` CLI
- `src/server/services/claude.ts` - Claude Code CLI wrapper
- `src/server/services/repo-detect.ts` - Repo mode detection logic
- `src/server/services/cache.ts` - In-memory file content cache
- `src/server/routes/review.ts` - POST /api/review endpoint (SSE)
- `src/server/routes/chat.ts` - POST /api/chat endpoint (SSE)
- `src/server/routes/file.ts` - GET /api/file-content endpoint

### Frontend
- `src/client/index.html` - HTML entry point
- `src/client/main.tsx` - React app mount
- `src/client/App.tsx` - Root component
- `src/client/context/ReviewContext.tsx` - Global state management
- `src/client/components/PRInput.tsx` - URL input + Review button
- `src/client/components/FileTree.tsx` - Left panel file list
- `src/client/components/DiffViewer.tsx` - Center Monaco diff editor
- `src/client/components/ExplanationPanel.tsx` - Right panel AI + chat
- `src/client/components/ChatPanel.tsx` - Chat messages + input
- `src/client/components/StatusBar.tsx` - Bottom status bar
- `src/client/styles/app.css` - Global styles

### Config
- `package.json` - Dependencies, scripts, bin entry
- `tsconfig.json` - Frontend TypeScript config
- `tsconfig.server.json` - Backend TypeScript config (Node target)
- `vite.config.ts` - Vite build config
- `.gitignore` - Git ignore rules

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express cors
npm install --save-dev @types/node @types/express @types/cors typescript tsx vite @vitejs/plugin-react
npm install react react-dom @monaco-editor/react
npm install --save-dev @types/react @types/react-dom
npm install react-markdown
```

- [ ] **Step 3: Update package.json with scripts and bin**

```json
{
  "name": "code-reviewer",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "code-reviewer": "./dist/server/cli.js"
  },
  "scripts": {
    "dev:server": "tsx watch src/cli.ts",
    "dev:client": "vite",
    "build:server": "tsc -p tsconfig.server.json",
    "build:client": "vite build",
    "build": "npm run build:client && npm run build:server",
    "start": "node dist/server/cli.js"
  }
}
```

- [ ] **Step 4: Create tsconfig.json for frontend**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/client"]
}
```

- [ ] **Step 5: Create tsconfig.server.json for backend**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist/server",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/cli.ts", "src/server/**/*"],
  "exclude": ["src/client"]
}
```

- [ ] **Step 6: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

- [ ] **Step 7: Create .gitignore**

```
node_modules
dist
.env
.DS_Store
.superpowers
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.server.json vite.config.ts .gitignore
git commit -m "chore: initial project setup with TypeScript, Vite, and Express"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/server/types.ts`

- [ ] **Step 1: Create shared type definitions**

```typescript
export interface PRMetadata {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  headRef: string;
  additions: number;
  deletions: number;
  files: PRFile[];
}

export interface PRFile {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'removed' | 'renamed';
}

export interface ReviewMode {
  type: 'repo' | 'standalone';
  repoRoot?: string;
}

export interface SSEEvent {
  event: string;
  data: any;
}

export interface FileContent {
  content: string;
  encoding?: string;
  size?: number;
  isBinary?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/types.ts
git commit -m "feat: add shared TypeScript type definitions"
```

---

## Task 3: File Content Cache Service

**Files:**
- Create: `src/server/services/cache.ts`

- [ ] **Step 1: Implement in-memory cache**

```typescript
import { FileContent } from '../types.js';

class FileCache {
  private cache = new Map<string, FileContent>();

  private makeKey(repo: string, ref: string, path: string): string {
    return `${repo}/${ref}/${path}`;
  }

  get(repo: string, ref: string, path: string): FileContent | undefined {
    return this.cache.get(this.makeKey(repo, ref, path));
  }

  set(repo: string, ref: string, path: string, content: FileContent): void {
    this.cache.set(this.makeKey(repo, ref, path), content);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const fileCache = new FileCache();
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/cache.ts
git commit -m "feat: add in-memory file content cache"
```

---

## Task 4: Repo Detection Service

**Files:**
- Create: `src/server/services/repo-detect.ts`

- [ ] **Step 1: Implement repo detection with URL normalization**

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ReviewMode } from '../types.js';

const execFileAsync = promisify(execFile);

function normalizeGitURL(url: string): string {
  // Remove .git suffix
  url = url.replace(/\.git$/, '');

  // Convert SSH to HTTPS format: git@github.com:org/repo -> github.com/org/repo
  url = url.replace(/^git@([^:]+):/, '$1/');

  // Strip protocol
  url = url.replace(/^https?:\/\//, '');
  url = url.replace(/^git:\/\//, '');

  return url.toLowerCase();
}

export async function detectRepoMode(owner: string, repo: string): Promise<ReviewMode> {
  try {
    // Get repo root
    const { stdout: repoRoot } = await execFileAsync('git', [
      'rev-parse',
      '--show-toplevel'
    ]);
    const root = repoRoot.trim();

    // Get all remotes
    const { stdout: remotesOutput } = await execFileAsync('git', [
      'remote',
      '-v'
    ], { cwd: root });

    // Extract URLs and normalize
    const remoteURLs = remotesOutput
      .split('\n')
      .map(line => line.split(/\s+/)[1])
      .filter(Boolean)
      .map(normalizeGitURL);

    // Check if any remote matches the PR repo
    const prRepoPath = `github.com/${owner}/${repo}`.toLowerCase();
    const isMatch = remoteURLs.some(url => url.includes(prRepoPath));

    if (isMatch) {
      return { type: 'repo', repoRoot: root };
    }
  } catch (error) {
    // Not a git repo or git command failed
  }

  return { type: 'standalone' };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/repo-detect.ts
git commit -m "feat: add repo detection with URL normalization"
```

---

## Task 5: GitHub Service

**Files:**
- Create: `src/server/services/github.ts`

- [ ] **Step 1: Implement GitHub CLI wrapper**

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PRMetadata, PRFile, FileContent } from '../types.js';
import { fileCache } from './cache.js';

const execFileAsync = promisify(execFile);

export async function fetchPRMetadata(
  owner: string,
  repo: string,
  number: number
): Promise<PRMetadata> {
  const { stdout } = await execFileAsync('gh', [
    'pr',
    'view',
    number.toString(),
    '--repo',
    `${owner}/${repo}`,
    '--json',
    'title,body,author,files,additions,deletions,baseRefName,headRefName'
  ]);

  const data = JSON.parse(stdout);

  return {
    owner,
    repo,
    number,
    title: data.title,
    body: data.body || '',
    author: data.author?.login || 'unknown',
    baseRef: data.baseRefName,
    headRef: data.headRefName,
    additions: data.additions,
    deletions: data.deletions,
    files: data.files.map((f: any): PRFile => ({
      path: f.path,
      additions: f.additions,
      deletions: f.deletions,
      status: f.status
    }))
  };
}

export async function fetchPRDiff(
  owner: string,
  repo: string,
  number: number
): Promise<string> {
  const { stdout } = await execFileAsync('gh', [
    'pr',
    'diff',
    number.toString(),
    '--repo',
    `${owner}/${repo}`
  ]);

  return stdout;
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  repoRoot?: string
): Promise<FileContent> {
  // Check cache first
  const cached = fileCache.get(`${owner}/${repo}`, ref, path);
  if (cached) {
    return cached;
  }

  let content: FileContent;

  try {
    // Try GitHub API first
    const { stdout } = await execFileAsync('gh', [
      'api',
      `repos/${owner}/${repo}/contents/${path}`,
      '-q',
      '.content,.encoding,.size',
      '--jq',
      '{content,encoding,size}',
      '-F',
      `ref=${ref}`
    ]);

    const data = JSON.parse(stdout);

    // Check if binary
    if (data.encoding === 'none') {
      content = {
        content: '[Binary file]',
        isBinary: true,
        size: data.size
      };
    } else {
      // Decode base64
      const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
      content = {
        content: decoded,
        encoding: data.encoding,
        size: data.size
      };
    }
  } catch (error: any) {
    // Fallback: use git show in repo mode
    if (repoRoot && error.message?.includes('too large')) {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `${ref}:${path}`],
        { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 }
      );
      content = { content: stdout };
    } else {
      throw error;
    }
  }

  // Cache it
  fileCache.set(`${owner}/${repo}`, ref, path, content);
  return content;
}

export async function fetchFileContentBatch(
  owner: string,
  repo: string,
  files: { ref: string; path: string }[],
  repoRoot?: string,
  onProgress?: (path: string, status: 'success' | 'error') => void
): Promise<void> {
  // Process in batches of 5
  const batchSize = 5;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ({ ref, path }) => {
        try {
          await fetchFileContent(owner, repo, ref, path, repoRoot);
          onProgress?.(path, 'success');
        } catch (error) {
          console.error(`Failed to fetch ${path}:`, error);
          onProgress?.(path, 'error');
        }
      })
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/github.ts
git commit -m "feat: add GitHub service with batched file fetching"
```

---

## Task 6: Claude Service

**Files:**
- Create: `src/server/services/claude.ts`

- [ ] **Step 1: Implement Claude CLI wrapper**

```typescript
import { spawn } from 'child_process';
import { PRMetadata, ReviewMode } from '../types.js';

export interface ClaudeStreamOptions {
  onToken: (token: string) => void;
  onSessionId?: (sessionId: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export function streamReviewExplanation(
  pr: PRMetadata,
  diff: string,
  mode: ReviewMode,
  modelId: string,
  options: ClaudeStreamOptions
): void {
  const prompt = buildReviewPrompt(pr, diff, mode);

  const args = [
    '-p',
    '--model', modelId,
    '--output-format', 'stream-json'
  ];

  if (mode.type === 'repo') {
    args.push('--allowedTools', 'Read,Glob,Grep');
  }

  const claude = spawn('claude', args, {
    cwd: mode.type === 'repo' ? mode.repoRoot : process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  claude.stdin.write(prompt);
  claude.stdin.end();

  let buffer = '';

  claude.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const data = JSON.parse(line);

        // Extract session ID from metadata
        if (data.session_id) {
          options.onSessionId?.(data.session_id);
        }

        // Extract text content
        if (data.type === 'content_block_delta' && data.delta?.text) {
          options.onToken(data.delta.text);
        }
      } catch (error) {
        // Skip malformed JSON
      }
    }
  });

  claude.stderr.on('data', (chunk) => {
    console.error('Claude stderr:', chunk.toString());
  });

  claude.on('close', (code) => {
    if (code === 0) {
      options.onComplete();
    } else {
      options.onError(new Error(`Claude exited with code ${code}`));
    }
  });

  claude.on('error', (error) => {
    options.onError(error);
  });
}

export function streamChatResponse(
  question: string,
  sessionId: string,
  mode: ReviewMode,
  modelId: string,
  options: ClaudeStreamOptions
): void {
  const args = [
    '-p',
    '--model', modelId,
    '--output-format', 'stream-json',
    '--resume', sessionId
  ];

  if (mode.type === 'repo') {
    args.push('--allowedTools', 'Read,Glob,Grep');
  }

  const claude = spawn('claude', args, {
    cwd: mode.type === 'repo' ? mode.repoRoot : process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  claude.stdin.write(question);
  claude.stdin.end();

  let buffer = '';

  claude.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const data = JSON.parse(line);

        if (data.type === 'content_block_delta' && data.delta?.text) {
          options.onToken(data.delta.text);
        }
      } catch (error) {
        // Skip malformed JSON
      }
    }
  });

  claude.stderr.on('data', (chunk) => {
    console.error('Claude stderr:', chunk.toString());
  });

  claude.on('close', (code) => {
    if (code === 0) {
      options.onComplete();
    } else {
      options.onError(new Error(`Claude exited with code ${code}`));
    }
  });

  claude.on('error', (error) => {
    options.onError(error);
  });
}

function buildReviewPrompt(
  pr: PRMetadata,
  diff: string,
  mode: ReviewMode
): string {
  const basePrompt = `You are reviewing a GitHub PR${mode.type === 'repo' ? '. You have access to the full codebase via Read, Glob, and Grep tools' : ''}.

PR: ${pr.title} by ${pr.author}
Description: ${pr.body}

Diff:
${diff}

Provide:
1. A high-level summary of what this PR does and why
2. For each changed file, explain what changed and why
3. Call out any potential issues, edge cases, or improvements
${mode.type === 'repo' ? '\nUse the codebase tools to read related files (imports, tests, types) for context.' : ''}`;

  return basePrompt;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/claude.ts
git commit -m "feat: add Claude CLI service with streaming support"
```

---

## Task 7: Review Route (SSE)

**Files:**
- Create: `src/server/routes/review.ts`

- [ ] **Step 1: Implement SSE review endpoint**

```typescript
import { Router, Request, Response } from 'express';
import { fetchPRMetadata, fetchPRDiff, fetchFileContentBatch } from '../services/github.js';
import { streamReviewExplanation } from '../services/claude.js';
import { detectRepoMode } from '../services/repo-detect.js';

export const reviewRouter = Router();

function validatePRUrl(prUrl: string): { owner: string; repo: string; number: number } | null {
  // Full URL: https://github.com/owner/repo/pull/123
  const fullMatch = prUrl.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\/pull\/(\d+)/);
  if (fullMatch) {
    return {
      owner: fullMatch[1],
      repo: fullMatch[2],
      number: parseInt(fullMatch[3], 10)
    };
  }

  // Shorthand: owner/repo#123
  const shortMatch = prUrl.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)#(\d+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      number: parseInt(shortMatch[3], 10)
    };
  }

  return null;
}

reviewRouter.post('/review', async (req: Request, res: Response) => {
  const { prUrl, modelId = 'claude-opus-4-6-20250925' } = req.body;

  // Validate URL
  const parsed = validatePRUrl(prUrl);
  if (!parsed) {
    res.status(400).json({ error: 'Invalid PR URL format' });
    return;
  }

  const { owner, repo, number } = parsed;

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sendEvent(event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    // Detect repo mode
    const mode = await detectRepoMode(owner, repo);

    // Fetch PR metadata
    const pr = await fetchPRMetadata(owner, repo, number);
    sendEvent('pr-metadata', { pr, mode: mode.type });

    // Fetch diff
    const diff = await fetchPRDiff(owner, repo, number);

    // Fetch file contents in parallel
    const filesToFetch = pr.files.flatMap(f => [
      { ref: pr.baseRef, path: f.path },
      { ref: pr.headRef, path: f.path }
    ]);

    await fetchFileContentBatch(
      owner,
      repo,
      filesToFetch,
      mode.repoRoot,
      (path, status) => {
        sendEvent('file-content', { path, status });
      }
    );

    // Stream Claude explanation
    let sessionId: string | undefined;

    streamReviewExplanation(pr, diff, mode, modelId, {
      onToken: (token) => {
        sendEvent('explanation', { chunk: token });
      },
      onSessionId: (id) => {
        sessionId = id;
      },
      onError: (error) => {
        sendEvent('error', { message: error.message });
        res.end();
      },
      onComplete: () => {
        sendEvent('done', { sessionId, mode: mode.type });
        res.end();
      }
    });
  } catch (error: any) {
    sendEvent('error', { message: error.message });
    res.end();
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/server/routes/review.ts
git commit -m "feat: add SSE review endpoint with progressive loading"
```

---

## Task 8: Chat Route (SSE)

**Files:**
- Create: `src/server/routes/chat.ts`

- [ ] **Step 1: Implement SSE chat endpoint**

```typescript
import { Router, Request, Response } from 'express';
import { streamChatResponse } from '../services/claude.js';
import { ReviewMode } from '../types.js';

export const chatRouter = Router();

chatRouter.post('/chat', (req: Request, res: Response) => {
  const { question, sessionId, mode, modelId = 'claude-opus-4-6-20250925' } = req.body;

  if (!question || !sessionId) {
    res.status(400).json({ error: 'Missing question or sessionId' });
    return;
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sendEvent(event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  const reviewMode: ReviewMode = mode || { type: 'standalone' };

  streamChatResponse(question, sessionId, reviewMode, modelId, {
    onToken: (token) => {
      sendEvent('message', { chunk: token });
    },
    onError: (error) => {
      sendEvent('error', { message: error.message });
      res.end();
    },
    onComplete: () => {
      sendEvent('done', {});
      res.end();
    }
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/server/routes/chat.ts
git commit -m "feat: add SSE chat endpoint with session resumption"
```

---

## Task 9: File Content Route

**Files:**
- Create: `src/server/routes/file.ts`

- [ ] **Step 1: Implement file content endpoint**

```typescript
import { Router, Request, Response } from 'express';
import { fetchFileContent } from '../services/github.js';

export const fileRouter = Router();

fileRouter.get('/file-content', async (req: Request, res: Response) => {
  const { repo, ref, path } = req.query;

  if (!repo || !ref || !path || typeof repo !== 'string' || typeof ref !== 'string' || typeof path !== 'string') {
    res.status(400).json({ error: 'Missing or invalid query params: repo, ref, path' });
    return;
  }

  // Parse owner/repo
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    res.status(400).json({ error: 'Invalid repo format. Expected: owner/repo' });
    return;
  }

  try {
    const content = await fetchFileContent(owner, repoName, ref, path);
    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/server/routes/file.ts
git commit -m "feat: add file content endpoint with cache support"
```

---

## Task 10: Express Server

**Files:**
- Create: `src/server/index.ts`

- [ ] **Step 1: Implement Express server with graceful shutdown**

```typescript
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { reviewRouter } from './routes/review.js';
import { chatRouter } from './routes/chat.js';
import { fileRouter } from './routes/file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api', reviewRouter);
  app.use('/api', chatRouter);
  app.use('/api', fileRouter);

  // Serve static frontend in production
  const clientPath = join(__dirname, '../../client');
  app.use(express.static(clientPath));
  app.get('*', (req, res) => {
    res.sendFile(join(clientPath, 'index.html'));
  });

  return app;
}

export function startServer(port: number): Promise<any> {
  const app = createServer();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: add Express server with API routes and static serving"
```

---

## Task 11: CLI Entry Point

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Implement CLI with URL parsing and server startup**

```typescript
#!/usr/bin/env node

import { startServer } from './server/index.js';
import { spawn } from 'child_process';

interface CLIArgs {
  prUrl: string;
  model?: string;
  noBrowser?: boolean;
  port?: number;
}

function parseArgs(): CLIArgs | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: code-reviewer <pr-url> [options]

Arguments:
  <pr-url>              GitHub PR URL or shorthand (org/repo#123)

Options:
  --model <model-id>    Claude model to use (default: claude-opus-4-6-20250925)
  --no-browser          Don't open browser automatically
  --port <port>         Use specific port (default: random available)
  --help, -h            Show this help message

Examples:
  code-reviewer https://github.com/org/repo/pull/142
  code-reviewer org/repo#142
  code-reviewer https://github.com/org/repo/pull/142 --model claude-sonnet-4-6-20250514
    `);
    return null;
  }

  const prUrl = args[0];
  const parsed: CLIArgs = { prUrl };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--model' && args[i + 1]) {
      parsed.model = args[++i];
    } else if (arg === '--no-browser') {
      parsed.noBrowser = true;
    } else if (arg === '--port' && args[i + 1]) {
      parsed.port = parseInt(args[++i], 10);
    }
  }

  return parsed;
}

async function findAvailablePort(start: number): Promise<number> {
  const { createServer } = await import('net');
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : start;
      server.close(() => resolve(port));
    });
  });
}

async function main() {
  const args = parseArgs();
  if (!args) {
    process.exit(args === null ? 0 : 1);
  }

  const port = args.port || await findAvailablePort(3000);
  const server = await startServer(port);

  const url = `http://localhost:${port}?pr=${encodeURIComponent(args.prUrl)}${args.model ? `&model=${args.model}` : ''}`;

  console.log(`\nCode Reviewer running at: ${url}\n`);

  if (!args.noBrowser) {
    // Open browser
    const openCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(openCommand, [url], { detached: true, stdio: 'ignore' }).unref();
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Make CLI executable**

```bash
chmod +x src/cli.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point with browser auto-open"
```

---

## Task 12: Frontend HTML Entry

**Files:**
- Create: `src/client/index.html`

- [ ] **Step 1: Create HTML entry point**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code Reviewer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/client/index.html
git commit -m "feat: add HTML entry point"
```

---

## Task 13: Review Context

**Files:**
- Create: `src/client/context/ReviewContext.tsx`

- [ ] **Step 1: Implement global state context**

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

interface PRFile {
  path: string;
  additions: number;
  deletions: number;
  status: string;
}

interface PRData {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  headRef: string;
  additions: number;
  deletions: number;
  files: PRFile[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ReviewContextType {
  prData: PRData | null;
  setPrData: (data: PRData | null) => void;
  explanation: string;
  setExplanation: (exp: string) => void;
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  mode: 'repo' | 'standalone';
  setMode: (mode: 'repo' | 'standalone') => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  chatHistory: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [prData, setPrData] = useState<PRData | null>(null);
  const [explanation, setExplanation] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mode, setMode] = useState<'repo' | 'standalone'>('standalone');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const addChatMessage = (msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  };

  return (
    <ReviewContext.Provider
      value={{
        prData,
        setPrData,
        explanation,
        setExplanation,
        selectedFile,
        setSelectedFile,
        mode,
        setMode,
        sessionId,
        setSessionId,
        chatHistory,
        addChatMessage,
        loading,
        setLoading
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within ReviewProvider');
  }
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/context/ReviewContext.tsx
git commit -m "feat: add review context for global state"
```

---

## Task 14: PR Input Component

**Files:**
- Create: `src/client/components/PRInput.tsx`

- [ ] **Step 1: Implement PR input component**

```typescript
import { useState, useEffect } from 'react';
import { useReview } from '../context/ReviewContext';

export function PRInput() {
  const [prUrl, setPrUrl] = useState('');
  const { setLoading, setPrData, setExplanation, setMode, setSessionId } = useReview();

  // Read query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prParam = params.get('pr');
    if (prParam) {
      setPrUrl(prParam);
    }
  }, []);

  const handleReview = async () => {
    if (!prUrl.trim()) return;

    setLoading(true);
    setPrData(null);
    setExplanation('');

    // Read model from query params
    const params = new URLSearchParams(window.location.search);
    const modelId = params.get('model') || undefined;

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl, modelId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch review');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let explanationText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'pr-metadata') {
              setPrData(data.pr);
              setMode(data.mode);
            } else if (event === 'explanation') {
              explanationText += data.chunk;
              setExplanation(explanationText);
            } else if (event === 'done') {
              if (data.sessionId) {
                setSessionId(data.sessionId);
              }
            } else if (event === 'error') {
              console.error('Review error:', data.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Review failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '12px', borderBottom: '1px solid #444' }}>
      <input
        type="text"
        value={prUrl}
        onChange={(e) => setPrUrl(e.target.value)}
        placeholder="Enter PR URL or org/repo#123"
        style={{
          flex: 1,
          padding: '8px',
          background: '#2b2b2b',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: '4px'
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleReview()}
      />
      <button
        onClick={handleReview}
        style={{
          padding: '8px 16px',
          background: '#0078d4',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Review
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/PRInput.tsx
git commit -m "feat: add PR input component with SSE review trigger"
```

---

## Task 15: File Tree Component

**Files:**
- Create: `src/client/components/FileTree.tsx`

- [ ] **Step 1: Implement file tree component**

```typescript
import { useReview } from '../context/ReviewContext';

export function FileTree() {
  const { prData, selectedFile, setSelectedFile } = useReview();

  if (!prData) {
    return (
      <div style={{ padding: '16px', color: '#888' }}>
        No PR loaded
      </div>
    );
  }

  return (
    <div style={{ padding: '8px', overflowY: 'auto' }}>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
        Changed Files ({prData.files.length})
      </div>
      {prData.files.map((file) => (
        <div
          key={file.path}
          onClick={() => setSelectedFile(file.path)}
          style={{
            padding: '8px',
            marginBottom: '4px',
            background: selectedFile === file.path ? '#37373d' : 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            color: selectedFile === file.path ? '#fff' : '#ccc'
          }}
        >
          <div style={{ marginBottom: '4px' }}>{file.path.split('/').pop()}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            <span style={{ color: '#4ec9b0' }}>+{file.additions}</span>
            {' '}
            <span style={{ color: '#f48771' }}>-{file.deletions}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/FileTree.tsx
git commit -m "feat: add file tree component with file selection"
```

---

## Task 16: Diff Viewer Component

**Files:**
- Create: `src/client/components/DiffViewer.tsx`

- [ ] **Step 1: Implement Monaco diff viewer**

```typescript
import { DiffEditor } from '@monaco-editor/react';
import { useReview } from '../context/ReviewContext';
import { useEffect, useState } from 'react';

export function DiffViewer() {
  const { prData, selectedFile } = useReview();
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [language, setLanguage] = useState('plaintext');

  useEffect(() => {
    if (!prData || !selectedFile) {
      setOriginal('');
      setModified('');
      return;
    }

    const fetchContents = async () => {
      const repo = `${prData.owner}/${prData.repo}`;

      try {
        const [baseRes, headRes] = await Promise.all([
          fetch(`/api/file-content?repo=${repo}&ref=${prData.baseRef}&path=${selectedFile}`),
          fetch(`/api/file-content?repo=${repo}&ref=${prData.headRef}&path=${selectedFile}`)
        ]);

        const baseData = await baseRes.json();
        const headData = await headRes.json();

        setOriginal(baseData.content || '');
        setModified(headData.content || '');

        // Detect language from file extension
        const ext = selectedFile.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          py: 'python',
          go: 'go',
          rs: 'rust',
          java: 'java',
          cpp: 'cpp',
          c: 'c',
          md: 'markdown',
          json: 'json',
          yaml: 'yaml',
          yml: 'yaml'
        };
        setLanguage(langMap[ext] || 'plaintext');
      } catch (error) {
        console.error('Failed to fetch file contents:', error);
      }
    };

    fetchContents();
  }, [prData, selectedFile]);

  if (!prData || !selectedFile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        Select a file to view diff
      </div>
    );
  }

  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={language}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/DiffViewer.tsx
git commit -m "feat: add Monaco diff viewer component"
```

---

## Task 17: Chat Panel Component

**Files:**
- Create: `src/client/components/ChatPanel.tsx`

- [ ] **Step 1: Implement chat panel with SSE**

```typescript
import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import ReactMarkdown from 'react-markdown';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const { chatHistory, addChatMessage, sessionId, mode } = useReview();
  const [sending, setSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sending) return;

    const question = input.trim();
    setInput('');
    setSending(true);
    setStreamingMessage(''); // Reset streaming message

    // Add user message
    addChatMessage({
      role: 'user',
      content: question,
      timestamp: Date.now()
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId, mode: { type: mode } })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'message') {
              assistantMessage += data.chunk;
              // Update streaming message incrementally for live display
              setStreamingMessage(assistantMessage);
            } else if (event === 'done') {
              // Add final message to history
              addChatMessage({
                role: 'assistant',
                content: assistantMessage,
                timestamp: Date.now()
              });
              // Clear streaming message
              setStreamingMessage('');
            } else if (event === 'error') {
              console.error('Chat error:', data.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setStreamingMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {chatHistory.length === 0 && !streamingMessage ? (
          <div style={{ color: '#888', fontSize: '13px' }}>
            Ask questions about the code changes...
          </div>
        ) : (
          <>
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: msg.role === 'user' ? '#2b2b2b' : '#1e1e1e',
                  borderRadius: '4px'
                }}
              >
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div style={{ fontSize: '13px', color: '#ccc' }}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: '#1e1e1e',
                  borderRadius: '4px',
                  opacity: 0.9
                }}
              >
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Assistant (streaming...)
                </div>
                <div style={{ fontSize: '13px', color: '#ccc' }}>
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid #444' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={!sessionId || sending}
            style={{
              flex: 1,
              padding: '8px',
              background: '#2b2b2b',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!sessionId || sending}
            style={{
              padding: '8px 16px',
              background: !sessionId || sending ? '#444' : '#0078d4',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: !sessionId || sending ? 'not-allowed' : 'pointer'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/ChatPanel.tsx
git commit -m "feat: add chat panel with SSE streaming"
```

---

## Task 18: Explanation Panel Component

**Files:**
- Create: `src/client/components/ExplanationPanel.tsx`

- [ ] **Step 1: Implement explanation panel with chat**

```typescript
import { useReview } from '../context/ReviewContext';
import { ChatPanel } from './ChatPanel';
import ReactMarkdown from 'react-markdown';

export function ExplanationPanel() {
  const { explanation, loading } = useReview();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', borderBottom: '1px solid #444' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#fff' }}>
          AI Explanation
        </h3>
        {loading && !explanation && (
          <div style={{ color: '#888', fontSize: '13px' }}>Loading...</div>
        )}
        {explanation && (
          <div style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.6' }}>
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
        )}
      </div>
      <div style={{ height: '300px' }}>
        <ChatPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/ExplanationPanel.tsx
git commit -m "feat: add explanation panel with embedded chat"
```

---

## Task 19: Status Bar Component

**Files:**
- Create: `src/client/components/StatusBar.tsx`

- [ ] **Step 1: Implement status bar**

```typescript
import { useReview } from '../context/ReviewContext';

export function StatusBar() {
  const { prData, mode } = useReview();

  if (!prData) {
    return (
      <div style={{
        padding: '8px 16px',
        background: '#1e1e1e',
        borderTop: '1px solid #444',
        fontSize: '12px',
        color: '#888'
      }}>
        No PR loaded
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '8px 16px',
      background: '#1e1e1e',
      borderTop: '1px solid #444',
      fontSize: '12px',
      color: '#ccc'
    }}>
      <span style={{ color: mode === 'repo' ? '#4ec9b0' : '#888' }}>
        {mode === 'repo' ? '● repo mode' : '○ standalone mode'}
      </span>
      <span>PR #{prData.number}</span>
      <span>{prData.files.length} files</span>
      <span>
        <span style={{ color: '#4ec9b0' }}>+{prData.additions}</span>
        {' '}
        <span style={{ color: '#f48771' }}>-{prData.deletions}</span>
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/StatusBar.tsx
git commit -m "feat: add status bar component"
```

---

## Task 20: Global Styles

**Files:**
- Create: `src/client/styles/app.css`

- [ ] **Step 1: Create global styles**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #1e1e1e;
  color: #ccc;
  overflow: hidden;
}

#root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

code {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  background: #2b2b2b;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

pre {
  background: #2b2b2b;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}

pre code {
  background: none;
  padding: 0;
}

a {
  color: #4ec9b0;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #1e1e1e;
}

::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #666;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/styles/app.css
git commit -m "feat: add global CSS styles"
```

---

## Task 21: Main App Component

**Files:**
- Create: `src/client/App.tsx`

- [ ] **Step 1: Implement root app component with three-column layout**

```typescript
import { ReviewProvider } from './context/ReviewContext';
import { PRInput } from './components/PRInput';
import { FileTree } from './components/FileTree';
import { DiffViewer } from './components/DiffViewer';
import { ExplanationPanel } from './components/ExplanationPanel';
import { StatusBar } from './components/StatusBar';
import './styles/app.css';

export function App() {
  return (
    <ReviewProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <PRInput />

        {/* Main three-column layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: File tree */}
          <div style={{
            width: '220px',
            borderRight: '1px solid #444',
            background: '#252526',
            overflowY: 'auto'
          }}>
            <FileTree />
          </div>

          {/* Center: Monaco diff */}
          <div style={{ flex: 1, background: '#1e1e1e' }}>
            <DiffViewer />
          </div>

          {/* Right: AI explanation + chat */}
          <div style={{
            width: '350px',
            borderLeft: '1px solid #444',
            background: '#252526'
          }}>
            <ExplanationPanel />
          </div>
        </div>

        {/* Bottom status bar */}
        <StatusBar />
      </div>
    </ReviewProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/App.tsx
git commit -m "feat: add root App component with three-column layout"
```

---

## Task 22: React Entry Point

**Files:**
- Create: `src/client/main.tsx`

- [ ] **Step 1: Create React mount point**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/main.tsx
git commit -m "feat: add React entry point"
```

---

## Task 23: Test the Application

**Files:**
- Test: Full application

- [ ] **Step 1: Build the application**

```bash
npm run build
```

Expected: Both client and server compile successfully to `dist/` directory.

- [ ] **Step 2: Test CLI with a real PR**

```bash
npm start -- https://github.com/facebook/react/pull/30000
```

Expected: Browser opens, shows PR input, clicking Review fetches data and streams explanation.

- [ ] **Step 3: Test repo mode**

Navigate to a cloned repo directory and run:
```bash
npm start -- <pr-url-for-that-repo>
```

Expected: Status bar shows "● repo mode" instead of "○ standalone mode".

- [ ] **Step 4: Test chat functionality**

After review completes, type a question in the chat and send.

Expected: Streamed response appears in chat panel.

- [ ] **Step 5: Test file diff viewer**

Click different files in the file tree.

Expected: Monaco diff editor updates to show that file's changes.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify full application flow"
```

---

## Completion

All tasks completed. The AI-assisted code reviewer is fully implemented with:
- CLI entry point with URL parsing and browser auto-open
- Express backend with SSE streaming for progressive loading
- Repo-aware mode detection for deep context
- Three-column React UI with Monaco diff editor
- Real-time chat with Claude via session resumption
- File content caching to avoid redundant API calls

Ready for use with `npm start -- <pr-url>`.
