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

export interface NoteDraftText {
  title: string;
  description: string;
  tags: string;
}

/** Returns the note the user was still writing, if there is one. */
export function loadDraft(): NoteDraftText | null {
  try {
    const { title, description, tags } = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') ?? {};
    return [title, description, tags].every((field) => typeof field === 'string') ? { title, description, tags } : null;
  } catch {
    return null;
  }
}

/** Drafts are a safety net, so a failure here is not worth interrupting the user. */
export function saveDraft(draft: NoteDraftText): void {
  try {
    if (draft.title || draft.description || draft.tags) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // Writing continues without the safety net.
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
