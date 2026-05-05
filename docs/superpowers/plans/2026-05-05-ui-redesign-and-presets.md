# UI Redesign & Preset System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the code reviewer UI with Linear-inspired aesthetics (shadcn/ui + Tailwind, purple accent) and add a 4-preset system with rich components for the Strict preset.

**Architecture:** Replace all inline styles with Tailwind utility classes. Add shadcn/ui components (dropdown, dialog, collapsible, badge). Hardcode 4 built-in presets in source; custom presets persist to ~/.code-reviewer/settings.json. Parse Strict preset output into rich React components (VerdictBanner, FindingCard, ConfidenceBar).

**Tech Stack:** Tailwind CSS 4, shadcn/ui, Radix UI primitives, PostCSS

---

## File Structure

### New Files
- `tailwind.config.ts` — custom theme (purple accent, Linear grays, glass-morphism)
- `postcss.config.js` — PostCSS config for Tailwind
- `src/client/styles/globals.css` — Tailwind directives + custom CSS variables
- `src/client/lib/utils.ts` — cn() utility for conditional classnames
- `src/client/components/ui/button.tsx` — shadcn button
- `src/client/components/ui/dropdown-menu.tsx` — shadcn dropdown (preset picker)
- `src/client/components/ui/dialog.tsx` — shadcn dialog (settings modal)
- `src/client/components/ui/badge.tsx` — shadcn badge (severity, status)
- `src/client/components/ui/collapsible.tsx` — shadcn collapsible (chat, findings)
- `src/client/components/ui/scroll-area.tsx` — shadcn scroll area
- `src/client/components/ui/tooltip.tsx` — shadcn tooltip
- `src/client/components/ui/textarea.tsx` — shadcn textarea
- `src/client/components/review/VerdictBanner.tsx` — merge verdict display
- `src/client/components/review/FindingCard.tsx` — individual finding with severity
- `src/client/components/review/ConfidenceBar.tsx` — confidence score visual
- `src/client/components/review/StrictReviewView.tsx` — structured strict output
- `src/client/components/PresetDropdown.tsx` — preset picker in top bar
- `src/server/services/presets.ts` — preset definitions and management
- `src/server/routes/presets.ts` — GET/POST/DELETE /api/presets

