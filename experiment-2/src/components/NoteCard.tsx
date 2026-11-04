import { useId, useState, type DragEvent, type KeyboardEvent } from 'react';
import { dueStatus, formatDate } from '../dates';
import { PRIORITY_LABELS, tagColour } from '../notes';
import type { Column, HeldNote, Note, NoteLocation, ReorderTarget } from '../types';
import { IconButton } from './IconButton';
import { AlertIcon, CalendarIcon, DeleteIcon, EditIcon, PickUpIcon, PriorityIcon } from './icons';
import { InlineRename } from './InlineRename';
import { Menu, type MenuItem } from './Menu';

export interface NoteActions {
  onEdit: (note: Note) => void;
  onDelete: (note: Note, location: NoteLocation) => void;
  onMove: (note: Note, columnId: string | null, location: NoteLocation) => void;
  /** Returns an error message if the title cannot be used. */
  onRename: (note: Note, title: string) => string | null;
  onReorder: (note: Note, target: ReorderTarget) => void;
  onDragStart: (noteId: string) => void;
  onDragEnd: () => void;
  onPickUpOrDrop: (note: Note, location: NoteLocation) => void;
  onHeldColumnStep: (step: number) => void;
  onHeldPositionStep: (step: number) => void;
  onHeldCancel: () => void;
}

interface NoteCardProps {
  note: Note;
  columns: Column[];
  location: NoteLocation;
  headingLevel: 'h3' | 'h4';
  /** The note's position in its board column and how many notes that column has. */
  position?: { index: number; count: number };
  today: string;
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
}

/** The form value standing for "not on the board". */
const NO_COLUMN = '';

export const PICK_UP_INSTRUCTIONS_ID = 'pick-up-instructions';

const COLUMN_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
const POSITION_STEPS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

export function moveButtonId(location: NoteLocation, noteId: string): string {
  return `${location}-move-${noteId}`;
}

export function pickUpButtonId(location: NoteLocation, noteId: string): string {
  return `${location}-pick-up-${noteId}`;
}

export function moreButtonId(location: NoteLocation, noteId: string): string {
  return `${location}-more-${noteId}`;
}

const DUE_TEXT = {
  overdue: (date: string) => `Overdue: due ${date}`,
  today: () => 'Due today',
  upcoming: (date: string) => `Due ${date}`,
};

export function NoteCard(props: NoteCardProps) {
  const { note, columns, location, headingLevel: Heading, position, today, draggingId, held, actions } = props;
  const currentValue = note.columnId ?? NO_COLUMN;
  // Null until the user picks a column, so the select follows moves made by dragging.
  const [pickedValue, setPickedValue] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const headingId = useId();
  const selectId = `${location}-column-${note.id}`;
  const columnName = columns.find((column) => column.id === note.columnId)?.name;
  const isHeldHere = held?.noteId === note.id && held.location === location;
  const isLifted = draggingId === note.id || held?.noteId === note.id;
  const due = dueStatus(note.dueDate, today);

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
    if (event.key in COLUMN_STEPS) {
      event.preventDefault();
      actions.onHeldColumnStep(COLUMN_STEPS[event.key]);
    } else if (event.key in POSITION_STEPS) {
      event.preventDefault();
      actions.onHeldPositionStep(POSITION_STEPS[event.key]);
    } else if (event.key === 'Escape') {
      actions.onHeldCancel();
    }
  }

  function finishRenaming() {
    setIsRenaming(false);
    document.getElementById(moreButtonId(location, note.id))?.focus();
  }

  const menuItems: MenuItem[] = [
    { label: 'Rename', onSelect: () => setIsRenaming(true) },
    { label: 'Edit details', onSelect: () => actions.onEdit(note) },
  ];
  if (position && position.index > 0) {
    menuItems.push(
      { label: 'Move up', onSelect: () => actions.onReorder(note, 'up') },
      { label: 'Move to top', onSelect: () => actions.onReorder(note, 'top') },
    );
  }
  if (position && position.index < position.count - 1) {
    menuItems.push(
      { label: 'Move down', onSelect: () => actions.onReorder(note, 'down') },
      { label: 'Move to bottom', onSelect: () => actions.onReorder(note, 'bottom') },
    );
  }
  if (note.columnId) {
    menuItems.push({ label: 'Remove from board', onSelect: () => actions.onMove(note, null, location) });
  }
  menuItems.push({ label: 'Delete', danger: true, onSelect: () => actions.onDelete(note, location) });

  const classNames = ['note', isLifted && 'note-dragging', due === 'overdue' && 'note-overdue'].filter(Boolean);

  return (
    <article
      className={classNames.join(' ')}
      aria-labelledby={headingId}
      data-priority={note.priority}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragEnd={actions.onDragEnd}
    >
      <div className="note-header">
        {isRenaming ? (
          <>
            <Heading id={headingId} className="visually-hidden">
              {note.title}
            </Heading>
            <InlineRename
              label="New title"
              initial={note.title}
              onSave={(title) => actions.onRename(note, title)}
              onDone={finishRenaming}
            />
          </>
        ) : (
          // Double-clicking is a shortcut for pointer users. Everyone can use Rename in the menu.
          <Heading id={headingId} className="note-title" dir="auto" onDoubleClick={() => setIsRenaming(true)}>
            {note.title}
          </Heading>
        )}

        <div className="note-toolbar" role="group" aria-label={`Actions for ${note.title}`}>
          <IconButton name={`Edit ${note.title}`} tooltip="Edit" icon={<EditIcon />} onClick={() => actions.onEdit(note)} />
          <IconButton
            name={`Delete ${note.title}`}
            tooltip="Delete"
            icon={<DeleteIcon />}
            className="icon-button-danger"
            onClick={() => actions.onDelete(note, location)}
          />
          <IconButton
            id={pickUpButtonId(location, note.id)}
            name={`${isHeldHere ? 'Drop' : 'Pick up'} ${note.title}`}
            tooltip={isHeldHere ? 'Drop' : 'Pick up'}
            icon={<PickUpIcon />}
            className={isHeldHere ? 'icon-button-active' : ''}
            aria-describedby={PICK_UP_INSTRUCTIONS_ID}
            onClick={() => actions.onPickUpOrDrop(note, location)}
            onKeyDown={handlePickUpKeyDown}
            onBlur={() => {
              if (isHeldHere) actions.onHeldCancel();
            }}
          />
          <Menu id={moreButtonId(location, note.id)} name={`More actions for ${note.title}`} items={menuItems} />
        </div>
      </div>

      {(note.priority !== 'none' || due) && (
        <div className="note-meta">
          {note.priority !== 'none' && (
            <span className={`badge priority-${note.priority}`}>
              <PriorityIcon level={note.priority} />
              {PRIORITY_LABELS[note.priority]}
            </span>
          )}
          {note.dueDate && due && (
            <span className={`badge due-${due}`}>
              {due === 'overdue' ? <AlertIcon /> : <CalendarIcon />}
              <time dateTime={note.dueDate}>{DUE_TEXT[due](formatDate(note.dueDate))}</time>
            </span>
          )}
        </div>
      )}

      {note.description && (
        <p className="note-description" dir="auto">
          {note.description}
        </p>
      )}

      {note.tags.length > 0 && (
        <ul className="tags" role="list" aria-label={`Tags for ${note.title}`}>
          {note.tags.map((tag) => (
            <li key={tag} className={`tag tag-${tagColour(tag)}`} dir="auto">
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
    </article>
  );
}
