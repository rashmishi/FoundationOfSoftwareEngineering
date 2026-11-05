export type Theme = 'light' | 'dark';

export interface Settings {
  theme: Theme;
  sound: boolean;
}

export const SETTINGS_KEY = 'notes-kanban:settings';

function systemTheme(): Theme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function loadSettings(): Settings {
  const defaults: Settings = { theme: systemTheme(), sound: true };
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return {
      theme: stored.theme === 'dark' || stored.theme === 'light' ? stored.theme : defaults.theme,
      sound: typeof stored.sound === 'boolean' ? stored.sound : defaults.sound,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Preferences are a convenience; ignore a refused write.
  }
}

export function applyTheme(theme: Theme, animate = false): void {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 350);
  }
  root.dataset.theme = theme;
}
