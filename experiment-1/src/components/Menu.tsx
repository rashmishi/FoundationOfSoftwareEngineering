import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type MenuEntry =
  | { kind?: 'item'; label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }
  | { kind: 'separator' }
  | { kind: 'heading'; label: string };

interface MenuProps {
  label: string;
  entries: MenuEntry[];
  buttonClassName?: string;
  children: ReactNode;
}

const MENU_WIDTH = 210;

/**
 * A "More actions" button with a popup menu. The popup is portalled with fixed positioning so that it
 * is never clipped by a scrolling column.
 */
export function Menu({ label, entries, buttonClassName = 'icon-button', children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  /** Places the popup under the button, or above it when there is no room below. */
  const place = () => {
    if (!button.current) return;
    const rect = button.current.getBoundingClientRect();
    const height = menu.current?.offsetHeight ?? 0;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const below = rect.bottom + 4;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : below;
    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) close(false);
    };
    // Follow the button when the page or a column scrolls (a scroll that brought the button into view
    // can still deliver its event just after the menu opened, so closing here would be wrong).
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (e.key) {
      case 'ArrowDown':
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        focusAt(index - 1);
        break;
      case 'Home':
        focusAt(0);
        break;
      case 'End':
        focusAt(items.length - 1);
        break;
      case 'Escape':
        close();
        break;
      case 'Tab':
        close(false);
        return;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className={buttonClassName}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={label}
            className="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            onKeyDown={onMenuKeyDown}
          >
            {entries.map((entry, i) => {
              if (entry.kind === 'separator') return <div key={i} role="separator" className="menu-separator" />;
              if (entry.kind === 'heading') {
                return (
                  <div key={i} className="menu-heading" role="presentation">
                    {entry.label}
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={`menu-item${entry.danger ? ' is-danger' : ''}`}
                  aria-disabled={entry.disabled || undefined}
                  onClick={() => {
                    if (entry.disabled) return;
                    // Focus returns to the menu button first, so a dialog opened by the item restores focus there.
                    close();
                    entry.onSelect();
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
