import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '../lib/store.js';

/** A title that turns into a text field when clicked. Enter or blur saves, Escape cancels. */
export default function InlineTitle({ title, onCommit, onEditingChange }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef(null);
  const done = useRef(false); // stops blur from committing twice after Enter or Escape

  useEffect(() => {
    onEditingChange?.(editing);
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (save) => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    if (save && value.trim() !== title) onCommit(value);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="note-title"
        title="Click to edit the title"
        onClick={() => {
          done.current = false;
          setValue(title);
          setEditing(true);
        }}
      >
        <span className="vh">Edit title: </span>
        {title}
      </button>
    );
  }
  return (
    <input
      ref={inputRef}
      className="note-title-input"
      type="text"
      aria-label="Note title"
      value={value}
      maxLength={LIMITS.title}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          finish(false);
        }
      }}
    />
  );
}
