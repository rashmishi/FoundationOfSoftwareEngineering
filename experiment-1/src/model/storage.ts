import type { BoardState } from '../types';
import { defaultBoard } from './notes';
import { parseBoard, serialise } from './transfer';

export const STORAGE_KEY = 'notes-kanban:v1';

/** The minimal Storage surface used, so tests can pass an in-memory fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface LoadResult {
  state: BoardState;
  /** Set when stored data existed but could not be read; the app starts from the default board. */
  error?: string;
}

export function loadBoard(store: KeyValueStore | undefined = globalThis.localStorage): LoadResult {
  let raw: string | null;
  try {
    raw = store?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return { state: defaultBoard(), error: 'Saved notes could not be read from browser storage.' };
  }
  if (raw === null) return { state: defaultBoard() };

  let parsed;
  try {
    parsed = parseBoard(JSON.parse(raw));
  } catch {
    parsed = { ok: false as const, error: 'not valid JSON' };
  }
  if (parsed.ok) return { state: parsed.state };

  try {
    store?.setItem(`${STORAGE_KEY}:corrupt`, raw);
  } catch {
    // Best effort only.
  }
  return { state: defaultBoard(), error: `Saved notes were damaged (${parsed.error}) and have been reset.` };
}

/** Returns false when the browser refused the write (e.g. storage full or disabled). */
export function saveBoard(state: BoardState, store: KeyValueStore | undefined = globalThis.localStorage): boolean {
  try {
    store?.setItem(STORAGE_KEY, serialise(state));
    return true;
  } catch {
    return false;
  }
}
