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
