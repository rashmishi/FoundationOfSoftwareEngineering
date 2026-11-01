import { newId } from './ids';
import { parseTags } from './tags';
import type { AppState, Column, Id, Note } from './types';

export type Action =
  | { type: 'ADD_NOTE'; note: Note }
  | { type: 'UPDATE_NOTE'; id: Id; title: string; description: string; tags: string[]; now: string }
  | { type: 'DELETE_NOTE'; id: Id }
  | { type: 'MOVE_NOTE'; id: Id; columnId: Id | null; now: string }
  | { type: 'ADD_COLUMN'; column: Column }
  | { type: 'IMPORT'; state: AppState };

export const DEFAULT_COLUMN_NAMES = ['To do', 'In progress', 'Done'];

export function defaultState(): AppState {
  return { notes: [], columns: DEFAULT_COLUMN_NAMES.map((name) => ({ id: newId(), name })) };
}

export interface NoteInput {
  title: string;
  description: string;
  tags: string;
}

// Action creators keep the reducer pure: ids and timestamps are generated here.

export function addNote(input: NoteInput, now = new Date().toISOString()): Extract<Action, { type: 'ADD_NOTE' }> {
  return {
    type: 'ADD_NOTE',
    note: {
      id: newId(),
      title: input.title.trim(),
      description: input.description.trim(),
      tags: parseTags(input.tags),
      columnId: null,
      createdAt: now,
      updatedAt: now,
      movedAt: null,
    },
  };
}

export function updateNote(id: Id, input: NoteInput, now = new Date().toISOString()): Action {
  return {
    type: 'UPDATE_NOTE',
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    tags: parseTags(input.tags),
    now,
  };
}

export function moveNote(id: Id, columnId: Id | null, now = new Date().toISOString()): Action {
  return { type: 'MOVE_NOTE', id, columnId, now };
}

export function addColumn(name: string): Action {
  return { type: 'ADD_COLUMN', column: { id: newId(), name: name.trim() } };
}

export function isDuplicateColumnName(columns: Column[], name: string): boolean {
  const key = name.trim().toLowerCase();
  return columns.some((c) => c.name.toLowerCase() === key);
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_NOTE':
      if (!action.note.title) return state;
      return { ...state, notes: [...state.notes, action.note] };

    case 'UPDATE_NOTE':
      if (!action.title) return state;
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.id
            ? { ...n, title: action.title, description: action.description, tags: action.tags, updatedAt: action.now }
            : n,
        ),
      };

    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };

    case 'MOVE_NOTE': {
      if (action.columnId !== null && !state.columns.some((c) => c.id === action.columnId)) return state;
      const note = state.notes.find((n) => n.id === action.id);
      if (!note || note.columnId === action.columnId) return state;
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.id
            ? { ...n, columnId: action.columnId, movedAt: action.columnId === null ? null : action.now }
            : n,
        ),
      };
    }

    case 'ADD_COLUMN':
      if (!action.column.name || isDuplicateColumnName(state.columns, action.column.name)) return state;
      return { ...state, columns: [...state.columns, action.column] };

    case 'IMPORT':
      return action.state;
  }
}

/** Notes of one column in display order (FR: ordered by time of assignment). */
export function notesInColumn(state: AppState, columnId: Id): Note[] {
  return state.notes
    .filter((n) => n.columnId === columnId)
    .sort((a, b) => (a.movedAt ?? a.createdAt).localeCompare(b.movedAt ?? b.createdAt));
}

export function columnName(state: AppState, columnId: Id | null): string | null {
  if (columnId === null) return null;
  return state.columns.find((c) => c.id === columnId)?.name ?? null;
}

export type DropResult = { kind: 'moved'; columnName: string } | { kind: 'same'; columnName: string } | { kind: 'none' };

/** Decides what a drop means (design 5.3, onDragEnd): same column first, then a column, else nothing. */
export function resolveDrop(state: AppState, noteId: Id, targetColumnId: Id | null): DropResult {
  const note = state.notes.find((n) => n.id === noteId);
  const target = targetColumnId === null ? undefined : state.columns.find((c) => c.id === targetColumnId);
  if (!note || !target) return { kind: 'none' };
  if (note.columnId === target.id) return { kind: 'same', columnName: target.name };
  return { kind: 'moved', columnName: target.name };
}
