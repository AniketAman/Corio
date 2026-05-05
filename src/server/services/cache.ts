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

// Store the current review's repoRoot so file content route can use git show
let _repoRoot: string | undefined;
export function setRepoRoot(root: string | undefined) { _repoRoot = root; }
export function getRepoRoot(): string | undefined { return _repoRoot; }
