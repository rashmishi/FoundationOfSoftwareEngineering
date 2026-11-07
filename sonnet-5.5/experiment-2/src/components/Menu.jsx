import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from './IconButton.jsx';
import { Icon } from './Icon.jsx';

/**
 * "More actions" menu button, following the WAI-ARIA menu button pattern:
 * Enter / Space / Down arrow open it, Up and Down arrows move, Home and End jump, Escape closes it and
 * returns focus to the button, Tab closes it.
 *
 * items: { label, icon?, onSelect, danger? } | { separator: true }
 */
export function Menu({ label, tooltip = 'More actions', items, triggerRef, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ up: false, flip: false });
  const ownTriggerRef = useRef(null);
  const trigger = triggerRef || ownTriggerRef;
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const itemEls = () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || []);
  const focusItem = (index) => {
    const els = itemEls();
    if (!els.length) return;
    els[(index + els.length) % els.length]?.focus();
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };

  // Put focus on the first item when the menu opens (or the last one when opened with the Up arrow).
  const [openWith, setOpenWith] = useState('first');
  useEffect(() => {
    if (open) focusItem(openWith === 'last' ? -1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Open upwards / flip sideways when the menu would run off the screen.
  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const wrap = wrapRef.current.getBoundingClientRect();
    const below = window.innerHeight - wrap.bottom;
    const above = wrap.top;
    setPlacement({
      up: rect.height > below && above > below,
      flip: align === 'end' ? wrap.right - rect.width < 0 : wrap.left + rect.width > window.innerWidth,
    });
  }, [open, align]);

  // Close on a click or tap outside.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpenWith(e.key === 'ArrowUp' ? 'last' : 'first');
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e) => {
    const els = itemEls();
    const index = els.indexOf(document.activeElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(index + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        break;
      case 'End':
        e.preventDefault();
        focusItem(-1);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case 'Tab':
        // Let Tab continue from the button, so focus moves on to the next control.
        setOpen(false);
        trigger.current?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <span className="menu-wrap" ref={wrapRef}>
      <IconButton
        ref={trigger}
        icon="more"
        label={label}
        tooltip={tooltip}
        align="end"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpenWith('first');
          setOpen((o) => !o);
        }}
        onKeyDown={onTriggerKeyDown}
      />
      {open && (
        <ul
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          className={`menu ${placement.up ? 'menu-up' : ''} ${placement.flip ? (align === 'end' ? 'menu-start' : 'menu-end') : `menu-${align}`}`}
          onKeyDown={onMenuKeyDown}
        >
          {items
            .filter(Boolean)
            .map((item, i) =>
              item.separator ? (
                <li key={`sep-${i}`} role="separator" className="menu-separator" />
              ) : (
                <li key={item.label} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className={`menu-item ${item.danger ? 'is-danger' : ''}`}
                    onClick={() => {
                      close();
                      item.onSelect();
                    }}
                  >
                    {item.icon && <Icon name={item.icon} />}
                    <span>{item.label}</span>
                  </button>
                </li>
              ),
            )}
        </ul>
      )}
    </span>
  );
}
