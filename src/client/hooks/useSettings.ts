import { useState, useEffect, useCallback } from 'react';
import { tauriApi, Config } from './useTauriApi';

// The `claude` CLI resolves these aliases to its latest model of that tier —
// the actual model name lives only in the Rust default (config.rs
// `default_model`) and whatever is saved in config.json. No version string
// is duplicated here.
export type ModelId = 'opus' | 'sonnet' | 'haiku';

export interface Settings {
  model: ModelId;
  defaultPresetId: string;
  notificationsEnabled: boolean;
  notificationSound: boolean;
}

function configToSettings(config: Config): Settings {
  return {
    model: config.defaults.model as ModelId,
    defaultPresetId: config.defaults.preset,
    notificationsEnabled: config.defaults.notifications_enabled,
    notificationSound: config.defaults.notification_sound,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    model: 'sonnet',
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
        model: next.model,
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
