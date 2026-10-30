import {
  EXPORT_APP_ID,
  LIMITS,
  SCHEMA_VERSION,
  type AppState,
  type Column,
  type ExportFile,
  type Note,
} from '../types';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  { nonEmpty = false, max }: { nonEmpty?: boolean; max?: number } = {},
): string {
  const value = obj[key];
  if (typeof value !== 'string' || (nonEmpty && value.trim() === '')) {
    throw new ImportError(`${path}.${key} must be a ${nonEmpty ? 'non-empty ' : ''}string.`);
  }
  if (max !== undefined && value.length > max) {
    throw new ImportError(`${path}.${key} must be at most ${max} characters.`);
  }
  return value;
}

function validateColumn(value: unknown, path: string): Column {
  if (!isRecord(value)) throw new ImportError(`${path} must be an object.`);
  return {
    id: requireString(value, 'id', path, { nonEmpty: true }),
    name: requireString(value, 'name', path, { nonEmpty: true, max: LIMITS.columnName }).trim(),
  };
}

function validateNote(value: unknown, path: string): Note {
  if (!isRecord(value)) throw new ImportError(`${path} must be an object.`);
  const tags = value.tags;
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
    throw new ImportError(`${path}.tags must be an array of strings.`);
  }
  const columnId = value.columnId;
  if (columnId !== null && typeof columnId !== 'string') {
    throw new ImportError(`${path}.columnId must be a string or null.`);
  }
  return {
    id: requireString(value, 'id', path, { nonEmpty: true }),
    title: requireString(value, 'title', path, { nonEmpty: true, max: LIMITS.title }).trim(),
    description: requireString(value, 'description', path, { max: LIMITS.description }),
    tags: (tags as string[]).map((t) => t.trim()).filter(Boolean),
    columnId,
    createdAt: requireString(value, 'createdAt', path, { nonEmpty: true }),
    updatedAt: requireString(value, 'updatedAt', path, { nonEmpty: true }),
  };
}

function assertUniqueIds(items: { id: string }[], label: string): void {
  const seen = new Set<string>();
  for (const [i, item] of items.entries()) {
    if (seen.has(item.id)) throw new ImportError(`${label}[${i}].id “${item.id}” is duplicated.`);
    seen.add(item.id);
  }
}

/** Validate an unknown value as `{ notes, columns }`. Throws ImportError on the first problem. */
export function validateAppState(value: Record<string, unknown>): AppState {
  if (!Array.isArray(value.notes)) throw new ImportError('“notes” must be an array.');
  if (!Array.isArray(value.columns)) throw new ImportError('“columns” must be an array.');
  const columns = value.columns.map((c, i) => validateColumn(c, `columns[${i}]`));
  const notes = value.notes.map((n, i) => validateNote(n, `notes[${i}]`));
  assertUniqueIds(columns, 'columns');
  assertUniqueIds(notes, 'notes');
  return { notes, columns };
}

export function buildExport(state: AppState, now: Date = new Date()): ExportFile {
  return {
    app: EXPORT_APP_ID,
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    columns: state.columns,
    notes: state.notes,
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `notes-${now.toISOString().slice(0, 10)}.json`;
}

/** Parse and validate the text of an exported file. Throws ImportError if it is not acceptable. */
export function parseImport(text: string): AppState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('The file is not valid JSON.');
  }
  if (!isRecord(data)) throw new ImportError('The file does not contain a notes export object.');
  if (data.app !== EXPORT_APP_ID) {
    throw new ImportError('The file was not exported from Notes Kanban.');
  }
  if (data.version !== SCHEMA_VERSION) {
    throw new ImportError(`Unsupported export version: ${JSON.stringify(data.version)}.`);
  }
  return validateAppState(data);
}

/** Trigger a browser download of the current state as JSON. */
export function downloadExport(state: AppState): string {
  const now = new Date();
  const json = JSON.stringify(buildExport(state, now), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fileName = exportFileName(now);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return fileName;
}
