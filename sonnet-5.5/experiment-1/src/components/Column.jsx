import { useId } from 'react';
import { useApp } from '../context.js';
import { hasActiveFilters, matchesFilters, notesInColumn } from '../lib/store.js';
import Icon from './Icon.jsx';
import Menu from './Menu.jsx';
import NoteCard from './NoteCard.jsx';

export default function Column({ column, index, total }) {
  const { state, today, filters, actions, drag } = useApp();
  const listId = useId();

  const all = notesInColumn(state, column.id);
  const shown = all.filter((n) => matchesFilters(state, n, filters, today));
  const filtering = hasActiveFilters(filters);
  const over = drag.over?.columnId === column.id ? drag.over : null;
  const droppable = drag.dragId !== null;

  const menuItems = [
    { label: 'Rename…', icon: 'edit', onSelect: () => actions.askRenameColumn(column.id) },
    { label: column.collapsed ? 'Expand' : 'Collapse', icon: column.collapsed ? 'chevronDown' : 'chevronRight', onSelect: () => actions.toggleCollapsed(column.id) },
    { label: 'Add a note here…', icon: 'plus', onSelect: () => actions.openCreate(column.id) },
    { type: 'separator' },
    { label: 'Move left', icon: 'arrowLeft', disabled: index === 0, onSelect: () => actions.moveColumn(column.id, -1) },
    { label: 'Move right', icon: 'arrowRight', disabled: index === total - 1, onSelect: () => actions.moveColumn(column.id, 1) },
    { label: column.done ? 'Notes here are not “done”' : 'Mark as “done” column', icon: 'done', onSelect: () => actions.toggleDone(column.id) },
    { type: 'separator' },
    { label: 'Clear column', icon: 'eraser', disabled: all.length === 0, onSelect: () => actions.clearColumn(column.id) },
    { label: 'Delete column…', icon: 'trash', danger: true, onSelect: () => actions.askDeleteColumn(column.id) },
  ];

  const count = filtering ? `${shown.length} of ${all.length}` : String(all.length);

  return (
    <section
      className={'column' + (column.collapsed ? ' collapsed' : '') + (droppable ? ' droppable' : '') + (over ? ' drag-over' : '')}
      aria-labelledby={`${listId}-name`}
      data-column-id={column.id}
      onDragOver={(e) => {
        if (!droppable) return;
        e.preventDefault(); // allow a drop here
        e.dataTransfer.dropEffect = 'move';
        // Cards report their own, more precise position first.
        if (!e.target.closest?.('.note-item')) drag.setOver(column.id, null);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) drag.leave(column.id);
      }}
      onDrop={(e) => {
        if (!droppable) return;
        e.preventDefault();
        drag.drop(column.id);
      }}
    >
      <header className="column-head">
        <h3>
          <button
            type="button"
            className="col-toggle"
            aria-expanded={!column.collapsed}
            aria-controls={listId}
            title={column.collapsed ? 'Expand column' : 'Collapse column'}
            onClick={() => actions.toggleCollapsed(column.id)}
          >
            <Icon name={column.collapsed ? 'chevronRight' : 'chevronDown'} size={16} />
            <span className="col-name" id={`${listId}-name`}>{column.name}</span>
            {column.done && <span className="done-mark" title="Notes in this column are never overdue"><Icon name="done" size={14} /><span className="vh">Done column</span></span>}
            <span className="count" aria-label={`${count} notes`}>{count}</span>
          </button>
        </h3>
        <Menu label={`More actions for column ${column.name}`} items={menuItems} />
      </header>

      <div id={listId} className="column-body" hidden={column.collapsed}>
        <ul className={'column-notes' + (over && over.beforeId === null ? ' drop-end' : '')} aria-label={`${column.name} notes`}>
          {shown.map((n, i) => (
            <li
              key={n.id}
              className={'note-item' + (over && over.beforeId === n.id ? ' drop-before' : '')}
              onDragOver={(e) => {
                if (!droppable) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const r = e.currentTarget.getBoundingClientRect();
                const upperHalf = e.clientY < r.top + r.height / 2;
                drag.setOver(column.id, upperHalf ? n.id : shown[i + 1]?.id ?? null);
              }}
            >
              <NoteCard note={n} variant="board" />
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <p className="column-empty">{filtering && all.length ? 'No notes match the filters.' : 'Drop notes here'}</p>
        )}
        <button type="button" className="add-note-btn" onClick={() => actions.openCreate(column.id)}>
          <Icon name="plus" size={16} /> Add note
        </button>
      </div>
    </section>
  );
}
