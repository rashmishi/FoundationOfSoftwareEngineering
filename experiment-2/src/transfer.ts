import type { BoardData, Column, Note } from './types';

const EXPORT_VERSION = 1;

/** Browser storage holds about 5 MB, so a larger file could never be saved. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Raised when data fails validation. Its message is shown to the user. */
export class InvalidDataError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function parseColumn(value: unknown, position: number): Column {
  if (!isObject(value) || !isFilledString(value.id) || !isFilledString(value.name)) {
    throw new InvalidDataError(`Column ${position} needs an id and a name.`);
  }
  return { id: value.id, name: value.name };
}

function parseNote(value: unknown, position: number, columnIds: Set<string>): Note {
  if (!isObject(value)) {
    throw new InvalidDataError(`Note ${position} is not a note.`);
  }
  const { id, title, description, tags, columnId, createdAt, updatedAt } = value;
  if (!isFilledString(id)) {
    throw new InvalidDataError(`Note ${position} has no id.`);
  }
  if (!isFilledString(title)) {
    throw new InvalidDataError(`Note ${position} has no title.`);
  }
  if (typeof description !== 'string') {
    throw new InvalidDataError(`Note ${position} has no description text.`);
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
    throw new InvalidDataError(`The tags of note ${position} are not a list of text values.`);
  }
  if (columnId !== null && !(typeof columnId === 'string' && columnIds.has(columnId))) {
    throw new InvalidDataError(`Note ${position} refers to a column that is not in the file.`);
  }
  if (typeof createdAt !== 'string' || typeof updatedAt !== 'string') {
    throw new InvalidDataError(`Note ${position} has no created and updated times.`);
  }
  return { id, title, description, tags, columnId, createdAt, updatedAt };
}

function rejectDuplicateIds(items: { id: string }[], kind: string): void {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new InvalidDataError(`Two ${kind} share the same id.`);
  }
}

/** Checks the shape of untrusted data and returns only the known fields. */
export function validateBoardData(value: unknown): BoardData {
  if (!isObject(value) || !Array.isArray(value.notes) || !Array.isArray(value.columns)) {
    throw new InvalidDataError('It does not contain a notes list and a columns list.');
  }
  const columns = value.columns.map((column, index) => parseColumn(column, index + 1));
  const columnIds = new Set(columns.map((column) => column.id));
  const notes = value.notes.map((note, index) => parseNote(note, index + 1, columnIds));
  rejectDuplicateIds(columns, 'columns');
  rejectDuplicateIds(notes, 'notes');
  return { notes, columns };
}

export function serializeExport(data: BoardData): string {
  return JSON.stringify({ version: EXPORT_VERSION, exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function parseImport(text: string): BoardData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new InvalidDataError('It is not valid JSON.');
  }
  if (!isObject(value) || value.version !== EXPORT_VERSION) {
    throw new InvalidDataError('It is not a Notes Board export.');
  }
  return validateBoardData(value);
}

function visibleContent({ title, description, tags, columnId }: Note): string {
  return JSON.stringify([title, description, tags, columnId]);
}

/** Counts the notes an import would overwrite with content the user would notice. */
export function countReplacedNotes(data: BoardData, incoming: BoardData): number {
  const existing = new Map(data.notes.map((note) => [note.id, visibleContent(note)]));
  return incoming.notes.filter((note) => existing.has(note.id) && existing.get(note.id) !== visibleContent(note)).length;
}

/** Adds imported notes and columns. An item with a matching id is replaced by the imported copy. */
export function mergeImport(data: BoardData, incoming: BoardData): BoardData {
  return {
    notes: mergeById(data.notes, incoming.notes),
    columns: mergeById(data.columns, incoming.columns),
  };
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const merged = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    merged.set(item.id, item);
  }
  return [...merged.values()];
}
