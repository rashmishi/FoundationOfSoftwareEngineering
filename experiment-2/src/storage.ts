import { defaultData } from './notes';
import { validateBoardData } from './transfer';
import type { BoardData } from './types';

const STORAGE_KEY = 'notes-board:v1';
const DAMAGED_KEY = `${STORAGE_KEY}:damaged`;

interface LoadResult {
  data: BoardData;
  warning?: string;
}

export function loadData(): LoadResult {
  let saved: string | null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { data: defaultData(), warning: 'This browser is blocking saved data, so notes will not be kept.' };
  }
  if (saved === null) {
    return { data: defaultData() };
  }
  try {
    return { data: validateBoardData(JSON.parse(saved)) };
  } catch {
    return { data: defaultData(), warning: keepDamagedCopy(saved) };
  }
}

/** Keeps unreadable data so that the next save does not destroy it. */
function keepDamagedCopy(saved: string): string {
  const warning = 'Saved notes could not be read, so the app started empty.';
  try {
    localStorage.setItem(DAMAGED_KEY, saved);
    return warning;
  } catch {
    return `${warning} A backup copy could not be kept.`;
  }
}

/** Throws if the browser refuses the write, for example when storage is full. */
export function saveData(data: BoardData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const DRAFT_KEY = `${STORAGE_KEY}:draft`;
const COLLAPSED_KEY = `${STORAGE_KEY}:collapsed`;

/** The form's fields as typed, before they are turned into a note. */
export interface NoteDraftText {
  title: string;
  description: string;
  tags: string;
  priority: string;
  dueDate: string;
}

/** Returns the note the user was still writing, if there is one. */
export function loadDraft(): NoteDraftText | null {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') ?? {};
    const { title, description, tags, priority = 'none', dueDate = '' } = draft;
    const fields = [title, description, tags, priority, dueDate];
    return fields.every((field) => typeof field === 'string') ? { title, description, tags, priority, dueDate } : null;
  } catch {
    return null;
  }
}

/** Drafts are a safety net, so a failure here is not worth interrupting the user. */
export function saveDraft(draft: NoteDraftText): void {
  try {
    if (draft.title || draft.description || draft.tags || draft.priority !== 'none' || draft.dueDate) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // Writing continues without the safety net.
  }
}

/** Collapsing is a view setting for this browser, so it is not part of the notes or exports. */
export function loadCollapsed(): Set<string> {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveCollapsed(ids: Set<string>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...ids]));
  } catch {
    // Columns stay collapsed until the page is closed.
  }
}

/** Calls back when another tab changes the saved data. */
export function onExternalChange(callback: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  }
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
