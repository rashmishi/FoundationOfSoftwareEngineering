import { useDraggable } from '@dnd-kit/core';
import { columnOfNote, plural } from '../model/selectors';
import type { Note } from '../model/types';
import { useBoard } from '../state/BoardContext';
import { useFilters } from '../state/FilterContext';
import { useFocusManager } from '../state/FocusContext';
import { focusKeys } from '../state/focusKeys';
import { NoteCard } from './NoteCard';

function ListItem({ note }: { note: Note }) {
  const { state } = useBoard();
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: `list:${note.id}`, data: { noteId: note.id, place: 'list' } });
  return (
    <li>
      <NoteCard note={note} place="list" column={columnOfNote(state, note.id)} drag={{ setNodeRef, listeners, isDragging }} />
    </li>
  );
}

export function NoteList() {
  const { state } = useBoard();
  const { matchingIds, active, clearFilters } = useFilters();
  const { requestFocus } = useFocusManager();
  const shown = state.notes.filter((n) => matchingIds.has(n.id));
  const total = state.notes.length;

  return (
    <section className="panel notes-panel" aria-labelledby="notes-heading">
      <h2 id="notes-heading" tabIndex={-1} data-focus={focusKeys.notesHeading}>
        Notes
      </h2>
      <div className="list-status">
        <p>{active ? `Showing ${shown.length} of ${plural(total, 'note')}` : plural(total, 'note')}</p>
        {active && (
          <button
            type="button"
            className="button small"
            onClick={() => {
              // This button disappears once filters are cleared, so move focus to the list heading (FR-22).
              clearFilters();
              requestFocus(focusKeys.notesHeading);
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      {total === 0 ? (
        <p className="empty">No notes yet. Add one with the New note form.</p>
      ) : shown.length === 0 ? (
        <p className="empty">No notes match the current search.</p>
      ) : (
        <ul className="note-list" data-note-list="list" aria-label="All notes">
          {shown.map((note) => (
            <ListItem key={note.id} note={note} />
          ))}
        </ul>
      )}
    </section>
  );
}
