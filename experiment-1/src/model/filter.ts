import type { Note, Priority } from '../types';
import { addDays } from './dates';

export type DueFilter = 'any' | 'overdue' | 'today' | 'week' | 'none';

export interface Filters {
  query: string;
  tag: string;
  priority: Priority | '';
  due: DueFilter;
}

export const EMPTY_FILTERS: Filters = { query: '', tag: '', priority: '', due: 'any' };

export function isFiltering(filters: Filters): boolean {
  return filters.query.trim() !== '' || filters.tag !== '' || filters.priority !== '' || filters.due !== 'any';
}

export function queryWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Every word of the query must appear in the title, description or a tag; the other filters must all match.
 * `isDone` tells whether the note sits in a "Done" column, where it never counts as overdue.
 */
export function matchesFilters(note: Note, filters: Filters, today: string, isDone = false): boolean {
  const haystack = [note.title, note.description, ...note.tags].join('\n').toLowerCase();
  if (!queryWords(filters.query).every((word) => haystack.includes(word))) return false;
  if (filters.tag && !note.tags.some((t) => t.toLowerCase() === filters.tag.toLowerCase())) return false;
  if (filters.priority && note.priority !== filters.priority) return false;
  switch (filters.due) {
    case 'any':
      return true;
    case 'none':
      return note.dueDate === null;
    case 'overdue':
      return note.dueDate !== null && note.dueDate < today && !isDone;
    case 'today':
      return note.dueDate === today;
    case 'week':
      return note.dueDate !== null && note.dueDate >= today && note.dueDate <= addDays(today, 7);
  }
}
