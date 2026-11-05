import type { DragEvent } from 'react';

export const NOTE_MIME = 'application/x-note-id';

/** `dataTransfer.getData` is unreadable during dragover, so the id being dragged is also kept here. */
let draggedId: string | null = null;

export function startNoteDrag(event: DragEvent, noteId: string): void {
  draggedId = noteId;
  event.dataTransfer.setData(NOTE_MIME, noteId);
  event.dataTransfer.setData('text/plain', noteId);
  event.dataTransfer.effectAllowed = 'move';
  document.body.classList.add('is-dragging-note');
}

export function endNoteDrag(): void {
  draggedId = null;
  document.body.classList.remove('is-dragging-note');
}

export function isNoteDrag(event: DragEvent): boolean {
  return draggedId !== null || event.dataTransfer.types.includes(NOTE_MIME);
}

export function droppedNoteId(event: DragEvent): string | null {
  return event.dataTransfer.getData(NOTE_MIME) || draggedId;
}

/**
 * The id of the first card whose vertical midpoint is below the pointer — the note the dropped note
 * goes in front of — or null to append. Only rendered (visible) cards are considered.
 */
export function beforeIdAt(container: HTMLElement, clientY: number, ignoreId?: string | null): string | null {
  const cards = container.querySelectorAll<HTMLElement>('[data-note-id]');
  for (const card of cards) {
    if (card.dataset.noteId === ignoreId) continue;
    const rect = card.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return card.dataset.noteId ?? null;
  }
  return null;
}

export function currentDraggedId(): string | null {
  return draggedId;
}
