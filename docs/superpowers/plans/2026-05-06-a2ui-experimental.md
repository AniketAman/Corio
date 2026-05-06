# A2UI Experimental Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an experimental A2UI interactive rendering mode behind a `--a2ui` flag. After the normal review completes, a second pass (Haiku) converts the review into A2UI JSON with interactive components. Renders all at once (no streaming) with a loader. The A2UI module should be self-contained and reusable in other React projects.

**Architecture:** Two-pass pipeline:
1. Opus generates the review as normal (streaming markdown, existing flow)
2. After review completes, if `--a2ui` flag is active, send the completed review text to Haiku with A2UI schema + catalog + examples
3. Haiku returns A2UI JSON (one-shot, no streaming needed)
4. Frontend receives the A2UI payload, passes to MessageProcessor, renders via A2uiSurface

**Tech Stack:** @a2ui/react, @a2ui/web_core, Claude Haiku (via claude CLI), zod

---

## Design Decisions

### Why two-pass?
- Opus generates the best review without A2UI schema overhead eating context
- Haiku is cheap and fast for format conversion (review text → A2UI JSON)
- Decouples review quality from rendering quality
- If A2UI rendering fails, the markdown review is still available as fallback

### Why not streaming?
- A2UI components reference each other by ID — partial JSON is invalid
- Haiku is fast enough (~2-5 seconds for conversion)
- Simpler implementation: one request, one response, render all at once
- Show a "Rendering interactive view..." loader during conversion

### Modularity
The A2UI integration is self-contained in `src/client/a2ui/` (frontend) and `src/server/services/a2ui/` (backend). These directories can be copied into any React+Express project with zero coupling to the code reviewer domain. Domain-specific components (FindingCard, VerdictBanner) are registered externally via a catalog config — the core module knows nothing about code reviews.

### Interactive Components

**Actions on Findings:**
- **Acknowledge checkbox** — triage each finding as "seen" / "will fix" / "won't fix"
- **Ask follow-up button** — auto-populates chat input with context about the finding
- **Copy as PR comment button** — formats finding as a GitHub PR comment, copies to clipboard
- **Dismiss button** — hide a finding from view after triaging

**Navigation & Filtering:**
- **Severity filter (ChoicePicker)** — show only Critical/High/Medium/Low
- **File tabs** — tab bar switching between per-file views
- **Priority toggle** — show/hide priority groups

**Summary & Progress:**
- **Progress tracker** — "3/7 findings addressed" progress bar, updates as checkboxes change
- **Export button** — bundles triage decisions into a formatted PR comment for clipboard
- **Verdict card** — bold merge verdict with "Copy verdict" action

**Inline:**
- **Inline notes (TextField)** — personal triage notes next to findings (ephemeral)
- **Confidence bar (ProgressBar)** — visual confidence scores
- **Collapsible sections (Accordion)** — expand/collapse findings, attack scenarios

---

## File Structure

### New Files — A2UI Module (reusable)

```
src/client/a2ui/                    ← Self-contained, portable module
├── index.ts                        ← Public API: A2UIPanel, useA2UI, createCatalog
├── A2UIPanel.tsx                   ← Main render component (MessageProcessor + Surface)
├── hooks/
│   └── useA2UI.ts                  ← Hook: processes payload, manages surfaces
├── catalog/
│   ├── index.ts                    ← createCatalog() factory, merges basic + custom
│   ├── basic-overrides.ts          ← Styled overrides for basic catalog (Tailwind)
│   └── types.ts                    ← Shared types for component props
├── components/                     ← Reusable interactive A2UI component implementations
│   ├── InteractiveCard.tsx         ← Card with action buttons (copy, dismiss, follow-up)
│   ├── AcknowledgeCheckbox.tsx     ← Triage checkbox (seen/will-fix/won't-fix)
│   ├── ProgressTracker.tsx         ← Progress bar that counts checked items
│   ├── FilterBar.tsx               ← Severity/priority ChoicePicker
│   ├── CopyButton.tsx              ← One-click copy to clipboard
│   └── CollapsibleSection.tsx      ← Accordion with styled trigger
└── prompt/
    ├── catalog-schema.ts           ← Component schema string for LLM prompt
    └── examples.ts                 ← Few-shot conversion examples
```

