export function fixA2UIPayload(rawOutput: string): object[] | null {
  let text = rawOutput.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '');

  // Strip any text before the first `[`
  const firstBracket = text.indexOf('[');
  if (firstBracket === -1) {
    return null;
  }
  text = text.slice(firstBracket);

  // Strip any text after the last `]`
  const lastBracket = text.lastIndexOf(']');
  if (lastBracket === -1) {
    return null;
  }
  text = text.slice(0, lastBracket + 1);

  // Fix trailing commas before `]` or `}`
  text = text.replace(/,\s*([}\]])/g, '$1');

  // Try JSON.parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
