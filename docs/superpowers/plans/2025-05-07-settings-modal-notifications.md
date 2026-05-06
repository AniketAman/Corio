# Settings Modal + Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the settings system into a tabbed modal (General/Presets/Notifications) with model selection, default preset config, and review-complete notifications (native + in-app toast), triggered via Cmd+,.

**Architecture:** A `useSettings` hook wraps Tauri's existing `load_config`/`save_config` commands with extended config fields. The settings modal becomes a tabbed dialog reusing the existing preset manager. A global `ToastProvider` context handles in-app notifications, while the Web Notification API handles OS-level alerts fired from ReviewContext on review completion.

**Tech Stack:** React, Tailwind CSS, Tauri IPC (`@tauri-apps/api`), Web Notification API, HTML5 Audio API

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src-tauri/src/commands/config.rs` | Extend `ConfigDefaults` struct with `notifications_enabled` and `notification_sound` fields |
| `src/client/hooks/useTauriApi.ts` | Extend `Config` TypeScript interface to match new Rust struct |
| `src/client/hooks/useSettings.ts` | (New) Hook that loads/saves settings via Tauri config, provides reactive state |
| `src/client/components/ToastProvider.tsx` | (New) Global toast context + fixed bottom-right renderer |
| `src/client/components/SettingsModal.tsx` | Rewrite as tabbed modal (General, Presets, Notifications) |
| `src/client/App.tsx` | Wrap with ToastProvider, hoist settings modal state, add Cmd+, shortcut |
| `src/client/components/PRInput.tsx` | Remove local settings state, accept `onOpenSettings` prop |
| `src/client/context/ReviewContext.tsx` | Use settings for model; fire notification on review complete |
| `src/client/components/ChatPanel.tsx` | Use settings for model |
| `public/sounds/review-complete.mp3` | (New) Short notification sound asset |

---

### Task 1: Extend Backend Config

**Files:**
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src/client/hooks/useTauriApi.ts`

- [ ] **Step 1: Add new fields to Rust ConfigDefaults**

In `src-tauri/src/commands/config.rs`, add `notifications_enabled` and `notification_sound` to `ConfigDefaults`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigDefaults {
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default = "default_preset")]
    pub preset: String,
    #[serde(default = "default_notifications_enabled")]
    pub notifications_enabled: bool,
    #[serde(default = "default_notification_sound")]
    pub notification_sound: bool,
}

fn default_notifications_enabled() -> bool {
    true
}

fn default_notification_sound() -> bool {
    false
}

impl Default for ConfigDefaults {
    fn default() -> Self {
        Self {
            model: default_model(),
            preset: default_preset(),
            notifications_enabled: default_notifications_enabled(),
            notification_sound: default_notification_sound(),
        }
    }
}
```

- [ ] **Step 2: Update TypeScript Config interface**

In `src/client/hooks/useTauriApi.ts`, update the `Config` interface:

```typescript
export interface Config {
  repos: Record<string, string>;
  defaults: {
    model: string;
    preset: string;
    notifications_enabled: boolean;
    notification_sound: boolean;
  };
}
```

- [ ] **Step 3: Verify build**

Run: `cargo build 2>&1 | tail -5` from `src-tauri/`
Expected: Successful build with no errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/config.rs src/client/hooks/useTauriApi.ts
git commit -m "feat: extend config with notification settings"
```

---

### Task 2: Create useSettings Hook

