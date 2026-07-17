/**
 * Maps strict mode priority to Conventional Comments label.
 */
function priorityToLabel(priority: 1 | 2 | 3): string {
  if (priority === 1) return 'issue';
  return 'suggestion';
}

/**
 * Formats a strict mode finding as a Conventional Comment.
 *
 * Priority 1 → issue:
 * Priority 2/3 → suggestion:
 *
 * Format:
 *   {label}: {what}
 *
 *   {why} {fix}
 */
export function formatConventionalComment(
  priority: 1 | 2 | 3,
  finding: { what: string; why?: string; fix?: string }
): string {
  const label = priorityToLabel(priority);

  // Label line: ensure What ends with a period
  const what = finding.what.trim();
  const whatWithPeriod = what.endsWith('.') ? what : `${what}.`;

  const labelLine = `${label}: ${whatWithPeriod}`;

  // Body: combine Why and Fix into flowing prose
  const bodyParts: string[] = [];

  if (finding.why) {
    bodyParts.push(finding.why.trim());
  }

  if (finding.fix) {
    bodyParts.push(finding.fix.trim());
  }

  // No body if both Why and Fix are missing
  if (bodyParts.length === 0) {
    return labelLine;
  }

  const body = bodyParts.join(' ');

  return `${labelLine}\n\n${body}`;
}
