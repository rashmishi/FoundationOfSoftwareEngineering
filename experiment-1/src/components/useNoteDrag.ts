import { useState, type DragEvent } from 'react';
import { startNoteDrag } from '../dnd';

/** Props that make an element a drag source for a note, plus whether it is being dragged. */
export function useNoteDrag(noteId: string, enabled = true) {
  const [isDragging, setIsDragging] = useState(false);
  return {
    isDragging,
    dragProps: {
      draggable: enabled,
      onDragStart: (event: DragEvent) => {
        startNoteDrag(event, noteId);
        setIsDragging(true);
      },
      onDragEnd: () => setIsDragging(false),
    },
  };
}
