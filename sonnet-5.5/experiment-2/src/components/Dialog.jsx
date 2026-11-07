import { useEffect, useId, useRef } from 'react';
import { IconButton } from './IconButton.jsx';

/**
 * Modal dialog built on the native <dialog> element opened with showModal(). The browser then
 * provides the modal behaviour: the page behind is inert, Tab stays inside, Escape closes it.
 * On top of that this component moves focus to the first field (or to the element marked
 * data-autofocus) and gives focus back to whatever opened the dialog.
 *
 * Render it only while it should be open: <Dialog title="…" onClose={…}>…</Dialog>
 * `beforeClose` may return false to keep the dialog open (e.g. to warn about unsaved changes).
 */
export function Dialog({ title, onClose, beforeClose, children, className = '', description, describedById }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  const opener = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    opener.current = document.activeElement;
    if (!dialog.open) dialog.showModal();
    // Focus the marked field, or the dialog's title so a screen reader starts at the top.
    (dialog.querySelector('[data-autofocus]') || dialog.querySelector('.dialog-title'))?.focus();
    return () => {
      if (dialog.open) dialog.close();
      const el = opener.current;
      if (el && el.isConnected && typeof el.focus === 'function') el.focus();
    };
  }, []);

  const requestClose = () => {
    if (beforeClose && beforeClose() === false) return false;
    onClose();
    return true;
  };

  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={describedById || (description ? descId : undefined)}
      onCancel={(e) => {
        // Escape. Take over closing so the unsaved-changes check can run.
        e.preventDefault();
        requestClose();
      }}
    >
      <div className="dialog-head">
        <h2 id={titleId} className="dialog-title" tabIndex={-1}>
          {title}
        </h2>
        <IconButton icon="x" label="Close dialog" align="end" onClick={requestClose} />
      </div>
      {description && (
        <p id={descId} className="dialog-description">
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}

export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const bodyId = useId();
  return (
    <Dialog title={title} onClose={onCancel} className="dialog-small" describedById={bodyId}>
      <div className="dialog-body" id={bodyId}>
        {children}
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel} data-autofocus>
          {cancelLabel}
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
