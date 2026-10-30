import { useRef } from 'react';
import { useNotes } from '../state/NotesContext';
import { NoteItem } from './NoteItem';

export function NoteList() {
  const { state } = useNotes();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const count = state.notes.length;

  return (
    <section className="note-list" aria-labelledby="note-list-heading">
      <h2 id="note-list-heading" ref={headingRef} tabIndex={-1}>
        All notes <span className="count">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="empty">No notes yet. Create one above, or import a JSON file.</p>
      ) : (
        <>
          <p className="hint">Drag a note onto a board column, or choose a column from its menu.</p>
          <ul className="notes" aria-labelledby="note-list-heading">
            {state.notes.map((note) => (
              <NoteItem key={note.id} note={note} onDeleted={() => headingRef.current?.focus()} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
