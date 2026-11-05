import { parseBoardData, serialise } from './importExport';
import { emptyBoard } from './reducer';
import type { BoardState } from './types';

export const BOARD_KEY = 'notes-kanban:v1:board';
export const PREFS_KEY = 'notes-kanban:v1:prefs';
export const BACKUP_KEY = 'notes-kanban:backup';

export type LoadStatus = 'loaded' | 'new' | 'reset';

export function loadBoard(): { state: BoardState; status: LoadStatus } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(BOARD_KEY);
  } catch {
    return { state: emptyBoard(), status: 'new' };
  }
  if (raw === null) return { state: emptyBoard(), status: 'new' };
  try {
    const result = parseBoardData(JSON.parse(raw));
    if (result.ok) return { state: result.state, status: 'loaded' };
  } catch {
    // fall through to reset
  }
  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // backup is best effort
  }
  return { state: emptyBoard(), status: 'reset' };
}

/** Returns false when the browser refused to save (for example, storage is full). */
export function saveBoard(state: BoardState): boolean {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(serialise(state)));
    return true;
  } catch {
    return false;
  }
}

export function loadJSON<T>(key: string): Partial<T> {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : {};
    return typeof value === 'object' && value !== null ? (value as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // preferences are best effort
  }
}
