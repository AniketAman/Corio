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
