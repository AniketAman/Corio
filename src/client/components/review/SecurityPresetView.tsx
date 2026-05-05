import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { SeverityBanner } from './SeverityBanner';
import { SecurityFindingCard, type SecurityFinding } from './SecurityFindingCard';
import { useReview } from '../../context/ReviewContext';

interface SecurityPresetViewProps {
  explanation: string;
}

interface ParsedSecurityReview {
  summary: string;
  findings: SecurityFinding[];
  noIssues: boolean;
}

function parseSecurityReview(text: string): ParsedSecurityReview {
  // Extract summary section
  const summaryMatch = text.match(/###\s*Security Summary\n([\s\S]*?)(?=###\s*Findings|$)/i);
  const summary = summaryMatch?.[1]?.trim() || '';

  // Split findings by severity header pattern
  const findingRegex = /####\s*\[SEVERITY:\s*(Critical|High|Medium|Low)\]\s*—\s*(.+)/gi;
  const findings: SecurityFinding[] = [];

  // Get all finding positions
  const matches: { severity: string; title: string; index: number }[] = [];
  let match;
  while ((match = findingRegex.exec(text)) !== null) {
    matches.push({
      severity: match[1].toLowerCase(),
      title: match[2].trim(),
      index: match.index + match[0].length,
    });
  }

  // Extract content blocks for each finding
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index - matches[i + 1].title.length - 30 : text.length;
    const block = text.slice(start, end);

    const locationMatch = block.match(/\*\*Location:\*\*\s*(.+)/i);
    const descriptionMatch = block.match(/\*\*Description:\*\*\s*([\s\S]*?)(?=\*\*Attack scenario:\*\*|\*\*Recommendation:\*\*|\*\*Location:\*\*|$)/i);
    const attackMatch = block.match(/\*\*Attack scenario:\*\*\s*([\s\S]*?)(?=\*\*Recommendation:\*\*|\*\*Location:\*\*|$)/i);
    const recommendationMatch = block.match(/\*\*Recommendation:\*\*\s*([\s\S]*?)(?=\*\*Attack scenario:\*\*|\*\*Location:\*\*|$)/i);

    findings.push({
      severity: matches[i].severity as SecurityFinding['severity'],
      title: matches[i].title,
      location: locationMatch?.[1]?.trim(),
      description: descriptionMatch?.[1]?.trim() || '',
      attackScenario: attackMatch?.[1]?.trim(),
      recommendation: recommendationMatch?.[1]?.trim(),
    });
  }

  // Determine if no issues found
  const noIssues = findings.length === 0 && /no (security )?issues (found|identified|detected)/i.test(summary || text);

  return { summary, findings, noIssues };
}

const severityOrder: SecurityFinding['severity'][] = ['critical', 'high', 'medium', 'low'];

const severityColors: Record<SecurityFinding['severity'], string> = {
  critical: 'text-danger',
  high: 'text-danger',
  medium: 'text-warning',
  low: 'text-info',
};

export function SecurityPresetView({ explanation }: SecurityPresetViewProps) {
  const { setSelectedFile } = useReview();
  const parsed = useMemo(() => parseSecurityReview(explanation), [explanation]);

  const hasStructuredContent = parsed.findings.length > 0 || parsed.noIssues;

  if (!hasStructuredContent && !parsed.summary) {
    return (
      <div className="prose-review">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    );
  }

  // Compute severity counts
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of parsed.findings) {
    counts[finding.severity]++;
  }

  // Group findings by severity
  const groupedFindings = severityOrder
    .map(severity => ({
      severity,
      findings: parsed.findings.filter(f => f.severity === severity),
    }))
    .filter(group => group.findings.length > 0);

  const handleFileClick = (file: string) => {
    setSelectedFile(file);
  };

  return (
    <div className="space-y-4">
      {/* Severity Banner */}
      <SeverityBanner counts={counts} noIssuesMessage={parsed.noIssues ? undefined : undefined} />

      {/* Summary */}
      {parsed.summary && (
        <div className="prose-review">
          <ReactMarkdown>{parsed.summary}</ReactMarkdown>
        </div>
      )}

      {/* Findings grouped by severity */}
      {groupedFindings.map(({ severity, findings }) => (
        <div key={severity}>
          <h4 className={`text-xs uppercase tracking-wider font-medium mb-2 ${severityColors[severity]}`}>
            {severity} ({findings.length})
          </h4>
          {findings.map((finding, i) => (
            <SecurityFindingCard key={i} finding={finding} onFileClick={handleFileClick} />
          ))}
        </div>
      ))}
    </div>
  );
}
