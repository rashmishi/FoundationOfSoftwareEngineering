import { useEffect, useRef, useState } from 'react';
import { PRIORITY_LABELS, formatDue, isOverdue, tagHue } from '../lib/helpers.js';
import Icon from './Icons.jsx';
import Menu from './Menu.jsx';

export function TagChip({ tag }) {
  return (
    <span className="tag" style={{ '--hue': tagHue(tag) }}>
      {tag}
    </span>
  );
}

export default function NoteCard({ note, variant, columns, currentColumn, position, dragging, onDragStart, onDragEnd, onEdit, onDelete, onRename, onMove, onReorder }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const input = useRef(null);
  const heading = useRef(null);
  const wasEditing = useRef(false);
  const overdue = isOverdue(note.dueDate);
  const Heading = variant === 'board' ? 'h4' : 'h3';

  useEffect(() => {
    if (editingTitle) {
      input.current?.focus();
      input.current?.select();
    } else if (wasEditing.current) {
      heading.current?.focus(); // keep keyboard focus on the note after the inline editor closes
    }
    wasEditing.current = editingTitle;
  }, [editingTitle]);

  const startRename = () => {
    setTitleDraft(note.title);
    setEditingTitle(true);
  };
  const finishRename = (save) => {
    setEditingTitle(false);
    if (save && titleDraft.trim() !== note.title) onRename(note.id, titleDraft);
  };

  const reorderItems =
    position && onReorder
      ? [
          ...(position.index > 0 ? [{ label: 'Move up', onSelect: () => onReorder(note.id, position.index - 1) }] : []),
          ...(position.index < position.total - 1 ? [{ label: 'Move down', onSelect: () => onReorder(note.id, position.index + 1) }] : []),
          ...(position.index > 1 ? [{ label: 'Move to top', onSelect: () => onReorder(note.id, 0) }] : []),
          ...(position.index < position.total - 2 ? [{ label: 'Move to bottom', onSelect: () => onReorder(note.id, position.total - 1) }] : []),
        ]
      : [];

  const menuItems = [
    { label: 'Edit note', onSelect: () => onEdit(note.id) },
    { label: 'Rename title', onSelect: startRename },
    { separator: true },
    ...reorderItems,
    ...columns.filter((c) => c.id !== currentColumn?.id).map((c) => ({ label: `Move to ${c.name}`, onSelect: () => onMove(note.id, c.id) })),
    ...(currentColumn ? [{ label: 'Remove from board', onSelect: () => onMove(note.id, null) }] : []),
    { separator: true },
    { label: 'Delete note', danger: true, onSelect: () => onDelete(note.id) },
  ];

  return (
    <article
      className={`note priority-${note.priority} ${dragging ? 'is-dragging' : ''} ${variant === 'board' ? 'note-board' : ''}`}
      data-note-id={note.id}
      draggable={!editingTitle}
      onDragStart={(e) => onDragStart(e, note.id)}
      onDragEnd={onDragEnd}
    >
      <div className="note-head">
        <span className="grip">
          <Icon name="grip" size={16} />
        </span>
        {editingTitle ? (
          <input
            ref={input}
            className="title-input"
            aria-label="Note title"
            aria-describedby="rename-help"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => finishRename(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishRename(true);
              if (e.key === 'Escape') finishRename(false);
            }}
          />
        ) : (
          <Heading ref={heading} tabIndex={-1} className="note-title" onDoubleClick={startRename}>
            {note.title}
          </Heading>
        )}
        <div className="note-tools">
          <div className="hover-toolbar">
            <button type="button" className="icon-btn" aria-label={`Edit "${note.title}"`} title="Edit" onClick={() => onEdit(note.id)}>
              <Icon name="edit" />
            </button>
            <button type="button" className="icon-btn" aria-label={`Delete "${note.title}"`} title="Delete" onClick={() => onDelete(note.id)}>
              <Icon name="trash" />
            </button>
          </div>
          <Menu label={`More actions for "${note.title}"`} items={menuItems} />
        </div>
      </div>

      {note.description && <p className="note-desc">{note.description}</p>}

      <div className="note-meta">
        <span className={`badge badge-${note.priority}`}>
          <span className="sr-label">Priority: </span>
          {PRIORITY_LABELS[note.priority]}
        </span>
        {note.dueDate && (
          <span className={`due ${overdue ? 'overdue' : ''}`}>
            <Icon name="calendar" size={14} />
            <span className="sr-label">Due: </span>
            {formatDue(note.dueDate)}
            {overdue && ' (overdue)'}
          </span>
        )}
        {variant === 'list' && currentColumn && <span className="in-column">On board: {currentColumn.name}</span>}
      </div>

      {note.tags.length > 0 && (
        <div className="tags">
          <span className="sr-label">Tags: </span>
          {note.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}
    </article>
  );
}