**Files:**
- Create: `src/client/hooks/useSettings.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { tauriApi, Config } from './useTauriApi';

export type ModelId = 'opus' | 'sonnet' | 'haiku';

export interface Settings {
  model: ModelId;
  defaultPresetId: string;
  notificationsEnabled: boolean;
  notificationSound: boolean;
}

const MODEL_TO_FULL: Record<ModelId, string> = {
  opus: 'claude-opus-4-6-20250925',
  sonnet: 'claude-sonnet-4-6-20250514',
  haiku: 'claude-haiku-4-5-20251001',
};

const FULL_TO_MODEL: Record<string, ModelId> = Object.fromEntries(
  Object.entries(MODEL_TO_FULL).map(([k, v]) => [v, k as ModelId])
);

function configToSettings(config: Config): Settings {
  const fullModel = config.defaults.model;
  const model = FULL_TO_MODEL[fullModel] ?? 'opus';
  return {
    model,
    defaultPresetId: config.defaults.preset,
    notificationsEnabled: config.defaults.notifications_enabled,
    notificationSound: config.defaults.notification_sound,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    model: 'opus',
    defaultPresetId: 'review',
    notificationsEnabled: true,
    notificationSound: false,
  });
  const [loading, setLoading] = useState(true);
  const [configRef, setConfigRef] = useState<Config | null>(null);

  useEffect(() => {
    tauriApi.loadConfig().then((config) => {
      setConfigRef(config);
      setSettings(configToSettings(config));
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);

    const config = configRef ?? { repos: {}, defaults: { model: '', preset: '', notifications_enabled: true, notification_sound: false } };
    const updated: Config = {
      ...config,
      defaults: {
        ...config.defaults,
        model: MODEL_TO_FULL[next.model],
        preset: next.defaultPresetId,
        notifications_enabled: next.notificationsEnabled,
        notification_sound: next.notificationSound,
      },
    };
    setConfigRef(updated);
    await tauriApi.saveConfig(updated);
  }, [settings, configRef]);

  return { settings, updateSettings, loading };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/client/hooks/useSettings.ts
git commit -m "feat: add useSettings hook for config read/write"
```

---

### Task 3: Create ToastProvider

**Files:**
- Create: `src/client/components/ToastProvider.tsx`

- [ ] **Step 1: Implement ToastProvider with context and renderer**

```typescript
import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

type ToastVariant = 'success' | 'info' | 'warning';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-success-muted border-success/30 text-success',
  info: 'bg-info-muted border-info/30 text-info',
  warning: 'bg-warning-muted border-warning/30 text-warning',
};

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius)] border text-sm shadow-lg transition-all duration-200 ${VARIANT_STYLES[toast.variant]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span className="text-base leading-none mt-0.5">{ICONS[toast.variant]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px]">{toast.title}</div>
        {toast.description && (
          <div className="text-[11px] opacity-80 mt-0.5">{toast.description}</div>
        )}
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(({ title, description, variant = 'info', duration = 3000 }: {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
  }) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-2), { id, title, description, variant, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[320px]">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/client/components/ToastProvider.tsx
git commit -m "feat: add global ToastProvider for in-app notifications"
```

---

### Task 4: Rewrite SettingsModal as Tabbed Dialog

**Files:**
- Modify: `src/client/components/SettingsModal.tsx`

- [ ] **Step 1: Rewrite SettingsModal with three tabs**

Replace the entire content of `SettingsModal.tsx`:

