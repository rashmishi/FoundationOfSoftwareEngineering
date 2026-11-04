import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { FieldError } from './FieldError';

interface InlineRenameProps {
  label: string;
  initial: string;
  /** Returns an error message if the name cannot be used. */
  onSave: (value: string) => string | null;
  /** Called after saving or cancelling. */
  onDone: () => void;
}

/** Replaces a title with a small form. Enter saves and Esc cancels. */
export function InlineRename({ label, initial, onSave, onDone }: InlineRenameProps) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const errorId = `${id}-error`;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = onSave(value);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
    } else {
      onDone();
    }
  }

  return (
    <form className="inline-rename" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-input`}>{label}</label>
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          required
          autoComplete="off"
          dir="auto"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              onDone();
            }
          }}
        />
        <FieldError id={errorId} message={error} />
      </div>
      <div className="button-row">
        <button type="submit" className="button button-primary">
          Save
        </button>
        <button type="button" className="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
