import type { BoardData, NoteDraft } from './types';

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
  const note = { id: newId(), columnId: null, createdAt: now, updatedAt: now, ...draft };
  return { ...data, notes: [...data.notes, note] };
}

export function updateNote(data: BoardData, id: string, draft: NoteDraft): BoardData {
  const updatedAt = new Date().toISOString();
  return {
    ...data,
    notes: data.notes.map((note) => (note.id === id ? { ...note, ...draft, updatedAt } : note)),
  };
}

export function deleteNote(data: BoardData, id: string): BoardData {
  return { ...data, notes: data.notes.filter((note) => note.id !== id) };
}

export function moveNote(data: BoardData, id: string, columnId: string | null): BoardData {
  const updatedAt = new Date().toISOString();
  return {
    ...data,
    notes: data.notes.map((note) => (note.id === id ? { ...note, columnId, updatedAt } : note)),
  };
}

export function isColumnNameTaken(data: BoardData, name: string): boolean {
  const wanted = name.trim().toLowerCase();
  return data.columns.some((column) => column.name.toLowerCase() === wanted);
}

export function addColumn(data: BoardData, name: string): BoardData {
  return { ...data, columns: [...data.columns, { id: newId(), name: name.trim() }] };
}
