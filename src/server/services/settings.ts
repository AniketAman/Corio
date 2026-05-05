import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { Preset } from './presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Store settings in user's home directory
const SETTINGS_DIR = process.env.HOME
  ? join(process.env.HOME, '.code-reviewer')
  : join(__dirname, '../../../.code-reviewer');
const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json');

interface Settings {
  customPresets?: Preset[];
}

let cachedSettings: Settings | null = null;

async function ensureSettingsDir() {
  if (!existsSync(SETTINGS_DIR)) {
    await mkdir(SETTINGS_DIR, { recursive: true });
  }
}

export async function loadSettings(): Promise<Settings> {
  if (cachedSettings) return cachedSettings;

  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8');
    cachedSettings = JSON.parse(data);
    return cachedSettings || {};
  } catch {
    // File doesn't exist or is invalid
    cachedSettings = {};
    return {};
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await ensureSettingsDir();
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  cachedSettings = settings;
}
