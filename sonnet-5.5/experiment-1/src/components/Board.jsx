import { useId, useState } from 'react';
import { useApp } from '../context.js';
import { LIMITS } from '../lib/store.js';
import Column from './Column.jsx';
import Icon from './Icon.jsx';

function AddColumnForm() {
  const { actions } = useApp();
  const uid = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const err = actions.addColumn(name);
    setError(err);
    if (!err) setName('');
  };

  return (
    <form className="add-column" onSubmit={submit} noValidate>
      <label htmlFor={`${uid}-name`} className="vh">
        New column name
      </label>
      <input
        id={`${uid}-name`}
        type="text"
        value={name}
        maxLength={LIMITS.columnName}
        placeholder="New column name"
        autoComplete="off"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${uid}-err` : undefined}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError('');
        }}
      />
      <button type="submit" className="btn btn-sm">
        <Icon name="plus" size={16} /> Add column
      </button>
      {error && (
        <p id={`${uid}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function Board() {
  const { state } = useApp();
  return (
    <section className="panel board-panel" aria-labelledby="board-heading">
      <div className="panel-head">
        <h2 id="board-heading">Board</h2>
        <AddColumnForm />
      </div>
      {state.columns.length === 0 ? (
        <div className="empty">
          <p>
            <strong>The board has no columns.</strong>
          </p>
          <p>Add a column above to start organising notes.</p>
        </div>
      ) : (
        <div className="board">
          {state.columns.map((c, i) => (
            <Column key={c.id} column={c} index={i} total={state.columns.length} />
          ))}
        </div>
      )}
    </section>
  );
}
