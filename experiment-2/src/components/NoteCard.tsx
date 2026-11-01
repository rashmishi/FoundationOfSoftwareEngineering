import { useId, useState, type DragEvent, type KeyboardEvent } from 'react';
import type { Column, HeldNote, Note, NoteLocation } from '../types';

export interface NoteActions {
  onEdit: (note: Note) => void;
  onDelete: (note: Note, location: NoteLocation) => void;
  onMove: (note: Note, columnId: string | null, location: NoteLocation) => void;
  onDragStart: (noteId: string) => void;
  onDragEnd: () => void;
  onPickUpOrDrop: (note: Note, location: NoteLocation) => void;
  onHeldStep: (step: number) => void;
  onHeldCancel: () => void;
}

interface NoteCardProps {
  note: Note;
  columns: Column[];
  location: NoteLocation;
  headingLevel: 'h3' | 'h4';
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
}

/** The form value standing for "not on the board". */
const NO_COLUMN = '';

export const PICK_UP_INSTRUCTIONS_ID = 'pick-up-instructions';

const HELD_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

export function moveButtonId(location: NoteLocation, noteId: string): string {
  return `${location}-move-${noteId}`;
}

export function pickUpButtonId(location: NoteLocation, noteId: string): string {
  return `${location}-pick-up-${noteId}`;
}

export function NoteCard({ note, columns, location, headingLevel: Heading, draggingId, held, actions }: NoteCardProps) {
  const currentValue = note.columnId ?? NO_COLUMN;
  // Null until the user picks a column, so the select follows moves made by dragging.
  const [pickedValue, setPickedValue] = useState<string | null>(null);
  const headingId = useId();
  const selectId = `${location}-column-${note.id}`;
  const columnName = columns.find((column) => column.id === note.columnId)?.name;
  const isHeldHere = held?.noteId === note.id && held.location === location;
  const isLifted = draggingId === note.id || held?.noteId === note.id;

  function handleDragStart(event: DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = 'move';
    // Firefox needs data set to start a drag. A custom type means that the note
    // cannot be dropped as text into a form field.
    event.dataTransfer.setData('application/x-notes-board-note', note.id);
    actions.onDragStart(note.id);
  }

  function handleMove() {
    actions.onMove(note, (pickedValue ?? currentValue) || null, location);
    setPickedValue(null);
  }

  function handlePickUpKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isHeldHere) return;
    if (event.key in HELD_STEPS) {
      event.preventDefault();
      actions.onHeldStep(HELD_STEPS[event.key]);
    } else if (event.key === 'Escape') {
      actions.onHeldCancel();
    }
  }

  return (
    <article
      className={isLifted ? 'note note-dragging' : 'note'}
      aria-labelledby={headingId}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={actions.onDragEnd}
    >
      <div className="note-header">
        <Heading id={headingId} className="note-title" dir="auto">
          {note.title}
        </Heading>
        <svg className="note-grip" viewBox="0 0 10 16" aria-hidden="true">
          {[3, 8, 13].flatMap((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
        </svg>
      </div>

      {note.description && (
        <p className="note-description" dir="auto">
          {note.description}
        </p>
      )}

      {note.tags.length > 0 && (
        <ul className="tags" role="list" aria-label={`Tags for ${note.title}`}>
          {note.tags.map((tag) => (
            <li key={tag} className="tag" dir="auto">
              {tag}
            </li>
          ))}
        </ul>
      )}

      {location === 'list' && (
        <p className="note-column">{columnName ? `On board: ${columnName}` : 'Not on board'}</p>
      )}

      <div className="note-move">
        <div className="field">
          <label htmlFor={selectId}>
            Column<span className="visually-hidden"> for {note.title}</span>
          </label>
          <select
            id={selectId}
            value={pickedValue ?? currentValue}
            onChange={(event) => setPickedValue(event.target.value)}
          >
            <option value={NO_COLUMN}>Not on board</option>
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
        <button id={moveButtonId(location, note.id)} type="button" className="button" onClick={handleMove}>
          Move<span className="visually-hidden"> {note.title}</span>
        </button>
      </div>

      <div className="button-row" role="group" aria-label={`Actions for ${note.title}`}>
        <button type="button" className="button" onClick={() => actions.onEdit(note)}>
          Edit<span className="visually-hidden"> {note.title}</span>
        </button>
        <button type="button" className="button button-danger" onClick={() => actions.onDelete(note, location)}>
          Delete<span className="visually-hidden"> {note.title}</span>
        </button>
        <button
          id={pickUpButtonId(location, note.id)}
          type="button"
          className={isHeldHere ? 'button button-primary' : 'button'}
          aria-describedby={PICK_UP_INSTRUCTIONS_ID}
          onClick={() => actions.onPickUpOrDrop(note, location)}
          onKeyDown={handlePickUpKeyDown}
          onBlur={() => {
            if (isHeldHere) actions.onHeldCancel();
          }}
        >
          {isHeldHere ? 'Drop' : 'Pick up'}
          <span className="visually-hidden"> {note.title}</span>
        </button>
      </div>
    </article>
  );
}
