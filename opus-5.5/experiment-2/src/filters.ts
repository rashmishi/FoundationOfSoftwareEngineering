import { addDays, dueStatus } from './dates';
import { PRIORITY_RANK } from './notes';
import type { Note, Priority } from './types';

export const ANY = 'any';
export const NOT_ON_BOARD = 'not-on-board';

export interface Filters {
  priority: Priority | typeof ANY;
  tag: string;
  /** A column id, ANY or NOT_ON_BOARD. */
  column: string;
  due: typeof ANY | 'overdue' | 'today' | 'week' | 'none';
  sort: 'oldest' | 'newest' | 'due' | 'priority' | 'title';
}

export const DEFAULT_FILTERS: Filters = { priority: ANY, tag: ANY, column: ANY, due: ANY, sort: 'oldest' };

export function countActiveFilters(filters: Filters): number {
  return (['priority', 'tag', 'column', 'due'] as const).filter((key) => filters[key] !== ANY).length;
}

/** All tags in use, once each regardless of case, in alphabetical order. */
export function uniqueTags(notes: Note[]): string[] {
  const tags = new Map<string, string>();
  for (const tag of notes.flatMap((note) => note.tags)) {
    if (!tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
  }
  return [...tags.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function matchesDue(note: Note, due: Filters['due'], today: string): boolean {
  switch (due) {
    case 'overdue':
      return dueStatus(note.dueDate, today) === 'overdue';
    case 'today':
      return note.dueDate === today;
    case 'week':
      return note.dueDate !== null && note.dueDate >= today && note.dueDate <= addDays(today, 6);
    case 'none':
      return note.dueDate === null;
    default:
      return true;
  }
}

function matches(note: Note, query: string, filters: Filters, today: string): boolean {
  const text = [note.title, note.description, ...note.tags].join(' ').toLowerCase();
  const { priority, tag, column, due } = filters;
  return (
    text.includes(query) &&
    (priority === ANY || note.priority === priority) &&
    (tag === ANY || note.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase())) &&
    (column === ANY || note.columnId === (column === NOT_ON_BOARD ? null : column)) &&
    matchesDue(note, due, today)
  );
}

const COMPARE: Record<Exclude<Filters['sort'], 'newest'>, (a: Note, b: Note) => number> = {
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  // Notes without a due date go last.
  due: (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
};

export function filterNotes(notes: Note[], search: string, filters: Filters, today: string): Note[] {
  const query = search.trim().toLowerCase();
  const found = notes.filter((note) => matches(note, query, filters, today));
  // Newest first is oldest first reversed, so notes made at the same moment also swap.
  if (filters.sort === 'newest') return found.sort(COMPARE.oldest).reverse();
  return found.sort(COMPARE[filters.sort]);
}
