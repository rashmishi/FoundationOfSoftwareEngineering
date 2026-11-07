import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadSettings, saveSettings } from './storage.js';
import { setSoundEnabled } from '../lib/sound.js';

const SettingsContext = createContext(null);

const systemPrefersDark = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Follow the operating system's light/dark choice until the person picks one themselves.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme = settings.theme ?? (systemDark ? 'dark' : 'light');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-text-size', settings.textSize);
    if (settings.animations) root.removeAttribute('data-motion');
    else root.setAttribute('data-motion', 'off');
    setSoundEnabled(settings.sound);
  }, [theme, settings.textSize, settings.animations, settings.sound]);

  const update = useCallback((changes) => {
    setSettings((prev) => {
      const next = { ...prev, ...changes };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, theme, update }), [settings, theme, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
