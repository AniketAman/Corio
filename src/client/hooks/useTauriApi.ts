import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface PRFile {
  path: string;
  additions: number;
  deletions: number;
  status: string;
}

export interface PRMetadata {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  headRef: string;
  headSha: string;
  additions: number;
  deletions: number;
  files: PRFile[];
}

export interface CachedReview {
  key: string;
  reviewText: string;
  prMetadata: PRMetadata;
  timestamp: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  template: string;
  builtIn: boolean;
  parseFileMarkers: boolean;
}

export interface Config {
  repos: Record<string, string>;
  defaults: {
    model: string;
    preset: string;
  };
}

export const tauriApi = {
  // GitHub
  fetchPRMetadata: (prUrl: string) =>
    invoke<PRMetadata>('fetch_pr_metadata', { prUrl }),

  fetchPRDiff: (owner: string, repo: string, number: number) =>
    invoke<string>('fetch_pr_diff', { owner, repo, number }),

  fetchFileContent: (owner: string, repo: string, fileRef: string, path: string, repoRoot: string | null) =>
    invoke<string>('fetch_file_content', { owner, repo, fileRef, path, repoRoot }),

  // Config
  loadConfig: () => invoke<Config>('load_config'),
  saveConfig: (config: Config) => invoke<void>('save_config', { config }),
  getRepoPath: (owner: string, repo: string) =>
    invoke<string | null>('get_repo_path', { owner, repo }),
  saveRepoPath: (owner: string, repo: string, path: string) =>
    invoke<void>('save_repo_path', { owner, repo, path }),

  // Worktree
  createWorktree: (repoPath: string, repoName: string, prNumber: number, branch: string) =>
    invoke<string>('create_worktree', { repoPath, repoName, prNumber, branch }),
  removeWorktree: (repoPath: string, worktreePath: string) =>
    invoke<void>('remove_worktree', { repoPath, worktreePath }),

  // Cache
  getCachedReview: (owner: string, repo: string, number: number, preset: string, sha: string) =>
    invoke<CachedReview | null>('get_cached_review', { owner, repo, number, preset, sha }),
  saveCachedReview: (
    owner: string,
    repo: string,
    number: number,
    preset: string,
    sha: string,
    reviewText: string,
    prMetadata: PRMetadata
  ) => invoke<void>('save_cached_review', { owner, repo, number, preset, sha, reviewText, prMetadata }),

  // Presets
  getAllPresets: () => invoke<Preset[]>('get_all_presets'),
  savePreset: (preset: Preset) => invoke<Preset>('save_preset', { preset }),
  deletePreset: (id: string) => invoke<void>('delete_preset', { id }),

  // Review
  startReview: (
    pr: PRMetadata,
    diff: string,
    model: string,
    presetId: string,
    worktreePath: string | null
  ) => invoke<string>('start_review', { pr, diff, model, presetId, worktreePath }),

  // Chat
  sendChatMessage: (
    question: string,
    sessionId: string,
    model: string,
    worktreePath: string | null
  ) => invoke<void>('send_chat_message', { question, sessionId, model, worktreePath }),

  // A2UI
  convertToA2UI: (reviewText: string) =>
    invoke<object[]>('convert_to_a2ui', { reviewText }),

  // Event listeners (return unlisten functions)
  onReviewChunk: (callback: (chunk: string) => void): Promise<UnlistenFn> =>
    listen<string>('review-chunk', (event) => callback(event.payload)),

  onReviewComplete: (callback: () => void): Promise<UnlistenFn> =>
    listen('review-complete', () => callback()),

  onReviewSessionId: (callback: (sessionId: string) => void): Promise<UnlistenFn> =>
    listen<string>('review-session-id', (event) => callback(event.payload)),

  onChatChunk: (callback: (chunk: string) => void): Promise<UnlistenFn> =>
    listen<string>('chat-chunk', (event) => callback(event.payload)),

  onChatComplete: (callback: () => void): Promise<UnlistenFn> =>
    listen('chat-complete', () => callback()),
};
