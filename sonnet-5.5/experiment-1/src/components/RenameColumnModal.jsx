import { useId, useState } from 'react';
import { LIMITS } from '../lib/store.js';
import Modal from './Modal.jsx';

export default function RenameColumnModal({ column, onSave, onClose }) {
  const uid = useId();
  const [name, setName] = useState(column.name);
  const [error, setError] = useState('');

  return (
    <Modal title="Rename column" onClose={onClose} size="sm">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setError(onSave(name));
        }}
      >
        <div className="modal-body">
          <div className="field">
            <label htmlFor={`${uid}-name`}>Column name</label>
            <input
              id={`${uid}-name`}
              type="text"
              data-autofocus
              value={name}
              maxLength={LIMITS.columnName}
              autoComplete="off"
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? `${uid}-err` : undefined}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
            />
            {error && (
              <p id={`${uid}-err`} className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Rename
          </button>
        </footer>
      </form>
    </Modal>
  );
}
