import { newId } from '../lib/ids.js';
import { isValidISODate } from '../lib/dates.js';
import { LIMITS, PRIORITIES, addTag } from '../lib/noteModel.js';
import { columnOf } from './reducer.js';

export const FILE_FORMAT = 'notes-board';
export const FILE_VERSION = 1;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_NOTES = 2000;

/** The JSON document written by "Export notes". */
export function buildExport(state, now = new Date()) {
  return {
    app: FILE_FORMAT,
    version: FILE_VERSION,
    exportedAt: now.toISOString(),
    columns: state.columns.map(({ id, name, collapsed, noteIds }) => ({ id, name, collapsed, noteIds })),
    notes: state.notes.map((n) => ({ ...n, columnId: columnOf(state, n.id)?.id ?? null })),
  };
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isoOrNow = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString());

/**
 * Turns untrusted data (an imported file, or whatever was in localStorage) into clean board data.
 *   strict: collect every problem and refuse the whole file (used for imports).
 *   lenient: repair or drop bad entries (used when loading saved data).
 * Returns { ok, errors, data: { notes, columns } } where columns have reconciled noteIds.
 */
export function normalizeData(raw, { strict = true } = {}) {
  const errors = [];
  const rawNotes = Array.isArray(raw) ? raw : isObject(raw) ? raw.notes : undefined;
  const rawColumns = isObject(raw) && Array.isArray(raw.columns) ? raw.columns : [];

  if (!Array.isArray(rawNotes)) {
    return { ok: false, errors: ['The file does not contain a list of notes. Expected a “notes” list.'], data: null };
  }
  if (rawNotes.length > MAX_NOTES) {
    return { ok: false, errors: [`The file has ${rawNotes.length} notes. The limit is ${MAX_NOTES}.`], data: null };
  }

  // Columns first, so notes can refer to them.
  const columns = [];
  const columnIds = new Set();
  rawColumns.forEach((c, i) => {
    const where = `Column ${i + 1}`;
    if (!isObject(c) || typeof c.name !== 'string' || !c.name.trim()) {
      if (strict) errors.push(`${where} has no name.`);
      return;
    }
    let name = c.name.trim();
    if (name.length > LIMITS.columnName) {
      if (strict) errors.push(`${where} has a name longer than ${LIMITS.columnName} characters.`);
      name = name.slice(0, LIMITS.columnName);
    }
    let id = typeof c.id === 'string' && c.id && c.id.length <= 100 && !columnIds.has(c.id) ? c.id : newId('col');
    columnIds.add(id);
    columns.push({
      id,
      name,
      collapsed: c.collapsed === true,
      rawNoteIds: Array.isArray(c.noteIds) ? c.noteIds.filter((x) => typeof x === 'string') : [],
      rawId: c.id,
      noteIds: [],
    });
  });

  const notes = [];
  const usedIds = new Set();
  const finalIdByRaw = new Map();
  const wantedColumn = new Map(); // final note id -> column id named on the note itself

  rawNotes.forEach((n, i) => {
    const where = `Note ${i + 1}`;
    const fail = (msg) => {
      if (strict) errors.push(`${where} ${msg}`);
    };
    if (!isObject(n)) return void fail('is not a note.');

    let title = typeof n.title === 'string' ? n.title.trim() : '';
    if (!title) return void fail('has no title.');
    if (title.length > LIMITS.title) {
      fail(`has a title longer than ${LIMITS.title} characters.`);
      title = title.slice(0, LIMITS.title);
    }

    let description = '';
    if (n.description !== undefined && n.description !== null) {
      if (typeof n.description !== 'string') fail('has a description that is not text.');
      else description = n.description;
      if (description.length > LIMITS.description) {
        fail(`has a description longer than ${LIMITS.description} characters.`);
        description = description.slice(0, LIMITS.description);
      }
    }

    let tags = [];
    if (n.tags !== undefined && n.tags !== null) {
      const list = Array.isArray(n.tags) ? n.tags : typeof n.tags === 'string' ? n.tags.split(',') : null;
      if (!list || list.some((t) => typeof t !== 'string')) {
        fail('has tags that are not a list of text values.');
      } else {
        for (const t of list) {
          const res = addTag(tags, t);
          if (res.error) fail(res.error.replace(/\.$/, '') + '.');
          tags = res.tags;
        }
      }
    }

    let priority = 'none';
    if (n.priority !== undefined && n.priority !== null && n.priority !== '') {
      if (PRIORITIES.includes(n.priority)) priority = n.priority;
      else fail(`has priority “${String(n.priority).slice(0, 20)}”. Use none, low, medium or high.`);
    }

    let dueDate = '';
    if (n.dueDate !== undefined && n.dueDate !== null && n.dueDate !== '') {
      if (typeof n.dueDate === 'string' && isValidISODate(n.dueDate)) dueDate = n.dueDate;
      else fail('has a due date that is not in the format YYYY-MM-DD.');
    }

    const id = typeof n.id === 'string' && n.id && n.id.length <= 100 && !usedIds.has(n.id) ? n.id : newId('note');
    usedIds.add(id);
    if (typeof n.id === 'string' && !finalIdByRaw.has(n.id)) finalIdByRaw.set(n.id, id);
    if (typeof n.columnId === 'string') wantedColumn.set(id, n.columnId);

    const createdAt = isoOrNow(n.createdAt);
    notes.push({ id, title, description, tags, priority, dueDate, createdAt, updatedAt: isoOrNow(n.updatedAt ?? createdAt) });
  });

  if (strict && errors.length) return { ok: false, errors, data: null };

  // Reconcile which note sits in which column, keeping the order stored in the file.
  const placed = new Set();
  for (const col of columns) {
    for (const rawId of col.rawNoteIds) {
      const id = finalIdByRaw.get(rawId);
      if (id && !placed.has(id)) {
        placed.add(id);
        col.noteIds.push(id);
      }
    }
  }
  for (const note of notes) {
    const target = wantedColumn.get(note.id);
    const col = target && columns.find((c) => c.rawId === target || c.id === target);
    if (col && !placed.has(note.id)) {
      placed.add(note.id);
      col.noteIds.push(note.id);
    }
  }

  return {
    ok: true,
    errors: [],
    data: {
      notes,
      columns: columns.map(({ id, name, collapsed, noteIds }) => ({ id, name, collapsed, noteIds })),
    },
  };
}

/** Reads the text of an import file. Returns { ok: true, data } or { ok: false, error } with a message a person can act on. */
export function parseImport(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: 'This file is not valid JSON, so nothing was imported. Choose a file that was exported from this app with “Export notes”.',
    };
  }
  const result = normalizeData(raw, { strict: true });
  if (!result.ok) {
    const shown = result.errors.slice(0, 3).join(' ');
    const more = result.errors.length > 3 ? ` (${result.errors.length - 3} more problems not shown.)` : '';
    return { ok: false, error: `${shown}${more} Nothing was imported. Fix the file or export a fresh one from this app.` };
  }
  if (result.data.notes.length === 0) {
    return { ok: false, error: 'The file does not contain any notes, so nothing was imported.' };
  }
  return { ok: true, data: result.data };
}
