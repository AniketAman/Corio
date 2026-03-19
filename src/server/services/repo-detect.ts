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
