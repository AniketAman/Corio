import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SETTINGS_DIR = process.env.HOME
  ? join(process.env.HOME, '.code-reviewer')
  : join(__dirname, '../../../.code-reviewer');
const PRESETS_FILE = join(SETTINGS_DIR, 'presets.json');

export interface Preset {
  id: string;
  name: string;
  description: string;
  template: string;
  builtIn: boolean;
  parseFileMarkers: boolean;
}

// ─── Built-in preset templates ───────────────────────────────────────────────

export const REVIEW_TEMPLATE = `You are reviewing a GitHub PR{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description (author's stated intent)
{{body}}

## Diff
{{diff}}

## Instructions

Structure your review using EXACTLY this format. Use the exact markers shown below — they are parsed by the UI to show per-file explanations.

### Overall Summary

Write 2-4 paragraphs covering:
- What this PR aims to achieve (based on the description above)
- Whether the implementation matches the stated intent — call out any gaps or deviations
- Overall assessment of the approach

{{fileInstructions}}

### Potential Issues
List any cross-cutting concerns, edge cases, or improvements across the entire PR.

{{repoToolHint}}`;

export const EXPLAIN_TEMPLATE = `You are explaining a GitHub PR to help the reader understand the codebase{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description
{{body}}

## Diff
{{diff}}

## Instructions

Focus on TEACHING — help the reader understand what this code does and why.

### Overall Summary
Write 2-4 paragraphs covering:
- What problem does this PR solve?
- What approach was chosen and WHY (what alternatives exist?)
- How do these changes fit into the larger system architecture?
- Key abstractions or patterns introduced

{{fileInstructions}}

### Key Takeaways
Summarize the most important concepts a reader should remember.

{{repoToolHint}}`;

export const SECURITY_TEMPLATE = `You are performing a security-focused review of a GitHub PR{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description
{{body}}

## Diff
{{diff}}

## Instructions

Focus EXCLUSIVELY on security concerns. Skip all stylistic, performance, or architectural feedback unless it has direct security implications.

Analyze the diff for:
- **Injection:** SQL injection, command injection, template injection, XSS
- **Authentication & Authorization:** auth bypasses, privilege escalation, missing access checks
- **Secrets:** hardcoded credentials, API keys, tokens, or sensitive data in code
- **Insecure Deserialization:** untrusted data deserialized without validation
- **SSRF:** server-side request forgery via user-controlled URLs
- **Path Traversal:** user input used in file paths without sanitization
- **Sensitive Data Exposure:** PII logged, returned in errors, or stored insecurely
- **Input Validation:** missing or insufficient validation at trust boundaries

## Output Format

### Security Summary
1-2 paragraphs: overall security posture of this PR. Is it introducing new attack surface?

### Findings

For each finding, use this format:

#### [SEVERITY: Critical|High|Medium|Low] — Title
- **Location:** file:line
- **Description:** What the vulnerability is
- **Attack scenario:** How an attacker could exploit this
- **Recommendation:** Specific fix

If no security issues are found, state that clearly and explain what security-relevant patterns were checked.

{{repoToolHint}}`;

export const STRICT_TEMPLATE = `You are performing a strict, priority-ordered code review of a GitHub PR{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description (author's stated intent)
{{body}}

## Diff
{{diff}}

## Instructions

Review with strict standards. Only report findings with confidence >= 80/100. Use the PR description as the author's plan — verify the implementation aligns with it.

## Output Format

Use EXACTLY this structure:

## Scope
Reviewing: [list files changed]
Against: PR description (author's stated intent)

## Strengths
- [specific things done well, with file:line references]

## Findings

### Priority 1 — Correctness & Performance

#### Critical (confidence 90–100)
[findings — if none, write "None"]

#### Important (confidence 80–89)
[findings — if none, write "None"]

### Priority 2 — Code Duplication & Conventions
[findings — if none, write "None"]

### Priority 3 — Test Coverage
[findings — if none, write "None"]

## Mandatory Checks
- **Code Duplication:** [result]
- **Migration Safety:** [N/A or result]
- **Error Handling:** [result]
- **Plan Alignment:** [result comparing implementation to PR description, or "N/A — no PR description provided"]

## Assessment
**Ready to merge:** Yes | With fixes | No
**Reasoning:** [1-2 sentence verdict]

---

For each finding include: file:line, what the issue is, why it matters, suggested fix, and confidence N/100.

{{repoToolHint}}`;

// ─── Built-in presets ────────────────────────────────────────────────────────

const REVIEW_PRESET: Preset = {
  id: 'review',
  name: 'Review',
  description: 'Balanced review — explain changes and surface issues',
  template: REVIEW_TEMPLATE,
  builtIn: true,
  parseFileMarkers: true,
};

const EXPLAIN_PRESET: Preset = {
  id: 'explain',
  name: 'Explain',
  description: 'Teaching mode — why this approach, key abstractions, system fit',
  template: EXPLAIN_TEMPLATE,
  builtIn: true,
  parseFileMarkers: true,
};

const SECURITY_PRESET: Preset = {
  id: 'security',
  name: 'Security',
  description: 'OWASP-focused — injection, auth, secrets, data exposure',
  template: SECURITY_TEMPLATE,
  builtIn: true,
  parseFileMarkers: false,
};

const STRICT_PRESET: Preset = {
  id: 'strict',
  name: 'Strict',
  description: 'Priority-ordered findings, confidence scores, merge verdict',
  template: STRICT_TEMPLATE,
  builtIn: true,
  parseFileMarkers: false,
};

const BUILT_IN_PRESETS: Preset[] = [
  REVIEW_PRESET,
  EXPLAIN_PRESET,
  SECURITY_PRESET,
  STRICT_PRESET,
];

// ─── Custom preset persistence ───────────────────────────────────────────────

async function ensureDir() {
  if (!existsSync(SETTINGS_DIR)) {
    await mkdir(SETTINGS_DIR, { recursive: true });
  }
}

export function getBuiltInPresets(): Preset[] {
  return BUILT_IN_PRESETS;
}

export async function getCustomPresets(): Promise<Preset[]> {
  try {
    const data = await readFile(PRESETS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export async function getAllPresets(): Promise<Preset[]> {
  const custom = await getCustomPresets();
  return [...BUILT_IN_PRESETS, ...custom];
}

export async function getPresetById(id: string): Promise<Preset | undefined> {
  const builtIn = BUILT_IN_PRESETS.find(p => p.id === id);
  if (builtIn) return builtIn;

  const custom = await getCustomPresets();
  return custom.find(p => p.id === id);
}

export async function saveCustomPreset(preset: Omit<Preset, 'builtIn'>): Promise<Preset> {
  await ensureDir();
  const custom = await getCustomPresets();

  const newPreset: Preset = {
    ...preset,
    id: preset.id || randomUUID(),
    builtIn: false,
  };

  // Update existing or append
  const existingIndex = custom.findIndex(p => p.id === newPreset.id);
  if (existingIndex >= 0) {
    custom[existingIndex] = newPreset;
  } else {
    custom.push(newPreset);
  }

  await writeFile(PRESETS_FILE, JSON.stringify(custom, null, 2), 'utf-8');
  return newPreset;
}

export async function deleteCustomPreset(id: string): Promise<boolean> {
  await ensureDir();
  const custom = await getCustomPresets();
  const filtered = custom.filter(p => p.id !== id);

  if (filtered.length === custom.length) {
    return false;
  }

  await writeFile(PRESETS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}
