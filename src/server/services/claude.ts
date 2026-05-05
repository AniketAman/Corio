import { spawn, ChildProcess } from 'child_process';
import { PRMetadata, ReviewMode } from '../types.js';
import { getPresetById, Preset } from './presets.js';

const activeProcesses = new Set<ChildProcess>();

export function killAllChildren(): void {
  for (const child of activeProcesses) {
    child.kill('SIGTERM');
  }
  activeProcesses.clear();
}

export interface ClaudeStreamOptions {
  onToken: (token: string) => void;
  onSessionId?: (sessionId: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export async function streamReviewExplanation(
  pr: PRMetadata,
  diff: string,
  mode: ReviewMode,
  modelId: string,
  presetId: string,
  options: ClaudeStreamOptions
): Promise<void> {
  const preset = await getPresetById(presetId);
  if (!preset) {
    options.onError(new Error(`Preset not found: ${presetId}`));
    return;
  }

  const prompt = buildReviewPrompt(pr, diff, mode, preset);

  const args = [
    '-p',
    '--model', modelId,
    '--output-format', 'stream-json',
    '--verbose'
  ];

  if (mode.type === 'repo') {
    args.push('--allowedTools', 'Read,Glob,Grep');
  }

  const claude = spawn('claude', args, {
    cwd: mode.type === 'repo' ? mode.repoRoot : process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  activeProcesses.add(claude);

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

        // Extract session ID from init message
        if (data.type === 'system' && data.subtype === 'init' && data.session_id) {
          options.onSessionId?.(data.session_id);
        }

        // Extract text from assistant messages
        if (data.type === 'assistant' && data.message?.content) {
          for (const block of data.message.content) {
            if (block.type === 'text' && block.text) {
              options.onToken(block.text);
            }
          }
        }

        // Also handle content_block_delta (streaming chunks)
        if (data.type === 'content_block_delta' && data.delta?.text) {
          options.onToken(data.delta.text);
        }
      } catch (error) {
        // Skip malformed JSON
      }
    }
  });

  let stderrOutput = '';
  claude.stderr.on('data', (chunk) => {
    stderrOutput += chunk.toString();
    console.error('Claude stderr:', chunk.toString());
  });

  claude.on('close', (code) => {
    activeProcesses.delete(claude);
    if (code === 0) {
      options.onComplete();
    } else {
      options.onError(new Error(`Claude exited with code ${code}. ${stderrOutput}`));
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
    '--verbose',
    '--resume', sessionId
  ];

  if (mode.type === 'repo') {
    args.push('--allowedTools', 'Read,Glob,Grep');
  }

  const claude = spawn('claude', args, {
    cwd: mode.type === 'repo' ? mode.repoRoot : process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  activeProcesses.add(claude);

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

        // Extract text from assistant messages
        if (data.type === 'assistant' && data.message?.content) {
          for (const block of data.message.content) {
            if (block.type === 'text' && block.text) {
              options.onToken(block.text);
            }
          }
        }

        // Also handle content_block_delta (streaming chunks)
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
    activeProcesses.delete(claude);
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
  mode: ReviewMode,
  preset: Preset
): string {
  const template = preset.template;

  let fileInstructions: string;
  if (preset.id === 'explain') {
    fileInstructions = pr.files.map(f => `### FILE: ${f.path}
Explain this file's role in the change. What concepts does it introduce? How does it relate to other files in the PR?`).join('\n\n');
  } else if (preset.parseFileMarkers) {
    fileInstructions = pr.files.map(f => `### FILE: ${f.path}
Explain what changed in this file and why. Note any issues, edge cases, or suggestions.`).join('\n\n');
  } else {
    fileInstructions = '';
  }

  const repoContext = mode.type === 'repo'
    ? '. You have access to the full codebase via Read, Glob, and Grep tools'
    : '';

  const repoToolHint = mode.type === 'repo'
    ? 'Use the codebase tools to read related files (imports, tests, types) for deeper context.'
    : '';

  return template
    .replace('{{repoContext}}', repoContext)
    .replace('{{title}}', pr.title)
    .replace('{{author}}', pr.author)
    .replace('{{fileCount}}', String(pr.files.length))
    .replace('{{additions}}', String(pr.additions))
    .replace('{{deletions}}', String(pr.deletions))
    .replace('{{body}}', pr.body || '(No description provided)')
    .replace('{{diff}}', diff)
    .replace('{{fileInstructions}}', fileInstructions)
    .replace('{{repoToolHint}}', repoToolHint);
}
