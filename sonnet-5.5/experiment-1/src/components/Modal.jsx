import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';

/**
 * A modal dialog built on the native <dialog> element, which gives focus
 * trapping, Escape to close and an inert page behind it. Focus goes to the
 * element marked data-autofocus (or the first control) and returns to whatever
 * had it before the dialog opened.
 */
export default function Modal({ title, onClose, children, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeRef.current(); // click on the backdrop
      }}
    >
      <div className="modal-inner">
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close dialog" title="Close" onClick={() => closeRef.current()}>
            <Icon name="x" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export function ConfirmModal({ title, children, confirmLabel, danger = false, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="modal-body">{children}</div>
      <footer className="modal-foot">
        <button type="button" className="btn" data-autofocus onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </footer>
    </Modal>
  );
}
