import { useState } from 'react';
import { useBoard } from '../state/board.jsx';
import { Dialog } from './Dialog.jsx';
import { FieldError } from './fields.jsx';
import { Icon } from './Icon.jsx';
import { LIMITS, validateColumnName } from '../lib/noteModel.js';
import { playSound } from '../lib/sound.js';

export function RenameColumnDialog({ columnId, onClose }) {
  const { state, actions } = useBoard();
  const column = state.columns.find((c) => c.id === columnId);
  const [name, setName] = useState(column?.name ?? '');
  const [error, setError] = useState('');
  if (!column) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    const problem = validateColumnName(name, state.columns, column.id);
    if (problem) {
      setError(problem);
      playSound('error');
      e.currentTarget.elements.columnName.focus();
      return;
    }
    if (name.trim() !== column.name) actions.renameColumn(column.id, name);
    onClose();
  };

  return (
    <Dialog title="Rename column" onClose={onClose} className="dialog-small">
      <form noValidate onSubmit={onSubmit} className="dialog-body">
        <div className="field">
          <label htmlFor="rename-column-name" className="field-label">
            Column name <span className="required">(required)</span>
          </label>
          <p className="field-hint" id="rename-column-name-hint">
            Up to {LIMITS.columnName} characters.
          </p>
          <input
            id="rename-column-name"
            name="columnName"
            type="text"
            className="input"
            value={name}
            autoComplete="off"
            data-autofocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'rename-column-name-hint rename-column-name-error' : 'rename-column-name-hint'}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
          <FieldError id="rename-column-name">{error}</FieldError>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Icon name="check" />
            Save name
          </button>
        </div>
      </form>
    </Dialog>
  );
}
