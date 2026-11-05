import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';

export type Politeness = 'polite' | 'assertive';

interface RegionPair {
  polite: RefObject<HTMLDivElement>;
  assertive: RefObject<HTMLDivElement>;
}

interface AnnouncerValue {
  announce: (text: string, level?: Politeness) => void;
  /** Dialogs register their own live regions, because a modal dialog makes the page regions inert. */
  register: (pair: RegionPair) => () => void;
}

const AnnouncerContext = createContext<AnnouncerValue | null>(null);

/** Messages are removed from the live region after this long; they have been read by then. */
const MESSAGE_LIFETIME = 7000;
/**
 * Messages are written after a short delay so that a dialog closing in the same event has gone
 * (and the page regions are no longer inert) by the time the text is added.
 */
const WRITE_DELAY = 60;

export function LiveRegions({ pair }: { pair: RegionPair }) {
  return (
    <>
      <div ref={pair.polite} className="sr-only" role="status" aria-live="polite" aria-atomic="false" />
      <div ref={pair.assertive} className="sr-only" role="alert" aria-live="assertive" aria-atomic="false" />
    </>
  );
}

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const page: RegionPair = { polite: useRef<HTMLDivElement>(null), assertive: useRef<HTMLDivElement>(null) };
  const pageRef = useRef(page);
  const stack = useRef<RegionPair[]>([]);

  const announce = useCallback((text: string, level: Politeness = 'polite') => {
    window.setTimeout(() => {
      const top = stack.current[stack.current.length - 1] ?? pageRef.current;
      const region = top[level].current ?? pageRef.current[level].current;
      if (!region) return;
      // Append rather than replace, so quick successive messages are all read.
      const p = document.createElement('p');
      p.textContent = text;
      region.appendChild(p);
      window.setTimeout(() => p.remove(), MESSAGE_LIFETIME);
    }, WRITE_DELAY);
  }, []);

  const register = useCallback((pair: RegionPair) => {
    stack.current.push(pair);
    return () => {
      stack.current = stack.current.filter((p) => p !== pair);
    };
  }, []);

  const value = useMemo(() => ({ announce, register }), [announce, register]);
  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <LiveRegions pair={page} />
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): AnnouncerValue {
  const value = useContext(AnnouncerContext);
  if (!value) throw new Error('useAnnouncer outside AnnouncerProvider');
  return value;
}

/** Live regions owned by a dialog, active while it is mounted. */
export function useDialogLiveRegions(): RegionPair {
  const { register } = useAnnouncer();
  const polite = useRef<HTMLDivElement>(null);
  const assertive = useRef<HTMLDivElement>(null);
  const pair = useRef<RegionPair>({ polite, assertive }).current;
  useEffect(() => register(pair), [register, pair]);
  return pair;
}
