import { useEffect, useId, useRef, type ReactNode } from 'react';

const APP_NAME = 'Notes Board';

interface DialogProps {
  title: string;
  /** Set for confirmation dialogs, which interrupt the user and need a response. */
  alert?: boolean;
  onClose: () => void;
  /** Called on Esc instead of closing, for dialogs that may need to check first. */
  onRequestClose?: () => void;
  /** The content. Mark the element to focus on opening with data-autofocus. */
  children: (ids: { describedBy: string }) => ReactNode;
}

/** A modal built on the native dialog element, which contains focus and handles Esc. */
export function Dialog({ title, alert = false, onClose, onRequestClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const describedBy = `${id}-description`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    // Without a marked element, starting on the title keeps long dialogs scrolled to the top.
    (dialog.querySelector<HTMLElement>('[data-autofocus]') ?? document.getElementById(titleId))?.focus();
    return () => {
      dialog.close();
      opener?.focus();
    };
  }, [titleId]);

  useEffect(() => {
    document.title = `${title} - ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      role={alert ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={alert ? describedBy : undefined}
      onKeyDown={(event) => {
        // Chrome stops firing cancel after one blocked Esc, so a second press would close the dialog.
        if (event.key === 'Escape' && onRequestClose) {
          event.preventDefault();
          onRequestClose();
        }
      }}
      onCancel={(event) => {
        if (onRequestClose) {
          event.preventDefault();
          onRequestClose();
        }
      }}
      onClose={() => {
        // StrictMode remounts the dialog, so a close event can land after it has reopened.
        if (!ref.current?.open) onClose();
      }}
    >
      <h2 id={titleId} tabIndex={-1}>
        {title}
      </h2>
      {children({ describedBy })}
    </dialog>
  );
}