```
src/server/services/a2ui/           ← Self-contained backend module
├── index.ts                        ← Public API: convertToA2UI()
├── converter.ts                    ← Haiku CLI call, JSON parsing, validation
├── prompt-builder.ts               ← Builds the conversion prompt (schema + examples + review text)
└── fixer.ts                        ← PayloadFixer: repairs common LLM JSON errors
```

### New Files — Code Reviewer Integration (thin wiring)

```
src/server/routes/a2ui.ts           ← POST /api/a2ui/render endpoint
src/client/components/A2UIView.tsx  ← Wires A2UIPanel into ExplanationPanel with fallback
```

### Modified Files
- `package.json` — add @a2ui/react, @a2ui/web_core, zod
- `src/cli.ts` — add `--a2ui` flag
- `src/server/index.ts` — register a2ui route
- `src/client/context/ReviewContext.tsx` — add a2uiEnabled, a2uiPayload, a2uiLoading state
- `src/client/components/ExplanationPanel.tsx` — render A2UIView when enabled + payload ready

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install A2UI packages**

```bash
npm install @a2ui/react @a2ui/web_core zod
```

- [ ] **Step 2: Commit**

---

## Task 2: A2UI Frontend Module (Reusable Core)

**Files:**
- Create: `src/client/a2ui/index.ts`
- Create: `src/client/a2ui/A2UIPanel.tsx`
- Create: `src/client/a2ui/hooks/useA2UI.ts`
- Create: `src/client/a2ui/catalog/index.ts`
- Create: `src/client/a2ui/catalog/basic-overrides.ts`
- Create: `src/client/a2ui/catalog/types.ts`

- [ ] **Step 1: Create types**

`src/client/a2ui/catalog/types.ts`:
```typescript
export interface A2UIAction {
  type: string;
  payload?: Record<string, unknown>;
}

export interface A2UIPanelProps {
  payload: object[] | null;
  loading?: boolean;
  error?: string | null;
  onAction?: (action: A2UIAction) => void;
  onFallback?: () => void;
  className?: string;
}
```

- [ ] **Step 2: Create useA2UI hook**

