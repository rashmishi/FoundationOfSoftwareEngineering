import { useEffect, useState, type ButtonHTMLAttributes, type FocusEvent, type ReactNode, type Ref } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The full accessible name, such as "Edit Shopping list". */
  name: string;
  /** The short visible tooltip, such as "Edit". The name should start with it. */
  tooltip: string;
  icon: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A button that shows only an icon, with a tooltip on hover and keyboard focus.
 * The tooltip meets WCAG 1.4.13: Esc hides it, the pointer can move onto it,
 * and it stays until the pointer or focus leaves.
 */
export function IconButton({ name, tooltip, icon, ref, className = '', ...props }: IconButtonProps) {
  const { onPointerEnter, onPointerLeave, onFocus, onBlur, ...rest } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isVisible = (isHovered || isFocused) && !isDismissed && props['aria-expanded'] !== true;

  useEffect(() => {
    if (!isVisible) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsDismissed(true);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={name}
      className={`icon-button ${className}`}
      onPointerEnter={(event) => {
        setIsHovered(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setIsHovered(false);
        setIsDismissed(false);
        onPointerLeave?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLButtonElement>) => {
        // A mouse click also focuses the button, but hovering already shows the tooltip.
        setIsFocused(event.currentTarget.matches(':focus-visible'));
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        setIsDismissed(false);
        onBlur?.(event);
      }}
      {...rest}
    >
      {icon}
      <span className="tooltip" aria-hidden="true" data-visible={isVisible}>
        {tooltip}
      </span>
    </button>
  );
}
