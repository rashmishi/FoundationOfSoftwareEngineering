import type { BoardData, Note, NoteDraft, Priority } from './types';

export const PRIORITY_LABELS: Record<Priority, string> = {
  none: 'No priority',
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
};

/** Lower ranks come first when sorting by priority. */
export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };

/** The number of tag colours defined in styles.css. */
const TAG_COLOUR_COUNT = 6;

/** Picks a colour for a tag from its text, so the same tag always gets the same colour. */
export function tagColour(tag: string): number {
  let hash = 0;
  for (const character of tag.toLowerCase()) {
    hash = (hash * 31 + character.codePointAt(0)!) % 9973;
  }
  return hash % TAG_COLOUR_COUNT;
}

/**
 * crypto.randomUUID only exists in secure contexts, and a self-hosted deployment
 * may well be plain HTTP. getRandomValues is available everywhere.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function defaultData(): BoardData {
  return {
    notes: [],
    columns: [
      { id: 'todo', name: 'To do' },
      { id: 'in-progress', name: 'In progress' },
      { id: 'done', name: 'Done' },
    ],
  };
}

/** Splits comma-separated input into tags, dropping blanks and repeats. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of input.split(',')) {
    const tag = part.trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

export function addNote(data: BoardData, draft: NoteDraft): BoardData {
  const now = new Date().toISOString();
  const note: Note = {
    ...draft,
    id: newId(),
    columnId: null,
    createdAt: now,
    updatedAt: now,
    // Drafts saved before priorities and due dates existed may not have them.
    priority: draft.priority ?? 'none',
    dueDate: draft.dueDate ?? null,
  };
  return { ...data, notes: [...data.notes, note] };
}

export function updateNote(data: BoardData, id: string, draft: NoteDraft): BoardData {
  const updatedAt = new Date().toISOString();
  const { title, description, tags, priority, dueDate } = draft;
  return {
    ...data,
    notes: data.notes.map((note) =>
      note.id === id ? { ...note, title, description, tags, priority, dueDate, updatedAt } : note,
    ),
  };
}

export function deleteNote(data: BoardData, id: string): BoardData {
  return { ...data, notes: data.notes.filter((note) => note.id !== id) };
}

export function notesInColumn(data: BoardData, columnId: string | null): Note[] {
  return data.notes.filter((note) => note.columnId === columnId);
}

/**
 * Moves a note to a column, at a position among that column's other notes. Without
 * a position, the note goes to the end of the column.
 */
export function moveNote(data: BoardData, id: string, columnId: string | null, index?: number): BoardData {
  const note = data.notes.find((candidate) => candidate.id === id);
  if (!note) return data;
  const moved = { ...note, columnId, updatedAt: new Date().toISOString() };
  const others = data.notes.filter((candidate) => candidate.id !== id);
  const siblings = others.filter((candidate) => candidate.columnId === columnId);

  let at: number;
  if (columnId === null) {
    at = data.notes.indexOf(note);
  } else if (index !== undefined && index < siblings.length) {
    at = others.indexOf(siblings[Math.max(index, 0)]);
  } else {
    at = siblings.length > 0 ? others.indexOf(siblings[siblings.length - 1]) + 1 : others.length;
  }
  others.splice(at, 0, moved);
  return { ...data, notes: others };
}

export function isColumnNameTaken(data: BoardData, name: string, exceptId?: string): boolean {
  const wanted = name.trim().toLowerCase();
  return data.columns.some((column) => column.id !== exceptId && column.name.toLowerCase() === wanted);
}

export function addColumn(data: BoardData, name: string): BoardData {
  return { ...data, columns: [...data.columns, { id: newId(), name: name.trim() }] };
}

export function renameColumn(data: BoardData, id: string, name: string): BoardData {
  return {
    ...data,
    columns: data.columns.map((column) => (column.id === id ? { ...column, name: name.trim() } : column)),
  };
}

/** Removes a column. Its notes are taken off the board, not deleted. */
export function deleteColumn(data: BoardData, id: string): BoardData {
  return {
    columns: data.columns.filter((column) => column.id !== id),
    notes: data.notes.map((note) => (note.columnId === id ? { ...note, columnId: null } : note)),
  };
}

/** Moves a column one place left (-1) or right (1). */
export function moveColumn(data: BoardData, id: string, step: number): BoardData {
  const columns = [...data.columns];
  const from = columns.findIndex((column) => column.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= columns.length) return data;
  [columns[from], columns[to]] = [columns[to], columns[from]];
  return { ...data, columns };
}
