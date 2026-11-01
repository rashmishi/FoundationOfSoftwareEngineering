import { notesInColumn } from '../model/reducer';
import type { AppState, Note, Variant } from '../model/types';

/**
 * Where focus goes after deleting a note (FR-2.7): the next item's Edit button,
 * else the previous one's, else the heading of the now-empty list or column.
 * Computed before the note is removed.
 */
export function deleteFocusTarget(state: AppState, note: Note, variant: Variant): string {
  const siblings = variant === 'board' && note.columnId ? notesInColumn(state, note.columnId) : state.notes;
  const i = siblings.findIndex((n) => n.id === note.id);
  const neighbour = siblings[i + 1] ?? siblings[i - 1];
  if (neighbour) return `${variant}-${neighbour.id}-edit`;
  return variant === 'board' && note.columnId ? `col-${note.columnId}-heading` : 'notes-heading';
}
