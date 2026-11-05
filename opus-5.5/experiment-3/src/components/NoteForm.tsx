import type { FormEvent } from 'react';
import { newId } from '../model/ids';
import { useBoard } from '../state/BoardContext';
import { useFocusManager } from '../state/FocusContext';
import { focusKeys } from '../state/focusKeys';
import { usePreferences } from '../state/PreferencesContext';
import { useToasts } from '../state/ToastContext';
import { quote } from '../state/useNoteActions';
import { Icon } from './Icon';
import { EMPTY_DRAFT, NoteFields, noteValuesFromDraft, useNoteForm } from './NoteFields';

export function NoteForm() {
  const form = useNoteForm(EMPTY_DRAFT);
  const { commit } = useBoard();
  const { notify } = useToasts();
  const { requestFocus } = useFocusManager();
  const { play } = usePreferences();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) {
      play('error');
      return;
    }
    const now = new Date().toISOString();
    const values = noteValuesFromDraft(form.draft);
    commit({ type: 'addNote', note: { id: newId('note'), ...values, createdAt: now, updatedAt: now } });
    play('create');
    notify({ text: `Note ${quote(values.title)} created.` });
    form.reset();
    requestFocus(focusKeys.newTitle);
  };

  return (
    <section className="panel new-note" aria-labelledby="new-note-heading">
      <h2 id="new-note-heading" tabIndex={-1} data-focus={focusKeys.newNoteHeading}>
        New note
      </h2>
      <form noValidate onSubmit={onSubmit}>
        <NoteFields form={form} titleFocusKey={focusKeys.newTitle} />
        <button type="submit" className="button primary">
          <Icon name="plus" />
          <span>Add note</span>
        </button>
      </form>
    </section>
  );
}
