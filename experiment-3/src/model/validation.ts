import { isValidISODate } from './dates';
import { parseTags } from './tags';

export const LIMITS = { title: 200, description: 5000, tag: 40, columnName: 60 } as const;

export interface NoteFieldValues {
  title: string;
  description: string;
  tagsText: string;
  dueDate: string;
  /** The date input's validity.badInput: the user typed something that is not a date (FR-10.5). */
  dueBadInput?: boolean;
}

export type NoteFieldName = 'title' | 'description' | 'tags' | 'dueDate';
export type NoteFieldErrors = Partial<Record<NoteFieldName, string>>;

export function titleError(title: string): string | undefined {
  const trimmed = title.trim();
  if (!trimmed) return 'Enter a title for the note.';
  if (trimmed.length > LIMITS.title) {
    return `Title can be at most ${LIMITS.title} characters (you have ${trimmed.length}).`;
  }
  return undefined;
}

export function validateNoteFields(values: NoteFieldValues): NoteFieldErrors {
  const errors: NoteFieldErrors = {};
  const title = titleError(values.title);
  if (title) errors.title = title;

  const description = values.description.trim();
  if (description.length > LIMITS.description) {
    errors.description = `Description can be at most ${LIMITS.description} characters (you have ${description.length}).`;
  }

  const longTag = parseTags(values.tagsText).find((tag) => tag.length > LIMITS.tag);
  if (longTag) {
    const shown = longTag.length > 20 ? `${longTag.slice(0, 20)}…` : longTag;
    errors.tags = `Tag "${shown}" is longer than ${LIMITS.tag} characters. Shorten it.`;
  }

  if (values.dueBadInput || (values.dueDate && !isValidISODate(values.dueDate))) {
    errors.dueDate = 'Enter a valid date, for example 2026-11-03.';
  }
  return errors;
}

export function columnNameError(
  name: string,
  existing: { id: string; name: string }[],
  ignoreId?: string,
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a name for the column.';
  if (trimmed.length > LIMITS.columnName) {
    return `Column name can be at most ${LIMITS.columnName} characters (you have ${trimmed.length}).`;
  }
  const clash = existing.find((c) => c.id !== ignoreId && c.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (clash) return `A column named "${clash.name}" already exists. Choose a different name.`;
  return undefined;
}
