import { useEffect, useRef } from 'react';
import { useToasts } from '../state/toasts.jsx';
import { useBoard } from '../state/board.jsx';
import { useSettings } from '../state/settings.jsx';
import { Icon } from './Icon.jsx';
import { IconButton } from './IconButton.jsx';

const ICONS = { success: 'checkCircle', info: 'info', error: 'alert' };
// Long enough to read a sentence and reach Undo with the keyboard; toasts with Undo stay longer.
const DURATION = 9000;
const DURATION_WITH_UNDO = 14000;

function Toast({ toast }) {
  const { dismiss } = useToasts();
  const { actions, undoTopId } = useBoard();
  const { settings } = useSettings();
  const ref = useRef(null);
  const paused = useRef(false);
  const remaining = useRef(toast.undoId ? DURATION_WITH_UNDO : DURATION);
  const timer = useRef(null);
  const startedAt = useRef(0);

  const start = () => {
    clearTimeout(timer.current);
    if (!settings.autoDismiss) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => dismiss(toast.id), remaining.current);
  };
  const pause = () => {
    if (paused.current) return;
    paused.current = true;
    clearTimeout(timer.current);
    remaining.current = Math.max(3000, remaining.current - (Date.now() - startedAt.current));
  };
  const resume = () => {
    if (!paused.current) return;
    paused.current = false;
    start();
  };

  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoDismiss]);

  const canUndo = toast.undoId && toast.undoId === undoTopId;

  return (
    <div
      ref={ref}
      className="toast"
      data-kind={toast.kind}
      onMouseEnter={pause}
      onMouseLeave={() => {
        if (!ref.current?.contains(document.activeElement)) resume();
      }}
      onFocus={pause}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget)) resume();
      }}
    >
      <Icon name={ICONS[toast.kind] || 'info'} className="toast-icon" />
      <p className="toast-message">{toast.message}</p>
      {canUndo && (
        <button
          type="button"
          className="btn toast-undo"
          onClick={() => {
            actions.undo();
            dismiss(toast.id);
          }}
        >
          Undo
        </button>
      )}
      <IconButton icon="x" label="Dismiss notification" align="end" className="toast-close" onClick={() => dismiss(toast.id)} />
    </div>
  );
}

/**
 * The region is always in the page and marked as a polite live region, so a screen reader announces
 * each message as it is added without moving focus.
 */
export function Toasts() {
  const { toasts } = useToasts();
  return (
    <div className="toast-region" role="status" aria-live="polite" aria-relevant="additions" aria-label="Notifications">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
