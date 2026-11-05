import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { beforeIdAt, currentDraggedId, droppedNoteId, isNoteDrag } from '../lib/dnd';
import { COLUMN_NAME_MAX, isDoneColumn } from '../model/notes';
import type { Column as ColumnType, Note } from '../types';
import { useActions } from './ActionsContext';
import { ChevronIcon, MoreIcon } from './Icons';
import { InlineEdit } from './InlineEdit';
import { Menu, type MenuEntry } from './Menu';
import { NoteCard } from './NoteCard';

interface ColumnProps {
  column: ColumnType;
  /** The notes to show (already filtered), in column order. */
  notes: Note[];
  index: number;
  columnCount: number;
  filtering: boolean;
}

/** Sentinel for "the pointer is over the column but there is no insertion point yet". */
const NOT_OVER = undefined;

export function Column({ column, notes, index, columnCount, filtering }: ColumnProps) {
  const actions = useActions();
  const [renaming, setRenaming] = useState(false);
  /** undefined: no drag over this column; null: drop at the end; string: drop before that note. */
  const [dropBefore, setDropBefore] = useState<string | null | undefined>(NOT_OVER);
  const body = useRef<HTMLUListElement>(null);
  const headingId = useId();
  const done = isDoneColumn(column);

  useEffect(() => {
    if (dropBefore === NOT_OVER) return;
    const reset = () => setDropBefore(NOT_OVER);
    document.addEventListener('dragend', reset);
    document.addEventListener('drop', reset);
    return () => {
      document.removeEventListener('dragend', reset);
      document.removeEventListener('drop', reset);
    };
  }, [dropBefore]);

  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!isNoteDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const before = column.collapsed || !body.current ? null : beforeIdAt(body.current, e.clientY, currentDraggedId());
    if (before !== dropBefore) setDropBefore(before);
  };

  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropBefore(NOT_OVER);
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    const id = droppedNoteId(e);
    if (!id) return;
    e.preventDefault();
    const before = column.collapsed || !body.current ? null : beforeIdAt(body.current, e.clientY, id);
    setDropBefore(NOT_OVER);
    actions.moveNote(id, column.id, before);
  };

  const menuEntries: MenuEntry[] = [
    { label: 'Rename', onSelect: () => setRenaming(true) },
    { label: column.collapsed ? 'Expand' : 'Collapse', onSelect: () => actions.toggleColumn(column.id) },
    { label: 'Move left', disabled: index === 0, onSelect: () => actions.moveColumn(column.id, -1) },
    { label: 'Move right', disabled: index === columnCount - 1, onSelect: () => actions.moveColumn(column.id, 1) },
    { kind: 'separator' },
    { label: 'Delete column…', danger: true, onSelect: () => actions.deleteColumn(column.id) },
  ];

  const count = filtering ? `${notes.length} of ${column.noteIds.length}` : String(column.noteIds.length);
  const countLabel = `${count} ${column.noteIds.length === 1 && !filtering ? 'note' : 'notes'}`;
  const over = dropBefore !== NOT_OVER;

  const dropProps = { onDragOver, onDragLeave, onDrop };

  if (column.collapsed) {
    return (
      <section className={`column is-collapsed${over ? ' is-drop-target' : ''}`} aria-labelledby={headingId} data-column-id={column.id} {...dropProps}>
        <button
          type="button"
          className="column-expand"
          aria-expanded="false"
          aria-label={`Expand column ${column.name}`}
          title={`Expand ${column.name}`}
          onClick={() => actions.toggleColumn(column.id)}
        >
          <ChevronIcon direction="right" />
          <h2 id={headingId} className="column-title-vertical">
            {column.name}
          </h2>
          <span className="column-count" aria-label={countLabel}>
            {count}
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className={`column${over ? ' is-drop-target' : ''}`} aria-labelledby={headingId} data-column-id={column.id} {...dropProps}>
      <header className="column-header">
        <button
          type="button"
          className="icon-button column-collapse"
          aria-expanded="true"
          aria-label={`Collapse column ${column.name}`}
          title="Collapse column"
          onClick={() => actions.toggleColumn(column.id)}
        >
          <ChevronIcon />
        </button>
        <h2 id={headingId} className="column-title" onDoubleClick={() => setRenaming(true)} title="Double-click to rename">
          <InlineEdit
            value={column.name}
            editing={renaming}
            onEditingChange={setRenaming}
            onSave={(name) => actions.renameColumn(column.id, name)}
            label="Column name"
            maxLength={COLUMN_NAME_MAX}
          >
            {column.name}
          </InlineEdit>
        </h2>
        <span className="column-count" aria-label={countLabel}>
          {count}
        </span>
        <Menu label={`More actions for column ${column.name}`} entries={menuEntries}>
          <MoreIcon />
        </Menu>
      </header>
      <ul ref={body} className={`card-list column-body${over && dropBefore === null ? ' drop-at-end' : ''}`}>
        {notes.map((note) => (
          <li key={note.id}>
            <NoteCard note={note} context="board" column={column} isDone={done} dropBefore={dropBefore === note.id} />
          </li>
        ))}
        {notes.length === 0 && (
          <li className="column-empty" aria-hidden={filtering ? undefined : 'true'}>
            {filtering && column.noteIds.length > 0 ? 'No matching notes' : 'Drop notes here'}
          </li>
        )}
      </ul>
    </section>
  );
}
