# Settings Modal + Notifications

## Overview

Expand the settings modal into a tabbed dialog (General, Presets, Notifications) invoked via `Cmd+,`. Add a notification system that alerts users when AI review completes — OS-level native notifications when unfocused, in-app toasts when focused.

## Settings Modal

### Trigger

- Global keyboard shortcut `Cmd+,` (macOS) / `Ctrl+,` (Windows/Linux)
- Added to existing shortcut listener in `App.tsx`
- Existing settings gear button in PRInput also opens the modal

### Tab Structure

**General tab:**
- Review Model — card-based selector with three options:
  - Opus ("Most capable")
  - Sonnet ("Balanced")
  - Haiku ("Fast")
- Default Preset — dropdown populated from all available presets (built-in + custom)
- Active selection persisted immediately on click

**Presets tab:**
- Existing PresetManager component moved here (create/edit/delete custom presets)
- No functional changes, just re-housed under a tab

**Notifications tab:**
- "Review complete notifications" — master toggle (enables/disables both native + toast)
- "Notification sound" — secondary toggle (plays audio on completion)
- Permission status indicator: if browser notification permission is denied, show inline note with instructions

### Modal Dimensions

- Width: 520px, max-height: 70vh
- Centered overlay with backdrop
- Close via × button, Escape key, or clicking backdrop

## Model Selection

### Available Models

| ID | Label | Subtitle |
|----|-------|----------|
| `opus` | Opus | Most capable |
| `sonnet` | Sonnet | Balanced |
| `haiku` | Haiku | Fast |

### Integration

- `useSettings()` hook provides `model` value
- `ReviewContext.triggerReview()` reads model from settings instead of hardcoded `"opus"`
- `ChatPanel` reads model from settings instead of hardcoded `"opus"`
- Backend `config.rs` already translates string IDs to full model names — no Rust routing changes needed

### Config Persistence

Extend the Tauri config with:

```typescript
interface AppConfig {
  model: 'opus' | 'sonnet' | 'haiku';        // default: 'opus'
  default_preset_id: string | null;            // default: null (uses first built-in)
  notifications_enabled: boolean;              // default: true
  notification_sound: boolean;                 // default: false
}
```

Saved via existing `save_config` / `load_config` Tauri commands. Config file location unchanged.

## Notification System

### Trigger Point

Inside `ReviewContext`, after the `onReviewCompleteForTab` event fires and cleanup is done (annotations parsed, cache saved), fire the notification.

### Behavior Matrix

| App State | notifications_enabled | Action |
|-----------|----------------------|--------|
| Focused | true | In-app toast ("Review complete: {PR title}") |
| Unfocused | true | OS native notification (title: "Review Complete", body: PR title) |
| Any | false | Nothing |

### Native Notifications

- Use Web Notification API: `new Notification("Review Complete", { body: prTitle })`
- On first toggle-enable in settings, call `Notification.requestPermission()`
- If permission is `denied`, show inline warning in Notifications settings tab: "Notifications are blocked by your browser. Enable them in system preferences."
- If permission is `default` (not yet asked), the toggle-enable action triggers the permission prompt

### Notification Sound

- When `notification_sound` is true and a notification fires, play a short completion sound
- Use `new Audio('/sounds/review-complete.mp3').play()`
- Bundle a short, subtle notification sound (~0.5s)
- Sound plays regardless of focus state (if enabled)

## Global Toast System

### ToastProvider

- New context provider wrapping the app in `App.tsx`
- Exposes `useToast()` hook: `toast({ title: string, description?: string, variant: 'success' | 'info' | 'warning', duration?: number })`
- Renders toasts in fixed bottom-right stack (max 3 visible)
- Auto-dismiss after duration (default 3000ms)
- Fade-in/slide-up animation on enter, fade-out on exit

### Visual Style

- Reuses color tokens from existing theme (`--color-success-muted`, `--color-info-muted`, etc.)
- Compact: icon + title + optional description
- Matches existing ToastFeedback aesthetic but positioned globally

## useSettings Hook

```typescript
interface Settings {
  model: 'opus' | 'sonnet' | 'haiku';
  defaultPresetId: string | null;
  notificationsEnabled: boolean;
  notificationSound: boolean;
}

function useSettings(): {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  loading: boolean;
}
```

- Loads config on mount via Tauri `load_config` command
- `updateSettings` merges patch and calls `save_config`
- Provides reactive state to all consumers

## Keyboard Shortcut

Add to existing listener in `App.tsx`:

```
Cmd/Ctrl + , → open settings modal
```

Implementation: check `e.key === ','` with meta/ctrl modifier, call `setSettingsOpen(true)`.

## File Changes

| File | Change |
|------|--------|
| `src/client/App.tsx` | Add Cmd+, shortcut, wrap app with ToastProvider, manage settings modal state at top level |
| `src/client/components/SettingsModal.tsx` | Rewrite as tabbed modal with General, Presets, Notifications tabs |
| `src/client/components/PRInput.tsx` | Remove local `settingsOpen` state; settings button calls a shared `openSettings()` callback passed via props or context from App |
| `src/client/context/ReviewContext.tsx` | Read model from settings; fire notification on review complete |
| `src/client/components/ChatPanel.tsx` | Read model from settings |
| `src-tauri/src/commands/config.rs` | Add `model`, `default_preset_id`, `notifications_enabled`, `notification_sound` to config struct with defaults |
| New: `src/client/components/ToastProvider.tsx` | Global toast context + fixed-position renderer |
| New: `src/client/hooks/useSettings.ts` | Settings read/write hook wrapping Tauri config commands |
| New: `public/sounds/review-complete.mp3` | Short notification sound asset |

## Out of Scope

- Per-tab model selection (use global setting for now)
- Custom notification messages
- Notification history/log
- Dark/light theme toggle (separate concern)
