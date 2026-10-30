import { useId, useRef, useState, type FormEvent } from 'react';
import { LIMITS } from '../types';
import { useNotes } from '../state/NotesContext';
import { validateColumnName } from '../state/notesReducer';

export function AddColumnForm() {
  const id = useId();
  const { state, dispatch, announce } = useNotes();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateColumnName(name, state.columns);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    dispatch({ type: 'addColumn', name });
    announce('success', `Column “${name.trim()}” added.`);
    setName('');
    setError(null);
  }

  return (
    <form className="add-column" aria-label="Add column" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>New column name</label>
        <div className="inline">
          <input
            ref={inputRef}
            id={`${id}-name`}
            type="text"
            value={name}
            maxLength={LIMITS.columnName}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
          />
          <button type="submit" className="button primary">
            Add column
          </button>
        </div>
        {error && (
          <p id={`${id}-error`} className="field-error">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
