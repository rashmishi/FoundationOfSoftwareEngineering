import { useStore } from '../state/StoreContext';
import { NoteCard } from './NoteCard';

export const noteCount = (n: number) => `${n} ${n === 1 ? 'note' : 'notes'}`;

/** All notes, whether or not they are on the board (FR-2). */
export function NotesList() {
  const { state } = useStore();
  return (
    <section aria-labelledby="notes-heading" className="panel">
      <h2 id="notes-heading" tabIndex={-1}>
        Notes
      </h2>
      <p className="muted">{noteCount(state.notes.length)}</p>
      {state.notes.length === 0 ? (
        <p>No notes yet. Create one with the form above.</p>
      ) : (
        <ul aria-labelledby="notes-heading" className="card-list">
          {state.notes.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} variant="list" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