`src/client/a2ui/hooks/useA2UI.ts`:
- Accepts `payload: object[] | null` and catalog
- Creates MessageProcessor, processes messages
- Returns `{ surfaces, error, ready }`
- Handles errors gracefully (sets error state, doesn't throw)

- [ ] **Step 3: Create catalog factory**

`src/client/a2ui/catalog/index.ts`:
- `createCatalog(customComponents?)` — merges basicCatalog with optional custom components
- Exports a default catalog with styled basic components

- [ ] **Step 4: Create basic-overrides**

`src/client/a2ui/catalog/basic-overrides.ts`:
- Override Text, Card, Button, CheckBox, etc. with Tailwind-styled versions
- These render with our theme colors (purple accent, dark surfaces)

- [ ] **Step 5: Create A2UIPanel**

`src/client/a2ui/A2UIPanel.tsx`:
- The main component: takes `A2UIPanelProps`
- Shows loader when `loading`
- Shows error state when `error`
- Renders surfaces when payload is ready
- Calls `onFallback` if rendering fails
- Calls `onAction` when interactive elements are clicked

- [ ] **Step 6: Create public index**

`src/client/a2ui/index.ts`:
```typescript
export { A2UIPanel } from './A2UIPanel';
export { useA2UI } from './hooks/useA2UI';
export { createCatalog } from './catalog';
export type { A2UIPanelProps, A2UIAction } from './catalog/types';
```

- [ ] **Step 7: Commit**

---

## Task 3: Interactive Component Implementations

**Files:**
- Create: `src/client/a2ui/components/InteractiveCard.tsx`
- Create: `src/client/a2ui/components/AcknowledgeCheckbox.tsx`
- Create: `src/client/a2ui/components/ProgressTracker.tsx`
- Create: `src/client/a2ui/components/FilterBar.tsx`
- Create: `src/client/a2ui/components/CopyButton.tsx`
- Create: `src/client/a2ui/components/CollapsibleSection.tsx`

- [ ] **Step 1: InteractiveCard**

A card with content + action buttons row at the bottom:
- Props: title, subtitle, variant, actions (array of {label, actionType, variant})
- Renders: styled card with header + content slot + button row
- On button click: fires action through A2UI action system

- [ ] **Step 2: AcknowledgeCheckbox**

A triage widget with three states:
- Props: label, state (unseen/acknowledged/will-fix/wont-fix)
- Renders: checkbox + label + state dropdown
- On change: fires acknowledgement action

- [ ] **Step 3: ProgressTracker**

Shows triage progress:
- Props: total, acknowledged, willFix, wontFix
- Renders: progress bar + "3/7 addressed" text + colored segments
- Reacts to data model changes (updates automatically as checkboxes change)

- [ ] **Step 4: FilterBar**

Severity/priority filter:
- Props: options (array of {id, label, color}), selected
- Renders: pill buttons that toggle on/off
- On change: fires filter action (hides/shows findings via data model)

- [ ] **Step 5: CopyButton**

One-click copy:
- Props: label, textToCopy (or path to data model value)
- Renders: button that shows "Copied!" feedback for 2s after click
- Uses navigator.clipboard.writeText

- [ ] **Step 6: CollapsibleSection**

Accordion:
- Props: title, defaultOpen, icon
- Renders: trigger header + collapsible content
- Uses Radix Collapsible under the hood

- [ ] **Step 7: Commit**

---

## Task 4: A2UI Backend Module (Reusable Core)

**Files:**
- Create: `src/server/services/a2ui/index.ts`
- Create: `src/server/services/a2ui/converter.ts`
- Create: `src/server/services/a2ui/prompt-builder.ts`
- Create: `src/server/services/a2ui/fixer.ts`

- [ ] **Step 1: Create prompt-builder**

`src/server/services/a2ui/prompt-builder.ts`:
- Exports `buildConversionPrompt(reviewText, catalogSchema, examples)`
- System prompt: instructs Haiku to convert review text to A2UI v0.9 JSON
- Lists available components with their props
- Includes 2-3 few-shot examples of review text → A2UI JSON
- Emphasizes interactive elements: checkboxes for triage, action buttons, progress tracking
- Tells Haiku: "Output ONLY a valid JSON array of A2UI v0.9 messages. No markdown wrapping."

- [ ] **Step 2: Create fixer**

`src/server/services/a2ui/fixer.ts`:
- Exports `fixA2UIPayload(rawOutput: string): object[] | null`
- Strips markdown code fences (```json ... ```)
- Fixes trailing commas
- Fixes unterminated strings/brackets (best-effort)
- Validates result is a JSON array
- Returns null if unfixable

- [ ] **Step 3: Create converter**

`src/server/services/a2ui/converter.ts`:
- Exports `convertToA2UI(reviewText: string, presetId: string): Promise<object[] | null>`
- Builds prompt via prompt-builder
- Spawns `claude` with `--model claude-haiku-4-5-20251001 --output-format json`
- Adds process to activeProcesses set (import from claude.ts)
- Timeout: 30 seconds
- On success: parse JSON, run through fixer if needed, return
- On failure: return null

- [ ] **Step 4: Create public index**

`src/server/services/a2ui/index.ts`:
```typescript
export { convertToA2UI } from './converter';
```

- [ ] **Step 5: Commit**

---

## Task 5: Catalog Schema + Few-Shot Examples (for Haiku Prompt)

**Files:**
- Create: `src/client/a2ui/prompt/catalog-schema.ts`
- Create: `src/client/a2ui/prompt/examples.ts`

- [ ] **Step 1: Write catalog schema**

A string describing all available components and their props that Haiku can use:

```typescript
export const CATALOG_SCHEMA = `
Available A2UI v0.9 components:

Layout:
- Row: { gap?: number, align?: "start"|"center"|"end", justify?: "start"|"center"|"end"|"between" }
- Column: { gap?: number }
- Card: { title?: string, subtitle?: string, variant?: "default"|"elevated"|"outlined" }
- Divider: {}
- CollapsibleSection: { title: string, defaultOpen?: boolean, icon?: string }

Text & Display:
- Text: { text: string, variant?: "h1"|"h2"|"h3"|"body"|"caption"|"code" }
- Badge: { text: string, variant?: "success"|"danger"|"warning"|"info"|"default" }
- ProgressBar: { value: number, max: number, label?: string, color?: "accent"|"success"|"danger"|"warning" }

Interactive:
- Button: { label: string, variant?: "primary"|"secondary"|"danger"|"success"|"ghost", action: string }
- CheckBox: { label: string, checked?: boolean, action: string }
- AcknowledgeCheckbox: { label: string, findingId: string, action: "acknowledge" }
- CopyButton: { label: string, textToCopy: string }
- FilterBar: { options: [{id, label, color}], action: "filter" }
- TextField: { label?: string, placeholder?: string, value?: string }
- ChoicePicker: { label: string, choices: [{id, label}], selected?: string, action: string }
- Tabs: { tabs: [{id, label}], activeTab?: string, action: "switchTab" }

Domain (code review):
- InteractiveCard: { title: string, severity?: "critical"|"high"|"medium"|"low"|"info", fileLine?: string, actions: [{label, actionType, variant}], children: content }
- ProgressTracker: { total: number, addressed: number, label?: string }

Messages format:
[
  {"version":"v0.9","createSurface":{"surfaceId":"main","catalogId":"code-review-catalog"}},
  {"version":"v0.9","updateComponents":{"surfaceId":"main","components":[...]}},
  {"version":"v0.9","updateDataModel":{"surfaceId":"main","path":"/","value":{...}}},
  {"version":"v0.9","beginRendering":{"surfaceId":"main"}}
]

Component format: { "id": "unique-id", "component": "ComponentName", "parentId": "parent-id", ...props }
Root component has no parentId.
`;
```

- [ ] **Step 2: Write few-shot examples**

3 examples:
1. Simple finding → InteractiveCard with Badge, Text, AcknowledgeCheckbox, CopyButton
2. Overall verdict → Card with Badge("Ready to merge: Yes"), ProgressTracker, Button("Copy verdict")
3. File-grouped review → Tabs + per-tab Column of findings with FilterBar at top

- [ ] **Step 3: Commit**

Note: These files live in `src/client/a2ui/prompt/` but are imported by the server for prompt building. This is fine since the server-side code imports them at build time. Alternatively, we can duplicate the strings in the server module — prefer whatever avoids cross-boundary imports.

Actually, to keep the module boundary clean: put these in `src/server/services/a2ui/` since the server is the one that builds the prompt. The frontend never needs these strings.

Move to:
- `src/server/services/a2ui/catalog-schema.ts`
- `src/server/services/a2ui/examples.ts`

---

## Task 6: Route + CLI Flag + Wiring

**Files:**
- Create: `src/server/routes/a2ui.ts`
- Modify: `src/cli.ts`
- Modify: `src/server/index.ts`

- [ ] **Step 1: Create A2UI route**

`src/server/routes/a2ui.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { convertToA2UI } from '../services/a2ui/index.js';

export const a2uiRouter = Router();

a2uiRouter.post('/a2ui/render', async (req: Request, res: Response) => {
  const { reviewText, presetId } = req.body;

  if (!reviewText || typeof reviewText !== 'string') {
    res.status(400).json({ error: 'reviewText is required' });
    return;
  }

  try {
    const payload = await convertToA2UI(reviewText, presetId || 'review');
    if (!payload) {
      res.status(422).json({ error: 'Failed to convert to A2UI format' });
      return;
    }
    res.json({ payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 2: Add --a2ui flag to CLI**

In `parseArgs()`, add `a2ui?: boolean` to CLIArgs. Parse `--a2ui` flag. Pass as `&a2ui=true` in URL query.

- [ ] **Step 3: Register route in server index**

- [ ] **Step 4: Commit**

---

## Task 7: Frontend Integration (Context + ExplanationPanel)

**Files:**
- Modify: `src/client/context/ReviewContext.tsx`
- Create: `src/client/components/A2UIView.tsx`
- Modify: `src/client/components/ExplanationPanel.tsx`

- [ ] **Step 1: Add A2UI state to context**

```typescript
a2uiEnabled: boolean;       // read from URL ?a2ui=true
a2uiPayload: object[] | null;
a2uiLoading: boolean;
a2uiError: string | null;
```

Initialize `a2uiEnabled` from `window.location.search`.

After review completes (in `triggerReview`, after `done` event), if `a2uiEnabled`:
1. Set `a2uiLoading = true`
2. POST `/api/a2ui/render` with `{ reviewText: explanationText, presetId: activePresetId }`
3. On success: `setA2uiPayload(data.payload)`
4. On failure: `setA2uiError(message)` — falls back silently

- [ ] **Step 2: Create A2UIView wrapper**

`src/client/components/A2UIView.tsx`:
- Imports `A2UIPanel` from `../a2ui`
- Passes payload + loading + error from context
- Handles `onAction`:
  - `"ask-followup"` → opens chat, pre-fills question
  - `"copy"` → navigator.clipboard
  - `"acknowledge"` → updates local state (not persisted)
  - `"filter"` → local state filter
- Shows toggle: "Interactive ✦" / "Classic" to switch between A2UI and markdown view
- Shows "Experimental" badge

- [ ] **Step 3: Update ExplanationPanel**

If `a2uiEnabled` and (`a2uiPayload` or `a2uiLoading`):
- Render `<A2UIView />` at the top of the content area
- Below it (or toggled): classic preset view as fallback
- If `a2uiError`: show subtle warning "Interactive view unavailable" + classic view

- [ ] **Step 4: Commit**

---

## Task 8: Build & Test

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p tsconfig.server.json
```

- [ ] **Step 2: Vite build**

```bash
npm run build
```

- [ ] **Step 3: Test without flag (no change)**

```bash
code-reviewer https://github.com/org/repo/pull/1
```

- [ ] **Step 4: Test with flag**

```bash
code-reviewer https://github.com/org/repo/pull/1 --a2ui
```

Expected: review streams normally → after completion, loader → Haiku converts → interactive view renders.

- [ ] **Step 5: Final commit**

---

---

## Task 9: Additional Visual/Interactive Components

**Files:**
- Create: `src/client/a2ui/components/DiffSnippet.tsx`
- Create: `src/client/a2ui/components/SeverityGauge.tsx`
- Create: `src/client/a2ui/components/FileHeatmap.tsx`
- Create: `src/client/a2ui/components/BeforeAfterCode.tsx`
- Create: `src/client/a2ui/components/SummaryStatsRow.tsx`
- Create: `src/client/a2ui/components/VoteButtons.tsx`
- Create: `src/client/a2ui/components/CommentDraft.tsx`
- Create: `src/client/a2ui/components/TagPills.tsx`
- Create: `src/client/a2ui/components/ToastFeedback.tsx`
- Modify: `src/client/a2ui/catalog/index.tsx` (register all 9)
- Modify: `src/server/services/a2ui/catalog-schema.ts` (add new component schemas for Haiku)

### Components

| Component | Purpose | Key visual |
|-----------|---------|------------|
| DiffSnippet | Inline 3-7 line code preview with highlighted problem lines | Monospace, line numbers, red highlight |
| SeverityGauge | Circular SVG gauge showing overall review health (0-100) | Colored arc, big center number |
| FileHeatmap | Mini horizontal bar chart of issue density per file | Proportional bars, gradient color |
| BeforeAfterCode | Side-by-side problem vs fix code | Red left, green right, "Copy fix" button |
| SummaryStatsRow | Row of metric cards (findings, files, confidence, etc.) | Dashboard-style stat boxes |
| VoteButtons | Thumbs up/down/N/A for each finding | Compact button group, colored active state |
| CommentDraft | Compose + copy a GitHub PR comment from a finding | Textarea + format + copy workflow |
| TagPills | Clickable category tags (performance, security, style) | Colored pills, multi-select toggle |
| ToastFeedback | Animated notification after actions | Slide-up, auto-dismiss, variant colors |

- [ ] **Step 1: Create all 9 component files**
- [ ] **Step 2: Register in catalog**
- [ ] **Step 3: Update catalog-schema.ts with new component definitions for Haiku**
- [ ] **Step 4: Verify TypeScript + build**
- [ ] **Step 5: Commit**

---

## Completion

The A2UI experimental feature is complete:
- **Modular**: `src/client/a2ui/` and `src/server/services/a2ui/` are self-contained, portable to any React+Express project
- **Zero overhead**: no impact without `--a2ui` flag
- **Interactive**: acknowledge checkboxes, follow-up buttons, copy-to-clipboard, severity filters, progress tracking
- **Resilient**: graceful fallback to classic markdown views on any failure
- **Cheap**: Haiku conversion costs ~$0.001 per review
