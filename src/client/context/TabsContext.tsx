import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PRMetadata } from '../hooks/useTauriApi';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface PendingComment {
  id: string;
  body: string;
  type: 'inline' | 'general';
  path?: string;
  line?: number;
  source: 'finding' | 'manual';
  findingId?: string;
}

export interface PendingReview {
  comments: PendingComment[];
}

export interface TabState {
  id: string;
  prUrl: string | null;
  prData: PRMetadata | null;
  explanation: string;
  fileExplanations: Record<string, string>;
  selectedFile: string | null;
  mode: 'repo' | 'standalone';
  sessionId: string | null;
  chatHistory: ChatMessage[];
  loading: boolean;
  error: string | null;
  diff: string;
  annotations: Record<string, number[]>;
  highlightedAnnotation: { file: string; line: number } | null;
  a2uiPayload: object[] | null;
  a2uiLoading: boolean;
  a2uiError: string | null;
  isCachedReview: boolean;
  lastReviewCostUsd: number | null;
  worktreePath: string | null;
  repoPath: string | null;
  activePresetId: string;
  pendingReview: PendingReview;
}

interface TabsContextType {
  tabs: TabState[];
  activeTabId: string;
  activeTab: TabState;
  addTab: (prUrl?: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<TabState>) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const createDefaultTabState = (id: string, prUrl?: string): TabState => {
  const savedPreset = localStorage.getItem('code-reviewer:preset') || 'review';

  return {
    id,
    prUrl: prUrl || null,
    prData: null,
    explanation: '',
    fileExplanations: {},
    selectedFile: null,
    mode: 'standalone',
    sessionId: null,
    chatHistory: [],
    loading: false,
    error: null,
    diff: '',
    annotations: {},
    highlightedAnnotation: null,
    a2uiPayload: null,
    a2uiLoading: false,
    a2uiError: null,
    isCachedReview: false,
    lastReviewCostUsd: null,
    worktreePath: null,
    repoPath: null,
    activePresetId: savedPreset,
    pendingReview: { comments: [] },
  };
};

export const TabsProvider = ({ children }: { children: ReactNode }) => {
  const [tabs, setTabs] = useState<TabState[]>(() => [
    createDefaultTabState(crypto.randomUUID()),
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  const addTab = useCallback((prUrl?: string): string => {
    const newId = crypto.randomUUID();
    const newTab = createDefaultTabState(newId, prUrl);

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);

    return newId;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== id);

      // If closing the last tab, create a new empty one
      if (newTabs.length === 0) {
        const newId = crypto.randomUUID();
        const emptyTab = createDefaultTabState(newId);
        setActiveTabId(newId);
        return [emptyTab];
      }

      // If closing the active tab, switch to adjacent tab
      if (id === activeTabId) {
        const closingIndex = prev.findIndex((tab) => tab.id === id);
        // Prefer left/previous tab, fall back to right
        const newActiveIndex = closingIndex > 0 ? closingIndex - 1 : 0;
        setActiveTabId(newTabs[newActiveIndex].id);
      }

      return newTabs;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<TabState>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, ...updates } : tab
      )
    );
  }, []);

  const activeTab = tabs.find((tab) => tab.id === activeTabId)!;

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        addTab,
        closeTab,
        setActiveTab,
        updateTab,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = (): TabsContextType => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
};
