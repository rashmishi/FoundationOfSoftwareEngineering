import { newId } from './ids';
import type { BoardState, Column, Note } from './types';

export type BoardAction =
  | { type: 'addNote'; note: Note }
  | { type: 'updateNote'; id: string; changes: Partial<Omit<Note, 'id' | 'createdAt'>>; now: string }
  | { type: 'deleteNote'; id: string }
  /** toColumnId null = remove from board. toIndex is the position in the target column after removal from its old place. */
  | { type: 'moveNote'; id: string; toColumnId: string | null; toIndex: number }
  | { type: 'addColumn'; column: Column }
  | { type: 'renameColumn'; id: string; name: string }
  | { type: 'deleteColumn'; id: string }
  | { type: 'moveColumn'; id: string; delta: -1 | 1 }
  | { type: 'toggleColumn'; id: string }
  | { type: 'replaceAll'; state: BoardState };

export function defaultColumns(): Column[] {
  return ['To do', 'In progress', 'Done'].map((name) => ({ id: newId('col'), name, collapsed: false, noteIds: [] }));
}

export function emptyBoard(): BoardState {
  return { notes: [], columns: defaultColumns() };
}

function withoutNote(columns: Column[], id: string): Column[] {
  return columns.map((c) => (c.noteIds.includes(id) ? { ...c, noteIds: c.noteIds.filter((n) => n !== id) } : c));
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'addNote':
      return { ...state, notes: [action.note, ...state.notes] };

    case 'updateNote':
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === action.id ? { ...n, ...action.changes, updatedAt: action.now } : n)),
      };

    case 'deleteNote':
      return {
        notes: state.notes.filter((n) => n.id !== action.id),
        columns: withoutNote(state.columns, action.id),
      };

    case 'moveNote': {
      if (!state.notes.some((n) => n.id === action.id)) return state;
      const columns = withoutNote(state.columns, action.id);
      if (action.toColumnId === null) return { ...state, columns };
      return {
        ...state,
        columns: columns.map((c) => {
          if (c.id !== action.toColumnId) return c;
          const index = Math.max(0, Math.min(action.toIndex, c.noteIds.length));
          const noteIds = [...c.noteIds];
          noteIds.splice(index, 0, action.id);
          return { ...c, noteIds };
        }),
      };
    }

    case 'addColumn':
      return { ...state, columns: [...state.columns, action.column] };

    case 'renameColumn':
      return { ...state, columns: state.columns.map((c) => (c.id === action.id ? { ...c, name: action.name } : c)) };

    case 'deleteColumn':
      return { ...state, columns: state.columns.filter((c) => c.id !== action.id) };

    case 'moveColumn': {
      const from = state.columns.findIndex((c) => c.id === action.id);
      const to = from + action.delta;
      if (from < 0 || to < 0 || to >= state.columns.length) return state;
      const columns = [...state.columns];
      const [moved] = columns.splice(from, 1);
      columns.splice(to, 0, moved);
      return { ...state, columns };
    }

    case 'toggleColumn':
      return {
        ...state,
        columns: state.columns.map((c) => (c.id === action.id ? { ...c, collapsed: !c.collapsed } : c)),
      };

    case 'replaceAll':
      return action.state;
  }
}
