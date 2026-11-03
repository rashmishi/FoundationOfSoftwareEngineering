import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Toast } from '../model/toastQueue';
import { useBoard } from '../state/BoardContext';
import { useFocusManager, MAIN_HEADING_KEY } from '../state/FocusContext';
import { usePreferences } from '../state/PreferencesContext';
import { useToasts } from '../state/ToastContext';
import { Icon } from './Icon';

function ToastItem({ toast, paused }: { toast: Toast; paused: boolean }) {
  const { prefs, reducedMotion } = usePreferences();
  const { dismiss, setFocusedId, returnTarget } = useToasts();
  const { lastUndo, undo } = useBoard();
  const { requestFocus } = useFocusManager();
  const seconds = toast.kind === 'error' ? 0 : prefs.toastDuration;
  const remaining = useRef(seconds * 1000);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-close timer: starts when visible, pauses on hover, focus and hidden tab (FR-12.3); errors stay (FR-12.7).
  useEffect(() => {
    if (!seconds || paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [seconds, paused, dismiss, toast.id]);

  const close = () => {
    const back = returnTarget();
    dismiss(toast.id);
    requestFocus(back, MAIN_HEADING_KEY);
  };

  const canUndo = toast.undoId !== undefined && lastUndo?.id === toast.undoId;

  return (
    <div
      ref={ref}
      className={`toast toast-${toast.kind}`}
      role="group"
      aria-label="Notification"
      onFocus={() => setFocusedId(toast.id)}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setFocusedId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      }}
    >
      <Icon name={toast.kind === 'error' ? 'error' : toast.kind === 'info' ? 'info' : 'check'} className="toast-icon" />
      <p className="toast-text">{toast.text}</p>
      <div className="toast-actions">
        {canUndo && (
          <button
            type="button"
            className="button small"
            aria-label={`Undo, ${lastUndo!.label}`}
            onClick={() => {
              const back = returnTarget();
              dismiss(toast.id);
              undo('toast', back);
            }}
          >
            <Icon name="undo" />
            <span>Undo</span>
          </button>
        )}
        <button type="button" className="button small" aria-label={`Dismiss, ${toast.text}`} onClick={close}>
          Dismiss
        </button>
      </div>
      {seconds > 0 && !reducedMotion && (
        <span
          className={`toast-progress${paused ? ' paused' : ''}`}
          style={{ animationDuration: `${seconds}s` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function ToastRegion() {
  const { toasts, regionRef, dismiss, returnTarget } = useToasts();
  const { requestFocus } = useFocusManager();
  const focusAfterShowNext = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Reserve space at the bottom of the page so toasts never cover the focused element (FR-12.8).
  useLayoutEffect(() => {
    const el = regionRef.current;
    if (!el) return;
    const update = () => document.documentElement.style.setProperty('--toast-space', `${el.offsetHeight + 16}px`);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [regionRef]);

  const visible = toasts.filter((t) => t.visible);
  const queued = toasts.length - visible.length;

  // "Show next" may remove itself; focus the toast that just appeared instead (FR-22).
  useLayoutEffect(() => {
    if (!focusAfterShowNext.current) return;
    focusAfterShowNext.current = false;
    if (!focusNewestToast(regionRef.current)) requestFocus(returnTarget(), MAIN_HEADING_KEY);
  }, [toasts, regionRef, requestFocus, returnTarget]);

  const showNext = () => {
    // Prefer closing a success/info message; error messages stay unless nothing else is shown.
    const oldest = visible.find((t) => t.kind !== 'error') ?? visible[0];
    if (!oldest) return;
    focusAfterShowNext.current = true;
    dismiss(oldest.id);
  };
  const paused = hovered || focusWithin || hidden;

  return (
    <div
      ref={regionRef}
      className="toast-region"
      role="region"
      aria-label="Notifications"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget as Node)) setFocusWithin(false);
      }}
    >
      {visible.map((toast) => (
        <ToastItem key={toast.id} toast={toast} paused={paused} />
      ))}
      {queued > 0 && (
        <div className="toast-queue">
          <p>{queued === 1 ? '1 more message' : `${queued} more messages`}</p>
          <button type="button" className="button small" onClick={showNext}>
            Show next
          </button>
        </div>
      )}
    </div>
  );
}

/** F8: move focus to the newest notification (FR-12.5). */
export function focusNewestToast(region: HTMLElement | null): boolean {
  const toasts = region?.querySelectorAll<HTMLElement>('.toast');
  const newest = toasts?.[toasts.length - 1];
  const button = newest?.querySelector<HTMLElement>('button');
  if (!button) return false;
  button.focus();
  return true;
}
