import { useId, useState, type FormEvent } from 'react';
import { COLUMN_NAME_MAX } from '../model/notes';
import { PlusIcon } from './Icons';

export function AddColumnForm({ onAdd }: { onAdd: (name: string) => string | null }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = onAdd(name);
    if (problem) {
      setError(problem);
    } else {
      setName('');
      setError(null);
    }
  };

  return (
    <form className="add-column" onSubmit={submit} noValidate aria-label="Add column">
      <label htmlFor={inputId} className="add-column-label">
        New column
      </label>
      <input
        id={inputId}
        className="input"
        value={name}
        maxLength={COLUMN_NAME_MAX}
        placeholder="Column name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
      />
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button button-primary">
        <PlusIcon /> Add column
      </button>
    </form>
  );
}
