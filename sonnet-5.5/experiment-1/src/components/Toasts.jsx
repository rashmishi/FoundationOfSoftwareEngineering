import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const MAX_TOASTS = 4;
let nextToastId = 1;

/**
 * Toast queue. A toast with an `undo` callback replaces earlier undoable toasts,
 * because an Undo restores the state from just before its own action and an
 * older one would silently discard the newer change.
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback(({ message, kind = 'success', undo = null, duration }) => {
    const id = nextToastId++;
    const toast = { id, message, kind, undo, duration: duration ?? (kind === 'error' ? 8000 : 5500) };
    setToasts((list) => [...(undo ? list.filter((t) => !t.undo) : list), toast].slice(-MAX_TOASTS));
    return id;
  }, []);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  return { toasts, push, dismiss };
}

function ToastItem({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);

  // Count down only while the pointer and keyboard focus are away from the toast.
  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, toast.id, onDismiss]);

  const isError = toast.kind === 'error';
  return (
    <li
      className={`toast toast-${toast.kind}`}
      role={isError ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <span className="toast-icon">
        <Icon name={isError ? 'alert' : toast.kind === 'info' ? 'info' : 'check'} size={18} />
      </span>
      <span className="toast-message">{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          className="toast-undo"
          onClick={() => {
            toast.undo();
            onDismiss(toast.id);
          }}
        >
          Undo
        </button>
      )}
      <button type="button" className="icon-btn toast-close" aria-label="Dismiss notification" title="Dismiss" onClick={() => onDismiss(toast.id)}>
        <Icon name="x" size={16} />
      </button>
      <span
        className="toast-progress"
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        aria-hidden="true"
      />
    </li>
  );
}

export default function Toasts({ toasts, onDismiss }) {
  return (
    <ul className="toasts" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </ul>
  );
}
