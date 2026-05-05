import { useMemo } from 'react';
import { VerdictBanner } from './VerdictBanner';
import { FindingCard } from './FindingCard';
import ReactMarkdown from 'react-markdown';

interface StrictReviewViewProps {
  explanation: string;
}

interface ParsedFinding {
  fileLine?: string;
  what: string;
  why?: string;
  fix?: string;
  confidence: number;
}

interface ParsedReview {
  verdict?: { status: 'yes' | 'with-fixes' | 'no'; reasoning?: string };
  strengths?: string;
  findings: { priority: 1 | 2 | 3; findings: ParsedFinding[] }[];
  mandatoryChecks?: string;
  scope?: string;
}

function parseVerdict(text: string): ParsedReview['verdict'] {
  const verdictMatch = text.match(/\*\*Ready to merge:\*\*\s*(Yes|With fixes|No)/i);
  if (!verdictMatch) return undefined;

  const status = verdictMatch[1].toLowerCase() === 'yes' ? 'yes'
    : verdictMatch[1].toLowerCase() === 'no' ? 'no'
      : 'with-fixes';

  const reasoningMatch = text.match(/\*\*Reasoning:\*\*\s*(.+)/i);
  return { status, reasoning: reasoningMatch?.[1]?.trim() };
}

function parseFindings(text: string): ParsedReview['findings'] {
  const results: ParsedReview['findings'] = [];

  const prioritySections = [
    { regex: /### Priority 1[^\n]*\n([\s\S]*?)(?=### Priority 2|## Mandatory|$)/i, priority: 1 as const },
    { regex: /### Priority 2[^\n]*\n([\s\S]*?)(?=### Priority 3|## Mandatory|$)/i, priority: 2 as const },
    { regex: /### Priority 3[^\n]*\n([\s\S]*?)(?=## Mandatory|## Assessment|$)/i, priority: 3 as const },
  ];

  for (const { regex, priority } of prioritySections) {
    const match = text.match(regex);
    if (!match) continue;

    const section = match[1];
    const findings: ParsedFinding[] = [];

    const findingBlocks = section.split(/\n-\s+\*\*/).filter(Boolean);
    for (const block of findingBlocks) {
      const fileLineMatch = block.match(/(?:File:line|`?)([^\s`*]+:\d+)/);
      const whatMatch = block.match(/\*\*What:\*\*\s*(.+)/i) || block.match(/^([^*\n]+)/);
      const whyMatch = block.match(/\*\*Why[^:]*:\*\*\s*(.+)/i);
      const fixMatch = block.match(/\*\*Fix:\*\*\s*(.+)/i);
      const confidenceMatch = block.match(/\*\*Confidence:\*\*\s*(\d+)/i);

      if (whatMatch) {
        findings.push({
          fileLine: fileLineMatch?.[1],
          what: whatMatch[1].trim().replace(/\*\*/g, ''),
          why: whyMatch?.[1]?.trim(),
          fix: fixMatch?.[1]?.trim(),
          confidence: confidenceMatch ? parseInt(confidenceMatch[1], 10) : 85,
        });
      }
    }

    if (findings.length > 0) {
      results.push({ priority, findings });
    }
  }

  return results;
}

function parseStrictReview(text: string): ParsedReview {
  const verdict = parseVerdict(text);
  const findings = parseFindings(text);

  const strengthsMatch = text.match(/## Strengths\n([\s\S]*?)(?=## Findings|## Mandatory|$)/i);
  const mandatoryMatch = text.match(/## Mandatory Checks\n([\s\S]*?)(?=## Assessment|## Per-Issue|$)/i);
  const scopeMatch = text.match(/## Scope\n([\s\S]*?)(?=## Strengths|## Findings|$)/i);

  return {
    verdict,
    strengths: strengthsMatch?.[1]?.trim(),
    findings,
    mandatoryChecks: mandatoryMatch?.[1]?.trim(),
    scope: scopeMatch?.[1]?.trim(),
  };
}

export function StrictReviewView({ explanation }: StrictReviewViewProps) {
  const parsed = useMemo(() => parseStrictReview(explanation), [explanation]);

  const hasStructuredContent = parsed.verdict || parsed.findings.length > 0;

  if (!hasStructuredContent) {
    return (
      <div className="prose-review">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      {parsed.verdict && (
        <VerdictBanner verdict={parsed.verdict.status} reasoning={parsed.verdict.reasoning} />
      )}

      {/* Scope */}
      {parsed.scope && (
        <div className="text-xs text-text-muted bg-surface-elevated rounded-[var(--radius-sm)] p-3 border border-border-subtle">
          <div className="prose-review">
            <ReactMarkdown>{parsed.scope}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Strengths */}
      {parsed.strengths && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-success font-medium mb-2">Strengths</h4>
          <div className="prose-review text-xs bg-success-muted rounded-[var(--radius-sm)] p-3 border border-success/20">
            <ReactMarkdown>{parsed.strengths}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Findings by priority */}
      {parsed.findings.map(({ priority, findings }) => (
        <div key={priority}>
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-2">
            Priority {priority}
            {priority === 1 && ' — Correctness & Performance'}
            {priority === 2 && ' — Duplication & Conventions'}
            {priority === 3 && ' — Test Coverage'}
          </h4>
          {findings.map((finding, i) => (
            <FindingCard key={i} finding={finding} priority={priority} />
          ))}
        </div>
      ))}

      {/* Mandatory checks */}
      {parsed.mandatoryChecks && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-medium mb-2">Mandatory Checks</h4>
          <div className="prose-review text-xs bg-surface-elevated rounded-[var(--radius-sm)] p-3 border border-border-subtle">
            <ReactMarkdown>{parsed.mandatoryChecks}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
