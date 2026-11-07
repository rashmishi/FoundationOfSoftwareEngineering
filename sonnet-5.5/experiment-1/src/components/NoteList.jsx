import { useApp } from '../context.js';
import { hasActiveFilters, matchesFilters } from '../lib/store.js';
import Icon from './Icon.jsx';
import NoteCard from './NoteCard.jsx';

export default function NoteList() {
  const { state, today, filters, actions } = useApp();
  // Newest first, so a note you just created is at the top.
  const visible = [...state.notes].reverse().filter((n) => matchesFilters(state, n, filters, today));

  return (
    <section className="panel list-panel" aria-labelledby="list-heading">
      <div className="panel-head">
        <h2 id="list-heading">
          Notes <span className="count">{state.notes.length}</span>
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.openCreate()}>
          <Icon name="plus" size={16} /> New note
        </button>
      </div>
      <p className="panel-hint">Drag a note onto a board column to organise it.</p>

      {state.notes.length === 0 ? (
        <div className="empty">
          <p>
            <strong>No notes yet.</strong>
          </p>
          <p>Create your first note, or import a JSON file.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p>
            <strong>No notes match your search.</strong>
          </p>
          {hasActiveFilters(filters) && (
            <button type="button" className="btn btn-sm" onClick={actions.clearFilters}>
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <ul className="note-list" aria-label="Notes">
          {visible.map((n) => (
            <li key={n.id} className="note-item">
              <NoteCard note={n} variant="list" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
