import { useEffect, useRef, useState } from 'react';
import { useBoard, useFocusRequest } from '../state/board.jsx';
import { useToasts } from '../state/toasts.jsx';
import { useUi } from '../state/ui.jsx';
import { Icon, PriorityIcon } from './Icon.jsx';
import { IconButton } from './IconButton.jsx';
import { Menu } from './Menu.jsx';
import { TagChip } from './fields.jsx';
import { PRIORITY_LABELS, LIMITS } from '../lib/noteModel.js';
import { dueStatus, formatDate } from '../lib/dates.js';

export const DRAG_TYPE = 'application/x-notes-board-note';

const short = (text, max = 50) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function PriorityBadge({ priority }) {
  if (!priority || priority === 'none') return null;
  return (
    <span className="badge badge-priority" data-priority={priority}>
      <PriorityIcon level={priority} />
      {PRIORITY_LABELS[priority]} priority
    </span>
  );
}

export function DueBadge({ dueDate }) {
  const status = dueStatus(dueDate);
  if (!status) return null;
  const text = formatDate(dueDate);
  return (
    <span className="badge badge-due" data-status={status}>
      <Icon name={status === 'upcoming' ? 'calendar' : 'alert'} />
      {status === 'overdue' && (
        <span>
          Overdue: was due <time dateTime={dueDate}>{text}</time>
        </span>
      )}
      {status === 'today' && (
        <span>
          Due today (<time dateTime={dueDate}>{text}</time>)
        </span>
      )}
      {status === 'upcoming' && (
        <span>
          Due <time dateTime={dueDate}>{text}</time>
        </span>
      )}
    </span>
  );
}

/** Replaces the title while it is being renamed in place. Enter or Save keeps it, Escape or Cancel discards it. */
function TitleEditor({ note, onDone }) {
  const { actions } = useBoard();
  const { notify } = useToasts();
  const [value, setValue] = useState(note.title);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const finish = (restoreFocus) => {
    if (finished.current) return;
    finished.current = true;
    onDone(restoreFocus);
  };

  const problem = (text) => {
    const t = text.trim();
    if (!t) return 'Enter a title. A note needs a title.';
    if (t.length > LIMITS.title) return `Shorten the title to ${LIMITS.title} characters or fewer. It is now ${t.length}.`;
    return '';
  };

  const save = () => {
    const p = problem(value);
    if (p) {
      setError(p);
      inputRef.current?.focus();
      return;
    }
    if (value.trim() !== note.title) actions.renameNote(note.id, value);
    finish(true);
  };

  return (
    <form
      ref={formRef}
      className="title-editor"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          finish(true);
        }
      }}
      onBlur={(e) => {
        // Focus left the editor altogether: keep a valid change, otherwise keep the old title.
        if (formRef.current?.contains(e.relatedTarget) || finished.current) return;
        const p = problem(value);
        if (p) notify('The title can’t be empty, so the old title was kept.', { kind: 'info' });
        else if (value.trim() !== note.title) actions.renameNote(note.id, value);
        finish(false);
      }}
    >
      <label htmlFor={`rename-${note.id}`} className="sr-only">
        Title for note {short(note.title)}
      </label>
      <div className="title-editor-row">
        <input
          ref={inputRef}
          id={`rename-${note.id}`}
          className="input"
          type="text"
          value={value}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `rename-${note.id}-error` : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
        />
        <IconButton icon="check" label="Save title" type="submit" />
        <IconButton icon="x" label="Cancel renaming" align="end" onClick={() => finish(true)} />
      </div>
      {error && (
        <p className="field-error" id={`rename-${note.id}-error`}>
          <Icon name="alert" />
          <span>
            <span className="sr-only">Error: </span>
            {error}
          </span>
        </p>
      )}
    </form>
  );
}

/**
 * One note, shown in the notes list (scope "list") or in a board column (scope "board").
 * `position` is { index, count } inside the column for board cards.
 */
