# Rich Preset Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom rich UI views for Review, Explain, and Security presets (matching the existing Strict preset pattern) that parse structured markdown output into interactive React components.

**Architecture:** Each preset gets a dedicated `*View.tsx` component in `src/client/components/review/`. Each view parses the preset's structured markdown output into typed data structures, then renders using shared UI primitives (Badge, Button, collapsible sections) plus preset-specific components. The ExplanationPanel conditionally renders the appropriate view based on `activePresetId`.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing shadcn/ui primitives

---

## File Structure

### New Files
- `src/client/components/review/ReviewPresetView.tsx` — rich view for the Review preset
- `src/client/components/review/ExplainPresetView.tsx` — rich view for the Explain preset
- `src/client/components/review/SecurityPresetView.tsx` — rich view for the Security preset
- `src/client/components/review/FileCard.tsx` — shared collapsible per-file explanation card
- `src/client/components/review/IssuePill.tsx` — inline issue severity indicator
- `src/client/components/review/TakeawayCard.tsx` — key takeaway highlight card
- `src/client/components/review/SecurityFindingCard.tsx` — security finding with severity + attack scenario
- `src/client/components/review/SeverityBanner.tsx` — top-level security posture summary

### Modified Files
- `src/client/components/ExplanationPanel.tsx` — route each preset to its rich view

---

## Component Specifications

### Review Preset View

**Parses output format:**
```
### Overall Summary
[2-4 paragraphs]

### FILE: path/to/file.ext
[explanation per file]

### Potential Issues
[cross-cutting concerns]
```

**Components:**

1. **Summary section** — rendered as prose markdown at the top, with a subtle top border accent
2. **Issue summary bar** — counts issues mentioned in "Potential Issues" section, shows as clickable badges: "N suggestions", "N concerns". Parsing: split by bullet points, categorize by keywords
3. **FileCard** (per file) — collapsible card with:
   - File path as header (monospace, accent color)
   - +/- badge from prData
   - Explanation rendered as markdown inside
   - Collapsed by default when more than 5 files; first 3 expanded
4. **Potential Issues section** — each bullet rendered as an IssuePill card with:
   - Auto-classified severity based on language ("bug", "error", "crash" → danger; "consider", "suggest", "could" → info; "edge case", "missing" → warning)
   - file:line link if present (clickable → sets selectedFile)

### Explain Preset View

**Parses output format:**
```
### Overall Summary
[problem, approach, architecture, abstractions]

### FILE: path/to/file.ext
[role of file, concepts, relationships]

### Key Takeaways
[bullet points of key concepts]
```

**Components:**

1. **Summary section** — rendered with slightly larger text, teaching-focused styling
2. **FileCard** (per file) — same shared component as Review, but with a "concepts" icon instead of a code icon
3. **TakeawayCard** — sticky/prominent section:
   - Each takeaway bullet rendered as a card with a lightbulb-style icon
   - Purple accent left border
   - Slightly elevated background
   - If a takeaway mentions a file path, make it a link that selects that file

### Security Preset View

**Parses output format:**
```
### Security Summary
[1-2 paragraphs about overall posture]

#### [SEVERITY: Critical|High|Medium|Low] — Title
- **Location:** file:line
- **Description:** What the vulnerability is
- **Attack scenario:** How an attacker could exploit this
- **Recommendation:** Specific fix
```

**Components:**

1. **SeverityBanner** — top-level summary bar:
   - Shows count by severity: "1 Critical, 2 High, 1 Medium" as colored badges
   - If no findings: green banner "No security issues found"
   - Color coding: Critical=red, High=orange/danger, Medium=warning, Low=info
