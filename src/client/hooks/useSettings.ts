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
