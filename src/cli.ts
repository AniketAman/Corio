#!/usr/bin/env node

import { startServer } from './server/index.js';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { killAllChildren } from './server/services/claude.js';

const execFileAsync = promisify(execFile);

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

async function preflight(): Promise<void> {
  // Check gh is installed
  try {
    await execFileAsync('gh', ['--version']);
  } catch {
    console.error('Error: GitHub CLI (gh) is not installed. Install: https://cli.github.com/');
    process.exit(1);
  }

  // Check gh is authenticated
  try {
    await execFileAsync('gh', ['auth', 'status']);
  } catch {
    console.error('Error: GitHub CLI is not authenticated. Run: gh auth login');
    process.exit(1);
  }

  // Check claude is installed
  try {
    await execFileAsync('claude', ['--version']);
  } catch {
    console.error('Error: Claude Code CLI is not installed. Install: https://claude.ai/claude-code');
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();
  if (!args) {
    process.exit(args === null ? 0 : 1);
  }

  await preflight();

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
    killAllChildren();
    const forceExitTimeout = setTimeout(() => {
      process.exit(1);
    }, 3000);
    server.close(() => {
      clearTimeout(forceExitTimeout);
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
