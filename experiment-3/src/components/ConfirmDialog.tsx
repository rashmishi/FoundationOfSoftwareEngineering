import { useEffect, useId, useRef } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation built on the native <dialog> (inert background, Escape to
 * cancel). Mount it to open it. Initial focus is put on Cancel explicitly after
 * showModal(), because React's autoFocus has no effect inside a closed dialog.
 */
export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const callbacks = useRef({ onConfirm, onCancel });
  callbacks.current = { onConfirm, onCancel };
  const titleId = useId();
  const descId = useId();

  // Buttons and Escape finish synchronously instead of waiting for the dialog's
  // "close" event, which browsers may defer (e.g. while the page is not rendering).
  // close() restores focus to the opener first; the caller's own focus request,
  // applied after the next commit, then wins.
  const finished = useRef(false);
  const finish = (confirmed: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const dialog = ref.current;
    if (dialog?.open) dialog.close();
    if (confirmed) callbacks.current.onConfirm();
    else callbacks.current.onCancel();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
    const onEscape = (e: Event) => {
      e.preventDefault();
      finish(false);
    };
    // Fallback: if the browser closes the dialog without a "cancel" event
    // (close-watcher rules), treat it as Cancel so the app state stays in sync.
    const onClose = () => finish(false);
    dialog.addEventListener('cancel', onEscape);
    dialog.addEventListener('close', onClose);
    return () => {
      dialog.removeEventListener('cancel', onEscape);
      dialog.removeEventListener('close', onClose);
    };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby={titleId} aria-describedby={descId} className="dialog">
      <h2 id={titleId}>{title}</h2>
      <p id={descId}>{message}</p>
      <div className="dialog-actions">
        <button ref={cancelRef} type="button" className="btn" onClick={() => finish(false)}>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? 'btn btn-danger-filled' : 'btn btn-primary'}
          onClick={() => finish(true)}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
