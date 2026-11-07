import { useId, useRef, useState } from 'react';
import { useBoard } from '../state/board.jsx';
import { useUi } from '../state/ui.jsx';
import { Icon } from './Icon.jsx';
import { Menu } from './Menu.jsx';
import { NoteCard, DRAG_TYPE } from './NoteCard.jsx';

const short = (text, max = 30) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Which card the dragged note would go before, judged from the pointer height. null = the end. */
function insertionPoint(listEl, clientY, draggedId) {
  if (!listEl) return null;
  const cards = Array.from(listEl.children).filter((el) => el.dataset.cardId && el.dataset.cardId !== draggedId);
  for (const el of cards) {
    const rect = el.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return el.dataset.cardId;
  }
  return null;
}

const carriesNote = (e) => Array.from(e.dataTransfer?.types || []).includes(DRAG_TYPE);

/**
 * One board column. The whole column is a drop target; dropping between cards places the note there.
 * `notes` are the notes to show (after search/filters); `total` counts all notes in the column.
 */
export function Column({ column, notes, total, index, columnCount, filtering }) {
  const { actions, dragging, endDrag, markDropped } = useBoard();
  const ui = useUi();
  const headingId = useId();
  const bodyId = useId();
  const listRef = useRef(null);
  // undefined = nothing is being dragged over this column, null = over it (insert at the end), string = insert before that note
  const [over, setOver] = useState(undefined);
  const isOver = over !== undefined;

  const draggedId = dragging?.id;

  const onDragOver = (e) => {
    if (!carriesNote(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const before = column.collapsed ? null : insertionPoint(listRef.current, e.clientY, draggedId);
    if (before !== over) setOver(before);
  };

  const onDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setOver(undefined);
  };

  const onDrop = (e) => {
    if (!carriesNote(e)) return;
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_TYPE);
    const before = column.collapsed ? null : insertionPoint(listRef.current, e.clientY, id);
    setOver(undefined);
    markDropped();
    endDrag();
    if (id) actions.moveNote(id, column.id, before);
  };

  const countText = filtering ? `${notes.length} of ${total}` : String(total);

  const items = [
    { label: 'Rename column…', icon: 'edit', onSelect: () => ui.renameColumn(column.id) },
    index > 0 && { label: 'Move column left', icon: 'arrowLeft', onSelect: () => actions.moveColumn(column.id, -1) },
    index < columnCount - 1 && { label: 'Move column right', icon: 'arrowRight', onSelect: () => actions.moveColumn(column.id, 1) },
    { label: column.collapsed ? 'Expand column' : 'Collapse column', icon: column.collapsed ? 'chevronDown' : 'chevronRight', onSelect: () => actions.toggleColumn(column.id) },
    { separator: true },
    { label: 'Delete column…', icon: 'trash', danger: true, onSelect: () => ui.deleteColumn(column.id) },
  ];

  return (
    <section
      className="column"
      aria-labelledby={headingId}
      data-over={isOver ? 'true' : undefined}
      data-collapsed={column.collapsed ? 'true' : undefined}
      data-drag-active={dragging ? 'true' : undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="drop-pill" aria-hidden="true">
        <Icon name="arrowDown" />
        {isOver ? 'Release to drop here' : 'Drop here'}
      </span>

      <div className="column-head">
        <h3 id={headingId} className="column-title">
          <button type="button" className="collapse-btn" aria-expanded={!column.collapsed} aria-controls={bodyId} onClick={() => actions.toggleColumn(column.id)}>
            <Icon name={column.collapsed ? 'chevronRight' : 'chevronDown'} />
            <span className="column-name">{column.name}</span>
            <span className="count">
              {countText}
              <span className="sr-only"> {total === 1 ? 'note' : 'notes'}</span>
            </span>
          </button>
        </h3>
        <Menu label={`More actions for column ${short(column.name)}`} tooltip="More actions" items={items} />
      </div>

      <div className="collapsible" id={bodyId} data-collapsed={column.collapsed ? 'true' : undefined} inert={column.collapsed || undefined}>
        <div className="collapsible-inner">
          {notes.length > 0 ? (
            <ul className="card-list" ref={listRef} aria-label={`Notes in ${short(column.name)}`}>
              {notes.map((note, i) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  scope="board"
                  columnId={column.id}
                  position={{ index: column.noteIds.indexOf(note.id), count: column.noteIds.length }}
                  dropMark={isOver ? (over === note.id ? 'before' : over === null && i === notes.length - 1 ? 'after' : undefined) : undefined}
                />
              ))}
            </ul>
          ) : (
            <p className="empty">
              {total > 0
                ? 'No notes in this column match the current search or filters.'
                : `No notes yet. Drag a note here, or open a note’s More actions menu and choose “Move to ${short(column.name)}”.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
