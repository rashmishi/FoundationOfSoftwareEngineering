import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CloseIcon } from './Icons';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  kind?: ToastKind;
  /** Shown as an Undo button; the toast closes after it runs. */
  onUndo?: () => void;
}

interface Toast extends Required<Pick<ToastOptions, 'kind'>> {
  id: number;
  message: string;
  onUndo?: () => void;
  duration: number;
  leaving: boolean;
}

const MAX_TOASTS = 4;
const LEAVE_MS = 200;

type Notify = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<Notify>(() => {});

export function useToast(): Notify {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), LEAVE_MS);
  }, []);

  const notify = useCallback<Notify>((message, options = {}) => {
    const kind = options.kind ?? 'success';
    const toast: Toast = {
      id: nextId.current++,
      message,
      kind,
      onUndo: options.onUndo,
      duration: kind === 'error' ? 8000 : 5000,
      leaving: false,
    };
    setToasts((all) => [...all, toast].slice(-MAX_TOASTS));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <section className="toasts" aria-label="Notifications">
        {/* Separate live regions so errors interrupt but confirmations wait their turn. */}
        <div role="status" aria-live="polite" className="toast-stack">
          {toasts.filter((t) => t.kind !== 'error').map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
        <div role="alert" aria-live="assertive" className="toast-stack">
          {toasts.filter((t) => t.kind === 'error').map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused || toast.leaving) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, toast.leaving, toast.id, onDismiss]);

  const style = useMemo(() => ({ animationDuration: `${toast.duration}ms` }), [toast.duration]);

  return (
    <div
      className={`toast toast-${toast.kind}${toast.leaving ? ' is-leaving' : ''}${paused ? ' is-paused' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <p className="toast-message">{toast.message}</p>
      {toast.onUndo && (
        <button
          type="button"
          className="toast-undo"
          onClick={() => {
            toast.onUndo?.();
            onDismiss(toast.id);
          }}
        >
          Undo
        </button>
      )}
      <button type="button" className="icon-button toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
        <CloseIcon size={16} />
      </button>
      <span className="toast-progress" style={style} aria-hidden="true" />
    </div>
  );
}
