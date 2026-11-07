import { useMemo, useState } from 'react';
import { useBoard } from '../state/board.jsx';
import { columnOf } from '../state/reducer.js';
import { Dialog } from './Dialog.jsx';
import { NoteFields } from './fields.jsx';
import { useNoteForm } from './NoteForm.jsx';
import { Icon } from './Icon.jsx';

export function EditNoteDialog({ noteId, onClose }) {
  const { state, actions } = useBoard();
  const note = state.notes.find((n) => n.id === noteId);
  const initial = useMemo(
    () =>
      note
        ? {
            title: note.title,
            description: note.description,
            tags: note.tags,
            tagDraft: '',
            priority: note.priority,
            dueDate: note.dueDate,
            columnId: columnOf(state, note.id)?.id ?? '',
          }
        : null,
    // The form starts from the note as it was when the dialog opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [noteId],
  );
  const form = useNoteForm(initial || { title: '', description: '', tags: [], tagDraft: '', priority: 'none', dueDate: '', columnId: '' });
  const [warn, setWarn] = useState(false);

  if (!note) return null;

  const dirty = JSON.stringify(form.values) !== JSON.stringify(initial);

  const onSubmit = (e) => {
    e.preventDefault();
    const clean = form.validate();
    if (!clean) return;
    if (!dirty) {
      onClose();
      return;
    }
    actions.updateNote(noteId, clean);
    onClose({ saved: true });
  };

  return (
    <Dialog
      title="Edit note"
      onClose={onClose}
      beforeClose={() => {
        // Escape or the close button with unsaved changes: warn once instead of losing the work.
        if (dirty && !warn) {
          setWarn(true);
          return false;
        }
        return true;
      }}
    >
      <form noValidate onSubmit={onSubmit} className="note-form dialog-body">
        {warn && (
          <p className="notice notice-warning" role="alert">
            <Icon name="alert" />
            <span>
              You have unsaved changes. Choose <strong>Save changes</strong> to keep them, or <strong>Cancel</strong> to close without saving.
            </span>
          </p>
        )}
        <NoteFields
          values={form.values}
          errors={form.errors}
          columns={state.columns}
          onChange={(v) => {
            setWarn(false);
            form.onChange(v);
          }}
          titleRef={form.refs.title}
          descriptionRef={form.refs.description}
          tagsRef={form.refs.tags}
          dueRef={form.refs.dueDate}
        />
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => onClose()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Icon name="check" />
            Save changes
          </button>
        </div>
      </form>
    </Dialog>
  );
}
