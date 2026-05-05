import { useState, useRef, useEffect } from 'react';
import { useReview } from '../context/ReviewContext';
import { ChatPanel } from './ChatPanel';
import { StrictReviewView } from './review/StrictReviewView';
import { ReviewPresetView } from './review/ReviewPresetView';
import { ExplainPresetView } from './review/ExplainPresetView';
import { SecurityPresetView } from './review/SecurityPresetView';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';

export function ExplanationPanel() {
  const { explanation, fileExplanations, selectedFile, loading, activePresetId, highlightedAnnotation } = useReview();
  const [viewMode, setViewMode] = useState<'file' | 'full'>('file');
  const [chatOpen, setChatOpen] = useState(false);
  const fileRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fileExplanation = selectedFile ? fileExplanations[selectedFile] : null;
  const showFileView = viewMode === 'file' && selectedFile && fileExplanation;
  const hasFileMarkers = Object.keys(fileExplanations).length > 0;

  useEffect(() => {
    if (selectedFile && fileRef.current) {
      fileRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedFile]);

  // Scroll to the referenced annotation in the explanation text
  useEffect(() => {
    if (!highlightedAnnotation || !contentRef.current) return;

    const { file, line } = highlightedAnnotation;
    const searchText = `${file}:${line}`;

    // Find the text node containing the file:line reference
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.includes(searchText)) {
        const parentEl = node.parentElement;
        if (parentEl) {
          parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Flash highlight effect
          parentEl.classList.add('annotation-flash');
          setTimeout(() => parentEl.classList.remove('annotation-flash'), 2000);
        }
        break;
      }
    }
  }, [highlightedAnnotation]);

  return (
    <div className="flex flex-col h-full">
      {/* Explanation content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
        {/* View toggle - only show for custom presets with file markers */}
        {hasFileMarkers && !['strict', 'review', 'explain', 'security'].includes(activePresetId) && (
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

        {/* Preset-specific rich views */}
        {activePresetId === 'strict' && explanation ? (
          <StrictReviewView explanation={explanation} />
        ) : activePresetId === 'review' && explanation ? (
          <ReviewPresetView explanation={explanation} fileExplanations={fileExplanations} selectedFile={selectedFile} />
        ) : activePresetId === 'explain' && explanation ? (
          <ExplainPresetView explanation={explanation} fileExplanations={fileExplanations} selectedFile={selectedFile} />
        ) : activePresetId === 'security' && explanation ? (
          <SecurityPresetView explanation={explanation} />
        ) : showFileView ? (
          <div ref={fileRef} className="prose-review">
            <div className="text-xs font-mono text-accent mb-3 px-2 py-1 bg-accent-subtle rounded-[var(--radius-sm)]">
              {selectedFile}
            </div>
            <ReactMarkdown>{fileExplanation}</ReactMarkdown>
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
