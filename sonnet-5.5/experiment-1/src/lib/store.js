// Pure state functions for notes and Kanban columns. Every function takes the
// current state and returns a new one (or the same object if nothing changed),
// which keeps them easy to test and makes Undo a matter of restoring a snapshot.

export const PRIORITIES = ['low', 'medium', 'high'];
export const LIMITS = { title: 120, description: 2000, tag: 24, tags: 10, columnName: 40 };

export const defaultColumns = () => [
  { id: 'col-todo', name: 'To Do', collapsed: false, done: false },
  { id: 'col-doing', name: 'In Progress', collapsed: false, done: false },
  { id: 'col-done', name: 'Done', collapsed: false, done: true },
];

export const emptyState = () => ({ notes: [], columns: defaultColumns() });

// crypto.randomUUID only exists in secure contexts (https or localhost), so a
// container reached over plain http on a LAN address needs the fallback.
export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ---------- Normalisation and validation ----------

export function normalizeTag(raw) {
  return String(raw).trim().replace(/^#+/, '').replace(/\s+/g, ' ').slice(0, LIMITS.tag);
}

export function normalizeTags(raw) {
  const seen = new Set();
  const out = [];
  for (const t of Array.isArray(raw) ? raw : []) {
    const tag = normalizeTag(t);
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out.slice(0, LIMITS.tags);
}

export const isValidDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Returns an object of field errors; empty when the input can be saved. */
export function validateNoteInput(input) {
  const errors = {};
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) errors.title = 'A title is required.';
  else if (title.length > LIMITS.title) errors.title = `The title must be ${LIMITS.title} characters or fewer.`;
  if ((input.description || '').length > LIMITS.description) {
    errors.description = `The description must be ${LIMITS.description} characters or fewer.`;
  }
  if (input.dueDate && !isValidDate(input.dueDate)) errors.dueDate = 'Enter a valid date.';
  return errors;
}

function cleanFields(input) {
  return {
    title: input.title.trim(),
    description: (input.description || '').trim(),
    tags: normalizeTags(input.tags),
    priority: PRIORITIES.includes(input.priority) ? input.priority : 'medium',
    dueDate: input.dueDate && isValidDate(input.dueDate) ? input.dueDate : null,
  };
}

// ---------- Queries ----------

/** Notes on the board in a column, in display order. */
export function notesInColumn(state, columnId) {
  return state.notes.filter((n) => n.columnId === columnId).sort((a, b) => a.order - b.order);
}

export const findNote = (state, id) => state.notes.find((n) => n.id === id);

export function allTags(state) {
  const map = new Map();
  for (const n of state.notes) for (const t of n.tags) if (!map.has(t.toLowerCase())) map.set(t.toLowerCase(), t);
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}

export const todayString = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Whole days from `today` until the due date (negative when overdue). */
export function daysUntil(dueDate, today = todayString()) {
  const a = Date.parse(today + 'T00:00:00Z');
  const b = Date.parse(dueDate + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

export function isOverdue(state, note, today = todayString()) {
  if (!note.dueDate) return false;
  const col = state.columns.find((c) => c.id === note.columnId);
  if (col && col.done) return false; // finished work is never overdue
  return daysUntil(note.dueDate, today) < 0;
}

export function matchesFilters(state, note, filters, today = todayString()) {
  const q = (filters.q || '').trim().toLowerCase();
  if (q) {
    const hay = [note.title, note.description, ...note.tags].join('\n').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.priority && filters.priority !== 'all' && note.priority !== filters.priority) return false;
  if (filters.tag && filters.tag !== 'all' && !note.tags.some((t) => t.toLowerCase() === filters.tag.toLowerCase())) {
    return false;
  }
  if (filters.overdue && !isOverdue(state, note, today)) return false;
  return true;
}

export const hasActiveFilters = (f) => Boolean((f.q || '').trim() || f.priority !== 'all' || f.tag !== 'all' || f.overdue);

// ---------- Note operations ----------

function renumber(notes, columnId, orderedIds) {
  const index = new Map(orderedIds.map((id, i) => [id, i]));
  return notes.map((n) => (n.columnId === columnId && index.has(n.id) ? { ...n, order: index.get(n.id) } : n));
}

export function addNote(state, input) {
  const now = new Date().toISOString();
  const columnId = state.columns.some((c) => c.id === input.columnId) ? input.columnId : null;
  const note = {
    id: newId(),
    ...cleanFields(input),
    columnId,
    order: columnId ? notesInColumn(state, columnId).length : 0,
    createdAt: now,
    updatedAt: now,
  };
  return { state: { ...state, notes: [...state.notes, note] }, note };
}

/** Applies edited fields. A changed `columnId` moves the note to the end of that column. */
export function updateNote(state, id, input) {
  const existing = findNote(state, id);
  if (!existing) return state;
  const fields = cleanFields(input);
  const changed = { ...existing, ...fields, updatedAt: new Date().toISOString() };
  let next = { ...state, notes: state.notes.map((n) => (n.id === id ? changed : n)) };
  if ('columnId' in input && (input.columnId || null) !== existing.columnId) {
    next = moveNote(next, id, input.columnId || null, null);
  }
  return next;
}

export function removeNote(state, id) {
  const note = findNote(state, id);
  if (!note) return state;
  let next = { ...state, notes: state.notes.filter((n) => n.id !== id) };
  if (note.columnId) {
    next = { ...next, notes: renumber(next.notes, note.columnId, notesInColumn(next, note.columnId).map((n) => n.id)) };
  }
  return next;
}

export function duplicateNote(state, id) {
  const src = findNote(state, id);
  if (!src) return { state, note: null };
  const now = new Date().toISOString();
  const copy = { ...src, id: newId(), title: `${src.title} (copy)`.slice(0, LIMITS.title), createdAt: now, updatedAt: now };
  let next = { ...state, notes: [...state.notes, copy] };
  if (src.columnId) {
    // Sit directly under the original.
    const ids = notesInColumn(state, src.columnId).map((n) => n.id);
    ids.splice(ids.indexOf(src.id) + 1, 0, copy.id);
    next = { ...next, notes: renumber(next.notes, src.columnId, ids) };
  }
  return { state: next, note: copy };
}

/**
 * Puts a note in a column (or takes it off the board when columnId is null).
 * `beforeId` places it above that note; null appends it to the end.
 */
export function moveNote(state, id, columnId, beforeId = null) {
  const note = findNote(state, id);
  if (!note) return state;
  if (columnId !== null && !state.columns.some((c) => c.id === columnId)) return state;

  const oldColumn = note.columnId;
  if (columnId === null) {
    if (oldColumn === null) return state;
    let notes = state.notes.map((n) => (n.id === id ? { ...n, columnId: null, order: 0 } : n));
    const left = { ...state, notes };
    return { ...left, notes: renumber(notes, oldColumn, notesInColumn(left, oldColumn).map((n) => n.id)) };
  }

  const ids = notesInColumn(state, columnId)
    .map((n) => n.id)
    .filter((x) => x !== id);
  const at = beforeId && ids.includes(beforeId) ? ids.indexOf(beforeId) : ids.length;
  ids.splice(at, 0, id);

  // Nothing to do if it already sits exactly there.
  const before = notesInColumn(state, columnId).map((n) => n.id);
  if (oldColumn === columnId && before.length === ids.length && before.every((x, i) => x === ids[i])) return state;

  let notes = state.notes.map((n) => (n.id === id ? { ...n, columnId, updatedAt: new Date().toISOString() } : n));
  notes = renumber(notes, columnId, ids);
  if (oldColumn && oldColumn !== columnId) {
    notes = renumber(notes, oldColumn, notesInColumn({ ...state, notes }, oldColumn).map((n) => n.id));
  }
  return { ...state, notes };
}

/** Moves a note one place up (-1) or down (+1) inside its column. */
export function shiftNote(state, id, direction) {
  const note = findNote(state, id);
  if (!note || !note.columnId) return state;
  const ids = notesInColumn(state, note.columnId).map((n) => n.id);
  const i = ids.indexOf(id);
  const j = i + direction;
  if (j < 0 || j >= ids.length) return state;
  // Moving up means "before the previous note"; moving down means "before the note two places on".
  const beforeId = direction < 0 ? ids[j] : ids[j + 1] ?? null;
  return moveNote(state, id, note.columnId, beforeId);
}

// ---------- Column operations ----------

export const validateColumnName = (name) => {
  const n = (name || '').trim();
  if (!n) return 'A column name is required.';
  if (n.length > LIMITS.columnName) return `The name must be ${LIMITS.columnName} characters or fewer.`;
  return '';
};

export function addColumn(state, name) {
  const col = { id: newId(), name: name.trim(), collapsed: false, done: false };
  return { state: { ...state, columns: [...state.columns, col] }, column: col };
}

const mapColumn = (state, id, fn) => ({ ...state, columns: state.columns.map((c) => (c.id === id ? fn(c) : c)) });

export const renameColumn = (state, id, name) => mapColumn(state, id, (c) => ({ ...c, name: name.trim() }));
export const toggleCollapsed = (state, id) => mapColumn(state, id, (c) => ({ ...c, collapsed: !c.collapsed }));
export const toggleDone = (state, id) => mapColumn(state, id, (c) => ({ ...c, done: !c.done }));

export function moveColumn(state, id, direction) {
  const i = state.columns.findIndex((c) => c.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= state.columns.length) return state;
  const columns = [...state.columns];
  [columns[i], columns[j]] = [columns[j], columns[i]];
  return { ...state, columns };
}

/** Takes every note off the board column but keeps the notes themselves. */
export function clearColumn(state, id) {
  return {
    ...state,
    notes: state.notes.map((n) => (n.columnId === id ? { ...n, columnId: null, order: 0 } : n)),
  };
}

export function removeColumn(state, id) {
  const cleared = clearColumn(state, id);
  return { ...cleared, columns: cleared.columns.filter((c) => c.id !== id) };
}

// ---------- Loading, export and import ----------

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Makes anything read from storage safe to render; falls back to the defaults. */
export function sanitizeState(raw, { defaultColumns: useDefaults = false } = {}) {
  if (!isObject(raw) || !Array.isArray(raw.notes)) return emptyState();
  if (useDefaults && !Array.isArray(raw.columns)) raw = { ...raw, columns: defaultColumns() };
  const columns = [];
  for (const c of Array.isArray(raw.columns) ? raw.columns : []) {
    if (isObject(c) && typeof c.id === 'string' && typeof c.name === 'string' && !columns.some((x) => x.id === c.id)) {
      columns.push({ id: c.id, name: c.name, collapsed: Boolean(c.collapsed), done: Boolean(c.done) });
    }
  }
  const ids = new Set();
  const notes = [];
  for (const n of raw.notes) {
    if (!isObject(n) || typeof n.title !== 'string' || !n.title.trim()) continue;
    let id = typeof n.id === 'string' && n.id ? n.id : newId();
    if (ids.has(id)) id = newId();
    ids.add(id);
    const now = new Date().toISOString();
    notes.push({
      id,
      title: n.title.trim(),
      description: typeof n.description === 'string' ? n.description : '',
      tags: normalizeTags(n.tags),
      priority: PRIORITIES.includes(n.priority) ? n.priority : 'medium',
      dueDate: isValidDate(n.dueDate) ? n.dueDate : null,
      columnId: columns.some((c) => c.id === n.columnId) ? n.columnId : null,
      order: Number.isFinite(n.order) ? n.order : 0,
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : now,
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : now,
    });
  }
  const state = { columns, notes };
  // Tidy the order numbers so each column is 0..n-1.
  let tidy = state;
  for (const c of columns) tidy = { ...tidy, notes: renumber(tidy.notes, c.id, notesInColumn(tidy, c.id).map((n) => n.id)) };
  return tidy;
}

export function exportData(state) {
  return {
    app: 'notes-kanban',
    version: 1,
    exportedAt: new Date().toISOString(),
    columns: state.columns,
    notes: [...state.notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

/**
 * Checks the text of an import file. Returns { ok: true, data } where data is a
 * sanitised { notes, columns }, or { ok: false, error } with a readable reason.
 * Nothing is applied here, so a rejected file never changes the app.
 */
export function parseImport(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  const rawNotes = Array.isArray(json) ? json : isObject(json) ? json.notes : undefined;
  if (!Array.isArray(rawNotes)) {
    return { ok: false, error: 'This file does not contain a list of notes.' };
  }
  for (let i = 0; i < rawNotes.length; i++) {
    const n = rawNotes[i];
    const label = `Note ${i + 1}`;
    if (!isObject(n)) return { ok: false, error: `${label} is not a note object.` };
    if (typeof n.title !== 'string' || !n.title.trim()) return { ok: false, error: `${label} has no title.` };
    if (n.description != null && typeof n.description !== 'string') return { ok: false, error: `${label} has an invalid description.` };
    if (n.tags != null && (!Array.isArray(n.tags) || n.tags.some((t) => typeof t !== 'string'))) {
      return { ok: false, error: `${label} has invalid tags (expected a list of text).` };
    }
    if (n.priority != null && !PRIORITIES.includes(n.priority)) return { ok: false, error: `${label} has an invalid priority.` };
    if (n.dueDate != null && !isValidDate(n.dueDate)) return { ok: false, error: `${label} has an invalid due date.` };
  }
  if (isObject(json) && json.columns != null) {
    const cols = json.columns;
    if (!Array.isArray(cols) || cols.some((c) => !isObject(c) || typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim())) {
      return { ok: false, error: 'The columns in this file are invalid.' };
    }
  }
  const columns = isObject(json) && Array.isArray(json.columns) ? json.columns : [];
  return { ok: true, data: sanitizeState({ notes: rawNotes, columns }) };
}

/**
 * Merges imported notes into the current state. A note whose id already exists
 * is replaced, so importing your own export again does not create duplicates.
 */
export function mergeImport(state, data) {
  const columns = [...state.columns];
  for (const c of data.columns) if (!columns.some((x) => x.id === c.id)) columns.push(c);

  const byId = new Map(state.notes.map((n) => [n.id, n]));
  let added = 0;
  let updated = 0;
  for (const n of data.notes) {
    if (byId.has(n.id)) updated++;
    else added++;
    byId.set(n.id, columns.some((c) => c.id === n.columnId) ? n : { ...n, columnId: null });
  }
  return { state: sanitizeState({ columns, notes: [...byId.values()] }), added, updated };
}
