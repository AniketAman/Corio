import { execFile } from 'child_process';
import { promisify } from 'util';
import { PRMetadata, PRFile, FileContent } from '../types.js';
import { fileCache } from './cache.js';

const execFileAsync = promisify(execFile);

// Strip GITHUB_TOKEN from env so gh uses keyring auth
const ghEnv = { ...process.env };
delete ghEnv.GITHUB_TOKEN;
const ghOpts = { env: ghEnv, maxBuffer: 10 * 1024 * 1024 };

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
    'title,body,author,files,additions,deletions,baseRefName,headRefName,baseRefOid,headRefOid'
  ], ghOpts);

  const data = JSON.parse(stdout);

  return {
    owner,
    repo,
    number,
    title: data.title,
    body: data.body || '',
    author: data.author?.login || 'unknown',
    baseRef: data.baseRefOid || data.baseRefName,
    headRef: data.headRefOid || data.headRefName,
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
  ], ghOpts);

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

  // Strategy 1: Use git show if we have a local repo (fastest, no API limits)
  if (repoRoot) {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `${ref}:${path}`],
        { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 }
      );
      content = { content: stdout };
      fileCache.set(`${owner}/${repo}`, ref, path, content);
      return content;
    } catch {
      // File doesn't exist at this ref (new/deleted file) - return empty
      content = { content: '' };
      fileCache.set(`${owner}/${repo}`, ref, path, content);
      return content;
    }
  }

  // Strategy 2: Use gh api with raw content header (no base64 issues)
  try {
    const { stdout } = await execFileAsync('gh', [
      'api',
      `repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      '-H', 'Accept: application/vnd.github.raw+json'
    ], ghOpts);

    content = { content: stdout };
  } catch (error: any) {
    if (error.stderr?.includes('404') || error.message?.includes('404')) {
      content = { content: '' };
    } else if (error.stderr?.includes('too_large') || error.message?.includes('too_large')) {
      content = { content: '[File too large to display]', isBinary: true };
    } else {
      console.error(`Failed to fetch ${path}@${ref}:`, error.stderr || error.message);
      content = { content: '' };
    }
  }

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
