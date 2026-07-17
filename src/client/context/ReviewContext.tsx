import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { UnlistenFn } from '@tauri-apps/api/event';
import { tauriApi, PRMetadata, Preset } from '../hooks/useTauriApi';
import { RepoPathPicker } from '../components/RepoPathPicker';
import { useTabs, ChatMessage, PendingComment, PendingReview } from './TabsContext';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../components/ToastProvider';
import { parseDiffLines } from '../utils/diffHunks';

export type { ChatMessage };

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
  diffLines: Record<string, Set<number>>;
  highlightedAnnotation: { file: string; line: number } | null;
  scrollToAnnotation: (file: string, line: number) => void;
  triggerA2UI: () => void;
  a2uiPayload: object[] | null;
  a2uiLoading: boolean;
  a2uiError: string | null;
  isCachedReview: boolean;
  forceReReview: () => void;
  pendingReview: PendingReview;
  addPendingComment: (comment: Omit<PendingComment, 'id'>) => void;
  removePendingComment: (id: string) => void;
  editPendingComment: (id: string, body: string) => void;
  submitReview: (verdict: string, summaryBody?: string) => Promise<void>;
  clearPendingReview: () => void;
  reviewSubmitting: boolean;
  reviewSubmitError: string | null;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const { activeTabId, activeTab, updateTab } = useTabs();
  const { settings } = useSettings();
  const { toast } = useToast();

  // Global state (not per-tab)
  const [presets, setPresets] = useState<Preset[]>([]);

  // Modal state for repo path picker
  const [repoPickerState, setRepoPickerState] = useState<{
    owner: string;
    repo: string;
    resolve: (path: string | null) => void;
  } | null>(null);

  const skipCacheRef = useRef(false);

  // --- Derive state from activeTab ---
  const prData = activeTab.prData;
  const explanation = activeTab.explanation;
  const fileExplanations = activeTab.fileExplanations;
  const selectedFile = activeTab.selectedFile;
  const mode = activeTab.mode;
  const sessionId = activeTab.sessionId;
  const chatHistory = activeTab.chatHistory;
  const loading = activeTab.loading;
  const error = activeTab.error;
  const currentPrUrl = activeTab.prUrl;
  const activePresetId = activeTab.activePresetId;
  const annotations = activeTab.annotations;
  const diffLines = useMemo(() => parseDiffLines(activeTab.diff), [activeTab.diff]);
  const highlightedAnnotation = activeTab.highlightedAnnotation;
  const a2uiPayload = activeTab.a2uiPayload;
  const a2uiLoading = activeTab.a2uiLoading;
  const a2uiError = activeTab.a2uiError;
  const isCachedReview = activeTab.isCachedReview;

  // --- Setters that write to active tab ---
  const setPrData = useCallback((data: PRMetadata | null) => {
    updateTab(activeTabId, { prData: data });
  }, [activeTabId, updateTab]);

  const setExplanation = useCallback((exp: string) => {
    updateTab(activeTabId, { explanation: exp });
  }, [activeTabId, updateTab]);

  const setFileExplanations = useCallback((exps: Record<string, string>) => {
    updateTab(activeTabId, { fileExplanations: exps });
  }, [activeTabId, updateTab]);

  const setSelectedFile = useCallback((file: string | null) => {
    updateTab(activeTabId, { selectedFile: file });
  }, [activeTabId, updateTab]);

  const setMode = useCallback((m: 'repo' | 'standalone') => {
    updateTab(activeTabId, { mode: m });
  }, [activeTabId, updateTab]);

  const setSessionId = useCallback((id: string | null) => {
    updateTab(activeTabId, { sessionId: id });
  }, [activeTabId, updateTab]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    updateTab(activeTabId, { chatHistory: [...activeTab.chatHistory, msg] });
  }, [activeTabId, activeTab.chatHistory, updateTab]);

  const setLoading = useCallback((l: boolean) => {
    updateTab(activeTabId, { loading: l });
  }, [activeTabId, updateTab]);

  const setError = useCallback((err: string | null) => {
    updateTab(activeTabId, { error: err });
  }, [activeTabId, updateTab]);

  const setCurrentPrUrl = useCallback((url: string | null) => {
    updateTab(activeTabId, { prUrl: url });
  }, [activeTabId, updateTab]);

  const setActivePresetId = useCallback((id: string) => {
    updateTab(activeTabId, { activePresetId: id });
    localStorage.setItem('code-reviewer:preset', id);
  }, [activeTabId, updateTab]);

  const scrollToAnnotation = useCallback((file: string, line: number) => {
    updateTab(activeTabId, { highlightedAnnotation: { file, line } });
  }, [activeTabId, updateTab]);

  // --- Helpers ---
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
    const tabId = activeTabId;
    const currentExplanation = activeTab.explanation;
    if (!currentExplanation) return;

    updateTab(tabId, { a2uiLoading: true, a2uiPayload: null, a2uiError: null });
    try {
      const payload = await tauriApi.convertToA2UI(currentExplanation);
      updateTab(tabId, { a2uiPayload: payload, a2uiLoading: false });
    } catch {
      updateTab(tabId, { a2uiError: 'A2UI conversion failed', a2uiLoading: false });
    }
  }, [activeTabId, activeTab.explanation, updateTab]);

  // Load presets via Tauri (global, not per-tab)
  useEffect(() => {
    tauriApi.getAllPresets()
      .then(data => setPresets(data))
      .catch(() => {});
  }, []);


  const triggerReview = useCallback(async (url: string) => {
    if (!url.trim()) return;

    // Capture the tab ID at the start to avoid stale closure issues if user switches tabs
    const tabId = activeTabId;
    const presetId = activeTab.activePresetId;

    // Reset tab state
    updateTab(tabId, {
      loading: true,
      prData: null,
      explanation: '',
      fileExplanations: {},
      diff: '',
      annotations: {},
      highlightedAnnotation: null,
      error: null,
      prUrl: url,
      chatHistory: [],
      a2uiPayload: null,
      a2uiError: null,
      isCachedReview: false,
      sessionId: null,
    });

    // Cleanup any previous worktree for this tab
    const prevWorktreePath = activeTab.worktreePath;
    const prevRepoPath = activeTab.repoPath;
    if (prevWorktreePath && prevRepoPath) {
      try {
        await tauriApi.removeWorktree(prevRepoPath, prevWorktreePath);
      } catch {
        // best-effort
      }
      updateTab(tabId, { worktreePath: null });
    }

    try {
      // 1. Fetch PR metadata
      const pr = await tauriApi.fetchPRMetadata(url);
      updateTab(tabId, { prData: pr });

      // 2. Check cache (unless bypassed)
      if (!skipCacheRef.current) {
        const cached = await tauriApi.getCachedReview(
          pr.owner, pr.repo, pr.number, presetId, pr.headSha
        );

        if (cached) {
          const reviewText = cached.reviewText;
          const fileMap = parseFileMarkers(reviewText);
          const parsedAnnotations = parseAnnotations(reviewText);
          const diff = await tauriApi.fetchPRDiff(pr.owner, pr.repo, pr.number);

          updateTab(tabId, {
            explanation: reviewText,
            fileExplanations: Object.keys(fileMap).length > 0 ? fileMap : {},
            diff,
            annotations: parsedAnnotations,
            isCachedReview: true,
            loading: false,
          });

          // Auto-trigger A2UI for cached reviews
          updateTab(tabId, { a2uiLoading: true });
          try {
            const payload = await tauriApi.convertToA2UI(reviewText);
            updateTab(tabId, { a2uiPayload: payload, a2uiLoading: false });
          } catch {
            updateTab(tabId, { a2uiError: 'A2UI conversion failed', a2uiLoading: false });
          }

          return;
        }
      }
      skipCacheRef.current = false;

      // 3. Fetch diff
      const diff = await tauriApi.fetchPRDiff(pr.owner, pr.repo, pr.number);
      updateTab(tabId, { diff });

      // 4. Check repo registry and create worktree if available
      let repoPath = await tauriApi.getRepoPath(pr.owner, pr.repo);
      let worktreePath: string | null = null;

      if (!repoPath) {
        // Show picker dialog and await user's choice
        repoPath = await new Promise<string | null>((resolve) => {
          setRepoPickerState({ owner: pr.owner, repo: pr.repo, resolve });
        });
        setRepoPickerState(null);
      }

      if (repoPath) {
        updateTab(tabId, { mode: 'repo', repoPath });
        try {
          worktreePath = await tauriApi.createWorktree(repoPath, pr.repo, pr.number, pr.headRef);
          updateTab(tabId, { worktreePath });
        } catch {
          // Worktree creation failed - proceed without it
          worktreePath = null;
        }
      } else {
        updateTab(tabId, { mode: 'standalone' });
      }

      // 5. Setup event listeners BEFORE starting review
      let explanationText = '';
      const unlistenFns: UnlistenFn[] = [];

      const chunkUnlisten = await tauriApi.onReviewChunkForTab(tabId, (chunk: string) => {
        explanationText += chunk;
        updateTab(tabId, { explanation: explanationText });

        // Parse file markers incrementally
        const fileMap = parseFileMarkers(explanationText);
        if (Object.keys(fileMap).length > 0) {
          updateTab(tabId, { fileExplanations: fileMap });
        }
      });
      unlistenFns.push(chunkUnlisten);

      const sessionUnlisten = await tauriApi.onReviewSessionIdForTab(tabId, (sid: string) => {
        updateTab(tabId, { sessionId: sid });
      });
      unlistenFns.push(sessionUnlisten);

      const completePromise = new Promise<void>((resolve, reject) => {
        tauriApi.onReviewCompleteForTab(tabId, () => {
          resolve();
        }).then(unlisten => unlistenFns.push(unlisten)).catch(reject);
      });

      // 6. Start review
      const model = settings.model;
      await tauriApi.startReview(tabId, pr, diff, model, presetId, worktreePath);

      // 7. Wait for review-complete event
      await completePromise;

      // Cleanup listeners
      for (const unlisten of unlistenFns) {
        unlisten();
      }

      // 8. Parse annotations from completed text
      updateTab(tabId, { annotations: parseAnnotations(explanationText) });

      // 9. Save to cache
      try {
        await tauriApi.saveCachedReview(
          pr.owner, pr.repo, pr.number, presetId, pr.headSha, explanationText, pr
        );
      } catch {
        // Cache save failure is non-critical
      }

      // 10. Cleanup worktree
      if (worktreePath && repoPath) {
        try {
          await tauriApi.removeWorktree(repoPath, worktreePath);
        } catch {
          // best-effort
        }
        updateTab(tabId, { worktreePath: null });
      }

      // 11. Auto-trigger A2UI
      if (explanationText) {
        updateTab(tabId, { a2uiLoading: true });
        try {
          const payload = await tauriApi.convertToA2UI(explanationText);
          updateTab(tabId, { a2uiPayload: payload, a2uiLoading: false });
        } catch {
          updateTab(tabId, { a2uiError: 'A2UI conversion failed', a2uiLoading: false });
        }
      }

      // 12. Notify review complete
      if (settings.notificationsEnabled) {
        const prTitle = pr.title;
        if (document.hasFocus()) {
          toast({ title: 'Review complete', description: prTitle, variant: 'success' });
        } else {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Review Complete', { body: prTitle });
          }
        }
        if (settings.notificationSound) {
          new Audio('/sounds/review-complete.mp3').play().catch(() => {});
        }
      }
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || 'Review failed';
      updateTab(tabId, { error: errorMsg });
      // Cleanup worktree on failure
      const tab = activeTab;
      if (tab.worktreePath && tab.repoPath) {
        try {
          await tauriApi.removeWorktree(tab.repoPath, tab.worktreePath);
        } catch {
          // best-effort
        }
        updateTab(tabId, { worktreePath: null });
      }
    } finally {
      updateTab(tabId, { loading: false });
    }
  }, [activeTabId, activeTab, updateTab, parseFileMarkers, parseAnnotations]);

  const forceReReview = useCallback(() => {
    const url = activeTab.prUrl;
    if (!url) return;
    updateTab(activeTabId, { isCachedReview: false });
    skipCacheRef.current = true;
    triggerReview(url);
  }, [activeTabId, activeTab.prUrl, updateTab, triggerReview]);

  // --- Pending review actions ---
  const pendingReview = activeTab.pendingReview;

  const addPendingComment = useCallback((comment: Omit<PendingComment, 'id'>) => {
    let toAdd = comment;

    // GitHub's review API rejects inline comments whose path/line isn't part
    // of the PR's diff hunks (422 Unprocessable Entity). Findings parsed from
    // AI-generated review text can cite a stale or slightly-off file:line, so
    // fall back to a general comment rather than letting submission fail.
    if (toAdd.type === 'inline' && toAdd.path && toAdd.line !== undefined) {
      const validLines = diffLines[toAdd.path];
      if (!validLines?.has(toAdd.line)) {
        toast({
          title: 'Line not in diff',
          description: `${toAdd.path}:${toAdd.line} isn't part of the PR diff — added as a general comment instead.`,
          variant: 'warning',
        });
        toAdd = { ...toAdd, type: 'general', body: `**${toAdd.path}:${toAdd.line}**\n${toAdd.body}` };
      }
    }

    const newComment: PendingComment = { ...toAdd, id: crypto.randomUUID() };
    const current = activeTab.pendingReview;
    updateTab(activeTabId, {
      pendingReview: { comments: [...current.comments, newComment] },
    });
  }, [activeTabId, activeTab.pendingReview, updateTab, diffLines, toast]);

  const removePendingComment = useCallback((id: string) => {
    const current = activeTab.pendingReview;
    updateTab(activeTabId, {
      pendingReview: { comments: current.comments.filter(c => c.id !== id) },
    });
  }, [activeTabId, activeTab.pendingReview, updateTab]);

  const editPendingComment = useCallback((id: string, body: string) => {
    const current = activeTab.pendingReview;
    updateTab(activeTabId, {
      pendingReview: {
        comments: current.comments.map(c => c.id === id ? { ...c, body } : c),
      },
    });
  }, [activeTabId, activeTab.pendingReview, updateTab]);

  const clearPendingReview = useCallback(() => {
    updateTab(activeTabId, { pendingReview: { comments: [] } });
  }, [activeTabId, updateTab]);

  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

  const submitReviewAction = useCallback(async (verdict: string, summaryBody?: string) => {
    const pr = activeTab.prData;
    if (!pr) return;

    setReviewSubmitting(true);
    setReviewSubmitError(null);

    const pending = activeTab.pendingReview;

    // Final safety net: only send inline comments whose path:line is actually
    // part of the PR diff — GitHub rejects the whole review (422) otherwise.
    // Anything that doesn't resolve gets folded into the summary body instead.
    const isValidInline = (c: PendingComment) =>
      c.type === 'inline' && !!c.path && c.line !== undefined && (diffLines[c.path]?.has(c.line) ?? false);

    const inlineComments = pending.comments
      .filter(isValidInline)
      .map(c => ({ path: c.path!, line: c.line!, body: c.body }));

    const generalComments = pending.comments.filter(
      c => c.type === 'general' || (c.type === 'inline' && !isValidInline(c))
    );
    const bodyParts: string[] = [];
    if (summaryBody) bodyParts.push(summaryBody);
    if (generalComments.length > 0) {
      bodyParts.push(...generalComments.map(c =>
        c.type === 'inline' ? `**${c.path}:${c.line}**\n${c.body}` : c.body
      ));
    }
    const fullBody = bodyParts.join('\n\n---\n\n') || undefined;

    try {
      await tauriApi.submitReview(
        pr.owner,
        pr.repo,
        pr.number,
        pr.headSha,
        verdict,
        fullBody,
        inlineComments,
      );
      clearPendingReview();
    } catch (err: any) {
      setReviewSubmitError(err.message || err.toString());
    } finally {
      setReviewSubmitting(false);
    }
  }, [activeTab.prData, activeTab.pendingReview, clearPendingReview, diffLines]);

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
        diffLines,
        highlightedAnnotation,
        scrollToAnnotation,
        triggerA2UI,
        a2uiPayload,
        a2uiLoading,
        a2uiError,
        isCachedReview,
        forceReReview,
        pendingReview,
        addPendingComment,
        removePendingComment,
        editPendingComment,
        submitReview: submitReviewAction,
        clearPendingReview,
        reviewSubmitting,
        reviewSubmitError,
      }}
    >
      {children}
      {repoPickerState && (
        <RepoPathPicker
          owner={repoPickerState.owner}
          repo={repoPickerState.repo}
          onSelected={(path) => repoPickerState.resolve(path)}
          onSkip={() => repoPickerState.resolve(null)}
        />
      )}
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
