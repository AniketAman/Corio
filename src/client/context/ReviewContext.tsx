import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { UnlistenFn } from '@tauri-apps/api/event';
import { tauriApi, PRMetadata, Preset } from '../hooks/useTauriApi';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ReviewContextType {
  prData: PRMetadata | null;
  setPrData: (data: PRMetadata | null) => void;
  explanation: string;
  setExplanation: (exp: string) => void;
  fileExplanations: Record<string, string>;
  setFileExplanations: (exps: Record<string, string>) => void;
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  mode: 'repo' | 'standalone';
  setMode: (mode: 'repo' | 'standalone') => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  chatHistory: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  currentPrUrl: string | null;
  setCurrentPrUrl: (url: string | null) => void;
  triggerReview: (url: string) => Promise<void>;
  activePresetId: string;
  setActivePresetId: (id: string) => void;
  presets: Preset[];
  annotations: Record<string, number[]>;
  highlightedAnnotation: { file: string; line: number } | null;
  scrollToAnnotation: (file: string, line: number) => void;
  triggerA2UI: () => void;
  a2uiPayload: object[] | null;
  a2uiLoading: boolean;
  a2uiError: string | null;
  isCachedReview: boolean;
  forceReReview: () => void;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [prData, setPrData] = useState<PRMetadata | null>(null);
  const [explanation, setExplanation] = useState('');
  const [fileExplanations, setFileExplanations] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mode, setMode] = useState<'repo' | 'standalone'>('standalone');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrUrl, setCurrentPrUrl] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState(() => {
    return localStorage.getItem('code-reviewer:preset') || 'review';
  });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, number[]>>({});
  const [highlightedAnnotation, setHighlightedAnnotation] = useState<{ file: string; line: number } | null>(null);
  const [a2uiPayload, setA2uiPayload] = useState<object[] | null>(null);
  const [a2uiLoading, setA2uiLoading] = useState(false);
  const [a2uiError, setA2uiError] = useState<string | null>(null);
  const [isCachedReview, setIsCachedReview] = useState(false);

  const worktreePathRef = useRef<string | null>(null);
  const repoPathRef = useRef<string | null>(null);
  const skipCacheRef = useRef(false);

  const scrollToAnnotation = useCallback((file: string, line: number) => {
    setHighlightedAnnotation({ file, line });
  }, []);

  const parseFileMarkers = useCallback((text: string) => {
    const fileMap: Record<string, string> = {};
    const fileRegex = /### FILE: (.+)\n([\s\S]*?)(?=### FILE:|### Potential Issues|### Key Takeaways|$)/g;
    let match;
    while ((match = fileRegex.exec(text)) !== null) {
      fileMap[match[1].trim()] = match[2].trim();
    }
    return fileMap;
  }, []);

  const parseAnnotations = useCallback((text: string) => {
    const lineRefRegex = /(?:`|^|\s)([\w./\-]+\.\w+):(\d+)/gm;
    const annotationMap: Record<string, number[]> = {};
    let refMatch;
    while ((refMatch = lineRefRegex.exec(text)) !== null) {
      const filePath = refMatch[1];
      const lineNum = parseInt(refMatch[2], 10);
      if (!annotationMap[filePath]) {
        annotationMap[filePath] = [];
      }
      if (!annotationMap[filePath].includes(lineNum)) {
        annotationMap[filePath].push(lineNum);
      }
    }
    return annotationMap;
  }, []);

  const triggerA2UI = useCallback(async () => {
    if (!explanation) return;
    setA2uiLoading(true);
    setA2uiPayload(null);
    setA2uiError(null);
    try {
      const payload = await tauriApi.convertToA2UI(explanation);
      setA2uiPayload(payload);
    } catch {
      setA2uiError('A2UI conversion failed');
    } finally {
      setA2uiLoading(false);
    }
  }, [explanation]);

  useEffect(() => {
    localStorage.setItem('code-reviewer:preset', activePresetId);
  }, [activePresetId]);

  // Load presets via Tauri
  useEffect(() => {
    tauriApi.getAllPresets()
      .then(data => setPresets(data))
      .catch(() => {});
  }, []);

  const addChatMessage = (msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  };

  const cleanupWorktree = useCallback(async () => {
    if (worktreePathRef.current && repoPathRef.current) {
      try {
        await tauriApi.removeWorktree(repoPathRef.current, worktreePathRef.current);
      } catch {
        // Worktree cleanup is best-effort
      }
      worktreePathRef.current = null;
    }
  }, []);

  const triggerReview = useCallback(async (url: string) => {
    if (!url.trim()) return;

    setLoading(true);
    setPrData(null);
    setExplanation('');
    setFileExplanations({});
    setAnnotations({});
    setHighlightedAnnotation(null);
    setError(null);
    setCurrentPrUrl(url);
    setChatHistory([]);
    setA2uiPayload(null);
    setA2uiError(null);
    setIsCachedReview(false);

    // Cleanup any previous worktree
    await cleanupWorktree();

    try {
      // 1. Fetch PR metadata
      const pr = await tauriApi.fetchPRMetadata(url);
      setPrData(pr);

      // 2. Check cache (unless bypassed)
      if (!skipCacheRef.current) {
        const cached = await tauriApi.getCachedReview(
          pr.owner, pr.repo, pr.number, activePresetId, pr.headSha
        );

        if (cached) {
          // Use cached review
          const reviewText = cached.reviewText;
          setExplanation(reviewText);

          const fileMap = parseFileMarkers(reviewText);
          if (Object.keys(fileMap).length > 0) {
            setFileExplanations(fileMap);
          }

          setAnnotations(parseAnnotations(reviewText));
          setIsCachedReview(true);
          setLoading(false);

          // Auto-trigger A2UI for cached reviews
          setA2uiLoading(true);
          try {
            const payload = await tauriApi.convertToA2UI(reviewText);
            setA2uiPayload(payload);
          } catch {
            setA2uiError('A2UI conversion failed');
          } finally {
            setA2uiLoading(false);
          }

          return;
        }
      }
      skipCacheRef.current = false;

      // 3. Fetch diff
      const diff = await tauriApi.fetchPRDiff(pr.owner, pr.repo, pr.number);

      // 4. Check repo registry and create worktree if available
      const repoPath = await tauriApi.getRepoPath(pr.owner, pr.repo);
      let worktreePath: string | null = null;

      if (repoPath) {
        setMode('repo');
        repoPathRef.current = repoPath;
        try {
          worktreePath = await tauriApi.createWorktree(repoPath, pr.repo, pr.number, pr.headRef);
          worktreePathRef.current = worktreePath;
        } catch {
          // Worktree creation failed — proceed without it
          worktreePath = null;
        }
      } else {
        setMode('standalone');
      }

      // 5. Setup event listeners BEFORE starting review
      let explanationText = '';
      const unlistenFns: UnlistenFn[] = [];

      const chunkUnlisten = await tauriApi.onReviewChunk((chunk: string) => {
        explanationText += chunk;
        setExplanation(explanationText);

        // Parse file markers incrementally
        const fileMap = parseFileMarkers(explanationText);
        if (Object.keys(fileMap).length > 0) {
          setFileExplanations(fileMap);
        }
      });
      unlistenFns.push(chunkUnlisten);

      const sessionUnlisten = await tauriApi.onReviewSessionId((sid: string) => {
        setSessionId(sid);
      });
      unlistenFns.push(sessionUnlisten);

      const completePromise = new Promise<void>((resolve, reject) => {
        tauriApi.onReviewComplete(() => {
          resolve();
        }).then(unlisten => unlistenFns.push(unlisten)).catch(reject);
      });

      // 6. Start review
      const model = 'opus'; // Default model
      await tauriApi.startReview(pr, diff, model, activePresetId, worktreePath);

      // 7. Wait for review-complete event
      await completePromise;

      // Cleanup listeners
      for (const unlisten of unlistenFns) {
        unlisten();
      }

      // 8. Parse annotations from completed text
      setAnnotations(parseAnnotations(explanationText));

      // 9. Save to cache
      try {
        await tauriApi.saveCachedReview(
          pr.owner, pr.repo, pr.number, activePresetId, pr.headSha, explanationText, pr
        );
      } catch {
        // Cache save failure is non-critical
      }

      // 10. Cleanup worktree
      await cleanupWorktree();

      // 11. Auto-trigger A2UI
      if (explanationText) {
        setA2uiLoading(true);
        try {
          const payload = await tauriApi.convertToA2UI(explanationText);
          setA2uiPayload(payload);
        } catch {
          setA2uiError('A2UI conversion failed');
        } finally {
          setA2uiLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Review failed');
      await cleanupWorktree();
    } finally {
      setLoading(false);
    }
  }, [activePresetId, parseFileMarkers, parseAnnotations, cleanupWorktree]);

  const forceReReview = useCallback(() => {
    if (!currentPrUrl) return;
    setIsCachedReview(false);
    skipCacheRef.current = true;
    triggerReview(currentPrUrl);
  }, [currentPrUrl, triggerReview]);

  return (
    <ReviewContext.Provider
      value={{
        prData,
        setPrData,
        explanation,
        setExplanation,
        fileExplanations,
        setFileExplanations,
        selectedFile,
        setSelectedFile,
        mode,
        setMode,
        sessionId,
        setSessionId,
        chatHistory,
        addChatMessage,
        loading,
        setLoading,
        error,
        setError,
        currentPrUrl,
        setCurrentPrUrl,
        triggerReview,
        activePresetId,
        setActivePresetId,
        presets,
        annotations,
        highlightedAnnotation,
        scrollToAnnotation,
        triggerA2UI,
        a2uiPayload,
        a2uiLoading,
        a2uiError,
        isCachedReview,
        forceReReview,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within ReviewProvider');
  }
  return context;
}
