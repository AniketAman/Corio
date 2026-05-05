import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface PRFile {
  path: string;
  additions: number;
  deletions: number;
  status: string;
}

interface PRData {
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  template: string;
  builtIn: boolean;
  parseFileMarkers: boolean;
}

interface ReviewContextType {
  prData: PRData | null;
  setPrData: (data: PRData | null) => void;
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
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [prData, setPrData] = useState<PRData | null>(null);
  const [explanation, setExplanation] = useState('');
  const [fileExplanations, setFileExplanations] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mode, setMode] = useState<'repo' | 'standalone'>('standalone');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrUrl, setCurrentPrUrl] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState('review');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, number[]>>({});
  const [highlightedAnnotation, setHighlightedAnnotation] = useState<{ file: string; line: number } | null>(null);

  const scrollToAnnotation = useCallback((file: string, line: number) => {
    setHighlightedAnnotation({ file, line });
  }, []);

  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.json())
      .then(data => setPresets(data))
      .catch(() => {});
  }, []);

  const addChatMessage = (msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  };

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

    const params = new URLSearchParams(window.location.search);
    const modelId = params.get('model') || undefined;

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl: url, modelId, presetId: activePresetId })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let explanationText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'pr-metadata') {
              setPrData(data.pr);
              setMode(data.mode);
            } else if (event === 'explanation') {
              explanationText += data.chunk;
              setExplanation(explanationText);
              if (data.parseFileMarkers !== false) {
                const fileMap: Record<string, string> = {};
                const fileRegex = /### FILE: (.+)\n([\s\S]*?)(?=### FILE:|### Potential Issues|### Key Takeaways|$)/g;
                let match;
                while ((match = fileRegex.exec(explanationText)) !== null) {
                  fileMap[match[1].trim()] = match[2].trim();
                }
                if (Object.keys(fileMap).length > 0) {
                  setFileExplanations(fileMap);
                }
              }
            } else if (event === 'done') {
              if (data.sessionId) {
                setSessionId(data.sessionId);
              }
            } else if (event === 'error') {
              setError(data.message);
            }
          }
        }
      }

      // Parse annotations from completed explanation text
      const lineRefRegex = /(?:`|^|\s)([\w./\-]+\.\w+):(\d+)/gm;
      const annotationMap: Record<string, number[]> = {};
      let refMatch;
      while ((refMatch = lineRefRegex.exec(explanationText)) !== null) {
        const filePath = refMatch[1];
        const lineNum = parseInt(refMatch[2], 10);
        if (!annotationMap[filePath]) {
          annotationMap[filePath] = [];
        }
        if (!annotationMap[filePath].includes(lineNum)) {
          annotationMap[filePath].push(lineNum);
        }
      }
      setAnnotations(annotationMap);
    } catch (error: any) {
      setError(error.message || 'Review failed');
    } finally {
      setLoading(false);
    }
  }, [activePresetId]);

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
