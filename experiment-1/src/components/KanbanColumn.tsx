import { useRef, useState, type DragEvent } from 'react';
import type { Column, Note } from '../types';
import { getDraggedNoteId, isNoteDrag } from '../dnd';
import { useNotes } from '../state/NotesContext';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({ column, notes }: { column: Column; notes: Note[] }) {
  const { state, dispatch, announce } = useNotes();
  const [isOver, setIsOver] = useState(false);
  // dragenter/dragleave fire for every child element; count them to know when we really left.
  const depth = useRef(0);
  const headingId = `column-${column.id}-heading`;

  function handleDragEnter(event: DragEvent) {
    if (!isNoteDrag(event)) return;
    event.preventDefault();
    depth.current += 1;
    setIsOver(true);
  }

  function handleDragOver(event: DragEvent) {
    if (!isNoteDrag(event)) return;
    // Only columns accept drops; everywhere else the browser rejects them (FR-4.5).
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDragLeave(event: DragEvent) {
    if (!isNoteDrag(event)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setIsOver(false);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    depth.current = 0;
    setIsOver(false);
    const noteId = getDraggedNoteId(event);
    const note = state.notes.find((n) => n.id === noteId);
    if (!note || note.columnId === column.id) return;
    dispatch({ type: 'moveNote', id: note.id, columnId: column.id });
    announce('success', `“${note.title}” moved to ${column.name}.`);
  }

  return (
    <section
      className={`column${isOver ? ' is-drop-target' : ''}`}
      aria-labelledby={headingId}
      data-testid={`column-${column.id}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h3 id={headingId} className="column-title">
        {column.name} <span className="count">({notes.length})</span>
      </h3>
      {notes.length === 0 ? (
        <p className="column-empty">Drop notes here</p>
      ) : (
        <ul className="cards" aria-labelledby={headingId}>
          {notes.map((note) => (
            <KanbanCard key={note.id} note={note} />
          ))}
        </ul>
      )}
    </section>
  );
}
