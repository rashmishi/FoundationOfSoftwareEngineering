import { parseImport, serialize } from './importExport';
import { defaultState } from './reducer';
import type { AppState } from './types';

export const STORAGE_KEY = 'notes-kanban:v1';

export const LOAD_ERROR = 'Saved notes could not be loaded. Starting with an empty board.';
export const SAVE_ERROR = 'Changes could not be saved in this browser. Export your notes to keep them.';

export function loadState(): { state: AppState; error?: string } {
  let text: string | null;
  try {
    text = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: defaultState(), error: SAVE_ERROR };
  }
  if (text === null) return { state: defaultState() };
  const result = parseImport(text, defaultState().columns);
  return result.ok ? { state: result.state } : { state: defaultState(), error: LOAD_ERROR };
}

/** Returns false when the browser refuses to store the data (quota, privacy mode). */
export function saveState(state: AppState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}
