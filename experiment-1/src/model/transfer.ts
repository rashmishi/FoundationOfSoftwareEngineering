import { PRIORITIES, type BoardState, type Column, type Note, type Priority } from '../types';
import { COLUMN_NAME_MAX, DESCRIPTION_MAX, parseTags, TITLE_MAX } from './notes';

export const FILE_FORMAT = 'notes-kanban';
export const FILE_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ExportFile {
  format: typeof FILE_FORMAT;
  version: typeof FILE_VERSION;
  exportedAt: string;
  notes: Note[];
  columns: Column[];
}

export type ParseResult = { ok: true; state: BoardState } | { ok: false; error: string };

export function toExportFile(state: BoardState, now = new Date()): ExportFile {
  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    exportedAt: now.toISOString(),
    notes: state.notes,
    columns: state.columns,
  };
}

export function serialise(state: BoardState, now = new Date()): string {
  return JSON.stringify(toExportFile(state, now), null, 2);
}

export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `notes-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function readNote(value: unknown, path: string, now: string): Note {
  if (!isObject(value)) fail(`${path} must be an object.`);
  const { id, title, description = '', tags = [], priority = 'none', dueDate = null } = value;
  if (typeof id !== 'string' || !id.trim()) fail(`${path}.id must be a non-empty string.`);
  if (typeof title !== 'string' || !title.trim()) fail(`${path}.title must be a non-empty string.`);
  if (title.trim().length > TITLE_MAX) fail(`${path}.title must be at most ${TITLE_MAX} characters.`);
  if (typeof description !== 'string') fail(`${path}.description must be a string.`);
  if (description.length > DESCRIPTION_MAX) fail(`${path}.description must be at most ${DESCRIPTION_MAX} characters.`);
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) fail(`${path}.tags must be an array of strings.`);
  if (typeof priority !== 'string' || !PRIORITIES.includes(priority as Priority)) {
    fail(`${path}.priority must be one of ${PRIORITIES.join(', ')}.`);
  }
  if (dueDate !== null && (typeof dueDate !== 'string' || !isValidDate(dueDate))) {
    fail(`${path}.dueDate must be a date (YYYY-MM-DD) or null.`);
  }
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : now;
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : createdAt;
  return {
    id,
    title: title.trim(),
    description,
    tags: parseTags((tags as string[]).join(',')),
    priority: priority as Priority,
    dueDate: dueDate as string | null,
    createdAt,
    updatedAt,
  };
}

function readColumn(value: unknown, path: string): Column {
  if (!isObject(value)) fail(`${path} must be an object.`);
  const { id, name, collapsed = false, noteIds = [] } = value;
  if (typeof id !== 'string' || !id.trim()) fail(`${path}.id must be a non-empty string.`);
  if (typeof name !== 'string' || !name.trim()) fail(`${path}.name must be a non-empty string.`);
  if (name.trim().length > COLUMN_NAME_MAX) fail(`${path}.name must be at most ${COLUMN_NAME_MAX} characters.`);
  if (typeof collapsed !== 'boolean') fail(`${path}.collapsed must be true or false.`);
  if (!Array.isArray(noteIds) || noteIds.some((n) => typeof n !== 'string')) {
    fail(`${path}.noteIds must be an array of strings.`);
  }
  return { id, name: name.trim(), collapsed, noteIds: [...(noteIds as string[])] };
}

/**
 * Validates an import file (or the stored board). `currentColumns` is used when the file has no columns:
 * the board layout is kept, emptied of notes.
 */
export function parseBoard(value: unknown, currentColumns: Column[] = [], now = new Date().toISOString()): ParseResult {
  try {
    const root = Array.isArray(value) ? { notes: value } : value;
    if (!isObject(root)) fail('File must contain a JSON object with a "notes" array.');
    if (root.format !== undefined && root.format !== FILE_FORMAT) fail(`Unknown file format “${String(root.format)}”.`);
    if (root.version !== undefined && root.version !== FILE_VERSION) fail(`Unsupported file version ${String(root.version)}.`);
    if (!Array.isArray(root.notes)) fail('File must contain a "notes" array.');

    const notes = root.notes.map((n, i) => readNote(n, `notes[${i}]`, now));
    const noteIds = new Set<string>();
    notes.forEach((n, i) => {
      if (noteIds.has(n.id)) fail(`notes[${i}].id “${n.id}” is used by more than one note.`);
      noteIds.add(n.id);
    });

    let columns: Column[];
    if (root.columns === undefined) {
      columns = currentColumns.map((c) => ({ ...c, noteIds: [] }));
    } else {
      if (!Array.isArray(root.columns)) fail('"columns" must be an array.');
      columns = root.columns.map((c, i) => readColumn(c, `columns[${i}]`));
      const columnIds = new Set<string>();
      const columnNames = new Set<string>();
      const placed = new Set<string>();
      columns.forEach((c, i) => {
        if (columnIds.has(c.id)) fail(`columns[${i}].id “${c.id}” is used by more than one column.`);
        if (columnNames.has(c.name.toLowerCase())) fail(`columns[${i}].name “${c.name}” is used by more than one column.`);
        columnIds.add(c.id);
        columnNames.add(c.name.toLowerCase());
        for (const id of c.noteIds) {
          if (!noteIds.has(id)) fail(`columns[${i}] refers to unknown note “${id}”.`);
          if (placed.has(id)) fail(`Note “${id}” is in more than one column.`);
          placed.add(id);
        }
      });
    }
    return { ok: true, state: { notes, columns } };
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message };
    throw error;
  }
}

export function parseBoardFile(text: string, currentColumns: Column[] = []): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  return parseBoard(value, currentColumns);
}
