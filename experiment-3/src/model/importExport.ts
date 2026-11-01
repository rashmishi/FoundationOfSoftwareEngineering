import { newId } from './ids';
import type { AppState, Column, Note } from './types';

export const EXPORT_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ExportFile {
  version: number;
  exportedAt: string;
  columns: Column[];
  notes: Note[];
}

export function serialize(state: AppState, now = new Date()): string {
  const file: ExportFile = {
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    columns: state.columns,
    notes: state.notes,
  };
  return JSON.stringify(file, null, 2);
}

export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `notes-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ImportResult = { ok: true; state: AppState } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optionalString = (v: unknown) => v === undefined || typeof v === 'string';

/**
 * Validates and normalises an export file (design 3.2). Never mutates anything;
 * the caller applies the result atomically.
 */
export function parseImport(text: string, currentColumns: Column[], now = new Date().toISOString()): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Import failed: the file is not valid JSON.' };
  }
  if (!isObject(data) || !Array.isArray(data.notes)) {
    return { ok: false, error: 'Import failed: the file does not contain a notes list.' };
  }
  if (data.version !== undefined && data.version !== EXPORT_VERSION) {
    return { ok: false, error: 'Import failed: unsupported file version.' };
  }

  let columns: Column[] = currentColumns;
  if (data.columns !== undefined) {
    if (
      !Array.isArray(data.columns) ||
      !data.columns.every((c) => isObject(c) && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim())
    ) {
      return { ok: false, error: 'Import failed: the board columns are invalid.' };
    }
    columns = (data.columns as Column[]).map((c) => ({ id: c.id, name: c.name.trim() }));
  }

  const notes: Note[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < data.notes.length; i++) {
    const raw: unknown = data.notes[i];
    const n = i + 1;
    if (!isObject(raw) || typeof raw.title !== 'string' || !raw.title.trim()) {
      return { ok: false, error: `Import failed: note ${n} has no title.` };
    }
    for (const field of ['id', 'description', 'createdAt', 'updatedAt'] as const) {
      if (!optionalString(raw[field])) return { ok: false, error: `Import failed: note ${n} has an invalid ${field}.` };
    }
    if (raw.tags !== undefined && !(Array.isArray(raw.tags) && raw.tags.every((t) => typeof t === 'string'))) {
      return { ok: false, error: `Import failed: note ${n} has an invalid tags.` };
    }
    if (raw.columnId !== undefined && raw.columnId !== null && typeof raw.columnId !== 'string') {
      return { ok: false, error: `Import failed: note ${n} has an invalid columnId.` };
    }
    if (raw.movedAt !== undefined && raw.movedAt !== null && typeof raw.movedAt !== 'string') {
      return { ok: false, error: `Import failed: note ${n} has an invalid movedAt.` };
    }
    const id = (raw.id as string | undefined) || newId();
    if (ids.has(id)) return { ok: false, error: 'Import failed: the file contains duplicate notes.' };
    ids.add(id);
    const columnId =
      typeof raw.columnId === 'string' && columns.some((c) => c.id === raw.columnId) ? raw.columnId : null;
    notes.push({
      id,
      title: raw.title.trim(),
      description: (raw.description as string | undefined) ?? '',
      tags: (raw.tags as string[] | undefined) ?? [],
      columnId,
      createdAt: (raw.createdAt as string | undefined) ?? now,
      updatedAt: (raw.updatedAt as string | undefined) ?? now,
      movedAt: columnId === null ? null : ((raw.movedAt as string | null | undefined) ?? now),
    });
  }
  return { ok: true, state: { notes, columns } };
}
