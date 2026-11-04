import { setSoundLevel } from './sounds';

const STORAGE_KEY = 'notes-board:preferences';

export interface Preferences {
  theme: string;
  textSize: string;
  spacing: string;
  font: string;
  motion: string;
  sound: string;
  messages: string;
  noteButtons: string;
}

interface PreferenceGroup {
  key: keyof Preferences;
  legend: string;
  options: { value: string; label: string }[];
}

export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    key: 'theme',
    legend: 'Colours',
    options: [
      { value: 'system', label: 'Match my device' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'contrast', label: 'High contrast' },
    ],
  },
  {
    key: 'textSize',
    legend: 'Text size',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'large', label: 'Large' },
      { value: 'larger', label: 'Larger' },
      { value: 'largest', label: 'Largest' },
    ],
  },
  {
    key: 'spacing',
    legend: 'Text spacing',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'wide', label: 'Wide' },
    ],
  },
  {
    key: 'font',
    legend: 'Font',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'readable', label: 'Wide letters' },
    ],
  },
  {
    key: 'motion',
    legend: 'Animation',
    options: [
      { value: 'system', label: 'Match my device' },
      { value: 'full', label: 'On' },
      { value: 'reduced', label: 'Off' },
    ],
  },
  {
    key: 'sound',
    legend: 'Sound effects',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'quiet', label: 'Quiet' },
      { value: 'normal', label: 'Normal' },
    ],
  },
  {
    key: 'messages',
    legend: 'Messages',
    options: [
      { value: '10', label: 'Hide after 10 seconds' },
      { value: '30', label: 'Hide after 30 seconds' },
      { value: 'never', label: 'Keep until I dismiss them' },
    ],
  },
  {
    key: 'noteButtons',
    legend: 'Note buttons',
    options: [
      { value: 'hover', label: 'Show when pointing at a note' },
      { value: 'always', label: 'Always show' },
    ],
  },
];

/** Sound starts off, as unexpected sound can distress people and competes with screen readers. */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  textSize: 'standard',
  spacing: 'standard',
  font: 'standard',
  motion: 'system',
  sound: 'off',
  messages: '10',
  noteButtons: 'hover',
};

export function loadPreferences(): Preferences {
  const preferences = { ...DEFAULT_PREFERENCES };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    for (const { key, options } of PREFERENCE_GROUPS) {
      const value = (saved as Partial<Preferences> | null)?.[key];
      if (options.some((option) => option.value === value)) {
        preferences[key] = value as string;
      }
    }
  } catch {
    // Unreadable preferences are not worth reporting. The defaults work for everyone.
  }
  return preferences;
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // The settings still apply until the page is closed.
  }
}

export function resolveTheme(theme: string): string {
  if (theme !== 'system') return theme;
  if (window.matchMedia('(prefers-contrast: more)').matches) return 'contrast';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveMotion(motion: string): string {
  if (motion !== 'system') return motion;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}

/** Milliseconds before a message hides, or null to keep it until dismissed. */
export function messageTimeout({ messages }: Preferences): number | null {
  return messages === 'never' ? null : Number(messages) * 1000;
}

export function applyPreferences(preferences: Preferences): void {
  const { theme, textSize, spacing, font, motion, noteButtons } = preferences;
  Object.assign(document.documentElement.dataset, {
    theme: resolveTheme(theme),
    textSize,
    spacing,
    font,
    motion: resolveMotion(motion),
    noteButtons,
  });
  setSoundLevel(preferences.sound);
}

const DEVICE_QUERIES = ['(prefers-contrast: more)', '(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)'];

/** Calls back when the device's colour, contrast or motion settings change. */
export function onDeviceSettingsChange(callback: () => void): () => void {
  const queries = DEVICE_QUERIES.map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener('change', callback));
  return () => queries.forEach((query) => query.removeEventListener('change', callback));
}

/** A string that changes whenever a device setting that affects the app changes. */
export function readDeviceSettings(): string {
  return DEVICE_QUERIES.map((query) => window.matchMedia(query).matches).join();
}
