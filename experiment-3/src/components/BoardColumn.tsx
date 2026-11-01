import { useDroppable } from '@dnd-kit/core';
import { notesInColumn } from '../model/reducer';
import type { Column } from '../model/types';
import { useKeyboardDrag } from '../state/KeyboardDragContext';
import { useStore } from '../state/StoreContext';
import { NoteCard } from './NoteCard';
import { noteCount } from './NotesList';

export function BoardColumn({ column }: { column: Column }) {
  const { state } = useStore();
  const kb = useKeyboardDrag();
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.id}`, data: { columnId: column.id } });
  const notes = notesInColumn(state, column.id);
  const isTarget = isOver || kb.targetColumnId === column.id;
  const headingId = `col-${column.id}-heading`;

  return (
    <li ref={setNodeRef} id={`col-${column.id}`} className={`board-column${isTarget ? ' is-drop-target' : ''}`}>
      <h3 id={headingId} tabIndex={-1}>
        {column.name}
      </h3>
      <p className="muted">{noteCount(notes.length)}</p>
      {isTarget && (
        <p className="drop-hint" aria-hidden="true">
          Drop here
        </p>
      )}
      {notes.length === 0 ? (
        <p className="muted">No notes in this column.</p>
      ) : (
        <ul aria-labelledby={headingId} className="card-list">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} variant="board" />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
