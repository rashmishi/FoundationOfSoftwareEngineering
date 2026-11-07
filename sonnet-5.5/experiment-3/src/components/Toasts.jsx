import { useEffect, useState } from 'react';
import Icon from './Icons.jsx';

// Toasts with an Undo stay longer, and every toast waits while it is hovered or has keyboard focus.
function duration(toast) {
  if (toast.undo) return 20000;
  return toast.kind === 'error' ? 10000 : 6000;
}

function Toast({ toast, onDismiss, onUndo }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => onDismiss(toast.id), duration(toast));
    return () => clearTimeout(timer);
  }, [toast, paused, onDismiss]);

  return (
    <div
      className={`toast toast-${toast.kind}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-message">{toast.message}</span>
      {toast.undo && (
        <button type="button" className="toast-undo" onClick={() => onUndo(toast)}>
          Undo
        </button>
      )}
      <button type="button" className="icon-btn toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

/** The two live regions stay mounted so screen readers announce toasts as they appear. */
export default function Toasts({ toasts, onDismiss, onUndo }) {
  const render = (kind) =>
    toasts
      .filter((t) => (t.kind === 'error') === (kind === 'error'))
      .map((t) => <Toast key={t.id} toast={t} onDismiss={onDismiss} onUndo={onUndo} />);
  return (
    <div className="toasts">
      <div className="toast-group" role="status" aria-live="polite" aria-label="Notifications">
        {render('success')}
      </div>
      <div className="toast-group" role="alert">
        {render('error')}
      </div>
    </div>
  );
}
