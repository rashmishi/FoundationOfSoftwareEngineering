import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { columnName, moveNote, resolveDrop } from '../model/reducer';
import type { Id, Note, Variant } from '../model/types';
import { useAnnouncer } from './AnnouncerContext';
import { useRequestFocus } from './FocusContext';
import { useStore } from './StoreContext';

interface Picked {
  noteId: Id;
  variant: Variant;
  /** Index into state.columns, or null while no column has been chosen yet. */
  targetIndex: number | null;
}

interface KeyboardDrag {
  picked: Picked | null;
  targetColumnId: Id | null;
  isPicked: (noteId: Id, variant: Variant) => boolean;
  pickUp: (note: Note, variant: Variant) => void;
  moveTarget: (delta: 1 | -1) => void;
  drop: () => void;
  cancel: () => void;
}

const KeyboardDragContext = createContext<KeyboardDrag | null>(null);

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Keyboard pick-up / move / drop state machine for drag handles (FR-5.7, design 5.3 DragHandle). */
export function KeyboardDragProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const { announce } = useAnnouncer();
  const requestFocus = useRequestFocus();
  const [picked, setPickedState] = useState<Picked | null>(null);
  // Mirrors `picked` synchronously so a blur fired while unmounting after a drop is ignored.
  const pickedRef = useRef<Picked | null>(null);
  const setPicked = (p: Picked | null) => {
    pickedRef.current = p;
    setPickedState(p);
  };

  const noteById = (id: Id) => state.notes.find((n) => n.id === id);
  const where = (note: Note) => columnName(state, note.columnId) ?? 'not on board';

  const pickUp = (note: Note, variant: Variant) => {
    if (state.columns.length === 0) {
      announce('There are no columns on the board. Add a column first.');
      return;
    }
    // From the list no column is targeted yet, so the first arrow press selects the
    // first column (FR-5.7); on the board the target starts at the card's column.
    const index = variant === 'board' ? state.columns.findIndex((c) => c.id === note.columnId) : -1;
    setPicked({ noteId: note.id, variant, targetIndex: index === -1 ? null : index });
    announce(
      `Picked up '${note.title}'. Current column: ${columnName(state, note.columnId) ?? 'none'}. ` +
        'Use left and right arrows to choose a column, Space or Enter to drop, Escape to cancel.',
    );
  };

  const moveTarget = (delta: 1 | -1) => {
    const p = pickedRef.current;
    if (!p) return;
    const count = state.columns.length;
    const next = p.targetIndex === null ? 0 : Math.min(count - 1, Math.max(0, p.targetIndex + delta));
    setPicked({ ...p, targetIndex: next });
    announce(`${state.columns[next].name}, column ${next + 1} of ${count}.`);
  };

  const drop = () => {
    const p = pickedRef.current;
    if (!p) return;
    setPicked(null);
    const note = noteById(p.noteId);
    if (!note) return;
    const targetId = p.targetIndex === null ? null : (state.columns[p.targetIndex]?.id ?? null);
    const result = resolveDrop(state, note.id, targetId);
    if (result.kind === 'none') {
      announce(`'${note.title}' was not moved.`);
    } else if (result.kind === 'same') {
      announce(`'${note.title}' is already in ${result.columnName}.`);
    } else {
      dispatch(moveNote(note.id, targetId));
      announce(`Moved '${note.title}' to ${result.columnName}.`);
      requestFocus(`board-${note.id}-handle`);
    }
  };

  const cancel = () => {
    const p = pickedRef.current;
    if (!p) return;
    setPicked(null);
    const note = noteById(p.noteId);
    if (note) announce(`Move cancelled. '${note.title}' stays ${note.columnId ? `in ${where(note)}` : 'off the board'}.`);
  };

  const targetColumnId = picked && picked.targetIndex !== null ? (state.columns[picked.targetIndex]?.id ?? null) : null;

  useEffect(() => {
    if (!targetColumnId) return;
    document
      .getElementById(`col-${targetColumnId}`)
      ?.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [targetColumnId]);

  const isPicked = useCallback(
    (noteId: Id, variant: Variant) => picked?.noteId === noteId && picked.variant === variant,
    [picked],
  );

  const value = useMemo<KeyboardDrag>(
    () => ({ picked, targetColumnId, isPicked, pickUp, moveTarget, drop, cancel }),
    // The callbacks close over `state`, so the value is rebuilt when it changes.
    [picked, targetColumnId, isPicked, state],
  );

  return <KeyboardDragContext.Provider value={value}>{children}</KeyboardDragContext.Provider>;
}

export function useKeyboardDrag(): KeyboardDrag {
  const ctx = useContext(KeyboardDragContext);
  if (!ctx) throw new Error('useKeyboardDrag must be used inside KeyboardDragProvider');
  return ctx;
}
