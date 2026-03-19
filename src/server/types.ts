export interface PRMetadata {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  headRef: string;
  additions: number;
  deletions: number;
  files: PRFile[];
}

export interface PRFile {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'removed' | 'renamed';
}

export interface ReviewMode {
  type: 'repo' | 'standalone';
  repoRoot?: string;
}

export interface SSEEvent {
  event: string;
  data: any;
}

export interface FileContent {
  content: string;
  encoding?: string;
  size?: number;
  isBinary?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
