import { useRef, useState } from 'react';
import { useBoard } from '../state/board.jsx';
import { NoteFields, emptyValues, tagsWithDraft } from './fields.jsx';
import { validateNote } from '../lib/noteModel.js';
import { playSound } from '../lib/sound.js';
import { Icon } from './Icon.jsx';

/**
 * Form state shared by the "Add a note" form and the edit dialog: values, per-field errors that clear
 * as soon as the person fixes the field, and a validate() that moves focus to the first problem.
 */
export function useNoteForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const refs = { title: useRef(null), description: useRef(null), tags: useRef(null), dueDate: useRef(null) };

  const onChange = (next) => {
    setValues(next);
    setErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const copy = { ...prev };
      if (next.title !== values.title) delete copy.title;
      if (next.description !== values.description) delete copy.description;
      if (next.tags !== values.tags || next.tagDraft !== values.tagDraft) delete copy.tags;
      if (next.dueDate !== values.dueDate) delete copy.dueDate;
      return copy;
    });
  };

  /** Returns the cleaned values when valid. Otherwise shows the errors, focuses the first one and returns null. */
  const validate = () => {
    const { tags, error: tagError } = tagsWithDraft(values);
    const found = validateNote(values);
    if (tagError) found.tags = tagError;
    if (Object.keys(found).length) {
      setErrors(found);
      playSound('error');
      const first = ['title', 'description', 'tags', 'dueDate'].find((k) => found[k]);
      refs[first].current?.focus();
      return null;
    }
    setErrors({});
    return { ...values, tags, tagDraft: '' };
  };

  return { values, setValues, errors, setErrors, onChange, validate, refs };
}

export function NoteForm() {
  const { state, actions } = useBoard();
  const form = useNoteForm(emptyValues());

  const onSubmit = (e) => {
    e.preventDefault();
    const clean = form.validate();
    if (!clean) return;
    actions.createNote(clean);
    form.setValues(emptyValues());
    // Keep going: focus returns to the title so several notes can be added in a row.
    form.refs.title.current?.focus();
  };

  return (
    <section className="panel" aria-labelledby="add-note-heading">
      <h2 id="add-note-heading" tabIndex={-1} className="panel-title">
        Add a note
      </h2>
      <form noValidate onSubmit={onSubmit} className="note-form">
        <p className="form-intro">
          Fields marked <strong>(required)</strong> must be filled in. All other fields are optional.
        </p>
        <NoteFields
          values={form.values}
          errors={form.errors}
          columns={state.columns}
          onChange={form.onChange}
          titleRef={form.refs.title}
          descriptionRef={form.refs.description}
          tagsRef={form.refs.tags}
          dueRef={form.refs.dueDate}
        />
        <button type="submit" className="btn btn-primary btn-wide">
          <Icon name="plus" />
          Add note
        </button>
      </form>
    </section>
  );
}
