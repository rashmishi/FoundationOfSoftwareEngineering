import { useEffect, useRef, useState } from 'react';
import type { Note } from '../types';
import { useNotes } from '../state/NotesContext';
import { NoteForm } from './NoteForm';
import { MoveToColumn } from './MoveToColumn';
import { TagList } from './TagList';
import { useNoteDrag } from './useNoteDrag';

interface NoteItemProps {
  note: Note;
  onDeleted: () => void;
}

export function NoteItem({ note, onDeleted }: NoteItemProps) {
  const { state, dispatch, announce } = useNotes();
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const { isDragging, dragProps } = useNoteDrag(note.id, !editing);
  const column = state.columns.find((c) => c.id === note.columnId);

  // Return focus to the Edit button when leaving edit mode.
  useEffect(() => {
    if (wasEditing.current && !editing) editButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (editing) {
    return (
      <li className="note-item editing">
        <NoteForm
          label={`Edit note “${note.title}”`}
          initial={note}
          submitLabel="Save changes"
          autoFocus
          onSubmit={(input) => {
            dispatch({ type: 'updateNote', id: note.id, note: input });
            setEditing(false);
            announce('success', `Note “${input.title}” updated.`);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={`note-item${isDragging ? ' is-dragging' : ''}`} {...dragProps}>
      <article aria-labelledby={`note-${note.id}-title`}>
        <div className="note-heading">
          <h3 id={`note-${note.id}-title`} className="note-title">
            {note.title}
          </h3>
          <span className={`badge${column ? '' : ' muted'}`}>{column ? column.name : 'Unassigned'}</span>
        </div>
        {note.description && <p className="note-description">{note.description}</p>}
        <TagList tags={note.tags} />
        <div className="note-actions">
          <MoveToColumn note={note} />
          <button
            ref={editButtonRef}
            type="button"
            className="button"
            aria-label={`Edit “${note.title}”`}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          <button
            type="button"
            className="button danger"
            aria-label={`Delete “${note.title}”`}
            onClick={() => {
              dispatch({ type: 'deleteNote', id: note.id });
              announce('success', `Note “${note.title}” deleted.`);
              onDeleted();
            }}
          >
            Delete
          </button>
        </div>
      </article>
    </li>
  );
}
