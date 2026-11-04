import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { formatCount } from '../format';
import { parseTags, PRIORITY_LABELS } from '../notes';
import { loadDraft, saveDraft } from '../storage';
import type { NoteDraft, Priority } from '../types';
import { FieldError } from './FieldError';

interface NoteFormProps {
  /** The note being edited. Left out when creating a new note. */
  initial?: NoteDraft;
  submitLabel: string;
  /** Returns false if the note was not saved, so that the form keeps its content. */
  onSave: (draft: NoteDraft) => boolean;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const PRIORITY_OPTIONS: Priority[] = ['none', 'low', 'medium', 'high'];

export function NoteForm({ initial, submitLabel, onSave, onCancel, onDirtyChange }: NoteFormProps) {
  const [restoredDraft] = useState(() => (initial ? null : loadDraft()));
  const initialTags = initial?.tags.join(', ') ?? '';
  const initialDueDate = initial?.dueDate ?? '';
  const [title, setTitle] = useState(restoredDraft?.title ?? initial?.title ?? '');
  const [description, setDescription] = useState(restoredDraft?.description ?? initial?.description ?? '');
  const [tags, setTags] = useState(restoredDraft?.tags ?? initialTags);
  const [priority, setPriority] = useState(restoredDraft?.priority ?? initial?.priority ?? 'none');
  const [dueDate, setDueDate] = useState(restoredDraft?.dueDate ?? initialDueDate);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showRestoredNote, setShowRestoredNote] = useState(restoredDraft !== null);
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const titleErrorId = `${id}-title-error`;
  const tagsHintId = `${id}-tags-hint`;
  const dueHintId = `${id}-due-hint`;
  const parsedTags = parseTags(tags);

  useEffect(() => {
    if (!initial) saveDraft({ title, description, tags, priority, dueDate });
    onDirtyChange?.(
      title !== initial?.title ||
        description !== initial.description ||
        tags !== initialTags ||
        priority !== initial.priority ||
        dueDate !== initialDueDate,
    );
  }, [initial, initialTags, initialDueDate, title, description, tags, priority, dueDate, onDirtyChange]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError('Enter a title for the note.');
      titleRef.current?.focus();
      return;
    }
    const saved = onSave({
      title: trimmedTitle,
      description,
      tags: parsedTags,
      priority: priority as Priority,
      dueDate: dueDate || null,
    });
    if (saved && !initial) {
      setTitle('');
      setDescription('');
      setTags('');
      setPriority('none');
      setDueDate('');
      setShowRestoredNote(false);
      titleRef.current?.focus();
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {showRestoredNote && <p className="field-note">We kept the note you were writing. Add it or change it below.</p>}

      <div className="field">
        <label htmlFor={`${id}-title`}>
          Title <span className="field-note">(required)</span>
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          type="text"
          required
          autoComplete="off"
          dir="auto"
          value={title}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? titleErrorId : undefined}
          data-autofocus
          onChange={(event) => {
            setTitle(event.target.value);
            if (event.target.value.trim()) setTitleError(null);
          }}
        />
        <FieldError id={titleErrorId} message={titleError} />
      </div>

      <div className="field">
        <label htmlFor={`${id}-description`}>
          Description <span className="field-note">(optional)</span>
        </label>
        <textarea
          id={`${id}-description`}
          rows={3}
          dir="auto"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor={`${id}-tags`}>
          Tags <span className="field-note">(optional)</span>
        </label>
        <p id={tagsHintId} className="field-note">
          {parsedTags.length > 0
            ? `This will save ${formatCount(parsedTags.length, 'tag')}: ${parsedTags.join(', ')}.`
            : 'Separate tags with commas, for example: work, urgent.'}
        </p>
        <input
          id={`${id}-tags`}
          type="text"
          autoComplete="off"
          dir="auto"
          value={tags}
          aria-describedby={tagsHintId}
          onChange={(event) => setTags(event.target.value)}
        />
      </div>

      <div className="form-pair">
        <div className="field">
          <label htmlFor={`${id}-priority`}>
            Priority <span className="field-note">(optional)</span>
          </label>
          <select id={`${id}-priority`} value={priority} onChange={(event) => setPriority(event.target.value)}>
            {PRIORITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`${id}-due`}>
            Due date <span className="field-note">(optional)</span>
          </label>
          <p id={dueHintId} className="field-note">
            Leave empty for no due date.
          </p>
          <input
            id={`${id}-due`}
            type="date"
            value={dueDate}
            aria-describedby={dueHintId}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
      </div>

      <div className="button-row">
        <button type="submit" className="button button-primary">
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
