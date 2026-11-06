import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton } from './IconButton';
import { MoreIcon } from './icons';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface MenuProps {
  /** The trigger's id, so that focus can be returned to it after the page changes. */
  id: string;
  /** The accessible name, such as "More actions for Shopping list". */
  name: string;
  items: MenuItem[];
}

/** The visible area of the nearest scrolling container, such as the board. */
function visibleArea(element: HTMLElement): { top: number; bottom: number } {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) {
      const { top, bottom } = parent.getBoundingClientRect();
      return { top: Math.max(top, 0), bottom: Math.min(bottom, window.innerHeight) };
    }
  }
  return { top: 0, bottom: window.innerHeight };
}

/** A "More actions" menu button, following the WAI-ARIA menu button pattern. */
export function Menu({ id, name, items }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  // Opens upwards when there is no room below. This runs before the menu is painted.
  useLayoutEffect(() => {
    const button = buttonRef.current;
    const list = listRef.current;
    if (!isOpen || !button || !list) return;
    const area = visibleArea(button);
    const { top, bottom } = button.getBoundingClientRect();
    const height = list.offsetHeight;
    setOpensUp(bottom + height > area.bottom && top - height > area.top);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Without preventScroll, focusing an item could scroll the page under the menu.
      wrapperRef.current
        ?.querySelectorAll<HTMLElement>('[role="menuitem"]')
        [activeIndex]?.focus({ preventScroll: true });
    }
  }, [isOpen, activeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  function open(index: number) {
    setActiveIndex(index);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(event.key === 'ArrowDown' ? 0 : items.length - 1);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = items.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: activeIndex === last ? 0 : activeIndex + 1,
      ArrowUp: activeIndex === 0 ? last : activeIndex - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActiveIndex(moves[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      // Stops Esc from also cancelling a held note or closing a dialog.
      event.stopPropagation();
      close();
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      // Typing a letter moves to the next item starting with it.
      const letter = event.key.toLowerCase();
      const order = [...items.slice(activeIndex + 1), ...items.slice(0, activeIndex + 1)];
      const match = order.find((item) => item.label.toLowerCase().startsWith(letter));
      if (match) setActiveIndex(items.indexOf(match));
    }
  }

  function select(item: MenuItem) {
    // Focus returns to the trigger first, so a dialog the item opens returns focus there too.
    close();
    item.onSelect();
  }

  return (
    <div
      ref={wrapperRef}
      className="menu"
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
    >
      <IconButton
        ref={buttonRef}
        id={id}
        name={name}
        tooltip="More actions"
        icon={<MoreIcon />}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open(0))}
        onKeyDown={handleButtonKeyDown}
      />
      {isOpen && (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={name}
          className={opensUp ? 'menu-list menu-list-up' : 'menu-list'}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={index === activeIndex ? 0 : -1}
                className={item.danger ? 'menu-item menu-item-danger' : 'menu-item'}
                onClick={() => select(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
