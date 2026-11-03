import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { endNoteDrag, startNoteDrag } from '../lib/dnd';
import { dueStatus } from '../model/dates';
import { TITLE_MAX } from '../model/notes';
import type { Column, Note } from '../types';
import { useActions } from './ActionsContext';
import { DueBadge, PriorityBadge, TagList } from './Badges';
import { Highlight } from './Highlight';
import { EditIcon, GripIcon, MoreIcon, TrashIcon } from './Icons';
import { InlineEdit } from './InlineEdit';
import { Menu, type MenuEntry } from './Menu';

interface NoteCardProps {
  note: Note;
  context: 'list' | 'board';
  /** The column the note is in, if any. */
  column: Column | undefined;
  isDone: boolean;
  dropBefore?: boolean;
}

export function NoteCard({ note, context, column, isDone, dropBefore = false }: NoteCardProps) {
  const actions = useActions();
  const [editingTitle, setEditingTitle] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragFrame = useRef(0);
  const titleId = useId();

  const status = isDone ? null : dueStatus(note.dueDate, actions.today);
  const position = column ? column.noteIds.indexOf(note.id) : -1;

  const entries: MenuEntry[] = [
    { label: 'Edit…', onSelect: () => actions.editNote(note.id) },
    { label: 'Rename', onSelect: () => setEditingTitle(true) },
    { label: 'Duplicate', onSelect: () => actions.duplicateNote(note.id) },
    { kind: 'separator' },
    { kind: 'heading', label: 'Move to' },
    ...actions.columns.map<MenuEntry>((c) => ({
      label: c.name,
      disabled: c.id === column?.id,
      onSelect: () => actions.moveNote(note.id, c.id, null),
    })),
  ];
  if (column) {
    entries.push(
      { kind: 'separator' },
      { label: 'Move up', disabled: position <= 0, onSelect: () => actions.shiftNote(note.id, -1) },
      { label: 'Move down', disabled: position >= column.noteIds.length - 1, onSelect: () => actions.shiftNote(note.id, 1) },
      { label: 'Remove from board', onSelect: () => actions.moveNote(note.id, null, null) },
    );
  }
  entries.push({ kind: 'separator' }, { label: 'Delete…', danger: true, onSelect: () => actions.deleteNote(note.id) });

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'F2') {
      e.preventDefault();
      setEditingTitle(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      actions.editNote(note.id);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      actions.deleteNote(note.id);
    }
  };

  const classes = [
    'note-card',
    `priority-${note.priority}`,
    status === 'overdue' && 'is-overdue',
    dragging && 'is-dragging',
    dropBefore && 'drop-before',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={classes}
      data-note-id={note.id}
      data-testid={`${context}-note`}
      aria-labelledby={titleId}
      tabIndex={0}
      draggable={!editingTitle}
      onDragStart={(e) => {
        startNoteDrag(e, note.id);
        actions.playPick();
        // Defer the dimmed style so the browser's drag image is captured from the normal card.
        dragFrame.current = requestAnimationFrame(() => setDragging(true));
      }}
      onDragEnd={() => {
        // A very short drag can end before the deferred style was applied.
        cancelAnimationFrame(dragFrame.current);
        endNoteDrag();
        setDragging(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div className="note-card-top">
        <span className="drag-grip" aria-hidden="true">
          <GripIcon />
        </span>
        <h3 id={titleId} className="note-title" onDoubleClick={() => setEditingTitle(true)} title="Double-click to rename">
          <InlineEdit
            value={note.title}
            editing={editingTitle}
            onEditingChange={setEditingTitle}
            onSave={(title) => actions.renameNote(note.id, title)}
            label="Note title"
            maxLength={TITLE_MAX}
          >
            <Highlight text={note.title} query={actions.query} />
          </InlineEdit>
        </h3>
        <div className="note-toolbar" role="toolbar" aria-label={`Actions for ${note.title}`}>
          <button type="button" className="icon-button" aria-label="Edit note" title="Edit note" onClick={() => actions.editNote(note.id)}>
            <EditIcon />
          </button>
          <button
            type="button"
            className="icon-button icon-button-danger"
            aria-label="Delete note"
            title="Delete note"
            onClick={() => actions.deleteNote(note.id)}
          >
            <TrashIcon />
          </button>
          <Menu label="More actions" entries={entries}>
            <MoreIcon />
          </Menu>
        </div>
      </div>
      {note.description && (
        <p className="note-description">
          <Highlight text={note.description} query={actions.query} />
        </p>
      )}
      {(note.priority !== 'none' || note.dueDate || note.tags.length > 0 || context === 'list') && (
        <div className="note-meta">
          <PriorityBadge priority={note.priority} />
          <DueBadge dueDate={note.dueDate} today={actions.today} done={isDone} />
          <TagList tags={note.tags} />
          {context === 'list' && (
            <span className={`badge column-badge${column ? '' : ' is-unassigned'}`} data-testid="column-badge">
              {column ? column.name : 'Not on board'}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
