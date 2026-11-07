// Pure board state. A note lives in `notes` (the list order) and may also be placed in at most
// one column; the order of notes inside a column is the column's `noteIds` array.
//
//   state = { notes: Note[], columns: { id, name, collapsed, noteIds }[] }
//   Note  = { id, title, description, tags, priority, dueDate, createdAt, updatedAt }

export const DEFAULT_COLUMNS = [
  { id: 'col-todo', name: 'To do' },
  { id: 'col-doing', name: 'In progress' },
  { id: 'col-done', name: 'Done' },
];

export function createInitialState() {
  return {
    notes: [],
    columns: DEFAULT_COLUMNS.map((c) => ({ ...c, collapsed: false, noteIds: [] })),
  };
}

export function columnOf(state, noteId) {
  return state.columns.find((c) => c.noteIds.includes(noteId)) || null;
}

function withoutNote(columns, id) {
  return columns.map((c) => (c.noteIds.includes(id) ? { ...c, noteIds: c.noteIds.filter((x) => x !== id) } : c));
}

/** Puts a note into a column before `beforeId` (or at the end). Removes it from wherever it was. */
function place(columns, id, columnId, beforeId = null) {
  const cleaned = withoutNote(columns, id);
  if (!columnId || !cleaned.some((c) => c.id === columnId)) return cleaned;
  return cleaned.map((c) => {
    if (c.id !== columnId) return c;
    const ids = [...c.noteIds];
    let index = beforeId ? ids.indexOf(beforeId) : -1;
    if (index < 0) index = ids.length;
    ids.splice(index, 0, id);
    return { ...c, noteIds: ids };
  });
}

function sameColumns(a, b) {
  return a.length === b.length && a.every((c, i) => c.id === b[i].id && c.noteIds.length === b[i].noteIds.length && c.noteIds.every((id, j) => id === b[i].noteIds[j]));
}

export function reducer(state, action) {
  switch (action.type) {
    case 'note/add': {
      const { note, columnId } = action;
      return {
        ...state,
        notes: [note, ...state.notes],
        columns: place(state.columns, note.id, columnId ?? null),
      };
    }

    case 'note/update': {
      const { id, changes } = action;
      if (!state.notes.some((n) => n.id === id)) return state;
      let columns = state.columns;
      if (action.columnId !== undefined) {
        const current = columnOf(state, id);
        if ((current?.id ?? null) !== action.columnId) columns = place(columns, id, action.columnId);
      }
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
        columns,
      };
    }

    case 'note/delete': {
      if (!state.notes.some((n) => n.id === action.id)) return state;
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.id),
        columns: withoutNote(state.columns, action.id),
      };
    }

    // Move a note to a column (or off the board with columnId = null), optionally before another note.
    case 'note/move': {
      const { id, columnId, beforeId = null } = action;
      if (!state.notes.some((n) => n.id === id)) return state;
      if (columnId && !state.columns.some((c) => c.id === columnId)) return state;
      const columns = place(state.columns, id, columnId, beforeId === id ? null : beforeId);
      return sameColumns(columns, state.columns) ? state : { ...state, columns };
    }

    // Move a note one step up (-1) or down (+1) inside its column.
    case 'note/step': {
      const col = columnOf(state, action.id);
      if (!col) return state;
      const from = col.noteIds.indexOf(action.id);
      const to = from + action.delta;
      if (to < 0 || to >= col.noteIds.length) return state;
      const ids = [...col.noteIds];
      ids.splice(from, 1);
      ids.splice(to, 0, action.id);
      return { ...state, columns: state.columns.map((c) => (c.id === col.id ? { ...c, noteIds: ids } : c)) };
    }

    case 'column/add':
      return { ...state, columns: [...state.columns, { id: action.id, name: action.name, collapsed: false, noteIds: [] }] };

    case 'column/rename':
      return { ...state, columns: state.columns.map((c) => (c.id === action.id ? { ...c, name: action.name } : c)) };

    // Deleting a column keeps its notes: they stay in the note list, just not on the board.
    case 'column/delete':
      return { ...state, columns: state.columns.filter((c) => c.id !== action.id) };

    case 'column/move': {
      const from = state.columns.findIndex((c) => c.id === action.id);
      const to = from + action.delta;
      if (from < 0 || to < 0 || to >= state.columns.length) return state;
      const columns = [...state.columns];
      const [col] = columns.splice(from, 1);
      columns.splice(to, 0, col);
      return { ...state, columns };
    }

    case 'column/toggle':
      return { ...state, columns: state.columns.map((c) => (c.id === action.id ? { ...c, collapsed: !c.collapsed } : c)) };

    // Merge validated import data (see importExport.js) into the board.
    case 'import': {
      const { data } = action;
      let columns = state.columns;
      const columnMap = new Map();
      for (const incoming of data.columns) {
        const match =
          columns.find((c) => c.id === incoming.id) ||
          columns.find((c) => c.name.trim().toLowerCase() === incoming.name.trim().toLowerCase());
        if (match) {
          columnMap.set(incoming.id, match.id);
        } else {
          const id = columns.some((c) => c.id === incoming.id) ? `${incoming.id}-imported` : incoming.id;
          columns = [...columns, { id, name: incoming.name, collapsed: !!incoming.collapsed, noteIds: [] }];
          columnMap.set(incoming.id, id);
        }
      }
      const incomingById = new Map(data.notes.map((n) => [n.id, n]));
      const existingIds = new Set(state.notes.map((n) => n.id));
      const notes = [
        ...state.notes.map((n) => incomingById.get(n.id) || n),
        ...data.notes.filter((n) => !existingIds.has(n.id)),
      ];
      columns = columns.map((c) => ({ ...c, noteIds: c.noteIds.filter((id) => !incomingById.has(id)) }));
      for (const incoming of data.columns) {
        const target = columnMap.get(incoming.id);
        columns = columns.map((c) => (c.id === target ? { ...c, noteIds: [...c.noteIds, ...incoming.noteIds] } : c));
      }
      return { notes, columns };
    }

    case 'state/replace':
      return action.state;

    default:
      return state;
  }
}
