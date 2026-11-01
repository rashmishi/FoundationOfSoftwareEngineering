import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { KeyboardEvent } from 'react';
import type { Note, Variant } from '../model/types';
import { useKeyboardDrag } from '../state/KeyboardDragContext';

export const DND_INSTRUCTIONS_ID = 'dnd-instructions';

export const DND_INSTRUCTIONS =
  'Press Space or Enter to pick up the note. Use the left and right arrow keys to choose a column, ' +
  'Space or Enter to drop, Escape to cancel. Clicking the handle alone does not move the note. ' +
  'Alternatively, choose a column in the Column menu and press the Move button.';

interface Props {
  note: Note;
  variant: Variant;
  nameSuffix: string;
  /** Pointer listeners from dnd-kit's useDraggable (PointerSensor only). */
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
}

/** Drag handle: pointer/touch drag via dnd-kit, keyboard drag via KeyboardDragContext (FR-5.2, FR-5.7). */
export function DragHandle({ note, variant, nameSuffix, listeners, setActivatorNodeRef }: Props) {
  const kb = useKeyboardDrag();
  const picked = kb.isPicked(note.id, variant);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const isActivate = e.key === ' ' || e.key === 'Enter';
    if (!picked) {
      if (isActivate) {
        e.preventDefault();
        kb.cancel();
        kb.pickUp(note, variant);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        kb.moveTarget(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        kb.moveTarget(-1);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        kb.drop();
        break;
      case 'Escape':
        e.preventDefault();
        kb.cancel();
        break;
      case 'Tab':
        // No preventDefault: focus moves on normally (no keyboard trap).
        kb.cancel();
        break;
    }
  };

  return (
    <button
      ref={setActivatorNodeRef}
      id={`${variant}-${note.id}-handle`}
      type="button"
      className="drag-handle"
      aria-roledescription="draggable note"
      aria-label={`Drag ${note.title}${nameSuffix}`}
      aria-describedby={DND_INSTRUCTIONS_ID}
      aria-pressed={picked}
      onKeyDown={onKeyDown}
      onBlur={() => {
        if (picked) kb.cancel();
      }}
      {...listeners}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16">
        <circle cx="5" cy="3" r="1.5" />
        <circle cx="11" cy="3" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="11" cy="8" r="1.5" />
        <circle cx="5" cy="13" r="1.5" />
        <circle cx="11" cy="13" r="1.5" />
      </svg>
      <span className="drag-handle-text">Drag</span>
    </button>
  );
}
