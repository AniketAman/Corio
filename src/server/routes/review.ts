import { Router, Request, Response } from 'express';
import { fetchPRMetadata, fetchPRDiff, fetchFileContentBatch } from '../services/github.js';
import { streamReviewExplanation } from '../services/claude.js';
import { detectRepoMode } from '../services/repo-detect.js';
import { setRepoRoot } from '../services/cache.js';
import { getPresetById } from '../services/presets.js';

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
  const { prUrl, modelId = 'opus', presetId = 'review' } = req.body;

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
    setRepoRoot(mode.repoRoot);

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

    // Resolve preset for parseFileMarkers flag
    const preset = await getPresetById(presetId);
    const parseFileMarkers = preset?.parseFileMarkers ?? true;

    // Stream Claude explanation
    let sessionId: string | undefined;

    streamReviewExplanation(pr, diff, mode, modelId, presetId, {
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
        sendEvent('done', { sessionId, mode: mode.type, parseFileMarkers });
        res.end();
      }
    });
  } catch (error: any) {
    sendEvent('error', { message: error.message });
    res.end();
  }
});
