import { useState } from 'react';
import { useApp } from '../context.js';
import { isOverdue, notesInColumn } from '../lib/store.js';
import { DueBadge, PriorityBadge, TagChip } from './Badges.jsx';
import Icon from './Icon.jsx';
import InlineTitle from './InlineTitle.jsx';
import Menu from './Menu.jsx';

/** One note, shown either in the list (full details) or on the board (compact). */
export default function NoteCard({ note, variant }) {
  const { state, today, actions, drag } = useApp();
  const [editingTitle, setEditingTitle] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const column = state.columns.find((c) => c.id === note.columnId);
  const overdue = isOverdue(state, note, today);
  const siblings = note.columnId ? notesInColumn(state, note.columnId) : [];
  const index = siblings.findIndex((n) => n.id === note.id);
  const dragging = drag.dragId === note.id;

  const menuItems = [
    { label: 'Edit…', icon: 'edit', onSelect: () => actions.openEdit(note.id) },
    { label: 'Duplicate', icon: 'copy', onSelect: () => actions.duplicateNote(note.id) },
    note.columnId && { label: 'Move up', icon: 'arrowUp', disabled: index <= 0, onSelect: () => actions.shiftNote(note.id, -1) },
    note.columnId && { label: 'Move down', icon: 'arrowDown', disabled: index >= siblings.length - 1, onSelect: () => actions.shiftNote(note.id, 1) },
    { type: 'separator' },
    { type: 'heading', label: 'Move to column' },
    ...state.columns.map((c) => ({ label: c.name, checked: c.id === note.columnId, onSelect: () => actions.moveNote(note.id, c.id, null) })),
    note.columnId && { label: 'Remove from board', icon: 'x', onSelect: () => actions.moveNote(note.id, null, null) },
    { type: 'separator' },
    { label: 'Delete…', icon: 'trash', danger: true, onSelect: () => actions.askDeleteNote(note.id) },
  ];

  return (
    <article
      className={
        `note note-${variant} priority-${note.priority}` +
        (overdue ? ' is-overdue' : '') +
        (dragging ? ' is-dragging' : '') +
        (menuOpen ? ' menu-open' : '')
      }
      aria-label={`Note: ${note.title}`}
      draggable={!editingTitle}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', note.id);
        drag.start(note.id);
      }}
      onDragEnd={drag.end}
    >
      <div className="note-head">
        <InlineTitle title={note.title} onCommit={(t) => actions.renameNote(note.id, t)} onEditingChange={setEditingTitle} />
        <div className="note-tools" role="toolbar" aria-label={`Actions for ${note.title}`}>
          <button type="button" className="icon-btn" aria-label={`Edit ${note.title}`} title="Edit" onClick={() => actions.openEdit(note.id)}>
            <Icon name="edit" />
          </button>
          <button type="button" className="icon-btn" aria-label={`Duplicate ${note.title}`} title="Duplicate" onClick={() => actions.duplicateNote(note.id)}>
            <Icon name="copy" />
          </button>
          <button type="button" className="icon-btn danger" aria-label={`Delete ${note.title}`} title="Delete" onClick={() => actions.askDeleteNote(note.id)}>
            <Icon name="trash" />
          </button>
          <Menu label={`More actions for ${note.title}`} items={menuItems} onOpenChange={setMenuOpen} />
        </div>
      </div>

      {note.description && <p className="note-desc">{note.description}</p>}

      <div className="note-meta">
        <PriorityBadge priority={note.priority} />
        {note.dueDate && <DueBadge dueDate={note.dueDate} overdue={overdue} today={today} />}
        {variant === 'list' && (
          <span className={'badge where' + (column ? '' : ' none')}>
            <Icon name="board" size={13} />
            {column ? <span>On board: {column.name}</span> : <span>Not on board</span>}
          </span>
        )}
      </div>

      {note.tags.length > 0 && (
        <ul className="tags" aria-label="Tags">
          {note.tags.map((t) => (
            <li key={t}>
              <TagChip tag={t} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
