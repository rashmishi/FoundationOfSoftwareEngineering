import { isValidISODate, todayISO } from './dates';
import { LIMITS } from './validation';
import { EXPORT_FORMAT, EXPORT_VERSION, PRIORITIES, type BoardState, type Column, type ExportFile, type Note } from './types';

export function serialise(state: BoardState, now: Date = new Date()): ExportFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    notes: state.notes,
    columns: state.columns,
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `notes-${todayISO(now)}.json`;
}

export type ParseResult = { ok: true; state: BoardState } | { ok: false; error: string };

const FIX = 'Choose a file exported from this application.';

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function readNote(raw: unknown, n: number): Note {
  if (!isObject(raw)) fail(`Note ${n} is not a valid note. ${FIX}`);
  const { id, title, description = '', tags = [], priority = 'none', dueDate = null, createdAt, updatedAt } = raw;
  if (typeof id !== 'string' || !id) fail(`Note ${n} has no id. ${FIX}`);
  if (typeof title !== 'string' || !title.trim()) fail(`Note ${n} has no title. Add a title in the file or ${FIX.toLowerCase()}`);
  if (title.trim().length > LIMITS.title) fail(`Note ${n} has a title longer than ${LIMITS.title} characters. Shorten it in the file.`);
  if (typeof description !== 'string') fail(`Note ${n} has a description that is not text. ${FIX}`);
  if (description.length > LIMITS.description) fail(`Note ${n} has a description longer than ${LIMITS.description} characters. Shorten it in the file.`);
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string' || !t.trim() || t.trim().length > LIMITS.tag)) {
    fail(`Note ${n} has invalid tags. Each tag must be text of 1 to ${LIMITS.tag} characters.`);
  }
  if (typeof priority !== 'string' || !(PRIORITIES as readonly string[]).includes(priority)) {
    fail(`Note ${n} has an unknown priority "${String(priority)}". Use none, low, medium or high.`);
  }
  if (dueDate !== null && (typeof dueDate !== 'string' || !isValidISODate(dueDate))) {
    fail(`Note ${n} has an invalid due date "${String(dueDate)}". Use the form 2026-11-03.`);
  }
  const stamp = new Date().toISOString();
  return {
    id,
    title: title.trim(),
    description,
    tags: (tags as string[]).map((t) => t.trim()),
    priority: priority as Note['priority'],
    dueDate: dueDate as string | null,
    createdAt: typeof createdAt === 'string' ? createdAt : stamp,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : stamp,
  };
}

function readColumn(raw: unknown, n: number): Column {
  if (!isObject(raw)) fail(`Column ${n} is not a valid column. ${FIX}`);
  const { id, name, collapsed = false, noteIds = [] } = raw;
  if (typeof id !== 'string' || !id) fail(`Column ${n} has no id. ${FIX}`);
  if (typeof name !== 'string' || !name.trim()) fail(`Column ${n} has no name. ${FIX}`);
  if (name.trim().length > LIMITS.columnName) fail(`Column "${name.trim().slice(0, 20)}" has a name longer than ${LIMITS.columnName} characters.`);
  if (typeof collapsed !== 'boolean') fail(`Column "${name}" has an invalid collapsed value. ${FIX}`);
  if (!Array.isArray(noteIds) || noteIds.some((x) => typeof x !== 'string')) fail(`Column "${name}" has an invalid list of notes. ${FIX}`);
  return { id, name: name.trim(), collapsed, noteIds: noteIds as string[] };
}

/** Validate an untrusted object as board data (used for import and for stored data). Throws ImportError. */
function readBoard(data: unknown): BoardState {
  if (!isObject(data)) fail(`The file does not contain notes data. ${FIX}`);
  if (data.format !== EXPORT_FORMAT) fail(`The file is not a notes export. ${FIX}`);
  if (typeof data.version !== 'number') fail(`The file has no version number. ${FIX}`);
  if (data.version > EXPORT_VERSION) {
    fail(`This file was made by a newer version (version ${data.version}). Update the application or export again.`);
  }
  if (!Array.isArray(data.notes)) fail(`The file is missing the notes list. ${FIX}`);
  if (!Array.isArray(data.columns)) fail(`The file is missing the columns list. ${FIX}`);

  const notes = data.notes.map((raw, i) => readNote(raw, i + 1));
  const noteIds = new Set<string>();
  for (const note of notes) {
    if (noteIds.has(note.id)) fail(`Two notes in the file have the same id "${note.id}". ${FIX}`);
    noteIds.add(note.id);
  }

  const columns = data.columns.map((raw, i) => readColumn(raw, i + 1));
  const columnIds = new Set<string>();
  const names = new Set<string>();
  const placed = new Set<string>();
  for (const column of columns) {
    if (columnIds.has(column.id)) fail(`Two columns in the file have the same id "${column.id}". ${FIX}`);
    columnIds.add(column.id);
    const key = column.name.toLowerCase();
    if (names.has(key)) fail(`Two columns in the file are named "${column.name}". Column names must be different.`);
    names.add(key);
    for (const id of column.noteIds) {
      if (!noteIds.has(id)) fail(`Column "${column.name}" refers to a note that is not in the file. ${FIX}`);
      if (placed.has(id)) fail(`A note is in more than one column in the file. ${FIX}`);
      placed.add(id);
    }
  }
  return { notes, columns };
}

export function parseBoardData(data: unknown): ParseResult {
  try {
    return { ok: true, state: readBoard(data) };
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message };
    throw e;
  }
}

export function parseImport(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: `The file is not valid JSON. ${FIX}` };
  }
  return parseBoardData(data);
}
