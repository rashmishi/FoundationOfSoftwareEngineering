import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

const ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])';

/**
 * An icon button that opens a dropdown menu ("More actions").
 * items: { label, icon?, onSelect, danger?, disabled?, checked? } | { type: 'heading', label } | { type: 'separator' }
 * The menu is rendered in a portal so scrolling columns and cards cannot clip it.
 */
export default function Menu({ label, items, onOpenChange, icon = 'more' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const notify = useRef(onOpenChange);
  notify.current = onOpenChange;

  useEffect(() => {
    notify.current?.(open);
  }, [open]);

  const close = useCallback((restoreFocus) => {
    setOpen(false);
    setPos(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Place the menu under the button, flipping up or sliding left if it would leave the screen.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !buttonRef.current) return;
    const b = buttonRef.current.getBoundingClientRect();
    const m = menuRef.current.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(b.right - m.width, window.innerWidth - m.width - margin));
    let top = b.bottom + 4;
    if (top + m.height > window.innerHeight - margin) top = Math.max(margin, b.top - m.height - 4);
    setPos({ top, left });
  }, [open]);

  const placed = pos !== null;
  useEffect(() => {
    if (open && placed) menuRef.current?.querySelector(ITEM_SELECTOR)?.focus();
  }, [open, placed]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close(false);
    };
    const onScroll = (e) => {
      if (!menuRef.current?.contains(e.target)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  const onKeyDown = (e) => {
    const els = [...menuRef.current.querySelectorAll(ITEM_SELECTOR)];
    const i = els.indexOf(document.activeElement);
    const go = (n) => {
      e.preventDefault();
      els[(n + els.length) % els.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(els.length - 1);
    else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      close(true);
    }
  };

  const choose = (item) => {
    if (item.disabled) return;
    close(true); // return focus to the button first so dialogs opened next remember it
    item.onSelect?.();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Icon name={icon} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className="menu"
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
            onKeyDown={onKeyDown}
          >
            {items.filter(Boolean).map((item, i) => {
              if (item.type === 'separator') return <div key={i} role="separator" className="menu-sep" />;
              if (item.type === 'heading') {
                return (
                  <div key={i} role="presentation" className="menu-heading">
                    {item.label}
                  </div>
                );
              }
              const radio = item.checked !== undefined;
              return (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  role={radio ? 'menuitemradio' : 'menuitem'}
                  aria-checked={radio ? item.checked : undefined}
                  aria-disabled={item.disabled || undefined}
                  className={'menu-item' + (item.danger ? ' danger' : '')}
                  onClick={() => choose(item)}
                >
                  <span className="menu-icon">{radio ? item.checked && <Icon name="check" size={16} /> : item.icon && <Icon name={item.icon} size={16} />}</span>
                  <span className="menu-label">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
