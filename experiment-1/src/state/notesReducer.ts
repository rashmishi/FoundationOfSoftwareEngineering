import { LIMITS, type AppState, type Column, type Note, type NoteInput } from '../types';

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'todo', name: 'To Do' },
  { id: 'in-progress', name: 'In Progress' },
  { id: 'done', name: 'Done' },
];

export function createInitialState(): AppState {
  return { notes: [], columns: DEFAULT_COLUMNS.map((c) => ({ ...c })) };
}

export type Action =
  | { type: 'addNote'; note: NoteInput; id?: string; now?: string }
  | { type: 'updateNote'; id: string; note: NoteInput; now?: string }
  | { type: 'deleteNote'; id: string }
  | { type: 'moveNote'; id: string; columnId: string | null; now?: string }
  | { type: 'addColumn'; name: string; id?: string }
  | { type: 'importData'; data: AppState };

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Split a comma-separated string into trimmed, non-empty, case-insensitively unique tags. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(',')) {
    const tag = part.trim().slice(0, LIMITS.tag);
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

/** Returns an error message for an invalid title, or null when valid. */
export function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return 'Title is required.';
  if (trimmed.length > LIMITS.title) return `Title must be at most ${LIMITS.title} characters.`;
  return null;
}

/** Returns an error message for an invalid column name, or null when valid. */
export function validateColumnName(name: string, columns: Column[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Column name is required.';
  if (trimmed.length > LIMITS.columnName) {
    return `Column name must be at most ${LIMITS.columnName} characters.`;
  }
  if (columns.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    return `A column named “${trimmed}” already exists.`;
  }
  return null;
}

function normaliseInput(input: NoteInput): NoteInput {
  return {
    title: input.title.trim(),
    description: input.description.trim().slice(0, LIMITS.description),
    tags: parseTags(input.tags.join(',')),
  };
}

/**
 * Merge imported data into the current state. Records with an existing id are
 * replaced; new records are appended. Notes pointing at unknown columns become unassigned.
 */
export function mergeImport(state: AppState, data: AppState): AppState {
  const columns = [...state.columns];
  for (const imported of data.columns) {
    const index = columns.findIndex((c) => c.id === imported.id);
    if (index >= 0) columns[index] = { ...imported };
    else columns.push({ ...imported });
  }
  const columnIds = new Set(columns.map((c) => c.id));
  const notes = [...state.notes];
  for (const raw of data.notes) {
    const imported: Note = {
      ...raw,
      tags: [...raw.tags],
      columnId: raw.columnId && columnIds.has(raw.columnId) ? raw.columnId : null,
    };
    const index = notes.findIndex((n) => n.id === imported.id);
    if (index >= 0) notes[index] = imported;
    else notes.push(imported);
  }
  return { notes, columns };
}

export function notesReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addNote': {
      if (validateTitle(action.note.title)) return state;
      const now = action.now ?? new Date().toISOString();
      const note: Note = {
        id: action.id ?? newId(),
        ...normaliseInput(action.note),
        columnId: null,
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, notes: [...state.notes, note] };
    }
    case 'updateNote': {
      if (validateTitle(action.note.title)) return state;
      const now = action.now ?? new Date().toISOString();
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.id ? { ...n, ...normaliseInput(action.note), updatedAt: now } : n,
        ),
      };
    }
    case 'deleteNote':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };
    case 'moveNote': {
      const { id, columnId } = action;
      if (columnId !== null && !state.columns.some((c) => c.id === columnId)) return state;
      const target = state.notes.find((n) => n.id === id);
      if (!target || target.columnId === columnId) return state;
      const now = action.now ?? new Date().toISOString();
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === id ? { ...n, columnId, updatedAt: now } : n)),
      };
    }
    case 'addColumn': {
      if (validateColumnName(action.name, state.columns)) return state;
      const column: Column = { id: action.id ?? newId(), name: action.name.trim() };
      return { ...state, columns: [...state.columns, column] };
    }
    case 'importData':
      return mergeImport(state, action.data);
  }
}
