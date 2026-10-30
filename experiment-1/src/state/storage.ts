import { SCHEMA_VERSION, type AppState } from '../types';
import { validateAppState } from './importExport';
import { createInitialState } from './notesReducer';

export const STORAGE_KEY = 'notes-kanban:v1';

/** Load persisted state, falling back to defaults when missing or corrupt. */
export function loadState(storage: Storage = window.localStorage): AppState {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Notes Kanban: localStorage is unavailable.', error);
    return createInitialState();
  }
  if (raw === null) return createInitialState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('stored value is not an object');
    }
    const record = parsed as Record<string, unknown>;
    if (record.version !== SCHEMA_VERSION) throw new Error('unsupported stored version');
    return validateAppState(record);
  } catch (error) {
    console.warn('Notes Kanban: stored data is invalid and was ignored.', error);
    return createInitialState();
  }
}

/** Persist state. Returns false if the write failed (e.g. quota exceeded). */
export function saveState(state: AppState, storage: Storage = window.localStorage): boolean {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, notes: state.notes, columns: state.columns }),
    );
    return true;
  } catch (error) {
    console.warn('Notes Kanban: could not save to localStorage.', error);
    return false;
  }
}
