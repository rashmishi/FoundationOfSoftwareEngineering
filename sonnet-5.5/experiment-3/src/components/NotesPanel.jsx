import { useState } from 'react';
import { PRIORITIES, PRIORITY_LABELS, isOverdue } from '../lib/helpers.js';
import { columnOf } from '../state/reducer.js';
import Icon from './Icons.jsx';
import NoteCard from './NoteCard.jsx';
import NoteFields, { checkDraft, emptyDraft, focusTitle } from './NoteFields.jsx';

export const emptyFilters = { text: '', priority: 'all', tag: 'all', overdue: false };

export function filterNotes(notes, filters) {
  const text = filters.text.trim().toLowerCase();
  return notes.filter((n) => {
    if (text && !`${n.title} ${n.description} ${n.tags.join(' ')}`.toLowerCase().includes(text)) return false;
    if (filters.priority !== 'all' && n.priority !== filters.priority) return false;
    if (filters.tag !== 'all' && !n.tags.includes(filters.tag)) return false;
    if (filters.overdue && !isOverdue(n.dueDate)) return false;
    return true;
  });
}

function NewNoteForm({ onCreate }) {
  const [draft, setDraft] = useState(emptyDraft());
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const { errors: found, values } = checkDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      focusTitle('new');
      onCreate(null);
      return;
    }
    onCreate(values);
    setDraft(emptyDraft());
    focusTitle('new');
  };

  return (
    <form className="new-note" onSubmit={submit} noValidate aria-labelledby="new-note-heading">
      <h3 id="new-note-heading">New note</h3>
      <NoteFields idPrefix="new" draft={draft} errors={errors} onChange={setDraft} />
      <button type="submit" className="btn btn-primary">
        <Icon name="plus" size={16} /> Add note
      </button>
    </form>
  );
}

export default function NotesPanel({ state, filters, setFilters, shared, onCreate }) {
  const allTags = [...new Set(state.notes.flatMap((n) => n.tags))].sort();
  const visible = filterNotes(state.notes, filters);
  const filtering = filters.text || filters.priority !== 'all' || filters.tag !== 'all' || filters.overdue;
  const set = (field) => (e) => setFilters({ ...filters, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <section className="panel notes-panel" aria-labelledby="notes-heading">
      <div className="panel-head">
        <h2 id="notes-heading">Notes</h2>
      </div>

      <NewNoteForm onCreate={onCreate} />

      <div className="filters" role="search" aria-label="Search and filter notes">
        <div className="search">
          <Icon name="search" size={16} />
          <label htmlFor="filter-text" className="sr-label">
            Search notes
          </label>
          <input id="filter-text" type="search" placeholder="Search notes" value={filters.text} onChange={set('text')} />
        </div>
        <label htmlFor="filter-priority" className="sr-label">
          Filter by priority
        </label>
        <select id="filter-priority" value={filters.priority} onChange={set('priority')}>
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <label htmlFor="filter-tag" className="sr-label">
          Filter by tag
        </label>
        <select id="filter-tag" value={filters.tag} onChange={set('tag')}>
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={filters.overdue} onChange={set('overdue')} /> Overdue only
        </label>
        {filtering && (
          <button type="button" className="btn btn-link" onClick={() => setFilters(emptyFilters)}>
            Clear filters
          </button>
        )}
      </div>

      <p className="result-count" role="status" aria-live="polite">
        Showing {visible.length} of {state.notes.length} {state.notes.length === 1 ? 'note' : 'notes'}
      </p>

      <div className="note-list">
        {visible.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            variant="list"
            columns={state.columns}
            currentColumn={columnOf(state, note.id)}
            dragging={shared.dragging === note.id}
            onDragStart={shared.onDragStart}
            onDragEnd={shared.onDragEnd}
            onEdit={shared.onEdit}
            onDelete={shared.onDelete}
            onRename={shared.onRenameNote}
            onMove={shared.onMove}
          />
        ))}
        {state.notes.length === 0 && <p className="empty">No notes yet. Add your first note above.</p>}
        {state.notes.length > 0 && visible.length === 0 && <p className="empty">No notes match the current search or filters.</p>}
      </div>
    </section>
  );
}
