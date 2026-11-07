import { uid } from '../lib/helpers.js';

export function defaultState() {
  return {
    notes: [],
    columns: [
      { id: 'col_todo', name: 'To Do', collapsed: false, noteIds: [] },
      { id: 'col_doing', name: 'In Progress', collapsed: false, noteIds: [] },
      { id: 'col_done', name: 'Done', collapsed: false, noteIds: [] },
    ],
  };
}

export function createNote({ title, description = '', tags = [], priority = 'medium', dueDate = '' }) {
  return { id: uid('note'), title: title.trim(), description: description.trim(), tags, priority, dueDate, createdAt: new Date().toISOString() };
}

export function columnOf(state, noteId) {
  return state.columns.find((c) => c.noteIds.includes(noteId)) || null;
}

function withoutNote(columns, noteId) {
  return columns.map((c) => (c.noteIds.includes(noteId) ? { ...c, noteIds: c.noteIds.filter((id) => id !== noteId) } : c));
}

/** Puts a note in a column at an index (end when omitted). A null column takes it off the board. */
export function moveNote(state, noteId, columnId, index) {
  if (!state.notes.some((n) => n.id === noteId)) return state;
  if (columnId !== null && !state.columns.some((c) => c.id === columnId)) return state;
  const target = state.columns.find((c) => c.id === columnId);
  let at = index === undefined || index === null ? (target ? target.noteIds.length : 0) : index;
  if (target) {
    const oldIndex = target.noteIds.indexOf(noteId);
    if (oldIndex !== -1 && oldIndex < at) at -= 1;
  }
  const columns = withoutNote(state.columns, noteId).map((c) => {
    if (c.id !== columnId) return c;
    const ids = c.noteIds.slice();
    ids.splice(Math.max(0, Math.min(at, ids.length)), 0, noteId);
    return { ...c, noteIds: ids };
  });
  return { ...state, columns };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes] };
    case 'UPDATE_NOTE':
      return { ...state, notes: state.notes.map((n) => (n.id === action.id ? { ...n, ...action.changes } : n)) };
    case 'DELETE_NOTE':
      return { notes: state.notes.filter((n) => n.id !== action.id), columns: withoutNote(state.columns, action.id) };
    case 'MOVE_NOTE':
      return moveNote(state, action.id, action.columnId, action.index);
    case 'ADD_COLUMN':
      return { ...state, columns: [...state.columns, { id: uid('col'), name: action.name.trim(), collapsed: false, noteIds: [] }] };
    case 'RENAME_COLUMN':
      return { ...state, columns: state.columns.map((c) => (c.id === action.id ? { ...c, name: action.name.trim() } : c)) };
    case 'TOGGLE_COLUMN':
      return { ...state, columns: state.columns.map((c) => (c.id === action.id ? { ...c, collapsed: !c.collapsed } : c)) };
    case 'DELETE_COLUMN':
      return { ...state, columns: state.columns.filter((c) => c.id !== action.id) };
    case 'RESTORE':
    case 'REPLACE':
      return action.state;
    default:
      return state;
  }
}

/** Checks data read from localStorage and falls back to a fresh board if it is damaged. */
export function sanitizeState(raw) {
  if (!raw || !Array.isArray(raw.notes) || !Array.isArray(raw.columns)) return defaultState();
  const notes = raw.notes.filter((n) => n && typeof n.id === 'string' && typeof n.title === 'string');
  const ids = new Set(notes.map((n) => n.id));
  const used = new Set();
  const columns = raw.columns
    .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
    .map((c) => ({
      id: c.id,
      name: c.name,
      collapsed: Boolean(c.collapsed),
      noteIds: (Array.isArray(c.noteIds) ? c.noteIds : []).filter((id) => {
        if (!ids.has(id) || used.has(id)) return false;
        used.add(id);
        return true;
      }),
    }));
  return { notes, columns };
}