2. **Security Summary** — rendered as prose below the banner
3. **SecurityFindingCard** — per finding:
   - Severity badge (colored: Critical red, High orange, Medium amber, Low blue)
   - Title as header
   - Location as clickable file:line link → sets selectedFile
   - Description as main body text
   - "Attack Scenario" collapsible section with a warning-styled background (shows HOW it's exploited)
   - "Recommendation" section with a success-styled background (shows the fix)

---

## Task 1: Shared Components (FileCard, IssuePill)

**Files:**
- Create: `src/client/components/review/FileCard.tsx`
- Create: `src/client/components/review/IssuePill.tsx`

- [ ] **Step 1: Create FileCard component**

A collapsible card showing a file's explanation:
```tsx
interface FileCardProps {
  filePath: string;
  additions?: number;
  deletions?: number;
  children: ReactNode; // markdown content rendered by parent
  defaultOpen?: boolean;
}
```

Uses Radix Collapsible. Header shows file name (bold) + directory path (muted), +/- badges. Chevron rotates on expand. Purple left border when expanded.

- [ ] **Step 2: Create IssuePill component**

An inline issue indicator that auto-classifies severity:
```tsx
interface IssuePillProps {
  text: string; // the raw issue text
  fileLine?: string; // extracted file:line if present
}
```

Auto-classify by scanning text for keywords:
- danger: "bug", "error", "crash", "fail", "break", "incorrect", "wrong"
- warning: "edge case", "missing", "undefined", "null", "race condition"
- info: "consider", "suggest", "could", "might", "improve", "minor"

Render as a card with severity badge + text + optional file:line link.

- [ ] **Step 3: Commit**

---

## Task 2: ReviewPresetView

**Files:**
- Create: `src/client/components/review/ReviewPresetView.tsx`

- [ ] **Step 1: Implement parser**

Parse the Review preset output:
- Extract overall summary (before first ### FILE:)
- Extract per-file sections (### FILE: markers)
- Extract potential issues section (### Potential Issues)
- For potential issues: split by bullets (- or *), extract file:line refs

- [ ] **Step 2: Implement view component**

```tsx
interface ReviewPresetViewProps {
  explanation: string;
  fileExplanations: Record<string, string>;
  selectedFile: string | null;
}
```

Layout:
1. Issue summary bar at top (badges showing issue counts by severity)
2. Overall summary as prose
3. Per-file FileCards (if a file is selected, that card is expanded and scrolled to)
4. Potential Issues section with IssuePill cards

Falls back to raw markdown if parsing fails.

- [ ] **Step 3: Commit**

---

## Task 3: ExplainPresetView + TakeawayCard

**Files:**
- Create: `src/client/components/review/TakeawayCard.tsx`
- Create: `src/client/components/review/ExplainPresetView.tsx`

- [ ] **Step 1: Create TakeawayCard**

```tsx
interface TakeawayCardProps {
  text: string;
  filePath?: string; // if the takeaway mentions a file
}
```

Renders as a card with:
- Lightbulb icon (or ★) on the left
- Purple accent left border
- Text rendered as markdown
- If filePath present, render as clickable link

- [ ] **Step 2: Implement ExplainPresetView parser**

Parse the Explain preset output:
- Overall summary (before first ### FILE:)
- Per-file sections (### FILE: markers)
- Key Takeaways section (### Key Takeaways) — split by bullets

- [ ] **Step 3: Implement ExplainPresetView component**

```tsx
interface ExplainPresetViewProps {
  explanation: string;
  fileExplanations: Record<string, string>;
  selectedFile: string | null;
}
```

Layout:
1. Key Takeaways pinned at top as TakeawayCards (visually prominent)
2. Overall summary as teaching-focused prose
3. Per-file FileCards

Falls back to raw markdown if parsing fails.

- [ ] **Step 4: Commit**

---

## Task 4: SecurityPresetView + SecurityFindingCard + SeverityBanner

**Files:**
- Create: `src/client/components/review/SeverityBanner.tsx`
- Create: `src/client/components/review/SecurityFindingCard.tsx`
- Create: `src/client/components/review/SecurityPresetView.tsx`

- [ ] **Step 1: Create SeverityBanner**

```tsx
interface SeverityBannerProps {
  counts: { critical: number; high: number; medium: number; low: number };
}
```

If all zero: green banner "No security issues found — [list of checks performed]"
Otherwise: colored badges for each non-zero severity count.

- [ ] **Step 2: Create SecurityFindingCard**

```tsx
interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  location?: string; // file:line
  description: string;
  attackScenario?: string;
  recommendation?: string;
}
```

Renders:
- Severity badge (colored)
- Title
- Location as clickable file:line link
- Description text
- Collapsible "Attack Scenario" (warning background)
- Collapsible "Recommendation" (success background)

- [ ] **Step 3: Implement SecurityPresetView parser**

Parse the Security preset output:
- Security Summary section
- Individual findings: split by `#### [SEVERITY: X] — Title` headers
- For each finding: extract Location, Description, Attack scenario, Recommendation

- [ ] **Step 4: Implement SecurityPresetView component**

```tsx
interface SecurityPresetViewProps {
  explanation: string;
}
```

Layout:
1. SeverityBanner at top
2. Security Summary as prose
3. SecurityFindingCards grouped by severity (Critical first, then High, Medium, Low)

Falls back to raw markdown if parsing fails.

- [ ] **Step 5: Commit**

---

## Task 5: Wire up ExplanationPanel

**Files:**
- Modify: `src/client/components/ExplanationPanel.tsx`

- [ ] **Step 1: Import all preset views**

- [ ] **Step 2: Route by activePresetId**

Replace the current conditional rendering:
- `strict` → StrictReviewView (existing)
- `review` → ReviewPresetView
- `explain` → ExplainPresetView
- `security` → SecurityPresetView
- Custom presets or fallback → raw markdown with per-file splitting

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit -p tsconfig.json && npx vite build --config vite.config.ts
```

- [ ] **Step 4: Commit**

---

## Completion

All presets now have dedicated rich UI views:
- **Review**: Issue summary bar + FileCards + IssuePills
- **Explain**: Key Takeaway cards + teaching prose + FileCards
- **Security**: SeverityBanner + SecurityFindingCards with attack scenarios
- **Strict**: VerdictBanner + prioritized FindingCards + ConfidenceBars (existing)
