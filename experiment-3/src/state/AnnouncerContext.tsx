import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

interface Message {
  text: string;
}

interface Announcer {
  /** Polite confirmation in the status region (role="status"). */
  announce: (text: string) => void;
  /** Assertive error in the alert region (role="alert"). */
  announceError: (text: string) => void;
  /** Persistent warning that later status messages do not overwrite. */
  showBanner: (text: string) => void;
}

interface AnnouncerState {
  status: Message | null;
  error: Message | null;
  banner: string | null;
  dismissMessage: () => void;
  dismissBanner: () => void;
}

const AnnouncerContext = createContext<Announcer | null>(null);
const AnnouncerStateContext = createContext<AnnouncerState | null>(null);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Message | null>(null);
  const [error, setError] = useState<Message | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const last = useRef<{ text: string; kind: 'status' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((text: string, kind: 'status' | 'error') => {
    clearTimeout(timer.current);
    const apply = () => {
      setStatus(kind === 'status' ? { text } : null);
      setError(kind === 'error' ? { text } : null);
    };
    // Screen readers ignore a live region whose text does not change, so an
    // identical message is cleared first and re-inserted shortly after.
    if (last.current?.text === text && last.current.kind === kind) {
      setStatus(null);
      setError(null);
      timer.current = setTimeout(apply, 100);
    } else {
      apply();
    }
    last.current = { text, kind };
  }, []);

  const api = useMemo<Announcer>(
    () => ({
      announce: (text) => show(text, 'status'),
      announceError: (text) => show(text, 'error'),
      showBanner: (text) => setBanner(text),
    }),
    [show],
  );

  const state = useMemo<AnnouncerState>(
    () => ({
      status,
      error,
      banner,
      dismissMessage: () => {
        clearTimeout(timer.current);
        setStatus(null);
        setError(null);
        last.current = null;
      },
      dismissBanner: () => setBanner(null),
    }),
    [status, error, banner],
  );

  return (
    <AnnouncerContext.Provider value={api}>
      <AnnouncerStateContext.Provider value={state}>{children}</AnnouncerStateContext.Provider>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): Announcer {
  const ctx = useContext(AnnouncerContext);
  if (!ctx) throw new Error('useAnnouncer must be used inside AnnouncerProvider');
  return ctx;
}

export function useAnnouncerState(): AnnouncerState {
  const ctx = useContext(AnnouncerStateContext);
  if (!ctx) throw new Error('useAnnouncerState must be used inside AnnouncerProvider');
  return ctx;
}