### Modified Files
- `package.json` — add tailwindcss, postcss, autoprefixer, @radix-ui/*, class-variance-authority, clsx, tailwind-merge
- `vite.config.ts` — add postcss config path
- `src/client/App.tsx` — replace inline styles with Tailwind classes
- `src/client/components/PRInput.tsx` — add preset dropdown, Tailwind styles
- `src/client/components/FileTree.tsx` — Tailwind styles
- `src/client/components/DiffViewer.tsx` — Tailwind styles
- `src/client/components/ExplanationPanel.tsx` — collapsible chat, generating indicator, auto-scroll, conditional strict view
- `src/client/components/ChatPanel.tsx` — Tailwind styles, collapsible
- `src/client/components/StatusBar.tsx` — Tailwind styles
- `src/client/components/ResizablePanel.tsx` — Tailwind styles
- `src/client/components/SettingsModal.tsx` — convert to shadcn dialog, custom preset CRUD
- `src/client/context/ReviewContext.tsx` — add activePreset, clearChatOnReview, preset state
- `src/client/main.tsx` — import globals.css
- `src/server/index.ts` — add presets router
- `src/server/services/claude.ts` — use preset system for prompt, accept presetId
- `src/server/services/settings.ts` — store custom presets array
- `src/server/routes/review.ts` — accept presetId param
- `src/cli.ts` — add pre-flight checks, child process tracking

### Deleted Files
- `src/client/styles/app.css` — replaced by globals.css

---

## Task 1: Install Dependencies & Configure Tailwind

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/client/styles/globals.css`
- Create: `src/client/lib/utils.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install Tailwind and UI dependencies**

```bash
npm install tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-collapsible @radix-ui/react-tooltip @radix-ui/react-scroll-area @radix-ui/react-slot
```

- [ ] **Step 2: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        surface: '#141416',
        'surface-elevated': '#1c1c1f',
        'surface-hover': '#232328',
        border: '#27272a',
        'border-subtle': '#1f1f23',
        'text-primary': '#fafafa',
        'text-secondary': '#a1a1aa',
        'text-muted': '#71717a',
        accent: {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
          muted: '#8b5cf620',
          subtle: '#8b5cf610',
        },
        success: { DEFAULT: '#10b981', muted: '#10b98120' },
        danger: { DEFAULT: '#ef4444', muted: '#ef444420' },
        warning: { DEFAULT: '#f59e0b', muted: '#f59e0b20' },
        info: { DEFAULT: '#6366f1', muted: '#6366f120' },
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0, 0, 0, 0.1)',
        elevated: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  body {
    @apply bg-background text-text-primary font-sans antialiased overflow-hidden;
    margin: 0;
    padding: 0;
  }
  #root {
    @apply h-screen flex flex-col;
  }
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-border rounded-full;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-text-muted;
  }
}

@layer components {
  .glass {
    @apply bg-surface-elevated/80 backdrop-blur-glass border border-border shadow-glass;
  }
  .glass-hover {
    @apply hover:bg-surface-hover/80 transition-colors duration-150;
  }
}
```

- [ ] **Step 5: Create utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tailwind.config.ts postcss.config.js src/client/styles/globals.css src/client/lib/utils.ts vite.config.ts
git commit -m "feat: configure Tailwind CSS with Linear-inspired purple theme"
```

---

## Task 2: shadcn/ui Base Components

**Files:**
- Create: `src/client/components/ui/button.tsx`
- Create: `src/client/components/ui/badge.tsx`
- Create: `src/client/components/ui/dropdown-menu.tsx`
- Create: `src/client/components/ui/dialog.tsx`
- Create: `src/client/components/ui/collapsible.tsx`
- Create: `src/client/components/ui/scroll-area.tsx`
- Create: `src/client/components/ui/tooltip.tsx`
- Create: `src/client/components/ui/textarea.tsx`

- [ ] **Step 1: Create button component**

```tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover',
        secondary: 'bg-surface-elevated text-text-secondary border border-border hover:bg-surface-hover hover:text-text-primary',
        ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        danger: 'bg-danger text-white hover:bg-danger/90',
        success: 'bg-success text-white hover:bg-success/90',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
```

- [ ] **Step 2: Create badge component**

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent-muted text-accent border border-accent/30',
        success: 'bg-success-muted text-success border border-success/30',
        danger: 'bg-danger-muted text-danger border border-danger/30',
        warning: 'bg-warning-muted text-warning border border-warning/30',
        info: 'bg-info-muted text-info border border-info/30',
        outline: 'text-text-secondary border border-border',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

- [ ] **Step 3: Create remaining UI components (dropdown-menu, dialog, collapsible, scroll-area, tooltip, textarea)**

These follow standard shadcn/ui patterns wrapping Radix primitives with Tailwind classes using the custom theme colors. Each file exports the component parts (e.g., DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem).

- [ ] **Step 4: Commit**

```bash
git add src/client/components/ui/
git commit -m "feat: add shadcn/ui base components with purple theme"
```

---

## Task 3: Preset System (Backend)

**Files:**
- Create: `src/server/services/presets.ts`
- Create: `src/server/routes/presets.ts`
- Modify: `src/server/services/claude.ts`
- Modify: `src/server/services/settings.ts`
- Modify: `src/server/routes/review.ts`
- Modify: `src/server/index.ts`

- [ ] **Step 1: Create presets service with 4 built-in presets**

`src/server/services/presets.ts` defines:
- `Preset` interface: `{ id: string, name: string, description: string, template: string, builtIn: boolean, parseFileMarkers: boolean }`
- `REVIEW_PRESET`, `EXPLAIN_PRESET`, `SECURITY_PRESET`, `STRICT_PRESET` constants
- `getBuiltInPresets()` — returns the 4 hardcoded presets
- `getCustomPresets()` — loads from settings file
- `getAllPresets()` — built-in + custom
- `getPresetById(id)` — lookup
- `saveCustomPreset(preset)` — persists to settings
- `deleteCustomPreset(id)` — removes from settings

- [ ] **Step 2: Define the 4 preset templates**

Review preset: current `DEFAULT_PROMPT_TEMPLATE` from claude.ts
Explain preset: focused on teaching — why approach was chosen, key abstractions, system fit
Security preset: OWASP-focused — injection, auth, secrets, no stylistic issues
Strict preset: priority-ordered with confidence scoring, mandatory checks, merge verdict (adapted from chirag-pr-review skill)

- [ ] **Step 3: Create presets route**

`src/server/routes/presets.ts`:
- `GET /api/presets` — returns all presets (built-in + custom)
- `POST /api/presets` — create custom preset
- `PUT /api/presets/:id` — update custom preset (rejects built-in IDs)
- `DELETE /api/presets/:id` — delete custom preset (rejects built-in IDs)

- [ ] **Step 4: Update claude.ts to accept presetId**

Replace `getPromptTemplate()` with `getPromptForPreset(presetId)`. The `buildReviewPrompt` function looks up the preset and uses its template.

- [ ] **Step 5: Update review route to accept presetId**

`req.body` now includes `presetId`. Passed to `streamReviewExplanation`.

- [ ] **Step 6: Register presets router in index.ts**

- [ ] **Step 7: Update settings.ts**

Store `customPresets: Preset[]` in the settings file instead of `promptTemplate`.

- [ ] **Step 8: Commit**

```bash
git add src/server/services/presets.ts src/server/routes/presets.ts src/server/services/claude.ts src/server/services/settings.ts src/server/routes/review.ts src/server/index.ts
git commit -m "feat: add preset system with 4 built-in presets"
```

---

## Task 4: Preset Dropdown & Updated Top Bar (Frontend)

**Files:**
- Create: `src/client/components/PresetDropdown.tsx`
- Modify: `src/client/components/PRInput.tsx`
- Modify: `src/client/context/ReviewContext.tsx`

- [ ] **Step 1: Add preset state to ReviewContext**

Add `activePresetId`, `setActivePresetId`, `presets` (fetched from API on mount), `clearChat()`.

- [ ] **Step 2: Create PresetDropdown component**

Uses shadcn DropdownMenu. Shows preset name + description. Purple dot for active. Divider between built-in and custom. "Manage presets..." link opens settings.

- [ ] **Step 3: Update PRInput with Tailwind + preset dropdown**

Replace inline styles. Layout: `[PresetDropdown] [input field] [Review button] [Settings gear]`. Tailwind classes for Linear look.

- [ ] **Step 4: Clear chat on new review**

In `triggerReview`, reset `chatHistory` to empty array.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/PresetDropdown.tsx src/client/components/PRInput.tsx src/client/context/ReviewContext.tsx
git commit -m "feat: add preset dropdown in top bar"
```

---

## Task 5: Restyle All Components with Tailwind

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/FileTree.tsx`
- Modify: `src/client/components/DiffViewer.tsx`
- Modify: `src/client/components/ExplanationPanel.tsx`
- Modify: `src/client/components/ChatPanel.tsx`
- Modify: `src/client/components/StatusBar.tsx`
- Modify: `src/client/components/ResizablePanel.tsx`
- Modify: `src/client/main.tsx`
- Delete: `src/client/styles/app.css`

- [ ] **Step 1: Update main.tsx to import globals.css**

- [ ] **Step 2: Restyle App.tsx**

Replace inline styles with Tailwind. Use `bg-background`, proper borders with `border-border`.

- [ ] **Step 3: Restyle FileTree**

Glass-morphism on hover, purple accent for selected file, `font-mono text-xs` for file names, green/red badges for +/-.

- [ ] **Step 4: Restyle DiffViewer**

Minimal changes — Monaco handles its own styling. Wrap in proper container with border.

- [ ] **Step 5: Restyle ResizablePanel**

Replace inline styles. Accent color on drag handle hover. Smooth transitions on collapse.

- [ ] **Step 6: Restyle StatusBar**

Bottom bar with `glass` class, badges for mode/stats.

- [ ] **Step 7: Restyle ChatPanel**

Collapsible via Radix Collapsible. Hidden by default, toggle button to reveal. Messages use `glass` cards. Streaming indicator with pulsing dot.

- [ ] **Step 8: Restyle ExplanationPanel**

Add "generating..." pulsing indicator. Auto-scroll to file section on selectedFile change (useEffect + scrollIntoView). Chat as collapsible at bottom.

- [ ] **Step 9: Delete app.css, commit**

```bash
git rm src/client/styles/app.css
git add src/client/
git commit -m "feat: restyle all components with Tailwind and Linear theme"
```

---

## Task 6: Rich Components for Strict Preset

**Files:**
- Create: `src/client/components/review/VerdictBanner.tsx`
- Create: `src/client/components/review/FindingCard.tsx`
- Create: `src/client/components/review/ConfidenceBar.tsx`
- Create: `src/client/components/review/StrictReviewView.tsx`
- Modify: `src/client/components/ExplanationPanel.tsx`

- [ ] **Step 1: Create VerdictBanner**

Parses `**Ready to merge:** Yes|With fixes|No` from the explanation. Renders a banner: green for Yes, amber for With fixes, red for No. Bold verdict text with reasoning below.

- [ ] **Step 2: Create ConfidenceBar**

Takes a 0-100 score. Renders a horizontal bar with color gradient (red < 50, amber 50-79, green 80+). Number label.

- [ ] **Step 3: Create FindingCard**

Parses a finding block. Shows: file:line as a clickable link (triggers setSelectedFile), severity badge, confidence bar, description, and fix suggestion in a collapsible section.

- [ ] **Step 4: Create StrictReviewView**

Parses the full Strict preset output. Extracts: verdict, priority groups, mandatory checks, findings. Renders using VerdictBanner at top, then grouped FindingCards, then mandatory checks as a checklist.

- [ ] **Step 5: Update ExplanationPanel**

Detect if active preset is 'strict'. If so, render StrictReviewView instead of markdown. Otherwise render markdown (with per-file splitting for review/explain presets).

- [ ] **Step 6: Commit**

```bash
git add src/client/components/review/ src/client/components/ExplanationPanel.tsx
git commit -m "feat: add rich components for strict preset output"
```

---

## Task 7: Settings Modal for Custom Presets

**Files:**
- Modify: `src/client/components/SettingsModal.tsx`

- [ ] **Step 1: Rewrite SettingsModal with shadcn Dialog**

Use Dialog component. Content: list of custom presets with edit/delete. "New Preset" button. Edit form: name, description, template textarea with variable reference. Save/cancel buttons.

- [ ] **Step 2: Remove old prompt template logic**

No more single-template editing. The modal is purely for custom preset CRUD.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/SettingsModal.tsx
git commit -m "feat: rework settings modal for custom preset management"
```

---

## Task 8: CLI Pre-flight Checks & Process Tracking

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/server/services/claude.ts`

- [ ] **Step 1: Add pre-flight checks**

Before starting server, run `gh auth status` and `claude --version` via execFile. If either fails, print clear error and exit(1).

- [ ] **Step 2: Add child process tracking**

In `claude.ts`, maintain a `Set<ChildProcess>`. Add spawned processes, remove on close. Export `killAllChildren()`.

- [ ] **Step 3: Update CLI shutdown handler**

Import and call `killAllChildren()` on SIGINT/SIGTERM before closing server.

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts src/server/services/claude.ts
git commit -m "feat: add pre-flight checks and child process cleanup"
```

---

## Task 9: Final Integration & Cleanup

**Files:**
- Delete: `src/server/routes/settings.ts` (replaced by presets route)
- Modify: `src/server/index.ts` (remove settings router)

- [ ] **Step 1: Remove old settings route**

- [ ] **Step 2: Verify all imports resolve**

- [ ] **Step 3: Test build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old settings route, final cleanup"
```

---

## Completion

All tasks completed. The code reviewer now has:
- Linear-inspired UI with purple accent, glass-morphism, Tailwind + shadcn/ui
- 4 hardcoded presets (Review, Explain, Security, Strict) with dropdown switching
- Custom preset creation/editing via settings modal
- Rich components for Strict preset (VerdictBanner, FindingCard, ConfidenceBar)
- Collapsible chat panel (hidden by default)
- Streaming indicator during generation
- Auto-scroll explanation on file selection
- Pre-flight checks for gh/claude on startup
- Child process tracking and cleanup on shutdown
- Chat cleared on re-review
