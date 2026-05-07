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
          {activeTab === 'presets' && <PresetManager onClose={onClose} />}
          {activeTab === 'notifications' && <NotificationsTab />}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
