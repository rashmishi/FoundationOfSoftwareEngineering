import { useId, useRef, useState, type FormEvent } from 'react';
import { newId } from '../model/ids';
import { columnNameError, LIMITS } from '../model/validation';
import { useBoard } from '../state/BoardContext';
import { useFocusManager } from '../state/FocusContext';
import { focusKeys } from '../state/focusKeys';
import { usePreferences } from '../state/PreferencesContext';
import { useToasts } from '../state/ToastContext';
import { quote } from '../state/useNoteActions';
import { describedBy, FieldError } from './FieldError';
import { Icon } from './Icon';

export function AddColumnForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const { state, commit } = useBoard();
  const { notify } = useToasts();
  const { requestFocus } = useFocusManager();
  const { play } = usePreferences();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = columnNameError(name, state.columns);
    setError(err);
    if (err) {
      play('error');
      inputRef.current?.focus();
      return;
    }
    const column = { id: newId('col'), name: name.trim(), collapsed: false, noteIds: [] };
    commit({ type: 'addColumn', column });
    play('create');
    notify({ text: `Column ${quote(column.name)} added.` });
    setName('');
    requestFocus(focusKeys.columnHeading(column.id));
  };

  return (
    <form className="add-column" noValidate onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor={`${id}-name`}>
          Column name <span className="required">(required)</span>
        </label>
        <p id={`${id}-hint`} className="hint">Up to {LIMITS.columnName} characters.</p>
        <div className="inline-form-row">
          <input
            ref={inputRef}
            id={`${id}-name`}
            type="text"
            required
            autoComplete="off"
            value={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(`${id}-hint`, error && `${id}-err`)}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="button">
            <Icon name="plus" />
            <span>Add column</span>
          </button>
        </div>
        <FieldError id={`${id}-err`} message={error} />
      </div>
    </form>
  );
}
