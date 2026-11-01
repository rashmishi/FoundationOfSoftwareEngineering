const STORAGE_KEY = 'notes-board:preferences';

export interface Preferences {
  theme: string;
  textSize: string;
  spacing: string;
  font: string;
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
];

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  textSize: 'standard',
  spacing: 'standard',
  font: 'standard',
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

function resolveTheme(theme: string): string {
  if (theme !== 'system') return theme;
  if (window.matchMedia('(prefers-contrast: more)').matches) return 'contrast';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyPreferences({ theme, textSize, spacing, font }: Preferences): void {
  Object.assign(document.documentElement.dataset, { theme: resolveTheme(theme), textSize, spacing, font });
}

/** Calls back when the device's colour or contrast settings change. */
export function onDeviceThemeChange(callback: () => void): () => void {
  const queries = ['(prefers-contrast: more)', '(prefers-color-scheme: dark)'].map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener('change', callback));
  return () => queries.forEach((query) => query.removeEventListener('change', callback));
}
