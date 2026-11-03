import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface InlineEditProps {
  value: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Return an error message to keep the field open, or null when saved. */
  onSave: (value: string) => string | null;
  label: string;
  maxLength: number;
  className?: string;
  children: React.ReactNode;
}

/** Shows `children` normally; while `editing`, a text field that saves on Enter/blur and cancels on Escape. */
export function InlineEdit({ value, editing, onEditingChange, onSave, label, maxLength, className = '', children }: InlineEditProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setError(null);
      cancelled.current = false;
      input.current?.focus();
      input.current?.select();
    }
  }, [editing, value]);

  if (!editing) return <>{children}</>;

  const commit = () => {
    if (cancelled.current) return;
    if (draft.trim() === value) {
      onEditingChange(false);
      return;
    }
    const problem = onSave(draft);
    if (problem) {
      setError(problem);
      input.current?.focus();
    } else {
      onEditingChange(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelled.current = true;
      onEditingChange(false);
    }
  };

  return (
    <span className={`inline-edit ${className}`}>
      <input
        ref={input}
        className="inline-edit-input"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        value={draft}
        maxLength={maxLength}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (error) {
            cancelled.current = true;
            onEditingChange(false);
          } else commit();
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
