import { useMemo, useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { TakeawayCard } from './TakeawayCard';
import { useReview } from '../../context/ReviewContext';

interface ExplainPresetViewProps {
  explanation: string;
  fileExplanations: Record<string, string>;
  selectedFile: string | null;
}

interface ParsedExplanation {
  overallSummary: string;
  takeaways: { text: string; filePath?: string }[];
}

const FILE_PATH_REGEX = /(?:^|\s|`)((?:src|lib|app|pages|components|utils|services|hooks|routes|server|client|test|tests|spec|config|scripts|packages)\/[\w./-]+\.\w+)/;

function extractFilePath(text: string): string | undefined {
  const match = text.match(FILE_PATH_REGEX);
  return match ? match[1] : undefined;
}

function parseExplanation(text: string): ParsedExplanation | null {
  const summaryMatch = text.match(/### Overall Summary\n([\s\S]*?)(?=### FILE:|### Key Takeaways|$)/i);
  const takeawaysMatch = text.match(/### Key Takeaways\n([\s\S]*?)$/i);

  if (!summaryMatch && !takeawaysMatch) {
    return null;
  }

  const overallSummary = summaryMatch ? summaryMatch[1].trim() : '';

  const takeaways: { text: string; filePath?: string }[] = [];
  if (takeawaysMatch) {
    const bulletLines = takeawaysMatch[1].split(/\n(?=[-*]\s)/).filter(Boolean);
    for (const line of bulletLines) {
      const cleaned = line.replace(/^[-*]\s+/, '').trim();
      if (cleaned) {
        takeaways.push({
          text: cleaned,
          filePath: extractFilePath(cleaned),
        });
      }
    }
  }

  return { overallSummary, takeaways };
}

export function ExplainPresetView({ explanation, fileExplanations, selectedFile }: ExplainPresetViewProps) {
  const { setSelectedFile } = useReview();
  const parsed = useMemo(() => parseExplanation(explanation), [explanation]);
  const fileKeys = useMemo(() => Object.keys(fileExplanations), [fileExplanations]);
  const selectedRef = useRef<HTMLDivElement>(null);

  const [openFiles, setOpenFiles] = useState<Record<string, boolean>>({});

  // Initialize open state: first file open by default, selectedFile open
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    if (fileKeys.length > 0) {
      initial[fileKeys[0]] = true;
    }
    if (selectedFile && fileKeys.includes(selectedFile)) {
      initial[selectedFile] = true;
    }
    setOpenFiles(initial);
  }, [fileKeys, selectedFile]);

  // Scroll selected file into view
  useEffect(() => {
    if (selectedFile && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFile]);

  const toggleFile = (path: string) => {
    setOpenFiles(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleFileClick = (path: string) => {
    setSelectedFile(path);
  };

  // Fallback: render raw markdown if parsing fails
  if (!parsed) {
    return (
      <div className="prose-review">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Takeaways - pinned at top */}
      {parsed.takeaways.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-accent font-medium mb-2 flex items-center gap-1.5">
            <span aria-hidden="true">&#9733;</span>
            Key Takeaways
          </h4>
          {parsed.takeaways.map((takeaway, i) => (
            <TakeawayCard
              key={i}
              text={takeaway.text}
              filePath={takeaway.filePath}
              onFileClick={handleFileClick}
            />
          ))}
        </div>
      )}

      {/* Overview - overall summary */}
      {parsed.overallSummary && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-2">
            Overview
          </h4>
          <div className="prose-review leading-relaxed">
            <ReactMarkdown>{parsed.overallSummary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Per-file explanations */}
      {fileKeys.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-2">
            File Explanations
          </h4>
          <div className="space-y-2">
            {fileKeys.map(filePath => (
              <div
                key={filePath}
                ref={selectedFile === filePath ? selectedRef : undefined}
                className="bg-surface-elevated border border-border-subtle rounded-[var(--radius)] overflow-hidden"
              >
                <Collapsible
                  open={!!openFiles[filePath]}
                  onOpenChange={() => toggleFile(filePath)}
                >
                  <CollapsibleTrigger className="w-full text-left px-3 py-2.5 flex items-center gap-2 bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors">
                    <svg
                      className={`w-3 h-3 text-text-muted transition-transform ${openFiles[filePath] ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-mono text-xs text-accent flex-1">{filePath}</span>
                    <span className="text-[11px] text-text-muted uppercase tracking-wider">concepts</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 border-t border-border-subtle">
                      <div className="prose-review text-xs">
                        <ReactMarkdown>{fileExplanations[filePath]}</ReactMarkdown>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
