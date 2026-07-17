# Conventional Comments for Strict Mode Inline Comments

**Date:** 2026-07-17  
**Status:** Approved

## Problem

Strict mode generates findings with structured labels (What/Why/Fix/Confidence). When these become GitHub inline comments, they retain all the bold headers and labeled structure, making them verbose and inconsistent with community conventions.

Users expect inline comments to follow the Conventional Comments standard with clean labels like `issue:`, `suggestion:`, `nitpick:`.

## Solution

Transform strict mode findings into Conventional Comments format when posting to GitHub as inline comments.

## Priority to Label Mapping

| Priority Level | Finding Category | Conventional Comment Label |
|---------------|------------------|---------------------------|
| Priority 1 | Correctness & Performance | `issue:` |
| Priority 2 | Duplication & Conventions | `suggestion:` |
| Priority 3 | Test Coverage | `suggestion:` |

## Format Transformation

### Before (current inline comment)
```markdown
#### path/to/file.ext:123
- What: Variable may be null at this point
- Why: Upstream call can return null on cache miss
- Fix: Add null check before accessing properties
- Confidence: 85
```

### After (conventional comment)
```
suggestion: Variable may be null at this point.

The upstream call can return null when the cache misses. Add a null check before accessing properties.
```

## Construction Rules

1. **Label line:** `{label}: {what-sentence}`
   - Priority 1 → `issue:`
   - Priority 2 → `suggestion:`
   - Priority 3 → `suggestion:`

2. **Blank line separator**

3. **Body paragraph:**
   - Combine Why and Fix into 2-3 sentences of flowing prose
   - First sentence: why it matters (context/consequence)
   - Second sentence: what to do (the fix)
   - No bold formatting, no field labels, no confidence scores

## Examples

### Priority 1 (Correctness)
```
issue: Potential null pointer dereference at line 123.

The cache lookup can return null when the key is missing. Check for null before calling .getValue().
```

### Priority 2 (Code Quality)
```
suggestion: Duplicated validation logic across auth.rs and session.rs.

Extract to a shared validate_token() function to keep the checks consistent.
```

### Priority 3 (Test Coverage)
```
suggestion: Missing test coverage for the error path.

Add a test case that exercises the timeout scenario to verify the fallback works correctly.
```

## What Doesn't Change

**UI Display:**
- FindingCard component continues showing structured What/Why/Fix/Confidence layout
- This transformation only applies to GitHub inline comments

**LLM Prompt:**
- STRICT_TEMPLATE continues instructing the model to output structured format
- Parser logic in StrictReviewView.tsx remains unchanged

**Internal Representation:**
- ParsedFinding interface keeps all fields (what/why/fix/confidence)

## Implementation Scope

**What changes:**
- Frontend logic for generating inline comment body text
- Occurs when user clicks "Add inline comment" on a finding card

**Location:**
- Component that handles inline comment creation (likely in ReviewContext or a comment utility)
- Transform happens client-side before passing to the GitHub API

## Edge Cases

**Missing Why or Fix:**
- If Why is missing: just use What as the body
- If Fix is missing: body contains only the Why
- If both missing: body is empty (just the label line)

**Multi-line fixes (code snippets):**
- Preserve code block formatting in the body:
```
suggestion: Missing input validation.

User input flows directly to the query builder. Sanitize with:
\`\`\`rust
let safe_input = sanitize_sql(&user_input);
\`\`\`
```

**Confidence scores:**
- Not included in inline comments
- Still visible in the UI's FindingCard component

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
