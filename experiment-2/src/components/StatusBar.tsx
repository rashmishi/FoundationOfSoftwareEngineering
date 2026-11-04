import { useEffect, useRef, useState } from 'react';

export const STATUS_DISMISS_ID = 'status-dismiss';

export interface Message {
  kind: 'success' | 'info' | 'error';
  text: string;
  /** Increases with every message. */
  sequence: number;
  /** Whether this message reports a change that Undo can reverse. */
  undoable?: boolean;
}

interface StatusBarProps {
  message: Message | null;
  /** Milliseconds before a message hides itself, or null to keep it until dismissed. */
  timeoutMs: number | null;
  onUndo: () => void;
  onDismiss: () => void;
  onTimeout: () => void;
}

/**
 * Shows the latest message. Both live regions stay mounted, as a region added
 * along with its text may not be announced.
 *
 * To meet WCAG 2.2.1, the time limit can be turned off in Display settings, and it
 * pauses while the pointer or focus is on the message. Errors never hide by
 * themselves, and Undo stays available in the header after a message has gone.
 */
export function StatusBar({ message, timeoutMs, onUndo, onDismiss, onTimeout }: StatusBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  // A ref, so that re-rendering the page does not restart the countdown.
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const isPaused = isHovered || hasFocus;
  useEffect(() => {
    if (!message || message.kind === 'error' || timeoutMs === null || isPaused) return;
    const timer = setTimeout(() => onTimeoutRef.current(), timeoutMs);
    return () => clearTimeout(timer);
  }, [message, timeoutMs, isPaused]);

  // Screen readers ignore a live region whose text has not changed, so repeat
  // messages differ by an invisible trailing space.
  const text = message && message.text + (message.sequence % 2 ? ' ' : '');

  return (
    <div
      className={message ? `status-bar status-bar-${message.kind}` : 'status-bar'}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocus(false);
      }}
    >
      {message && <span className="status-icon" />}
      <div className="status-text">
        <div role="status">{message && message.kind !== 'error' && text}</div>
        <div role="alert">{message?.kind === 'error' && <>Error: {text}</>}</div>
      </div>
      {message && (
        <div className="button-row">
          {message.undoable && (
            <button type="button" className="button" onClick={onUndo}>
              Undo<span className="visually-hidden"> this change</span>
            </button>
          )}
          <button id={STATUS_DISMISS_ID} type="button" className="button" onClick={onDismiss}>
            Dismiss<span className="visually-hidden"> message</span>
          </button>
        </div>
      )}
    </div>
  );
}
