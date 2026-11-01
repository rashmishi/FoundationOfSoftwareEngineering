import { useEffect, useRef, useState } from 'react';
import type { Note, NoteDraft } from '../types';
import { Dialog } from './Dialog';
import { NoteForm } from './NoteForm';

interface EditNoteDialogProps {
  note: Note;
  onSave: (draft: NoteDraft) => boolean;
  onClose: () => void;
}

/** Edits a note, and checks before closing if that would lose changes. */
export function EditNoteDialog({ note, onSave, onClose }: EditNoteDialogProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isConfirming) keepEditingRef.current?.focus();
  }, [isConfirming]);

  function keepEditing() {
    setIsConfirming(false);
    // The form is hidden until this render finishes.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('dialog [data-autofocus]')?.focus());
  }

  function requestClose() {
    if (isConfirming) {
      keepEditing();
    } else if (isDirty) {
      setIsConfirming(true);
    } else {
      onClose();
    }
  }

  return (
    <Dialog title="Edit note" onClose={onClose} onRequestClose={requestClose}>
      {() => (
        <>
          {isConfirming && (
            <div role="alert">
              <p>You have changes that are not saved. If you leave now, they will be lost.</p>
              <div className="button-row">
                <button ref={keepEditingRef} type="button" className="button" onClick={keepEditing}>
                  Keep editing
                </button>
                <button type="button" className="button button-danger" onClick={onClose}>
                  Discard changes
                </button>
              </div>
            </div>
          )}
          {/* Hidden rather than removed, so that the changes survive "Keep editing". */}
          <div hidden={isConfirming}>
            <NoteForm
              initial={note}
              submitLabel="Save changes"
              onSave={onSave}
              onCancel={requestClose}
              onDirtyChange={setIsDirty}
            />
          </div>
        </>
      )}
    </Dialog>
  );
}
