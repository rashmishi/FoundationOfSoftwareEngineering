import type { BoardState, Column, Note, NoteDraft } from '../types';
import { findColumnOf, normaliseDraft } from './notes';

/**
 * Positions are given as `beforeId`: the note the moved note is placed in front of,
 * or null for the end of the column. This stays correct when some cards are hidden by a filter.
 */
export type BoardAction =
  | { type: 'addNote'; note: Note }
  | { type: 'updateNote'; id: string; changes: Partial<NoteDraft>; now: string }
  | { type: 'deleteNote'; id: string }
  | { type: 'restoreNote'; note: Note; listIndex: number; columnId: string | null; beforeId: string | null }
  | { type: 'duplicateNote'; id: string; newId: string; now: string }
  | { type: 'moveNote'; id: string; columnId: string | null; beforeId: string | null }
  | { type: 'addColumn'; column: Column }
  | { type: 'renameColumn'; id: string; name: string }
  | { type: 'toggleColumn'; id: string }
  | { type: 'moveColumn'; id: string; offset: -1 | 1 }
  | { type: 'deleteColumn'; id: string }
  | { type: 'restoreColumn'; column: Column; index: number }
  | { type: 'replace'; state: BoardState };

function withoutNote(columns: Column[], noteId: string): Column[] {
  return columns.map((c) => (c.noteIds.includes(noteId) ? { ...c, noteIds: c.noteIds.filter((id) => id !== noteId) } : c));
}

function insertBefore(ids: string[], id: string, beforeId: string | null): string[] {
  const index = beforeId === null ? -1 : ids.indexOf(beforeId);
  if (index === -1) return [...ids, id];
  return [...ids.slice(0, index), id, ...ids.slice(index)];
}

function placeNote(columns: Column[], noteId: string, columnId: string | null, beforeId: string | null): Column[] {
  const cleared = withoutNote(columns, noteId);
  if (columnId === null) return cleared;
  return cleared.map((c) => (c.id === columnId ? { ...c, noteIds: insertBefore(c.noteIds, noteId, beforeId) } : c));
}

/** Where a note currently sits, in the shape `moveNote`/`restoreNote` take. Used to build Undo actions. */
export function notePosition(state: BoardState, noteId: string): { columnId: string | null; beforeId: string | null } {
  const column = findColumnOf(state, noteId);
  if (!column) return { columnId: null, beforeId: null };
  const index = column.noteIds.indexOf(noteId);
  return { columnId: column.id, beforeId: column.noteIds[index + 1] ?? null };
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'addNote':
      if (state.notes.some((n) => n.id === action.note.id)) return state;
      return { ...state, notes: [action.note, ...state.notes] };

    case 'updateNote': {
      if (!state.notes.some((n) => n.id === action.id)) return state;
      return {
        ...state,
        notes: state.notes.map((n) => {
          if (n.id !== action.id) return n;
          const merged = normaliseDraft({ ...n, ...action.changes });
          return merged.title ? { ...n, ...merged, updatedAt: action.now } : n;
        }),
      };
    }

    case 'deleteNote':
      if (!state.notes.some((n) => n.id === action.id)) return state;
      return { notes: state.notes.filter((n) => n.id !== action.id), columns: withoutNote(state.columns, action.id) };

    case 'restoreNote': {
      if (state.notes.some((n) => n.id === action.note.id)) return state;
      const notes = [...state.notes];
      notes.splice(Math.min(action.listIndex, notes.length), 0, action.note);
      const columnExists = state.columns.some((c) => c.id === action.columnId);
      return {
        notes,
        columns: columnExists ? placeNote(state.columns, action.note.id, action.columnId, action.beforeId) : state.columns,
      };
    }

    case 'duplicateNote': {
      const index = state.notes.findIndex((n) => n.id === action.id);
      if (index === -1 || state.notes.some((n) => n.id === action.newId)) return state;
      const original = state.notes[index];
      const copy: Note = {
        ...original,
        id: action.newId,
        title: `${original.title} (copy)`.slice(0, 120),
        tags: [...original.tags],
        createdAt: action.now,
        updatedAt: action.now,
      };
      const notes = [...state.notes];
      notes.splice(index, 0, copy);
      const { columnId, beforeId } = notePosition(state, action.id);
      return { notes, columns: placeNote(state.columns, copy.id, columnId, beforeId) };
    }

    case 'moveNote': {
      if (!state.notes.some((n) => n.id === action.id)) return state;
      if (action.columnId !== null && !state.columns.some((c) => c.id === action.columnId)) return state;
      if (action.beforeId === action.id) return state;
      return { ...state, columns: placeNote(state.columns, action.id, action.columnId, action.beforeId) };
    }

    case 'addColumn':
      if (state.columns.some((c) => c.id === action.column.id)) return state;
      return { ...state, columns: [...state.columns, action.column] };

    case 'renameColumn': {
      const name = action.name.trim();
      if (!name) return state;
      return { ...state, columns: state.columns.map((c) => (c.id === action.id ? { ...c, name } : c)) };
    }

    case 'toggleColumn':
      return { ...state, columns: state.columns.map((c) => (c.id === action.id ? { ...c, collapsed: !c.collapsed } : c)) };

    case 'moveColumn': {
      const from = state.columns.findIndex((c) => c.id === action.id);
      const to = from + action.offset;
      if (from === -1 || to < 0 || to >= state.columns.length) return state;
      const columns = [...state.columns];
      [columns[from], columns[to]] = [columns[to], columns[from]];
      return { ...state, columns };
    }

    case 'deleteColumn':
      if (!state.columns.some((c) => c.id === action.id)) return state;
      return { ...state, columns: state.columns.filter((c) => c.id !== action.id) };

    case 'restoreColumn': {
      if (state.columns.some((c) => c.id === action.column.id)) return state;
      const known = new Set(state.notes.map((n) => n.id));
      const noteIds = action.column.noteIds.filter((id) => known.has(id));
      let columns = state.columns;
      for (const id of noteIds) columns = withoutNote(columns, id);
      columns = [...columns];
      columns.splice(Math.min(action.index, columns.length), 0, { ...action.column, noteIds });
      return { ...state, columns };
    }

    case 'replace':
      return action.state;
  }
}
