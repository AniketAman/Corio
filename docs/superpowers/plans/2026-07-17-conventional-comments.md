# Conventional Comments for Strict Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform strict mode findings into Conventional Comments format when posted as GitHub inline comments.

**Architecture:** Add a utility function that converts a finding's priority + What/Why/Fix fields into Conventional Comments format. Update FindingCard's buildCommentBody to use this formatter for strict-mode findings.

**Tech Stack:** TypeScript, React

## Global Constraints

- No new dependencies
- Maintain backward compatibility with existing UI display
- Edge cases: handle missing Why/Fix fields, preserve code blocks in fixes

---

### Task 1: Create Conventional Comments Formatter

**Files:**
- Create: `src/client/utils/conventionalComments.ts`
- Test: Manual verification via UI (no unit test framework present)

**Interfaces:**
- Consumes: Finding interface shape (what: string, why?: string, fix?: string)
- Produces: `formatConventionalComment(priority: 1 | 2 | 3, finding: { what: string; why?: string; fix?: string }): string`

- [ ] **Step 1: Write the formatter utility**

Create `src/client/utils/conventionalComments.ts`:

```typescript
interface Finding {
  what: string;
  why?: string;
  fix?: string;
}

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
  finding: Finding
): string {
  const label = priorityToLabel(priority);
  
  // Label line: ensure What ends with a period
  const what = finding.what.trim();
  const whatWithPeriod = what.endsWith('.') || what.endsWith('?') || what.endsWith('!')
    ? what
    : `${what}.`;
  
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run build` (or `npm run dev` if running)
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/client/utils/conventionalComments.ts
git commit -m "feat: add conventional comments formatter for strict mode findings"
```

---

### Task 2: Integrate Formatter into FindingCard

**Files:**
- Modify: `src/client/components/review/FindingCard.tsx:38-47` (buildCommentBody function)

**Interfaces:**
- Consumes: `formatConventionalComment` from Task 1
- Produces: Updated buildCommentBody that returns conventional format

- [ ] **Step 1: Import the formatter**

Add to imports in `src/client/components/review/FindingCard.tsx`:

```typescript
import { formatConventionalComment } from '../../utils/conventionalComments';
```

- [ ] **Step 2: Update buildCommentBody function**

Replace the existing `buildCommentBody` function (lines 38-47) with:

```typescript
const buildCommentBody = () => {
  return formatConventionalComment(priority, {
    what: finding.what,
    why: finding.why,
    fix: finding.fix,
  });
};
```

- [ ] **Step 3: Verify the file compiles**

Run: `npm run build` (or check dev server)
Expected: No TypeScript errors

- [ ] **Step 4: Test in UI**

1. Start the app: `npm run dev`
2. Load a PR that has been reviewed with strict mode
3. Expand a finding card
4. Click "Add inline" or "Add as general"
5. Verify the pending comment preview shows conventional format:
   - Priority 1 finding → starts with `issue:`
   - Priority 2/3 finding → starts with `suggestion:`
   - No bold What/Why/Fix labels
   - Body flows as prose (Why + Fix combined)

Expected: Comment body matches the conventional format from the spec

- [ ] **Step 5: Commit**

```bash
git add src/client/components/review/FindingCard.tsx
git commit -m "feat: use conventional comments format for strict mode inline comments"
```

---

### Task 3: Edge Case Testing

**Files:**
- Manual testing verification

**Interfaces:**
- Consumes: All prior tasks
- Produces: Confidence that edge cases are handled

- [ ] **Step 1: Test finding with missing Why field**

1. Find or mock a strict finding that has What and Fix but no Why
2. Add as inline comment
3. Verify body contains only the Fix text (no empty Why sentence)

Expected: `suggestion: What text.\n\nFix text.`

- [ ] **Step 2: Test finding with missing Fix field**

1. Find or mock a strict finding that has What and Why but no Fix
2. Add as inline comment
3. Verify body contains only the Why text

Expected: `suggestion: What text.\n\nWhy text.`

- [ ] **Step 3: Test finding with missing Why and Fix**

1. Find or mock a strict finding that has only What
2. Add as inline comment
3. Verify comment is just the label line (no blank line, no body)

Expected: `suggestion: What text.`

- [ ] **Step 4: Test finding with code block in Fix**

1. Find or mock a strict finding where Fix contains a code block (backticks)
2. Add as inline comment
3. Verify the code block formatting is preserved

Expected: Code block appears correctly in the body

- [ ] **Step 5: Test Priority 1 vs Priority 2/3 labels**

1. Add inline comments from Priority 1, 2, and 3 findings
2. Verify Priority 1 → `issue:` label
3. Verify Priority 2 → `suggestion:` label
4. Verify Priority 3 → `suggestion:` label

Expected: Labels match the spec mapping

- [ ] **Step 6: Verify general comments also use format**

1. Click "Add as general" on a finding
2. Verify the general comment body also uses conventional format

Expected: General comments also formatted conventionally

- [ ] **Step 7: Document testing results**

Create brief testing notes:

```bash
echo "Edge case testing completed:
- Missing Why: handled
- Missing Fix: handled
- Both missing: handled
- Code blocks: preserved
- Priority labels: correct (P1→issue, P2/3→suggestion)
- General comments: formatted" > test-results.txt
```

- [ ] **Step 8: Commit test results**

```bash
git add test-results.txt
git commit -m "test: verify conventional comments edge cases"
```

---

### Task 4: Update Documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-07-17-conventional-comments-design.md` (add implementation notes)

**Interfaces:**
- Consumes: Completed implementation from Tasks 1-3
- Produces: Updated spec with implementation details

- [ ] **Step 1: Add implementation section to spec**

Add at the end of `docs/superpowers/specs/2026-07-17-conventional-comments-design.md`:

```markdown

## Implementation

**Completed:** 2026-07-17

**Files:**
- `src/client/utils/conventionalComments.ts` — Formatter utility
- `src/client/components/review/FindingCard.tsx` — Integration point

**Function:**
```typescript
formatConventionalComment(
  priority: 1 | 2 | 3,
  finding: { what: string; why?: string; fix?: string }
): string
```

**Behavior:**
- Priority 1 → `issue:` label
- Priority 2/3 → `suggestion:` label
- Combines Why and Fix into flowing prose body
- Handles missing Why/Fix gracefully
- Preserves code block formatting

**Testing:**
- Edge cases verified manually via UI
- All priority mappings tested
- Both inline and general comments formatted
```

- [ ] **Step 2: Commit documentation update**

```bash
git add docs/superpowers/specs/2026-07-17-conventional-comments-design.md
git commit -m "docs: add implementation notes to conventional comments spec"
```

---

## Post-Implementation Verification

After all tasks complete:

1. **Clean build:** `npm run build` succeeds with no errors
2. **Load strict review:** Open a PR reviewed with strict preset
3. **Add inline comments:** Verify format matches spec for all priorities
4. **Submit review:** Verify GitHub accepts the formatted comments
5. **Visual check:** Verify comments appear correctly on GitHub PR

## Success Criteria

- [ ] FindingCard generates conventional comments for inline and general comments
- [ ] Priority 1 findings use `issue:` label
- [ ] Priority 2/3 findings use `suggestion:` label
- [ ] No bold headers or field labels in comment body
- [ ] Why and Fix combine into flowing prose
- [ ] Edge cases (missing fields) handled gracefully
- [ ] Code blocks in Fix field preserved
- [ ] UI display unchanged (still shows What/Why/Fix/Confidence in cards)
