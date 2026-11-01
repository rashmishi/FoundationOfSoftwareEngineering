import { useAnnouncerState } from '../state/AnnouncerContext';
import { useRequestFocus } from '../state/FocusContext';

/**
 * Visible, persistent messages backed by live regions that exist from the first
 * render (AR-R2). Messages stay until replaced or dismissed (AR-O4).
 */
export function StatusBar() {
  const { status, error, banner, dismissMessage, dismissBanner } = useAnnouncerState();
  const requestFocus = useRequestFocus();
  // The dismiss buttons disappear with their message, so focus moves to the first
  // section heading, which shows a focus ring (FR-G.1).
  const dismiss = (clear: () => void) => () => {
    clear();
    requestFocus('create-heading');
  };
  return (
    <div className="messages">
      <div role="alert" aria-atomic="true">
        {banner && (
          <p className="msg msg-warning">
            <span aria-hidden="true" className="msg-icon">
              ⚠
            </span>
            {banner}
          </p>
        )}
      </div>
      {banner && (
        <button type="button" className="btn btn-small msg-dismiss" onClick={dismiss(dismissBanner)}>
          Dismiss warning
        </button>
      )}
      <div role="status" aria-live="polite" aria-atomic="true">
        {status && (
          <p className="msg msg-success">
            <span aria-hidden="true" className="msg-icon">
              ✓
            </span>
            {status.text}
          </p>
        )}
      </div>
      <div role="alert" aria-atomic="true">
        {error && (
          <p className="msg msg-error">
            <span aria-hidden="true" className="msg-icon">
              ⚠
            </span>
            {error.text}
          </p>
        )}
      </div>
      {(status || error) && (
        <button type="button" className="btn btn-small msg-dismiss" onClick={dismiss(dismissMessage)}>
          Dismiss message
        </button>
      )}
    </div>
  );
}
