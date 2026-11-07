import { useEffect, useRef, useState } from 'react';
import Icon from './Icons.jsx';

/**
 * "More actions" dropdown (menu button pattern).
 * items: [{ label, onSelect, danger?, separator? }]
 * Arrow keys, Home and End move between items; Escape closes and returns focus to the button; Tab closes.
 */
export default function Menu({ label = 'More actions', items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const list = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapper.current && !wrapper.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector('button')?.focus();
  }, [open]);

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    const buttons = [...list.current.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (e.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next !== null) {
      e.preventDefault();
      buttons[next]?.focus();
    }
  };

  return (
    <div
      className="menu"
      ref={wrapper}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (open && e.relatedTarget && !wrapper.current.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button ref={trigger} type="button" className="icon-btn menu-trigger" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="more" />
      </button>
      {open && (
        <ul className={`menu-list ${align}`} role="menu" aria-label={label} ref={list}>
          {items.map((item, i) =>
            item.separator ? (
              <li key={`sep${i}`} role="separator" className="menu-sep" />
            ) : (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={item.danger ? 'danger' : ''}
                  onClick={() => {
                    setOpen(false);
                    // Focus goes back to the menu button first; actions that open a dialog or start an edit then move it on.
                    trigger.current?.focus();
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
