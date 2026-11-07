import { useId, useRef, useState } from 'react';
import { Icon, PriorityIcon } from './Icon.jsx';
import { IconButton } from './IconButton.jsx';
import { LIMITS, PRIORITIES, PRIORITY_LABELS, addTag, tagHue } from '../lib/noteModel.js';

/** The ids that connect an input to its hint and its error message (aria-describedby). */
export function describe(id, { hint, error } = {}) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
}

export function FieldHint({ id, children }) {
  return (
    <p className="field-hint" id={`${id}-hint`}>
      {children}
    </p>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p className="field-error" id={`${id}-error`}>
      <Icon name="alert" />
      <span>
        <span className="sr-only">Error: </span>
        {children}
      </span>
    </p>
  );
}

export function TagChip({ tag }) {
  return (
    <span className="tag-chip" style={{ '--h': tagHue(tag) }}>
      {tag}
    </span>
  );
}

/** Tag entry: type a tag and press Enter or comma (or the Add tag button). Tags show as removable chips. */
export function TagInput({ id, tags, draft, onChange, error, inputRef }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const ownRef = useRef(null);
  const input = inputRef || ownRef;

  const commit = (raw, currentTags = tags) => {
    const res = addTag(currentTags, raw);
    if (res.added) {
      setMessage('');
      setStatus(`Tag ${res.tags[res.tags.length - 1]} added. ${res.tags.length} ${res.tags.length === 1 ? 'tag' : 'tags'} in total.`);
      return { tags: res.tags, draft: '' };
    }
    if (res.duplicate) {
      setMessage('');
      setStatus(`Tag ${res.duplicate} is already added.`);
      return { tags: currentTags, draft: '' };
    }
    if (res.error) {
      setMessage(res.error);
      return { tags: currentTags, draft: raw };
    }
    return { tags: currentTags, draft: '' };
  };

  const onInput = (e) => {
    const value = e.target.value;
    if (!value.includes(',')) {
      setMessage('');
      onChange({ tags, draft: value });
      return;
    }
    // Typing or pasting "a, b, c" adds each complete tag and keeps the last, unfinished part in the box.
    const parts = value.split(',');
    const rest = parts.pop();
    let next = { tags, draft: '' };
    for (const part of parts) next = commit(part, next.tags);
    onChange({ tags: next.tags, draft: rest });
  };

  const add = () => {
    onChange(commit(draft));
    input.current?.focus();
  };

  const shownError = error || message;
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;

  return (
    <div className="field">
      <label htmlFor={inputId} className="field-label">
        Tags <span className="optional">(optional)</span>
      </label>
      <p className="field-hint" id={hintId}>
        Type a tag, then press Enter or comma, or choose Add tag. Up to {LIMITS.tags} tags.
      </p>
      <div className="tag-entry">
        <input
          ref={input}
          id={inputId}
          type="text"
          className="input"
          value={draft}
          autoComplete="off"
          enterKeyHint="enter"
          aria-invalid={shownError ? true : undefined}
          aria-describedby={[hintId, shownError ? `${id}-error` : null].filter(Boolean).join(' ')}
          onChange={onInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Enter adds the tag; it must not submit the whole form by accident.
              e.preventDefault();
              if (draft.trim()) add();
            }
          }}
        />
        <button type="button" className="btn" onClick={add}>
          <Icon name="plus" />
          Add tag
        </button>
      </div>
      <FieldError id={id}>{shownError}</FieldError>
      {tags.length > 0 && (
        <ul className="chip-list" aria-label="Tags added">
          {tags.map((tag) => (
            <li key={tag} className="chip-item">
              <span className="tag-chip tag-chip-removable" style={{ '--h': tagHue(tag) }}>
                <span>{tag}</span>
                <IconButton
                  icon="x"
                  label={`Remove tag ${tag}`}
                  className="chip-remove"
                  onClick={() => {
                    onChange({ tags: tags.filter((t) => t !== tag), draft });
                    setStatus(`Tag ${tag} removed.`);
                    input.current?.focus();
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

/**
 * The fields of a note, shared by the "Add a note" form and the edit dialog.
 * values: { title, description, tags, tagDraft, priority, dueDate, columnId }
 */
export function NoteFields({ values, errors, columns, onChange, titleRef, tagsRef, descriptionRef, dueRef }) {
  const base = useId();
  const set = (patch) => onChange({ ...values, ...patch });
  const id = (name) => `${base}-${name}`;

  return (
    <>
      <div className="field">
        <label htmlFor={id('title')} className="field-label">
          Title <span className="required">(required)</span>
        </label>
        <p className="field-hint" id={`${id('title')}-hint`}>
          A short name for the note, up to {LIMITS.title} characters.
        </p>
        <input
          ref={titleRef}
          id={id('title')}
          type="text"
          className="input"
          required
          autoComplete="off"
          value={values.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describe(id('title'), { hint: true, error: errors.title })}
          data-autofocus
          onChange={(e) => set({ title: e.target.value })}
        />
        <FieldError id={id('title')}>{errors.title}</FieldError>
      </div>

      <div className="field">
        <label htmlFor={id('description')} className="field-label">
          Description <span className="optional">(optional)</span>
        </label>
        <textarea
          ref={descriptionRef}
          id={id('description')}
          className="input textarea"
          rows={3}
          value={values.description}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describe(id('description'), { error: errors.description })}
          onChange={(e) => set({ description: e.target.value })}
        />
        <FieldError id={id('description')}>{errors.description}</FieldError>
      </div>

      <TagInput
        id={id('tags')}
        tags={values.tags}
        draft={values.tagDraft}
        error={errors.tags}
        inputRef={tagsRef}
        onChange={({ tags, draft }) => set({ tags, tagDraft: draft })}
      />

      <fieldset className="field fieldset">
        <legend className="field-label">
          Priority <span className="optional">(optional)</span>
        </legend>
        <div className="segmented">
          {PRIORITIES.map((p) => (
            <label key={p} className="seg" data-priority={p}>
              <input type="radio" name={id('priority')} value={p} checked={values.priority === p} onChange={() => set({ priority: p })} />
              <span className="seg-box">
                {p !== 'none' && <PriorityIcon level={p} />}
                <span>{PRIORITY_LABELS[p]}</span>
                <Icon name="check" className="seg-check" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={id('due')} className="field-label">
          Due date <span className="optional">(optional)</span>
        </label>
        <p className="field-hint" id={`${id('due')}-hint`}>
          Notes past their due date are marked Overdue.
        </p>
        <input
          ref={dueRef}
          id={id('due')}
          type="date"
          className="input"
          value={values.dueDate}
          aria-invalid={errors.dueDate ? true : undefined}
          aria-describedby={describe(id('due'), { hint: true, error: errors.dueDate })}
          onChange={(e) => set({ dueDate: e.target.value })}
        />
        <FieldError id={id('due')}>{errors.dueDate}</FieldError>
      </div>

      <div className="field">
        <label htmlFor={id('column')} className="field-label">
          Board column <span className="optional">(optional)</span>
        </label>
        <p className="field-hint" id={`${id('column')}-hint`}>
          Choose a column to place the note on the board. You can also move it later.
        </p>
        <select
          id={id('column')}
          className="input select"
          value={values.columnId}
          aria-describedby={`${id('column')}-hint`}
          onChange={(e) => set({ columnId: e.target.value })}
        >
          <option value="">Not on the board</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export const emptyValues = () => ({ title: '', description: '', tags: [], tagDraft: '', priority: 'none', dueDate: '', columnId: '' });

/** Applies a half-typed tag to the list. Returns { tags, error } for the submit handler. */
export function tagsWithDraft(values) {
  if (!values.tagDraft.trim()) return { tags: values.tags, error: null };
  const res = addTag(values.tags, values.tagDraft);
  if (res.error) return { tags: values.tags, error: res.error };
  return { tags: res.tags, error: null };
}
