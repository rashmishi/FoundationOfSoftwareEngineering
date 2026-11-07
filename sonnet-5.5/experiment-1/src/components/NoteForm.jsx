import { useId, useRef, useState } from 'react';
import { useApp } from '../context.js';
import { LIMITS, PRIORITIES, allTags, normalizeTags } from '../lib/store.js';
import { PRIORITY_LABEL } from './Badges.jsx';
import Modal from './Modal.jsx';
import TagInput from './TagInput.jsx';

/** Create / edit dialog. `note` is null when creating. */
export default function NoteForm({ note, initialColumnId, onSave, onClose }) {
  const { state } = useApp();
  const uid = useId();
  const titleRef = useRef(null);

  const [title, setTitle] = useState(note?.title ?? '');
  const [description, setDescription] = useState(note?.description ?? '');
  const [tags, setTags] = useState(note?.tags ?? []);
  const [draft, setDraft] = useState('');
  const [priority, setPriority] = useState(note?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(note?.dueDate ?? '');
  const [columnId, setColumnId] = useState(note ? note.columnId ?? '' : initialColumnId ?? '');
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const values = {
      title,
      description,
      tags: normalizeTags([...tags, ...draft.split(',')]), // keep a tag that was typed but not yet confirmed
      priority,
      dueDate,
      columnId: columnId || null,
    };
    const result = onSave(values);
    if (result && Object.keys(result).length) {
      setErrors(result);
      titleRef.current?.focus();
    }
  };

  const titleError = errors.title;
  return (
    <Modal title={note ? 'Edit note' : 'New note'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body form-grid">
          <div className="field">
            <label htmlFor={`${uid}-title`}>
              Title <span className="req">(required)</span>
            </label>
            <input
              ref={titleRef}
              id={`${uid}-title`}
              type="text"
              data-autofocus
              value={title}
              maxLength={LIMITS.title}
              autoComplete="off"
              aria-invalid={titleError ? 'true' : undefined}
              aria-describedby={titleError ? `${uid}-title-err` : undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: undefined });
              }}
            />
            {titleError && (
              <p id={`${uid}-title-err`} className="field-error" role="alert">
                {titleError}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor={`${uid}-desc`}>Description</label>
            <textarea id={`${uid}-desc`} rows={4} value={description} maxLength={LIMITS.description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor={`${uid}-tags`}>Tags</label>
            <TagInput
              id={`${uid}-tags`}
              tags={tags}
              draft={draft}
              onTagsChange={setTags}
              onDraftChange={setDraft}
              suggestions={allTags(state)}
              describedBy={`${uid}-tags-hint`}
            />
            <p id={`${uid}-tags-hint`} className="hint">
              Press Enter or comma after each tag.
            </p>
          </div>

          <fieldset className="field priority-field">
            <legend>Priority</legend>
            <div className="segmented">
              {PRIORITIES.map((p) => (
                <label key={p} className={`seg priority-${p}` + (priority === p ? ' on' : '')}>
                  <input type="radio" name={`${uid}-priority`} value={p} checked={priority === p} onChange={() => setPriority(p)} />
                  <span>{PRIORITY_LABEL[p]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field-row">
            <div className="field">
              <label htmlFor={`${uid}-due`}>Due date</label>
              <input id={`${uid}-due`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`${uid}-col`}>Board column</label>
              <select id={`${uid}-col`} value={columnId} onChange={(e) => setColumnId(e.target.value)}>
                <option value="">Not on the board</option>
                {state.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {note ? 'Save changes' : 'Create note'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
