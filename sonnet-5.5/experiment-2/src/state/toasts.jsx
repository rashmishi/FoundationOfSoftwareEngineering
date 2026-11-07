import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const MAX_TOASTS = 4;

/**
 * Notifications. `kind` is 'success' | 'info' | 'error'. A toast may carry an `undoId`, the id of the
 * history entry it can undo; the toast only offers Undo while that entry is still the latest one.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback((message, { kind = 'success', undoId = null } = {}) => {
    const id = ++counter.current;
    setToasts((list) => [...list, { id, message, kind, undoId }].slice(-MAX_TOASTS));
    return id;
  }, []);

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToasts() {
  return useContext(ToastContext);
}
