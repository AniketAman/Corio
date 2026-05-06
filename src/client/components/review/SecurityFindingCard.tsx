import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { useReview } from '../../context/ReviewContext';

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  location?: string;
  description: string;
  attackScenario?: string;
  recommendation?: string;
}

interface SecurityFindingCardProps {
  finding: SecurityFinding;
  onFileClick?: (file: string) => void;
}

const severityVariant = {
  critical: 'danger' as const,
  high: 'danger' as const,
  medium: 'warning' as const,
  low: 'info' as const,
};

export function SecurityFindingCard({ finding, onFileClick }: SecurityFindingCardProps) {
  const { setSelectedFile } = useReview();
  const defaultOpen = finding.severity === 'critical' || finding.severity === 'high';

  const handleFileClick = () => {
    if (!finding.location) return;
    const filePath = finding.location.split(':')[0];
    if (onFileClick) {
      onFileClick(filePath);
    } else {
      setSelectedFile(filePath);
    }
  };

  return (
    <div className="border border-border-subtle rounded-[var(--radius-sm)] bg-surface-elevated mb-3 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-start gap-2">
        <Badge variant={severityVariant[finding.severity]} className="shrink-0 mt-0.5 uppercase">
          {finding.severity}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary leading-snug">{finding.title}</div>
          {finding.location && (
            <span
              onClick={handleFileClick}
              className="text-[12px] font-mono text-accent hover:underline cursor-pointer mt-0.5 inline-block"
            >
              {finding.location}
            </span>
          )}
        </div>
      </div>

      {/* Description - always visible */}
      <div className="px-3 pb-2">
        <p className="text-sm text-text-secondary">{finding.description}</p>
      </div>

      {/* Attack Scenario - collapsible */}
      {finding.attackScenario && (
        <div className="px-3 pb-2">
          <Collapsible defaultOpen={defaultOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-warning cursor-pointer bg-transparent border-none p-0 hover:underline">
              <span>&#x26A0;</span>
              <span>Attack Scenario</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 bg-warning-muted border border-warning/20 rounded-[var(--radius-sm)] p-3">
                <p className="text-xs text-text-secondary">{finding.attackScenario}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Recommendation - collapsible */}
      {finding.recommendation && (
        <div className="px-3 pb-3">
          <Collapsible defaultOpen={defaultOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-success cursor-pointer bg-transparent border-none p-0 hover:underline">
              <span>&#x2713;</span>
              <span>Recommendation</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 bg-success-muted border border-success/20 rounded-[var(--radius-sm)] p-3">
                <p className="text-xs text-text-secondary">{finding.recommendation}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
