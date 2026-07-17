/**
 * Parses a unified diff (as produced by `gh pr diff`) into the set of
 * new-file ("RIGHT" side) line numbers that fall within a diff hunk for
 * each file. GitHub's create-review API rejects inline comments whose
 * line isn't part of a diff hunk (HTTP 422), so callers must restrict
 * comment placement to these lines.
 */
export function parseDiffLines(diff: string): Record<string, Set<number>> {
  const result: Record<string, Set<number>> = {};
  if (!diff) return result;

  let currentFile: string | null = null;
  let newLine = 0;

  const lines = diff.split('\n');
  for (const line of lines) {
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).trim();
      currentFile = path === '/dev/null' ? null : path.replace(/^b\//, '');
      continue;
    }

    if (line.startsWith('@@')) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      newLine = match ? parseInt(match[1], 10) : 0;
      continue;
    }

    if (!currentFile || newLine === 0) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      (result[currentFile] ??= new Set()).add(newLine);
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // Removed line: exists only on the old side, doesn't consume a new-line number.
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file" marker: not a content line.
    } else if (line.startsWith(' ') || line === '') {
      (result[currentFile] ??= new Set()).add(newLine);
      newLine++;
    }
  }

  return result;
}
