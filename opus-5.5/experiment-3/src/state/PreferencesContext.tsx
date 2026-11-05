import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadJSON, PREFS_KEY, saveJSON } from '../model/storage';
import { playTone, type SoundName } from './sound';

export type ThemeChoice = 'system' | 'light' | 'dark';
/** Seconds; 0 means "Keep until I close them". */
export type ToastDuration = 5 | 8 | 15 | 30 | 0;

export interface Preferences {
  theme: ThemeChoice;
  reduceMotion: boolean;
  sound: boolean;
  toastDuration: ToastDuration;
}

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', reduceMotion: false, sound: false, toastDuration: 8 };

interface PreferencesValue {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  /** Reduced motion from the OS or from the in-app setting (FR-18.3). */
  reducedMotion: boolean;
  play: (name: SoundName) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
}

function readPrefs(): Preferences {
  const stored = loadJSON<Preferences>(PREFS_KEY);
  const p = { ...DEFAULT_PREFERENCES };
  if (stored.theme === 'light' || stored.theme === 'dark' || stored.theme === 'system') p.theme = stored.theme;
  if (typeof stored.reduceMotion === 'boolean') p.reduceMotion = stored.reduceMotion;
  if (typeof stored.sound === 'boolean') p.sound = stored.sound;
  if ([5, 8, 15, 30, 0].includes(stored.toastDuration as number)) p.toastDuration = stored.toastDuration as ToastDuration;
  return p;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(readPrefs);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const systemReduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const reducedMotion = prefs.reduceMotion || systemReduce;
  const resolvedTheme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => saveJSON(PREFS_KEY, prefs), [prefs]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.reduceMotion = String(reducedMotion);
  }, [resolvedTheme, reducedMotion]);

  const setPref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const play = useCallback((name: SoundName) => {
    if (prefs.sound) playTone(name);
  }, [prefs.sound]);

  const value = useMemo(() => ({ prefs, setPref, reducedMotion, play }), [prefs, setPref, reducedMotion, play]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences outside PreferencesProvider');
  return value;
}
