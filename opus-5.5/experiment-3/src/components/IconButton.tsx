import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { hideFloating, positionFloating, showFloating } from './floating';
import { Icon, type IconName } from './Icon';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: IconName;
  /** Visible tooltip text; the accessible name starts with it (label in name, WCAG 2.5.3). */
  label: string;
  /** Extra context for the accessible name, e.g. 'note “Buy milk”'. */
  context?: string;
  /** Extra visible text shown under the label while focused (for example drag instructions). */
  hint?: ReactNode;
  focusKey?: string;
  /** Let Escape reach the button's own handler after hiding the tooltip. */
  escapePassthrough?: boolean;
  /** Show the label as visible text next to the icon too. */
  showLabel?: boolean;
}

const SHOW_DELAY = 300;
const HIDE_GRACE = 150;

/** Button with an icon and a tooltip that shows on hover and focus, can be hovered, and is dismissed with Escape (WCAG 1.4.13). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, context, hint, focusKey, escapePassthrough, showLabel, className, onFocus, onBlur, ...rest },
  forwarded,
) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const showTimer = useRef<number>();
  const hideTimer = useRef<number>();
  const tipId = useId();

  const setRefs = useCallback((el: HTMLButtonElement | null) => {
    buttonRef.current = el;
    if (typeof forwarded === 'function') forwarded(el);
    else if (forwarded) forwarded.current = el;
  }, [forwarded]);

  const clearTimers = () => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
  };
  const scheduleHide = () => {
    clearTimers();
    hideTimer.current = window.setTimeout(() => setShown(false), HIDE_GRACE);
  };
  useEffect(() => clearTimers, []);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    const button = buttonRef.current;
    if (!tip || !button) return;
    if (shown) {
      showFloating(tip);
      positionFloating(tip, button, 'above');
    } else {
      hideFloating(tip);
    }
  }, [shown, hint, focused]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShown(false);
      if (!escapePassthrough) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [shown, escapePassthrough]);

  const name = context ? `${label}, ${context}` : label;

  return (
    <span
      className="tip-wrap"
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return;
        clearTimers();
        showTimer.current = window.setTimeout(() => setShown(true), SHOW_DELAY);
      }}
      onPointerLeave={() => {
        if (!focused) scheduleHide();
      }}
    >
      <button
        ref={setRefs}
        type="button"
        className={`icon-button${showLabel ? ' with-label' : ''}${className ? ` ${className}` : ''}`}
        aria-label={showLabel ? undefined : name}
        data-focus={focusKey}
        onFocus={(e) => {
          clearTimers();
          setFocused(true);
          setShown(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          clearTimers();
          setShown(false);
          onBlur?.(e);
        }}
        {...rest}
      >
        <Icon name={icon} />
        {showLabel && <span>{label}</span>}
        {showLabel && context && <span className="sr-only">, {context}</span>}
      </button>
      {!showLabel && (
        <span
          ref={tipRef}
          id={tipId}
          className="tooltip"
          role="presentation"
          aria-hidden="true"
          popover="manual"
          hidden={!shown}
          onPointerEnter={clearTimers}
          onPointerLeave={() => {
            if (!focused) scheduleHide();
          }}
        >
          <span className="tooltip-label">{label}</span>
          {hint && focused && <span className="tooltip-hint">{hint}</span>}
        </span>
      )}
    </span>
  );
});
