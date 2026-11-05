import { useEffect, useState, type FormEvent } from 'react';
import { validateDraft } from '../model/notes';
import type { Note, NoteDraft } from '../types';
import { Modal } from './Modal';
import { fromDraft, NoteFields, toDraft, type FieldValues } from './NoteFields';

interface EditNoteDialogProps {
  note: Note | null;
  onSave: (id: string, draft: NoteDraft) => void;
  onClose: () => void;
}

export function EditNoteDialog({ note, onSave, onClose }: EditNoteDialogProps) {
  const [values, setValues] = useState<FieldValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(note ? fromDraft(note) : null);
    setError(null);
  }, [note]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!note || !values) return;
    const draft = toDraft(values);
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(note.id, draft);
    onClose();
  };

  return (
    <Modal open={note !== null} title="Edit note" onClose={onClose}>
      {values && (
        <form onSubmit={submit} noValidate>
          <NoteFields values={values} onChange={setValues} titleError={error} />
          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              Save changes
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
