import type { Place } from '../model/types';

/** data-focus keys used by the focus manager (FR-22). */
export const focusKeys = {
  title: (place: Place, noteId: string) => `title:${place}:${noteId}`,
  handle: (place: Place, noteId: string) => `handle:${place}:${noteId}`,
  noteMenu: (place: Place, noteId: string) => `menu:note:${place}:${noteId}`,
  noteMove: (place: Place, noteId: string) => `move:${place}:${noteId}`,
  columnHeading: (columnId: string) => `col-heading:${columnId}`,
  columnMenu: (columnId: string) => `col-menu:${columnId}`,
  columnToggle: (columnId: string) => `col-toggle:${columnId}`,
  notesHeading: 'heading:notes',
  boardHeading: 'heading:board',
  newNoteHeading: 'heading:new-note',
  newTitle: 'field:new-title',
  importButton: 'button:import',
} as const;

/**
 * Title-button keys of the notes next to this one in the same visible list, then the list heading:
 * where focus goes after a delete (FR-2.5).
 */
export function neighbourTargets(place: Place, noteId: string, headingKey: string): string[] {
  const own = document.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focusKeys.title(place, noteId))}"]`);
  const list = own?.closest('ul[data-note-list]');
  if (!own || !list) return [headingKey];
  const keys = [...list.querySelectorAll<HTMLElement>(`[data-focus^="title:${place}:"]`)]
    .filter((el) => el.closest('ul[data-note-list]') === list)
    .map((el) => el.dataset.focus!);
  const i = keys.indexOf(own.dataset.focus!);
  return [keys[i + 1], keys[i - 1], headingKey].filter((k): k is string => Boolean(k));
}
