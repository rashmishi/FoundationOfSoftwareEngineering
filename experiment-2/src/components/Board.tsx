import { useId, useState, type DragEvent, type FormEvent } from 'react';
import { formatCount } from '../format';
import type { Column, HeldNote, Note } from '../types';
import { FieldError } from './FieldError';
import { NoteCard, type NoteActions } from './NoteCard';

export const BOARD_HEADING_ID = 'board-heading';

interface BoardProps {
  notes: Note[];
  columns: Column[];
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
  onDropNote: (noteId: string, columnId: string) => void;
  /** Returns an error message if the column cannot be added. */
  onAddColumn: (name: string) => string | null;
}

export function Board({ notes, columns, draggingId, held, actions, onDropNote, onAddColumn }: BoardProps) {
  return (
    <section className="panel board" aria-labelledby={BOARD_HEADING_ID}>
      <div className="panel-header">
        <h2 id={BOARD_HEADING_ID} tabIndex={-1}>
          Board
        </h2>
        <p className="count">{formatCount(columns.length, 'column')}</p>
      </div>
      <p className="readable-text">
        Drag a note onto a column, or choose a column on the note and press Move. With a keyboard, press Pick up on the
        note and use the arrow keys.
      </p>

      <AddColumnForm onAddColumn={onAddColumn} />

      <div className={draggingId || held ? 'columns columns-accepting' : 'columns'}>
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            notes={notes.filter((note) => note.columnId === column.id)}
            columns={columns}
            draggingId={draggingId}
            held={held}
            actions={actions}
            onDropNote={onDropNote}
          />
        ))}
      </div>
    </section>
  );
}

interface AddColumnFormProps {
  onAddColumn: (name: string) => string | null;
}

function AddColumnForm({ onAddColumn }: AddColumnFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const errorId = `${id}-error`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = onAddColumn(name);
    setError(problem);
    if (problem) {
      document.getElementById(`${id}-name`)?.focus();
    } else {
      setName('');
    }
  }

  return (
    <form className="add-column" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>
          New column name <span className="field-note">(required)</span>
        </label>
        <input
          id={`${id}-name`}
          type="text"
          required
          autoComplete="off"
          dir="auto"
          value={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        <FieldError id={errorId} message={error} />
      </div>
      <button type="submit" className="button">
        Add column
      </button>
    </form>
  );
}

interface BoardColumnProps {
  column: Column;
  notes: Note[];
  columns: Column[];
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
  onDropNote: (noteId: string, columnId: string) => void;
}

function BoardColumn({ column, notes, columns, draggingId, held, actions, onDropNote }: BoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const headingId = useId();
  const isTarget = isDragOver || held?.targetColumnId === column.id;

  /** Handles dragenter as well as dragover, as a drop target must accept both. */
  function acceptDrag(event: DragEvent<HTMLElement>) {
    // Without a note being dragged, this is some other drag, such as a file.
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    // Leaving for a child element is still inside the column.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!draggingId) return;
    event.preventDefault();
    setIsDragOver(false);
    onDropNote(draggingId, column.id);
  }

  return (
    <section
      className={isTarget ? 'column column-over' : 'column'}
      aria-labelledby={headingId}
      data-testid={`column-${column.name}`}
      onDragEnter={acceptDrag}
      onDragOver={acceptDrag}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="panel-header">
        <h3 id={headingId} dir="auto">
          {column.name}
        </h3>
        <p className="count">{formatCount(notes.length, 'note')}</p>
      </div>
      {notes.length === 0 ? (
        <p className="empty">No notes in this column.</p>
      ) : (
        <ul className="note-stack" role="list">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard
                note={note}
                columns={columns}
                location="board"
                headingLevel="h4"
                draggingId={draggingId}
                held={held}
                actions={actions}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
