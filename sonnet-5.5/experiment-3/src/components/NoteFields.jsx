import { PRIORITIES, PRIORITY_LABELS, parseTags } from '../lib/helpers.js';

export function emptyDraft() {
  return { title: '', description: '', tags: '', priority: 'medium', dueDate: '' };
}

export function draftFromNote(note) {
  return { title: note.title, description: note.description, tags: note.tags.join(', '), priority: note.priority, dueDate: note.dueDate };
}

/** Returns { errors, values } for a draft. A note needs a title; everything else is optional. */
export function checkDraft(draft) {
  const errors = {};
  if (!draft.title.trim()) errors.title = 'Enter a title for the note.';
  return {
    errors,
    values: {
      title: draft.title.trim(),
      description: draft.description.trim(),
      tags: parseTags(draft.tags),
      priority: draft.priority,
      dueDate: draft.dueDate,
    },
  };
}

/** Moves keyboard focus to the title field after a failed save. */
export function focusTitle(idPrefix) {
  document.getElementById(`${idPrefix}-title`)?.focus();
}

export default function NoteFields({ idPrefix, draft, errors, onChange }) {
  const set = (field) => (e) => onChange({ ...draft, [field]: e.target.value });
  return (
    <>
      <p className="hint">Fields marked * are required.</p>
      <div className="field">
        <label htmlFor={`${idPrefix}-title`}>
          Title <span aria-hidden="true">*</span>
          <span className="sr-label"> (required)</span>
        </label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={draft.title}
          onChange={set('title')}
          aria-required="true"
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? `${idPrefix}-title-error` : undefined}
        />
        {errors.title && (
          <p id={`${idPrefix}-title-error`} className="field-error">
            {errors.title}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-desc`}>Description</label>
        <textarea id={`${idPrefix}-desc`} rows="3" value={draft.description} onChange={set('description')} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-tags`}>Tags</label>
        <input id={`${idPrefix}-tags`} type="text" value={draft.tags} onChange={set('tags')} aria-describedby={`${idPrefix}-tags-hint`} />
        <p id={`${idPrefix}-tags-hint`} className="hint">
          Separate tags with commas, for example: work, home
        </p>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${idPrefix}-priority`}>Priority</label>
          <select id={`${idPrefix}-priority`} value={draft.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-due`}>Due date</label>
          <input id={`${idPrefix}-due`} type="date" value={draft.dueDate} onChange={set('dueDate')} />
        </div>
      </div>
    </>
  );
}
