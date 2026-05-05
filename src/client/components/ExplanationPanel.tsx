import { useState, useRef, useEffect } from 'react';
import { useReview } from '../context/ReviewContext';
import { ChatPanel } from './ChatPanel';
import { StrictReviewView } from './review/StrictReviewView';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';

export function ExplanationPanel() {
  const { explanation, fileExplanations, selectedFile, loading, activePresetId } = useReview();
  const [viewMode, setViewMode] = useState<'file' | 'full'>('file');
  const [chatOpen, setChatOpen] = useState(false);
  const fileRef = useRef<HTMLDivElement>(null);

  const overallMatch = explanation.match(/^([\s\S]*?)(?=### FILE:|$)/);
  const overallSummary = overallMatch?.[1]?.trim() || '';

  const issuesMatch = explanation.match(/### Potential Issues\n([\s\S]*?)$/);
  const potentialIssues = issuesMatch?.[1]?.trim() || '';

  const fileExplanation = selectedFile ? fileExplanations[selectedFile] : null;
  const showFileView = viewMode === 'file' && selectedFile && fileExplanation;
  const hasFileMarkers = Object.keys(fileExplanations).length > 0;

  useEffect(() => {
    if (selectedFile && fileRef.current) {
      fileRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedFile]);

  return (
    <div className="flex flex-col h-full">
      {/* Explanation content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* View toggle - only show when we have file markers */}
        {hasFileMarkers && (
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setViewMode('file')}
              className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] border-none cursor-pointer transition-colors ${
                viewMode === 'file'
                  ? 'bg-accent text-white'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              File View
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] border-none cursor-pointer transition-colors ${
                viewMode === 'full'
                  ? 'bg-accent text-white'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              Full Review
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && !explanation && (
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Generating review...
          </div>
        )}

        {/* Strict preset view */}
        {activePresetId === 'strict' && explanation ? (
          <StrictReviewView explanation={explanation} />
        ) : showFileView ? (
          <div ref={fileRef} className="prose-review">
            <div className="text-xs font-mono text-accent mb-3 px-2 py-1 bg-accent-subtle rounded-[var(--radius-sm)]">
              {selectedFile}
            </div>
            <ReactMarkdown>{fileExplanation}</ReactMarkdown>
          </div>
        ) : viewMode === 'file' && !selectedFile && overallSummary ? (
          <div className="prose-review">
            <h4 className="text-sm font-semibold text-text-primary mb-3">Overall Summary</h4>
            <ReactMarkdown>{overallSummary}</ReactMarkdown>
            {potentialIssues && (
              <>
                <h4 className="text-sm font-semibold text-warning mt-5 mb-3">Potential Issues</h4>
                <ReactMarkdown>{potentialIssues}</ReactMarkdown>
              </>
            )}
          </div>
        ) : viewMode === 'file' && selectedFile && !fileExplanation && explanation ? (
          <div className="text-sm text-text-muted">
            No specific explanation for this file yet.
          </div>
        ) : explanation ? (
          <div className="prose-review">
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
        ) : null}

        {/* Generating indicator */}
        {loading && explanation && (
          <div className="flex items-center gap-2 text-text-muted text-xs mt-4 pt-3 border-t border-border-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Generating...
          </div>
        )}
      </div>

      {/* Collapsible chat */}
      <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
        <div className="border-t border-border">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between rounded-none h-9 px-4 text-xs text-text-muted hover:text-text-primary"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3.5A1.5 1.5 0 013.5 2h7A1.5 1.5 0 0112 3.5v5A1.5 1.5 0 0110.5 10H5L2 12.5V3.5z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Chat
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`transition-transform ${chatOpen ? 'rotate-180' : ''}`}
              >
                <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="h-[300px] border-t border-border-subtle">
              <ChatPanel />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
