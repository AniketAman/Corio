import { Router, Request, Response } from 'express';
import { fetchFileContent } from '../services/github.js';
import { getRepoRoot } from '../services/cache.js';

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
    const content = await fetchFileContent(owner, repoName, ref, path, getRepoRoot());
    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
