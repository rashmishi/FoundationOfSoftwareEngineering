import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { parseTags } from '../model/tags';
import type { Note, Priority } from '../model/types';
import { LIMITS, validateNoteFields, type NoteFieldErrors } from '../model/validation';
import { useAnnouncer } from '../state/AnnouncerContext';
import { describedBy, FieldError } from './FieldError';

export interface NoteDraft {
  title: string;
  description: string;
  tagsText: string;
  priority: Priority;
  dueDate: string;
}

export const EMPTY_DRAFT: NoteDraft = { title: '', description: '', tagsText: '', priority: 'none', dueDate: '' };

export function draftFromNote(note: Note): NoteDraft {
  return {
    title: note.title,
    description: note.description,
    tagsText: note.tags.join(', '),
    priority: note.priority,
    dueDate: note.dueDate ?? '',
  };
}

export function noteValuesFromDraft(draft: NoteDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    tags: parseTags(draft.tagsText),
    priority: draft.priority,
    dueDate: draft.dueDate || null,
  };
}

const FIELD_ORDER = ['title', 'description', 'tags', 'dueDate'] as const;

/** Form state + validation shared by the New note form and the Edit dialog (FR-1.4, FR-1.7, FR-1.8). */
export function useNoteForm(initial: NoteDraft) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<NoteFieldErrors>({});
  const refs = {
    title: useRef<HTMLInputElement>(null),
    description: useRef<HTMLTextAreaElement>(null),
    tags: useRef<HTMLInputElement>(null),
    dueDate: useRef<HTMLInputElement>(null),
  };
  const { announce } = useAnnouncer();

  /** Returns true when valid. Otherwise shows errors, focuses the first invalid field and keeps the values. */
  const validate = (): boolean => {
    const found = validateNoteFields({ ...draft, dueBadInput: refs.dueDate.current?.validity.badInput ?? false });
    setErrors(found);
    const invalid = FIELD_ORDER.filter((f) => found[f]);
    if (invalid.length === 0) return true;
    refs[invalid[0]].current?.focus();
    if (invalid.length > 1) announce(`Note not saved. ${invalid.length} fields need attention.`);
    return false;
  };

  const reset = () => {
    setDraft(EMPTY_DRAFT);
    setErrors({});
  };

  return { draft, setDraft, errors, validate, reset, refs };
}

type NoteForm = ReturnType<typeof useNoteForm>;

function CharCount({ value, limit, id }: { value: string; limit: number; id: string }) {
  const { announce } = useAnnouncer();
  const over = value.trim().length > limit;
  const wasOver = useRef(over);
  useEffect(() => {
    if (over && !wasOver.current) announce(`Over the limit of ${limit} characters.`);
    wasOver.current = over;
  }, [over, limit, announce]);
  if (value.length < limit * 0.9) return null;
  return (
    <p id={id} className={`char-count${over ? ' over' : ''}`}>
      {value.trim().length} of {limit} characters{over ? ' — too long' : ''}
    </p>
  );
}

export function NoteFields({ form, titleFocusKey }: { form: NoteForm; titleFocusKey?: string }) {
  const { draft, setDraft, errors, refs } = form;
  const id = useId();
  const set = <K extends keyof NoteDraft>(key: K, value: NoteDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const ids = {
    title: `${id}-title`, titleHint: `${id}-title-hint`, titleErr: `${id}-title-err`, titleCount: `${id}-title-count`,
    desc: `${id}-desc`, descHint: `${id}-desc-hint`, descErr: `${id}-desc-err`, descCount: `${id}-desc-count`,
    tags: `${id}-tags`, tagsHint: `${id}-tags-hint`, tagsErr: `${id}-tags-err`,
    prio: `${id}-prio`,
    due: `${id}-due`, dueHint: `${id}-due-hint`, dueErr: `${id}-due-err`,
  };
  const showTitleCount = draft.title.length >= LIMITS.title * 0.9;
  const showDescCount = draft.description.length >= LIMITS.description * 0.9;

  return (
    <div className="note-fields">
      <div className="field">
        <label htmlFor={ids.title}>
          Title <span className="required">(required)</span>
        </label>
        <p id={ids.titleHint} className="hint">Up to {LIMITS.title} characters.</p>
        <input
          ref={refs.title as RefObject<HTMLInputElement>}
          id={ids.title}
          type="text"
          required
          autoComplete="off"
          data-focus={titleFocusKey}
          value={draft.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describedBy(ids.titleHint, showTitleCount && ids.titleCount, errors.title && ids.titleErr)}
          onChange={(e) => set('title', e.target.value)}
        />
        <CharCount value={draft.title} limit={LIMITS.title} id={ids.titleCount} />
        <FieldError id={ids.titleErr} message={errors.title} />
      </div>

      <div className="field">
        <label htmlFor={ids.desc}>Description</label>
        <p id={ids.descHint} className="hint">Optional. Up to {LIMITS.description} characters.</p>
        <textarea
          ref={refs.description as RefObject<HTMLTextAreaElement>}
          id={ids.desc}
          rows={3}
          value={draft.description}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describedBy(ids.descHint, showDescCount && ids.descCount, errors.description && ids.descErr)}
          onChange={(e) => set('description', e.target.value)}
        />
        <CharCount value={draft.description} limit={LIMITS.description} id={ids.descCount} />
        <FieldError id={ids.descErr} message={errors.description} />
      </div>

      <div className="field">
        <label htmlFor={ids.tags}>Tags</label>
        <p id={ids.tagsHint} className="hint">Separate tags with commas. Each tag up to {LIMITS.tag} characters.</p>
        <input
          ref={refs.tags as RefObject<HTMLInputElement>}
          id={ids.tags}
          type="text"
          autoComplete="off"
          value={draft.tagsText}
          aria-invalid={errors.tags ? true : undefined}
          aria-describedby={describedBy(ids.tagsHint, errors.tags && ids.tagsErr)}
          onChange={(e) => set('tagsText', e.target.value)}
        />
        <FieldError id={ids.tagsErr} message={errors.tags} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.prio}>Priority</label>
          <select id={ids.prio} value={draft.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={ids.due}>Due date</label>
          <p id={ids.dueHint} className="hint">Optional.</p>
          <input
            ref={refs.dueDate as RefObject<HTMLInputElement>}
            id={ids.due}
            type="date"
            value={draft.dueDate}
            aria-invalid={errors.dueDate ? true : undefined}
            aria-describedby={describedBy(ids.dueHint, errors.dueDate && ids.dueErr)}
            onChange={(e) => set('dueDate', e.target.value)}
          />
          <FieldError id={ids.dueErr} message={errors.dueDate} />
        </div>
      </div>
    </div>
  );
}
