import { createContext, useContext, useState, ReactNode } from 'react';

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

interface ReviewContextType {
  prData: PRData | null;
  setPrData: (data: PRData | null) => void;
  explanation: string;
  setExplanation: (exp: string) => void;
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
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [prData, setPrData] = useState<PRData | null>(null);
  const [explanation, setExplanation] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mode, setMode] = useState<'repo' | 'standalone'>('standalone');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const addChatMessage = (msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  };

  return (
    <ReviewContext.Provider
      value={{
        prData,
        setPrData,
        explanation,
        setExplanation,
        selectedFile,
        setSelectedFile,
        mode,
        setMode,
        sessionId,
        setSessionId,
        chatHistory,
        addChatMessage,
        loading,
        setLoading
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
