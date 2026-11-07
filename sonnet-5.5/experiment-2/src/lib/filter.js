import { dueStatus, todayISO, daysBetween } from './dates.js';

export const emptyFilters = { query: '', priority: 'any', tag: 'any', column: 'any', due: 'any' };

export function isFiltering(f) {
  return f.query.trim() !== '' || f.priority !== 'any' || f.tag !== 'any' || f.column !== 'any' || f.due !== 'any';
}

/** `columnId` is the column the note is on (null when it is not on the board). */
export function matchesFilters(note, columnId, f, today = todayISO()) {
  const q = f.query.trim().toLowerCase();
  if (q) {
    const haystack = `${note.title}\n${note.description}\n${note.tags.join('\n')}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (f.priority !== 'any' && note.priority !== f.priority) return false;
  if (f.tag !== 'any' && !note.tags.some((t) => t.toLowerCase() === f.tag.toLowerCase())) return false;
  if (f.column === 'none') {
    if (columnId) return false;
  } else if (f.column !== 'any' && columnId !== f.column) {
    return false;
  }
  if (f.due !== 'any') {
    const status = dueStatus(note.dueDate, today);
    if (f.due === 'overdue' && status !== 'overdue') return false;
    if (f.due === 'today' && status !== 'today') return false;
    if (f.due === 'week') {
      if (!status || status === 'overdue') return false;
      if (daysBetween(today, note.dueDate) > 7) return false;
    }
    if (f.due === 'none' && note.dueDate) return false;
  }
  return true;
}

export function allTags(notes) {
  const seen = new Map();
  for (const n of notes) for (const t of n.tags) if (!seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
