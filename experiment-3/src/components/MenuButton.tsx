import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAnnouncer } from '../state/AnnouncerContext';
import { hideFloating, positionFloating, showFloating } from './floating';
import { IconButton } from './IconButton';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  /** When set, the item is shown as unavailable and this reason is announced if it is chosen (FR-16.3). */
  unavailable?: string;
  danger?: boolean;
}

interface MenuButtonProps {
  /** Visible tooltip: "More actions". */
  label?: string;
  context: string;
  items: MenuItem[];
  focusKey?: string;
}

/** WAI-ARIA APG menu button (FR-16). */
export function MenuButton({ label = 'More actions', context, items, focusKey }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const buttonId = useId();
  const { announce } = useAnnouncer();

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    if (open) {
      showFloating(menu);
      if (buttonRef.current) positionFloating(menu, buttonRef.current, 'below');
    } else hideFloating(menu);
  }, [open]);

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const reposition = () => menuRef.current && buttonRef.current && positionFloating(menuRef.current, buttonRef.current, 'below');
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const activate = (item: MenuItem) => {
    if (item.unavailable) {
      announce(`Unavailable: ${item.label}. ${item.unavailable}`);
      return;
    }
    // Focus the button first, so a dialog opened by the item returns focus here.
    close(true);
    item.onSelect();
  };

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(items.length - 1);
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = items.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => (i === last ? 0 : i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => (i === 0 ? last : i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(last);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        e.preventDefault();
        close(true);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const ch = e.key.toLowerCase();
          for (let step = 1; step <= items.length; step++) {
            const i = (active + step) % items.length;
            if (items[i].label.toLowerCase().startsWith(ch)) {
              setActive(i);
              break;
            }
          }
        }
    }
  };

  return (
    <span className="menu-wrap">
      <IconButton
        ref={buttonRef}
        id={buttonId}
        icon="more"
        label={label}
        context={context}
        focusKey={focusKey}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? close(false) : openAt(0))}
        onKeyDown={onButtonKeyDown}
      />
      <ul
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-labelledby={buttonId}
        className="menu"
        popover="manual"
        hidden={!open}
        onKeyDown={onMenuKeyDown}
      >
        {items.map((item, i) => (
          <li role="none" key={item.label}>
            <button
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.unavailable ? true : undefined}
              className={`menu-item${item.danger ? ' danger' : ''}`}
              onClick={() => activate(item)}
              onFocus={() => setActive(i)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </span>
  );
}
