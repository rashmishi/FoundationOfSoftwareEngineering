import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { columnOfNote, findNote } from '../model/selectors';
import type { BoardState, Place } from '../model/types';
import { useAnnouncer } from './AnnouncerContext';
import { useBoard } from './BoardContext';
import { focusKeys } from './focusKeys';
import { quote, useNoteActions } from './useNoteActions';

export interface MoveSpot {
  /** null = not on the board. */
  columnId: string | null;
  /** Position in the column, counted without the moving note. */
  index: number;
}

export interface KeyboardMove {
  noteId: string;
  place: Place;
  origin: MoveSpot;
  current: MoveSpot;
}

export type MoveKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

interface KeyboardMoveValue {
  moving: KeyboardMove | null;
  /** Where the moving note would go, in words: "In progress, position 3 of 4." */
  currentText: string;
  pickUp: (noteId: string, place: Place) => void;
  step: (key: MoveKey) => void;
  drop: () => void;
  cancel: () => void;
}

const KeyboardMoveContext = createContext<KeyboardMoveValue | null>(null);

function othersIn(state: BoardState, columnId: string, noteId: string): number {
  return state.columns.find((c) => c.id === columnId)!.noteIds.filter((id) => id !== noteId).length;
}

function spotText(state: BoardState, spot: MoveSpot, noteId: string): string {
  if (spot.columnId === null) return 'Not on board.';
  const column = state.columns.find((c) => c.id === spot.columnId)!;
  const total = othersIn(state, column.id, noteId) + 1;
  return `${column.name}${column.collapsed ? ' (collapsed)' : ''}, position ${spot.index + 1} of ${total}.`;
}

export function KeyboardMoveProvider({ children }: { children: ReactNode }) {
  const { state } = useBoard();
  const { announce } = useAnnouncer();
  const { moveNote } = useNoteActions();
  const [moving, setMoving] = useState<KeyboardMove | null>(null);
  const movingRef = useRef(moving);
  movingRef.current = moving;

  const pickUp = useCallback((noteId: string, place: Place) => {
    const note = findNote(state, noteId);
    if (!note) return;
    const column = columnOfNote(state, noteId);
    const origin: MoveSpot = column ? { columnId: column.id, index: column.noteIds.indexOf(noteId) } : { columnId: null, index: 0 };
    setMoving({ noteId, place, origin, current: origin });
    announce(
      origin.columnId === null
        ? `Picked up ${quote(note.title)}. Not on board. Press Right arrow to choose a column.`
        : `Picked up ${quote(note.title)}. Column ${spotText(state, origin, noteId)}`,
    );
  }, [state, announce]);

  const step = useCallback((key: MoveKey) => {
    const m = movingRef.current;
    if (!m) return;
    const columns = state.columns;
    // List-origin moves can go back off the board: "Not on board" is the leftmost target.
    const targets: (string | null)[] = [...(m.place === 'list' ? [null] : []), ...columns.map((c) => c.id)];
    const { current } = m;
    let next: MoveSpot | null = null;
    let edge = '';

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const i = targets.indexOf(current.columnId);
      const j = i + (key === 'ArrowRight' ? 1 : -1);
      if (j < 0) edge = current.columnId === null ? 'Already off the board.' : 'Already in the first column.';
      else if (j >= targets.length) edge = 'Already in the last column.';
      else {
        const columnId = targets[j];
        if (columnId === null) next = { columnId: null, index: 0 };
        else {
          const others = othersIn(state, columnId, m.noteId);
          const collapsed = columns.find((c) => c.id === columnId)!.collapsed;
          const index = collapsed || current.columnId === null ? others : Math.min(current.index, others);
          next = { columnId, index };
        }
      }
    } else {
      if (current.columnId === null) edge = 'Not on board. Press Right arrow to choose a column.';
      else {
        const column = columns.find((c) => c.id === current.columnId)!;
        const others = othersIn(state, column.id, m.noteId);
        const index = current.index + (key === 'ArrowDown' ? 1 : -1);
        if (index < 0) edge = `Already at the top of ${column.name}.`;
        else if (index > others) edge = `Already at the bottom of ${column.name}.`;
        else next = { columnId: column.id, index };
      }
    }

    if (next) {
      setMoving({ ...m, current: next });
      announce(spotText(state, next, m.noteId));
      // Keep the target visible without moving focus (it stays on the handle).
      requestAnimationFrame(() =>
        document.querySelector('[data-kbd-target]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }),
      );
    } else {
      announce(edge);
    }
  }, [state, announce]);

  const drop = useCallback(() => {
    const m = movingRef.current;
    if (!m) return;
    setMoving(null);
    // moveNote shows (and announces) the result once, and keeps focus on this handle in its new place.
    moveNote(m.noteId, m.current.columnId, m.current.index, [
      focusKeys.handle(m.place, m.noteId),
      focusKeys.handle('list', m.noteId),
      focusKeys.notesHeading,
    ]);
  }, [moveNote]);

  const cancel = useCallback(() => {
    const m = movingRef.current;
    if (!m) return;
    setMoving(null);
    const note = findNote(state, m.noteId);
    const where =
      m.origin.columnId === null
        ? 'off the board'
        : `to ${state.columns.find((c) => c.id === m.origin.columnId)?.name}, position ${m.origin.index + 1}`;
    announce(`Move cancelled. ${quote(note?.title ?? 'Note')} returned ${where}.`);
  }, [state, announce]);

  const currentText = moving ? spotText(state, moving.current, moving.noteId) : '';
  const value = useMemo(
    () => ({ moving, currentText, pickUp, step, drop, cancel }),
    [moving, currentText, pickUp, step, drop, cancel],
  );
  return <KeyboardMoveContext.Provider value={value}>{children}</KeyboardMoveContext.Provider>;
}

export function useKeyboardMove(): KeyboardMoveValue {
  const value = useContext(KeyboardMoveContext);
  if (!value) throw new Error('useKeyboardMove outside KeyboardMoveProvider');
  return value;
}
