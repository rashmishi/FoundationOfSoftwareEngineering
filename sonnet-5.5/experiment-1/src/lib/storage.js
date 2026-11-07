import { emptyState, sanitizeState } from './store.js';

const DATA_KEY = 'notes-kanban:v1';
const PREFS_KEY = 'notes-kanban:prefs:v1';

function read(key) {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null; // storage blocked or the saved text is damaged
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadState() {
  const raw = read(DATA_KEY);
  return raw ? sanitizeState(raw, { defaultColumns: true }) : emptyState();
}

export const saveState = (state) => write(DATA_KEY, { notes: state.notes, columns: state.columns });

/** The storage key of the board data, used to follow changes made in another tab. */
export const DATA_STORAGE_KEY = DATA_KEY;

export function loadPrefs() {
  const raw = read(PREFS_KEY) || {};
  return {
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null, // null follows the system
    sound: raw.sound !== false,
  };
}

export const savePrefs = (prefs) => write(PREFS_KEY, prefs);
