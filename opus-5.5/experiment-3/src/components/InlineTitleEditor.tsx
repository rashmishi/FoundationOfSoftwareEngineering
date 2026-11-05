import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Note } from '../model/types';
import { LIMITS, titleError } from '../model/validation';
import { useAnnouncer } from '../state/AnnouncerContext';
import { describedBy, FieldError } from './FieldError';

interface Props {
  note: Note;
  /** title is the new title when saved; null when cancelled. returnFocus: whether focus should go back to the title. */
  onDone: (title: string | null, returnFocus: boolean) => void;
}

/** Inline rename (FR-15): visible label, Enter saves, Escape cancels, blur saves if valid or cancels. */
export function InlineTitleEditor({ note, onDone }: Props) {
  const [value, setValue] = useState(note.title);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const id = useId();
  const { announce } = useAnnouncer();

  useLayoutEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const finish = (title: string | null, returnFocus: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(title, returnFocus);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const err = titleError(value);
      if (err) {
        setError(err);
        return;
      }
      finish(value.trim(), true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      finish(null, true);
    }
  };

  const onBlur = () => {
    if (finished.current) return;
    if (titleError(value)) {
      announce('Rename cancelled. Title not changed.');
      finish(null, false);
    } else finish(value.trim(), false);
  };

  return (
    <div className="inline-editor">
      <label htmlFor={`${id}-input`}>Note title</label>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="text"
        value={value}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(`${id}-hint`, error && `${id}-err`)}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <p id={`${id}-hint`} className="hint">
        Enter to save, Escape to cancel. Up to {LIMITS.title} characters.
      </p>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}
