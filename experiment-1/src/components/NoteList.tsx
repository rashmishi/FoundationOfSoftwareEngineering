import type { Column, Note } from '../types';
import { NoteCard } from './NoteCard';

interface NoteListProps {
  notes: Note[];
  total: number;
  filtering: boolean;
  columnOf: (id: string) => Column | undefined;
  isDone: (column: Column | undefined) => boolean;
}

export function NoteList({ notes, total, filtering, columnOf, isDone }: NoteListProps) {
  return (
    <section className="note-list-panel" aria-label="Notes">
      <h2 id="notes-heading" className="panel-heading">
        Notes <span className="panel-count" data-testid="note-count">{filtering ? `${notes.length} of ${total}` : total}</span>
      </h2>
      {total === 0 ? (
        <p className="empty-state">No notes yet. Add one with the form above, or import a file.</p>
      ) : notes.length === 0 ? (
        <p className="empty-state">No notes match the current search and filters.</p>
      ) : (
        <ul className="card-list note-list" aria-label="All notes">
          {notes.map((note) => {
            const column = columnOf(note.id);
            return (
              <li key={note.id}>
                <NoteCard note={note} context="list" column={column} isDone={isDone(column)} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
