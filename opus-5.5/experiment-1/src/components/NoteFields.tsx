import { useId, type RefObject } from 'react';
import { DESCRIPTION_MAX, parseTags, TITLE_MAX } from '../model/notes';
import { PRIORITIES, PRIORITY_LABELS, type NoteDraft, type Priority } from '../types';
import { TagList } from './Badges';

export interface FieldValues {
  title: string;
  description: string;
  tags: string;
  priority: Priority;
  dueDate: string;
}

export const EMPTY_FIELDS: FieldValues = { title: '', description: '', tags: '', priority: 'none', dueDate: '' };

export function toDraft(values: FieldValues): NoteDraft {
  return {
    title: values.title,
    description: values.description,
    tags: parseTags(values.tags),
    priority: values.priority,
    dueDate: values.dueDate || null,
  };
}

export function fromDraft(draft: NoteDraft): FieldValues {
  return {
    title: draft.title,
    description: draft.description,
    tags: draft.tags.join(', '),
    priority: draft.priority,
    dueDate: draft.dueDate ?? '',
  };
}

interface NoteFieldsProps {
  values: FieldValues;
  onChange: (values: FieldValues) => void;
  titleError: string | null;
  titleRef?: RefObject<HTMLInputElement | null>;
}

export function NoteFields({ values, onChange, titleError, titleRef }: NoteFieldsProps) {
  const id = useId();
  const set = <K extends keyof FieldValues>(key: K, value: FieldValues[K]) => onChange({ ...values, [key]: value });
  const tags = parseTags(values.tags);

  return (
    <div className="fields">
      <div className="field">
        <label htmlFor={`${id}-title`}>
          Title <span className="required" aria-hidden="true">*</span>
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          className="input"
          value={values.title}
          maxLength={TITLE_MAX}
          required
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? `${id}-title-error` : undefined}
          onChange={(e) => set('title', e.target.value)}
        />
        {titleError && (
          <p id={`${id}-title-error`} className="field-error" role="alert">
            {titleError}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea
          id={`${id}-description`}
          className="input"
          rows={3}
          value={values.description}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-tags`}>Tags</label>
        <input
          id={`${id}-tags`}
          className="input"
          value={values.tags}
          placeholder="e.g. work, urgent"
          aria-describedby={`${id}-tags-hint`}
          onChange={(e) => set('tags', e.target.value)}
        />
        <p id={`${id}-tags-hint`} className="field-hint">
          Separate tags with commas.
        </p>
        {tags.length > 0 && (
          <div className="tag-preview" aria-hidden="true">
            <TagList tags={tags} />
          </div>
        )}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-priority`}>Priority</label>
          <select id={`${id}-priority`} className="input" value={values.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-due`}>Due date</label>
          <input id={`${id}-due`} type="date" className="input" value={values.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </div>
      </div>
    </div>
  );
}
