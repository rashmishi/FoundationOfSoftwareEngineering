import { useState, type FormEvent } from 'react';
import { addNote, type NoteInput } from '../model/reducer';
import { useAnnouncer } from '../state/AnnouncerContext';
import { useStore } from '../state/StoreContext';
import { NoteFields } from './NoteFields';
import { useFieldErrorFocus } from './useFieldErrorFocus';

const EMPTY: NoteInput = { title: '', description: '', tags: '' };
const TITLE_REQUIRED = 'Title is required.';

/** "Create note" form (FR-1). */
export function NoteForm() {
  const { dispatch } = useStore();
  const { announce } = useAnnouncer();
  const showFieldError = useFieldErrorFocus();
  const [values, setValues] = useState<NoteInput>(EMPTY);
  const [titleError, setTitleError] = useState<string | null>(null);

  const onChange = (next: NoteInput) => {
    setValues(next);
    if (titleError && next.title.trim()) setTitleError(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setTitleError(TITLE_REQUIRED);
      showFieldError('create-title', TITLE_REQUIRED);
      return;
    }
    const action = addNote(values);
    dispatch(action);
    announce(`Note '${action.note.title}' created.`);
    setValues(EMPTY);
    setTitleError(null);
    document.getElementById('create-title')?.focus();
  };

  return (
    <section aria-labelledby="create-heading" className="panel">
      <h2 id="create-heading" tabIndex={-1}>
        Create note
      </h2>
      <form aria-labelledby="create-heading" noValidate onSubmit={onSubmit} className="note-form">
        <NoteFields idPrefix="create" values={values} onChange={onChange} titleError={titleError} />
        <button type="submit" className="btn btn-primary">
          Create note
        </button>
      </form>
    </section>
  );
}
