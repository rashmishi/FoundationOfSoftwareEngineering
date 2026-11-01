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
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Shows the latest message until it is replaced or dismissed. Both live regions
 * stay mounted, as a region added along with its text may not be announced.
 */
export function StatusBar({ message, onUndo, onDismiss }: StatusBarProps) {
  // Screen readers ignore a live region whose text has not changed, so repeat
  // messages differ by an invisible trailing space.
  const text = message && message.text + (message.sequence % 2 ? ' ' : '');

  return (
    <div className={message ? `status-bar status-bar-${message.kind}` : 'status-bar'}>
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
