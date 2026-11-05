import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/** A data-focus key, or an element to focus directly. */
export type FocusTarget = string | HTMLElement | null | undefined;

interface FocusValue {
  /** Focus the first target that exists after the next render (FR-22). */
  requestFocus: (...targets: FocusTarget[]) => void;
}

const FocusContext = createContext<FocusValue | null>(null);

export const MAIN_HEADING_KEY = 'heading:main';

function resolve(target: FocusTarget): HTMLElement | null {
  if (!target) return null;
  const el =
    typeof target === 'string' ? document.querySelector<HTMLElement>(`[data-focus="${CSS.escape(target)}"]`) : target;
  if (!el || !el.isConnected || el.closest('[inert]')) return null;
  return el;
}

export function focusElement(el: HTMLElement): void {
  el.focus({ preventScroll: true });
  el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const pending = useRef<FocusTarget[] | null>(null);
  const [tick, setTick] = useState(0);

  const requestFocus = useCallback((...targets: FocusTarget[]) => {
    pending.current = [...targets, MAIN_HEADING_KEY];
    setTick((t) => t + 1);
  }, []);

  useLayoutEffect(() => {
    const targets = pending.current;
    if (!targets) return;
    let attempts = 0;
    const tryFocus = () => {
      for (const target of targets) {
        const el = resolve(target);
        // The last fallback (main heading) is always used, but only after the specific targets
        // had a chance to mount (for example, a card that re-mounts in another column).
        if (el && (target !== MAIN_HEADING_KEY || attempts >= 2)) {
          focusElement(el);
          pending.current = null;
          return;
        }
      }
      attempts += 1;
      if (attempts <= 2) requestAnimationFrame(tryFocus);
    };
    tryFocus();
  }, [tick]);

  const value = useMemo(() => ({ requestFocus }), [requestFocus]);
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocusManager(): FocusValue {
  const value = useContext(FocusContext);
  if (!value) throw new Error('useFocusManager outside FocusProvider');
  return value;
}
