import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from 'react';

type RequestFocus = (id: string) => void;

const FocusContext = createContext<RequestFocus | null>(null);

const MAX_ATTEMPTS = 3;
const FALLBACK_ID = 'notes-heading';

/**
 * Moves focus to an element id after the next commit (FR-G.1). Callers request
 * focus in the same event handler that changes state, so the target exists
 * once React has rendered the change.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ id: string; attempt: number } | null>(null);

  useLayoutEffect(() => {
    if (!pending) return;
    const el = document.getElementById(pending.id);
    if (el) {
      el.focus();
      setPending(null);
      return;
    }
    const t = setTimeout(() => {
      if (pending.attempt + 1 < MAX_ATTEMPTS) {
        setPending({ id: pending.id, attempt: pending.attempt + 1 });
      } else {
        document.getElementById(FALLBACK_ID)?.focus();
        setPending(null);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [pending]);

  const requestFocus = useCallback<RequestFocus>((id) => setPending({ id, attempt: 0 }), []);

  return <FocusContext.Provider value={requestFocus}>{children}</FocusContext.Provider>;
}

export function useRequestFocus(): RequestFocus {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useRequestFocus must be used inside FocusProvider');
  return ctx;
}
