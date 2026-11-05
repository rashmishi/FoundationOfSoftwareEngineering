import type { BoardState, Column, Note, NoteDraft } from '../types';

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;
export const COLUMN_NAME_MAX = 40;

export function newId(): string {
  return crypto.randomUUID();
}

/** Splits comma-separated tags, trimming and dropping empties and case-insensitive duplicates. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(',')) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

/** Returns an error message, or null when the draft can be saved. */
export function validateDraft(draft: NoteDraft): string | null {
  const title = draft.title.trim();
  if (!title) return 'Title is required.';
  if (title.length > TITLE_MAX) return `Title must be at most ${TITLE_MAX} characters.`;
  if (draft.description.length > DESCRIPTION_MAX) {
    return `Description must be at most ${DESCRIPTION_MAX} characters.`;
  }
  return null;
}

export function normaliseDraft(draft: NoteDraft): NoteDraft {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    tags: parseTags(draft.tags.join(',')),
    priority: draft.priority,
    dueDate: draft.dueDate || null,
  };
}

export function createNote(draft: NoteDraft, id = newId(), now = new Date().toISOString()): Note {
  return { id, ...normaliseDraft(draft), createdAt: now, updatedAt: now };
}

export function validateColumnName(name: string, columns: Column[], ignoreId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Column name is required.';
  if (trimmed.length > COLUMN_NAME_MAX) return `Column name must be at most ${COLUMN_NAME_MAX} characters.`;
  const clash = columns.some((c) => c.id !== ignoreId && c.name.toLowerCase() === trimmed.toLowerCase());
  return clash ? `A column named “${trimmed}” already exists.` : null;
}

export function createColumn(name: string, id = newId()): Column {
  return { id, name: name.trim(), collapsed: false, noteIds: [] };
}

export function defaultBoard(): BoardState {
  return {
    notes: [],
    columns: [
      { id: 'todo', name: 'To do', collapsed: false, noteIds: [] },
      { id: 'in-progress', name: 'In progress', collapsed: false, noteIds: [] },
      { id: 'done', name: 'Done', collapsed: false, noteIds: [] },
    ],
  };
}

export function findColumnOf(state: BoardState, noteId: string): Column | undefined {
  return state.columns.find((c) => c.noteIds.includes(noteId));
}

export function isDoneColumn(column: Column | undefined): boolean {
  return column?.name.trim().toLowerCase() === 'done';
}

export function allTags(notes: Note[]): string[] {
  const byKey = new Map<string, string>();
  for (const note of notes) {
    for (const tag of note.tags) {
      const key = tag.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, tag);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
