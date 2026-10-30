import { useId, useRef, useState, type FormEvent } from 'react';
import { LIMITS, type NoteInput } from '../types';
import { parseTags, validateTitle } from '../state/notesReducer';

interface NoteFormProps {
  initial?: NoteInput;
  submitLabel: string;
  /** Accessible name of the form (e.g. “New note”, “Edit note”). */
  label: string;
  onSubmit: (note: NoteInput) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function NoteForm({ initial, submitLabel, label, onSubmit, onCancel, autoFocus }: NoteFormProps) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateTitle(title);
    if (problem) {
      setError(problem);
      titleRef.current?.focus();
      return;
    }
    setError(null);
    onSubmit({ title: title.trim(), description, tags: parseTags(tags) });
    if (!initial) {
      setTitle('');
      setDescription('');
      setTags('');
      titleRef.current?.focus();
    }
  }

  return (
    <form className="note-form" aria-label={label} onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-title`}>
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          type="text"
          value={title}
          maxLength={LIMITS.title}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-title-error` : undefined}
          autoFocus={autoFocus}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
        />
        {error && (
          <p id={`${id}-title-error`} className="field-error">
            {error}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea
          id={`${id}-description`}
          value={description}
          rows={3}
          maxLength={LIMITS.description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-tags`}>Tags</label>
        <input
          id={`${id}-tags`}
          type="text"
          value={tags}
          aria-describedby={`${id}-tags-hint`}
          onChange={(e) => setTags(e.target.value)}
        />
        <p id={`${id}-tags-hint`} className="hint">
          Separate tags with commas, e.g. work, urgent
        </p>
      </div>
      <div className="form-actions">
        <button type="submit" className="button primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
