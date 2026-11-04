import { useId, useState, type DragEvent, type FormEvent } from 'react';
import { formatCount } from '../format';
import type { Column, HeldNote, Note } from '../types';
import { FieldError } from './FieldError';
import { ChevronIcon } from './icons';
import { InlineRename } from './InlineRename';
import { Menu, type MenuItem } from './Menu';
import { NoteCard, type NoteActions } from './NoteCard';

export const BOARD_HEADING_ID = 'board-heading';

export function columnMenuId(columnId: string): string {
  return `column-more-${columnId}`;
}

export interface ColumnActions {
  /** Returns an error message if the column cannot be added. */
  onAdd: (name: string) => string | null;
  /** Returns an error message if the name cannot be used. */
  onRename: (column: Column, name: string) => string | null;
  onMove: (column: Column, step: number) => void;
  onDelete: (column: Column) => void;
  onToggleCollapsed: (columnId: string) => void;
  onDropNote: (noteId: string, columnId: string, index: number) => void;
}

interface BoardProps {
  notes: Note[];
  columns: Column[];
  collapsedIds: Set<string>;
  today: string;
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
  columnActions: ColumnActions;
}

export function Board({ notes, columns, collapsedIds, today, draggingId, held, actions, columnActions }: BoardProps) {
  return (
    <section className="panel board" aria-labelledby={BOARD_HEADING_ID}>
      <div className="panel-header">
        <h2 id={BOARD_HEADING_ID} tabIndex={-1}>
          Board
        </h2>
        <p className="count">{formatCount(columns.length, 'column')}</p>
      </div>
      <p className="readable-text">
        Drag a note onto a column, or between notes to change the order. You can also choose a column on the note and
        press Move. With a keyboard, press Pick up on the note and use the arrow keys.
      </p>

      <AddColumnForm onAddColumn={columnActions.onAdd} />

      <div className={draggingId || held ? 'columns columns-accepting' : 'columns'}>
        {columns.map((column, index) => (
          <BoardColumn
            key={column.id}
            column={column}
            index={index}
            notes={notes.filter((note) => note.columnId === column.id)}
            columns={columns}
            isCollapsed={collapsedIds.has(column.id)}
            today={today}
            draggingId={draggingId}
            held={held}
            actions={actions}
            columnActions={columnActions}
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
  index: number;
  notes: Note[];
  columns: Column[];
  isCollapsed: boolean;
  today: string;
  draggingId: string | null;
  held: HeldNote | null;
  actions: NoteActions;
  columnActions: ColumnActions;
}

function BoardColumn(props: BoardColumnProps) {
  const { column, index, notes, columns, isCollapsed, today, draggingId, held, actions, columnActions } = props;
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const headingId = useId();
  const bodyId = `${headingId}-body`;
  const isHeldTarget = held?.targetColumnId === column.id;
  const movingId = draggingId ?? (isHeldTarget ? held.noteId : null);
  const siblings = notes.filter((note) => note.id !== movingId);

  // Where the moving note would land, shown as a line between notes.
  const landingIndex = isDragOver ? dragIndex : isHeldTarget ? held.targetIndex : null;
  const lineBefore = landingIndex !== null && landingIndex < siblings.length ? siblings[landingIndex]?.id : null;
  const lineAfter = landingIndex !== null && landingIndex >= siblings.length ? siblings.at(-1)?.id : null;

  function indexAtPointer(event: DragEvent<HTMLElement>): number {
    const item = (event.target as Element).closest<HTMLElement>('[data-note-id]');
    if (!item || !event.currentTarget.contains(item)) return siblings.length;
    const itemId = item.dataset.noteId;
    // Over the dragged note itself, it stays where it is.
    if (itemId === draggingId) return Math.max(notes.findIndex((note) => note.id === itemId), 0);
    const { top, height } = item.getBoundingClientRect();
    const isLowerHalf = event.clientY > top + height / 2;
    return siblings.findIndex((note) => note.id === itemId) + (isLowerHalf ? 1 : 0);
  }

  /** Handles dragenter as well as dragover, as a drop target must accept both. */
  function acceptDrag(event: DragEvent<HTMLElement>) {
    // Without a note being dragged, this is some other drag, such as a file.
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    setDragIndex(isCollapsed ? siblings.length : indexAtPointer(event));
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
    columnActions.onDropNote(draggingId, column.id, isCollapsed ? siblings.length : indexAtPointer(event));
  }

  const menuItems: MenuItem[] = [{ label: 'Rename column', onSelect: () => setIsRenaming(true) }];
  if (index > 0) menuItems.push({ label: 'Move column left', onSelect: () => columnActions.onMove(column, -1) });
  if (index < columns.length - 1) {
    menuItems.push({ label: 'Move column right', onSelect: () => columnActions.onMove(column, 1) });
  }
  menuItems.push({ label: 'Delete column', danger: true, onSelect: () => columnActions.onDelete(column) });

  const classNames = ['column', (isDragOver || isHeldTarget) && 'column-over', isCollapsed && 'column-collapsed'];

  return (
    <section
      className={classNames.filter(Boolean).join(' ')}
      aria-labelledby={headingId}
      data-testid={`column-${column.name}`}
      onDragEnter={acceptDrag}
      onDragOver={acceptDrag}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        {isRenaming ? (
          <>
            <h3 id={headingId} className="visually-hidden">
              {column.name}
            </h3>
            <InlineRename
              label="New column name"
              initial={column.name}
              onSave={(name) => columnActions.onRename(column, name)}
              onDone={() => {
                setIsRenaming(false);
                document.getElementById(columnMenuId(column.id))?.focus();
              }}
            />
          </>
        ) : (
          <h3 id={headingId}>
            <button
              type="button"
              className="column-toggle"
              aria-expanded={!isCollapsed}
              aria-controls={bodyId}
              onClick={() => columnActions.onToggleCollapsed(column.id)}
            >
              <ChevronIcon />
              <span dir="auto">{column.name}</span>
            </button>
          </h3>
        )}
        <p className="count">{formatCount(notes.length, 'note')}</p>
        <Menu id={columnMenuId(column.id)} name={`More actions for column ${column.name}`} items={menuItems} />
      </div>

      <div id={bodyId} className="column-body" hidden={isCollapsed}>
        {notes.length === 0 ? (
          <p className="empty">No notes in this column.</p>
        ) : (
          <ul className="note-stack" role="list">
            {notes.map((note, position) => (
              <li
                key={note.id}
                data-note-id={note.id}
                className={note.id === lineBefore ? 'drop-before' : note.id === lineAfter ? 'drop-after' : undefined}
                // Each board card is named for the browser's move animation.
                style={{ viewTransitionName: `note-${note.id}` }}
              >
                <NoteCard
                  note={note}
                  columns={columns}
                  location="board"
                  headingLevel="h4"
                  position={{ index: position, count: notes.length }}
                  today={today}
                  draggingId={draggingId}
                  held={held}
                  actions={actions}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
