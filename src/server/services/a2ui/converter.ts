import { spawn, ChildProcess } from 'child_process';
import { buildConversionPrompt } from './prompt-builder.js';
import { fixA2UIPayload } from './fixer.js';

const activeProcesses = new Set<ChildProcess>();

export function killA2UIChildren(): void {
  for (const child of activeProcesses) {
    child.kill('SIGTERM');
  }
  activeProcesses.clear();
}

export async function convertToA2UI(reviewText: string, presetId: string): Promise<object[] | null> {
  const prompt = buildConversionPrompt(reviewText);

  const args = [
    '-p',
    '--model', 'haiku',
    '--output-format', 'json'
  ];

  const claude = spawn('claude', args, {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  activeProcesses.add(claude);

  const TIMEOUT_MS = 30_000;
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    claude.kill('SIGTERM');
  }, TIMEOUT_MS);

  return new Promise<object[] | null>((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    claude.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    claude.on('close', (code) => {
      clearTimeout(timeout);
      activeProcesses.delete(claude);

      if (timedOut) {
        reject(new Error('A2UI conversion timed out after 30 seconds'));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Claude exited with code ${code}. ${stderr}`));
        return;
      }

      // claude with --output-format json wraps response in a JSON object
      // Extract the text content from the response
      let rawText = stdout;
      try {
        const response = JSON.parse(stdout);
        // The JSON output format returns an object with a "result" field containing text
        if (response && typeof response.result === 'string') {
          rawText = response.result;
        } else if (response && response.content && Array.isArray(response.content)) {
          // Alternative format: { content: [{ type: "text", text: "..." }] }
          const textBlock = response.content.find((b: any) => b.type === 'text');
          if (textBlock && textBlock.text) {
            rawText = textBlock.text;
          }
        }
      } catch {
        // stdout might already be the raw text, use as-is
      }

      const payload = fixA2UIPayload(rawText);
      resolve(payload);
    });

    claude.on('error', (error) => {
      clearTimeout(timeout);
      activeProcesses.delete(claude);
      reject(error);
    });
  });
}
