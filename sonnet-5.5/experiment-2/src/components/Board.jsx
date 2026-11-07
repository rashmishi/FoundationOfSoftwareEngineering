import { useState } from 'react';
import { useBoard } from '../state/board.jsx';
import { Column } from './Column.jsx';
import { Icon } from './Icon.jsx';
import { FieldError } from './fields.jsx';
import { validateColumnName, LIMITS } from '../lib/noteModel.js';
import { playSound } from '../lib/sound.js';

function AddColumnForm() {
  const { state, actions } = useBoard();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    const problem = validateColumnName(name, state.columns);
    if (problem) {
      setError(problem);
      playSound('error');
      e.currentTarget.elements.columnName.focus();
      return;
    }
    actions.addColumn(name);
    setName('');
    setError('');
  };

  return (
    <form className="add-column" noValidate onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="new-column-name" className="field-label">
          New column name <span className="required">(required)</span>
        </label>
        <div className="inline-field">
          <input
            id="new-column-name"
            name="columnName"
            type="text"
            className="input"
            value={name}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'new-column-name-error' : 'new-column-name-hint'}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
          <button type="submit" className="btn btn-primary">
            <Icon name="plus" />
            Add column
          </button>
        </div>
        <p className="field-hint" id="new-column-name-hint" hidden={!!error}>
          For example “Review”. Up to {LIMITS.columnName} characters.
        </p>
        <FieldError id="new-column-name">{error}</FieldError>
      </div>
    </form>
  );
}

/** `visibleIds` is the set of note ids that pass the current search and filters. */
export function Board({ visibleIds, filtering }) {
  const { state } = useBoard();
  const byId = new Map(state.notes.map((n) => [n.id, n]));

  return (
    <section className="panel board" aria-labelledby="board-heading">
      <div className="panel-head">
        <h2 id="board-heading" tabIndex={-1} className="panel-title">
          Board
        </h2>
      </div>
      <AddColumnForm />
      <p className="hint">
        Each column holds notes. Drag a note onto a column, or use a note’s <strong>More actions</strong> menu and choose a “Move to” option.
      </p>
      {state.columns.length === 0 ? (
        <p className="empty">The board has no columns. Add a column above to start organising notes.</p>
      ) : (
        <div className="columns">
          {state.columns.map((column, index) => (
            <Column
              key={column.id}
              column={column}
              index={index}
              columnCount={state.columns.length}
              total={column.noteIds.length}
              filtering={filtering}
              notes={column.noteIds.map((id) => byId.get(id)).filter((n) => n && visibleIds.has(n.id))}
            />
          ))}
        </div>
      )}
    </section>
  );
}
