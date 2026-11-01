import { useState, type FormEvent } from 'react';
import { addColumn, isDuplicateColumnName } from '../model/reducer';
import { useAnnouncer } from '../state/AnnouncerContext';
import { useStore } from '../state/StoreContext';
import { FieldError } from './FieldError';
import { useFieldErrorFocus } from './useFieldErrorFocus';

/** Adds a board column (FR-6.1, FR-6.2). */
export function AddColumnForm() {
  const { state, dispatch } = useStore();
  const { announce } = useAnnouncer();
  const showFieldError = useFieldErrorFocus();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const problem = !trimmed
      ? 'Column name is required.'
      : isDuplicateColumnName(state.columns, trimmed)
        ? 'A column with this name already exists.'
        : null;
    if (problem) {
      setError(problem);
      showFieldError('column-name', problem);
      return;
    }
    dispatch(addColumn(trimmed));
    announce(`Column '${trimmed}' added.`);
    setName('');
    setError(null);
  };

  return (
    <form aria-label="Add column" noValidate onSubmit={onSubmit} className="inline-form">
      <div className="field">
        <label htmlFor="column-name">Column name</label>
        <input
          id="column-name"
          type="text"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'column-name-error' : undefined}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        <FieldError id="column-name-error" message={error} />
      </div>
      <button type="submit" className="btn btn-primary">
        Add column
      </button>
    </form>
  );
}
