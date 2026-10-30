import { useId } from 'react';
import type { Note } from '../types';
import { useNotes } from '../state/NotesContext';

const UNASSIGNED = '';

/** Keyboard- and screen-reader-friendly alternative to dragging a note (WCAG 2.5.7). */
export function MoveToColumn({ note }: { note: Note }) {
  const id = useId();
  const { state, dispatch, announce } = useNotes();

  function handleChange(value: string) {
    const columnId = value === UNASSIGNED ? null : value;
    dispatch({ type: 'moveNote', id: note.id, columnId });
    const column = state.columns.find((c) => c.id === columnId);
    announce('success', column ? `“${note.title}” moved to ${column.name}.` : `“${note.title}” removed from the board.`);
  }

  return (
    <div className="move-to">
      <label htmlFor={id}>
        Column<span className="visually-hidden"> for “{note.title}”</span>
      </label>
      <select id={id} value={note.columnId ?? UNASSIGNED} onChange={(e) => handleChange(e.target.value)}>
        <option value={UNASSIGNED}>Unassigned</option>
        {state.columns.map((column) => (
          <option key={column.id} value={column.id}>
            {column.name}
          </option>
        ))}
      </select>
    </div>
  );
}