export function NoteCard({ note, scope, columnId, position, dropMark }) {
  const { state, actions, dragging, startDrag, endDrag, wasDropped, requestFocus } = useBoard();
  const { notify } = useToasts();
  const ui = useUi();
  const [renaming, setRenaming] = useState(false);
  const triggerRef = useRef(null);
  const column = columnId ? state.columns.find((c) => c.id === columnId) : null;
  const Heading = scope === 'board' ? 'h4' : 'h3';
  const shortTitle = short(note.title);
  const isDragging = dragging?.id === note.id;

  useFocusRequest(`note:${scope}:${note.id}`, () => triggerRef.current);

  const moveFromBoard = (fn) => () => {
    // On the board a moved card appears somewhere else, so ask for focus to follow it.
    if (fn()) requestFocus(`note:board:${note.id}`);
  };

  const items = [
    { label: 'Edit details…', icon: 'edit', onSelect: () => ui.editNote(note.id, scope) },
    { label: 'Rename title', icon: 'type', onSelect: () => setRenaming(true) },
    scope === 'board' && position.index > 0 && { label: 'Move up in column', icon: 'arrowUp', onSelect: moveFromBoard(() => actions.stepNote(note.id, -1)) },
    scope === 'board' && position.index < position.count - 1 && { label: 'Move down in column', icon: 'arrowDown', onSelect: moveFromBoard(() => actions.stepNote(note.id, 1)) },
    { separator: true },
    ...state.columns
      .filter((c) => c.id !== columnId)
      .map((c) => ({
        label: `Move to “${short(c.name, 30)}”`,
        icon: 'arrowRight',
        onSelect: scope === 'board' ? moveFromBoard(() => actions.moveNote(note.id, c.id)) : () => actions.moveNote(note.id, c.id),
      })),
    columnId && {
      label: 'Remove from board',
      icon: 'eraser',
      onSelect: scope === 'board' ? moveFromBoard(() => actions.moveNote(note.id, null)) : () => actions.moveNote(note.id, null),
    },
    { separator: true },
    { label: 'Delete note…', icon: 'trash', danger: true, onSelect: () => ui.deleteNote(note.id, scope) },
  ];

  return (
    <li
      className="note-card"
      data-scope={scope}
      data-card-id={note.id}
      data-priority={note.priority}
      data-due={dueStatus(note.dueDate) || undefined}
      data-dragging={isDragging ? 'true' : undefined}
      data-drop={dropMark}
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, note.id);
        e.dataTransfer.setData('text/plain', note.title);
        e.dataTransfer.effectAllowed = 'move';
        // Update the page after the browser has taken its drag picture.
        setTimeout(() => startDrag(note.id), 0);
      }}
      onDragEnd={(e) => {
        endDrag();
        // Dropped outside every column (or cancelled with Escape): nothing moves, and we say so.
        if (e.dataTransfer.dropEffect === 'none' && !wasDropped()) {
          notify(`Note “${short(note.title, 40)}” was not moved. Drop a note on a column to move it.`, { kind: 'info' });
        }
      }}
    >
      <div className="card-top">
        <span className="grip" aria-hidden="true">
          <Icon name="grip" />
        </span>
        {renaming ? (
          <TitleEditor
            note={note}
            onDone={(restore) => {
              setRenaming(false);
              if (restore) setTimeout(() => triggerRef.current?.focus(), 0);
            }}
          />
        ) : (
          <Heading className="note-title" onDoubleClick={() => setRenaming(true)}>
            {note.title}
          </Heading>
        )}
        {!renaming && (
          <div className="note-toolbar">
            <IconButton icon="edit" label={`Edit note ${shortTitle}`} tooltip="Edit note" onClick={() => ui.editNote(note.id, scope)} />
            <IconButton icon="trash" label={`Delete note ${shortTitle}`} tooltip="Delete note" onClick={() => ui.deleteNote(note.id, scope)} />
            <Menu label={`More actions for note ${shortTitle}`} tooltip="More actions" items={items} triggerRef={triggerRef} />
          </div>
        )}
      </div>

      {note.description && <p className="note-desc">{note.description}</p>}

      <div className="note-meta">
        <PriorityBadge priority={note.priority} />
        <DueBadge dueDate={note.dueDate} />
        {scope === 'list' && (
          <span className="badge badge-column">
            <Icon name="board" />
            {column ? `On board: ${column.name}` : 'Not on the board'}
          </span>
        )}
      </div>

      {note.tags.length > 0 && (
        <ul className="chip-list" aria-label={`Tags for ${shortTitle}`}>
          {note.tags.map((tag) => (
            <li key={tag}>
              <TagChip tag={tag} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
