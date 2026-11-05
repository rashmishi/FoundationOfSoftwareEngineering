import { addDays, dueStatus } from './dates';
import type { BoardState, Column, Note, Priority } from './types';

export function columnOfNote(state: BoardState, noteId: string): Column | undefined {
  return state.columns.find((c) => c.noteIds.includes(noteId));
}

export function findNote(state: BoardState, noteId: string): Note | undefined {
  return state.notes.find((n) => n.id === noteId);
}

export function allTags(notes: Note[]): string[] {
  const byKey = new Map<string, string>();
  for (const note of notes) for (const tag of note.tags) if (!byKey.has(tag.toLowerCase())) byKey.set(tag.toLowerCase(), tag);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

export type DueFilter = 'any' | 'overdue' | 'week' | 'none';

export interface Filters {
  query: string;
  tag: string;
  priority: Priority | 'any';
  due: DueFilter;
}

export const NO_FILTERS: Filters = { query: '', tag: '', priority: 'any', due: 'any' };

export function hasActiveFilters(f: Filters): boolean {
  return f.query.trim() !== '' || f.tag !== '' || f.priority !== 'any' || f.due !== 'any';
}

export function noteMatches(note: Note, f: Filters, columnName: string | undefined, today: string): boolean {
  const q = f.query.trim().toLowerCase();
  if (q) {
    const haystack = [note.title, note.description, ...note.tags].join('\n').toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (f.tag && !note.tags.some((t) => t.toLowerCase() === f.tag.toLowerCase())) return false;
  if (f.priority !== 'any' && note.priority !== f.priority) return false;
  switch (f.due) {
    case 'overdue':
      return dueStatus(note.dueDate, columnName, today) === 'overdue';
    case 'week':
      return note.dueDate !== null && note.dueDate >= today && note.dueDate <= addDays(today, 7);
    case 'none':
      return note.dueDate === null;
    default:
      return true;
  }
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
