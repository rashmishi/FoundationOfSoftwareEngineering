import type { DragEvent } from 'react';

/** Custom MIME type so unrelated drags (text, files) are ignored by drop targets. */
export const NOTE_MIME = 'application/x-notes-kanban-note';

export function startNoteDrag(event: DragEvent, noteId: string): void {
  event.dataTransfer.setData(NOTE_MIME, noteId);
  event.dataTransfer.setData('text/plain', noteId);
  event.dataTransfer.effectAllowed = 'move';
}

export function isNoteDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes(NOTE_MIME);
}

export function getDraggedNoteId(event: DragEvent): string | null {
  return event.dataTransfer.getData(NOTE_MIME) || null;
}
