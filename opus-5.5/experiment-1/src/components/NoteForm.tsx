import { useRef, useState, type FormEvent } from 'react';
import { validateDraft } from '../model/notes';
import type { NoteDraft } from '../types';
import { PlusIcon } from './Icons';
import { EMPTY_FIELDS, NoteFields, toDraft, type FieldValues } from './NoteFields';

/** `onCreate` returns an error message when the note is rejected. */
export function NoteForm({ onCreate }: { onCreate: (draft: NoteDraft) => string | null }) {
  const [values, setValues] = useState<FieldValues>(EMPTY_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const draft = toDraft(values);
    const problem = validateDraft(draft) ?? onCreate(draft);
    if (problem) {
      setError(problem);
      titleRef.current?.focus();
      return;
    }
    setValues(EMPTY_FIELDS);
    setError(null);
    titleRef.current?.focus();
  };

  return (
    <section className="note-form-panel" aria-labelledby="new-note-heading">
      <h2 id="new-note-heading" className="panel-heading">
        New note
      </h2>
      <form className="note-form" onSubmit={submit} noValidate>
        <NoteFields
          values={values}
          titleError={error}
          titleRef={titleRef}
          onChange={(next) => {
            setValues(next);
            if (error && next.title.trim()) setError(null);
          }}
        />
        <button type="submit" className="button button-primary button-block">
          <PlusIcon /> Add note
        </button>
      </form>
    </section>
  );
}
