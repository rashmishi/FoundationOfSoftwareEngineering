import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { LiveRegions, useDialogLiveRegions } from '../state/AnnouncerContext';

interface DialogProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  /** Element to focus when the dialog opens; defaults to the first focusable element. */
  initialFocus?: RefObject<HTMLElement>;
  className?: string;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog on the native <dialog> element (FR-11): the browser contains focus and makes the page
 * inert; Escape closes; focus returns to the opener unless the owner asked for another target.
 */
export function Dialog({ title, description, children, footer, onClose, initialFocus, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const regions = useDialogLiveRegions();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute('open', '');
    const target = initialFocus?.current ?? dialog.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
      const active = document.activeElement;
      if (opener?.isConnected && (!active || active === document.body || dialog.contains(active))) {
        opener.focus({ preventScroll: true });
      }
    };
    // Runs once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialog${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onKeyDown={(e) => {
        // Handled here as well as in onCancel, so Escape behaves the same in every browser.
        if (e.key === 'Escape' && !e.defaultPrevented) {
          e.preventDefault();
          onCloseRef.current();
        }
      }}
    >
      <div className="dialog-inner">
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {description && (
          <div id={descId} className="dialog-description">
            {description}
          </div>
        )}
        {children}
        <div className="dialog-footer">{footer}</div>
      </div>
      <LiveRegions pair={regions} />
    </dialog>
  );
}
