import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/** A native modal `<dialog>`: the browser traps focus, handles Escape and makes the page behind inert. */
export function Modal({ open, title, onClose, children, className = '' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="modal-body">
          <header className="modal-header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
