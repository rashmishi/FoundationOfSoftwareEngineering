import { forwardRef, useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';

/**
 * A button that shows only an icon. Its accessible name is `label`. The same text (or the shorter
 * `tooltip`, which must be contained in `label`) appears as a tooltip that (WCAG 1.4.13) shows on
 * hover and keyboard focus, can be hovered over without disappearing, and is dismissed with Escape.
 */
export const IconButton = forwardRef(function IconButton(
  { icon, label, tooltip, align = 'center', className = '', onPointerDown, onFocus, onBlur, ...rest },
  ref,
) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // Close only the tooltip; a second Escape then closes any dialog or menu around it.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <span className="tip-wrap" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        ref={ref}
        type="button"
        className={`btn icon-btn ${className}`.trim()}
        aria-label={label}
        onFocus={(e) => {
          setOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setOpen(false);
          onBlur?.(e);
        }}
        onPointerDown={(e) => {
          setOpen(false);
          onPointerDown?.(e);
        }}
        {...rest}
      >
        <Icon name={icon} />
      </button>
      {open && (
        <span className="tooltip" data-align={align} aria-hidden="true">
          <span className="tooltip-bubble">{tooltip ?? label}</span>
        </span>
      )}
    </span>
  );
});