```typescript
import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { useSettings, ModelId } from '../hooks/useSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from './ui/dialog';
import { PresetManager } from './PresetManager';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'presets' | 'notifications';

const MODELS: { id: ModelId; label: string; subtitle: string }[] = [
  { id: 'opus', label: 'Opus', subtitle: 'Most capable' },
  { id: 'sonnet', label: 'Sonnet', subtitle: 'Balanced' },
  { id: 'haiku', label: 'Haiku', subtitle: 'Fast' },
];

function GeneralTab() {
  const { settings, updateSettings } = useSettings();
  const { presets } = useReview();

  return (
    <div className="space-y-6 p-5">
      <div>
        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-2">
          Review Model
        </label>
        <div className="flex gap-2">
          {MODELS.map(m => (
            <button
              key={m.id}
              onClick={() => updateSettings({ model: m.id })}
              className={`flex-1 py-2.5 px-3 rounded-[var(--radius-sm)] text-center transition-all ${
                settings.model === m.id
                  ? 'border-2 border-accent bg-accent-subtle'
                  : 'border border-border hover:border-border/80'
              }`}
            >
              <div className={`text-[13px] font-semibold ${settings.model === m.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                {m.label}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">{m.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-2">
          Default Preset
        </label>
        <select
          value={settings.defaultPresetId}
          onChange={e => updateSettings({ defaultPresetId: e.target.value })}
          className="w-full h-9 px-3 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-sm focus:outline-none focus:ring-2 focus:ring-accent appearance-none cursor-pointer"
        >
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { settings, updateSettings } = useSettings();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && permissionStatus === 'default') {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      if (result === 'denied') return;
    }
    updateSettings({ notificationsEnabled: enabled });
  };

  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-[var(--radius)]">
        <div>
          <div className="text-[13px] font-medium text-text-primary">Review complete notifications</div>
          <div className="text-[11px] text-text-muted mt-0.5">Get notified when AI review finishes</div>
        </div>
        <button
          onClick={() => handleToggleNotifications(!settings.notificationsEnabled)}
          className={`w-9 h-5 rounded-full relative transition-colors ${
            settings.notificationsEnabled ? 'bg-accent' : 'bg-border'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
            settings.notificationsEnabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-[var(--radius)]">
        <div>
          <div className="text-[13px] font-medium text-text-primary">Notification sound</div>
          <div className="text-[11px] text-text-muted mt-0.5">Play a sound when review completes</div>
        </div>
        <button
          onClick={() => updateSettings({ notificationSound: !settings.notificationSound })}
          className={`w-9 h-5 rounded-full relative transition-colors ${
            settings.notificationSound ? 'bg-accent' : 'bg-border'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
            settings.notificationSound ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {permissionStatus === 'denied' && (
        <div className="p-3 bg-warning-muted rounded-[var(--radius)] text-[12px] text-warning">
          Notifications are blocked. Enable them in your system preferences to receive alerts.
        </div>
      )}
    </div>
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'presets', label: 'Presets' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[520px] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex border-b border-border-subtle px-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-[12px] font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DialogBody className="flex-1 overflow-auto p-0">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'presets' && <PresetManager />}
          {activeTab === 'notifications' && <NotificationsTab />}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify PresetManager exists as a standalone component**

Check that `src/client/components/PresetManager.tsx` exists and is self-contained (it's referenced by the PresetDropdown already). If the preset manager logic is currently only inside SettingsModal, extract it as part of this step.

Run: `ls src/client/components/PresetManager.tsx`

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/client/components/SettingsModal.tsx
git commit -m "feat: rewrite SettingsModal as tabbed dialog (General/Presets/Notifications)"
```

---

### Task 5: Hoist Settings Modal State & Add Cmd+, Shortcut

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/PRInput.tsx`

- [ ] **Step 1: Update App.tsx — wrap with ToastProvider, hoist settings, add shortcut**

```typescript
// In App.tsx, add imports:
import { ToastProvider } from './components/ToastProvider';
import { SettingsModal } from './components/SettingsModal';

// In MainLayout, add state:
const [settingsOpen, setSettingsOpen] = useState(false);

// In the useEffect handleKeyDown, add before the closing of the handler:
if (isMeta && e.key === ',') {
  e.preventDefault();
  setSettingsOpen(true);
}

// Add SettingsModal to the MainLayout JSX (before closing </div> of h-screen):
<SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

// In the App component, wrap with ToastProvider:
export function App() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <TabsProvider>
          <ReviewProvider>
            <MainLayout />
          </ReviewProvider>
        </TabsProvider>
      </TooltipProvider>
    </ToastProvider>
  );
}
```

- [ ] **Step 2: Update PRInput.tsx — remove local settings state, accept callback**

Remove:
- `const [settingsOpen, setSettingsOpen] = useState(false);`
- The `<SettingsModal>` render at the bottom
- The `useState` import if no longer needed (keep `useEffect`, `useRef`)

Add prop `onOpenSettings: () => void` to PRInput and wire the gear button to it.

In `PRInput.tsx`:
```typescript
interface PRInputProps {
  onOpenSettings: () => void;
}

export function PRInput({ onOpenSettings }: PRInputProps) {
  // ... remove settingsOpen state and SettingsModal render
  // Change onClick of settings button to: onClick={onOpenSettings}
}
```

In `MainLayout`, pass the prop where PRInput is used (check if it's rendered inside EmptyTab or directly — it may be in EmptyTab). If PRInput isn't rendered directly in MainLayout, pass via the same mechanism EmptyTab uses, or lift it from wherever PRInput is currently rendered.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/client/App.tsx src/client/components/PRInput.tsx
git commit -m "feat: hoist settings modal to App, add Cmd+, shortcut"
```

---

### Task 6: Wire Model Setting into ReviewContext and ChatPanel

**Files:**
- Modify: `src/client/context/ReviewContext.tsx`
- Modify: `src/client/components/ChatPanel.tsx`

- [ ] **Step 1: Update ReviewContext to use settings model**

In `ReviewContext.tsx`, import and use the settings hook:

```typescript
import { useSettings } from '../hooks/useSettings';

// Inside ReviewProvider:
const { settings } = useSettings();

// In triggerReview, replace:
//   const model = 'opus';
// With:
const model = settings.model;
```

- [ ] **Step 2: Update ChatPanel to use settings model**

In `ChatPanel.tsx`, around line 83, replace the hardcoded `'opus'`:

```typescript
import { useSettings } from '../hooks/useSettings';

// Inside the component:
const { settings } = useSettings();

// Replace:
//   await tauriApi.sendChatMessage(tabId, question, activeSessionId, 'opus', null);
// With:
await tauriApi.sendChatMessage(tabId, question, activeSessionId, settings.model, null);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/client/context/ReviewContext.tsx src/client/components/ChatPanel.tsx
git commit -m "feat: use settings model in review and chat instead of hardcoded opus"
```

---

### Task 7: Fire Notifications on Review Complete

**Files:**
- Modify: `src/client/context/ReviewContext.tsx`

- [ ] **Step 1: Add notification logic after review completes**

In `ReviewContext.tsx`, import the toast hook and settings:

```typescript
import { useToast } from '../components/ToastProvider';
```

Inside `ReviewProvider`:
```typescript
const { toast } = useToast();
```

After step 11 (auto-trigger A2UI), before the `catch` block, add notification firing:

```typescript
// 12. Notify review complete
if (settings.notificationsEnabled) {
  const prTitle = pr.title;
  if (document.hasFocus()) {
    toast({ title: 'Review complete', description: prTitle, variant: 'success' });
  } else {
    if (Notification.permission === 'granted') {
      new Notification('Review Complete', { body: prTitle });
    }
  }
  if (settings.notificationSound) {
    new Audio('/sounds/review-complete.mp3').play().catch(() => {});
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/client/context/ReviewContext.tsx
git commit -m "feat: fire native + toast notifications on review complete"
```

---

### Task 8: Add Notification Sound Asset

**Files:**
- Create: `public/sounds/review-complete.mp3`

- [ ] **Step 1: Create a placeholder sound file**

Generate a minimal valid MP3 file (or source a short royalty-free notification chime). For development purposes, create the directory and add a note:

```bash
mkdir -p public/sounds
```

Use a short, subtle notification chime (~0.5s). Source options:
- Generate with `ffmpeg`: `ffmpeg -f lavfi -i "sine=frequency=880:duration=0.3" -af "afade=t=out:st=0.1:d=0.2" public/sounds/review-complete.mp3`
- Or source a CC0 notification sound

- [ ] **Step 2: Verify the file is accessible**

Run: `ls -la public/sounds/review-complete.mp3`
Expected: File exists with non-zero size

- [ ] **Step 3: Commit**

```bash
git add public/sounds/
git commit -m "feat: add review-complete notification sound"
```

---

### Task 9: Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev` (or `pnpm dev` / `cargo tauri dev`)

Manual verification checklist:
1. `Cmd+,` opens settings modal
2. Settings modal shows three tabs: General, Presets, Notifications
3. Model cards are clickable, selection persists after closing/reopening modal
4. Default preset dropdown shows all presets
5. Notification toggles work (switch animation)
6. Closing modal via ×, Escape, and backdrop all work
7. Settings gear in PRInput still opens the same modal
8. Run a review — verify model from settings is used (check network/console)
9. Review complete fires a toast when app is focused
10. Notification permission prompt appears on first enable (if not already granted)

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: integration fixes for settings and notifications"
```
