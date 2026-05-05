import { useState } from 'react';
import { ConfidenceBar } from './ConfidenceBar';
import { Badge } from '../ui/badge';
import { useReview } from '../../context/ReviewContext';

interface Finding {
  fileLine?: string;
  what: string;
  why?: string;
  fix?: string;
  confidence: number;
}

interface FindingCardProps {
  finding: Finding;
  priority: 1 | 2 | 3;
}

export function FindingCard({ finding, priority }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { setSelectedFile } = useReview();

  const priorityConfig = {
    1: { label: 'P1', variant: 'danger' as const },
    2: { label: 'P2', variant: 'warning' as const },
    3: { label: 'P3', variant: 'info' as const },
  };

  const p = priorityConfig[priority];

  const handleFileClick = () => {
    if (finding.fileLine) {
      const filePath = finding.fileLine.split(':')[0];
      setSelectedFile(filePath);
    }
  };

  return (
    <div className="border border-border-subtle rounded-[var(--radius-sm)] bg-surface-elevated mb-2 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2 bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <Badge variant={p.variant} className="shrink-0 mt-0.5">{p.label}</Badge>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary leading-snug">{finding.what}</div>
          {finding.fileLine && (
            <span
              onClick={(e) => { e.stopPropagation(); handleFileClick(); }}
              className="text-[11px] font-mono text-accent hover:underline cursor-pointer mt-0.5 inline-block"
            >
              {finding.fileLine}
            </span>
          )}
        </div>
        <ConfidenceBar score={finding.confidence} className="shrink-0" />
      </button>

      {expanded && (finding.why || finding.fix) && (
        <div className="px-3 pb-3 border-t border-border-subtle pt-2 ml-[42px] space-y-2">
          {finding.why && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Why it matters</span>
              <p className="text-xs text-text-secondary mt-0.5">{finding.why}</p>
            </div>
          )}
          {finding.fix && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Suggested fix</span>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">{finding.fix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
