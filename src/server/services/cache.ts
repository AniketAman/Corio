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
