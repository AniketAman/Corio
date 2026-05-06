import { useMemo, useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { useReview } from '../../context/ReviewContext';

interface ReviewPresetViewProps {
  explanation: string;
  fileExplanations: Record<string, string>;
  selectedFile: string | null;
}

interface ParsedIssue {
  text: string;
  fileLine?: string;
  severity: 'danger' | 'warning' | 'info';
}

interface ParsedReview {
  overallSummary: string;
  issues: ParsedIssue[];
}

const DANGER_KEYWORDS = ['bug', 'error', 'crash', 'fail', 'break', 'incorrect', 'wrong'];
const WARNING_KEYWORDS = ['edge case', 'missing', 'undefined', 'null', 'race', 'potential'];
const INFO_KEYWORDS = ['consider', 'suggest', 'could', 'might', 'improve', 'minor', 'nit'];

function classifyIssueSeverity(text: string): 'danger' | 'warning' | 'info' {
  const lower = text.toLowerCase();
  if (DANGER_KEYWORDS.some(kw => lower.includes(kw))) return 'danger';
  if (WARNING_KEYWORDS.some(kw => lower.includes(kw))) return 'warning';
  if (INFO_KEYWORDS.some(kw => lower.includes(kw))) return 'info';
  return 'warning';
}

function extractFileLine(text: string): string | undefined {
  const match = text.match(/([\w./\-]+\.\w+):(\d+)/);
  return match ? match[0] : undefined;
}

function parseReviewOutput(text: string): ParsedReview {
  // Extract overall summary: text between "### Overall Summary" and first "### FILE:"
  let overallSummary = '';
  const summaryMatch = text.match(/### Overall Summary\n([\s\S]*?)(?=### FILE:|### Potential Issues|$)/i);
  if (summaryMatch) {
    overallSummary = summaryMatch[1].trim();
  } else {
    // Fallback: text before first ### FILE:
    const beforeFile = text.match(/^([\s\S]*?)(?=### FILE:)/);
    if (beforeFile) {
      overallSummary = beforeFile[1].trim();
    }
  }

  // Extract issues from "### Potential Issues" section
  const issues: ParsedIssue[] = [];
  const issuesMatch = text.match(/### Potential Issues\n([\s\S]*?)(?=### |$)/i);
  if (issuesMatch) {
    const issuesText = issuesMatch[1];
    const bullets = issuesText.split(/\n[-*]\s+/).filter(b => b.trim());
    for (const bullet of bullets) {
      const trimmed = bullet.trim();
      if (!trimmed) continue;
      issues.push({
        text: trimmed,
        fileLine: extractFileLine(trimmed),
        severity: classifyIssueSeverity(trimmed),
      });
    }
  }

  return { overallSummary, issues };
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    >
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReviewPresetView({ explanation, fileExplanations, selectedFile }: ReviewPresetViewProps) {
  const { setSelectedFile } = useReview();
  const parsed = useMemo(() => parseReviewOutput(explanation), [explanation]);
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fileEntries = useMemo(() => Object.entries(fileExplanations), [fileExplanations]);

  const hasStructuredContent = parsed.overallSummary || parsed.issues.length > 0 || fileEntries.length > 0;

  // Scroll selected file into view
  useEffect(() => {
    if (selectedFile && fileRefs.current[selectedFile]) {
      fileRefs.current[selectedFile]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFile]);

  // Fallback: render raw markdown if parsing fails
  if (!hasStructuredContent) {
    return (
      <div className="prose-review">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    );
  }

  // Count issues by severity
  const dangerCount = parsed.issues.filter(i => i.severity === 'danger').length;
  const warningCount = parsed.issues.filter(i => i.severity === 'warning').length;
  const infoCount = parsed.issues.filter(i => i.severity === 'info').length;

  return (
    <div className="space-y-4">
      {/* Issue Summary Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {parsed.issues.length === 0 ? (
          <Badge variant="success">No issues found</Badge>
        ) : (
          <>
            {dangerCount > 0 && (
              <Badge variant="danger">{dangerCount} Bug{dangerCount > 1 ? 's' : ''}</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning">{warningCount} Edge Case{warningCount > 1 ? 's' : ''}</Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="info">{infoCount} Suggestion{infoCount > 1 ? 's' : ''}</Badge>
            )}
          </>
        )}
      </div>

      {/* Overall Summary */}
      {parsed.overallSummary && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-2">Overall Summary</h4>
          <div className="prose-review bg-surface-elevated border border-border-subtle rounded-[var(--radius)] p-3">
            <ReactMarkdown>{parsed.overallSummary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Per-file sections */}
      {fileEntries.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-2">File Changes</h4>
          <div className="space-y-2">
            {fileEntries.map(([filePath, fileExplanation]) => {
              const isSelected = selectedFile === filePath;
              const shouldDefaultOpen = fileEntries.length < 5 || isSelected;

              return (
                <div
                  key={filePath}
                  ref={(el) => { fileRefs.current[filePath] = el; }}
                >
                  <FileSection
                    filePath={filePath}
                    explanation={fileExplanation}
                    defaultOpen={shouldDefaultOpen}
                    isSelected={isSelected}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Potential Issues */}
      {parsed.issues.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-2">Potential Issues</h4>
          <div className="space-y-2">
            {parsed.issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} onFileClick={setSelectedFile} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FileSection({
  filePath,
  explanation,
  defaultOpen,
  isSelected,
}: {
  filePath: string;
  explanation: string;
  defaultOpen: boolean;
  isSelected: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Open when selected
  useEffect(() => {
    if (isSelected) {
      setOpen(true);
    }
  }, [isSelected]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left px-3 py-2.5 flex items-center gap-2 bg-surface-elevated border border-border-subtle rounded-[var(--radius)] cursor-pointer hover:bg-surface-hover transition-colors">
          <ChevronIcon open={open} />
          <span className="font-mono text-accent text-xs truncate">{filePath}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="prose-review px-3 py-2 border-x border-b border-border-subtle rounded-b-[var(--radius)] bg-surface-elevated">
          <ReactMarkdown>{explanation}</ReactMarkdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function IssueCard({
  issue,
  onFileClick,
}: {
  issue: ParsedIssue;
  onFileClick: (file: string) => void;
}) {
  const handleFileClick = () => {
    if (issue.fileLine) {
      const filePath = issue.fileLine.split(':')[0];
      onFileClick(filePath);
    }
  };

  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-[var(--radius)] p-3">
      <div className="flex items-start gap-2">
        <Badge variant={issue.severity} className="shrink-0 mt-0.5">
          {issue.severity === 'danger' ? 'Bug' : issue.severity === 'warning' ? 'Warning' : 'Info'}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="prose-review text-xs">
            <ReactMarkdown>{issue.text}</ReactMarkdown>
          </div>
          {issue.fileLine && (
            <button
              onClick={handleFileClick}
              className="text-[12px] font-mono text-accent hover:underline cursor-pointer mt-1 bg-transparent border-none p-0"
            >
              {issue.fileLine}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
