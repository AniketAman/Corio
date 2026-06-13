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
    if (/^\s*None\.?\s*$/i.test(section)) continue;

    const findings = parseFindingBlocks(section);
    if (findings.length > 0) {
      results.push({ priority, findings });
    }
  }

  return results;
}

// Match a `file/path.ext:123` reference inside body text, optionally wrapped in
// backticks or bold. Requires an extension to avoid matching field labels like
// "Confidence: 85" or stray "line 12:3".
const FILE_LINE_RE = /`?\*{0,2}([\w./\-]+\.\w+:\d+)\*{0,2}`?/;

// A finding heading is a level-2..4 heading whose text is essentially just a
// `path:line` reference (optionally backtick/bold wrapped). The path part does
// NOT require an extension, so `Makefile:12` works. This deliberately excludes
// severity sub-headings like "#### Critical (confidence 90–100)".
const FINDING_HEADING_RE = /^#{2,4}\s+`?\*{0,2}([^\s`*]+:\d+)\*{0,2}`?\s*$/;

// Pull the labelled fields (What/Why/Fix/Confidence) out of one finding's body.
// Tolerates `- What:`, `**What:**`, `What -`, etc.
function extractFields(block: string): Omit<ParsedFinding, 'fileLine'> | null {
  const field = (label: string) => {
    const re = new RegExp(`(?:^|\\n)\\s*[-*]?\\s*\\*{0,2}${label}\\*{0,2}\\s*[:\\-]\\s*(.+)`, 'i');
    return block.match(re)?.[1]?.replace(/\*\*/g, '').trim();
  };

  const what = field('What');
  const why = field('Why[^:\\-]*');
  const fix = field('Fix');
  const confidenceStr = field('Confidence');
  const confidence = confidenceStr ? parseInt(confidenceStr, 10) : 85;

  // Fall back to the first non-empty, non-field line as the summary.
  let summary = what;
  if (!summary) {
    const firstLine = block
      .split('\n')
      .map(l => l.trim())
      .find(l => l && !/^[-*]?\s*\*{0,2}(What|Why|Fix|Confidence)/i.test(l) && !FILE_LINE_RE.test(l) && !l.startsWith('#'));
    summary = firstLine?.replace(/\*\*/g, '');
  }

  if (!summary) return null;
  return { what: summary, why, fix, confidence: isNaN(confidence) ? 85 : confidence };
}

// Is this line a `#### file:line` finding heading (and not a severity heading
// like "#### Critical (confidence 90–100)")?
function findingHeadingRef(line: string): string | undefined {
  return line.trim().match(FINDING_HEADING_RE)?.[1];
}

// Split a priority section into individual findings.
// Primary format: each finding is a `#### file:line` heading. Falls back to
// splitting on repeated File:line/Location markers, then blank lines, for the
// legacy `- **…**` bullet format.
function parseFindingBlocks(section: string): ParsedFinding[] {
  const lines = section.split('\n');

  // Primary: group by finding headings. Only enter heading mode when at least
  // one heading line is itself a file:line ref — severity sub-headings alone
  // must NOT trigger this path.
  if (lines.some(l => findingHeadingRef(l))) {
    return splitByDelimiter(lines, l => findingHeadingRef(l) !== undefined);
  }

  // Legacy fallback: findings are often back-to-back with no blank line, so
  // split on the recurring File:line / Location marker that opens each finding.
  const legacyMarker = /^\s*[-*]?\s*\*{0,2}(?:File:line|Location)\*{0,2}/i;
  if (lines.filter(l => legacyMarker.test(l)).length > 1) {
    return splitByDelimiter(lines, l => legacyMarker.test(l));
  }

  // Last resort: split on blank lines.
  const blocks = section.split(/\n\s*\n/).filter(b => b.trim());
  const findings: ParsedFinding[] = [];
  for (const block of blocks) {
    const fields = extractFields(block);
    if (fields) findings.push({ fileLine: block.match(FILE_LINE_RE)?.[1], ...fields });
  }
  return findings;
}

// Accumulate lines into blocks, starting a new block each time `isStart` matches.
function splitByDelimiter(lines: string[], isStart: (line: string) => boolean): ParsedFinding[] {
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (isStart(line) && current.length > 0) {
      blocks.push(current.join('\n'));
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current.join('\n'));

  const findings: ParsedFinding[] = [];
  for (const block of blocks) {
    const headingLine = block.split('\n')[0];
    const fileLine = findingHeadingRef(headingLine) ?? block.match(FILE_LINE_RE)?.[1];
    const fields = extractFields(block);
    if (fields) findings.push({ fileLine, ...fields });
  }
  return findings;
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
