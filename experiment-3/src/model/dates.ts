const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's local calendar date as 'YYYY-MM-DD'. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True when the string is 'YYYY-MM-DD' and a real calendar date (rejects 2026-02-30). */
export function isValidISODate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** "Tuesday 3 November 2026" (FR-10.2). */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

export type DueStatus = 'none' | 'overdue' | 'today' | 'upcoming';

/** Overdue = before today and not in a "Done" column (FR-10.3). ISO strings compare correctly as text. */
export function dueStatus(dueDate: string | null, columnName: string | undefined, today: string): DueStatus {
  if (!dueDate) return 'none';
  const done = columnName?.trim().toLowerCase() === 'done';
  if (dueDate < today) return done ? 'upcoming' : 'overdue';
  if (dueDate === today) return 'today';
  return 'upcoming';
}
