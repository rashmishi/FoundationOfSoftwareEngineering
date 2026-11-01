import { useDraggable } from '@dnd-kit/core';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { columnName, updateNote, type NoteInput } from '../model/reducer';
import { formatTags } from '../model/tags';
import type { Note, Variant } from '../model/types';
import { useAnnouncer } from '../state/AnnouncerContext';
import { useEditing } from '../state/EditingContext';
import { useRequestFocus } from '../state/FocusContext';
import { useKeyboardDrag } from '../state/KeyboardDragContext';
import { useStore } from '../state/StoreContext';
import { ColumnMover } from './ColumnMover';
import { ConfirmDialog } from './ConfirmDialog';
import { DragHandle } from './DragHandle';
import { deleteFocusTarget } from './focusTargets';
import { NoteFields } from './NoteFields';
import { useFieldErrorFocus } from './useFieldErrorFocus';

interface Props {
  note: Note;
  variant: Variant;
}

const TITLE_REQUIRED = 'Title is required.';

/** One note, shown in the note list (h3) or on a board column (h4). */
export function NoteCard({ note, variant }: Props) {
  const { state, dispatch } = useStore();
  const { announce } = useAnnouncer();
  const requestFocus = useRequestFocus();
  const showFieldError = useFieldErrorFocus();
  const { editing, setEditing } = useEditing();
  const kb = useKeyboardDrag();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [values, setValues] = useState<NoteInput>({ title: '', description: '', tags: '' });
  const [titleError, setTitleError] = useState<string | null>(null);

  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useDraggable({
    id: `${variant}:${note.id}`,
    data: { noteId: note.id, variant },
  });

  const base = `${variant}-${note.id}`;
  const column = columnName(state, note.columnId);
  const nameSuffix = variant === 'board' && column ? ` (${column} column)` : '';
  const Heading = variant === 'list' ? 'h3' : 'h4';
  const isEditing = editing[variant] === note.id;
  const moving = isDragging || kb.isPicked(note.id, variant);

  const startEdit = () => {
    setValues({ title: note.title, description: note.description, tags: formatTags(note.tags) });
    setTitleError(null);
    setEditing(variant, note.id);
    requestFocus(`${base}-edit-title`);
  };

  const stopEdit = () => {
    setEditing(variant, null);
    requestFocus(`${base}-edit`);
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setTitleError(TITLE_REQUIRED);
      showFieldError(`${base}-edit-title`, TITLE_REQUIRED);
      return;
    }
    const action = updateNote(note.id, values);
    dispatch(action);
    announce(`Note '${values.title.trim()}' updated.`);
    stopEdit();
  };

  const onFormKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      stopEdit();
    }
  };

  const onConfirmDelete = () => {
    setConfirmingDelete(false);
    const target = deleteFocusTarget(state, note, variant);
    dispatch({ type: 'DELETE_NOTE', id: note.id });
    if (editing.list === note.id) setEditing('list', null);
    if (editing.board === note.id) setEditing('board', null);
    announce(`Note '${note.title}' deleted.`);
    requestFocus(target);
  };

  const onCancelDelete = () => {
    setConfirmingDelete(false);
    requestFocus(`${base}-delete`);
  };

  return (
    <article ref={setNodeRef} className={`note-card${moving ? ' is-dragging' : ''}`} aria-labelledby={`${base}-title`}>
      {isEditing ? (
        <form aria-label={`Edit note ${note.title}`} noValidate onSubmit={onSave} onKeyDown={onFormKeyDown}>
          <Heading id={`${base}-title`} className="note-title">
            Editing: {note.title}
          </Heading>
          <NoteFields
            idPrefix={`${base}-edit`}
            values={values}
            onChange={(next) => {
              setValues(next);
              if (titleError && next.title.trim()) setTitleError(null);
            }}
            titleError={titleError}
          />
          <div className="card-actions">
            <button type="submit" className="btn btn-primary btn-small">
              Save
            </button>
            <button type="button" className="btn btn-small" onClick={stopEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="card-header">
            <DragHandle
              note={note}
              variant={variant}
              nameSuffix={nameSuffix}
              listeners={listeners}
              setActivatorNodeRef={setActivatorNodeRef}
            />
            <Heading id={`${base}-title`} className="note-title">
              {note.title}
            </Heading>
          </div>
          {moving && <p className="moving-label">Moving…</p>}
          {note.description && <p className="note-description">{note.description}</p>}
          {note.tags.length > 0 ? (
            <ul className="tags" aria-label="Tags">
              {note.tags.map((tag) => (
                <li key={tag} className="tag">
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No tags</p>
          )}
          {variant === 'list' && <p className="muted">Board column: {column ?? 'Not on board'}</p>}
          <ColumnMover note={note} variant={variant} nameSuffix={nameSuffix} />
          <div className="card-actions">
            <button
              id={`${base}-edit`}
              type="button"
              className="btn btn-small"
              aria-label={`Edit note ${note.title}${nameSuffix}`}
              onClick={startEdit}
            >
              Edit
            </button>
            <button
              id={`${base}-delete`}
              type="button"
              className="btn btn-small btn-danger"
              aria-label={`Delete note ${note.title}${nameSuffix}`}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          </div>
        </>
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete note?"
          message={`'${note.title}' will be permanently deleted.`}
          confirmLabel="Delete note"
          danger
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
    </article>
  );
}
